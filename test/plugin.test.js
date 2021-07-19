import createPackFile from '../src/plugin'
import { test } from 'zora'
import { join } from 'path'
import fs from 'fs-extra'

const makeRollup = (options) => {
  const collector = {}
  const testOptions = {
    mover: (src, dst) => { collector.src = src; collector.dst = dst },
    shellCommand: (cmdString) => { collector.cmdString = cmdString; return 0 }
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

test('plugin uses outputDir option when provided', async assert => {
  const outputDir = '/some/output/dir'
  const { rollup, collector } = makeRollup({ rootDir: '/home/package', outputDir, packageJson: fakeUnscopedPackageJson })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })

  const packFileName = 'lodash-20.2.3.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join(outputDir, packFileName), 'Plugin calculates destination path correctly')
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

test('plugin calls passes exception from shellCommand to Rollup', async assert => {
  const { rollup, collector } = makeRollup({
    shellCommand: (cmdString) => { throw new Error('some error') },
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  assert.ok(collector.error instanceof Error, 'error was passed to Rollup')
})

test('plugin passes exception from mover to Rollup', async assert => {
  const { rollup, collector } = makeRollup({
    mover: (src, dst) => { throw new Error('some mover error') },
    rootDir: '/home/package',
    packageJson: fakeUnscopedPackageJson
  })
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  assert.ok(collector.error instanceof Error, 'error was passed to Rollup')
})

const calculatePackFileName = async () => {
  const packageJson = await fs.readJSON(join(process.cwd(), 'package.json'))
  const hyphenName = packageJson.name.replace('@', '').replace('/', '-')
  return `${hyphenName}-${packageJson.version}.tgz`
}

test('works on real filesystem', async assert => {
  const packFileName = await calculatePackFileName()
  const packFilePath = join(process.cwd(), packFileName)
  await fs.remove(packFilePath)

  const collector = {}
  const options = {
    packCommand: 'pnpm pack',
    mover: (src, dst) => { collector.src = src; collector.dst = dst }
  }
  const plugin = createPackFile(options)
  const rollup = { ...plugin, error (e) { console.log(e); collector.error = e } }
  await rollup.generateBundle({ dir: 'some/test/dir' })

  const packFileStats = await fs.stat(join(process.cwd(), packFileName))
  assert.ok(packFileStats.isFile(), 'pack shell command was called')
  assert.deepEqual(collector.src, join(process.cwd(), packFileName), 'package.json read correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'read outputOptions to get dir')
  await fs.remove(packFilePath)
})
