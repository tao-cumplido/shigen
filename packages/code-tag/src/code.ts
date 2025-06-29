import type { JsonValue } from "type-fest";
import dedent from "dedent";

class CodeLiteral {
	readonly value: string;

	constructor(value: string) {
		this.value = value;
	}
}

export function code<T extends JsonValue = JsonValue>(apply: (value: T) => string) {
	return (strings: TemplateStringsArray, ...dynamics: ReadonlyArray<T | CodeLiteral>): string => {
		return dedent(
			strings,
			...dynamics.map((dynamic) => {
				if (dynamic instanceof CodeLiteral) {
					return dynamic.value;
				}

				return apply(dynamic);
			}),
		);
	};
}

code.literal = (value: string) => new CodeLiteral(value);

code.js = code((value) => JSON.stringify(value));
