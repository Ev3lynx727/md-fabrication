import { Transform } from '../core/types.js'

export const newsletterTransforms: Transform[] = [
  {
    type: 'structural',
    priority: 10,
    apply(content: string): string {
      const lines = content.split('\n').map(l => l.trimEnd())
      const result: string[] = []
      let blankRun = 0
      for (const line of lines) {
        if (line === '') {
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
      if (content.toLowerCase().includes('tl;dr') || content.toLowerCase().includes('tldr')) return content
      const lines = content.split('\n')
      let insertIdx = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ') && i + 2 < lines.length && lines[i + 2].trim()) {
          insertIdx = i + 2
          break
        }
      }
      if (insertIdx < 0) return content
      const tldr = lines[insertIdx].length > 120 ? lines[insertIdx].slice(0, 117) + '...' : lines[insertIdx]
      lines.splice(insertIdx, 0, '', '> **TL;DR** ' + tldr, '')
      return lines.join('\n')
    }
  }
]
