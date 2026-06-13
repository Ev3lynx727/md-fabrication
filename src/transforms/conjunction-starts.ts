import { isInCodeBlock } from '../core/helpers.js'

export function addConjunctionStarts(text: string): { result: string; changes: number } {
  const lines = text.split('\n')
  let changes = 0
  const conjunctions = ['And', 'But', 'So', 'Yet']
  for (let i = 0; i < lines.length; i++) {
    if (isInCodeBlock(lines, i)) continue
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    const prevLine = i > 0 ? lines[i - 1].trim() : ''
    const isParagraphStart = prevLine === '' && i > 0
    const isAfterPeriod = trimmed.match(/^[A-Z]/) && !trimmed.match(/^(And|But|So|Yet|However|That said)/)
    if ((isParagraphStart || isAfterPeriod) && changes < 3 && trimmed.length > 30) {
      if (Math.random() < 0.35) {
        const conj = conjunctions[Math.floor(Math.random() * conjunctions.length)]
        lines[i] = conj + ' ' + trimmed[0].toLowerCase() + trimmed.slice(1)
        changes++
      }
    }
  }
  return { result: lines.join('\n'), changes }
}
