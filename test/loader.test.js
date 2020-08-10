/**
 * @jest-environment node
 */
import vm from 'vm'
import compiler from './compiler.js'

test(
  'bg test',
  generateTestFor({
    entry: `require('./img/bg.jpg');require('./img/bg.jpg?sizes=200w+800w&lqip')`,
    hash: 'd5c3766c9be71d504e4c2625b776f4fe',
    ext: 'jpg',
    ratio: 1.7777777777777777,
  })
)

test(
  'favicon test',
  generateTestFor({
    entry: `require('./img/favicon.png');require('./img/favicon.png?sizes=200w+800w&lqip')`,
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

    const getJsonSrc = s => {
      const json = /^export default (?<json>.+)$/gim.exec(s).groups['json']
      const sandbox = { val: null, __webpack_public_path__: '' }
      vm.runInNewContext(`val = ${json}`, sandbox)
      return sandbox.val
    }

    expect(normalSrc).toEqual(`export default __webpack_public_path__ + "${hash}.${ext}";`)

    // Check exports
    expect(allSrc).toMatch(/^export const sizes = \{(.+)\}$/m)
    expect(allSrc).toMatch(/^export const origin = (undefined|\".+\")$/m)
    expect(allSrc).toMatch(/^export const webp = (undefined|\".+\")$/m)
    expect(allSrc).toMatch(/^export const lqip = (undefined|\".+\")$/m)
    expect(allSrc).toMatch(/^export const aspectRatio = (\d+\.?\d*)$/m)
    expect(allSrc).toMatch(/^export const metadata = \{(.+)\}$/m)

    const parsedJson = getJsonSrc(allSrc)
    // expect(all.webp).toEqual(`img/${hash}.${ext}.webp`)
    expect(parsedJson.lqip).toMatch(/^data:image\/jpeg;base64,/)
    expect(parsedJson.sizes).toHaveProperty(
      'srcSet',
      `img/${hash}.200w.${ext} 200w,img/${hash}.800w.${ext} 800w`
    )
    expect(parsedJson.sizes).toHaveProperty('200w', `img/${hash}.200w.${ext}`)
    expect(parsedJson.sizes).toHaveProperty('800w', `img/${hash}.800w.${ext}`)
    expect(parsedJson.aspectRatio).toEqual(ratio)
  }
}
