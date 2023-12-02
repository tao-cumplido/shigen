export type RecordToTuple<T extends Readonly<Record<number, unknown>>, R extends unknown[] = []> =
	number extends keyof T ?
		Array<T[number]> :
		keyof T extends never ?
			R :
			RecordToTuple<Omit<T, `${R['length']}`>, [...R, T[R['length']]]>;
