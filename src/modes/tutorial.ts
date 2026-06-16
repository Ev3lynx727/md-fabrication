import { Transform } from '../core/types.js'

export const tutorialTransforms: Transform[] = [
  {
    type: 'structural',
    priority: 10,
    apply(content: string): string {
      const lines = content.split('\n').map(l => l.trimEnd())
      let h1Found = false
      for (const line of lines) {
        if (line.startsWith('# ') && !h1Found) h1Found = true
      }
      if (!h1Found) lines.unshift('# Tutorial\n')
      return lines.join('\n')
    }
  },
  {
    type: 'structural',
    priority: 20,
    apply(content: string): string {
      if (content.includes('## Prerequisites')) return content
      const lines = content.split('\n')
      let insertAt = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('```') && (i === 0 || lines[i - 1].trim() === '')) {
          insertAt = i
          break
        }
      }
      if (insertAt < 0) return content
      lines.splice(insertAt, 0, '', '## Prerequisites', '', 'Before starting, ensure you have the following:', '')
      return lines.join('\n')
    }
  }
]
