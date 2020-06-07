import createPackFile from '../src/plugin'
import { test } from 'zora'
import { join } from 'path'
import fs from 'fs-extra'

test('works on real filesystem', async assert => {
  const packFileName = 'toolbuilder-rollup-plugin-create-pack-file-0.1.0.tgz'
  const packFilePath = join(process.cwd(), packFileName)
  await fs.remove(packFilePath)

  const collector = {}
  const options = {
    packCommand: 'pnpm pack',
    mover: (src, dst) => { collector.src = src; collector.dst = dst }
  }
  const plugin = createPackFile(options)
  const rollup = { ...plugin, error (e) { collector.error = e } }
  await rollup.generateBundle({ dir: 'some/test/dir' })

  const packFileStats = await fs.stat(join(process.cwd(), packFileName))
  assert.ok(packFileStats.isFile(), 'pack shell command was called')
  assert.deepEqual(collector.src, join(process.cwd(), packFileName), 'package.json read correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'read outputOptions to get dir')
  await fs.remove(packFilePath)
})

const makeRollup = (options) => {
  const collector = {}
  const testOptions = {
    mover: (src, dst) => { collector.src = src; collector.dst = dst },
    shellCommand: (cmdString) => { collector.cmdString = cmdString; return [0, null] }
  }
  const plugin = createPackFile({ ...testOptions, ...options })
  const rollup = { ...plugin, error (e) { collector.error = e } }
  return { rollup, collector }
}

const fakeScopedPackageJson = {
  name: '@toolbuilder/awesome-pkg',
  version: '12.3.1-rc0'
}

test('plugin calculates pack file paths for scoped packages', async assert => {
  const { rollup, collector } = makeRollup({ rootDir: '/home/package', packageJson: fakeScopedPackageJson })
  await rollup.generateBundle({ dir: 'some/test/dir' })

  const packFileName = 'toolbuilder-awesome-pkg-12.3.1-rc0.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'Plugin calculates destination path correctly')
  assert.deepEqual(collector.error, undefined, 'no error thrown while processing')
})

const fakeUnscopedPackageJson = {
  name: 'lodash',
  version: '20.2.3'
}

test('plugin calculates pack file paths for unscoped packages', async assert => {
  const { rollup, collector } = makeRollup({ rootDir: '/home/package', packageJson: fakeUnscopedPackageJson })
  await rollup.generateBundle({ dir: 'some/test/dir' })

  const packFileName = 'lodash-20.2.3.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'Plugin calculates destination path correctly')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin picks up destination path from outputOptions.file', async assert => {
  const { rollup, collector } = makeRollup({ rootDir: '/home/package', packageJson: fakeUnscopedPackageJson })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })

  const packFileName = 'lodash-20.2.3.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'Plugin calculates destination path correctly')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin uses provided pack command', async assert => {
  const { rollup, collector } = makeRollup({
    packCommand: 'pnpm pack',
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })

  assert.deepEqual(collector.cmdString, 'pnpm pack', 'plugin used provided shell command')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin uses default pack command when not provided', async assert => {
  const { rollup, collector } = makeRollup({ rootDir: '/home/package', packageJson: fakeUnscopedPackageJson })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })

  assert.deepEqual(collector.cmdString, 'npm pack', 'plugin used default shell command')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin calls error method when non-zero return code from shellCommand', async assert => {
  const { rollup, collector } = makeRollup({
    shellCommand: (cmdString) => [5, null],
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.error, 'npm pack returned code: 5', 'correct error was generated')
})

test('plugin calls error method when shellCommand returns a signal', async assert => {
  const { rollup, collector } = makeRollup({
    shellCommand: (cmdString) => [null, 'SIGPIPE'],
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.error, 'npm pack exited on signal SIGPIPE', 'correct error was generated')
})

test('plugin calls error method when shellCommand rejects', async assert => {
  const { rollup, collector } = makeRollup({
    shellCommand: (cmdString) => Promise.reject('cannot find npm'), // eslint-disable-line
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.error, 'cannot find npm', 'correct error was generated')
})
