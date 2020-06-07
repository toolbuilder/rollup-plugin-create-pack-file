import { dirname, join } from 'path'
import pkgDir from 'pkg-dir'
import fs from 'fs-extra'
import spawn from 'cross-spawn'

// Run a shell command, link stdio to current process
const shellCommand = async (cmdString) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmdString, [], { shell: true, stdio: 'inherit' })
    child.on('exit', (code, signal) => {
      (code != null && code === 0) ? resolve(code) : reject(new Error(`${cmdString} exited with non-zero exit code`))
      if (signal != null) reject(new Error(`${cmdString} exited because of ${signal}`))
    })
    child.on('error', (error) => reject(error))
  })
}

const readPackageJson = async (startFrom = process.cwd()) => {
  const path = await pkgDir(startFrom)
  return fs.readJSON(join(path, 'package.json'))
}

const mover = (src, dst) => fs.move(src, dst, { overwrite: true })

export default (userOptions = {}) => {
  const options = {
    rootDir: process.cwd(),
    packCommand: 'npm pack',
    packageJson: undefined, // permit testing without filesystem access
    mover, // permit testing without filesystem access
    shellCommand, // permit testing without calling command
    ...userOptions
  }

  // Derive the pack file name from packageJson
  const packFileName = (packageJson) => {
    const name = packageJson.name.replace('@', '').replace('/', '-')
    const version = packageJson.version
    return `${name}-${version}.tgz`
  }

  return {
    name: 'create-pack-file',
    // Create pack file, and move it to the output directory
    async generateBundle (outputOptions) {
      try {
        await options.shellCommand(options.packCommand)
        const packageJson = options.packageJson || await readPackageJson(options.rootDir)
        const packfile = packFileName(packageJson)
        const outputDir = outputOptions.dir || dirname(outputOptions.file)
        await options.mover(join(options.rootDir, packfile), join(outputDir, packfile))
      } catch (error) {
        this.error(error)
      }
    }
  }
}
