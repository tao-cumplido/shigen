import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import { join as joinPaths } from 'node:path';

let osTmpDir: string | undefined;

export class TemporaryDirectory {
	readonly id;
	readonly path;

	constructor(id: string, path: string) {
		this.id = id;
		this.path = path;
	}

	async remove(): Promise<void> {
		await fs.rm(this.path, { recursive: true });
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.remove();
	}
}

export async function createTemporaryDirectory(): Promise<TemporaryDirectory> {
	// eslint-disable-next-line require-atomic-updates
	osTmpDir ??= await fs.realpath(os.tmpdir());
	const id = crypto.randomUUID();
	const path = joinPaths(osTmpDir, id);
	await fs.mkdir(path);
	return new TemporaryDirectory(id, path);
}
