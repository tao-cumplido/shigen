import assert from 'node:assert';
import test from 'node:test';

import tseslint from 'typescript-eslint';
import dedent from 'dedent';

import { LintReporter, LintResult } from '../tools/test';
import { rule, ModuleClass, TypeImport } from './group-imports';

test.describe('rule: group-imports', () => {
	const reporter = new LintReporter(rule);

	const tsParserConfig = {
		languageOptions: {
			parser: tseslint.parser as any,
		},
	};

	test.describe('valid code', () => {
		test('no imports', () => {
			const report = reporter.lint(dedent``, []);
			assert.equal(report.result, LintResult.Valid);
		});

		test('default groups', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';
					import 'path';

					import 'foo';
					import 'bar';

					import '/';

					import '../foo';
					import './bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('custom group order', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';

					import 'fs';
				`,
				[{ class: ModuleClass.External.key }, { class: ModuleClass.Node.key }],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('explicit package precedence', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';

					import 'foo';

					import 'path';
				`,
				['fs', { class: ModuleClass.External.key }, { class: ModuleClass.Node.key }],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('mixed groups', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';
					import 'foo';
					import 'path';
				`,
				[[{ class: ModuleClass.Node.key }, { class: ModuleClass.External.key }]],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('type imports', () => {
			const report = reporter.lint(
				dedent`
					import type fs from 'fs';
					import 'fs';

					import type foo from 'foo';
					import 'foo';
				`,
				[],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('separate type imports', () => {
			const report = reporter.lint(
				dedent`
					import type fs from 'fs';

					import 'fs';

					import type foo from 'foo';

					import 'foo';
				`,
				[
					{
						class: ModuleClass.Node.key,
						types: TypeImport.Only.key,
					},
					{
						class: ModuleClass.Node.key,
						types: TypeImport.Exclude.key,
					},
					{
						path: 'foo',
						types: TypeImport.Only.key,
					},
					{
						path: 'foo',
						types: TypeImport.Exclude.key,
					},
				],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Valid);
		});
	});

	test.describe('invalid code (fixable)', () => {
		test('missing new line between groups', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';
					import 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';

				import 'foo';
			`,
			);
		});

		test('too many lines between groups', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';


					import 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';

				import 'foo';
			`,
			);
		});

		test('invalid new line in group', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';

					import 'path';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';
				import 'path';
			`,
			);
		});

		test('wrong group order', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';

					import 'fs';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';

				import 'foo';
			`,
			);
		});

		test('ungrouped', () => {
			const report = reporter.lint(
				dedent`
					import './bar';
					import 'foo';
					import 'fs';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';

				import 'foo';

				import './bar';
			`,
			);
		});

		test('delimited group', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';

					import 'fs';
					import 'path';

					import 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';
				import 'path';

				import 'foo';
				import 'bar';
			`,
			);
		});

		test('separated groups', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';

					import 'path';

					import 'foo';

					import 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 2);
			assert.equal(
				report.code,
				dedent`
				import 'fs';
				import 'path';

				import 'foo';
				import 'bar';
			`,
			);
		});

		test('invalid new lines and missing new lines', () => {
			const report = reporter.lint(
				dedent`
					import 'fs';

					import 'path';
					import 'foo';

					import 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 3);
			assert.equal(
				report.code,
				dedent`
				import 'fs';
				import 'path';

				import 'foo';
				import 'bar';
			`,
			);
		});

		test('scope group and implicit catch-all-group', () => {
			const report = reporter.lint(
				dedent`
					import 'foo/a';
					import 'fs';
					import 'foo/b';
					import '/';
					import './bar';
					import 'foo/c';
					import 'baz';
					import 'foo/d';
				`,
				[[{ class: ModuleClass.Node.key }, { class: ModuleClass.Absolute.key }], 'foo'],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'fs';
				import '/';

				import 'foo/a';
				import 'foo/b';
				import 'foo/c';
				import 'foo/d';

				import './bar';
				import 'baz';
			`,
			);
		});

		test('type imports', () => {
			const report = reporter.lint(
				dedent`
					import type fs from 'fs';

					import 'fs';

					import type foo from 'foo';

					import 'foo';
				`,
				[],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 2);
			assert.equal(
				report.code,
				dedent`
				import type fs from 'fs';
				import 'fs';

				import type foo from 'foo';
				import 'foo';
			`,
			);
		});

		test('separate type imports', () => {
			const report = reporter.lint(
				dedent`
					import type fs from 'fs';
					import 'fs';

					import type foo from 'foo';
					import 'foo';
				`,
				[
					{
						class: ModuleClass.Node.key,
						types: TypeImport.Only.key,
					},
					{
						class: ModuleClass.Node.key,
						types: TypeImport.Exclude.key,
					},
					{
						path: 'foo',
						types: TypeImport.Only.key,
					},
					{
						path: 'foo',
						types: TypeImport.Exclude.key,
					},
				],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 2);
			assert.equal(
				report.code,
				dedent`
				import type fs from 'fs';

				import 'fs';

				import type foo from 'foo';

				import 'foo';
			`,
			);
		});

		test('node protocol imports', () => {
			const report = reporter.lint(
				dedent`
					import 'node:fs';
					import 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'node:fs';

				import 'foo';
			`,
			);
		});

		test('separate module subpaths', () => {
			const report = reporter.lint(
				dedent`
					import 'a/a/a';
					import 'a/b/c';
					import 'a/a/b';
				`,
				['a/a', 'a/b'],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
				import 'a/a/a';
				import 'a/a/b';

				import 'a/b/c';
			`,
			);
		});
	});

	test.describe('invalid code (unfixable)', () => {
		test('other code between imports', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';
					console.log(0);
					import 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});
	});
});
