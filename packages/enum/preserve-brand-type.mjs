import fs from 'node:fs/promises';

import glob from 'fast-glob';

for (const entry of await glob('dist/**/enum.d.ts')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(entry, contents.replace('#private;', `#brand: Read<Config, 'Brand', string>;`));
}
