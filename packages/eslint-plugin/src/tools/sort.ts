export type SortOptions = Pick<Intl.CollatorOptions, 'sensitivity' | 'ignorePunctuation' | 'numeric' | 'caseFirst'> & {
	locales?: string[];
	caseGroups?: boolean;
};

type PathIndex = string | number;

interface Sortable<T> {
	source: T;
	sortValue: unknown;
}

interface CaseGroups<T> {
	punctuation: Array<Sortable<T>>;
	upper: Array<Sortable<T>>;
	lower: Array<Sortable<T>>;
}

function isIndexable(value: unknown): value is Record<PathIndex, unknown> {
	return typeof value === 'object' && value !== null;
}

function readPath(from: unknown, path: readonly PathIndex[]): unknown {
	if (!isIndexable(from)) {
		return;
	}

	const [head, ...rest] = path;

	if (!head) {
		throw new Error(`readPath: invalid input`);
	}

	if (path.length === 1) {
		return from[head];
	}

	return readPath(from[head], rest);
}

function sort<T>(options?: SortOptions) {
	return (a: Sortable<T>, b: Sortable<T>) => {
		if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
			return a.sortValue - b.sortValue;
		}

		if (typeof a.sortValue === 'string' && typeof b.sortValue === 'string') {
			return a.sortValue.localeCompare(b.sortValue, options?.locales, options);
		}

		return 0;
	};
}

// prettier-ignore
// eslint-disable-next-line @typescript-eslint/ban-types
export function sortByPath<T extends object, K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(source: T[], path: readonly [K1, K2, K3], options?: SortOptions): T[];
// eslint-disable-next-line @typescript-eslint/ban-types
export function sortByPath<T extends object, K1 extends keyof T, K2 extends keyof T[K1]>(
	source: T[],
	path: readonly [K1, K2],
	options?: SortOptions,
): T[];
// eslint-disable-next-line @typescript-eslint/ban-types
export function sortByPath<T extends object, K extends keyof T>(
	source: T[],
	path: readonly [K],
	options?: SortOptions,
): T[];
// eslint-disable-next-line @typescript-eslint/ban-types
export function sortByPath<T extends object>(
	sources: T[],
	path: ReadonlyArray<string | number>,
	options?: SortOptions,
): T[] {
	const caseGroups = sources.reduce<CaseGroups<T>>(
		(groups, source) => {
			const sortValue = readPath(source, path);

			const sortable: Sortable<T> = {
				source,
				sortValue,
			};

			let target = groups.lower;

			if (options?.caseGroups && typeof sortValue === 'string' && sortValue.length) {
				if (/^[@$_]/u.test(sortValue)) {
					target = groups.punctuation;
				} else if (sortValue[0]?.toLocaleUpperCase(options.locales) === sortValue[0]) {
					target = groups.upper;
				}
			}

			target.push(sortable);

			return groups;
		},
		{
			punctuation: [],
			upper: [],
			lower: [],
		},
	);

	caseGroups.punctuation.sort(sort(options));
	caseGroups.upper.sort(sort(options));
	caseGroups.lower.sort(sort(options));

	return [
		...caseGroups.punctuation.map(({ source }) => source),
		...(options?.caseFirst === 'upper' ? caseGroups.upper : caseGroups.lower).map(({ source }) => source),
		...(options?.caseFirst === 'upper' ? caseGroups.lower : caseGroups.upper).map(({ source }) => source),
	];
}
