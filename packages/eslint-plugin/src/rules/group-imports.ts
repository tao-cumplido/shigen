import module from 'node:module';
import { isAbsolute } from 'node:path';

import type { ImportModuleDeclaration } from '../tools/ast';
import type { RuleContext, RuleModule } from '../tools/rule';
import { extrema, importModules, isTypeImportOrExport, linesBetween, onlyWhiteSpaceBetween } from '../tools/ast';
import { fixRange } from '../tools/rule';
import { sortByPath } from '../tools/sort';

export enum ModuleClass {
	Node = 'node',
	External = 'external',
	Absolute = 'absolute',
	Relative = 'relative',
}

export enum TypeImportConfiguration {
	Include = 'include',
	Exclude = 'exclude', // eslint-disable-line @typescript-eslint/no-shadow
	Only = 'only',
}

interface ModuleClassConfiguration {
	class: ModuleClass;
	types?: TypeImportConfiguration;
}

interface ModulePathConfiguration {
	path: string;
	types?: TypeImportConfiguration;
}

type ModuleConfiguration = string | ModulePathConfiguration | ModuleClassConfiguration;

export type GroupConfiguration = ModuleConfiguration | ModuleConfiguration[];

const defaultConfiguration: GroupConfiguration[] = [
	{ class: ModuleClass.Node },
	{ class: ModuleClass.External },
	{ class: ModuleClass.Absolute },
	{ class: ModuleClass.Relative },
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
			return importPath.startsWith(group.path) && group.types !== TypeImportConfiguration.Exclude;
		}

		return importPath.startsWith(group.path) && group.types !== TypeImportConfiguration.Only;
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

	if (module.isBuiltin(moduleName)) {
		moduleClass = ModuleClass.Node;
	} else if (/^(?:\/|\.)/u.exec(moduleName)) {
		moduleClass = isAbsolute(moduleName) ? ModuleClass.Absolute : ModuleClass.Relative;
	}

	const classIndex = findIndex((group) => {
		if (typeof group !== 'object' || !Reflect.has(group, 'class')) {
			return false;
		}

		if (isTypeImport) {
			return group.class === moduleClass && group.types !== TypeImportConfiguration.Exclude;
		}

		return group.class === moduleClass && group.types !== TypeImportConfiguration.Only;
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
					enum: ['include', 'exclude', 'only'],
				},
				moduleConfiguration: {
					oneOf: [
						{ type: 'string' },
						{
							type: 'object',
							properties: {
								class: {
									enum: ['node', 'external', 'absolute', 'relative'],
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

		const source = context.getSourceCode();

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
