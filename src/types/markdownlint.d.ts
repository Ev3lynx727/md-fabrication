declare module 'markdownlint/sync' {
  export interface LintError {
    lineNumber: number
    ruleNames: string[]
    ruleDescription: string
    ruleInformation: string
    errorDetail: string
    errorContext: string | null
    errorRange: [number, number] | null
    fixInfo: {
      editColumn: number
      deleteCount: number
      insertText: string
    } | null
    severity: number
  }

  export function lint(options: {
    strings: Record<string, string>
    config: Record<string, unknown>
  }): Record<string, LintError[]>
}
