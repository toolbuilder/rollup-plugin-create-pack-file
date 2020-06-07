import createPackFile from '../src/plugin'
import { test } from 'zora'
import { join } from 'path'
import fs from 'fs-extra'

test('works on real filesystem', async assert => {
  const packFileName = 'toolbuilder-rollup-plugin-create-pack-file-0.1.0.tgz'
  const packFilePath = join(process.cwd(), packFileName)
  await fs.remove(packFilePath)

  let collector
  const plugin = createPackFile({ packCommand: 'pnpm pack', mover: (src, dst) => { collector = { src, dst } } })
  const wrapper = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await wrapper.generateBundle({ dir: 'some/test/dir' })

  const packFileStats = await fs.stat(join(process.cwd(), packFileName))
  assert.ok(packFileStats.isFile(), 'pack shell command was called')
  assert.deepEqual(collector.src, join(process.cwd(), packFileName), 'package.json read correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'read outputOptions to get dir')
  await fs.remove(packFilePath)
})

const fakeScopedPackageJson = {
  name: '@toolbuilder/awesome-pkg',
  version: '12.3.1-rc0'
}

test('plugin calculates pack file paths for scoped packages', async assert => {
  const collector = {}
  const plugin = createPackFile({
    // default pack command
    rootDir: '/home/package',
    mover: (src, dst) => { collector.src = src; collector.dst = dst },
    packageJson: fakeScopedPackageJson,
    shellCommand: async (cmdString) => 0 // zero for success
  })
  const rollup = {
    ...plugin,
    error (error) { console.log(error) }
  }

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
  const collector = {}
  const plugin = createPackFile({
    // default pack command
    rootDir: '/home/package',
    mover: (src, dst) => { collector.src = src; collector.dst = dst },
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => 0 // zero for success
  })
  const rollup = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await rollup.generateBundle({ dir: 'some/test/dir' })
  const packFileName = 'lodash-20.2.3.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'Plugin calculates destination path correctly')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin picks up destination path from outputOptions.file', async assert => {
  const collector = {}
  const plugin = createPackFile({
    // default pack command
    rootDir: '/home/package',
    mover: (src, dst) => { collector.src = src; collector.dst = dst },
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => 0 // zero for success
  })

  const rollup = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await rollup.generateBundle({ file: 'some/test/dir/test.js' })
  const packFileName = 'lodash-20.2.3.tgz'
  assert.deepEqual(collector.src, join('/home/package', packFileName), 'Plugin calculates source path correctly')
  assert.deepEqual(collector.dst, join('some/test/dir', packFileName), 'Plugin calculates destination path correctly')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin uses provided pack command', async assert => {
  const collector = {}
  const plugin = createPackFile({
    packCommand: 'pnpm pack',
    rootDir: '/home/package',
    mover: (src, dst) => {},
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => { collector.cmdString = cmdString; return 0 }
  })
  const wrapper = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await wrapper.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.cmdString, 'pnpm pack', 'plugin used provided shell command')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin uses default pack command when not provided', async assert => {
  const collector = {}
  const plugin = createPackFile({
    rootDir: '/home/package',
    mover: (src, dst) => {},
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => { collector.cmdString = cmdString; return 0 }
  })
  const wrapper = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await wrapper.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.cmdString, 'npm pack', 'plugin used default shell command')
  assert.deepEqual(collector.error, undefined, 'no error was generated')
})

test('plugin calls error method when non-zero return code from shellCommand', async assert => {
  const collector = {}
  const plugin = createPackFile({
    rootDir: '/home/package',
    mover: (src, dst) => {},
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => 5
  })
  const wrapper = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await wrapper.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.error, 'npm pack returned code: 5', 'correct error was generated')
})

test('plugin calls error method when shellCommand rejects', async assert => {
  const collector = {}
  const plugin = createPackFile({
    rootDir: '/home/package',
    mover: (src, dst) => {},
    packageJson: fakeUnscopedPackageJson,
    shellCommand: (cmdString) => Promise.reject('cannot find npm') // eslint-disable-line
  })
  const wrapper = {
    ...plugin,
    error (e) { collector.error = e }
  }
  await wrapper.generateBundle({ file: 'some/test/dir/test.js' })
  assert.deepEqual(collector.error, 'cannot find npm', 'correct error was generated')
})
