export type TupleToRecord<T extends readonly unknown[]> =
	number extends T['length'] ?
		Record<number, T[number]> :
		{ [P in Extract<keyof T, `${number}`>]: T[P] };
