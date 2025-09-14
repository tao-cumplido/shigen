import type { Promisable } from "type-fest";

export type AsyncArraySource<T> = Promisable<Iterable<T> | AsyncIterable<T>>;

export class AsyncArray<T = undefined> implements AsyncIterable<T> {
	readonly #source: AsyncArraySource<T>;

	constructor(length: number, indexMap?: (index: number) => T);
	constructor(source: AsyncArraySource<T>);
	constructor(source: number | AsyncArraySource<T>, indexMap: (index: number) => any = () => {}) {
		this.#source = typeof source === "number" ?
			Array.from({ length: source, }, (_, index) => indexMap(index)) :
			source;
	}

	async toSync(): Promise<Array<T>> {
		return Array.fromAsync(await this.#source);
	}

	map<U>(callback: (value: T, index: number) => Promisable<U>): AsyncArray<U> {
		const source = this;

		return new AsyncArray(async function* () {
			let index = 0;

			for await (const item of source) {
				yield await callback(item, index);
				index += 1;
			}
		}());
	}

	filter<S extends T>(predicate: (value: T, index: number) => value is S): AsyncArray<S>;
	filter(predicate: (value: T, index: number) => Promisable<unknown>): AsyncArray<T>;
	filter(predicate: (value: T, index: number) => Promisable<unknown>): AsyncArray<T> {
		const source = this;

		return new AsyncArray(async function* () {
			let index = 0;

			for await (const item of source) {
				if (await predicate(item, index)) {
					yield item;
				}

				index += 1;
			}
		}());
	}

	take(limit: number): AsyncArray<T> {
		const source = this;

		limit = Math.floor(limit);

		return new AsyncArray(async function* () {
			let index = 0;

			for await (const item of source) {
				if (index === limit) {
					break;
				}

				yield item;

				index += 1;
			}
		}());
	}

	drop(limit: number): AsyncArray<T> {
		const source = this;

		limit = Math.floor(limit);

		return new AsyncArray(async function* () {
			let index = 0;

			for await (const item of source) {
				if (index >= limit) {
					yield item;
				}

				index += 1;
			}
		}());
	}

	flatMap<U>(callback: (value: T, index: number) => AsyncArraySource<U>): AsyncArray<U> {
		const source = this;

		return new AsyncArray(async function* () {
			let index = 0;

			for await (const item of source) {
				yield* await callback(item, index);
				index += 1;
			}
		}());
	}

	reduce(callback: (previous: T, current: T, index: number) => Promisable<T>, initialValue?: T): Promise<T>;
	reduce<U>(callback: (previous: U, current: T, index: number) => Promisable<U>, initialValue: U): Promise<U>;
	async reduce(callback: (previous: T, current: T, index: number) => Promisable<T>, initialValue?: T) {
		let index = 0;
		let result = initialValue;

		for await (const item of this) {
			if (typeof result === "undefined") {
				result = item;
			} else {
				result = await callback(result, item, index);
			}

			index += 1;
		}

		return result;
	}

	async forEach(callback: (value: T, index: number) => Promisable<void>): Promise<void> {
		let index = 0;

		for await (const item of this) {
			await callback(item, index);
			index += 1;
		}
	}

	async some(predicate: (value: T, index: number) => Promisable<unknown>): Promise<boolean> {
		let index = 0;

		for await (const item of this) {
			if (await predicate(item, index)) {
				return true;
			}

			index += 1;
		}

		return false;
	}

	async every(predicate: (value: T, index: number) => Promisable<unknown>): Promise<boolean> {
		let index = 0;

		for await (const item of this) {
			if (!(await predicate(item, index))) {
				return false;
			}

			index += 1;
		}

		return true;
	}

	find<S extends T>(predicate: (value: T, index: number) => value is S): Promise<S | undefined>;
	find(predicate: (value: T, index: number) => Promisable<unknown>): Promise<T | undefined>;
	async find(predicate: (value: T, index: number) => Promisable<unknown>): Promise<T | undefined> {
		let index = 0;

		for await (const item of this) {
			if (await predicate(item, index)) {
				return item;
			}

			index += 1;
		}
	}

	async *[Symbol.asyncIterator]() {
		for await (const item of await this.#source) {
			yield item;
		}
	}
}
