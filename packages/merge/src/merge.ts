import type { Composite, DeepMerge, Merge, MergeFunction, MergeOptions } from './types.js';

export type * from './types.js';

declare function structuredClone(value: any): unknown;

export function clone(target: unknown, source: unknown): unknown {
	if (typeof source === 'undefined') {
		return typeof target === 'symbol' ? target : structuredClone(target);
	}

	return typeof source === 'symbol' ? source : structuredClone(source);
}

export function createMerge<T extends MergeFunction = MergeFunction>(
	options: MergeOptions = {
		visit: ({ values: [target, source] }) => clone(target, source),
	},
): T {
	// @ts-expect-error
	return (target, source) => {
		if (Array.isArray(target) && Array.isArray(source)) {
			return Array.from({ length: Math.max(target.length, source.length) }).map((_, index) => {
				return options.visit({
					key: `${index}`,
					values: [target[index], source[index]],
				});
			});
		}

		return Object.fromEntries(
			[...new Set([...Object.keys(target), ...Object.keys(source)])].map((key) => {
				return [
					key,
					options.visit({
						key,
						// @ts-expect-error
						values: [target[key], source[key]],
					}),
				];
			}),
		);
	};
}

export const merge =
	createMerge<
		<Target extends Composite, Source extends Composite>(target: Target, source: Source) => Merge<Target, Source>
	>();

export function isComposite(value: unknown): value is Composite {
	return Array.isArray(value) || (typeof value === 'object' && value !== null);
}

export const deepMerge: <Target extends Composite, Source extends Composite>(
	target: Target,
	source: Source,
) => DeepMerge<Target, Source> = createMerge<
	<Target extends Composite, Source extends Composite>(target: Target, source: Source) => DeepMerge<Target, Source>
>({
	visit: ({ values: [target, source] }) => {
		if (isComposite(target) && isComposite(source)) {
			return deepMerge(target, source);
		}

		return clone(target, source);
	},
});
