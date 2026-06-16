import { VoiceProfile, FabricationSummary } from '../core/types.js'
import { softenConjunctions } from './conjunctions.js'
import { passiveToActive } from './passive.js'
import { applyContractions } from './contractions.js'
import { addTransitions } from './transitions.js'
import { adjustPacing } from './pacing.js'
import { removeRepetitivePhrases } from './repetitive.js'
import { diversifyVocabulary } from './vocabulary.js'
import { hedgeAbsoluteStatements } from './hedging.js'
import { addConjunctionStarts } from './conjunction-starts.js'
import { varySentenceOpenings } from './sentence-variety.js'
import { removeBannedWords } from './remove-banned-words.js'

export function fabricateText(content: string, profile: VoiceProfile): {
  transformed: string
  summary: FabricationSummary
} {
  let text = content
  const changes = { conj: 0, passive: 0, cont: 0, trans: 0, pace: 0, vocab: 0, hedge: 0, conjStart: 0, sentStart: 0, banned: 0 }

  // Phase 1 — Promote: add transitions, conj-starts, variety for better flow
  if (profile.transitions) { const t = addTransitions(text); text = t.result; changes.trans = t.changes }
  if (profile.conjunctionStarts) { const t = addConjunctionStarts(text); text = t.result; changes.conjStart = t.changes }
  if (profile.sentenceVariety) { const t = varySentenceOpenings(text); text = t.result; changes.sentStart = t.changes }
  if (profile.pacing) { const t = adjustPacing(text); text = t.result; changes.pace = t.changes }

  // Phase 2 — Replace: clean up issues, swap patterns (strict confidence threshold)
  if (profile.bannedWords) { const t = removeBannedWords(text, { mode: 'replace' }); text = t.result; changes.banned = t.changes }
  if (profile.contractions) { const t = applyContractions(text, profile); text = t.result; changes.cont = t.changes }
  if (profile.vocabularyDiversity) { const t = diversifyVocabulary(text); text = t.result; changes.vocab = t.changes }
  if (profile.conjunctionSoftening) { const t = softenConjunctions(text, { mode: 'replace' }); text = t.result; changes.conj = t.changes }
  if (profile.repetitivePhrases) { const t = removeRepetitivePhrases(text, { mode: 'replace' }); text = t.result }
  if (profile.hedgePhrases) { const t = hedgeAbsoluteStatements(text, { mode: 'replace' }); text = t.result; changes.hedge = t.changes }
  if (profile.passiveToActive) { const t = passiveToActive(text); text = t.result; changes.passive = t.changes }

  // Phase 3 — Cleanup: collapse whitespace, fix orphaned capitalization
  text = text.replace(/ {2,}/g, ' ')
  text = text.replace(/([.!?]) ([a-z])/g, (_, p, l) => `${p} ${l.toUpperCase()}`)

  return {
    transformed: text,
    summary: {
      sentencesRestructured: changes.conjStart + changes.sentStart,
      transitionsAdded: changes.trans,
      contractionsApplied: changes.cont,
      passiveToActive: changes.passive,
      conjunctionSoftened: changes.conj,
      pacingAdjusted: changes.pace,
      vocabularyDiversified: changes.vocab,
      hedgePhrasesInjected: changes.hedge,
      conjunctionStartsAdded: changes.conjStart,
      sentenceOpeningsVaried: changes.sentStart,
      bannedWordsRemoved: changes.banned
    }
  }
}
