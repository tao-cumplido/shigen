import fs from "node:fs/promises";
import path from "node:path";

import type { Simplify, UnionToIntersection } from "type-fest";

const supportedFields = {
	unaryOperations: [
		"access",
		"open",
		"truncate",
		"rmdir",
		"rm",
		"mkdir",
		"readdir",
		"readlink",
		"lstat",
		"stat",
		"statfs",
		"unlink",
		"chmod",
		"lchmod",
		"lchown",
		"lutimes",
		"chown",
		"utimes",
		"realpath",
		"mkdtemp",
		"writeFile",
		"appendFile",
		"readFile",
		"opendir",
		"watch",
	],
	binaryOperations: [ "copyFile", "rename", "symlink", "link", "cp", ],
	other: [ "constants", ],
} as const;

type UnaryOperations = (typeof supportedFields.unaryOperations)[number];
type BinaryOperations = (typeof supportedFields.binaryOperations)[number];
type OtherFields = (typeof supportedFields.other)[number];

/* prettier-ignore */
type OverloadList<T extends Function> =
	T extends {
		(...args: infer A1): infer R1;
		(...args: infer A2): infer R2;
		(...args: infer A3): infer R3;
		(...args: infer A4): infer R4;
		(...args: infer A5): infer R5;
	} ?
	[
		(...args: A1) => R1,
		(...args: A2) => R2,
		(...args: A3) => R3,
		(...args: A4) => R4,
		(...args: A5) => R5
	] :
	T extends {
		(...args: infer A1): infer R1;
		(...args: infer A2): infer R2;
		(...args: infer A3): infer R3;
		(...args: infer A4): infer R4;
	} ?
	[
		(...args: A1) => R1,
		(...args: A2) => R2,
		(...args: A3) => R3,
		(...args: A4) => R4
	] :
	T extends {
		(...args: infer A1): infer R1;
		(...args: infer A2): infer R2;
		(...args: infer A3): infer R3;
	} ?
	[
		(...args: A1) => R1,
		(...args: A2) => R2,
		(...args: A3) => R3
	] :
	T extends {
		(...args: infer A1): infer R1;
		(...args: infer A2): infer R2;
	} ?
	[
		(...args: A1) => R1,
		(...args: A2) => R2
	] :
	T extends {
		(...args: infer A1): infer R1;
	} ?
	[
		(...args: A1) => R1
	] :
	[T];

type PatchCallArgs<T extends unknown[], PathPosition extends `${number}`> = {
	[P in keyof T]: P extends PathPosition ? string : T[P];
};

type PatchCallSignature<T extends Function[], PathPosition extends `${number}`> = {
	[P in keyof T]: P extends `${number}`
		? T[P] extends (...args: infer A) => infer R
			? (...args: PatchCallArgs<A, PathPosition>) => R
			: T[P]
		: T[P];
};

type ModifyFsCalls<T> = {
	[P in keyof T]: T[P] extends Function
		? P extends UnaryOperations
			? PatchCallSignature<OverloadList<T[P]>, "0">
			: P extends BinaryOperations
			? PatchCallSignature<OverloadList<T[P]>, "0" | "1">
			: T[P]
		: T[P];
};

type MergeOverloads<T> = {
	[P in keyof T]: T[P] extends Function[] ? UnionToIntersection<T[P][number]> : T[P];
};

export type FsProxy = Simplify<MergeOverloads<ModifyFsCalls<typeof fs>>>;

interface StrictSet<T> extends Set<T> {
	has(value: unknown): value is T;
}

type ProxyTarget = Simplify<
	Record<UnaryOperations, (path: string, ...args: unknown[]) => unknown> &
		Record<BinaryOperations, (pathA: string, pathB: string, ...args: unknown[]) => unknown> &
		Record<string, unknown>
>;

export function createProxy(root: string): FsProxy {
	function resolve(targetPath: unknown) {
		if (typeof targetPath !== "string") {
			throw new Error(`only string paths are supported, got: '${targetPath?.constructor.name ?? typeof targetPath}'`);
		}

		const resolvedPath = path.join(root, targetPath);

		if (!resolvedPath.startsWith(root)) {
			throw new Error("paths leaving the directory are not allowed");
		}

		return resolvedPath;
	}

	const unaryOperations = new Set(supportedFields.unaryOperations) as StrictSet<UnaryOperations>;
	const binaryOperations = new Set(supportedFields.binaryOperations) as StrictSet<BinaryOperations>;
	const otherFields = new Set(supportedFields.other) as StrictSet<OtherFields>;

	return new Proxy(fs as ProxyTarget, {
		get: (target, property: PropertyKey) => {
			if (unaryOperations.has(property)) {
				return (targetPath: unknown, ...args: unknown[]) => {
					return target[property](resolve(targetPath), ...args);
				};
			}

			if (binaryOperations.has(property)) {
				return (targetPathA: unknown, targetPathB: unknown, ...args: unknown[]) => {
					return target[property](resolve(targetPathA), resolve(targetPathB), ...args);
				};
			}

			if (otherFields.has(property)) {
				return target[property];
			}

			throw new Error(`unsupported property: '${property.toString()}'`);
		},
	}) as FsProxy;
}
