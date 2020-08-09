import path from 'path'
import webpack from 'webpack'
import { createFsFromVolume, Volume } from 'memfs'

export default async (entry = '') => {
  const webpackConfig = {
    context: __dirname,
    entry: `./example/index.js`,
    module: {
      rules: [{ test: /\.(gif|jpe?g|png|svg|tiff)/, use: ['sharp-loader', 'file-loader'] }],
    },
    resolveLoader: { alias: { 'sharp-loader': path.resolve(__dirname, '../src/index') } },
  }
  const compiler = webpack({ ...webpackConfig, entry })

  compiler.outputFileSystem = createFsFromVolume(new Volume())
  compiler.outputFileSystem.join = path.join.bind(path)

  return await runAsync(compiler)
}

/**
 * @param {webpack.Compiler} compiler
 * @returns {Promise<webpack.Stats>}
 */

async function runAsync(compiler) {
  return new Promise((resolve, reject) =>
    compiler.run((err, stats) => {
      if (err) reject(err)
      if (stats.hasErrors()) reject(new Error(stats.toJson().errors))
      resolve(stats)
    })
  )
}
