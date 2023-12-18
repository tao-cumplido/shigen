import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { createProxy } from './proxy.js';
import { createTemporaryDirectory } from './temporary-directory.js';

test('spot checks', async () => {
	await using tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);
	await fsProxy.writeFile('a', '');
	assert.deepEqual(await fs.readdir(tempDir.path), ['a']);
	await fsProxy.copyFile('a', 'b');
	assert.deepEqual(await fs.readdir(tempDir.path), ['a', 'b']);
	assert.equal(fsProxy.constants, fs.constants);
});

test('invalid path argument', async () => {
	await using tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);
	// @ts-expect-error
	assert.rejects(async () => fsProxy.readdir(new URL(import.meta.url)));
});

test('invalid parent dir access', async () => {
	await using tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);
	assert.rejects(async () => fsProxy.readdir('..'));
});

test('unsupported property', async () => {
	await using tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);
	// @ts-expect-error
	assert.throws(() => fsProxy.iDontExist);
});
