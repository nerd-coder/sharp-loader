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
    const getJsonSrc = s => JSON.parse(/^export default (?<json>.+)$/gim.exec(s).groups['json'])

    expect(normalSrc).toEqual(`export default __webpack_public_path__ + "${hash}.${ext}";`)

    // Check exports
    expect(allSrc).toMatch(/^export const sizes = \{(.+)\}$/m)
    expect(allSrc).toMatch(/^export const webp = (undefined|\".+\")$/m)
    expect(allSrc).toMatch(/^export const lqip = (undefined|\".+\")$/m)
    expect(allSrc).toMatch(/^export const aspectRatio = (\d+\.?\d*)$/m)

    const parsedJson = getJsonSrc(allSrc)
    // expect(all.webp).toEqual(`img/${hash}.${ext}.webp`)
    expect(parsedJson.lqip).toMatch(/^data:image\/jpeg;base64,/)
    expect(parsedJson.sizes).toHaveProperty('origin', `img/${hash}.${ext}`)
    expect(parsedJson.sizes).toHaveProperty(
      'srcSet',
      `img/${hash}.200w.${ext} 200w,img/${hash}.800w.${ext} 800w`
    )
    expect(parsedJson.sizes).toHaveProperty('200w', `img/${hash}.200w.${ext}`)
    expect(parsedJson.sizes).toHaveProperty('800w', `img/${hash}.800w.${ext}`)
    expect(parsedJson.aspectRatio).toEqual(ratio)
  }
}
