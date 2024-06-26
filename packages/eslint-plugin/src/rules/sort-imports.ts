import type { Node } from 'estree';

import type {
	ExportModuleDeclaration,
	ExportSpecifier,
	ImportModuleDeclaration,
	ImportSpecifier,
	ModuleDeclaration,
} from '../tools/ast';
import type { RuleModule } from '../tools/rule';
import type { SortOptions } from '../tools/sort';
import { exportModules, extrema, importModules, isTypeImportOrExport, linesBetween } from '../tools/ast';
import { fixRange } from '../tools/rule';
import { sortByPath } from '../tools/sort';

export enum TypeImportGroupPosition {
	Ignore = 'ignore',
	Top = 'top',
	Bottom = 'bottom',
	AboveValue = 'above-value',
	BelowValue = 'below-value',
}

export enum TypeImportInlinePosition {
	Ignore = 'ignore',
	Start = 'start',
	End = 'End',
}

export interface Configuration extends SortOptions {
	specifier: 'source' | 'rename';
	sortExports: boolean;
	typesInGroup: TypeImportGroupPosition;
	inlineTypes: TypeImportInlinePosition;
}

const defaultConfiguration: Configuration = {
	specifier: 'source',
	locales: ['en-US'],
	numeric: true,
	caseFirst: 'lower',
	sortExports: true,
	typesInGroup: TypeImportGroupPosition.Ignore,
	inlineTypes: TypeImportInlinePosition.Ignore,
};

export const rule: RuleModule<[Partial<Configuration>?]> = {
	meta: {
		fixable: 'code',
		schema: [
			{
				type: 'object',
				properties: {
					locales: {
						type: 'array',
						items: {
							type: 'string',
						},
					},
					sensitivity: {
						enum: ['base', 'accent', 'case', 'variant'],
					},
					ignorePunctuation: {
						type: 'boolean',
					},
					numeric: {
						type: 'boolean',
					},
					caseFirst: {
						enum: ['upper', 'lower', 'false'],
					},
					caseGroups: {
						type: 'boolean',
					},
					specifier: {
						enum: ['source', 'rename'],
					},
					sortExports: {
						type: 'boolean',
					},
					typesInGroup: {
						enum: ['ignore', 'top', 'bottom', 'above-value', 'below-value'],
					},
				},
			},
		],
	},
	create(context) {
		const configuration = { ...defaultConfiguration, ...context.options[0] };

		const source = context.sourceCode;

		const partition = <T extends Node>(result: T[][], node: T, index: number, from: T[]) => {
			if (index > 0 && linesBetween(from[index - 1], node) > 0) {
				result.push([]);
			}

			result.at(-1)?.push(node);

			return result;
		};

		const sortModules = (group: ModuleDeclaration[]) => {
			const sorted = sortByPath(group, ['source', 'value'], configuration);

			if (configuration.typesInGroup !== TypeImportGroupPosition.Ignore) {
				sorted.sort((a, b) => {
					const aIsType = isTypeImportOrExport(a);
					const bIsType = isTypeImportOrExport(b);

					if (aIsType === bIsType) {
						return 0;
					}

					// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
					switch (configuration.typesInGroup) {
						case TypeImportGroupPosition.Top:
							return aIsType ? -1 : 1;
						case TypeImportGroupPosition.Bottom:
							return aIsType ? 1 : -1;
					}

					if (a.source.value === b.source.value) {
						// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
						switch (configuration.typesInGroup) {
							case TypeImportGroupPosition.AboveValue:
								return aIsType ? -1 : 1;
							case TypeImportGroupPosition.BelowValue:
								return aIsType ? 1 : -1;
						}
					}

					return 0;
				});
			}

			if (sorted.some((node, i) => node !== group[i])) {
				fixRange(context, {
					range: extrema(group),
					message: 'Expected modules in group to be sorted',
					code: sorted.map((node) => source.getText(node)).join('\n'),
				});
			}
		};

		const sortSpecifiers = <T extends ImportSpecifier | ExportSpecifier>(specifiers: T[]) => {
			if (!specifiers.length) {
				return;
			}

			const sorted: Array<ExportSpecifier | ImportSpecifier> = (() => {
				if (specifiers[0]?.type === 'ImportSpecifier') {
					const from: 'imported' | 'local' = configuration.specifier === 'source' ? 'imported' : 'local';
					return sortByPath(specifiers as ImportSpecifier[], [from, 'name'], configuration);
				}

				const from: 'exported' | 'local' = configuration.specifier === 'source' ? 'local' : 'exported';
				return sortByPath(specifiers as ExportSpecifier[], [from, 'name'], configuration);
			})();

			if (configuration.inlineTypes !== TypeImportInlinePosition.Ignore) {
				sorted.sort((a, b) => {
					const aIsType = isTypeImportOrExport(a);
					const bIsType = isTypeImportOrExport(b);

					if (aIsType === bIsType) {
						return 0;
					}

					// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
					switch (configuration.inlineTypes) {
						case TypeImportInlinePosition.Start:
							return aIsType ? -1 : 1;
						case TypeImportInlinePosition.End:
							return aIsType ? 1 : -1;
					}

					return 0;
				});
			}

			if (sorted.some((node, i) => node !== specifiers[i])) {
				fixRange(context, {
					range: extrema(specifiers),
					message: 'Expected specifiers to be sorted',
					code: sorted.map((node) => source.getText(node)).join(', '),
				});
			}
		};

		importModules(source)
			.reduce<ImportModuleDeclaration[][]>(partition, [[]])
			.forEach((group) => {
				sortModules(group);
				group.forEach((node) => {
					sortSpecifiers(node.specifiers.filter(($): $ is ImportSpecifier => $.type === 'ImportSpecifier'));
				});
			});

		if (configuration.sortExports) {
			const sortExportSpecifiers = (specifiers: ExportSpecifier[]) => {
				const from: 'exported' | 'local' = configuration.specifier === 'source' ? 'local' : 'exported';
				const sorted = sortByPath(specifiers, [from, 'name'], configuration);

				if (sorted.some((node, i) => node !== specifiers[i])) {
					fixRange(context, {
						range: extrema(specifiers),
						message: 'Expected specifiers to be sorted',
						code: sorted.map((node) => source.getText(node)).join(', '),
					});
				}
			};

			exportModules(source)
				.reduce<ExportModuleDeclaration[][]>(partition, [[]])
				.forEach((group) => {
					sortModules(group);
					group.forEach((node) => sortExportSpecifiers(node.specifiers ?? []));
				});
		}

		return {};
	},
};
