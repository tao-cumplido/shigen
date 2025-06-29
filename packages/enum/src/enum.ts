import type { Primitive, SetRequired, Simplify } from "type-fest";

type Read<
	Source extends Record<string, unknown>,
	Key extends keyof Source,
	Default extends Source[Key] = Source[Key]
> = Key extends keyof Source ? Source[Key] : Default;

export type EnumKeyPrimitive = NonNullable<Primitive>;

export type EnumConfig<Key extends EnumKeyPrimitive = EnumKeyPrimitive> = {
	Brand?: string;
	Key?: Key;
};

declare class EnumInstance<Config extends Omit<EnumConfig, "Data">> {
	readonly #brand: Read<Config, "Brand", string>;
	readonly key: Read<Config, "Key", number>;
	readonly name: string;
}

export type EnumLike<Config extends Omit<EnumConfig, "Data">> = EnumInstance<Config>;

export type EnumFields<Config extends EnumConfig> = {
	readonly key?: Read<Config, "Key", number>;
	readonly name?: string;
};

export type EnumConstructor<
	Config extends EnumConfig = {},
	Arguments extends unknown[] = [fields?: EnumFields<Config>]
> = {
	new (check: symbol, ...args: Arguments): EnumLike<Config>;
	lookupKey<Class extends { prototype: EnumLike<Config>; }>(
		this: Class,
		key: Read<Config, "Key", number>,
	): Class["prototype"] | undefined;
	keys(): IterableIterator<Read<Config, "Key", number>>;
	values<Class extends { prototype: EnumLike<Config>; }>(this: Class): IterableIterator<Class["prototype"]>;
};

type NextKey<T> = (key: T) => T;

type KeyConfig<T> = {
	initialKey?: T;
	nextKey?: NextKey<T>;
};

export type EnumFactory = {
	(id: symbol, keyConfig?: KeyConfig<number>): EnumConstructor;

	<Config extends EnumConfig<number>>(
		id: symbol,
		keyConfig?: KeyConfig<number>,
	): EnumConstructor<Config, [fields?: EnumFields<Config>]>;

	<Config extends SetRequired<EnumConfig<Exclude<EnumKeyPrimitive, number>>, "Key">>(
		id: symbol,
		keyConfig: SetRequired<KeyConfig<Read<Config, "Key">>, "initialKey" | "nextKey">,
	): EnumConstructor<Config, [fields?: EnumFields<Config>]>;

	<Config extends SetRequired<EnumConfig<Exclude<EnumKeyPrimitive, number>>, "Key">>(
		id: symbol,
	): EnumConstructor<Config, [fields: SetRequired<EnumFields<Config>, "key">]>;
};

function validateKey(value: unknown) {
	if (![ "string", "number", "bigint", "boolean", "symbol", ].includes(typeof value)) {
		throw new Error(`invalid key value, must be non-nullable primitive, got '${JSON.stringify(value)}'`);
	}
}

// @ts-expect-error
export const Enum: EnumFactory = (id: symbol, keyConfig?: KeyConfig<EnumKeyPrimitive>) => {
	const instances = new Map<EnumKeyPrimitive, Simplify<EnumLike<{ Key: EnumKeyPrimitive; }>>>();

	const { nextKey = (key: number) => key + 1, } = keyConfig ?? {};
	let { initialKey: currentKey = 0, } = keyConfig ?? {};

	validateKey(currentKey);

	// eslint-disable-next-line ts/no-shadow
	return class Enum {
		static lookupKey(key: EnumKeyPrimitive) {
			return instances.get(key);
		}

		static keys() {
			return instances.keys();
		}

		static values() {
			return instances.values();
		}

		#key: EnumKeyPrimitive;
		#name?: string;

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

		constructor(check: symbol, fields?: EnumFields<{}>) {
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
				throw new Error(`enum item with key '${this.#key.toString()}' already defined`);
			}

			currentKey = nextKey(this.#key as number);

			validateKey(currentKey);

			instances.set(this.#key, this);
		}
	};
};
