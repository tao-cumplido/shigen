import assert from "node:assert/strict";
import test from "node:test";

import type { PackageJson } from "type-fest";

import { createFixture, jsonData, textData } from "./fixture.ts";

test("copy template", async () => {
	await using fixture = await createFixture("template");

	const a = await fixture.fs.stat("a");
	const b = await fixture.fs.stat("b");
	const c = await fixture.fs.stat("b/c");
	const d = await fixture.fs.stat("b/d");
	const e = await fixture.fs.stat("b/d/e");

	assert(a.isFile());
	assert(b.isDirectory());
	assert(c.isFile());
	assert(d.isDirectory());
	assert(!e.isSymbolicLink());

	assert.equal(await fixture.fs.readFile("a", "utf-8"), "a\n");
	assert.equal(await fixture.fs.readFile("b/c", "utf-8"), "c\n");
	assert.equal(await fixture.fs.readFile("b/d/e", "utf-8"), "c\n"); // source is symlink to b/c
});

test("simple tree", async () => {
	const sourceJson = {
		test: 42,
	};

	await using fixture = await createFixture({
		json: jsonData(sourceJson),
		dir: {
			text: textData("abc"),
		},
	});

	const json = await fixture.fs.stat("json");
	const dir = await fixture.fs.stat("dir");

	assert(json.isFile());
	assert(dir.isDirectory());

	assert.deepEqual(JSON.parse(await fixture.fs.readFile("json", "utf-8")), sourceJson);
	assert.equal(await fixture.fs.readFile("dir/text", "utf-8"), "abc");
});

test("\"flat\" tree", async () => {
	await using fixture = await createFixture({
		"a": textData("a"),
		"b/c": textData("c"),
		"b/d/e": textData("e"),
	});

	const a = await fixture.fs.stat("a");
	const b = await fixture.fs.stat("b");
	const c = await fixture.fs.stat("b/c");
	const d = await fixture.fs.stat("b/d");
	const e = await fixture.fs.stat("b/d/e");

	assert(a.isFile());
	assert(b.isDirectory());
	assert(c.isFile());
	assert(d.isDirectory());
	assert(e.isFile());

	assert.equal(await fixture.fs.readFile("a", "utf-8"), "a");
	assert.equal(await fixture.fs.readFile("b/c", "utf-8"), "c");
	assert.equal(await fixture.fs.readFile("b/d/e", "utf-8"), "e");
});

test("exists", async () => {
	const fixture = await createFixture({ test: textData(""), });

	assert.equal(await fixture.exists(), true);
	assert.equal(await fixture.exists("test"), true);

	await fixture.remove();

	assert.equal(await fixture.exists(), false);
	await assert.rejects(async () => fixture.remove());
});

test("run", async () => {
	await using fixture = await createFixture({
		"package.json": jsonData<PackageJson>({
			private: true,
			dependencies: {
				"@bitfront/test-package": "1.0.0",
			},
		}),
	});

	assert.equal(await fixture.exists("node_modules"), false);

	await fixture.run`pnpm install`;

	assert.equal(await fixture.exists("node_modules"), true);
});
