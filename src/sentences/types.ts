export interface ConjunctionEntry {
  id: string
  trigger: string
  result: string
  tags: string[]
  priority: number
}

export interface TransitionEntry {
  id: string
  phrase: string
  weight: number
  context: string
  tags: string[]
}

export interface IntroEntry {
  id: string
  phrase: string
  triggers: string[]
  weight: number
}

export interface ConjunctionStartEntry {
  id: string
  word: string
  weight: number
  tags: string[]
}

export interface VocabularyEntry {
  id: string
  word: string
  synonyms: string[]
  tags: string[]
}

export interface HedgeEntry {
  id: string
  pattern: string
  replacement: string
  confidence: number
  tags: string[]
}

export interface RepetitiveEntry {
  id: string
  phrase: string
  replacement: string
  confidence: number
  category: string
  source: string
}

export interface ContractionEntry {
  id: string
  full: string
  contracted: string
  confidence: number
  tags: string[]
}

export interface BannedWordEntry {
  id: string
  phrase: string
  category: string
  replacement: string
  severity: string
}
