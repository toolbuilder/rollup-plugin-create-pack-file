import { dirname, join } from 'path'
import pkgDir from 'pkg-dir'
import fs from 'fs-extra'
import spawn from 'cross-spawn'

// Run a shell command, link stdio to current process
const shellCommand = (cmdString) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmdString, [], { shell: true, stdio: 'inherit' })
    child.on('exit', (code, signal) => resolve([code, signal]))
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
        const [code, signal] = await options.shellCommand(options.packCommand)
        if (code && code !== 0) this.error(`${options.packCommand} returned code: ${code}`)
        if (signal) this.error(`${options.packCommand} exited on signal ${signal}`)
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
