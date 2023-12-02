import fs from 'node:fs/promises';

import { mergeLines } from './merge-lines.mjs';

const n = parseInt(process.argv[2]);

await fs.writeFile(
	new URL('../src/extract-overloads.d.ts', import.meta.url),
	mergeLines(function* () {
		yield `export type ExtractOverloads<T extends Function> =`;

		for (let i = n; i > 1; i--) {
			const indexes = Array.from({ length: i }).map((_, index) => index + 1);

			yield `\tT extends {`;

			for (const index of indexes) {
				yield `\t\t(...args: infer A${index}): infer R${index};`;
			}

			yield `\t} ?`;
			yield `\t[`;

			for (const index of indexes) {
				yield `\t\t(...args: A${index}) => R${index},`;
			}

			yield `\t] :`;
		}

		yield `\t[T];`;
	}),
);
