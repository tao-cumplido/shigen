import assert from "node:assert/strict";
import { mock, suite, test } from "node:test";

import { AsyncArray } from "./async-array.ts";

test("map", async () => {
	const result = await new AsyncArray([ 1, 2, 3, ])
		.map((value, index) => Promise.resolve(`${value * index}`))
		.toSync();

	assert.deepEqual(result, [ "0", "2", "6", ]);
});

test("filter", async () => {
	const result = await new AsyncArray([ 1, 2, 3, 4, ])
		.filter((value, index) => Promise.resolve(value < 2 || index === 3))
		.toSync();

	assert.deepEqual(result, [ 1, 4, ]);
});

test("take", async () => {
	const result = await new AsyncArray([ 1, 2, 3, 4, ])
		.take(2)
		.toSync();

	assert.deepEqual(result, [ 1, 2, ]);
});

test("drop", async () => {
	const result = await new AsyncArray([ 1, 2, 3, 4, ])
		.drop(2)
		.toSync();

	assert.deepEqual(result, [ 3, 4, ]);
});

test("flatMap", async () => {
	const result = await new AsyncArray([ "ab", "cd", ])
		.flatMap((value) => Promise.resolve(value.split("")))
		.toSync();

	assert.deepEqual(result, [ "a", "b", "c", "d", ]);
});

suite("reduce", () => {
	test("without initial value", async () => {
		const result = await new AsyncArray([ 1, 1, 1, ])
			.reduce((previous, current, index) => (previous + current) * index);

		assert.equal(result, 6);
	});

	test("with initial value", async () => {
		const result = await new AsyncArray([ 1, 1, 1, ])
			.reduce((previous, current, index) => (previous + current) * index, 0);

		assert.equal(result, 4);
	});
});

test("forEach", async () => {
	const callback = mock.fn(() => Promise.resolve());

	await new AsyncArray([ 1, 2, 3, ]).forEach(callback);

	assert.equal(callback.mock.callCount(), 3);
	assert.deepEqual(callback.mock.calls[0]?.arguments, [ 1, 0, ]);
	assert.deepEqual(callback.mock.calls[1]?.arguments, [ 2, 1, ]);
	assert.deepEqual(callback.mock.calls[2]?.arguments, [ 3, 2, ]);
});

suite("some", () => {
	test("truthy", async () => {
		const predicate = mock.fn((value: number, index: number) => Promise.resolve(value * index));
		const result = await new AsyncArray([ 1, 1, 1, ]).some(predicate);

		assert.equal(result, true);
		assert.equal(predicate.mock.callCount(), 2);
	});

	test("falsy", async () => {
		const predicate = mock.fn((value: number, index: number) => Promise.resolve(value - index));
		const result = await new AsyncArray([ 0, 1, 2, ]).some(predicate);

		assert.equal(result, false);
		assert.equal(predicate.mock.callCount(), 3);
	});
});

suite("every", () => {
	test("truthy", async () => {
		const predicate = mock.fn((value: number, index: number) => Promise.resolve(value + index));
		const result = await new AsyncArray([ 1, 0, 0, ]).every(predicate);

		assert.equal(result, true);
		assert.equal(predicate.mock.callCount(), 3);
	});

	test("falsy", async () => {
		const predicate = mock.fn((value: number, index: number) => Promise.resolve(value - index));
		const result = await new AsyncArray([ 1, 1, 1, ]).every(predicate);

		assert.equal(result, false);
		assert.equal(predicate.mock.callCount(), 2);
	});
});

suite("find", () => {
	test("with result", async () => {
		const result = await new AsyncArray([ 1, 2, 3, 4, ])
			.find((value) => Promise.resolve(value > 2));

		assert.equal(result, 3);
	});

	test("without result", async () => {
		const result = await new AsyncArray([ 1, 1, 1, ])
			.find((value) => Promise.resolve(value > 2));

		assert.equal(result, void 0);
	});
});
