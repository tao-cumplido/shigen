import type { ESLint } from 'eslint';

import { rule as groupImports } from './rules/group-imports';
import { rule as sortImports } from './rules/sort-imports';

const plugin = {
	rules: {
		'group-imports': groupImports,
		'sort-imports': sortImports,
	},
} satisfies ESLint.Plugin;

export default plugin;
