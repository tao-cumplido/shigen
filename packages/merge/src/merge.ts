import type { Composite, DeepMergeFunction, MergeFunction, MergeOptions } from "./types.ts";

export type * from "./types.ts";

declare function structuredClone(value: any): unknown;

export function clone(target: unknown, source: unknown): unknown {
	if (typeof source === "undefined") {
		return typeof target === "symbol" ? target : structuredClone(target);
	}

	return typeof source === "symbol" ? source : structuredClone(source);
}

export function createMerge(
	options: MergeOptions = {
		visit: ({ values: [ target, source, ], }) => clone(target, source),
	},
): (target: any, source: any) => never {
	// @ts-expect-error
	return (target, source) => {
		if (Array.isArray(target) && Array.isArray(source)) {
			return Array.from({ length: Math.max(target.length, source.length), }).map((_, index) => {
				return options.visit({
					key: `${index}`,
					values: [ target[index], source[index], ],
				});
			});
		}

		return Object.fromEntries(
			// eslint-disable-next-line ts/no-unsafe-argument
			[ ...new Set([ ...Object.keys(target), ...Object.keys(source), ]), ].map((key) => {
				return [
					key,
					options.visit({
						key,
						// eslint-disable-next-line ts/no-unsafe-member-access
						values: [ target[key], source[key], ],
					}),
				];
			}),
		);
	};
}

export const merge: MergeFunction = createMerge();

export function isComposite(value: unknown): value is Composite {
	return Array.isArray(value) || (typeof value === "object" && value !== null);
}

export const deepMerge: DeepMergeFunction = createMerge({
	visit: ({ values: [ target, source, ], }) => {
		if (isComposite(target) && isComposite(source)) {
			return deepMerge(target, source);
		}

		return clone(target, source);
	},
});
