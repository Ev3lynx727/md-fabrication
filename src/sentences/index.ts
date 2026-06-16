import { loadJSONL } from './loader.js'
import type {
  ConjunctionEntry,
  TransitionEntry,
  IntroEntry,
  ConjunctionStartEntry,
  VocabularyEntry,
  HedgeEntry,
  RepetitiveEntry,
  ContractionEntry,
  BannedWordEntry,
} from './types.js'

export const conjunctions = loadJSONL<ConjunctionEntry>('conjunctions.jsonl')
export const transitions = loadJSONL<TransitionEntry>('transitions.jsonl')
export const intros = loadJSONL<IntroEntry>('intros.jsonl')
export const conjunctionStarts = loadJSONL<ConjunctionStartEntry>('conjunction-starts.jsonl')
export const vocabulary = loadJSONL<VocabularyEntry>('vocabulary.jsonl')
export const hedges = loadJSONL<HedgeEntry>('hedges.jsonl')
export const repetitive = loadJSONL<RepetitiveEntry>('repetitive.jsonl')
export const contractions = loadJSONL<ContractionEntry>('contractions.jsonl')
export const bannedWords = loadJSONL<BannedWordEntry>('banned-words.jsonl')

export type {
  ConjunctionEntry,
  TransitionEntry,
  IntroEntry,
  ConjunctionStartEntry,
  VocabularyEntry,
  HedgeEntry,
  RepetitiveEntry,
  ContractionEntry,
  BannedWordEntry,
}
