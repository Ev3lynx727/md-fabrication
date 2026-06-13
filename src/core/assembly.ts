import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { DepGraph } from 'dependency-graph'
import { Fragment, FragmentMetadata, VoiceProfile } from './types.js'
import { extractFrontmatter } from './frontmatter.js'
import { getTimezone } from './config.js'
import { fabricateText } from '../transforms/fabricate.js'
import { COMMON_STOP, anchorName } from './helpers.js'

function toLocalDateString(d: Date, timeZone?: string | null): string {
  if (timeZone) { return d.toLocaleDateString('en-CA', { timeZone }) }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function parseNaturalDate(value: string, timeZone?: string | null): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nlp = require('compromise')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const datePlugin = require('compromise-dates')
    nlp.plugin(datePlugin)
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

export function parseFragment(content: string): { metadata: FragmentMetadata | null; content: string; raw: string } {
  const fm = extractFrontmatter(content)
  if (!fm.metadata) return { metadata: null, content: fm.content, raw: '' }
  const parsed = yaml.load(fm.raw.replace(/^---\s*\n/, '').replace(/\n---\s*$/, '')) as Record<string, any>
  if (!parsed || typeof parsed !== 'object') return { metadata: null, content: fm.content, raw: '' }
  const dependsRaw = parsed.depends_on
  const depends: string[] = Array.isArray(dependsRaw) ? dependsRaw.map(String) : (typeof dependsRaw === 'string' ? [dependsRaw] : [])
  const timezone = getTimezone()
  return {
    metadata: {
      title: String(parsed.title || ''),
      author: parsed.author ? String(parsed.author) : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : (typeof parsed.tags === 'string' ? [parsed.tags] : []),
      depends_on: depends,
      order: parsed.order != null ? Number(parsed.order) : null,
      status: parsed.status ? String(parsed.status) : null,
      source: parsed.source ? String(parsed.source) : null,
      date_iso: parsed.date ? parseNaturalDate(String(parsed.date), timezone) : (parsed.published ? parseNaturalDate(String(parsed.published), timezone) : null),
      description: parsed.description ? String(parsed.description) : null,
    },
    content: fm.content,
    raw: fm.raw
  }
}

export function gatherFragments(dir: string): Fragment[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name).filter(f => f !== 'index.md' && f !== 'log.md' && f !== 'README.md').sort()
  const fragments: Fragment[] = []
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const rawContent = fs.readFileSync(fullPath, 'utf-8')
    const r = parseFragment(rawContent)
    fragments.push({
      file: fullPath,
      fileName: file.replace(/\.md$/, ''),
      metadata: r.metadata || { title: file.replace(/\.md$/, ''), author: null, tags: [], depends_on: [], order: null, status: null, source: null, date_iso: null, description: null },
      content: r.metadata ? r.content : rawContent,
      raw: r.raw,
    })
  }
  return fragments
}

export function buildDepGraph(fragments: Fragment[]): DepGraph<Fragment> {
  const graph = new DepGraph<Fragment>()
  for (const frag of fragments) {
    graph.addNode(frag.fileName, frag)
  }
  for (const frag of fragments) {
    for (const dep of frag.metadata.depends_on) {
      const depName = dep.replace(/\.md$/, '')
      if (graph.hasNode(depName)) {
        graph.addDependency(frag.fileName, depName)
      }
    }
  }
  return graph
}

export function computeDagLevels(graph: DepGraph<Fragment>): Map<string, number> {
  const levels = new Map<string, number>()
  const order = graph.overallOrder()
  for (const node of order) {
    const deps = graph.dependenciesOf(node)
    if (deps.length === 0) {
      levels.set(node, 0)
    } else {
      let maxDepLevel = 0
      for (const dep of deps) {
        const l = levels.get(dep) ?? 0
        if (l > maxDepLevel) maxDepLevel = l
      }
      levels.set(node, maxDepLevel + 1)
    }
  }
  return levels
}

export function splitTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>): Fragment[][] {
  const levels = computeDagLevels(graph)
  const maxLevel = Math.max(...levels.values(), 0)
  const orderedFrags = order.map(name => fragments.find(f => f.fileName === name)!).filter(Boolean)
  const part1: Fragment[] = []
  const part2: Fragment[] = []
  const part3: Fragment[] = []
  for (const frag of orderedFrags) {
    const level = levels.get(frag.fileName) ?? 0
    if (level <= Math.ceil(maxLevel * 0.33)) part1.push(frag)
    else if (level <= Math.ceil(maxLevel * 0.66)) part2.push(frag)
    else part3.push(frag)
  }
  return [part1, part2, part3]
}

export function generateToc(content: string): string[] {
  const lines = content.split('\n')
  const toc: string[] = []
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      const level = m[1].length
      const text = m[2].trim()
      const indent = '  '.repeat(level - 1)
      const anchor = anchorName(text)
      toc.push(indent + '- [' + text + '](#' + anchor + ')')
    }
  }
  return toc
}

export function collectReferences(fragments: Fragment[]): string[] {
  const refs: string[] = []
  const seen = new Set<string>()
  for (const frag of fragments) {
    if (frag.metadata.source && !seen.has(frag.metadata.source)) {
      seen.add(frag.metadata.source)
      refs.push('- [' + frag.metadata.title + '](' + frag.metadata.source + ')')
    }
  }
  return refs
}

export function extractTags(body: string, existingTags: string[]): string[] {
  const tagSet = new Set(existingTags)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nlp = require('compromise')
    const doc = nlp(body)
    const phrases = doc.match('#Noun+').out('array') as string[]
    for (const phrase of phrases) {
      const cleaned = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean).filter(w => w.length > 3 && !COMMON_STOP.has(w))
      for (const w of cleaned) { if (w.length > 3) tagSet.add(w) }
      if (cleaned.length > 0) tagSet.add(cleaned.join('-'))
    }
  } catch {}
  return [...tagSet].slice(0, 8)
}

export function extractDescription(content: string): string {
  const stripped = content.replace(/^#\s+.*$/m, '').replace(/^---[\s\S]*?---\n?/m, '').replace(/\n{2,}/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>_~]/g, '').trim()
  return stripped.length > 200 ? stripped.substring(0, 200).replace(/\s+\S*$/, '') + '...' : stripped
}

export function generateAssembledFrontmatter(fragments: Fragment[], assembledBody: string): string {
  const titles = fragments.map(f => f.metadata.title).filter(Boolean)
  const allTags = new Set<string>()
  for (const f of fragments) { for (const t of f.metadata.tags) allTags.add(t) }
  let earliestDate: string | null = null
  let author: string | null = null
  const origins = new Set<string>()
  for (const f of fragments) {
    if (f.metadata.date_iso && (earliestDate === null || f.metadata.date_iso < earliestDate)) earliestDate = f.metadata.date_iso
    if (f.metadata.author && !author) author = f.metadata.author
    if (f.metadata.source) origins.add(f.metadata.source)
  }
  const fm: Record<string, any> = { title: titles[0] || 'Assembled Article', tags: [...allTags], fragments: fragments.length }
  if (earliestDate) fm.published = earliestDate
  if (author) fm.author = author
  if (origins.size > 0) fm.origin = [...origins]
  return '---\n' + yaml.dump(fm).trim() + '\n---\n\n'
}

function rewireWikilinks(content: string, fragments: Fragment[]): string {
  const known = new Set(fragments.map(f => f.fileName))
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match: string, target: string, display?: string) => {
    const slug = anchorName(target)
    const text = (display || target).trim()
    if (known.has(target.toLowerCase())) {
      return '[' + text + '](#' + slug + ')'
    }
    return '[' + text + '](#' + slug + ')'
  })
}

export function assembleFragments(fragments: Fragment[], order: string[]): { content: string; actualOrder: string[] } {
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
    output += '<a name="' + anchor + '"></a>\n\n> **Source:** ' + label + '\n\n'
    output += bodies[i].trim()
  }

  if (toc.length > 0) {
    const tocBlock = toc.join('\n')
    output = '## Contents\n\n' + tocBlock + '\n\n---\n\n' + output
  }

  if (refs.length > 0) {
    output += '\n\n---\n\n## References\n\n' + refs.join('\n')
  }

  const frontmatter = generateAssembledFrontmatter(fragments, output)
  return { content: frontmatter + output, actualOrder }
}

export function enhanceTrilogy(parts: Fragment[][], labels: string[], filenames: string[], contents: string[]): string[] {
  const seriesTitle = parts.reduce((best: string, p) => {
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
  const combinedToc = parts.map((p: Fragment[], idx: number) => {
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

export function assembleTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>, targetDir: string, hasExplicitVoice: boolean, profile: any, jsonOnly: boolean, dryRun: boolean, enhanceMode: boolean): boolean {
  const parts = splitTrilogy(fragments, order, graph)
  const labels = ['Introduction', 'Body', 'Conclusion']
  const filenames = ['part-1-intro.md', 'part-2-body.md', 'part-3-conclusion.md']
  const outDir = path.join(targetDir, '..', 'output')
  if (!dryRun && !fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const contents: string[] = []
  const changes: number[] = []
  for (let i = 0; i < 3; i++) {
    if (parts[i].length === 0) { contents.push(''); changes.push(0); continue }
    const { content: assembledContent } = assembleFragments(parts[i], order.filter((n: string) => parts[i].some((f: Fragment) => f.fileName === n)))
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
        console.log(JSON.stringify({ part: i + 1, label: labels[i], fragments: parts[i].length, order: parts[i].map((f: Fragment) => f.fileName), content: enhanced[i], voice: hasExplicitVoice ? 'enabled' : 'none', totalChanges: changes[i], enhance: enhanceMode }, null, 2))
      } else {
        console.log('\n=== Trilogy Part ' + (i + 1) + ': ' + labels[i] + ' ===')
        console.log('Fragments: ' + parts[i].map((f: Fragment) => f.fileName).join(', '))
        console.log('Voice: ' + (hasExplicitVoice ? 'enabled (' + changes[i] + ' changes)' : 'none') + (enhanceMode ? ', Enhanced' : ''))
        console.log('\n' + enhanced[i].slice(0, 2000) + (enhanced[i].length > 2000 ? '\n... [truncated]' : ''))
      }
    } else {
      const outPath = path.join(outDir, filenames[i])
      fs.writeFileSync(outPath, enhanced[i], 'utf-8')
    }
  }
  if (!dryRun) {
    const manifest: any = { parts: [], fragments: fragments.length, voice: hasExplicitVoice ? { enabled: true, changes: changes.reduce((a: number, b: number) => a + b, 0), profile } : { enabled: false } }
    for (let i = 0; i < 3; i++) {
      manifest.parts.push({ part: i + 1, label: labels[i], output: filenames[i], fragments: parts[i].length, order: parts[i].map((f: Fragment) => f.fileName), voiceChanges: changes[i] })
    }
    const manifestPath = path.join(outDir, 'manifest.json')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    console.log('Trilogy assembly complete. Output in: ' + outDir)
  }
  return true
}
