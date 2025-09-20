# Async Array

Wrapper around an `Iterable` or `AsyncIterable` providing the methods from the [Async Iterator Helpers proposal](https://github.com/tc39/proposal-async-iterator-helpers).

[npm-image]: https://img.shields.io/npm/v/@shigen/async-array.svg
[npm-url]: https://npmjs.org/package/@shigen/async-array

[![NPM Version][npm-image]][npm-url]

## Usage

```ts
// callbacks don't run immediately
const squares = AsyncArray.from([1, 2, 3]).map(async (x) => {
	console.log(x);
	return x * x;
});

// callbacks are called once when the array is consumed with toSync or for await
console.log(await squares.toSync());
	// 1
	// 2
	// 3
	// [1, 4, 9]

// to prevent side effects, callbacks won't run again
console.log(await squares.toSync())
	// [1, 4, 9]
```
