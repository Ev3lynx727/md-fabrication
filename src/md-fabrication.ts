#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { encodingForModel } from 'js-tiktoken'
import { AsciiTable3 } from 'ascii-table3'
import * as yaml from 'js-yaml'
import { DepGraph } from 'dependency-graph'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

interface FrontmatterResult {
  metadata: Record<string, string> | null
  content: string
  raw: string
}

interface FabricationSummary {
  sentencesRestructured: number
  transitionsAdded: number
  contractionsApplied: number
  passiveToActive: number
  conjunctionSoftened: number
  pacingAdjusted: number
  vocabularyDiversified: number
  hedgePhrasesInjected: number
  conjunctionStartsAdded: number
  sentenceOpeningsVaried: number
}

interface FabricationResult {
  file: string
  fileName: string
  voice: string
  totalChanges: number
  changesApplied: boolean
  summary: FabricationSummary
  tokensUsed: number
  error?: string
}

interface SessionStats {
  sessionId: string
  calls: number
  totalTokens: number
  filesProcessed: number
  startTime: string
}

interface RunLog {
  timestamp: string
  sessionId: string
  file: string
  voice: string
  changes: number
  changesApplied: boolean
  tokensUsed: number
  durationMs: number
  mode: string
}

interface VoiceProfile {
  contractions: boolean
  transitions: boolean
  passiveToActive: boolean
  conjunctionSoftening: boolean
  pacing: boolean
  repetitivePhrases: boolean
  vocabularyDiversity: boolean
  hedgePhrases: boolean
  conjunctionStarts: boolean
  sentenceVariety: boolean
}

interface VoiceConfig {
  default: string
  profiles: Record<string, VoiceProfile>
}

let VOICE_CONFIG: VoiceConfig | null = null
let TIMEZONE: string | null = null
const CONFIG_PATH = path.join(__dirname, 'config.yaml')
const SESSION_FILE = '/tmp/md-fabrication-session.json'
const LOG_DIR = path.join(__dirname, 'log')

function loadVoiceConfig(): VoiceConfig {
  if (VOICE_CONFIG) return VOICE_CONFIG
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = yaml.load(raw) as any
    VOICE_CONFIG = {
      default: parsed.voice?.default || 'professional',
      profiles: parsed.voice?.profiles || {}
    }
    TIMEZONE = parsed.timezone || 'UTC'
    return VOICE_CONFIG
  } catch {
    VOICE_CONFIG = {
      default: 'professional',
      profiles: {
        professional: { contractions: false, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false },
        casual: { contractions: true, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false },
        technical: { contractions: false, transitions: false, passiveToActive: true, conjunctionSoftening: false, pacing: false, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false }
      }
    }
    return VOICE_CONFIG
  }
}

function getValidVoices(): string[] {
  return Object.keys(loadVoiceConfig().profiles)
}

interface LinkRef {
  text: string
  url: string
  type: 'internal' | 'external' | 'image'
  fileName: string | null
}

interface ImageRef {
  alt: string
  url: string
  type: 'local' | 'remote' | 'bucket'
  bucketName: string | null
  exists: boolean | null
}

interface GraphNode {
  inbound: string[]
  outbound: string[]
  images: ImageRef[]
}

interface Graph {
  nodes: Record<string, GraphNode>
  edges: { source: string; target: string; type: string }[]
}

interface ImageMap {
  local: ImageRef[]
  remote: ImageRef[]
  bucket: ImageRef[]
  broken: ImageRef[]
}

interface FragmentMetadata {
  title: string
  author: string | null
  tags: string[]
  depends_on: string[]
  order: number | null
  status: string | null
  source: string | null
  date_iso: string | null
  description: string | null
}

interface Fragment {
  file: string
  fileName: string
  metadata: FragmentMetadata
  content: string
  raw: string
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'services', 'data', 'appendonlydir',
  'dist', 'build', '__pycache__', '.next', 'coverage', 'log'
])


function getTomlConfig(tomlPath: string): Record<string, any> {
  try {
    const content = fs.readFileSync(tomlPath, 'utf-8')
    const config: Record<string, any> = {}
    let inConfigSection = false
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed === '[tool.md-fabrication.config]') { inConfigSection = true; return }
      if (inConfigSection) {
        if (trimmed.startsWith('[')) { inConfigSection = false; return }
        if (trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
          config[key.trim()] = value
        }
      }
    })
    return config
  } catch { return {} }
}

function extractFrontmatter(content: string): FrontmatterResult {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = content.match(frontmatterRegex)
  if (!match) return { metadata: null, content, raw: '' }
  const metadata: Record<string, string> = {}
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      metadata[line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim()
    }
  })
  return { metadata, content: content.substring(match[0].length), raw: match[0] }
}

function isInCodeBlock(lines: string[], index: number): boolean {
  let inBlock = false
  for (let i = 0; i <= index; i++) {
    if (lines[i].trimStart().startsWith('```')) inBlock = !inBlock
  }
  return inBlock
}


const TRANSITIONS = [
  'However,', 'That said,', 'More importantly,', 'Meanwhile,',
  'Furthermore,', 'In addition,', 'On the other hand,',
  'As a result,', 'Notably,', 'Specifically,',
  'In practice,', 'Beyond that,', 'Consequently,',
  'For context,', 'To illustrate,'
]

function softenConjunctions(text: string): { result: string; changes: number } {
  const patterns: [RegExp, string][] = [
    [/\bFirstly\b,/gi, 'First,'],
    [/\bSecondly\b,/gi, 'Second,'],
    [/\bThirdly\b,/gi, 'Third,'],
    [/\bFourthly\b,/gi, 'Fourth,'],
    [/\bLastly\b,/gi, 'Finally,'],
    [/\bIn conclusion\b,/gi, 'To wrap up,'],
    [/\bMoreover\b,/gi, "What's more,"],
    [/\bFurthermore\b,/gi, 'Beyond that,'],
    [/\bAdditionally\b,/gi, 'Also,'],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}


function passiveToActive(text: string): { result: string; changes: number } {
  const patterns: [RegExp, string][] = [
    [/\bwas written\b/gi, 'wrote'],
    [/\bwas created\b/gi, 'created'],
    [/\bwas built\b/gi, 'built'],
    [/\bwas developed\b/gi, 'developed'],
    [/\bwas designed\b/gi, 'designed'],
    [/\bwas implemented\b/gi, 'implemented'],
    [/\bwas conducted\b/gi, 'conducted'],
    [/\bwas performed\b/gi, 'performed'],
    [/\bwas carried out\b/gi, 'performed'],
    [/\bwas observed\b/gi, 'observed'],
    [/\bwas found\b/gi, 'found'],
    [/\bwas considered\b/gi, 'considered'],
    [/\bwas defined\b/gi, 'defined'],
    [/\bwas generated\b/gi, 'generated'],
    [/\bwas processed\b/gi, 'processed'],
    [/\bare written\b/gi, 'write'],
    [/\bare created\b/gi, 'create'],
    [/\bare built\b/gi, 'build'],
    [/\bare developed\b/gi, 'develop'],
    [/\bare implemented\b/gi, 'implement'],
    [/\bare conducted\b/gi, 'conduct'],
    [/\bare performed\b/gi, 'perform'],
    [/\bare carried out\b/gi, 'perform'],
    [/\bare observed\b/gi, 'observe'],
    [/\bare found\b/gi, 'find'],
    [/\bare considered\b/gi, 'consider'],
    [/^It is important to note that /gmi, ''],
    [/^It should be noted that /gmi, ''],
    [/^It is worth mentioning that /gmi, ''],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}


function applyContractions(text: string, profile: VoiceProfile): { result: string; changes: number } {
  if (!profile.contractions) return { result: text, changes: 0 }
  const patterns: [RegExp, string][] = [
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bdid not\b/gi, "didn't"],
    [/\bwill not\b/gi, "won't"],
    [/\bcannot\b/gi, "can't"],
    [/\bcould not\b/gi, "couldn't"],
    [/\bshould not\b/gi, "shouldn't"],
    [/\bwould not\b/gi, "wouldn't"],
    [/\bhave not\b/gi, "haven't"],
    [/\bhas not\b/gi, "hasn't"],
    [/\bhad not\b/gi, "hadn't"],
    [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"],
    [/\bwas not\b/gi, "wasn't"],
    [/\bwere not\b/gi, "weren't"],
    [/\bit is\b/gi, "it's"],
    [/\bthat is\b/gi, "that's"],
    [/\bthere is\b/gi, "there's"],
    [/\bhere is\b/gi, "here's"],
    [/\bwhat is\b/gi, "what's"],
    [/\bwho is\b/gi, "who's"],
    [/\blet us\b/gi, "let's"],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}


function addTransitions(text: string): { result: string; changes: number } {
  const lines = text.split('\n')
  let changes = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (isInCodeBlock(lines, i)) continue
    if (line === '' || line.startsWith('#') || line.startsWith('>') || line.startsWith('-') || line.startsWith('*')) continue
    const prevLine = i > 0 ? lines[i - 1].trim() : ''
    if (prevLine === '' && i > 1) {
      const prevContent = i > 1 ? lines[i - 2].trim() : ''
      if (prevContent && prevContent.length > 40 && line.length > 20 && !line.match(/^(However|That said|More importantly|Meanwhile|Furthermore|In addition|On the other hand|As a result|Notably|Specifically|In practice|Beyond that|Consequently|For context|To illustrate)/i)) {
        const transition = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]
        lines[i] = transition + ' ' + line
        changes++
      }
    }
  }
  return { result: lines.join('\n'), changes }
}

function adjustPacing(text: string): { result: string; changes: number } {
  const lines = text.split('\n')
  let changes = 0
  for (let i = 1; i < lines.length; i++) {
    if (isInCodeBlock(lines, i)) continue
    const line = lines[i].trim()
    const prevLine = lines[i - 1].trim()
    if (line.length > 100 && prevLine.length > 100 && !line.startsWith('#') && !prevLine.startsWith('#')) {
      const mid = Math.floor(line.length / 2)
      const breakPoint = line.indexOf('. ', mid)
      if (breakPoint > 0 && breakPoint < line.length - 2) {
        lines[i] = line.substring(0, breakPoint + 1) + '\n' + line.substring(breakPoint + 2)
        changes++
      }
    }
  }
  return { result: lines.join('\n'), changes }
}

function removeRepetitivePhrases(text: string): { result: string; changes: number } {
  const patterns: [RegExp, string][] = [
    [/In order to\b/gi, 'To'],
    [/Due to the fact that\b/gi, 'Because'],
    [/At the end of the day\b/gi, 'Ultimately'],
    [/In the event that\b/gi, 'If'],
    [/On a daily basis\b/gi, 'Daily'],
    [/In a timely manner\b/gi, 'Promptly'],
    [/The vast majority of\b/gi, 'Most'],
    [/A significant number of\b/gi, 'Many'],
    [/Is able to\b/gi, 'Can'],
    [/Has the ability to\b/gi, 'Can'],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacement] of patterns) {
    const before = result
    result = result.replace(pattern, replacement)
    if (result !== before) changes++
  }
  return { result, changes }
}

function diversifyVocabulary(text: string): { result: string; changes: number } {
  const vocabMap: [RegExp, string[]][] = [
    [/\bimportant\b/gi, ['critical', 'significant', 'key', 'essential', 'crucial']],
    [/\buse\b/gi, ['leverage', 'employ', 'utilize']],
    [/\bvery\b/gi, ['highly', 'extremely', 'remarkably', 'exceptionally']],
    [/\bmany\b/gi, ['numerous', 'countless', 'various', 'myriad']],
    [/\bthing\b/gi, ['aspect', 'element', 'factor', 'component']],
    [/\bgood\b/gi, ['effective', 'valuable', 'beneficial', 'compelling']],
    [/\bbig\b/gi, ['substantial', 'significant', 'considerable', 'extensive']],
    [/\breally\b/gi, ['genuinely', 'truly', 'particularly']],
    [/\bshow\b/gi, ['demonstrate', 'illustrate', 'reveal', 'indicate']],
    [/\bget\b/gi, ['obtain', 'acquire', 'attain']],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacements] of vocabMap) {
    const before = result
    result = result.replace(pattern, () => replacements[Math.floor(Math.random() * replacements.length)])
    if (result !== before) changes++
  }
  return { result, changes }
}

function hedgeAbsoluteStatements(text: string): { result: string; changes: number } {
  const hedgeMap: [RegExp, (match: string) => string][] = [
    [/\b(s)always\b/gi, m => { const up = m[0] === m[0].toUpperCase(); return m.length > 1 && m[0] === 's' ? (up ? 'S' : 's') + 'often' : up ? 'Often' : 'often' }],
    [/\bnever\b/gi, m => m[0] === m[0].toUpperCase() ? 'Rarely' : 'rarely'],
    [/\beveryone\b/gi, m => m[0] === m[0].toUpperCase() ? 'Many' : 'many'],
    [/\bno one\b/gi, m => m[0] === m[0].toUpperCase() ? 'Few' : 'few'],
    [/\bimpossible\b/gi, m => m[0] === m[0].toUpperCase() ? 'Challenging' : 'challenging'],
    [/\beverybody\b/gi, m => m[0] === m[0].toUpperCase() ? 'Most' : 'most'],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacer] of hedgeMap) {
    const before = result
    result = result.replace(pattern, replacer as any)
    if (result !== before) changes++
  }
  return { result, changes }
}

function addConjunctionStarts(text: string): { result: string; changes: number } {
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

function varySentenceOpenings(text: string): { result: string; changes: number } {
  const lines = text.split('\n')
  let changes = 0
  const intros = ['In practice,', 'Notably,', 'Specifically,', 'In many cases,', 'Typically,', 'Fundamentally,']
  for (let i = 0; i < lines.length; i++) {
    if (isInCodeBlock(lines, i)) continue
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    if (trimmed.match(/^(The |This |It |We |They |There )/) && trimmed.length > 50 && changes < 5) {
      if (Math.random() < 0.3) {
        const intro = intros[Math.floor(Math.random() * intros.length)]
        lines[i] = intro + ' ' + trimmed[0].toLowerCase() + trimmed.slice(1)
        changes++
      }
    }
  }
  return { result: lines.join('\n'), changes }
}

function fabricateText(content: string, profile: VoiceProfile): {
  transformed: string
  summary: { sentencesRestructured: number; transitionsAdded: number; contractionsApplied: number; passiveToActive: number; conjunctionSoftened: number; pacingAdjusted: number; vocabularyDiversified: number; hedgePhrasesInjected: number; conjunctionStartsAdded: number; sentenceOpeningsVaried: number }
} {
  let text = content
  const changes = { conj: 0, passive: 0, cont: 0, trans: 0, pace: 0, vocab: 0, hedge: 0, conjStart: 0, sentStart: 0 }

  if (profile.conjunctionSoftening) { const t = softenConjunctions(text); text = t.result; changes.conj = t.changes }
  if (profile.passiveToActive) { const t = passiveToActive(text); text = t.result; changes.passive = t.changes }
  const t3 = applyContractions(text, profile); text = t3.result; changes.cont = t3.changes
  if (profile.repetitivePhrases) { const t = removeRepetitivePhrases(text); text = t.result }
  if (profile.transitions) { const t = addTransitions(text); text = t.result; changes.trans = t.changes }
  if (profile.pacing) { const t = adjustPacing(text); text = t.result; changes.pace = t.changes }
  if (profile.vocabularyDiversity) { const t = diversifyVocabulary(text); text = t.result; changes.vocab = t.changes }
  if (profile.hedgePhrases) { const t = hedgeAbsoluteStatements(text); text = t.result; changes.hedge = t.changes }
  if (profile.conjunctionStarts) { const t = addConjunctionStarts(text); text = t.result; changes.conjStart = t.changes }
  if (profile.sentenceVariety) { const t = varySentenceOpenings(text); text = t.result; changes.sentStart = t.changes }

  return {
    transformed: text,
    summary: {
      sentencesRestructured: changes.conj,
      transitionsAdded: changes.trans,
      contractionsApplied: changes.cont,
      passiveToActive: changes.passive,
      conjunctionSoftened: changes.conj,
      pacingAdjusted: changes.pace,
      vocabularyDiversified: changes.vocab,
      hedgePhrasesInjected: changes.hedge,
      conjunctionStartsAdded: changes.conjStart,
      sentenceOpeningsVaried: changes.sentStart
    }
  }
}


function extractLinks(content: string): LinkRef[] {
  const links: LinkRef[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2].trim()
    if (url.startsWith('mailto:')) continue
    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)(\?|#|$)/i.test(url)) {
      links.push({ text: match[1].trim(), url, type: 'image', fileName: null })
    } else {
      const isInternal = url.startsWith('#') || (!url.startsWith('http') && !url.startsWith('//'))
      let fileName: string | null = null
      if (isInternal && !url.startsWith('#')) {
        const baseName = path.basename(url, '.md')
        if (baseName && baseName !== url) fileName = baseName
      }
      links.push({ text: match[1].trim(), url, type: isInternal ? 'internal' : 'external', fileName })
    }
  }
  return links
}

function extractImages(content: string): ImageRef[] {
  const images: ImageRef[] = []
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[2].trim()
    let type: 'local' | 'remote' | 'bucket'
    let bucketName: string | null = null
    let exists: boolean | null = null
    if (url.startsWith('http') || url.startsWith('//')) {
      type = 'remote'
    } else if (url.startsWith('s3://') || url.startsWith('gs://') || url.startsWith('r2://')) {
      type = 'bucket'
      bucketName = url.split('://')[0]
    } else {
      type = 'local'
      const fullPath = path.isAbsolute(url) ? url : path.resolve(url)
      exists = fs.existsSync(fullPath)
    }
    images.push({ alt: match[1].trim(), url, type, bucketName, exists })
  }
  return images
}

function scanMarkdownFiles(dir: string): { files: string[]; errors: string[] } {
  const files: string[] = [], errors: string[] = []
  function walk(dir: string): void {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
    catch { errors.push(`permission_denied: ${dir}`); return }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      try {
        if (entry.isDirectory()) walk(fullPath)
        else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath)
      } catch { errors.push(`access_error: ${fullPath}`) }
    }
  }
  try { walk(dir) } catch { errors.push('scan_error') }
  return { files, errors }
}

interface GraphFileResult {
  file: string
  fileName: string
  links: LinkRef[]
  images: ImageRef[]
  metadata: Record<string, string> | null
}

function analyzeGraphFile(filePath: string): GraphFileResult {
  let content: string
  try { content = fs.readFileSync(filePath, 'utf-8') }
  catch { return { file: filePath, fileName: path.basename(filePath, '.md'), links: [], images: [], metadata: null } }
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const fmMatch = content.match(frontmatterRegex)
  let metadata: Record<string, string> | null = null
  let body = content
  if (fmMatch) {
    metadata = {}
    fmMatch[1].split('\n').forEach(line => {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) metadata![line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim()
    })
    body = content.substring(fmMatch[0].length)
  }
  return { file: filePath, fileName: path.basename(filePath, '.md'), links: extractLinks(body), images: extractImages(body), metadata }
}

function buildGraph(results: GraphFileResult[]): Graph {
  const nodes: Record<string, GraphNode> = {}
  const edges: { source: string; target: string; type: string }[] = []
  for (const doc of results) {
    const source = doc.fileName
    if (!nodes[source]) nodes[source] = { inbound: [], outbound: [], images: [] }
    for (const link of doc.links) {
      if (link.type === 'internal' && link.fileName) {
        const target = link.fileName
        if (!nodes[target]) nodes[target] = { inbound: [], outbound: [], images: [] }
        if (!nodes[source].outbound.includes(target)) nodes[source].outbound.push(target)
        if (!nodes[target].inbound.includes(source)) nodes[target].inbound.push(source)
        edges.push({ source, target, type: 'link' })
      }
    }
    nodes[source].images = doc.images
    for (const img of doc.images) {
      if (img.type === 'local' && img.exists === false) {
        edges.push({ source, target: img.url, type: 'broken_image' })
      }
    }
  }
  return { nodes, edges }
}

function findOrphans(graph: Graph): string[] {
  return Object.keys(graph.nodes).filter(n => graph.nodes[n].inbound.length === 0 && graph.nodes[n].outbound.length === 0)
}

function findBacklinks(results: GraphFileResult[], targetFileName: string): GraphFileResult[] {
  return results.filter(doc => doc.links.some(l => l.type === 'internal' && l.fileName === targetFileName))
}

function buildImageMap(results: GraphFileResult[]): ImageMap {
  const images: { local: ImageRef[]; remote: ImageRef[]; bucket: ImageRef[]; broken: ImageRef[] } = { local: [], remote: [], bucket: [], broken: [] }
  for (const doc of results) {
    for (const img of doc.images) {
      images[img.type].push(img)
      if (img.type === 'local' && img.exists === false) images.broken.push(img)
    }
  }
  return images
}


function loadSession(): SessionStats {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) }
  catch { return { sessionId: `session-${Date.now()}`, calls: 0, totalTokens: 0, filesProcessed: 0, startTime: new Date().toISOString() } }
}

function saveSession(session: SessionStats): void { fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2)) }

function getTokenBudgetReport(session: SessionStats, budget: number): object {
  const remaining = budget - session.totalTokens
  const percentUsed = Math.round((session.totalTokens / budget) * 100)
  return { sessionId: session.sessionId, totalCalls: session.calls, totalTokens: session.totalTokens, budget, remaining,
    percentUsed: percentUsed + '%', status: percentUsed >= 100 ? 'EXCEEDED' : percentUsed >= 80 ? 'WARNING' : 'OK' }
}

function writeRunLog(log: RunLog): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const logFile = path.join(LOG_DIR, `${log.sessionId}.json`)
    const existing: RunLog[] = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : []
    existing.push(log)
    fs.writeFileSync(logFile, JSON.stringify(existing, null, 2))
  } catch {}
}

function countTokens(text: string): number {
  try { return encodingForModel('gpt-4').encode(text).length }
  catch { return Math.ceil(text.length / 4) }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nlp = require('compromise')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const datePlugin = require('compromise-dates')
nlp.plugin(datePlugin)

function toLocalDateString(d: Date, timeZone?: string | null): string {
  if (timeZone) {
    return d.toLocaleDateString('en-CA', { timeZone })
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseNaturalDate(value: string, timeZone?: string | null): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  try {
    const result = nlp(value).dates().get(0)
    if (result && result.start) {
      const d = new Date(result.start)
      if (!isNaN(d.getTime())) return toLocalDateString(d, timeZone)
    }
  } catch {}
  try {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return toLocalDateString(d, timeZone)
  } catch {}
  return null
}

function parseFragment(content: string): { metadata: FragmentMetadata | null; content: string; raw: string } {
  const fm = extractFrontmatter(content)
  if (!fm.metadata) return { metadata: null, content: fm.content, raw: '' }
  const parsed = yaml.load(fm.raw.replace(/^---\s*\n/, '').replace(/\n---\s*$/, '')) as Record<string, any>
  if (!parsed || typeof parsed !== 'object') return { metadata: null, content: fm.content, raw: '' }
  const dependsRaw = parsed.depends_on
  const depends: string[] = Array.isArray(dependsRaw) ? dependsRaw.map(String) : (typeof dependsRaw === 'string' ? [dependsRaw] : [])
  return {
    metadata: {
      title: String(parsed.title || ''),
      author: parsed.author ? String(parsed.author) : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : (typeof parsed.tags === 'string' ? [parsed.tags] : []),
      depends_on: depends,
      order: parsed.order != null ? Number(parsed.order) : null,
      status: parsed.status ? String(parsed.status) : null,
      source: parsed.source ? String(parsed.source) : null,
      date_iso: parsed.date ? parseNaturalDate(String(parsed.date), TIMEZONE) : (parsed.published ? parseNaturalDate(String(parsed.published), TIMEZONE) : null),
      description: parsed.description ? String(parsed.description) : null,
    },
    content: fm.content,
    raw: fm.raw
  }
}

function gatherFragments(dir: string): Fragment[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name)
    .filter(f => f !== 'index.md' && f !== 'log.md' && f !== 'README.md')
    .sort()
  const fragments: Fragment[] = []
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const rawContent = fs.readFileSync(fullPath, 'utf-8')
    const { metadata, content, raw } = parseFragment(rawContent)
    fragments.push({
      file: fullPath,
      fileName: file.replace(/\.md$/, ''),
      metadata: metadata || { title: file.replace(/\.md$/, ''), author: null, tags: [], depends_on: [], order: null, status: null, source: null, date_iso: null, description: null },
      content: metadata ? content : rawContent,
      raw,
    })
  }
  return fragments
}

function buildDepGraph(fragments: Fragment[]): DepGraph<Fragment> {
  const graph = new DepGraph<Fragment>()
  for (const f of fragments) {
    graph.addNode(f.fileName, f)
  }
  for (const f of fragments) {
    for (const dep of f.metadata.depends_on) {
      const depName = dep.replace(/\.md$/, '')
      if (graph.hasNode(depName)) {
        graph.addDependency(f.fileName, depName)
      } else {
        console.warn(`Warning: '${f.fileName}' depends on '${depName}' but no fragment named '${depName}.md' was found`)
      }
    }
  }
  return graph
}

function computeDagLevels(graph: DepGraph<Fragment>): Map<string, number> {
  const levels = new Map<string, number>()
  const order = graph.overallOrder()
  for (const name of order) {
    const deps = graph.dependenciesOf(name)
    if (deps.length === 0) { levels.set(name, 0) }
    else {
      let maxDep = 0
      for (const d of deps) { const dl = levels.get(d) || 0; if (dl > maxDep) maxDep = dl }
      levels.set(name, maxDep + 1)
    }
  }
  return levels
}

function splitTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>): Fragment[][] {
  const levels = computeDagLevels(graph)
  const ordered = order.map(name => fragments.find(f => f.fileName === name)!).filter(Boolean)
  const maxLevel = Math.max(...ordered.map(f => levels.get(f.fileName) || 0), 0)
  const parts: Fragment[][] = [[], [], []]
  if (maxLevel === 0) { parts[0] = ordered; return parts }
  const cut1 = Math.ceil(maxLevel / 3)
  const cut2 = Math.ceil((maxLevel * 2) / 3)
  for (const f of ordered) {
    const lv = levels.get(f.fileName) || 0
    if (lv <= cut1) parts[0].push(f)
    else if (lv <= cut2) parts[1].push(f)
    else parts[2].push(f)
  }
  return parts
}

function generateToc(content: string): string[] {
  const toc: string[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const indent = '  '.repeat(level - 1)
    toc.push(`${indent}- ${text}`)
  }
  return toc
}

function collectReferences(fragments: Fragment[]): string[] {
  const seen = new Set<string>()
  const refs: string[] = []
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  for (const f of fragments) {
    let m: RegExpExecArray | null
    while ((m = wikiRegex.exec(f.content)) !== null) {
      const target = m[1].trim()
      if (!seen.has(target)) { seen.add(target); refs.push(`- [[${target}]]`) }
    }
    while ((m = urlRegex.exec(f.content)) !== null) {
      const text = m[1].trim()
      const url = m[2].trim()
      if (!url.startsWith('#') && !seen.has(url)) { seen.add(url); refs.push(`- [${text}](${url})`) }
    }
  }
  return refs
}

const COMMON_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any',
  'no', 'not', 'only', 'very', 'just', 'so', 'too', 'also', 'than',
  'then', 'now', 'here', 'there', 'about', 'into', 'over', 'such',
  'way', 'use', 'used', 'using', 'make', 'made', 'making', 'get', 'got',
  'one', 'two', 'like', 'well', 'back', 'even', 'still', 'much', 'yet',
  '---', 'source',
])

function extractTags(body: string, existingTags: string[]): string[] {
  const tagSet = new Set<string>()
  for (const t of existingTags) {
    tagSet.add(t.toLowerCase().trim())
  }

  try {
    const doc = nlp(body)
    const phrases = doc.match('#Noun+').out('array') as string[]
    for (const phrase of phrases) {
      const words = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean)
      const cleaned = words.filter(w => w.length > 2 && !COMMON_STOP.has(w))
      if (cleaned.length > 0) {
        tagSet.add(cleaned.join('-'))
      }
      for (const w of cleaned) {
        if (w.length > 2) tagSet.add(w)
      }
    }
  } catch {}

  const sorted = [...tagSet].sort((a, b) => {
    const aInExisting = existingTags.some(t => t.toLowerCase() === a)
    const bInExisting = existingTags.some(t => t.toLowerCase() === b)
    if (aInExisting && !bInExisting) return -1
    if (!aInExisting && bInExisting) return 1
    return a.length - b.length
  })

  return sorted.slice(0, 15)
}

function extractDescription(content: string): string {
  const noHeadings = content.replace(/^#{1,6}\s+.*$/gm, '').trim()
  const plain = noHeadings.replace(/[*`>[\]]/g, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  const sentenceMatch = plain.match(/^.*?[.!?](?:\s|$)/)
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : plain.slice(0, 200)
  const limit = 155
  if (firstSentence.length <= limit) return firstSentence
  const breakAt = firstSentence.lastIndexOf(' ', limit - 3)
  return (breakAt > 0 ? firstSentence.slice(0, breakAt) : firstSentence.slice(0, limit - 3)) + '...'
}

function generateAssembledFrontmatter(fragments: Fragment[], assembledBody: string): string {
  const cleanBody = assembledBody.replace(/^>.*$/gm, '').replace(/^---\s*$/gm, '').replace(/^## .*$/gm, '').trim()
  const root = fragments.find(f => f.metadata.depends_on.length === 0) || fragments[0]
  const title = root?.metadata.title || 'Untitled'

  const allTags: string[] = []
  let earliestDate: string | null = null
  const origins = new Set<string>()
  let author: string | null = null
  for (const f of fragments) {
    if (f.metadata.tags) allTags.push(...f.metadata.tags)
    if (f.metadata.date_iso && (!earliestDate || f.metadata.date_iso < earliestDate)) {
      earliestDate = f.metadata.date_iso
    }
    if (f.metadata.source) origins.add(f.metadata.source)
    if (f.metadata.author && !author) author = f.metadata.author
  }

  const tags = extractTags(cleanBody, allTags)
  const description = root?.metadata.description || extractDescription(root?.content || cleanBody)

  const fm: Record<string, any> = { title, description, tags, sources: fragments.length }
  if (earliestDate) fm.published = earliestDate
  if (author) fm.author = author
  if (origins.size > 0) fm.origin = [...origins]

  return '---\n' + yaml.dump(fm).trim() + '\n---\n\n'
}

function anchorName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function rewireWikilinks(content: string, fragments: Fragment[]): string {
  const known = new Set(fragments.map(f => f.fileName))
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, display?: string) => {
    const slug = anchorName(target)
    const text = (display || target).trim()
    if (known.has(target.toLowerCase())) {
      return `[${text}](#${slug})`
    }
    return `[${text}](#${slug})`
  })
}

function assembleFragments(fragments: Fragment[], order: string[]): { content: string; actualOrder: string[] } {
  const sorted = order.map(name => fragments.find(f => f.fileName === name)!).filter(Boolean)
  sorted.sort((a, b) => {
    if (a.metadata.date_iso && b.metadata.date_iso) return a.metadata.date_iso.localeCompare(b.metadata.date_iso)
    if (a.metadata.date_iso) return -1
    if (b.metadata.date_iso) return 1
    return 0
  })
  const actualOrder = sorted.map(f => f.fileName)
  const bodies = sorted.map(f => rewireWikilinks(f.content, sorted))
  const toc = generateToc(bodies.join('\n\n'))
  const refs = collectReferences(sorted)

  let output = ''
  let first = true
  for (let i = 0; i < sorted.length; i++) {
    if (!first) output += '\n\n---\n\n'
    first = false
    const frag = sorted[i]
    const label = frag.metadata.title || frag.fileName
    const anchor = anchorName(frag.fileName)
    output += `<a name="${anchor}"></a>\n\n> **Source:** ${label}\n\n`
    output += bodies[i].trim()
  }

  if (toc.length > 0) {
    const tocBlock = toc.join('\n')
    output = `## Contents\n\n${tocBlock}\n\n---\n\n${output}`
  }

  if (refs.length > 0) {
    output += `\n\n---\n\n## References\n\n${refs.join('\n')}`
  }

  const frontmatter = generateAssembledFrontmatter(fragments, output)
  return { content: frontmatter + output, actualOrder }
}

function enhanceTrilogy(parts: Fragment[][], labels: string[], filenames: string[], contents: string[]): string[] {
  const seriesTitle = parts.reduce((best, p) => {
    for (const f of p) { if (f.metadata.title && f.metadata.depends_on.length === 0) return f.metadata.title }
    return best
  }, 'Untitled Series')
  const enhanced: string[] = []
  for (let i = 0; i < 3; i++) {
    if (!contents[i]) { enhanced.push(''); continue }
    let body = contents[i]
    const prevLabel = i > 0 ? labels[i - 1] : null
    const nextLabel = i < 2 ? labels[i + 1] : null
    const prevFile = i > 0 ? filenames[i - 1] : null
    const nextFile = i < 2 ? filenames[i + 1] : null
    if (prevFile) { body = '<div class="nav-prev">\u2190 <a href="./' + prevFile + '">Back to ' + prevLabel + '</a></div>\n\n' + body }
    if (nextFile) { body = body + '\n\n---\n\n<div class="nav-next"><a href="./' + nextFile + '">Continue to ' + nextLabel + '</a> \u2192</div>' }
    const seriesFm = 'series: ' + seriesTitle + '\npart: ' + (i + 1) + '\npart_label: ' + labels[i] + '\n'
    const fmEnd = body.indexOf('\n---\n\n')
    if (fmEnd > 0) { body = body.slice(0, fmEnd + 1) + seriesFm + body.slice(fmEnd + 1) }
    enhanced.push(body)
  }
  const combinedToc = parts.map((p, idx) => {
    if (p.length === 0) return ''
    const headings = p.map(f => '  - [' + (f.metadata.title || f.fileName) + '](#' + anchorName(f.fileName) + ')').join('\n')
    return '- **' + labels[idx] + '**\n' + headings
  }).filter(Boolean).join('\n')
  if (combinedToc && enhanced[0]) {
    const tocBlock = '> **Series:** ' + seriesTitle + '\n>\n> 1. [' + labels[0] + '](./' + filenames[0] + ')\n> 2. [' + labels[1] + '](./' + filenames[1] + ')\n> 3. [' + labels[2] + '](./' + filenames[2] + ')\n\n## Series Contents\n\n' + combinedToc + '\n\n---\n\n'
    enhanced[0] = tocBlock + enhanced[0]
  }
  return enhanced
}

function assembleTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>, targetDir: string, hasExplicitVoice: boolean, profile: any, jsonOnly: boolean, dryRun: boolean, enhanceMode: boolean): boolean {
  const parts = splitTrilogy(fragments, order, graph)
  const labels = ['Introduction', 'Body', 'Conclusion']
  const filenames = ['part-1-intro.md', 'part-2-body.md', 'part-3-conclusion.md']
  const outDir = path.join(targetDir, '..', 'output')
  if (!dryRun && !fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const contents: string[] = []
  const changes: number[] = []
  for (let i = 0; i < 3; i++) {
    if (parts[i].length === 0) { contents.push(''); changes.push(0); continue }
    const { content: assembledContent } = assembleFragments(parts[i], order.filter(n => parts[i].some(f => f.fileName === n)))
    let finalContent = assembledContent
    let totalChanges = 0
    if (hasExplicitVoice) {
      const r = fabricateText(assembledContent, profile)
      finalContent = r.transformed
      totalChanges = r.summary.sentencesRestructured + r.summary.transitionsAdded + r.summary.contractionsApplied + r.summary.passiveToActive + r.summary.conjunctionSoftened + r.summary.pacingAdjusted + r.summary.vocabularyDiversified + r.summary.hedgePhrasesInjected + r.summary.conjunctionStartsAdded + r.summary.sentenceOpeningsVaried
    }
    contents.push(finalContent)
    changes.push(totalChanges)
  }
  const enhanced = enhanceMode ? enhanceTrilogy(parts, labels, filenames, contents) : contents
  for (let i = 0; i < 3; i++) {
    if (!enhanced[i]) continue
    if (dryRun) {
      if (jsonOnly) {
        console.log(JSON.stringify({ part: i + 1, label: labels[i], fragments: parts[i].length, order: parts[i].map(f => f.fileName), content: enhanced[i], voice: hasExplicitVoice ? 'enabled' : 'none', totalChanges: changes[i], enhance: enhanceMode }, null, 2))
      } else {
        console.log('\n=== Trilogy Part ' + (i + 1) + ': ' + labels[i] + ' ===')
        console.log('Fragments: ' + parts[i].map(f => f.fileName).join(', '))
        console.log('Voice: ' + (hasExplicitVoice ? 'enabled (' + changes[i] + ' changes)' : 'none') + (enhanceMode ? ', Enhanced' : ''))
        console.log('\n' + enhanced[i].slice(0, 2000) + (enhanced[i].length > 2000 ? '\n... [truncated]' : ''))
      }
    } else {
      const outPath = path.join(outDir, filenames[i])
      fs.writeFileSync(outPath, enhanced[i], 'utf-8')
      if (jsonOnly) {
        console.log(JSON.stringify({ part: i + 1, label: labels[i], fragments: parts[i].length, output: outPath, totalChanges: changes[i], enhance: enhanceMode }, null, 2))
      } else {
        console.log('  ' + filenames[i] + ' (' + parts[i].length + ' fragments' + (hasExplicitVoice ? ', ' + changes[i] + ' changes' : '') + (enhanceMode ? ', enhanced' : '') + ')')
      }
    }
  }
  return true
}

interface LintEntry {
  file: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

function extractFirstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function extractWikilinkRefs(content: string): string[] {
  const refs: string[] = []
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let m: RegExpExecArray | null
  while ((m = wikiRegex.exec(content)) !== null) {
    refs.push(m[1].trim())
  }
  return refs
}

function editDocs(dir: string): { changed: number; errors: string[] } {
  const errors: string[] = []
  let changed = 0
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
  catch { errors.push('Cannot read directory: ' + dir); return { changed, errors } }
  const entryNames = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name)
  for (const name of entryNames) {
    if (name === 'index.md' || name === 'log.md' || name === 'README.md') continue
    const fullPath = path.join(dir, name)
    let content: string
    try { content = fs.readFileSync(fullPath, 'utf-8') } catch { errors.push('Cannot read: ' + name); continue }
    const fm = extractFrontmatter(content)
    if (fm.metadata) continue
    const title = extractFirstHeading(content) || name.replace(/\.md$/, '')
    const wikiRefs = extractWikilinkRefs(content)
    const depends = wikiRefs.map(r => r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md').filter(r => entryNames.includes(r))
    let tags: string[] = []
    try {
      const doc = nlp(content)
      const phrases = doc.match('#Noun+').out('array') as string[]
      const tagSet = new Set<string>()
      for (const phrase of phrases) {
        const words = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean)
        const trimmed = words.map(w => w.replace(/^-+|-+$/g, '')).filter(Boolean)
        const cleaned = trimmed.filter(w => w.length > 3 && !COMMON_STOP.has(w))
        for (const w of cleaned) { if (w.length > 3) tagSet.add(w) }
        if (cleaned.length > 0) tagSet.add(cleaned.join('-'))
      }
      tags = [...tagSet].slice(0, 8)
    } catch {}
    const description = extractDescription(content)
    const fmObj: Record<string, any> = { title, description, tags: tags.length > 0 ? tags : [], depends_on: depends.length > 0 ? depends : [], source: name }
    const fmYaml = yaml.dump(fmObj)
    fs.writeFileSync(fullPath, '---\n' + fmYaml + '---\n\n' + content, 'utf-8')
    changed++
  }
  return { changed, errors }
}

function updateIndex(dir: string): string | null {
  const fragments = gatherFragments(dir)
  if (fragments.length === 0) return null
  const lines: string[] = []
  const dateStr = toLocalDateString(new Date(), TIMEZONE)
  lines.push('---', 'title: Page Catalog', 'description: Auto-generated fragment index', 'generated: ' + dateStr, 'fragments: ' + fragments.length, '---', '')
  lines.push('# Page Catalog', '')
  lines.push('Auto-generated on ' + dateStr + '. ' + fragments.length + ' fragment(s).', '')
  const tagGroups = new Map<string, Fragment[]>()
  const untagged: Fragment[] = []
  for (const f of fragments) {
    const ft = f.metadata.tags
    if (ft.length > 0) { for (const t of ft) { if (!tagGroups.has(t)) tagGroups.set(t, []); tagGroups.get(t)!.push(f) } }
    else { untagged.push(f) }
  }
  for (const [tag, frags] of tagGroups) {
    lines.push('## ' + tag.charAt(0).toUpperCase() + tag.slice(1))
    for (const f of frags) lines.push('- [[' + f.fileName + ']] \u2014 ' + extractDescription(f.content))
    lines.push('')
  }
  if (untagged.length > 0) {
    lines.push('## Uncategorized')
    for (const f of untagged) lines.push('- [[' + f.fileName + ']] \u2014 ' + extractDescription(f.content))
    lines.push('')
  }
  const indexPath = path.join(dir, 'index.md')
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
  return indexPath
}

function updateLog(dir: string, action: string, description: string): string {
  const logPath = path.join(dir, 'log.md')
  const timestamp = toLocalDateString(new Date(), TIMEZONE)
  const entry = '## [' + timestamp + '] ' + action + ' | ' + description + '\n'
  let logContent: string
  if (fs.existsSync(logPath)) {
    logContent = fs.readFileSync(logPath, 'utf-8')
    if (!logContent.endsWith('\n')) logContent += '\n'
  } else {
    logContent = '# Activity Log\n\n'
  }
  logContent += entry
  fs.writeFileSync(logPath, logContent, 'utf-8')
  return logPath
}

function linkUp(dir: string): { linksRewired: number; headingsDeduped: number; filesChanged: number; depsAutoWired: number } {
  const fragments = gatherFragments(dir)
  const fragNames = new Set(fragments.map(f => f.fileName))
  let linksRewired = 0
  let headingsDeduped = 0
  let filesChanged = 0
  let depsAutoWired = 0
  const headingCounts = new Map<string, number>()
  for (const f of fragments) {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    let m: RegExpExecArray | null
    while ((m = headingRegex.exec(f.content)) !== null) {
      const text = m[2].trim().toLowerCase()
      headingCounts.set(text, (headingCounts.get(text) || 0) + 1)
    }
  }
  const headerCountsGlobal = new Map<string, number>()
  for (const f of fragments) {
    let newContent = f.content
    let changed = false
    const wikiRefs = extractWikilinkRefs(f.content)
    for (const ref of wikiRefs) {
      const slug = ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (slug !== f.fileName && fragNames.has(slug) && !f.metadata.depends_on.includes(slug)) {
        f.metadata.depends_on.push(slug)
        depsAutoWired++
        changed = true
      }
    }
    newContent = newContent.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match: string, target: string, display?: string) => {
      linksRewired++
      const slug = anchorName(target)
      return '[' + (display || target).trim() + '](#' + slug + ')'
    })
    if (newContent !== f.content) changed = true
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    newContent = newContent.replace(headingRegex, (match: string, level: string, text: string) => {
      const trimmed = text.trim()
      const key = trimmed.toLowerCase()
      if ((headingCounts.get(key) || 0) > 1) {
        const count = (headerCountsGlobal.get(key) || 0) + 1
        headerCountsGlobal.set(key, count)
        headingsDeduped++
        changed = true
        return level + ' ' + trimmed + ' (' + String.fromCharCode(64 + count) + ')'
      }
      return match
    })
    if (changed) {
      const fmObj: Record<string, any> = { title: f.metadata.title, tags: f.metadata.tags, depends_on: f.metadata.depends_on }
      if (f.metadata.description) fmObj.description = f.metadata.description
      if (f.metadata.order != null) fmObj.order = f.metadata.order
      if (f.metadata.status) fmObj.status = f.metadata.status
      if (f.metadata.source) fmObj.source = f.metadata.source
      const fmYaml = yaml.dump(fmObj)
      fs.writeFileSync(f.file, '---\n' + fmYaml + '---\n\n' + newContent, 'utf-8')
      filesChanged++
    }
  }
  return { linksRewired, headingsDeduped, filesChanged, depsAutoWired }
}

function getPositionalArg(start: number): string {
  for (let i = start; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('-')) return process.argv[i]
  }
  return ''
}

function getPositionalArgs(start: number): string[] {
  const out: string[] = []
  for (let i = start; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('-')) out.push(process.argv[i])
  }
  return out
}

function getFlagArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx > 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

function stripFrontmatter(content: string): string {
  const m = content.match(/^---\n[\s\S]*?\n---\n\n?/)
  return m ? content.slice(m[0].length) : content
}

function ingest(rawFile: string, targetDir: string): { fragment: string; index: string; log: string } | null {
  let content: string
  try { content = fs.readFileSync(rawFile, 'utf-8') } catch { return null }
  const body = stripFrontmatter(content)
  const title = extractFirstHeading(body) || path.basename(rawFile, '.md')
  const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md'
  const fragPath = path.join(targetDir, fileName)
  let tags: string[] = []
    try {
      const doc = nlp(body)
      const phrases = doc.match('#Noun+').out('array') as string[]
      const tagSet = new Set<string>()
      for (const phrase of phrases) {
        const words = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean)
        const trimmed = words.map(w => w.replace(/^-+|-+$/g, '')).filter(Boolean)
        const cleaned = trimmed.filter(w => w.length > 3 && !COMMON_STOP.has(w))
        for (const w of cleaned) { if (w.length > 3) tagSet.add(w) }
        if (cleaned.length > 0) tagSet.add(cleaned.join('-'))
      }
      tags = [...tagSet].slice(0, 8)
    } catch {}
  const description = extractDescription(body)
  const fmObj: Record<string, any> = { title, description, tags, depends_on: [], source: path.basename(rawFile), status: 'draft' }
  const fmYaml = yaml.dump(fmObj)
  fs.writeFileSync(fragPath, '---\n' + fmYaml + '---\n\n' + body, 'utf-8')
  const indexPath = updateIndex(targetDir)
  const logPath = updateLog(targetDir, 'ingest', title)
  return { fragment: fragPath, index: indexPath || '', log: logPath }
}

function lintDirectory(dir: string): { entries: LintEntry[]; errors: number; warnings: number; infos: number } {
  const entries: LintEntry[] = []
  const { files: mdFiles, errors: scanErrors } = scanMarkdownFiles(dir)
  for (const err of scanErrors) entries.push({ file: '', severity: 'error', message: err })

  const fragments = gatherFragments(dir)
  const filenames = new Set(fragments.map(f => f.fileName))

  for (const frag of fragments) {
    if (!frag.raw) {
      entries.push({ file: frag.fileName, severity: 'warning', message: 'Missing YAML frontmatter' })
    } else {
      if (!frag.metadata.title) entries.push({ file: frag.fileName, severity: 'warning', message: 'Empty or missing title' })
      if (!frag.metadata.source) entries.push({ file: frag.fileName, severity: 'info', message: 'No source field — consider adding the original document path' })
      if (frag.metadata.date_iso === null && frag.raw.includes('date:')) {
        entries.push({ file: frag.fileName, severity: 'warning', message: 'Unparseable date value' })
      }
    }

    const contentLinks = extractLinks(frag.content)
    for (const link of contentLinks) {
      if (link.type === 'internal' && link.fileName && !filenames.has(link.fileName)) {
        entries.push({ file: frag.fileName, severity: 'warning', message: `Broken internal link: '${link.text}' → ${link.url} (target not found)` })
      }
    }

    const wikiRefs: string[] = []
    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
    let m: RegExpExecArray | null
    while ((m = wikiRegex.exec(frag.content)) !== null) {
      wikiRefs.push(m[1].trim())
    }
    for (const target of wikiRefs) {
      if (!filenames.has(target.toLowerCase())) {
        entries.push({ file: frag.fileName, severity: 'warning', message: `Broken [[wikilink]]: '${target}' (target fragment not found)` })
      }
    }

    for (const dep of frag.metadata.depends_on) {
      const depName = dep.replace(/\.md$/, '')
      if (!filenames.has(depName)) {
        entries.push({ file: frag.fileName, severity: 'error', message: `depends_on references '${depName}' but no fragment named '${depName}.md' was found` })
      }
    }
  }

  if (fragments.length > 0) {
    const depGraph = buildDepGraph(fragments)
    try {
      depGraph.overallOrder()
    } catch {
      entries.push({ file: '', severity: 'error', message: 'Cycle detected in dependency graph' })
    }

    for (const f of fragments) {
      const hasInboundDep = fragments.some(x =>
        x.metadata.depends_on.some(d => d.replace(/\.md$/, '') === f.fileName)
      )
      const hasWikilinkRef = fragments.some(x =>
        [...x.content.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].some(m => m[1].trim() === f.fileName)
      )
      if (f.metadata.depends_on.length === 0 && !hasInboundDep && !hasWikilinkRef) {
        entries.push({ file: f.fileName, severity: 'info', message: 'Orphan fragment: no dependencies and no inbound references' })
      }
    }
  }

  const errors = entries.filter(e => e.severity === 'error').length
  const warnings = entries.filter(e => e.severity === 'warning').length
  const infos = entries.filter(e => e.severity === 'info').length
  return { entries, errors, warnings, infos }
}

function showHelp(): void {
  console.log(`md-fabrication - Humanize LLM-generated markdown with vocabulary diversity, hedging, varied sentence openings, and natural conjunction starts

Usage: md-fabrication <file.md> [options]
       md-fabrication --graph <directory> [options]
       md-fabrication --orphans <directory> [options]
       md-fabrication --backlinks <target> <directory> [options]
       md-fabrication --image-map <directory> [options]
       md-fabrication --assemble <directory> [options]
       md-fabrication --lint <directory> [options]

Fabrication options:
  --json              Output as JSON
  --apply             Write changes in-place
  --dry-run           Show diff without writing
  --voice <voice>     Target voice (see Voices section)
  --session           Token budget report
  --budget <n>        Set token budget limit

Graph options:
  --graph             Build document relationship graph
  --orphans           Find unreferenced documents
  --backlinks <doc>   Find documents referencing a specific doc
  --image-map         Map all image references (local, remote, bucket, broken)

Assemble options:
  --assemble <dir>    Compile wiki fragments into an article (DAG-based)
  --trilogy           Split assembled article into 3 parts by DAG depth
  --enhance           Add series navigation, combined TOC, part metadata (with --trilogy)
  --voice <voice>     Humanization voice for assembled output

Lint options:
  --lint <dir>        Validate wiki fragments for issues (broken links,
                      missing frontmatter, orphan fragments, cycles)

Wiki management:
  --edit-docs <dir>   Infer and prepend frontmatter for fragments missing it
  --update-index <dir> Regenerate index.md page catalog
  --update-log <dir> <action> <desc>  Append entry to log.md
  --link-up <dir>     Rewire wikilinks and deduplicate headings
  --ingest <file> --target <dir>  Ingest a raw article into the wiki

Gather options:
  --gather <dir>      Preview DAG order of fragments

  --help, -h          Show this help message

Voices (defined in config.yaml):
${getValidVoices().map(v => `  ${v.padEnd(14)}${v === loadVoiceConfig().default ? '(default)' : ''}`).join('\n')}

Examples:
  md-fabrication article.md --json
  md-fabrication article.md --apply --voice casual --json
  md-fabrication article.md --dry-run --voice professional --json
  md-fabrication article.md --session --budget 50000 --json
  md-fabrication --assemble sources/ --voice casual --dry-run --json
  md-fabrication --assemble sources/ --trilogy --dry-run --json
  md-fabrication --assemble sources/ --trilogy --apply
  md-fabrication --assemble sources/ --trilogy --enhance --dry-run --json
  md-fabrication --lint sources/ --json
  md-fabrication --edit-docs sources/
  md-fabrication --update-index sources/
  md-fabrication --update-log sources/ ingest "New Article"
  md-fabrication --link-up sources/
  md-fabrication --gather sources/
  md-fabrication --ingest raw/article.md --target sources/`)
}

function renderSummaryTable(summary: FabricationSummary): string {
  return new AsciiTable3()
    .setHeading('Transformation', 'Count')
    .addRow('Sentences Restructured', summary.sentencesRestructured)
    .addRow('Transitions Added', summary.transitionsAdded)
    .addRow('Contractions Applied', summary.contractionsApplied)
    .addRow('Passive → Active', summary.passiveToActive)
    .addRow('Conjunctions Softened', summary.conjunctionSoftened)
    .addRow('Pacing Adjusted', summary.pacingAdjusted)
    .addRow('Vocabulary Diversified', summary.vocabularyDiversified)
    .addRow('Hedge Phrases Injected', summary.hedgePhrasesInjected)
    .addRow('Conjunction Starts', summary.conjunctionStartsAdded)
    .addRow('Sentence Openings Varied', summary.sentenceOpeningsVaried)
    .toString()
}

function main(): void {
  const startTime = Date.now()
  const configPath = path.join(__dirname, 'hooks.toml')
  getTomlConfig(configPath)

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const jsonOnly = process.argv.includes('--json')
  const graphMode = process.argv.includes('--graph')
  const orphansMode = process.argv.includes('--orphans')
  const imageMapMode = process.argv.includes('--image-map')
  const backlinksIdx = process.argv.findIndex(a => a === '--backlinks')
  const backlinksTarget = backlinksIdx > 0 ? process.argv[backlinksIdx + 1] || null : null
  const isGraphMode = graphMode || orphansMode || imageMapMode || backlinksTarget

  if (isGraphMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for graph mode'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }

    const { files: mdFiles, errors: scanErrors } = scanMarkdownFiles(targetDir)
    const results = mdFiles.map(analyzeGraphFile)

    if (graphMode) {
      const graph = buildGraph(results)
      const output = { graph, stats: { totalFiles: mdFiles.length, totalNodes: Object.keys(graph.nodes).length, totalEdges: graph.edges.length, orphans: findOrphans(graph).length }, scanErrors: scanErrors.length > 0 ? scanErrors : undefined, durationMs: Date.now() - startTime }
      if (jsonOnly) console.log(JSON.stringify(output, null, 2))
      else {
        console.log('\nGraph for ' + targetDir)
        console.log('Files: ' + mdFiles.length + ', Nodes: ' + Object.keys(graph.nodes).length + ', Edges: ' + graph.edges.length + ', Orphans: ' + findOrphans(graph).length)
        graph.edges.slice(0, 20).forEach(e => console.log('  ' + e.source + ' -> ' + e.target + ' (' + e.type + ')'))
        if (graph.edges.length > 20) console.log('  ... and ' + (graph.edges.length - 20) + ' more')
      }
    } else if (orphansMode) {
      const graph = buildGraph(results)
      const orphans = findOrphans(graph)
      if (jsonOnly) console.log(JSON.stringify({ orphans, count: orphans.length, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else {
        if (orphans.length === 0) console.log('No orphan documents in ' + targetDir)
        else {
          console.log('\nOrphans (' + orphans.length + ') in ' + targetDir + ':')
          orphans.forEach(o => console.log('  ' + o))
        }
      }
    } else if (imageMapMode) {
      const imageMap = buildImageMap(results)
      if (jsonOnly) console.log(JSON.stringify({ imageMap, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else {
        console.log('\nImage map for ' + targetDir)
        console.log('  Local: ' + imageMap.local.length)
        console.log('  Remote: ' + imageMap.remote.length)
        console.log('  Bucket: ' + imageMap.bucket.length)
        console.log('  Broken: ' + imageMap.broken.length)
        if (imageMap.broken.length > 0) {
          console.log('\nBroken images:')
          imageMap.broken.forEach(i => console.log('  ' + i.url))
        }
      }
    } else if (backlinksTarget) {
      const backlinks = findBacklinks(results, backlinksTarget)
      if (jsonOnly) console.log(JSON.stringify({ target: backlinksTarget, backlinks: backlinks.map(b => ({ file: b.file, fileName: b.fileName, metadata: b.metadata })), count: backlinks.length, durationMs: Date.now() - startTime }, null, 2))
      else {
        if (backlinks.length === 0) console.log('No backlinks to "' + backlinksTarget + '" in ' + targetDir)
        else {
          console.log('\nBacklinks to "' + backlinksTarget + '" (' + backlinks.length + '):')
          backlinks.forEach(b => console.log('  ' + b.fileName))
        }
      }
    }
    return
  }

  const lintMode = process.argv.includes('--lint')
  const assembleMode = process.argv.includes('--assemble')
  const editDocsMode = process.argv.includes('--edit-docs')
  const updateIndexMode = process.argv.includes('--update-index')
  const updateLogMode = process.argv.includes('--update-log')
  const linkUpMode = process.argv.includes('--link-up')
  const gatherMode = process.argv.includes('--gather')
  const ingestMode = process.argv.includes('--ingest')

  if (lintMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --lint'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }

    const { entries, errors, warnings, infos } = lintDirectory(targetDir)

    if (jsonOnly) {
      console.log(JSON.stringify({ directory: targetDir, entries, errors, warnings, infos, durationMs: Date.now() - startTime }, null, 2))
    } else {
      console.log(`\nLint results for ${targetDir}`)
      console.log(`Files scanned: ${entries.length ? scanMarkdownFiles(targetDir).files.length : 0}`)
      console.log(`Errors: ${errors}, Warnings: ${warnings}, Info: ${infos}`)
      if (entries.length > 0) {
        console.log('')
        for (const e of entries) {
          const prefix = e.severity === 'error' ? '✖' : e.severity === 'warning' ? '⚠' : 'ℹ'
          const loc = e.file ? `${e.file}: ` : ''
          console.log(`  ${prefix} [${e.severity}] ${loc}${e.message}`)
        }
      } else {
        console.log('  No issues found.')
      }
    }
    return
  }

  if (assembleMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --assemble'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }

    const jsonOnly = process.argv.includes('--json')
    const dryRun = process.argv.includes('--dry-run')
    const applyMode = process.argv.includes('--apply')
    const voiceCfg = loadVoiceConfig()
    const voiceIdx = process.argv.findIndex(arg => arg === '--voice')
    const hasExplicitVoice = voiceIdx > 0
    const voiceArg = hasExplicitVoice ? process.argv[voiceIdx + 1] || voiceCfg.default : ''
    const voice = hasExplicitVoice && getValidVoices().includes(voiceArg) ? voiceArg : voiceCfg.default
    const profile = voiceCfg.profiles[voice] || { contractions: false, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false }

    const fragments = gatherFragments(targetDir)
    if (fragments.length === 0) { console.error('Error: no .md files found in ' + targetDir); process.exit(1) }

    const graph = buildDepGraph(fragments)
    let order: string[] = []
    try {
      order = graph.overallOrder()
    } catch (e: any) {
      console.error('Error: cycle detected in dependency graph: ' + e.message)
      process.exit(1)
    }

    const trilogyMode = process.argv.includes('--trilogy')
    if (trilogyMode) {
      if (!dryRun && !applyMode) { console.error('Error: --trilogy requires --dry-run or --apply'); process.exit(1) }
      const enhanceMode = process.argv.includes('--enhance')
      assembleTrilogy(fragments, order, graph, targetDir, hasExplicitVoice, profile, jsonOnly, dryRun, enhanceMode)
      return
    }

    const { content: assembledContent, actualOrder } = assembleFragments(fragments, order)

    let finalContent = assembledContent
    let totalChanges = 0
    if (hasExplicitVoice) {
      const r = fabricateText(assembledContent, profile)
      finalContent = r.transformed
      totalChanges = r.summary.sentencesRestructured + r.summary.transitionsAdded + r.summary.contractionsApplied + r.summary.passiveToActive + r.summary.conjunctionSoftened + r.summary.pacingAdjusted + r.summary.vocabularyDiversified + r.summary.hedgePhrasesInjected + r.summary.conjunctionStartsAdded + r.summary.sentenceOpeningsVaried
    }

    if (dryRun) {
      if (jsonOnly) {
        console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder, toc: generateToc(assembledContent), content: finalContent, voice, totalChanges }, null, 2))
      } else {
        console.log('\nAssemble dry-run for ' + targetDir)
        console.log('Fragments: ' + fragments.length + ' (' + actualOrder.join(' -> ') + ')')
        console.log('Voice: ' + voice)
        if (totalChanges > 0) console.log('Humanization changes: ' + totalChanges)
        console.log('\n--- Assembled Content ---\n')
        console.log(finalContent)
      }
    } else if (applyMode) {
      const outDir = path.join(targetDir, '..', 'output')
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const outPath = path.join(outDir, 'assembled.md')
      fs.writeFileSync(outPath, finalContent, 'utf-8')
      if (jsonOnly) {
        console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder, output: outPath, voice, totalChanges }, null, 2))
      } else {
        console.log('\nAssembled ' + fragments.length + ' fragments from ' + targetDir)
        console.log('Order: ' + actualOrder.join(' -> '))
        if (totalChanges > 0) console.log('Humanization changes: ' + totalChanges)
        console.log('Output: ' + outPath)
      }
    } else {
      if (jsonOnly) {
        console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder, voice, totalChanges }, null, 2))
      } else {
        console.log('\nAssembly analysis for ' + targetDir)
        console.log('Fragments: ' + fragments.length)
        console.log('Order: ' + actualOrder.join(' -> '))
        if (totalChanges > 0) console.log('Humanization changes: ' + totalChanges)
        else console.log('Use --voice to humanize the assembled output')
        console.log('Use --dry-run to preview or --apply to write')
      }
    }
    return
  }

  if (editDocsMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --edit-docs'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const result = editDocs(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, changed: result.changed, errors: result.errors, durationMs: Date.now() - startTime })) }
    else {
      console.log('\nEdit-docs for ' + targetDir)
      console.log('Files updated: ' + result.changed)
      if (result.errors.length > 0) result.errors.forEach(e => console.log('  Error: ' + e))
    }
    return
  }

  if (updateIndexMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --update-index'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const indexPath = updateIndex(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, index: indexPath, durationMs: Date.now() - startTime })) }
    else { if (indexPath) console.log('\nIndex updated: ' + indexPath); else console.log('\nNo fragments found in ' + targetDir) }
    return
  }

  if (updateLogMode) {
    const args: string[] = []
    for (let i = 2; i < process.argv.length; i++) {
      if (!process.argv[i].startsWith('-')) args.push(process.argv[i])
    }
    const targetDir = args[0] || ''
    const action = args[1] || ''
    const description = args.slice(2).join(' ') || ''
    if (!targetDir || !action || !description) { console.error('Error: usage: --update-log <dir> <action> <description>'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const logPath = updateLog(targetDir, action, description)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, log: logPath, action, description, durationMs: Date.now() - startTime })) }
    else { console.log('\nLog updated: ' + logPath) }
    return
  }

  if (linkUpMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --link-up'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const result = linkUp(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, linksRewired: result.linksRewired, headingsDeduped: result.headingsDeduped, depsAutoWired: result.depsAutoWired, filesChanged: result.filesChanged, durationMs: Date.now() - startTime })) }
    else {
      console.log('\nLink-up for ' + targetDir)
      const parts: string[] = ['Links rewired: ' + result.linksRewired, 'Headings deduped: ' + result.headingsDeduped, 'Deps auto-wired: ' + result.depsAutoWired, 'Files changed: ' + result.filesChanged]
      console.log(parts.join(', '))
    }
    return
  }

  if (gatherMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --gather'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const fragments = gatherFragments(targetDir)
    if (fragments.length === 0) { console.error('Error: no .md files found in ' + targetDir); process.exit(1) }
    const graph = buildDepGraph(fragments)
    let order: string[] = []
    try { order = graph.overallOrder() } catch (e: any) { console.error('Error: cycle detected: ' + e.message); process.exit(1) }
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order, durationMs: Date.now() - startTime })) }
    else {
      console.log('\nGather for ' + targetDir)
      console.log('Fragments: ' + fragments.length)
      console.log('Order: ' + order.join(' -> '))
    }
    return
  }

  if (ingestMode) {
    const args = getPositionalArgs(2)
    const rawFile = args[0] || ''
    if (!rawFile) { console.error('Error: usage: --ingest <file> --target <dir>'); process.exit(1) }
    if (!fs.existsSync(rawFile)) { console.error('Error: file not found: ' + rawFile); process.exit(4) }
    const targetDir = getFlagArg('--target') || path.join(path.dirname(rawFile), '..', 'sources')
    if (!fs.existsSync(targetDir)) { console.error('Error: target directory not found: ' + targetDir); process.exit(4) }
    const result = ingest(rawFile, targetDir)
    if (!result) { console.error('Error: failed to ingest ' + rawFile); process.exit(1) }
    if (jsonOnly) { console.log(JSON.stringify({ rawFile, fragment: result.fragment, index: result.index, log: result.log, durationMs: Date.now() - startTime })) }
    else {
      console.log('\nIngested: ' + rawFile)
      console.log('Fragment: ' + result.fragment)
      console.log('Index: ' + result.index)
      console.log('Log: ' + result.log)
    }
    return
  }

  const applyMode = process.argv.includes('--apply')
  const dryRun = process.argv.includes('--dry-run')
  const sessionMode = process.argv.includes('--session')

  const cliFile = getPositionalArg(2)

  if (!cliFile) {
    showHelp()
    process.exit(1)
  }

  const voiceCfg = loadVoiceConfig()
  const voiceIdx = process.argv.findIndex(arg => arg === '--voice')
  const voiceArg = voiceIdx > 0 ? process.argv[voiceIdx + 1] || voiceCfg.default : voiceCfg.default
  const voice = getValidVoices().includes(voiceArg) ? voiceArg : voiceCfg.default
  const profile = voiceCfg.profiles[voice] || { contractions: false, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false }

  const budgetIdx = process.argv.findIndex(arg => arg === '--budget')
  const budget = budgetIdx > 0 ? parseInt(process.argv[budgetIdx + 1] || '', 10) || 50000 : 50000

  if (!fs.existsSync(cliFile)) {
    const result: FabricationResult = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice,
      totalChanges: 0, changesApplied: false,
      summary: { sentencesRestructured: 0, transitionsAdded: 0, contractionsApplied: 0, passiveToActive: 0, conjunctionSoftened: 0, pacingAdjusted: 0, vocabularyDiversified: 0, hedgePhrasesInjected: 0, conjunctionStartsAdded: 0, sentenceOpeningsVaried: 0 },
      tokensUsed: 0, error: 'file_not_found' }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else console.error(`Error: file not found: ${cliFile}`)
    process.exit(4)
  }

  const session = loadSession()
  const fileContent = fs.readFileSync(cliFile, 'utf-8')
  const { content: markdownContent, raw } = extractFrontmatter(fileContent)
  const tokensBefore = countTokens(fileContent)

  if (sessionMode) {
    const updatedSession = { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensBefore, filesProcessed: session.filesProcessed + 1 }
    saveSession(updatedSession)
    console.log(JSON.stringify(getTokenBudgetReport(updatedSession, budget), null, 2))
    return
  }

  const { transformed, summary } = fabricateText(markdownContent, profile)
  const totalChanges = summary.sentencesRestructured + summary.transitionsAdded + summary.contractionsApplied + summary.passiveToActive + summary.conjunctionSoftened + summary.vocabularyDiversified + summary.hedgePhrasesInjected + summary.conjunctionStartsAdded + summary.sentenceOpeningsVaried
  const tokensAfter = countTokens(raw + transformed)

  if (dryRun) {
    const diffLines: string[] = []
    const origLines = markdownContent.split('\n')
    const newLines = transformed.split('\n')
    const maxLen = Math.max(origLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (origLines[i] !== newLines[i]) {
        if (origLines[i] !== undefined) diffLines.push(`- ${origLines[i]}`)
        if (newLines[i] !== undefined) diffLines.push(`+ ${newLines[i]}`)
      }
    }
    const result: FabricationResult & { diff: string[] } = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice,
      totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter, diff: diffLines.slice(0, 100) }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`\nDry-run for ${cliFile} (voice: ${voice})`)
      console.log(renderSummaryTable(summary))
      diffLines.forEach(l => {
        if (l.startsWith('- ')) console.log(`${RED}${l}${RESET}`)
        else if (l.startsWith('+ ')) console.log(`${GREEN}${l}${RESET}`)
        else console.log(l)
      })
      console.log(`\nTokens: ${tokensAfter} (tokensBefore: ${tokensBefore})`)
    }
  } else if (applyMode) {
    const newContent = raw + transformed
    fs.writeFileSync(cliFile, newContent, 'utf-8')
    const result: FabricationResult = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice,
      totalChanges, changesApplied: true, summary, tokensUsed: tokensAfter }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else { console.log(`\nFabricated ${cliFile} (voice: ${voice})`); console.log(renderSummaryTable(summary)); console.log(`${totalChanges} changes applied\nTokens: ${tokensAfter}`) }
  } else {
    const result: FabricationResult = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice,
      totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else { console.log(`\nFabrication analysis for ${cliFile} (voice: ${voice})`); console.log(renderSummaryTable(summary)); console.log(`\nTokens: ${tokensAfter}\nUse --apply to write changes or --dry-run to preview`) }
  }

  const updatedSession = { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensAfter, filesProcessed: session.filesProcessed + 1 }
  saveSession(updatedSession)

  const mode = sessionMode ? 'session' : dryRun ? 'dry-run' : applyMode ? 'apply' : 'analyze'
  writeRunLog({ timestamp: new Date().toISOString(), sessionId: updatedSession.sessionId, file: cliFile,
    voice, changes: totalChanges, changesApplied: applyMode, tokensUsed: tokensAfter, durationMs: Date.now() - startTime, mode })
}

main()
