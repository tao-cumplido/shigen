# Test tools

[npm-image]: https://img.shields.io/npm/v/@shigen/test.svg
[npm-url]: https://npmjs.org/package/@shigen/test

[![NPM Version][npm-image]][npm-url]

A package for (potentially) various tools for testing. Each tool will have its own subpath for importing.

The minimum Node.js version supported is 18.18.0.

## `@shigen/test/fs`

Create file system fixtures in a random temporary directory. This tool is inspired by and similar to [`fs-fixture`](https://www.npmjs.com/package/fs-fixture) but provides all methods from `node:fs/promises` relative to the fixture's directory.

### Example

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import type { PackageJson } from 'type-fest';
import { createFixture, jsonData, textData } from '@shigen/test/fs';

test('fs fixture', async () => {
	// supports the explicit resource management proposal
	// note that this requires transpilation via Babel or TS 5.2+
	await using fixture = await createFixture({
		// if using TS a type argument can be provided to jsonData for auto-completion and strictness
		'package.json': jsonData<PackageJson>({
			name: 'test-package',
			version: '1.0.0',
		}),
		// directories are created by nesting objects ...
		'src': {
			'a.js': textData(`console.log('hi from a');`),
			'b.js': textData(`console.log('hi from b');`),
		},
		// ... or by writing the path
		'src/c.js': textData(`console.log('hi from c');`),
	});

	assert(await fixture.exists('package.json'));
	assert(await fixture.exists('src/a.js'));
	assert.equal(
		await fixture.fs.readFile('src/a.js', 'utf-8'),
		`console.log('hi from a');`,
	);
	// ...

	// unnecessary if initialized with await using
	await fixture.remove();
});
```

### API

#### `textData(contents: string, encoding?: BufferEncoding): Buffer`
Semantic wrapper for `Buffer.from`. Useful for populating a `DataTree` input alongside the `jsonData` function.

#### `jsonData<T extends Jsonifiable>(data: T): Buffer`
Create UTF-8 encoded JSON data from input. The `Jsonifiable` type is imported from [`type-fest`](https://www.npmjs.com/package/type-fest#json) and matches all valid JSON data types or objects with a `toJSON` method. `type-fest` provides other useful types like `PackageJson` or `TsConfigJson` that can be used explicitly as type argument to provide auto-completion and validation for known properties.

#### `createFixture(source: string | DataTree): Promise<Fixture>`
Create fixture at a randomly unique path inside the OS's default temporary directory. The fixture can be populated in multiple ways:

- Passing a path to a template directory will copy the templates contents recursively into the fixture's directory.
- Passing a `DataTree` object with the defined directory structure and file contents.
- Using the fixture's `fs` methods to write the files directly after creation.

The fixture can be initialized with the `await using` syntax from the [Explicit Resource Management proposal](https://github.com/tc39/proposal-explicit-resource-management). This syntax is currently supported by transpiling with Babel or TypeScript 5.2+. A polyfill is not needed since the supported Node.js versions already ship one.

#### `DataTree`
A recursive data structure that stores `Buffer`s to write to specified file paths.

```ts
type DataTree = {
	[key: string]: Buffer | DataTree;
}
```

#### `FsProxy`
Proxies calls to `node:fs/promises` to be relative to the fixture's root. Escaping the root with relative paths (`..`) is not allowed and will result in an error being thrown. In contrast to Node's native `fs` module, all path arguments must be given as strings. The `FsProxy` type reflects this restriction. `@types/node` is defined as an optional peer dependency and needs to be installed for the typings to work correctly.

#### `Fixture`
Instances of the `Fixture` class manage access to the fixture on the file system. Shell commands are executed from the fixture's directory with [`execa`'s script interface](https://github.com/sindresorhus/execa/blob/HEAD/docs/scripts.md) like this:

```js
await fixture.run`npm install`;
```

```ts
class Fixture {
	/** The fixture's UUID */
	readonly id: string;

	/** Absolute path on file system */
	readonly path: string;

	/** Access to the file system */
	readonly fs: FsProxy;

	/** Run shell commands inside the fixture's directory with execa's script interface */
	readonly run: Execa$;

	/** Convenience wrapper around fs.access */
	exists(path?: string): Promise<Boolean>;

	/** Remove the fixture's directory from file system */
	remove(): Promise<void>;
}
```
