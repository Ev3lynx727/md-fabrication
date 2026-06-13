import { Transform } from '../core/types.js'

export const changelogTransforms: Transform[] = [
  {
    type: 'regex',
    priority: 10,
    apply(content: string): string {
      const lines = content.split('\n')
      const result: string[] = []
      for (const line of lines) {
        if (/^##\s+\d+\.\d+\.\d+/i.test(line)) {
          result.push(line.replace(/^##\s+/, '## v'))
        } else {
          result.push(line)
        }
      }
      return result.join('\n')
    }
  }
]
