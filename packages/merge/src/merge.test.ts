import assert from 'node:assert';

import test from 'node:test';

import { deepMerge, merge } from './merge.js';

test('merge arrays', () => {
	const target = [1, 2, 3] as const;
	const source = [0, 0] as const;
	const result = merge(target, source);

	assert.deepEqual(result, [0, 0, 3]);
});

test('merge objects', () => {
	const target = {
		a: 0,
		b: 0,
	} as const;

	const source = {
		a: 1,
		c: 1,
	} as const;

	const result = merge(target, source);

	assert.deepEqual(result, {
		a: 1,
		b: 0,
		c: 1,
	});
});

test('merge source array', () => {
	const target = { a: 0 } as const;
	const source = [0] as const;
	const result = merge(target, source);

	assert.deepEqual(result, {
		0: 0,
		a: 0,
	});
});

test('merge target array', () => {
	const target = [0] as const;
	const source = { a: 0 } as const;
	const result = merge(target, source);

	assert.deepEqual(result, {
		0: 0,
		a: 0,
	});
});

test('deepmerge', () => {
	const target = {
		a: 0,
		b: [{ a: 0 }, 0, 1],
		c: {
			c0: 0,
		},
		d: 0,
	} as const;

	const source = {
		a: 1,
		b: [{ b: 0 }, 2],
		c: {
			c1: 0,
		},
		e: 0,
	} as const;

	const result = deepMerge(target, source);

	assert.deepEqual(result, {
		a: 1,
		b: [{ a: 0, b: 0 }, 2, 1],
		c: {
			c0: 0,
			c1: 0,
		},
		d: 0,
		e: 0,
	});
});
