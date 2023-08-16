import type { AST, Linter } from 'eslint';
import type { Comment, SourceLocation } from 'estree';

import type { RuleModule } from '../../tools/rule';

type LocationComment = Comment & { loc: SourceLocation };

interface Parser {
	parse?: (code: string, options?: Linter.ParserOptions) => AST.Program;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	parseForESLint?: (code: string, options?: Linter.ParserOptions) => Linter.ESLintParseResult;
}

export interface Configuration {
	ignorePatterns: string[];
	extendDefaultIgnorePatterns: boolean;
}

const defaultConfiguration: Configuration = {
	ignorePatterns: ['^eslint-', '^@ts-'],
	extendDefaultIgnorePatterns: false,
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function mapPatternReducer(result: RegExp[], pattern: string) {
	try {
		result.push(new RegExp(pattern, 'u'));
	} catch {}

	return result;
}

function parseIgnorePatterns(config?: Partial<Configuration>) {
	if (!config?.ignorePatterns) {
		return;
	}

	const ignorePatterns = new Set(config.ignorePatterns);

	if (config.extendDefaultIgnorePatterns) {
		defaultConfiguration.ignorePatterns.forEach((pattern) => ignorePatterns.add(pattern));
	}

	return [...ignorePatterns].reduce(mapPatternReducer, []);
}

export const rule: RuleModule<[Partial<Configuration>?]> = {
	meta: {
		schema: [
			{
				type: 'object',
				properties: {
					ignorePatterns: {
						type: 'array',
						items: {
							type: 'string',
						},
					},
					extendDefaultIgnorePatterns: {
						type: 'boolean',
					},
				},
			},
		],
	},
	create(context) {
		function isNonSyntaxError(error: unknown): error is { message: string } {
			if (error instanceof SyntaxError) {
				return false;
			}

			return (
				context.parserPath.includes('@typescript-eslint') &&
				// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
				!(error instanceof require('@typescript-eslint/typescript-estree/dist/node-utils').TSError)
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
		const parser = require(context.parserPath) as unknown as Parser;
		const source = context.getSourceCode();

		const ignorePatterns =
			parseIgnorePatterns(context.options[0]) ?? defaultConfiguration.ignorePatterns.reduce(mapPatternReducer, []);

		// generate power set of all comments to process and sort sets by size descending
		const commentSets = source
			.getAllComments()
			.filter((comment): comment is LocationComment => {
				if (!comment.loc) {
					return false;
				}

				if (comment.type === 'Block' && comment.value.startsWith('*')) {
					// ignore doc comments
					return false;
				}

				return ignorePatterns.every((pattern) => !pattern.test(comment.value.trim()));
			})
			.reduce<LocationComment[][]>((sets, comment) => [...sets, ...sets.map((set) => [...set, comment])], [[]])
			.sort((a, b) => b.length - a.length);

		const reportedComments = new Set<LocationComment>();

		for (const set of commentSets) {
			if (set.some((comment) => reportedComments.has(comment))) {
				continue;
			}

			// we modify the lines in place so make a copy for each test
			const lines = [...source.getLines()];

			// uncomment locations in source
			for (const comment of set) {
				const startIndex = comment.loc.start.line - 1;
				const start = [...(lines[startIndex] ?? '')];

				// replace comment delimiters with spaces to not move locations for multiple comments on same line
				start.splice(comment.loc.start.column, 2, ' ', ' ');

				if (comment.type === 'Block') {
					const endIndex = comment.loc.end.line - 1;

					if (startIndex === endIndex) {
						start.splice(comment.loc.end.column - 2, 2, ' ', ' ');
					} else {
						const end = [...(lines[endIndex] ?? '')];
						end.splice(comment.loc.end.column - 2, 2, ' ', ' ');
						lines[endIndex] = end.join('');
					}
				}

				lines[startIndex] = start.join('');
			}

			try {
				const parse = parser.parse ?? parser.parseForESLint;

				if (!parse) {
					throw new Error(`unexpected error: no 'parse' method found`);
				}

				parse(lines.join('\n'), {
					...context.parserOptions,
					// provide same parser defaults as eslint (https://github.com/eslint/eslint/blob/82669fa66670a00988db5b1d10fe8f3bf30be84e/lib/linter/linter.js#L636-L645)
					// the typescript parser would potentially error without the 'filePath' or 'range' options (https://github.com/typescript-eslint/typescript-eslint/issues/2742)
					loc: true,
					range: true,
					raw: true,
					tokens: true,
					comment: true,
					eslintVisitorKeys: true,
					eslintScopeManager: true,
					filePath: context.getFilename(),
					// don't parse a typescript source in a project context
					// it'd be much slower and is not necessary for simple syntax validation
					project: undefined,
					projects: undefined,
				});

				for (const comment of set) {
					reportedComments.add(comment);
					context.report({
						loc: comment.loc,
						message: 'comment contains code',
					});
				}
			} catch (error: unknown) {
				if (isNonSyntaxError(error)) {
					const position = { line: 1, column: 0 };
					context.report({
						loc: { start: position, end: position },
						message: error.message,
					});
				}
			}
		}

		return {};
	},
};
