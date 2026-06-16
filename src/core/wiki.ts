import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { Fragment } from './types.js'
import { extractFrontmatter } from './frontmatter.js'
import { gatherFragments } from './assembly.js'
import { getTimezone } from './config.js'
import { extractFirstHeading, anchorName, COMMON_STOP } from './helpers.js'

function extractWikilinkRefs(content: string): string[] {
  const refs: string[] = []
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let m: RegExpExecArray | null
  while ((m = wikiRegex.exec(content)) !== null) {
    refs.push(m[1].trim())
  }
  return refs
}

function extractDescription(content: string): string {
  const stripped = content.replace(/^#\s+.*$/m, '').replace(/^---[\s\S]*?---\n?/m, '').replace(/\n{2,}/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>_~]/g, '').trim()
  return stripped.length > 200 ? stripped.substring(0, 200).replace(/\s+\S*$/, '') + '...' : stripped
}

function toLocalDateString(d: Date, timeZone?: string | null): string {
  if (timeZone) { return d.toLocaleDateString('en-CA', { timeZone }) }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function extractTags(body: string, existingTags: string[]): string[] {
  const tagSet = new Set(existingTags)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nlp = require('compromise')
    const doc = nlp(body)
    const phrases = doc.match('#Noun+').out('array') as string[]
    for (const phrase of phrases) {
      const cleaned = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean).filter((w: string) => w.length > 3 && !COMMON_STOP.has(w))
      for (const w of cleaned) { if (w.length > 3) tagSet.add(w) }
      if (cleaned.length > 0) tagSet.add(cleaned.join('-'))
    }
  } catch { /* NLP tag extraction failed — skip */ }
  return [...tagSet].slice(0, 8)
}

export function editDocs(dir: string): { changed: number; errors: string[] } {
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
    const tags = extractTags(content, [])
    const description = extractDescription(content)
    const fmObj: Record<string, unknown> = { title, description, tags, depends_on: depends, source: name }
    const fmYaml = yaml.dump(fmObj)
    fs.writeFileSync(fullPath, '---\n' + fmYaml + '---\n\n' + content, 'utf-8')
    changed++
  }
  return { changed, errors }
}

export function updateIndex(dir: string): string | null {
  const fragments = gatherFragments(dir)
  if (fragments.length === 0) return null
  const lines: string[] = []
  const timezone = getTimezone()
  const dateStr = toLocalDateString(new Date(), timezone)
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

export function updateLog(dir: string, action: string, description: string): string {
  const logPath = path.join(dir, 'log.md')
  const timezone = getTimezone()
  const timestamp = toLocalDateString(new Date(), timezone)
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

export function linkUp(dir: string): { linksRewired: number; headingsDeduped: number; filesChanged: number; depsAutoWired: number } {
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
    const wikiRefs: string[] = []
    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
    let m: RegExpExecArray | null
    while ((m = wikiRegex.exec(f.content)) !== null) {
      wikiRefs.push(m[1].trim())
    }
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
    newContent = newContent.replace(/^(#{1,6})\s+(.+)$/gm, (match: string, level: string, text: string) => {
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
      const fmObj: Record<string, unknown> = { title: f.metadata.title, tags: f.metadata.tags, depends_on: f.metadata.depends_on }
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

export function ingest(rawFile: string, targetDir: string): { fragment: string; index: string; log: string } | null {
  let content: string
  try { content = fs.readFileSync(rawFile, 'utf-8') } catch { return null }
  const fm = extractFrontmatter(content)
  const body = fm.content
  const title = extractFirstHeading(body) || path.basename(rawFile, '.md')
  const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md'
  const fragPath = path.join(targetDir, fileName)
  const tags = fm.metadata && fm.metadata.tags ? (Array.isArray(fm.metadata.tags) ? fm.metadata.tags : [fm.metadata.tags]) : extractTags(body, [])
  const description = extractDescription(body)
  const source = path.basename(rawFile)
  const fmObj: Record<string, unknown> = { title, description, tags, depends_on: [], source, status: 'draft' }
  if (fm.metadata && fm.metadata.date) fmObj.date = fm.metadata.date
  if (fm.metadata && fm.metadata.author) fmObj.author = fm.metadata.author
  const fmYaml = yaml.dump(fmObj)
  fs.writeFileSync(fragPath, '---\n' + fmYaml + '---\n\n' + body, 'utf-8')
  const indexPath = updateIndex(targetDir)
  const logPath = updateLog(targetDir, 'ingest', title)
  return { fragment: fragPath, index: indexPath || '', log: logPath }
}
