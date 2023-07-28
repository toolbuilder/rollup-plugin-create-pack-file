# Rollup-Plugin-Create-Pack-File

This [Rollup](https://rollupjs.org/guide/en/) plugin creates a pack file from your package, and moves it somewhere else as part of testing your package.

This plugin is used by [@toolbuilder/rollup-plugin-test-tools](https://github.com/toolbuilder/rollup-plugin-test-tools), which tests your [pack file](https://docs.npmjs.com/cli/v6/commands/npm-pack) in temporary ES, CommonJS, and Electron projects.

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
    // By default the plugin will use output.dir or dirname(output.file) for the output directory
    file: 'somewhere/es/entry-point.js'
    format: 'es'
  },
  plugins: [
    createPackFile({
      // if you want the packfile in another place than dirname(output.file) or output.dir,
      // specify that directory here.
      outputDir: 'somewhere'
    })
  ]
}
```

This plugin runs using the `generateBundle` hook. This lets you use the pack file when the `writeBundle` hook runs. The `writeBundle` hook runs plugins in parallel, so you can't control plugin execution order.

## Options

There are a number of options. The advanced options exist for unit testing, but you might find them useful.

Basic Options:

* `rootDir` - tell the plugin where the package root is located. By default, this is `process.cwd()`.
* `outputDir` - tell the plugin the output directory for the pack file. By default the plugin uses Rollup options `output.dir` or `dirname(output.file)` - whichever was specified.
* `packCommand` - tell the plugin what command to use to generate the pack file. This is not run in a shell, but `execa` is used to parse the command. By default, this is `npm pack`. For example, I use [pnpm](https://pnpm.js.org/) instead of `npm`, so my packCommand option looks like `pnpm pack`. The plugin expects the pack file name to match `npm` naming conventions.

Advanced options:

* `packageJson` - By default, the plugin reads `package.json` at `rootDir` to figure out the pack file name. If you want something else, provide this option an Object that has `name` and `version` attributes just like `package.json` does.
* `mover` - Async method that moves the pack file. Signature looks like this: async (fullPackFilePath, fullTargetPackFilePath) => {}. No return value is expected. An `Error` should be thrown on failure. By default the plugin provides a function to move the file.
* `shellCommand` - An async method that creates the pack file when given the `packCommand` option value. No return value is expected, an `Error` should be thrown on failure. By default, the plugin uses `execa.command` to run `packCommand`.

## Contributing

Contributions are welcome. Please create a pull request.

I use [pnpm](https://pnpm.js.org/) instead of npm.

## Issues

This project uses Github issues.
