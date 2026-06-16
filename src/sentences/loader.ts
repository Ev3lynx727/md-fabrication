import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

let SENTENCES_DIR: string
try {
  SENTENCES_DIR = dirname(fileURLToPath(eval('import.meta.url')))
} catch {
  SENTENCES_DIR = __dirname
}

export function loadJSONL<T>(file: string): T[] {
  const content = readFileSync(join(SENTENCES_DIR, file), 'utf-8')
  return content.split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l) as T)
}
