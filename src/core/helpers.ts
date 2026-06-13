import * as fs from 'fs'
import * as path from 'path'
import { encodingForModel } from 'js-tiktoken'

export const COMMON_STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for',
  'of','with','by','from','as','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','need',
  'this','that','these','those','it','its','they','them','their',
  'what','which','who','whom','when','where','why','how',
  'all','each','every','both','few','more','most','some','any',
  'no','not','only','very','just','so','too','also','than',
  'then','now','here','there','about','into','over','such',
  'way','use','used','using','make','made','making','get','got',
  'one','two','like','well','back','even','still','much','yet',
  '---','source',
])

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'services', 'data', 'appendonlydir',
  'dist', 'build', '__pycache__', '.next', 'coverage', 'log'
])

export function isInCodeBlock(lines: string[], index: number): boolean {
  let inBlock = false
  for (let i = 0; i <= index; i++) {
    if (lines[i].trimStart().startsWith('```')) inBlock = !inBlock
  }
  return inBlock
}

export function getPositionalArg(start: number): string {
  for (let i = start; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('-')) return process.argv[i]
  }
  return ''
}

export function getPositionalArgs(start: number): string[] {
  const out: string[] = []
  for (let i = start; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('-')) out.push(process.argv[i])
  }
  return out
}

export function getFlagArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx > 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

export function extractFirstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

export function anchorName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function countTokens(text: string): number {
  try {
    return encodingForModel('gpt-4').encode(text).length
  } catch { return Math.ceil(text.length / 4) }
}
