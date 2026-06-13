#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { AsciiTable3 } from 'ascii-table3'
import { loadVoiceConfig, getValidVoices, getTimezone, getTomlConfig } from '../core/config.js'
import { extractFrontmatter, stripFrontmatter } from '../core/frontmatter.js'
import { loadSession, saveSession, getTokenBudgetReport, writeRunLog } from '../core/session.js'
import { extractLinks, extractImages, scanMarkdownFiles, analyzeGraphFile, buildGraph, findOrphans, findBacklinks, buildImageMap } from '../core/graph.js'
import { gatherFragments, buildDepGraph, assembleFragments, assembleTrilogy, generateToc } from '../core/assembly.js'
import { lintDirectory } from '../core/lint.js'
import { editDocs, updateIndex, updateLog, linkUp, ingest } from '../core/wiki.js'
import { fabricateText } from '../transforms/fabricate.js'
import { countTokens, getPositionalArg, getPositionalArgs, getFlagArg } from '../core/helpers.js'
import { getMode as resolveMode } from '../modes/index.js'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

function renderSummaryTable(summary: any): string {
  return new AsciiTable3()
    .setHeading('Transformation', 'Count')
    .addRow('Sentences Restructured', summary.sentencesRestructured)
    .addRow('Transitions Added', summary.transitionsAdded)
    .addRow('Contractions Applied', summary.contractionsApplied)
    .addRow('Passive -> Active', summary.passiveToActive)
    .addRow('Conjunctions Softened', summary.conjunctionSoftened)
    .addRow('Pacing Adjusted', summary.pacingAdjusted)
    .addRow('Vocabulary Diversified', summary.vocabularyDiversified)
    .addRow('Hedge Phrases Injected', summary.hedgePhrasesInjected)
    .addRow('Conjunction Starts', summary.conjunctionStartsAdded)
    .addRow('Sentence Openings Varied', summary.sentenceOpeningsVaried)
    .toString()
}

function showHelp(): void {
  console.log(`md-fabrication - Humanize LLM-generated markdown

Usage: md-fabrication <file.md> [options]
       md-fabrication --graph <directory> [options]
       md-fabrication --assemble <directory> [options]
       md-fabrication --lint <directory> [options]
       md-fabrication --mode <mode> <file.md> [options]

Fabrication options:
  --json              Output as JSON
  --apply             Write changes in-place
  --dry-run           Show diff without writing
  --voice <voice>     Target voice
  --session           Token budget report
  --budget <n>        Set token budget limit
  --mode <mode>       Apply mode transforms (readme, blog, changelog, newsletter, tutorial, landing)

Graph options:
  --graph             Build document relationship graph
  --orphans           Find unreferenced documents
  --backlinks <doc>   Find documents referencing a specific doc
  --image-map         Map all image references

Assemble options:
  --assemble <dir>    Compile wiki fragments
  --trilogy           Split into 3 parts by DAG depth
  --enhance           Add series nav (requires --trilogy)

Lint / Wiki:
  --lint <dir>        Validate fragments
  --edit-docs <dir>   Infer frontmatter
  --update-index <dir>
  --update-log <dir> <action> <desc>
  --link-up <dir>     Rewire wikilinks
  --ingest <file> --target <dir>

  --help, -h          Show this help message

Voices: default, casual, technical
Examples:
  md-fabrication article.md --mode blog --dry-run
  md-fabrication --assemble sources/ --voice casual --trilogy --apply
  md-fabrication --lint sources/
  md-fabrication --edit-docs sources/`)
}

export function main(): void {
  const startTime = Date.now()
  const configPath = path.join(__dirname, '..', 'hooks.toml')
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
  const modeIdx = process.argv.findIndex(a => a === '--mode')
  const modeName = modeIdx > 0 ? process.argv[modeIdx + 1] || 'default' : 'default'

  if (isGraphMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const { files: mdFiles, errors: scanErrors } = scanMarkdownFiles(targetDir)
    const results = mdFiles.map(analyzeGraphFile)
    if (graphMode) {
      const graph = buildGraph(results)
      const output = { graph, stats: { totalFiles: mdFiles.length, totalNodes: Object.keys(graph.nodes).length, totalEdges: graph.edges.length, orphans: findOrphans(graph).length }, scanErrors: scanErrors.length > 0 ? scanErrors : undefined, durationMs: Date.now() - startTime }
      if (jsonOnly) console.log(JSON.stringify(output, null, 2))
      else { console.log('Graph for ' + targetDir); console.log('Files: ' + mdFiles.length + ', Nodes: ' + Object.keys(graph.nodes).length + ', Edges: ' + graph.edges.length); graph.edges.slice(0, 20).forEach((e: any) => console.log('  ' + e.source + ' -> ' + e.target + ' (' + e.type + ')')); if (graph.edges.length > 20) console.log('  ... and ' + (graph.edges.length - 20) + ' more') }
    } else if (orphansMode) {
      const graph = buildGraph(results)
      const orphans = findOrphans(graph)
      if (jsonOnly) console.log(JSON.stringify({ orphans, count: orphans.length, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else { if (orphans.length === 0) console.log('No orphan documents'); else { console.log('Orphans (' + orphans.length + '):'); orphans.forEach((o: string) => console.log('  ' + o)) } }
    } else if (imageMapMode) {
      const imageMap = buildImageMap(results)
      if (jsonOnly) console.log(JSON.stringify({ imageMap, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else { console.log('Local: ' + imageMap.local.length + ', Remote: ' + imageMap.remote.length + ', Bucket: ' + imageMap.bucket.length + ', Broken: ' + imageMap.broken.length); if (imageMap.broken.length > 0) { console.log('Broken:'); imageMap.broken.forEach((i: any) => console.log('  ' + i.url)) } }
    } else if (backlinksTarget) {
      const backlinks = findBacklinks(results, backlinksTarget)
      if (jsonOnly) console.log(JSON.stringify({ target: backlinksTarget, count: backlinks.length }, null, 2))
      else { if (backlinks.length === 0) console.log('No backlinks'); else backlinks.forEach((b: any) => console.log('  ' + b.fileName)) }
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
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, entries, errors, warnings, infos, durationMs: Date.now() - startTime }, null, 2)) }
    else {
      console.log('Lint results for ' + targetDir)
      console.log('Errors: ' + errors + ', Warnings: ' + warnings + ', Info: ' + infos)
      for (const e of entries) { const prefix = e.severity === 'error' ? 'X' : e.severity === 'warning' ? '!' : 'i'; const loc = e.file ? e.file + ': ' : ''; console.log('  ' + prefix + ' [' + e.severity + '] ' + loc + e.message) }
    }
    return
  }

  if (assembleMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required for --assemble'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found: ' + targetDir); process.exit(4) }
    const dryRun = process.argv.includes('--dry-run')
    const applyMode = process.argv.includes('--apply')
    const voiceCfg = loadVoiceConfig()
    const voiceIdx = process.argv.findIndex(arg => arg === '--voice')
    const hasExplicitVoice = voiceIdx > 0
    const voiceArg = hasExplicitVoice ? process.argv[voiceIdx + 1] || voiceCfg.default : ''
    const voice = hasExplicitVoice && getValidVoices().includes(voiceArg) ? voiceArg : voiceCfg.default
    const profile = voiceCfg.profiles[voice] || {}
    const fragments = gatherFragments(targetDir)
    if (fragments.length === 0) { console.error('Error: no .md files found'); process.exit(1) }
    const graph = buildDepGraph(fragments)
    let order: string[] = []
    try { order = graph.overallOrder() } catch (e: any) { console.error('Error: cycle detected: ' + e.message); process.exit(1) }
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
      if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder, content: finalContent, voice, totalChanges }, null, 2)) }
      else { console.log('Fragments: ' + fragments.length + ' (' + actualOrder.join(' -> ') + ')'); if (totalChanges > 0) console.log('Humanization changes: ' + totalChanges); console.log(finalContent) }
    } else if (applyMode) {
      const outDir = path.join(targetDir, '..', 'output')
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const outPath = path.join(outDir, 'assembled.md')
      fs.writeFileSync(outPath, finalContent, 'utf-8')
      if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder, output: outPath, voice, totalChanges }, null, 2)) }
      else { console.log('Assembled ' + fragments.length + ' fragments'); console.log('Output: ' + outPath) }
    } else { if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order: actualOrder }, null, 2)) } else { console.log('Fragments: ' + fragments.length + ', Order: ' + actualOrder.join(' -> ') + '. Use --dry-run or --apply'); } }
    return
  }

  if (editDocsMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found'); process.exit(4) }
    const result = editDocs(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, changed: result.changed, errors: result.errors, durationMs: Date.now() - startTime })) }
    else { console.log('Files updated: ' + result.changed); if (result.errors.length > 0) result.errors.forEach((e: string) => console.log('  Error: ' + e)) }
    return
  }

  if (updateIndexMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found'); process.exit(4) }
    const indexPath = updateIndex(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, index: indexPath, durationMs: Date.now() - startTime })) }
    else { if (indexPath) console.log('Index updated: ' + indexPath); else console.log('No fragments found') }
    return
  }

  if (updateLogMode) {
    const args: string[] = []
    for (let i = 2; i < process.argv.length; i++) { if (!process.argv[i].startsWith('-')) args.push(process.argv[i]) }
    const targetDir = args[0] || ''
    const action = args[1] || ''
    const description = args.slice(2).join(' ') || ''
    if (!targetDir || !action || !description) { console.error('Error: usage: --update-log <dir> <action> <description>'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found'); process.exit(4) }
    const logPath = updateLog(targetDir, action, description)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, log: logPath, action, description, durationMs: Date.now() - startTime })) }
    else { console.log('Log updated: ' + logPath) }
    return
  }

  if (linkUpMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found'); process.exit(4) }
    const result = linkUp(targetDir)
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, linksRewired: result.linksRewired, headingsDeduped: result.headingsDeduped, depsAutoWired: result.depsAutoWired, filesChanged: result.filesChanged, durationMs: Date.now() - startTime })) }
    else { console.log('Links rewired: ' + result.linksRewired + ', Headings deduped: ' + result.headingsDeduped + ', Deps auto-wired: ' + result.depsAutoWired + ', Files changed: ' + result.filesChanged) }
    return
  }

  if (gatherMode) {
    const targetDir = getPositionalArg(2)
    if (!targetDir) { console.error('Error: directory required'); process.exit(1) }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) { console.error('Error: directory not found'); process.exit(4) }
    const fragments = gatherFragments(targetDir)
    if (fragments.length === 0) { console.error('Error: no .md files found'); process.exit(1) }
    const graph = buildDepGraph(fragments)
    let order: string[] = []
    try { order = graph.overallOrder() } catch (e: any) { console.error('Error: cycle detected: ' + e.message); process.exit(1) }
    if (jsonOnly) { console.log(JSON.stringify({ directory: targetDir, fragments: fragments.length, order, durationMs: Date.now() - startTime })) }
    else { console.log('Fragments: ' + fragments.length); console.log('Order: ' + order.join(' -> ')) }
    return
  }

  if (ingestMode) {
    const args = getPositionalArgs(2)
    const rawFile = args[0] || ''
    if (!rawFile) { console.error('Error: usage: --ingest <file> --target <dir>'); process.exit(1) }
    if (!fs.existsSync(rawFile)) { console.error('Error: file not found: ' + rawFile); process.exit(4) }
    const targetDir = getFlagArg('--target') || path.join(path.dirname(rawFile), '..', 'sources')
    if (!fs.existsSync(targetDir)) { console.error('Error: target directory not found'); process.exit(4) }
    const result = ingest(rawFile, targetDir)
    if (!result) { console.error('Error: failed to ingest'); process.exit(1) }
    if (jsonOnly) { console.log(JSON.stringify({ rawFile, fragment: result.fragment, index: result.index, log: result.log, durationMs: Date.now() - startTime })) }
    else { console.log('Fragment: ' + result.fragment); console.log('Index: ' + result.index); console.log('Log: ' + result.log) }
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
  const profile = voiceCfg.profiles[voice] || {}
  const budgetIdx = process.argv.findIndex(arg => arg === '--budget')
  const budget = budgetIdx > 0 ? parseInt(process.argv[budgetIdx + 1] || '', 10) || 50000 : 50000

  if (!fs.existsSync(cliFile)) {
    if (jsonOnly) console.log(JSON.stringify({ file: cliFile, error: 'file_not_found' }))
    else console.error('Error: file not found: ' + cliFile)
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

  const activeMode = resolveMode(modeName)
  let modeTransformed = markdownContent
  for (const t of activeMode.transforms.sort((a, b) => a.priority - b.priority)) {
    modeTransformed = t.apply(modeTransformed)
  }
  const { transformed, summary } = fabricateText(modeTransformed, profile)
  const totalChanges = summary.sentencesRestructured + summary.transitionsAdded + summary.contractionsApplied + summary.passiveToActive + summary.conjunctionSoftened + summary.vocabularyDiversified + summary.hedgePhrasesInjected + summary.conjunctionStartsAdded + summary.sentenceOpeningsVaried
  const tokensAfter = countTokens(raw + transformed)

  if (dryRun) {
    const diffLines: string[] = []
    const origLines = markdownContent.split('\n')
    const newLines = transformed.split('\n')
    const maxLen = Math.max(origLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (origLines[i] !== newLines[i]) {
        if (origLines[i] !== undefined) diffLines.push('- ' + origLines[i])
        if (newLines[i] !== undefined) diffLines.push('+ ' + newLines[i])
      }
    }
    const result = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice, mode: activeMode.name, totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter, diff: diffLines.slice(0, 100) }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else {
      console.log('Dry-run for ' + cliFile + ' (voice: ' + voice + ', mode: ' + activeMode.name + ')')
      console.log(renderSummaryTable(summary))
      diffLines.forEach((l: string) => { if (l.startsWith('- ')) console.log(RED + l + RESET); else if (l.startsWith('+ ')) console.log(GREEN + l + RESET); else console.log(l) })
      console.log('Tokens: ' + tokensAfter)
    }
  } else if (applyMode) {
    const newContent = raw + transformed
    fs.writeFileSync(cliFile, newContent, 'utf-8')
    const result = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice, mode: activeMode.name, totalChanges, changesApplied: true, summary, tokensUsed: tokensAfter }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else { console.log('Fabricated ' + cliFile); console.log(renderSummaryTable(summary)); console.log(totalChanges + ' changes applied'); console.log('Tokens: ' + tokensAfter) }
  } else {
    const result = { file: cliFile, fileName: path.basename(cliFile, '.md'), voice, mode: activeMode.name, totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter }
    if (jsonOnly) console.log(JSON.stringify(result, null, 2))
    else { console.log(renderSummaryTable(summary)); console.log('Tokens: ' + tokensAfter); console.log('Use --apply or --dry-run') }
  }

  const updatedSession = { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensAfter, filesProcessed: session.filesProcessed + 1 }
  saveSession(updatedSession)
  const runMode = sessionMode ? 'session' : dryRun ? 'dry-run' : applyMode ? 'apply' : 'analyze'
  writeRunLog({ timestamp: new Date().toISOString(), sessionId: updatedSession.sessionId, file: cliFile, voice, changes: totalChanges, changesApplied: applyMode, tokensUsed: tokensAfter, durationMs: Date.now() - startTime, mode: runMode })
}

main()
