import { loadJSONL } from './loader.js'
import type {
  ConjunctionEntry,
  TransitionEntry,
  IntroEntry,
  ConjunctionStartEntry,
  VocabularyEntry,
  HedgeEntry,
} from './types.js'

export const conjunctions = loadJSONL<ConjunctionEntry>('conjunctions.jsonl')
export const transitions = loadJSONL<TransitionEntry>('transitions.jsonl')
export const intros = loadJSONL<IntroEntry>('intros.jsonl')
export const conjunctionStarts = loadJSONL<ConjunctionStartEntry>('conjunction-starts.jsonl')
export const vocabulary = loadJSONL<VocabularyEntry>('vocabulary.jsonl')
export const hedges = loadJSONL<HedgeEntry>('hedges.jsonl')

export type {
  ConjunctionEntry,
  TransitionEntry,
  IntroEntry,
  ConjunctionStartEntry,
  VocabularyEntry,
  HedgeEntry,
}
