import * as path from 'path'
import { fileURLToPath } from 'url'

let PROJECT_ROOT: string

try {
  // ESM: eval hides import.meta from TS parser, avoiding TS1343 in CJS build
  const filename = fileURLToPath(eval('import.meta.url'))
  PROJECT_ROOT = path.resolve(path.dirname(filename), '..', '..')
} catch {
  // CJS: __dirname is available
  PROJECT_ROOT = path.resolve(__dirname, '..', '..')
}

export { PROJECT_ROOT }
