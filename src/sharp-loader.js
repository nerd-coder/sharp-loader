import { getOptions, parseQuery, interpolateName } from 'loader-utils'
import validateOptions from 'schema-utils'
import schema from './schema.json'
import sharp from 'sharp'

const splitIfString = z => (typeof z === 'string' ? z.split('+') : z)
const ensureArray = z => (Array.isArray(z) ? z : [])
const DEFAULT_OPTIONS = { sizes: [], lqip: false, webp: false, emitFile: true, esModule: true }

/**
 * @param {string | Buffer} source
 * @this {import('webpack').loader.LoaderContext}
 */
export default async function sharpLoader(source) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...getOptions(this),
    ...parseQuery(this.resourceQuery),
  }
  options.sizes = ensureArray(splitIfString(options.sizes))
  validateOptions(schema, options)
  if (!(source instanceof Buffer)) throw new Error('`source` should be raw file data')

  const input = sharp(source)
  const meta = await input.metadata()

  const _genName = s => interpolateName(this, s, { context: this.rootContext, content: source })
  const outputs = {
    sizes: options.sizes.reduce(
      (a, b) => ({ ...a, [b]: _genName(`img/[contenthash].${b}.[ext]`) }),
      {}
    ),
    ...(options.webp ? { webp: _genName('img/[contenthash].[ext].webp') } : {}),
    ...(options.lqip ? { lqip: await generateLqipAsync(input) } : {}),
    aspectRatio: meta.width / meta.height,
  }

  if (options.emitFile) {
    if (options.webp)
      this.emitFile(outputs.webp, await input.clone().webp({ nearLossless: true }).toBuffer())

    for (const size of options.sizes) {
      const parsed = parseSize(size)
      if (!parsed) throw new Error(`Invalid size ${parsed}`)
      this.emitFile(outputs.sizes[size], await input.clone().resize(parsed).toBuffer())
    }
  }

  return `${options.esModule ? 'export default' : 'module.exports ='} ${JSON.stringify(outputs)}`
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
