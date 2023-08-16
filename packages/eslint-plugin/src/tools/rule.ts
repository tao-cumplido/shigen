import type { Rule } from 'eslint';
import type { Node } from 'estree';

export interface RuleContext<Configuration extends unknown[]> extends Rule.RuleContext {
	options: Configuration;
}

export interface RuleModule<Configuration extends unknown[]> extends Rule.RuleModule {
	create: (context: RuleContext<Configuration>) => Rule.RuleListener;
}

export function fixRange(
	context: Rule.RuleContext,
	data: {
		range: [Node, Node];
		message: string;
		code: string;
	},
): void {
	const [first, last] = data.range;

	context.report({
		node: last,
		message: data.message,
		fix(fixer) {
			if (!first.range || !last.range) {
				return null;
			}

			return fixer.replaceTextRange([first.range[0], last.range[1]], data.code);
		},
	});
}
