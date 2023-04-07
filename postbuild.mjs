import fs from 'node:fs/promises';

import glob from 'fast-glob';

for (const entry of await glob('packages/**/dist/cjs/**/*.js')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(
		entry.replace(/\.js$/u, '.cjs'),
		contents.replaceAll(/require\("(?<file>.+)\.js"\)/gu, `require("$1.cjs")`),
	);
	await fs.rm(entry);
}

for (const entry of await glob('packages/**/dist/cjs/**/*.js.map')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(entry, contents.replaceAll(/\.js"/gu, `.cjs"`));
}

for (const entry of await glob('packages/enum/dist/**/enum.d.ts')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(entry, contents.replace('#private;', '#brand: Brand;'));
}

for (const entry of await glob('packages/**/dist/cjs/**/*.d.ts')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(
		entry.replace(/\.ts$/u, '.cts'),
		contents.replaceAll(/from '(?<file>.+)\.js';/gu, `from '$1.cjs';`),
	);
	await fs.rm(entry);
}

for (const entry of await glob('packages/**/dist/cjs/**/*.d.ts.map')) {
	const contents = await fs.readFile(entry, 'utf-8');
	await fs.writeFile(entry, contents.replaceAll(/\.d\.ts"/gu, `.d.cts"`));
}
