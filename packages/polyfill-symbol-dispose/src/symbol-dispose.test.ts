import assert from 'node:assert';
import test from 'node:test';

import nvexeca from 'nvexeca';

test('node 16 dispose', async () => {
	const { childProcess } = await nvexeca('16', 'node', [
		'-e',
		`require('./dist/commonjs/symbol-dispose.js');console.log(Symbol.dispose.toString())`,
	]);

	assert(childProcess);

	const { exitCode, stdout } = await childProcess;

	assert.equal(exitCode, 0);
	assert.equal(stdout, 'Symbol(@shigen/polyfill-symbol-dispose:Symbol.dispose)');
});

test('node 16 asyncDispose', async () => {
	const { childProcess } = await nvexeca('16', 'node', [
		'-e',
		`require('./dist/commonjs/symbol-dispose.js');console.log(Symbol.asyncDispose.toString())`,
	]);

	assert(childProcess);

	const { exitCode, stdout } = await childProcess;

	assert.equal(exitCode, 0);
	assert.equal(stdout, 'Symbol(@shigen/polyfill-symbol-dispose:Symbol.asyncDispose)');
});

test('node 18 dispose', async () => {
	const { childProcess } = await nvexeca('18', 'node', [
		'-e',
		`require('./dist/commonjs/symbol-dispose.js');console.log(Symbol.dispose.toString())`,
	]);

	assert(childProcess);

	const { exitCode, stdout } = await childProcess;

	assert.equal(exitCode, 0);
	assert.equal(stdout, 'Symbol(nodejs.dispose)');
});

test('node 18 asyncDispose', async () => {
	const { childProcess } = await nvexeca('18', 'node', [
		'-e',
		`require('./dist/commonjs/symbol-dispose.js');console.log(Symbol.asyncDispose.toString())`,
	]);

	assert(childProcess);

	const { exitCode, stdout } = await childProcess;

	assert.equal(exitCode, 0);
	assert.equal(stdout, 'Symbol(nodejs.asyncDispose)');
});
