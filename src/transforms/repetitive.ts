import { repetitive } from '../sentences/index.js'

const patterns: [RegExp, string][] = repetitive
  .filter(e => e.phrase && e.replacement)
  .map(e => [new RegExp('\\b' + escapeRegex(e.phrase) + '\\b', 'gi'), e.replacement])

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function removeRepetitivePhrases(text: string): { result: string; changes: number } {
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}
