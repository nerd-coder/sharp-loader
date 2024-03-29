const { getOptions, parseQuery, interpolateName } = require('loader-utils')
const { validate } = require('schema-utils')
const sharp = require('sharp')

const schema = require('./schema.json')
const DEFAULT_OPTIONS = {
  sizes: [],
  lqip: false,
  webp: false,
  origin: false,
  emitFile: true,
  esModule: true,
}

const splitIfString = z => (typeof z === 'string' ? z.split('+') : z)
const ensureArray = z => (Array.isArray(z) ? z : [])
const injectWebpackPath = (s = '') => s.replace(/\.\/img\//g, `"+__webpack_public_path__+"img/`)

/**
 * @param {string | Buffer} source
 * @this {import('webpack').loader.LoaderContext}
 */
module.exports = async function sharpLoader(source) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...getOptions(this),
    ...parseQuery(this.resourceQuery),
  }
  options.sizes = ensureArray(splitIfString(options.sizes))
  validate(schema, options)
  if (!(source instanceof Buffer)) throw new Error('`source` should be raw file data')

  const input = sharp(source)
  const meta = await input.metadata()
  const [hash, ext] = interpolateName(this, '[contenthash].[ext]', {
    context: this.rootContext,
    content: source,
  }).split('.')

  const outputs = {
    sizes: {
      srcSet: options.sizes.map(s => `./img/${hash}.${s}.${ext} ${s}`).join(','),
      ...options.sizes.reduce((a, b) => ({ ...a, [b]: `./img/${hash}.${b}.${ext}` }), {}),
    },
    ...(options.origin ? { origin: `./img/${hash}.${ext}` } : {}),
    ...(options.webp ? { webp: `./img/${hash}.webp` } : {}),
    ...(options.lqip ? { lqip: await generateLqipAsync(input) } : {}),
    aspectRatio: meta.width / meta.height,
  }

  if (options.emitFile) {
    if (options.origin) this.emitFile(outputs.origin, source)

    if (options.webp)
      this.emitFile(outputs.webp, await input.clone().webp({ nearLossless: true }).toBuffer())

    for (const size of options.sizes) {
      const parsed = parseSize(size)
      if (!parsed) throw new Error(`Invalid size ${parsed}`)
      this.emitFile(outputs.sizes[size], await input.clone().resize(parsed).toBuffer())
    }
  }

  if (!options.esModule) return injectWebpackPath(`module.exports = ${JSON.stringify(outputs)}`)

  return injectWebpackPath(`
export const sizes = ${JSON.stringify(outputs.sizes)}
export const origin = ${JSON.stringify(outputs.origin)}
export const webp = ${JSON.stringify(outputs.webp)}
export const lqip = ${JSON.stringify(outputs.lqip)}
export const aspectRatio = ${JSON.stringify(outputs.aspectRatio)}
export const metadata = ${JSON.stringify(meta)}
export default ${JSON.stringify(outputs)}
  `)
}

async function generateLqipAsync(input) {
  const buffer = await input.clone().jpeg({ quality: 70 }).resize(20).blur().toBuffer()
  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

function parseSize(size) {
  const variant1 = /^(?<width>\d+)w$/g
  const variant2 = /^(?<width>\d+)x(?<height>\d+)$/g
  const ensurePropIsNum = p => o => {
    if (typeof o === 'undefined') return undefined
    o[p] = +o[p] || undefined
    return o
  }
  const ensureW = ensurePropIsNum('width')
  const ensureH = ensurePropIsNum('height')
  const getGroups = v => ensureW(ensureH(v.exec(size).groups))

  return getGroups(variant1) || getGroups(variant2)
}
