/* eslint-disable @typescript-eslint/naming-convention */
import type { Rule } from 'eslint';

import { rule as groupImports } from './rules/group-imports';
import { rule as sortImports } from './rules/sort-imports';

export const rules: Record<string, Rule.RuleModule> = {
	'group-imports': groupImports,
	'sort-imports': sortImports,
};
