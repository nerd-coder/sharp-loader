import path from 'path'
import webpack from 'webpack'
import * as fs from 'fs'
import { createFsFromVolume, Volume } from 'memfs'
import { ufs } from 'unionfs'

const WEBPACK_CONFIG = {
  context: __dirname,
  module: { rules: [{ test: /\.(gif|jpe?g|png|svg|tiff)/, use: ['xloader', 'file-loader'] }] },
  resolveLoader: { alias: { xloader: path.resolve(__dirname, '../src/index') } },
}
const ENTRY_PATH = path.resolve(__dirname, `./src`)

const runAsync = z => new Promise((res, rej) => z.run((e, s) => (e ? rej(e) : res(s))))

export default async (entry = '') => {
  const compiler = webpack(WEBPACK_CONFIG)

  const _mfs = createFsFromVolume(Volume.fromJSON({ [ENTRY_PATH]: entry }))
  const _ufs = ufs.use(fs).use(_mfs)

  expect(_ufs.readFileSync(ENTRY_PATH, 'utf8')).toBe(entry)

  compiler.inputFileSystem = _ufs
  compiler.outputFileSystem = _mfs
  compiler.outputFileSystem.join = path.join.bind(path) // Patch

  const stats = await runAsync(compiler)
  if (stats.hasErrors()) throw new Error(stats.toJson().errors)

  return stats
}
