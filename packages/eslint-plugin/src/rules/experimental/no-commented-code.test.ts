import assert from 'node:assert';

import dedent from 'dedent';
import test from 'node:test';

import { LintReporter, LintResult } from '../../tools/test';
import { rule } from './no-commented-code';

test.describe('rule: no-commented-code', () => {
	const reporter = new LintReporter(rule);

	const tsParser = {
		parser: '@typescript-eslint/parser',
	};

	test.describe('valid code', () => {
		test('no comments', () => {
			const report = reporter.lint(dedent``, []);
			assert.equal(report.result, LintResult.Valid);
		});

		test('docstyle comment can contain code', () => {
			const report = reporter.lint(
				dedent`
					/**
					 * const foo = 1;
					 */
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('line comments (JS)', () => {
			const report = reporter.lint(
				dedent`
					// hello world
					console.log(0); // !
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('line comments (TS)', () => {
			const report = reporter.lint(
				dedent`
					// hello world
					console.log(0); // !
				`,
				[],
				tsParser,
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('directive comments', () => {
			const report = reporter.lint(
				dedent`
					// @ts-expect-error
					// eslint-disable-next-line
					// const foo = 1;
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('commented typescript in js is valid', () => {
			const report = reporter.lint(
				dedent`
					// type Foo<T> = T;
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});

		test('should ignore doc comment', () => {
			const report = reporter.lint(
				dedent`
					const n = 1 /** 1*/;
				`,
				[],
			);

			assert.equal(report.result, LintResult.Valid);
		});
	});

	test.describe('invalid code', () => {
		test('single line comment', () => {
			const report = reporter.lint(
				dedent`
					// console.log(0);
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('single block comment on one line', () => {
			const report = reporter.lint(
				dedent`
					/* console.log(0); */
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('single block comment over multiple lines', () => {
			const report = reporter.lint(
				dedent`
					/*
					const foo = 0;
					console.log(foo);
					*/
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('multiple block comments on one line', () => {
			const report = reporter.lint(
				dedent`
					console.log(0, /* 1, */ 2, /* 3 */);
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 2);
		});

		test('commented entry in multiline list', () => {
			const report = reporter.lint(
				dedent`
					const foo = [
						0,
						// 1,
						2,
					];
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('typescript parser', () => {
			const report = reporter.lint(
				dedent`
					// type Foo<T> = T;
				`,
				[],
				tsParser,
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('urls can be detected as labeled statement', () => {
			const report = reporter.lint(
				dedent`
					// https://www.example.com/
					{}
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('ignore patterns', () => {
			const report = reporter.lint(
				dedent`
					// foo.toString();
					// bar.toString();
				`,
				[{ ignorePatterns: ['^foo'] }],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('typescript ranges parser option', () => {
			const report = reporter.lint(
				dedent`
					// function foo(a) { return a; }
				`,
				[],
				tsParser,
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 1);
		});

		test('consecutive line comments', () => {
			const report = reporter.lint(
				dedent`
					// if (foo) {
					//    bar();
					// }
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 3);
		});

		test('split comments matching block', () => {
			const report = reporter.lint(
				dedent`
					// if (foo) {
						bar();
					// }
				`,
				[],
			);

			assert.equal(report.result, LintResult.Invalid);
			assert.equal(report.errors.length, 2);
		});
	});
});
