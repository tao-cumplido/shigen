import assert from 'node:assert';
import test from 'node:test';

import tseslint from 'typescript-eslint';
import dedent from 'dedent';

import { LintReporter, LintResult } from '../tools/test';
import { rule, TypeImportGroupPosition, TypeImportInlinePosition } from './sort-imports';

test.describe('rule: sort-imports', () => {
	const reporter = new LintReporter(rule);

	const tsParserConfig = {
		languageOptions: {
			parser: tseslint.parser as any,
		},
	};

	test.describe('valid code', () => {
		test('no imports/exports', () => {
			const report = reporter.lint(dedent``, []);
			assert.equal(report.result, LintResult.Valid);
		});

		test('sorted modules', () => {
			const report = reporter.lint(
				dedent`
					import 'bar';
					import 'foo';

					export * from 'bar';
					export * from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('scoped first', () => {
			const report = reporter.lint(
				dedent`
					import '@angular/core';
					import 'rxjs';
				`,
				[{ caseGroups: true }],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('separate groups', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';

					import 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('sorted specifiers', () => {
			const report = reporter.lint(
				dedent`
					import { a, b } from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('sort 2 before 10', () => {
			const report = reporter.lint(
				dedent`
					import { a2, a10 } from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('renamed specifiers', () => {
			const report = reporter.lint(
				dedent`
					import { a as b, b as a} from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('ignore local exports', () => {
			const report = reporter.lint(
				dedent`
					export const foo = 1;
					export const bar = 2;
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('ignore type imports', () => {
			const report = reporter.lint(
				dedent`
					import type foo from 'foo';
					import 'foo';

					import 'bar';
					import type bar from 'bar';
				`,
				[],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('empty path should not throw', () => {
			const report = reporter.lint(
				dedent`
					export * from '';
				`,
				[{ caseGroups: true }],
			);

			assert.equal(report.result, LintResult.Valid);
		});
	});

	test.describe('invalid code (fixable)', () => {
		test('unsorted modules', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';
					import 'bar';

					export * from 'foo';
					export * from 'bar';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 2);
			assert.equal(
				report.code,
				dedent`
					import 'bar';
					import 'foo';

					export * from 'bar';
					export * from 'foo';
				`,
			);
		});

		test('unsorted specifiers', () => {
			const report = reporter.lint(
				dedent`
					import { b, a } from 'foo';

					export { b, a } from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 2);
			assert.equal(
				report.code,
				dedent`
					import { a, b } from 'foo';

					export { a, b } from 'foo';
				`,
			);
		});

		test('mixed case specifiers', () => {
			const report = reporter.lint(
				dedent`
					import { Ab, ba, Ba, ab } from 'foo';
				`,
				[],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import { ab, Ab, ba, Ba } from 'foo';
				`,
			);
		});

		test('case groups', () => {
			const report = reporter.lint(
				dedent`
					import { Ab, ba, Ba, ab } from 'foo';
				`,
				[{ caseGroups: true }],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import { ab, ba, Ab, Ba } from 'foo';
				`,
			);
		});

		test('case groups, upper first', () => {
			const report = reporter.lint(
				dedent`
					import { Ab, ba, Ba, ab } from 'foo';
				`,
				[{ caseGroups: true, caseFirst: 'upper' }],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import { Ab, Ba, ab, ba } from 'foo';
				`,
			);
		});

		test('sort 2 after 10', () => {
			const report = reporter.lint(
				dedent`
					import { a2, a10 } from 'foo';
				`,
				[{ numeric: false }],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import { a10, a2 } from 'foo';
				`,
			);
		});

		test('unsorted local specifiers', () => {
			const report = reporter.lint(
				dedent`
					import { a as b, b as a } from 'foo';
				`,
				[{ specifier: 'rename' }],
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import { b as a, a as b } from 'foo';
				`,
			);
		});

		test('ignore types', () => {
			const report = reporter.lint(
				dedent`
					import type bar from 'bar';
					import 'foo';
					import 'bar';
					import type foo from 'foo';
				`,
				[],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import type bar from 'bar';
					import 'bar';
					import 'foo';
					import type foo from 'foo';
				`,
			);
		});

		test('types on top', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';
					import type foo from 'foo';
					import 'bar';
					import type bar from 'bar';
				`,
				[{ typesInGroup: TypeImportGroupPosition.Top.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import type bar from 'bar';
					import type foo from 'foo';
					import 'bar';
					import 'foo';
				`,
			);
		});

		test('types on bottom', () => {
			const report = reporter.lint(
				dedent`
					import type foo from 'foo';
					import 'foo';
					import type bar from 'bar';
					import 'bar';
				`,
				[{ typesInGroup: TypeImportGroupPosition.Bottom.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import 'bar';
					import 'foo';
					import type bar from 'bar';
					import type foo from 'foo';
				`,
			);
		});

		test('types above value', () => {
			const report = reporter.lint(
				dedent`
					import 'foo';
					import 'bar';
					import type foo from 'foo';
					import type bar from 'bar';
				`,
				[{ typesInGroup: TypeImportGroupPosition.AboveValue.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import type bar from 'bar';
					import 'bar';
					import type foo from 'foo';
					import 'foo';
				`,
			);
		});

		test('types below value', () => {
			const report = reporter.lint(
				dedent`
					import type foo from 'foo';
					import type bar from 'bar';
					import 'foo';
					import 'bar';
				`,
				[{ typesInGroup: TypeImportGroupPosition.BelowValue.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(
				report.code,
				dedent`
					import 'bar';
					import type bar from 'bar';
					import 'foo';
					import type foo from 'foo';
				`,
			);
		});

		test('inline types', () => {
			const report = reporter.lint(dedent`import { type b, a } from 'foo';`, [], tsParserConfig);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(report.code, dedent`import { a, type b } from 'foo';`);
		});

		test('inline types start', () => {
			const report = reporter.lint(
				dedent`import { a, type b } from 'foo';`,
				[{ inlineTypes: TypeImportInlinePosition.Start.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(report.code, dedent`import { type b, a } from 'foo';`);
		});

		test('inline types end', () => {
			const report = reporter.lint(
				dedent`import { type a, b } from 'foo';`,
				[{ inlineTypes: TypeImportInlinePosition.End.key }],
				tsParserConfig,
			);

			assert.equal(report.result, LintResult.Fixed);
			assert.equal(report.errors.length, 1);
			assert.equal(report.code, dedent`import { b, type a } from 'foo';`);
		});
	});
});
