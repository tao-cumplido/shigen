import type { ESLint } from "eslint";

import { rule as groupImports } from "./rules/group-imports.ts";
import { rule as sortImports } from "./rules/sort-imports.ts";

export const rules = {
	"group-imports": groupImports,
	"sort-imports": sortImports,
};

const plugin = {
	rules,
} satisfies ESLint.Plugin;

export default plugin;
