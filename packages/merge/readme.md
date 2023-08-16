# Merge objects in JavaScript

> Utility functions for merging composite data structures

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@shigen/merge.svg
[npm-url]: https://npmjs.org/package/@shigen/merge

This library is a simple tool to merge composite data structures in JavaScript. Currently only objects and arrays are merged, other composite data structures like `Set` or `Map` are treated like other scalar values.

The provided merge functions are pure, i.e. they don't modify the input and create a deep copy via [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone). Please note that your environment must have this method implemented or polyfilled, otherwise you'll get an error. If your input contains `symbol`s the copy won't be really deep, as a `symbol` cannot be cloned and is merged by reference instead.

When two arrays are merged, the result will be a new array. When two objects or an array and an object are merged, the result will be a new object. In the latter case, the array will be treated like an object with only its enumerable keys.

Customized merge functions can be created with the higher order `createMerge()` function.

# API

## `merge(target, source)`

The `merge` function takes two inputs and merges the source flat into the target and returns the result.

## `deepMerge(target, source)`

The `deepMerge` function takes two inputs and merges the source deep into the target and returns the result. The merging is applied recursively for every nested composite data structure that is supported.

## `createMerge(options)`

The `createMerge` function returns a new merge function that can be customized with a custom visitor function. The options are defined by the following types.

```ts
interface VisitorState {
	readonly key: string;
	readonly values: readonly [unknown, unknown];
}

type VisitorFunction = (state: VisitorState) => unknown;

interface MergeOptions {
	readonly visit: VisitorFunction;
}
```

The visitor function is called for every node in the data structure and applies its return value to the result. For example this could be used to concat nested arrays instead of merging them.
