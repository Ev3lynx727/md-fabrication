import { LintEntry, Fragment } from './types.js'
import { scanMarkdownFiles } from './graph.js'
import { gatherFragments, buildDepGraph } from './assembly.js'
import { extractLinks } from './graph.js'
import { extractFrontmatter } from './frontmatter.js'

function extractWikilinkRefs(content: string): string[] {
  const refs: string[] = []
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let m: RegExpExecArray | null
  while ((m = wikiRegex.exec(content)) !== null) {
    refs.push(m[1].trim())
  }
  return refs
}

export function lintDirectory(dir: string): { entries: LintEntry[]; errors: number; warnings: number; infos: number } {
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
      if (!frag.metadata.source) entries.push({ file: frag.fileName, severity: 'info', message: 'No source field' })
      if (frag.metadata.date_iso === null && frag.raw.includes('date:')) {
        entries.push({ file: frag.fileName, severity: 'warning', message: 'Unparseable date value' })
      }
    }

    const contentLinks = extractLinks(frag.content)
    for (const link of contentLinks) {
      if (link.type === 'internal' && link.fileName && !filenames.has(link.fileName)) {
        entries.push({ file: frag.fileName, severity: 'warning', message: 'Broken internal link: ' + link.text + ' -> ' + link.url })
      }
    }

    const wikiRefs = extractWikilinkRefs(frag.content)
    for (const target of wikiRefs) {
      if (!filenames.has(target.toLowerCase())) {
        entries.push({ file: frag.fileName, severity: 'warning', message: 'Broken [[wikilink]]: ' + target })
      }
    }

    for (const dep of frag.metadata.depends_on) {
      const depName = dep.replace(/\.md$/, '')
      if (!filenames.has(depName)) {
        entries.push({ file: frag.fileName, severity: 'error', message: 'depends_on references ' + depName + ' but fragment not found' })
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
      const hasInboundDep = fragments.some(x => x.metadata.depends_on.some(d => d.replace(/\.md$/, '') === f.fileName))
      const hasWikilinkRef = fragments.some(x => [...x.content.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].some(m => m[1].trim() === f.fileName))
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
