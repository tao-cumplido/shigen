Monorepo for packages in the `@shigen` scope. This scope is used to collect tools whose standalone name often is already taken on npm. <ruby lang="ja">資<rt>shi</rt>源<rt>gen</rt></ruby> is the Japanese word for <q lang="en">resource</q>.

# Packages

## [@shigen/eslint-plugin](packages/eslint-plugin)
ESLint plugin with rules supporting both JavaScript and TypeScript code.

## [@shigen/enum](packages/enum)
Class-based enums for JavaScript.

## [@shigen/merge](packages/merge)
Customisable `merge` and `deepMerge` functions with advanced TypeScript support.

## [@shigen/polyfill-symbol-dispose](packages/polyfill-symbol-dispose)
Lightweight polyfill for the well-known symbols `Symbol.dispose` and `Symbol.asyncDispose` from the [Explicit Resource Management proposal](https://github.com/tc39/proposal-explicit-resource-management).

## [@shigen/test](packages/test)
Set of tools for testing purposes.

# Development

Requirements

- Node.js >= 21
- pnpm
