const tap = require('tap')
const vm = require('vm')
const path = require('path')
const webpack = require('webpack')
const fs = require('fs')
const { createFsFromVolume, Volume } = require('memfs')
const { ufs } = require('unionfs')

const ENTRY_PATH = path.resolve(`./src`)

tap.test(
  'bg test',
  generateTestFor({
    entry: `
      import img1 from './test/img/bg.jpg';
      import img2 from  './test/img/bg.jpg?sizes=200w+800w&lqip'

      console.log('img1',img1)
      console.log('img2',img2)
    `,
    hash: 'd5c3766c9be71d504e4c2625b776f4fe',
    ext: 'jpg',
    ratio: 1.7777777777777777,
  })
)

// tap.test(
//   'favicon test',
//   generateTestFor({
//     entry: `import './test/img/favicon.png';import './test/img/favicon.png?sizes=200w+800w&lqip'`,
//     hash: '272dc358f350bfb88112b467b709f818',
//     ext: 'png',
//     ratio: 1,
//   })
//   // 20e3 // 10s
// )

function generateTestFor({ entry, hash, ext, ratio }) {
  /** @param {Tap.Test} t */
  return async t => {
    const stats = await processEntry(entry)
    console.log('stats', stats)

    // TODO: Find a way to do test in Webpack 5

    // const [, normalSrc, allSrc] = stats.modules.map(z => z.modules)

    // const getJsonSrc = s => {
    //   const json = /^export default (?<json>.+)$/gim.exec(s).groups['json']
    //   const sandbox = { val: null, __webpack_public_path__: '' }
    //   vm.runInNewContext(`val = ${json}`, sandbox)
    //   return sandbox.val
    // }

    // t.equal(normalSrc, `export default __webpack_public_path__ + "${hash}.${ext}";`)

    // // Check exports
    // t.match(allSrc, /^export const sizes = \{(.+)\}$/m)
    // t.match(allSrc, /^export const origin = (undefined|\".+\")$/m)
    // t.match(allSrc, /^export const webp = (undefined|\".+\")$/m)
    // t.match(allSrc, /^export const lqip = (undefined|\".+\")$/m)
    // t.match(allSrc, /^export const aspectRatio = (\d+\.?\d*)$/m)
    // t.match(allSrc, /^export const metadata = \{(.+)\}$/m)

    // const parsedJson = getJsonSrc(allSrc)
    // // expect(all.webp).toEqual(`img/${hash}.${ext}.webp`)
    // t.match(parsedJson.lqip, /^data:image\/jpeg;base64,/)
    // t.has(parsedJson.sizes, 'srcSet')
    // t.equal(parsedJson.sizes.srcSet, `img/${hash}.200w.${ext} 200w,img/${hash}.800w.${ext} 800w`)
    // t.equal(parsedJson.sizes['200w'], `img/${hash}.200w.${ext}`)
    // t.equal(parsedJson.sizes['800w'], `img/${hash}.800w.${ext}`)
    // t.equal(parsedJson.aspectRatio, ratio)

    // End test
    t.end()
  }
}

async function processEntry(entry = '') {
  const compiler = webpack({
    module: {
      rules: [
        {
          test: /\.(gif|jpe?g|png|svg|tiff)/,
          use: [{ loader: path.resolve('.') }, 'file-loader'],
        },
      ],
    },
  })

  const _mfs = createFsFromVolume(Volume.fromJSON({ [ENTRY_PATH]: entry }))
  const _ufs = ufs.use(fs).use(_mfs)

  if (_ufs.readFileSync(ENTRY_PATH, 'utf8') !== entry) throw new Error('Invalid path')

  compiler.inputFileSystem = _ufs
  compiler.outputFileSystem = _mfs
  compiler.outputFileSystem.join = path.join.bind(path) // Patch

  const stats = await new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err)
      if (stats.hasErrors())
        reject(
          stats
            .toJson()
            .errors.map(z => z.message)
            .join()
        )

      resolve(stats)
    })
  })

  return stats.toJson()
}
