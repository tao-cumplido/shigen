import fs from "node:fs/promises";
import { dirname, join as joinPaths } from "node:path";

import type { Jsonifiable } from "type-fest";
import { string, CharUtf8, type Encoder } from "@binary-tools/core/encoder";
import { $, type ExecaScriptMethod } from "execa";

import { createProxy, type FsProxy } from "./proxy.ts";
import { createTemporaryDirectory, type TemporaryDirectory } from "./temporary-directory.ts";

export type { FsProxy } from "./proxy.ts";

export type DataTree = {
	readonly [key: string]: Uint8Array | DataTree;
};

class Fixture {
	#directory: TemporaryDirectory;
	#fs: FsProxy;
	#run: ExecaScriptMethod;

	get id(): string {
		return this.#directory.id;
	}

	get path(): string {
		return this.#directory.path;
	}

	get fs(): FsProxy {
		return this.#fs;
	}

	get run(): ExecaScriptMethod {
		return this.#run;
	}

	constructor(directory: TemporaryDirectory, fsProxy: FsProxy, run: ExecaScriptMethod) {
		this.#directory = directory;
		this.#fs = fsProxy;
		this.#run = run;
	}

	async exists(path = "."): Promise<Boolean> {
		try {
			await this.fs.access(path);
			return true;
		} catch {
			return false;
		}
	}

	async remove(): Promise<void> {
		await this.#directory.remove();
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.remove();
	}
}

async function writeDataTree(fsProxy: FsProxy, data: DataTree, path: string = ""): Promise<void> {
	for (const [ entryPath, entryData, ] of Object.entries(data)) {
		const destination = joinPaths(path, entryPath);

		if (entryData instanceof Uint8Array) {
			await fsProxy.mkdir(dirname(destination), { recursive: true, });
			await fsProxy.writeFile(destination, entryData);
		} else {
			await fsProxy.mkdir(destination, { recursive: true, });
			await writeDataTree(fsProxy, entryData, destination);
		}
	}
}

export async function createFixture(source: string | DataTree = {}): Promise<Fixture> {
	const tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);

	if (typeof source === "string") {
		await fs.cp(source, tempDir.path, { recursive: true, });
	} else {
		await writeDataTree(fsProxy, source);
	}

	return new Fixture(tempDir, fsProxy, $({ cwd: tempDir.path, }));
}

export function textData(contents: string, encoding: Encoder<number> = CharUtf8): Uint8Array {
	return string(encoding).encode(contents);
}

export function jsonData<T extends Jsonifiable>(data: T): Uint8Array {
	return textData(JSON.stringify(data), CharUtf8);
}

export {
	CharAscii,
	CharIso8859_1,
	CharUtf8,
	CharUtf16,
	CharUtf32,
} from "@binary-tools/core/encoder";
