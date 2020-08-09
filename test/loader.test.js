/**
 * @jest-environment node
 */
import compiler from './compiler.js'

test(
  'bg test',
  generateTestFor({
    entry: `./example/bg.js`,
    hash: 'd5c3766c9be71d504e4c2625b776f4fe',
    ext: 'jpg',
    ratio: 1.7777777777777777,
  })
)

test(
  'favicon test',
  generateTestFor({
    entry: `./example/favicon.js`,
    hash: '272dc358f350bfb88112b467b709f818',
    ext: 'png',
    ratio: 1,
  }),
  20e3 // 10s
)

function generateTestFor({ entry, hash, ext, ratio }) {
  return async () => {
    const stats = (await compiler(entry)).toJson()
    const [, normalSrc, allSrc] = stats.modules.map(z => z.source)
    const getJsonSrc = s => JSON.parse((s + '').replace(/^export default /, ''))

    expect(normalSrc).toEqual(`export default __webpack_public_path__ + "${hash}.${ext}";`)

    const all = getJsonSrc(allSrc)
    expect(all.webp).toEqual(`img/${hash}.${ext}.webp`)
    expect(all.lqip).toMatch(/^data:image\/jpeg;base64,/)
    expect(all.sizes).toHaveProperty('200w', `img/${hash}.200w.${ext}`)
    expect(all.sizes).toHaveProperty('800w', `img/${hash}.800w.${ext}`)
    expect(all.aspectRatio).toEqual(ratio)
  }
}
