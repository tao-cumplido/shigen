import test from 'ava';

import { deepMerge, merge } from './merge.js';

test('merge arrays', ({ deepEqual }) => {
	const target = [1, 2, 3] as const;
	const source = [0, 0] as const;
	const result = merge(target, source);

	deepEqual(result, [0, 0, 3]);
});

test('merge objects', ({ deepEqual }) => {
	const target = {
		a: 0,
		b: 0,
	} as const;

	const source = {
		a: 1,
		c: 1,
	} as const;

	const result = merge(target, source);

	deepEqual(result, {
		a: 1,
		b: 0,
		c: 1,
	});
});

test('merge source array', ({ deepEqual }) => {
	const target = { a: 0 } as const;
	const source = [0] as const;
	const result = merge(target, source);

	deepEqual(result, {
		0: 0,
		a: 0,
	});
});

test('merge target array', ({ deepEqual }) => {
	const target = [0] as const;
	const source = { a: 0 } as const;
	const result = merge(target, source);

	deepEqual(result, {
		0: 0,
		a: 0,
	});
});

test('deepmerge', ({ deepEqual }) => {
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

	deepEqual(result, {
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
