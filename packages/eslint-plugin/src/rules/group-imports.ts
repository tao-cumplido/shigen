import { isBuiltin } from 'node:module';
import { isAbsolute } from 'node:path';

import { Enum } from '@shigen/enum';

import type { ImportModuleDeclaration } from '../tools/ast';
import type { RuleContext, RuleModule } from '../tools/rule';
import { extrema, importModules, isTypeImportOrExport, linesBetween, onlyWhiteSpaceBetween } from '../tools/ast';
import { fixRange } from '../tools/rule';
import { sortByPath } from '../tools/sort';

export type ModuleClassOption = 'node' | 'external' | 'absolute' | 'relative';
export type TypeImportOption = 'include' | 'exclude' | 'only';

const moduleClassId = Symbol();
const typeImportId = Symbol();

export class ModuleClass extends Enum<{ Key: ModuleClassOption }>(moduleClassId) {
	static readonly Node = new ModuleClass(moduleClassId, { key: 'node' });
	static readonly External = new ModuleClass(moduleClassId, { key: 'external' });
	static readonly Absolute = new ModuleClass(moduleClassId, { key: 'absolute' });
	static readonly Relative = new ModuleClass(moduleClassId, { key: 'relative' });
}

export class TypeImport extends Enum<{ Key: TypeImportOption }>(typeImportId) {
	static readonly Include = new TypeImport(typeImportId, { key: 'include' });
	static readonly Exclude = new TypeImport(typeImportId, { key: 'exclude' });
	static readonly Only = new TypeImport(typeImportId, { key: 'only' });
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
	{ class: ModuleClass.Node.key },
	{ class: ModuleClass.External.key },
	{ class: ModuleClass.Absolute.key },
	{ class: ModuleClass.Relative.key },
];

function groupIndex(node: ImportModuleDeclaration, groups: GroupConfiguration[]) {
	if (typeof node.source.value !== 'string') {
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
		if (typeof group === 'string') {
			return importPath.startsWith(group);
		}

		if (!Reflect.has(group, 'path')) {
			return false;
		}

		if (isTypeImport) {
			return importPath.startsWith(group.path) && group.types !== TypeImport.Exclude.key;
		}

		return importPath.startsWith(group.path) && group.types !== TypeImport.Only.key;
	});

	if (hardCodedIndex >= 0) {
		return hardCodedIndex;
	}

	// split path at / delimiter but keep first / for absolute paths
	const [moduleName] = importPath.split(/(?=^\/)|\//u);

	if (!moduleName) {
		throw new Error(`group-imports: unexpected undefined module name for path '${importPath}'`);
	}

	let moduleClass = ModuleClass.External;

	if (isBuiltin(moduleName)) {
		moduleClass = ModuleClass.Node;
	} else if (/^(?:\/|\.)/u.exec(moduleName)) {
		moduleClass = isAbsolute(moduleName) ? ModuleClass.Absolute : ModuleClass.Relative;
	}

	const classIndex = findIndex((group) => {
		if (typeof group !== 'object' || !Reflect.has(group, 'class')) {
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
	lineCount: number,
) {
	if (!previous || !next) {
		throw new Error(`group-imports: unexpected undefined node`);
	}

	if (linesBetween(previous, next) === lineCount) {
		return;
	}

	context.report({
		node: previous,
		message: `Expected ${lineCount} empty line${lineCount === 1 ? '' : 's'} after import`,
		fix(fixer) {
			if (!previous.range || !next.range || !onlyWhiteSpaceBetween(previous, next, context.getSourceCode())) {
				return null;
			}

			return fixer.replaceTextRange([previous.range[1], next.range[0]], ''.padEnd(lineCount + 1, '\n'));
		},
	});
}

function groupLabels(groups: GroupConfiguration[]) {
	return groups.map((group) => {
		if (group instanceof Array || typeof group === 'string' || Reflect.has(group, 'path')) {
			return 'custom';
		}

		return group.class.toUpperCase();
	});
}

export const rule: RuleModule<GroupConfiguration[]> = {
	meta: {
		fixable: 'code',
		schema: {
			definitions: {
				typeImportConfiguration: {
					enum: [...TypeImport.keys()],
				},
				moduleConfiguration: {
					oneOf: [
						{ type: 'string' },
						{
							type: 'object',
							properties: {
								class: {
									enum: [...ModuleClass.keys()],
								},
								types: {
									$ref: '#/definitions/typeImportConfiguration',
								},
							},
							required: ['class'],
							additionalProperties: false,
						},
						{
							type: 'object',
							properties: {
								path: {
									type: 'string',
								},
								types: {
									$ref: '#/definitions/typeImportConfiguration',
								},
							},
							required: ['path'],
							additionalProperties: false,
						},
					],
				},
			},
			type: 'array',
			items: {
				anyOf: [
					{
						$ref: '#/definitions/moduleConfiguration',
					},
					{
						type: 'array',
						items: {
							$ref: '#/definitions/moduleConfiguration',
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

		const sorted = sortByPath(imports, ['index']);

		let previousIndex = sorted[0]?.index;

		const groups = sorted.reduce<ImportModuleDeclaration[][]>(
			(result, value) => {
				const current = result.at(-1);

				if (current && previousIndex === value.index) {
					current.push(value.node);
				} else {
					result.push([value.node]);
				}

				previousIndex = value.index;

				return result;
			},
			[[]],
		);

		if (sorted.some((node, i) => node !== imports[i])) {
			fixRange(context, {
				range: extrema(imports.map(({ node }) => node)),
				message: `Expected import groups: ${groupLabels(groupConfigurations).join(', ')}`,
				code: groups.map((nodes) => nodes.map((node) => source.getText(node)).join('\n')).join('\n\n'),
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
				const [current] = group;
				checkLines(context, previous, current, 1);
			});
		}

		return {};
	},
};
