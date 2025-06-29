import assert from "node:assert/strict";
import { test } from "node:test";

import dedent from "dedent";

import { code } from "./code.js";

test("string", () => {
	assert.equal(
		code.js`
			a
			${"b"}
		`,
		dedent`
			a
			"b"
		`,
	);
});

test("literal", () => {
	assert.equal(
		code.js`
			a
			${code.literal("b")}
		`,
		dedent`
			a
			b
		`,
	);
});
