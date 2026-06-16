import { contractions } from '../sentences/index.js'
import { VoiceProfile } from '../core/types.js'

const patterns: [RegExp, string][] = contractions
  .filter(e => e.full && e.contracted)
  .map(e => [new RegExp('\\b' + escapeRegex(e.full) + '\\b', 'gi'), e.contracted])

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function applyContractions(text: string, profile: VoiceProfile): { result: string; changes: number } {
  if (!profile.contractions) return { result: text, changes: 0 }
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}
