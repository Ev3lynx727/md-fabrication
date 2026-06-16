import { lint } from 'markdownlint/sync'
import type { LintError } from 'markdownlint/sync'

export interface LintIssue {
  lineNumber: number
  ruleNames: string[]
  ruleDescription: string
  errorDetail: string
}

export interface LintResult {
  issues: LintIssue[]
  errorCount: number
  warningCount: number
}

const LINT_CONFIG = {
  default: true,
  MD013: { line_length: 120, tables: false },
  MD033: false,
  MD041: false,
  MD024: false,
  MD036: false,
}

export function lintMarkdown(text: string, sourceName = 'output'): LintResult {
  const results = lint({
    strings: { [sourceName]: text },
    config: LINT_CONFIG,
  })

  const all = (results[sourceName] || []) as LintError[]
  const errors = all.filter(i => i.severity === 4)
  const warnings = all.filter(i => i.severity === 2)

  const issues: LintIssue[] = all.map(i => ({
    lineNumber: i.lineNumber,
    ruleNames: i.ruleNames,
    ruleDescription: i.ruleDescription,
    errorDetail: i.errorDetail,
  }))

  return { issues, errorCount: errors.length, warningCount: warnings.length }
}

export function fixMarkdown(text: string): { fixed: string; fixCount: number } {
  const results = lint({
    strings: { doc: text },
    config: LINT_CONFIG,
  })

  const all = (results.doc || []) as LintError[]
  const fixable = all
    .filter(i => i.fixInfo)
    .sort((a, b) => {
      if (b.lineNumber !== a.lineNumber) return b.lineNumber - a.lineNumber
      return (b.fixInfo?.editColumn || 0) - (a.fixInfo?.editColumn || 0)
    })

  if (fixable.length === 0) return { fixed: text, fixCount: 0 }

  let result = text
  let fixCount = 0
  for (const err of fixable) {
    const lines = result.split('\n')
    const idx = err.lineNumber - 1
    if (idx < 0 || idx >= lines.length) continue
    const line = lines[idx]
    const col = err.fixInfo!.editColumn
    const del = err.fixInfo!.deleteCount ?? 0
    const ins = err.fixInfo!.insertText || ''

    if (col === undefined) {
      lines[idx] = ins + line.slice(del)
    } else {
      const before = line.slice(0, col - 1)
      const after = line.slice(col - 1 + del)
      lines[idx] = before + ins + after
    }
    result = lines.join('\n')
    fixCount++
  }

  return { fixed: result, fixCount }
}
