import createTestPackageJson from 'rollup-plugin-create-test-package-json'
import createPackFile from '@toolbuilder/rollup-plugin-create-pack-file'
import runCommands, { shellCommand } from '@toolbuilder/rollup-plugin-commands'
import { tmpdir } from 'os'
import { join } from 'path'
import { globSync } from 'glob'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This is recommended way of preserving directory structure and processing all files
// rather than using 'preserveModules: true', which involves tree-shaking and virtual files
const mapInputs = (glob) => Object.fromEntries(
  globSync(glob).map(file => [
    // Provide <dir structure>/<file basename> relative to package root, no file extension
    path.relative('.', file.slice(0, file.length - path.extname(file).length)),
    // Provide absolute filepath of input file
    fileURLToPath(new URL(file, import.meta.url))
  ])
)

/*
  This Rollup configuration is used by the 'check:packfile' script to validate that the
  packfile can pass the unit tests. It assumes 'pnpm' is installed. You can use 'npm' by
  changing 'pnpm' to 'npm' in this configuration.

  Use this configuration by running 'pnpm run check:packfile'. It will create a temporary
  directory, build a node package in the directory, and run the unit tests on the packfile.
*/

// This is where the test package is created
const testPackageDir = join(tmpdir(), `${Date.now()}`)

export default [
  {
    // process all unit tests, and specify output in 'test' directory of testPackageDir
    input: mapInputs(['test/**/*test.js']),
    external: (id) => !(id.startsWith('.') || id.startsWith('/')),
    output: {
      format: 'es', // the generated project is type:commonjs using esm to run es unit tests
      dir: testPackageDir,
      preserveModules: false // Generate one unit test for each input unit test
    },
    plugins: [
      createTestPackageJson({ // Creates package.json for testPackageDir
        // Provide information that plugin can't pick up for itself
        testPackageJson: {
          // if you want the test project to be type:module add that and exports here
          scripts: {
            test: 'pta --reporter tap "test/**/*test.js"'
          },
          // dependencies are populated automatically
          devDependencies: {
            // These are the dependencies for the test runner
            "pta": "^1.3.0",
            "zora": "^6.0.0"
          }
        }
      }),
      createPackFile({ // and move it to output.dir (i.e. testPackageDir)
        packCommand: 'pnpm pack'
      }),
      runCommands({
        commands: [
          // Install dependencies and run the unit test
          // The -C parameter ensures that the test does not resolve
          // any packages outside testPackageDir. Ordinarily, it
          // would pickup packages in this package too.
          shellCommand(`pnpm -C ${testPackageDir} install-test`)
        ]
      })
    ]
  }
]
