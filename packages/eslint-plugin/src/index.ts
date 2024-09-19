/* eslint-disable @typescript-eslint/naming-convention */
import type { ESLint } from 'eslint';

import { rule as groupImports } from './rules/group-imports';
import { rule as sortImports } from './rules/sort-imports';

const plugin: ESLint.Plugin = {
	rules: {
		'group-imports': groupImports,
		'sort-imports': sortImports,
	},
};

export default plugin;
