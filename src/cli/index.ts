#!/usr/bin/env node

import { program } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { AsciiTable3 } from 'ascii-table3'
import { loadVoiceConfig, getValidVoices, getTimezone, getTomlConfig } from '../core/config.js'
import { extractFrontmatter } from '../core/frontmatter.js'
import { loadSession, saveSession, getTokenBudgetReport, writeRunLog } from '../core/session.js'
import { scanMarkdownFiles, analyzeGraphFile, buildGraph, findOrphans, findBacklinks, buildImageMap } from '../core/graph.js'
import { gatherFragments, buildDepGraph, assembleFragments, assembleTrilogy } from '../core/assembly.js'
import { lintDirectory } from '../core/lint.js'
import { editDocs, updateIndex, updateLog, linkUp, ingest } from '../core/wiki.js'
import { fabricateText } from '../transforms/fabricate.js'
import { lintMarkdown, fixMarkdown } from '../transforms/lint.js'
import { countTokens } from '../core/helpers.js'
import { getMode as resolveMode } from '../modes/index.js'
import {
  FabricateArgs, GraphArgs, OrphansArgs, ImageMapArgs, BacklinksArgs,
  AssembleArgs, LintArgs, EditDocsArgs, UpdateIndexArgs, UpdateLogArgs,
  LinkUpArgs, GatherArgs, IngestArgs, SessionArgs,
} from '../core/schema.js'
import type { FabricationSummary, ImageRef, GraphFileResult } from '../core/types.js'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

function renderSummaryTable(summary: FabricationSummary): string {
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

function requireDir(dir: string): void {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error('Error: directory not found: ' + dir)
    process.exit(4)
  }
}

function requireFile(file: string): void {
  if (!fs.existsSync(file)) {
    console.error('Error: file not found: ' + file)
    process.exit(4)
  }
}

function recordRun(file: string, voice: string, changes: number, changesApplied: boolean, tokensUsed: number, durationMs: number, mode: string): void {
  const session = loadSession()
  const updatedSession = { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensUsed, filesProcessed: session.filesProcessed + 1 }
  saveSession(updatedSession)
  writeRunLog({ timestamp: new Date().toISOString(), sessionId: updatedSession.sessionId, file, voice, changes, changesApplied, tokensUsed, durationMs, mode })
}

export function main(): void {
  const configPath = path.join(__dirname, '..', 'hooks.toml')
  getTomlConfig(configPath)

  program
    .name('md-fabrication')
    .description('Humanize LLM-generated markdown')
    .version('0.6.0')

  // --- fabricate ---
  program.command('fabricate')
    .alias('f')
    .description('Humanize markdown text with voice profiles, mode transforms, and lint auto-fix')
    .argument('<file>', '.md file to process')
    .option('-v, --voice <voice>', 'Target voice profile (professional, casual, technical, personal-branding)')
    .option('-m, --mode <mode>', 'Apply mode transforms (default, readme, blog, changelog, newsletter, tutorial, landing)')
    .option('-d, --dry-run', 'Preview diff without writing')
    .option('-a, --apply', 'Write changes in-place')
    .option('-j, --json', 'Output structured JSON')
    .option('-b, --budget <n>', 'Token budget limit')
    .option('-s, --session', 'Show token budget report')
    .option('-l, --lint-fix', 'Auto-fix markdownlint issues after transforms')
    .addHelpText('after', `
Examples:
  $ mdfab f doc.md --dry-run              Preview voice transforms
  $ mdfab f doc.md --apply --lint-fix     Apply transforms + fix markdown
  $ mdfab f doc.md --apply --mode blog    Blog-specific transform pipeline
  $ mdfab f doc.md --voice technical      Use technical voice profile
  $ mdfab f doc.md --dry-run --json       Structured JSON output
  $ mdfab f doc.md --lint-fix --dry-run   Preview lint fixes only
    `)
    .action((file: string, opts: Record<string, unknown>) => {
      const startTime = Date.now()
      const parsed = FabricateArgs.parse({ file, ...opts })
      const { voice, mode: modeName, dryRun, apply, json: jsonOnly, budget, session: sessionMode, lintFix } = parsed

      if (!fs.existsSync(file)) {
        if (jsonOnly) console.log(JSON.stringify({ file, error: 'file_not_found' }))
        else console.error('Error: file not found: ' + file)
        process.exit(4)
      }

      const session = loadSession()
      const fileContent = fs.readFileSync(file, 'utf-8')
      const { content: markdownContent, raw } = extractFrontmatter(fileContent)
      const tokensBefore = countTokens(fileContent)

      if (sessionMode) {
        const updatedSession = { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensBefore, filesProcessed: session.filesProcessed + 1 }
        saveSession(updatedSession)
        console.log(JSON.stringify(getTokenBudgetReport(updatedSession, budget), null, 2))
        return
      }

      const voiceCfg = loadVoiceConfig()
      const hasExplicitVoice = opts.voice !== undefined
      const isValidVoice = getValidVoices().includes(voice)
      if (hasExplicitVoice && !isValidVoice) console.warn('Warning: unknown voice "' + voice + '", falling back to "' + voiceCfg.default + '"')
      const resolvedVoice = isValidVoice ? voice : voiceCfg.default
      const profile = voiceCfg.profiles[resolvedVoice] || {}

      const activeMode = resolveMode(modeName)
      let modeTransformed = markdownContent
      for (const t of activeMode.transforms.sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)) {
        modeTransformed = t.apply(modeTransformed)
      }

      const { transformed, summary } = fabricateText(modeTransformed, profile)
      const totalChanges = summary.sentencesRestructured + summary.transitionsAdded + summary.contractionsApplied + summary.passiveToActive + summary.conjunctionSoftened + summary.pacingAdjusted + summary.vocabularyDiversified + summary.hedgePhrasesInjected + summary.conjunctionStartsAdded + summary.sentenceOpeningsVaried
      const lintResult = lintMarkdown(transformed)
      const hasLintIssues = lintResult.issues.length > 0
      const { fixed: lintFixed, fixCount: lintFixCount } = lintFix ? fixMarkdown(transformed) : { fixed: transformed, fixCount: 0 }
      const outputContent = lintFix ? lintFixed : transformed
      const tokensAfter = countTokens(raw + outputContent)

      if (dryRun) {
        const diffLines: string[] = []
        const origLines = markdownContent.split('\n')
        const newLines = outputContent.split('\n')
        const maxLen = Math.max(origLines.length, newLines.length)
        for (let i = 0; i < maxLen; i++) {
          if (origLines[i] !== newLines[i]) {
            if (origLines[i] !== undefined) diffLines.push('- ' + origLines[i])
            if (newLines[i] !== undefined) diffLines.push('+ ' + newLines[i])
          }
        }
        const result = { file, fileName: path.basename(file, '.md'), voice: resolvedVoice, mode: activeMode.name, totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter, lint: lintResult, lintFixed: lintFixCount, diff: diffLines.slice(0, 100) }
        if (jsonOnly) console.log(JSON.stringify(result, null, 2))
        else {
          console.log('Dry-run for ' + file + ' (voice: ' + resolvedVoice + ', mode: ' + activeMode.name + ')')
          console.log(renderSummaryTable(summary))
          if (hasLintIssues) console.log('Lint: ' + lintResult.errorCount + ' errors, ' + lintResult.warningCount + ' warnings')
          if (lintFixCount > 0) console.log('Lint fixes applied: ' + lintFixCount)
          diffLines.forEach((l: string) => { if (l.startsWith('- ')) console.log(RED + l + RESET); else if (l.startsWith('+ ')) console.log(GREEN + l + RESET); else console.log(l) })
          console.log('Tokens: ' + tokensAfter)
        }
        recordRun(file, resolvedVoice, totalChanges, false, tokensAfter, Date.now() - startTime, 'dry-run')
      } else if (apply) {
        const newContent = raw + outputContent
        fs.writeFileSync(file, newContent, 'utf-8')
        const result = { file, fileName: path.basename(file, '.md'), voice: resolvedVoice, mode: activeMode.name, totalChanges, changesApplied: true, summary, tokensUsed: tokensAfter, lint: lintResult, lintFixed: lintFixCount }
        if (jsonOnly) console.log(JSON.stringify(result, null, 2))
        else { console.log('Fabricated ' + file); console.log(renderSummaryTable(summary)); if (hasLintIssues) console.log('Lint: ' + lintResult.errorCount + ' errors, ' + lintResult.warningCount + ' warnings'); if (lintFixCount > 0) console.log('Lint fixes applied: ' + lintFixCount); console.log(totalChanges + ' changes applied'); console.log('Tokens: ' + tokensAfter) }
        recordRun(file, resolvedVoice, totalChanges, true, tokensAfter, Date.now() - startTime, 'apply')
      } else {
        const result = { file, fileName: path.basename(file, '.md'), voice: resolvedVoice, mode: activeMode.name, totalChanges, changesApplied: false, summary, tokensUsed: tokensAfter, lint: lintResult, lintFixed: lintFixCount }
        if (jsonOnly) console.log(JSON.stringify(result, null, 2))
        else { console.log(renderSummaryTable(summary)); if (hasLintIssues) console.log('Lint: ' + lintResult.errorCount + ' errors, ' + lintResult.warningCount + ' warnings'); if (lintFixCount > 0) console.log('Lint fixes applied: ' + lintFixCount); console.log('Tokens: ' + tokensAfter); console.log('Use --apply or --dry-run') }
        recordRun(file, resolvedVoice, totalChanges, false, tokensAfter, Date.now() - startTime, 'analyze')
      }
    })

  // --- graph ---
  program.command('graph')
    .description('Build document relationship graph')
    .argument('<directory>', 'Directory of .md files')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = GraphArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const { files: mdFiles } = scanMarkdownFiles(parsed.directory)
      const results = mdFiles.map(analyzeGraphFile)
      const graph = buildGraph(results)
      const output = { graph, stats: { totalFiles: mdFiles.length, totalNodes: Object.keys(graph.nodes).length, totalEdges: graph.edges.length, orphans: findOrphans(graph).length }, durationMs: Date.now() - startTime }
      if (parsed.json) console.log(JSON.stringify(output, null, 2))
      else {
        console.log('Graph for ' + parsed.directory)
        console.log('Files: ' + mdFiles.length + ', Nodes: ' + Object.keys(graph.nodes).length + ', Edges: ' + graph.edges.length)
        graph.edges.slice(0, 20).forEach((e: { source: string; target: string; type: string }) => console.log('  ' + e.source + ' -> ' + e.target + ' (' + e.type + ')'))
        if (graph.edges.length > 20) console.log('  ... and ' + (graph.edges.length - 20) + ' more')
      }
    })

  // --- orphans ---
  program.command('orphans')
    .description('Find unreferenced documents')
    .argument('<directory>', 'Directory of .md files')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = OrphansArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const { files: mdFiles } = scanMarkdownFiles(parsed.directory)
      const results = mdFiles.map(analyzeGraphFile)
      const graph = buildGraph(results)
      const orphans = findOrphans(graph)
      if (parsed.json) console.log(JSON.stringify({ orphans, count: orphans.length, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else {
        if (orphans.length === 0) console.log('No orphan documents')
        else { console.log('Orphans (' + orphans.length + '):'); orphans.forEach((o: string) => console.log('  ' + o)) }
      }
    })

  // --- image-map ---
  program.command('image-map')
    .description('Map all image references')
    .argument('<directory>', 'Directory of .md files')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = ImageMapArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const { files: mdFiles } = scanMarkdownFiles(parsed.directory)
      const results = mdFiles.map(analyzeGraphFile)
      const imageMap = buildImageMap(results)
      if (parsed.json) console.log(JSON.stringify({ imageMap, totalFiles: mdFiles.length, durationMs: Date.now() - startTime }, null, 2))
      else {
        console.log('Local: ' + imageMap.local.length + ', Remote: ' + imageMap.remote.length + ', Bucket: ' + imageMap.bucket.length + ', Broken: ' + imageMap.broken.length)
        if (imageMap.broken.length > 0) { console.log('Broken:'); imageMap.broken.forEach((i: ImageRef) => console.log('  ' + i.url)) }
      }
    })

  // --- backlinks ---
  program.command('backlinks')
    .description('Find documents referencing a specific doc')
    .argument('<doc>', 'Document to find backlinks for')
    .argument('<directory>', 'Directory of .md files')
    .option('-j, --json', 'Output as JSON')
    .action((doc: string, dir: string, opts: { json?: boolean }) => {
      const parsed = BacklinksArgs.parse({ doc, directory: dir, ...opts })
      requireDir(parsed.directory)
      const { files: mdFiles } = scanMarkdownFiles(parsed.directory)
      const results = mdFiles.map(analyzeGraphFile)
      const backlinks = findBacklinks(results, parsed.doc)
      if (parsed.json) console.log(JSON.stringify({ target: parsed.doc, count: backlinks.length }, null, 2))
      else {
        if (backlinks.length === 0) console.log('No backlinks')
        else backlinks.forEach((b: GraphFileResult) => console.log('  ' + b.fileName))
      }
    })

  // --- assemble ---
  program.command('assemble')
    .description('Compile wiki fragments')
    .argument('<directory>', 'Directory of wiki fragments')
    .option('-v, --voice <voice>', 'Target voice profile')
    .option('-d, --dry-run', 'Preview without writing')
    .option('-a, --apply', 'Write output file')
    .option('-t, --trilogy', 'Split into 3 parts by DAG depth')
    .option('-e, --enhance', 'Add series nav (requires --trilogy)')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: Record<string, unknown>) => {
      const startTime = Date.now()
      const parsed = AssembleArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const fragments = gatherFragments(parsed.directory)
      if (fragments.length === 0) { console.error('Error: no .md files found'); process.exit(1) }
      const graph = buildDepGraph(fragments)
      let order: string[] = []
      try { order = graph.overallOrder() } catch (e: unknown) { console.error('Error: cycle detected: ' + (e instanceof Error ? e.message : String(e))); process.exit(1) }

      if (parsed.trilogy) {
        if (!parsed.dryRun && !parsed.apply) { console.error('Error: --trilogy requires --dry-run or --apply'); process.exit(1) }
        const voiceCfg = loadVoiceConfig()
        const voice = parsed.voice || voiceCfg.default
        const profile = voiceCfg.profiles[voice]
        assembleTrilogy(fragments, order, graph, parsed.directory, !!parsed.voice, profile, parsed.json, parsed.dryRun, parsed.enhance || false)
        return
      }

      const { content: assembledContent, actualOrder } = assembleFragments(fragments, order)
      let finalContent = assembledContent
      let totalChanges = 0
      if (parsed.voice) {
        const voiceCfg = loadVoiceConfig()
        const profile = voiceCfg.profiles[parsed.voice] || {}
        const r = fabricateText(assembledContent, profile)
        finalContent = r.transformed
        totalChanges = r.summary.sentencesRestructured + r.summary.transitionsAdded + r.summary.contractionsApplied + r.summary.passiveToActive + r.summary.conjunctionSoftened + r.summary.pacingAdjusted + r.summary.vocabularyDiversified + r.summary.hedgePhrasesInjected + r.summary.conjunctionStartsAdded + r.summary.sentenceOpeningsVaried
      }

      if (parsed.dryRun) {
        if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, fragments: fragments.length, order: actualOrder, content: finalContent, voice: parsed.voice, totalChanges }, null, 2))
        else { console.log('Fragments: ' + fragments.length + ' (' + actualOrder.join(' -> ') + ')'); if (totalChanges > 0) console.log('Humanization changes: ' + totalChanges); console.log(finalContent) }
      } else if (parsed.apply) {
        const outDir = path.join(parsed.directory, '..', 'output')
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
        const outPath = path.join(outDir, 'assembled.md')
        fs.writeFileSync(outPath, finalContent, 'utf-8')
        if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, fragments: fragments.length, order: actualOrder, output: outPath, voice: parsed.voice, totalChanges }, null, 2))
        else { console.log('Assembled ' + fragments.length + ' fragments'); console.log('Output: ' + outPath) }
      } else {
        if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, fragments: fragments.length, order: actualOrder }, null, 2))
        else console.log('Fragments: ' + fragments.length + ', Order: ' + actualOrder.join(' -> ') + '. Use --dry-run or --apply')
      }
    })

  // --- lint ---
  program.command('lint')
    .description(`Validate markdown with markdownlint

  Single file — runs markdownlint on one .md
  Directory  — fragment lint + markdownlint per .md`)
    .argument('<target>', 'File or directory to lint')
    .option('-f, --fix', 'Auto-fix markdownlint issues in-place')
    .option('-j, --json', 'Output structured JSON')
    .addHelpText('after', `
Examples:
  $ mdfab lint doc.md              Lint a single file
  $ mdfab lint doc.md --fix        Auto-fix all fixable issues
  $ mdfab lint .                   Lint all .md in current directory
  $ mdfab lint . --json            JSON aggregated report
  $ mdfab lint . --json --fix      JSON report + auto-fix
    `)
    .action((target: string, opts: { json?: boolean; fix?: boolean }) => {
      const startTime = Date.now()
      const parsed = LintArgs.parse({ target, ...opts })
      const isFile = fs.statSync(parsed.target).isFile()

      if (isFile) {
        const content = fs.readFileSync(parsed.target, 'utf-8')
        const lintResult = lintMarkdown(content)

        let fixCount = 0
        if (parsed.fix) {
          const { fixed, fixCount: count } = fixMarkdown(content)
          if (count > 0) {
            fs.writeFileSync(parsed.target, fixed, 'utf-8')
            fixCount = count
          }
        }

        if (parsed.json) {
          console.log(JSON.stringify({
            file: parsed.target,
            issues: lintResult.issues,
            errorCount: lintResult.errorCount,
            warningCount: lintResult.warningCount,
            fixed: fixCount,
            durationMs: Date.now() - startTime,
          }, null, 2))
        } else {
          console.log('Lint results for ' + parsed.target)
          console.log('Errors: ' + lintResult.errorCount + ', Warnings: ' + lintResult.warningCount)
          if (lintResult.issues.length > 0) {
            for (const i of lintResult.issues) {
              console.log('  ! [' + i.ruleNames.join(', ') + '] line ' + i.lineNumber + ': ' + i.errorDetail)
            }
          } else {
            console.log('  No issues found')
          }
          if (fixCount > 0) console.log('Auto-fixed: ' + fixCount + ' issue(s)')
        }
      } else {
        requireDir(parsed.target)
        const { entries, errors, warnings, infos } = lintDirectory(parsed.target)

        const mdFiles = fs.readdirSync(parsed.target).filter(f => f.endsWith('.md'))
        const mlEntries: { file: string; lineNumber: number; rule: string; detail: string; severity: string }[] = []
        let mlErrors = 0
        let mlWarnings = 0
        for (const f of mdFiles) {
          const fp = path.join(parsed.target, f)
          const content = fs.readFileSync(fp, 'utf-8')
          const result = lintMarkdown(content, f)
          for (const issue of result.issues) {
            mlEntries.push({ file: f, lineNumber: issue.lineNumber, rule: issue.ruleNames.join(', '), detail: issue.errorDetail, severity: 'warning' })
          }
          mlErrors += result.errorCount
          mlWarnings += result.warningCount

          if (parsed.fix) {
            const { fixed, fixCount } = fixMarkdown(content)
            if (fixCount > 0) fs.writeFileSync(fp, fixed, 'utf-8')
          }
        }

        const totalEntries = entries.length + mlEntries.length
        const totalErrors = errors + mlErrors
        const totalWarnings = warnings + mlWarnings
        const fixLabel = parsed.fix ? ' (--fix active)' : ''

        if (parsed.json) {
          console.log(JSON.stringify({
            directory: parsed.target,
            fragmentIssues: entries,
            markdownlintIssues: mlEntries,
            errors: totalErrors,
            warnings: totalWarnings,
            infos,
            durationMs: Date.now() - startTime,
          }, null, 2))
        } else {
          console.log('Lint results for ' + parsed.target + fixLabel)
          console.log('Fragment lint: ' + errors + ' errors, ' + warnings + ' warnings, ' + infos + ' info')
          for (const e of entries) { const prefix = e.severity === 'error' ? 'X' : e.severity === 'warning' ? '!' : 'i'; const loc = e.file ? e.file + ': ' : ''; console.log('  ' + prefix + ' [' + e.severity + '] ' + loc + e.message) }
          if (mlEntries.length > 0) {
            console.log('Markdownlint: ' + mlErrors + ' errors, ' + mlWarnings + ' warnings')
            for (const m of mlEntries.slice(0, 30)) {
              console.log('  ! [' + m.rule + '] ' + m.file + ':' + m.lineNumber + ' — ' + m.detail)
            }
            if (mlEntries.length > 30) console.log('  ... and ' + (mlEntries.length - 30) + ' more issues')
          }
        }
      }
    })

  // --- edit-docs ---
  program.command('edit-docs')
    .description('Infer frontmatter for fragments')
    .argument('<directory>', 'Directory of fragments')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = EditDocsArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const result = editDocs(parsed.directory)
      if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, changed: result.changed, errors: result.errors, durationMs: Date.now() - startTime }))
      else { console.log('Files updated: ' + result.changed); if (result.errors.length > 0) result.errors.forEach((e: string) => console.log('  Error: ' + e)) }
    })

  // --- update-index ---
  program.command('update-index')
    .description('Regenerate index.md')
    .argument('<directory>', 'Directory of fragments')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = UpdateIndexArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const indexPath = updateIndex(parsed.directory)
      if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, index: indexPath, durationMs: Date.now() - startTime }))
      else { if (indexPath) console.log('Index updated: ' + indexPath); else console.log('No fragments found') }
    })

  // --- update-log ---
  program.command('update-log')
    .description('Append to log.md')
    .argument('<directory>', 'Directory of fragments')
    .argument('<action>', 'Action description')
    .argument('[description...]', 'Detail description')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, action: string, desc: string[], opts: { json?: boolean }) => {
      const startTime = Date.now()
      const description = desc.join(' ')
      const parsed = UpdateLogArgs.parse({ directory: dir, action, description, ...opts })
      requireDir(parsed.directory)
      const logPath = updateLog(parsed.directory, parsed.action, parsed.description)
      if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, log: logPath, action: parsed.action, description: parsed.description, durationMs: Date.now() - startTime }))
      else { console.log('Log updated: ' + logPath) }
    })

  // --- link-up ---
  program.command('link-up')
    .description('Rewire wikilinks to anchor links')
    .argument('<directory>', 'Directory of fragments')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = LinkUpArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const result = linkUp(parsed.directory)
      if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, linksRewired: result.linksRewired, headingsDeduped: result.headingsDeduped, depsAutoWired: result.depsAutoWired, filesChanged: result.filesChanged, durationMs: Date.now() - startTime }))
      else { console.log('Links rewired: ' + result.linksRewired + ', Headings deduped: ' + result.headingsDeduped + ', Deps auto-wired: ' + result.depsAutoWired + ', Files changed: ' + result.filesChanged) }
    })

  // --- gather ---
  program.command('gather')
    .description('Preview DAG order of wiki fragments')
    .argument('<directory>', 'Directory of fragments')
    .option('-j, --json', 'Output as JSON')
    .action((dir: string, opts: { json?: boolean }) => {
      const startTime = Date.now()
      const parsed = GatherArgs.parse({ directory: dir, ...opts })
      requireDir(parsed.directory)
      const fragments = gatherFragments(parsed.directory)
      if (fragments.length === 0) { console.error('Error: no .md files found'); process.exit(1) }
      const graph = buildDepGraph(fragments)
      let order: string[] = []
      try { order = graph.overallOrder() } catch (e: unknown) { console.error('Error: cycle detected: ' + (e instanceof Error ? e.message : String(e))); process.exit(1) }
      if (parsed.json) console.log(JSON.stringify({ directory: parsed.directory, fragments: fragments.length, order, durationMs: Date.now() - startTime }))
      else { console.log('Fragments: ' + fragments.length); console.log('Order: ' + order.join(' -> ')) }
    })

  // --- ingest ---
  program.command('ingest')
    .description('Ingest a raw article into fragments')
    .argument('<file>', 'Raw .md article file')
    .option('-t, --target <dir>', 'Target fragments directory')
    .option('-j, --json', 'Output as JSON')
    .action((file: string, opts: { target?: string; json?: boolean }) => {
      const startTime = Date.now()
      const parsed = IngestArgs.parse({ file, ...opts })
      requireFile(parsed.file)
      const targetDir = parsed.target || path.join(path.dirname(parsed.file), '..', 'sources')
      if (!fs.existsSync(targetDir)) { console.error('Error: target directory not found'); process.exit(4) }
      const result = ingest(parsed.file, targetDir)
      if (!result) { console.error('Error: failed to ingest'); process.exit(1) }
      if (parsed.json) console.log(JSON.stringify({ rawFile: parsed.file, fragment: result.fragment, index: result.index, log: result.log, durationMs: Date.now() - startTime }))
      else { console.log('Fragment: ' + result.fragment); console.log('Index: ' + result.index); console.log('Log: ' + result.log) }
    })

  // --- session ---
  program.command('session')
    .description('Show token budget report')
    .option('-b, --budget <n>', 'Token budget limit')
    .option('-j, --json', 'Output as JSON')
    .action((opts: { budget?: string; json?: boolean }) => {
      const parsed = SessionArgs.parse(opts)
      const session = loadSession()
      console.log(JSON.stringify(getTokenBudgetReport(session, parsed.budget), null, 2))
    })

  // --- datasets ---
  program.command('datasets')
    .description(`Manage sentence datasets

  Fetch upstream sources, extract sentences, write JSONL to src/sentences/,
  and copy to dist/ for runtime consumption.`)
    .option('-s, --status', 'Show dataset record counts and timestamps')
    .option('-c, --check', 'Dry-run: check upstream availability without writing')
    .option('-u, --update', 'Fetch sources, extract, write JSONL, copy to dist')
    .addHelpText('after', `
Examples:
  $ mdfab datasets --status      Show record counts for all datasets
  $ mdfab datasets --check       Dry-run upstream availability
  $ mdfab datasets --update      Fetch, extract, and write datasets
    `)
    .action((opts: { update?: boolean; check?: boolean; status?: boolean }) => {
      const rootDir = path.join(__dirname, '..', '..', '..')
      const scriptsDir = path.join(rootDir, 'scripts', 'extract')
      const sentencesDir = path.join(rootDir, 'src', 'sentences')
      const distEsm = path.join(rootDir, 'dist', 'esm', 'sentences')
      const distCjs = path.join(rootDir, 'dist', 'cjs', 'sentences')

      if (opts.status) {
        const datasets = ['conjunctions.jsonl', 'transitions.jsonl', 'intros.jsonl', 'conjunction-starts.jsonl', 'vocabulary.jsonl', 'hedges.jsonl', 'repetitive.jsonl', 'contractions.jsonl', 'banned-words.jsonl']
        for (const file of datasets) {
          const filePath = path.join(sentencesDir, file)
          if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length
            const stat = fs.statSync(filePath)
            const date = stat.mtime.toISOString().slice(0, 10)
            console.log(`\u2713  ${file.padEnd(25)} ${String(lines).padStart(6)} records  (last update: ${date})`)
          } else {
            console.log(`\u2717  ${file.padEnd(25)} \u2014  NOT SEEDED`)
          }
        }
        return
      }

      if (opts.check) {
        console.log('Dry-run: checking upstream sources...')
        console.log('  [1/9] WordNet    \u2192 vocabulary.jsonl         (check: https://wordnet.princeton.edu)')
        console.log('  [2/9] Discovery  \u2192 transitions.jsonl        (check: https://github.com/sileod/Discovery)')
        console.log('  [3/9] Discovery  \u2192 conjunctions.jsonl       (check: curated seed)')
        console.log('  [4/9] Discovery  \u2192 conjunction-starts.jsonl (check: curated seed)')
        console.log('  [5/9] Discovery  \u2192 intros.jsonl             (check: curated seed)')
        console.log('  [6/9] words/hedges \u2192 hedges.jsonl          (check: https://github.com/words/hedges)')
        console.log('  [7/9] multiple     \u2192 repetitive.jsonl       (check: Humanize-Text, Kimble, MS Wordiness)')
        console.log('  [8/9] node-contractions \u2192 contractions.jsonl (check: https://github.com/JamesHight/node-contractions)')
        console.log('  [9/9] curated      \u2192 banned-words.jsonl     (check: b1rdmania/plain-english-skill)')
        console.log('Run `mdfab datasets --update` to write datasets.')
        return
      }

      if (opts.update) {
        const scripts = ['vocab-from-wordnet.py', 'transitions-from-discovery.py', 'conjunctions-from-discovery.py', 'cs-from-discovery.py', 'intros-from-discovery.py', 'hedges-from-words.py', 'repetitive-from-plain-english.py', 'contractions-from-upstream.py', 'banned-words-from-sources.py']
        for (const script of scripts) {
          const scriptPath = path.join(scriptsDir, script)
          if (fs.existsSync(scriptPath)) {
            execSync(`python3.10 "${scriptPath}"`, { stdio: 'inherit', cwd: path.join(scriptsDir, '..', '..') })
          } else {
            console.log(`${script} not found, skipping`)
          }
        }

        if (fs.existsSync(distEsm)) {
          if (!fs.existsSync(distEsm)) fs.mkdirSync(distEsm, { recursive: true })
          if (!fs.existsSync(distCjs)) fs.mkdirSync(distCjs, { recursive: true })
          execSync(`cp ${sentencesDir}/*.jsonl ${distEsm}/ && cp ${sentencesDir}/*.jsonl ${distCjs}/`, { stdio: 'inherit' })
          console.log('Copied JSONL files to dist/')
        }

        console.log('\nSummary:')
        const header = `  ${'Dataset'.padEnd(25)} ${'Records'.padStart(8)}`
        console.log(header)
        console.log('  ' + '\u2500'.repeat(34))
        const datasets = ['conjunctions.jsonl', 'transitions.jsonl', 'intros.jsonl', 'conjunction-starts.jsonl', 'vocabulary.jsonl', 'hedges.jsonl', 'repetitive.jsonl', 'contractions.jsonl', 'banned-words.jsonl']
        for (const file of datasets) {
          const filePath = path.join(sentencesDir, file)
          if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length
            console.log(`  ${file.padEnd(25)} ${String(lines).padStart(8)}`)
          }
        }
      }
    })

  program.parse()
}

main()
