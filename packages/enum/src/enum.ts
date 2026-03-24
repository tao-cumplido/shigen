import type { Primitive, SetRequired, Simplify } from "type-fest";

export type EnumKey = NonNullable<Primitive>;

export type EnumLike<Key extends EnumKey> = {
	readonly key?: Key;
	readonly name?: string;
};

export type EnumInstance<Id extends symbol, Key extends EnumKey> = { [K in Id]: never; } & SetRequired<EnumLike<Key>, keyof EnumLike<Key>>;

export type EnumConstructor<
	Id extends symbol,
	Key extends EnumKey,
	Arguments extends unknown[] = [fields?: EnumLike<Key>]
> = {
	new (check: Id, ...args: Arguments): EnumInstance<Id, Key>;
	lookupKey<Class extends { prototype: EnumInstance<Id, Key>; }>(
		this: Class,
		key: Key,
	): Class["prototype"] | undefined;
	keys(): IterableIterator<Key>;
	values<Class extends { prototype: EnumInstance<Id, Key>; }>(this: Class): IterableIterator<Class["prototype"]>;
};

type NextKey<T> = (key: T) => T;

export type KeyConfig<T> = {
	readonly initialKey?: T;
	readonly nextKey?: NextKey<T>;
};

export type EnumFactory = {
	<Id extends symbol, Key extends EnumKey = number>(id: Id): EnumConstructor<
		Id,
		Key,
		number extends Key ?
			[fields?: EnumLike<number>] :
			[fields: SetRequired<EnumLike<Key>, "key">]
	>;

	<Id extends symbol, Key extends EnumKey = number>(
		id: Id,
		keyConfig?: Key extends number ?
			KeyConfig<Key> :
			SetRequired<KeyConfig<Key>, keyof KeyConfig<Key>>,
	): EnumConstructor<
		Id,
		Key
	>;
};

function validateKey(value: unknown) {
	if (![ "string", "number", "bigint", "boolean", "symbol", ].includes(typeof value)) {
		throw new Error(`invalid key value, must be non-nullable primitive, got '${JSON.stringify(value)}'`);
	}
}

// @ts-expect-error
export const Enum: EnumFactory = (id: symbol, keyConfig?: KeyConfig<EnumKey>) => {
	const instances = new Map<EnumKey, Simplify<EnumInstance<symbol, EnumKey>>>();

	const { nextKey = (key: number) => key + 1, } = keyConfig ?? {};
	let { initialKey: currentKey = 0, } = keyConfig ?? {};

	validateKey(currentKey);

	// eslint-disable-next-line ts/no-shadow
	return class Enum {
		static lookupKey(key: EnumKey) {
			return instances.get(key);
		}

		static keys() {
			return instances.keys();
		}

		static values() {
			return instances.values();
		}

		#key: EnumKey;
		#name?: string | undefined;

		get key() {
			return this.#key;
		}

		get name() {
			if (!this.#name) {
				const entry = Object.entries(this.constructor).find(([ _, item, ]) => item === this);
				this.#name = entry?.[0] ?? "";
			}

			return this.#name;
		}

		constructor(check: symbol, fields?: EnumLike<EnumKey>) {
			if (new.target === Enum) {
				throw new Error(`Enum is an abstract class`);
			}

			if (check !== id) {
				throw new Error(`Enum id mismatch: expected '${id.toString()}', got '${check.toString()}'`);
			}

			this.#key = fields?.key ?? currentKey;
			this.#name = fields?.name;

			validateKey(this.#key);

			if (instances.get(this.#key)) {
				throw new Error(`Enum item with key '${this.#key.toString()}' already defined`);
			}

			currentKey = nextKey(this.#key as number);

			validateKey(currentKey);

			// @ts-expect-error
			instances.set(this.#key, this);
		}
	};
};
