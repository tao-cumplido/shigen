declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Reflect {
		function has<T extends object, P extends PropertyKey>(
			target: T,
			propertyKey: P,
		): target is T extends unknown ? (P extends keyof T ? T : never) : never;
	}
}

export const rules = {};
