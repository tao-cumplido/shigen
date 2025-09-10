import assert from "node:assert";
import test from "node:test";

import type { SetRequired } from "type-fest";
import { expectTypeOf } from "expect-type";

import type { EnumFields } from "./enum.ts";
import { Enum } from "./enum.ts";

test("defaults", () => {
	const id = Symbol();

	class E extends Enum(id) {
		static A = new E(id);
		static B = new E(id);
	}

	expectTypeOf(E.A.key).toEqualTypeOf<number>();
	expectTypeOf(E.lookupKey(0)).toEqualTypeOf<E | undefined>();
	expectTypeOf(E.keys()).toEqualTypeOf<IterableIterator<number>>();
	expectTypeOf(E.values()).toEqualTypeOf<IterableIterator<E>>();

	assert.equal(E.A.key, 0);
	assert.equal(E.B.key, 1);
	assert.equal(E.lookupKey(0), E.A);
	assert.equal(E.lookupKey(1), E.B);
	assert.deepEqual([ ...E.keys(), ], [ 0, 1, ]);
	assert.deepEqual([ ...E.values(), ], [ E.A, E.B, ]);
});

test("TS branding", () => {
	const id = Symbol();

	class A extends Enum(id) {}
	class B extends Enum(id) {}

	expectTypeOf(new A(id)).toEqualTypeOf(new B(id));

	class C extends Enum<{ Brand: "C"; }>(id) {}
	class D extends Enum<{ Brand: "D"; }>(id) {}

	expectTypeOf(new C(id)).not.toEqualTypeOf(new D(id));
});

test("initial key", () => {
	const id = Symbol();

	class E extends Enum(id, { initialKey: 1, }) {
		static A = new E(id);
		static B = new E(id);
	}

	assert.equal(E.lookupKey(0), undefined);
	assert.equal(E.A.key, 1);
	assert.equal(E.B.key, 2);
});

test("explicit key", () => {
	const id = Symbol();

	class E extends Enum(id) {
		static A = new E(id);
		static B = new E(id, { key: 10, });
		static C = new E(id);
	}

	assert.equal(E.A.key, 0);
	assert.equal(E.B.key, 10);
	assert.equal(E.C.key, 11);
});

test("custom key generator", () => {
	const id = Symbol();

	class E extends Enum(id, { nextKey: (key) => key + 2, }) {
		static A = new E(id);
		static B = new E(id);
		static C = new E(id);
	}

	assert.equal(E.A.key, 0);
	assert.equal(E.B.key, 2);
	assert.equal(E.C.key, 4);
});

test("non-number keys with config", () => {
	const id = Symbol();

	class E extends Enum<{ Key: string; }>(id, {
		initialKey: "a",
		nextKey: (key) => String.fromCharCode(key.charCodeAt(0) + 1),
	}) {
		static A = new E(id);
		static B = new E(id);
	}

	expectTypeOf(E).toExtend<new (check: symbol, fields?: EnumFields<{ Key: string; }>) => E>();

	assert.equal(E.A.key, "a");
	assert.equal(E.B.key, "b");
});

test("non-number keys without config", () => {
	const id = Symbol();

	class E extends Enum<{ Key: string; }>(id) {
		static A = new E(id, { key: "a", });
		static B = new E(id, { key: "b", });
	}

	expectTypeOf(E).toExtend<new (check: symbol, fields: SetRequired<EnumFields<{ Key: string; }>, "key">) => E>();

	assert.equal(E.A.key, "a");
	assert.equal(E.B.key, "b");
});

test("implicit names", () => {
	const id = Symbol();

	class E extends Enum(id) {
		static A = new E(id);
		static B = new E(id);
	}

	assert.equal(E.A.name, "A");
	assert.equal(E.B.name, "B");
});

test("explicit names", () => {
	const id = Symbol();

	class E extends Enum(id) {
		static A = new E(id, { name: "a", });
		static B = new E(id, { name: "b", });
	}

	assert.equal(E.A.name, "a");
	assert.equal(E.B.name, "b");
});

test("abstract base class", () => {
	const id = Symbol();
	const E = Enum(id);
	assert.throws(() => new E(id));
});

test("id mismatch", () => {
	class E extends Enum(Symbol()) {}
	assert.throws(() => new E(Symbol()));
});

test("invalid duplicate keys", () => {
	const id = Symbol();

	class E extends Enum(id) {
		static A = new E(id);
	}

	assert.throws(() => new E(id, { key: 0, }));
});

test("invalid initial key", () => {
	// @ts-expect-error
	assert.throws(() => Enum(Symbol(), { initialKey: [], }));
});

test("invalid explicit key", () => {
	const id = Symbol();
	class E extends Enum(id) {}
	// @ts-expect-error
	assert.throws(() => new E(id, { key: [], }));
});

test("invalid generated key", () => {
	const id = Symbol();
	// @ts-expect-error
	class E extends Enum(id, { nextKey: () => [], }) {}

	assert.throws(() => new E(id));
});
