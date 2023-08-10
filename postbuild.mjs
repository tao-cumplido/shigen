import fs from 'node:fs/promises';
import path from 'node:path';

import glob from 'fast-glob';

// https://www.sensedeep.com/blog/posts/2021/how-to-create-single-source-npm-module.html
for (const entry of await glob('packages/**/dist/esm', { onlyDirectories: true })) {
	fs.writeFile(path.join(entry, 'package.json'), JSON.stringify({ type: 'module' }));
}
