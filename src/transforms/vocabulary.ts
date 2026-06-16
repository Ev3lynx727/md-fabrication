import { vocabulary } from '../sentences/index.js'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let cached: [RegExp, string[]][] | null = null

function buildVocabMap(): [RegExp, string[]][] {
  return vocabulary
    .map(e => [new RegExp('\\b' + escapeRegex(e.word) + '\\b', 'gi'), e.synonyms.filter(s => s.length > 0)] as [RegExp, string[]])
    .filter(([, syn]) => syn.length > 0)
}

let markerCounter = 0

export function diversifyVocabulary(text: string): { result: string; changes: number } {
  const vocabMap = cached || (cached = buildVocabMap())
  let result = text
  const replacements: [string, string][] = []
  for (const [pattern, syns] of vocabMap) {
    result = result.replace(pattern, (match: string) => {
      const marker = `\x00VOCAB${markerCounter++}\x00`
      const replacement = syns[Math.floor(Math.random() * syns.length)]
      replacements.push([marker, match[0] === match[0].toUpperCase()
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement])
      return marker
    })
  }
  for (const [marker, value] of replacements) {
    result = result.replace(marker, value)
  }
  return { result, changes: replacements.length }
}
