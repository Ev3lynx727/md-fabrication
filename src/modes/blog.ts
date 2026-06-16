import { Transform } from '../core/types.js'

export const blogTransforms: Transform[] = [
  {
    type: 'structural',
    priority: 10,
    apply(content: string): string {
      const lines = content.split('\n')
      const result: string[] = []
      let blankRun = 0
      for (const line of lines) {
        if (line.trim() === '') {
          blankRun++
          if (blankRun <= 2) result.push(line)
        } else {
          blankRun = 0
          result.push(line)
        }
      }
      return result.join('\n')
    }
  },
  {
    type: 'structural',
    priority: 20,
    apply(content: string): string {
      const lines = content.split('\n')
      let h1Found = false
      for (const line of lines) {
        if (line.startsWith('# ') && !h1Found) h1Found = true
      }
      if (!h1Found) lines.unshift('# Blog Post\n')
      return lines.join('\n')
    }
  }
]
