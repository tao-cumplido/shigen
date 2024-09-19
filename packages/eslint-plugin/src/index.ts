import type { ESLint } from 'eslint';

import { rule as groupImports } from './rules/group-imports.js';
import { rule as sortImports } from './rules/sort-imports.js';

export const rules = {
	'group-imports': groupImports,
	'sort-imports': sortImports,
};

const plugin = {
	rules,
} satisfies ESLint.Plugin;

export default plugin;
