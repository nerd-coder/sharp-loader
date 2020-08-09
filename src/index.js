import sharpLoader from './sharp-loader'

export const raw = true
export function pitch() {
  // Ensure this loader is running alone
  const self = this.loaders[this.loaderIndex]
  if (this.resourceQuery) this.loaders = [self]
  else this.loaders.splice(this.loaderIndex, 1)
}
export default function (...params) {
  const callback = this.async()
  const loader = sharpLoader.bind(this)
  loader(...params)
    .then(z => callback(null, z))
    .catch(e => callback(e))
}
