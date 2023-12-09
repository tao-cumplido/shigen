# Enums for JavaScript

[npm-image]: https://img.shields.io/npm/v/@shigen/enum.svg
[npm-url]: https://npmjs.org/package/@shigen/enum

[![NPM Version][npm-image]][npm-url]

## Usage

`Enum` is a class factory that takes a symbol and produces a class constructor that is bound to that symbol. The generated constructor expects the same symbol passed on instantiation. This makes it possible to prevent instantiation of the class outside of the module when the symbol is not exported. The examples below demonstrate this pattern.

Enum instances have an implicit `key` property that by default starts at `0` and auto increments. The key can be specified explicitly in the constructor for individual instances. Implicit keys keep auto incrementing from the last key that was explicitly specified. No two instances can have the same key and the constructor will throw an error in this case. Keys can be any primitive value, except `null` and `undefined`. The `Enum` factory function can be configured to use an initial key other than `0` and how implicit keys should be generated.

Enum instances also have an implicit `name` property that is set to the name of the assigned identifier when the instance is a static member of its constructor. The `name` property needs to be set explicitly if its value should be reliable on runtime, especially if the code is minified.

```js
import assert from 'node:assert';

import { Enum } from '@shigen/enum';

const id = Symbol('Color');

export class Color extends Enum(id) {
	static Red = new Color(id);
	static Green = new Color(id, { key: 10 });
	static Blue = new Color(id, { name: 'Blue' });
}

assert.equal(Color.lookupKey(0), Color.Red);
assert.equal(Color.Green.key, 10);
assert.equal(Color.Blue.key, 11);
assert.equal(Color.Green.name, 'Green'); // probably fails with minified code
assert.equal(Color.Blue.name, 'Blue'); // always passes, name was explicitly set
assert.deepEqual([...Color.values()], [Color.Red, Color.Green, Color.Blue]);
```

The `Enum` factory function can be configured to generate keys other than numbers.

```js
import assert from 'node:assert';

import { Enum } from '@nishin/enum';

const id = Symbol('E');

export class E extends Enum(id, {
	initialKey: 'a',
	nextKey: (key) => String.fromCharCode(key.charCodeAt(0) + 1),
}) {
	static A = new E(id);
	static B = new E(id);
	static C = new E(id);
}

assert.equal(E.A.key, 'a');
assert.equal(E.B.key, 'b');
assert.equal(E.C.key, 'c');
```

## TypeScript

The `Enum` factory can be configured at the type level with a generic type argument. It's possible to specify the type for the `key` property and create [branded types](https://www.totaltypescript.com/workshops/advanced-typescript-patterns#branded-types) for the instances. Branded types are useful to prevent instances of different enum classes to be assignable to each other.

```ts
import { Enum } from '@shigen/enum';

const idA = Symbol('A');

class A extends Enum<{ Brand: 'A' }>(idA) {
	static readonly a = new A(idA);
}

const idB = Symbol('B');

class B extends Enum<{ Brand: 'B' }>(idB) {
	static readonly b = new B(idB);
}

declare function test(a: A): void;

test(B.b);
// Argument of type 'B' is not assignable to parameter of type 'A'.
//   Types of property '#brand' are incompatible.
//     Type '"B"' is not assignable to type '"A"'.
```

Specifying a type for the `key` property other than `number` either requires to configure the `initialKey` and `nextKey` options or set all keys explicitly on instantiation.

```ts
import { Enum } from '@shigen/enum';

const idA = Symbol('A');

class A extends Enum<{ Key: string }>(idA, {
	initialKey: 'a',
	nextKey: (key) => String.fromCharCode(key.charCodeAt(0) + 1),
}) {
	static readonly a = new A(idA); // implicit key generation configured
}

const idB = Symbol('B');

class B extends Enum<{ Key: string }>(idB) {
	static readonly b = new B(idB, { key: 'b' }); // key needs to be set explicitly
}
```
