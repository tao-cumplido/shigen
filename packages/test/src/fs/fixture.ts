import '@shigen/polyfill-symbol-dispose';

import fs from 'node:fs/promises';
import { dirname, join as joinPaths } from 'node:path';

import type { Jsonifiable } from 'type-fest';

import { createProxy, type FsProxy } from './proxy.js';
import { createTemporaryDirectory, type TemporaryDirectory } from './temporary-directory.js';

export type { FsProxy } from './proxy.js';

export type DataTree = {
	readonly [key: string]: Buffer | DataTree;
};

// @ts-ignore: aliasing because importing types from an ESM only module confuses TS
type Execa$ = import('execa').Execa$;

class Fixture {
	#directory: TemporaryDirectory;
	#fs: FsProxy;
	#run: Execa$;

	get id(): string {
		return this.#directory.id;
	}

	get path(): string {
		return this.#directory.path;
	}

	get fs(): FsProxy {
		return this.#fs;
	}

	get run(): Execa$ {
		return this.#run;
	}

	constructor(directory: TemporaryDirectory, fsProxy: FsProxy, run: Execa$) {
		this.#directory = directory;
		this.#fs = fsProxy;
		this.#run = run;
	}

	async exists(path = '.'): Promise<Boolean> {
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

async function writeDataTree(fsProxy: FsProxy, path: string, data: DataTree): Promise<void> {
	for (const [entryPath, entryData] of Object.entries(data)) {
		const destination = joinPaths(path, entryPath);

		if (entryData instanceof Buffer) {
			await fsProxy.mkdir(dirname(destination), { recursive: true });
			await fsProxy.writeFile(destination, entryData);
		} else {
			await fsProxy.mkdir(destination, { recursive: true });
			await writeDataTree(fsProxy, destination, entryData);
		}
	}
}

// @ts-ignore
let execa: typeof import('execa') | undefined;

export async function createFixture(source: string | DataTree = {}): Promise<Fixture> {
	// eslint-disable-next-line require-atomic-updates
	execa ??= await import('execa');

	const tempDir = await createTemporaryDirectory();
	const fsProxy = createProxy(tempDir.path);

	if (typeof source === 'string') {
		await fs.cp(source, tempDir.path, { recursive: true });
	} else {
		await writeDataTree(fsProxy, '', source);
	}

	return new Fixture(tempDir, fsProxy, execa.$({ cwd: tempDir.path }));
}

export function textData(contents: string, encoding?: BufferEncoding): Buffer {
	return Buffer.from(contents, encoding);
}

export function jsonData<T extends Jsonifiable>(data: T): Buffer {
	return textData(JSON.stringify(data));
}
