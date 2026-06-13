import { FrontmatterResult } from './types.js'

export function extractFrontmatter(content: string): FrontmatterResult {
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

export function stripFrontmatter(content: string): string {
  const m = content.match(/^---\n[\s\S]*?\n---\n\n?/)
  return m ? content.slice(m[0].length) : content
}
