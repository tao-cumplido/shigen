Monorepo for packages in the `@shigen` scope. This scope is used to collect small general purpose tools whose standalone name often is already taken on npm.

- [@shigen/eslint-plugin](packages/eslint-plugin)
- [@shigen/merge](packages/merge)

# Development

Requirements

- Node.js >= 20

> [!WARNING]  
> NPM defaults to run scripts in `/bin/sh` or `cmd.exe`. At least on macOS you need to append `script-shell=/bin/zsh` to `~/.npmrc` for some scripts to run.
