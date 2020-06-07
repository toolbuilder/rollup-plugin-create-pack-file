# Rollup-Plugin-Create-Pack-File

This [Rollup](https://rollupjs.org/guide/en/) plugin creates a pack file from your package, and moves it somewhere else as part of testing your package.

I test a package by using `Rollup` to:

* convert units tests so that they use package instead of relative imports (e.g. `../src/index` to `iterablefu`)
  * [rollup-plugin-multi-input](https://github.com/alfredosalzillo/rollup-plugin-multi-input)
  * [rollup-plugin-relative-to-package](https://github.com/toolbuilder/rollup-plugin-relative-to-package)
* build a test package around those tests
  * [rollup-plugin-create-test-package-json](https://github.com/toolbuilder/rollup-plugin-create-test-package-json)
  * this package
* and run the tests
  * [rollup-plugin-command](https://github.com/Vehmloewff/rollup-plugin-command)

## Installation

```bash
npm install --save-dev @toolbuilder/rollup-plugin-create-pack-file
```

## Use

```javascript
import createPackFile from '@toolbuilder/rollup-plugin-create-pack-file'

export default {
  input: 'entry-point.js',
  output: {
    // You can use `file` instead, the plugin will use path.dirname to get the directory path
    dir: 'where/the/pack/file/should/go'
    format: 'es'
  },
  plugins: [
    createPackFile() // typically, you won't need any options
  ]
}
```

This plugin runs using the `generateBundle` hook. This lets you use the pack file when the `writeBundle` hook runs. The `writeBundle` hook runs plugins in parallel, so you can't control plugin execution order.

## Options

There are a number of options. The advanced options exist for unit testing, but you might find them useful.

Basic Options:

* `rootDir` - tell the plugin where the package root is located. By default, this is `process.cwd()`.
* `packCommand` - tell the plugin what shell command to use to generate the pack file. By default, this is `npm pack`. For example, I use [pnpm](https://pnpm.js.org/) instead of `npm`, so my packCommand option looks like `pnpm pack`. The plugin does expect the pack file name to match `npm` naming conventions.

Advanced options:

* `packageJson` - By default, the plugin reads `package.json` at `rootDir` to figure out the pack file name. If you want something else, provide this option an Object that has `name` and `version` attributes just like `package.json` does.
* `mover` - Async method that moves the pack file. Signature looks like this: async (fullPackFilePath, fullTargetPackFilePath) => {}. No return value is expected. An `Error` should be thrown on failure. By default the plugin provides a function to move the file.
* `shellCommand` - An async method that creates the pack file when given the `packCommand` option value. No return value is expected, an `Error` should be thrown on failure. By default, the plugin provides a shell runner.

## Contributing

Contributions are welcome. Please create a pull request.

I use [pnpm](https://pnpm.js.org/) instead of npm.

## Issues

This project uses Github issues.
