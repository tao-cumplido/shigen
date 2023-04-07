/* prettier-ignore */
type TupleToRecord<T extends readonly unknown[]> =
	number extends T['length'] ? Record<number, T[number]> :
	{ [P in Extract<keyof T, `${number}`>]: T[P] };

/* prettier-ignore */
type RecordToTuple<T extends Readonly<Record<number, unknown>>, R extends unknown[] = []> =
	number extends keyof T ? Array<T[number]> :
	keyof T extends never ? R :
	RecordToTuple<Omit<T, `${R['length']}`>, [...R, T[R['length']]]>;

export type Composite = Readonly<Record<PropertyKey, unknown>> | readonly unknown[];

/* prettier-ignore */
export type Visit<Target, Source, Key extends PropertyKey> =
	Key extends keyof Source ? (
		Source[Key] extends undefined ? (
			Key extends keyof Target ? Target[Key] :
			never
		) : Source[Key]
	) :
	Key extends keyof Target ? Target[Key] :
	never;

/* prettier-ignore */
export type Merge<Target extends Composite, Source extends Composite> =
	Target extends readonly unknown[] ? (
		Source extends readonly unknown[] ? RecordToTuple<{
			readonly [P in keyof TupleToRecord<Target> | keyof TupleToRecord<Source>]: Visit<Target, Source, P>
		}> :
		Merge<TupleToRecord<Target>, Source>
	) :
	Source extends readonly unknown[] ? Merge<Target, TupleToRecord<Source>> :
	{ [P in keyof Target | keyof Source]: Visit<Target, Source, P> };

/* prettier-ignore */
export type DeepVisit<Target, Source, Key extends PropertyKey> =
	Key extends keyof Source ? (
		Key extends keyof Target ? (
			Source[Key] extends Composite ? (
				Target[Key] extends Composite ? DeepMerge<Target[Key], Source[Key]> :
				Visit<Target, Source, Key>
			) :
			Visit<Target, Source, Key>
		) :
		Visit<Target, Source, Key>
	) :
	Visit<Target, Source, Key>;

/* prettier-ignore */
export type DeepMerge<Target extends Composite, Source extends Composite> =
	Target extends readonly unknown[] ? (
		Source extends readonly unknown[] ? RecordToTuple<{
			readonly [P in keyof TupleToRecord<Target> | keyof TupleToRecord<Source>]: DeepVisit<Target, Source, P>
		}> :
		DeepMerge<TupleToRecord<Target>, Source>
	) :
	Source extends readonly unknown[] ? DeepMerge<Target, TupleToRecord<Source>> :
	{ [P in keyof Target | keyof Source]: DeepVisit<Target, Source, P> };

export type MergeFunction = (target: Composite, source: Composite) => object;

export interface VisitorState {
	readonly key: string;
	readonly values: readonly [unknown, unknown];
}

export type VisitorFunction = (state: VisitorState) => unknown;

export interface MergeOptions {
	readonly visit: VisitorFunction;
}
