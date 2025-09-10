import { isBuiltin } from "node:module";
import { isAbsolute } from "node:path";

import type { AST, Rule } from "eslint";
import type { Comment, Node } from "estree";
import { Enum } from "@shigen/enum";
import { minimatch } from "minimatch";

import { assertLoc, assertRange, extrema, importModules, isComment, isTypeImportOrExport, type ImportModuleDeclaration } from "../tools/ast.ts";
import { fixRange, type RuleContext, type RuleModule } from "../tools/rule.ts";
import { sortByPath } from "../tools/sort.ts";

export type ModuleClassOption = "node" | "external" | "internal" | "absolute" | "relative";
export type TypeImportOption = "include" | "exclude" | "only";

const moduleClassId = Symbol();
const typeImportId = Symbol();

export class ModuleClass extends Enum<{ Key: ModuleClassOption; }>(moduleClassId) {
	static readonly Node = new ModuleClass(moduleClassId, { key: "node", });
	static readonly External = new ModuleClass(moduleClassId, { key: "external", });
	static readonly Internal = new ModuleClass(moduleClassId, { key: "internal", });
	static readonly Absolute = new ModuleClass(moduleClassId, { key: "absolute", });
	static readonly Relative = new ModuleClass(moduleClassId, { key: "relative", });
}

export class TypeImport extends Enum<{ Key: TypeImportOption; }>(typeImportId) {
	static readonly Include = new TypeImport(typeImportId, { key: "include", });
	static readonly Exclude = new TypeImport(typeImportId, { key: "exclude", });
	static readonly Only = new TypeImport(typeImportId, { key: "only", });
}

interface ModuleClassConfiguration {
	class: ModuleClassOption;
	types?: TypeImportOption;
}

interface ModulePathConfiguration {
	path: string;
	types?: TypeImportOption;
}

type ModuleConfiguration = string | ModulePathConfiguration | ModuleClassConfiguration;

export type GroupConfiguration = ModuleConfiguration | ModuleConfiguration[];

const defaultConfiguration: GroupConfiguration[] = [
	{ class: ModuleClass.Node.key, },
	{ class: ModuleClass.External.key, },
	{ class: ModuleClass.Absolute.key, },
	{ class: ModuleClass.Internal.key, },
	{ class: ModuleClass.Relative.key, },
];

function groupIndex(node: ImportModuleDeclaration, groups: GroupConfiguration[]) {
	if (typeof node.source.value !== "string") {
		return groups.length;
	}

	const importPath = node.source.value;

	const findIndex = (callback: (group: ModuleConfiguration) => boolean) =>
		groups.findIndex((group) => {
			if (group instanceof Array) {
				return group.find((configuration) => callback(configuration));
			}

			return callback(group);
		});

	const isTypeImport = isTypeImportOrExport(node);

	const hardCodedIndex = findIndex((group) => {
		if (typeof group === "string") {
			return minimatch(importPath, group, { matchBase: true, });
		}

		if (!("path" in group)) {
			return false;
		}

		if (isTypeImport) {
			return minimatch(importPath, group.path, { matchBase: true, }) && group.types !== TypeImport.Exclude.key;
		}

		return minimatch(importPath, group.path, { matchBase: true, }) && group.types !== TypeImport.Only.key;
	});

	if (hardCodedIndex >= 0) {
		return hardCodedIndex;
	}

	// split path at / delimiter but keep first / for absolute paths
	const [ moduleName, ] = importPath.split(/(?=^\/)|\//u);

	if (!moduleName) {
		throw new Error(`group-imports: unexpected undefined module name for path '${importPath}'`);
	}

	let moduleClass = ModuleClass.External;

	if (isBuiltin(moduleName)) {
		moduleClass = ModuleClass.Node;
	} else if (moduleName.startsWith("#")) {
		moduleClass = ModuleClass.Internal;
	} else if (/^(?:\/|\.)/u.exec(moduleName)) {
		moduleClass = isAbsolute(moduleName) ? ModuleClass.Absolute : ModuleClass.Relative;
	}

	const classIndex = findIndex((group) => {
		if (typeof group !== "object" || !("class" in group)) {
			return false;
		}

		if (isTypeImport) {
			return group.class === moduleClass.key && group.types !== TypeImport.Exclude.key;
		}

		return group.class === moduleClass.key && group.types !== TypeImport.Only.key;
	});

	return classIndex >= 0 ? classIndex : groups.length;
}

function checkLines(
	context: RuleContext<GroupConfiguration[]>,
	previous: ImportModuleDeclaration | undefined,
	next: ImportModuleDeclaration | undefined,
	lineCount: 0 | 1,
) {
	if (!previous || !next) {
		throw new Error(`group-imports: unexpected undefined node`);
	}

	const tokensBetween = context.sourceCode.getTokensBetween(previous, next, { includeComments: true, });
	const relevantItems: (Comment | Node)[] = [ previous, ];

	for (const token of tokensBetween) {
		if (!isComment(token)) {
			return context.report({
				loc: {
					start: assertLoc(tokensBetween.find((t) => !isComment(t))).start,
					end: assertLoc(tokensBetween.findLast((t) => !isComment(t))).end,
				},
				message: `Unexpected code between imports of group`,
			});
		}

		relevantItems.push(token);
	}

	relevantItems.push(next);

	for (let i = 0; i < relevantItems.length - 1; i++) {
		const a = relevantItems[i]!;
		const b = relevantItems[i + 1]!;

		const locA = assertLoc(a);
		const locB = assertLoc(b);

		const rangeA = assertRange(a);
		const rangeB = assertRange(b);

		const linesBetween = locB.start.line - locA.end.line - 1;

		if (lineCount === 0) {
			if (linesBetween > 0) {
				const range: AST.Range = [ rangeA[1], rangeB[0] - locB.start.column, ];
				context.report({
					loc: {
						start: locA.end,
						end: {
							line: locB.start.line,
							column: 0,
						},
					},
					message: `Unexpected white space between imports`,
					fix: (fixer) => fixer.replaceTextRange(range, "\n"),
				});
			}
		} else {
			const columnOffset = isComment(b) ? 0 : locB.start.column;
			const reportLoc = {
				start: locA.end,
				end: {
					line: locB.start.line,
					column: columnOffset,
				},
			};

			const fix = (fixer: Rule.RuleFixer) => fixer.replaceTextRange([ rangeA[1], rangeB[0] - columnOffset, ], "\n\n");

			if (isComment(a) || isComment(b)) {
				if (linesBetween > 1) {
					context.report({
						loc: reportLoc,
						message: `TODO 1`,
						fix,
					});
				}
			} else {
				if (linesBetween !== 1) {
					context.report({
						loc: reportLoc,
						message: `TODO 2`,
						fix,
					});
				}
			}
		}
	}
}

function groupLabels(groups: GroupConfiguration[]) {
	return groups.map((group) => {
		if (group instanceof Array || typeof group === "string" || "path" in group || "pattern" in group) {
			return "custom";
		}

		return group.class.toUpperCase();
	});
}

export const rule: RuleModule<GroupConfiguration[]> = {
	meta: {
		fixable: "code",
		schema: {
			definitions: {
				typeImportConfiguration: {
					enum: [ ...TypeImport.keys(), ],
				},
				moduleConfiguration: {
					oneOf: [
						{ type: "string", },
						{
							type: "object",
							properties: {
								class: {
									enum: [ ...ModuleClass.keys(), ],
								},
								types: {
									$ref: "#/definitions/typeImportConfiguration",
								},
							},
							required: [ "class", ],
							additionalProperties: false,
						},
						{
							type: "object",
							properties: {
								path: {
									type: "string",
								},
								types: {
									$ref: "#/definitions/typeImportConfiguration",
								},
							},
							required: [ "path", ],
							additionalProperties: false,
						},
					],
				},
			},
			type: "array",
			items: {
				anyOf: [
					{
						$ref: "#/definitions/moduleConfiguration",
					},
					{
						type: "array",
						items: {
							$ref: "#/definitions/moduleConfiguration",
						},
					},
				],
			},
		},
	},
	create(context) {
		const groupConfigurations = context.options.length ? context.options : defaultConfiguration;

		const source = context.sourceCode;

		const imports = importModules(source).map((node) => {
			return {
				index: groupIndex(node, groupConfigurations),
				node,
			};
		});

		if (imports.length === 0) {
			return {};
		}

		const sorted = sortByPath(imports, [ "index", ]);

		let previousIndex = sorted[0]?.index;

		const groups = sorted.reduce<ImportModuleDeclaration[][]>(
			(result, value) => {
				const current = result.at(-1);

				if (current && previousIndex === value.index) {
					current.push(value.node);
				} else {
					result.push([ value.node, ]);
				}

				previousIndex = value.index;

				return result;
			},
			[ [], ],
		);

		if (sorted.some((node, i) => node !== imports[i])) {
			fixRange(context, {
				range: extrema(imports.map(({ node, }) => node)),
				message: `Expected import groups: ${groupLabels(groupConfigurations).join(", ")}`,
				code: groups.map((nodes) => nodes.map((node) => source.getText(node)).join("\n")).join("\n\n"),
			});
		} else {
			groups.forEach((group, i) => {
				for (let j = 1; j < group.length; j++) {
					const previous = group[j - 1];
					const current = group[j];
					checkLines(context, previous, current, 0);
				}

				if (i === 0) {
					return;
				}

				const previous = groups[i - 1]?.at(-1);
				const [ current, ] = group;
				checkLines(context, previous, current, 1);
			});
		}

		return {};
	},
};
