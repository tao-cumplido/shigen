import Ajv from 'ajv';
import { Linter } from 'eslint';

import type { RuleModule } from './rule.js';

export enum LintResult {
	Valid = 'valid',
	Invalid = 'invalid',
	Fixed = 'fixed',
}

export interface LintReport {
	result: LintResult;
	code: string;
	errors: Linter.LintMessage[];
}

export class AggregateError extends Error {
	override readonly name = 'AggregateError';
	override readonly message: string;
	readonly errors: readonly Error[];

	constructor(errors: readonly Error[], message: string) {
		super(message);
		this.errors = errors;
		this.message = message;
	}
}

export class LintReporter<Configuration extends unknown[]> {
	private readonly ajv = new Ajv({
		verbose: true,
		allErrors: true,
	});

	private readonly linter = new Linter();
	private readonly rule: RuleModule<Configuration>;

	constructor(rule: RuleModule<Configuration>) {
		this.linter.defineRule('test', rule);
		this.rule = rule;
	}

	lint(source: string, options: Configuration, linterConfig?: Linter.Config, filename?: string): LintReport {
		// in both cases validation will be synchronous but Ajv's typings don't provide this difference
		if (this.rule.meta?.schema instanceof Array) {
			const schemas = this.rule.meta.schema;
			options.forEach((option, index) => {
				this.ajv.validate(schemas[index] ?? '', option);
			});
		} else if (this.rule.meta?.schema) {
			this.ajv.validate(this.rule.meta.schema, options);
		}

		if (this.ajv.errors?.length) {
			throw new Error(this.ajv.errorsText());
		}

		const config: Linter.Config = {
			...linterConfig,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: 'module',
				...linterConfig?.parserOptions,
			},
			rules: {
				test: ['error', ...options],
			},
		};

		if (config.parser) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-argument
			this.linter.defineParser(config.parser, require(config.parser));
		}

		const errorReport = this.linter.verify(source, config, filename);
		const fatalParsingErrors = errorReport.filter(({ fatal }) => fatal).map(({ message }) => new Error(message));

		if (fatalParsingErrors.length) {
			throw new AggregateError(fatalParsingErrors, 'parsing error before fix');
		}

		const fixReport = this.linter.verifyAndFix(source, config, filename);
		const fatalFixErrors = fixReport.messages.filter(({ fatal }) => fatal).map(({ message }) => new Error(message));

		if (fatalFixErrors.length) {
			throw new AggregateError(fatalFixErrors, 'parsing error after fix');
		}

		let result = LintResult.Valid;

		if (fixReport.fixed) {
			result = LintResult.Fixed;
		} else if (errorReport.length > 0) {
			result = LintResult.Invalid;
		}

		return {
			result,
			code: fixReport.output,
			errors: errorReport,
		};
	}
}
