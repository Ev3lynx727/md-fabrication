import * as yaml from 'js-yaml'
import { FrontmatterResult } from './types.js'

export function extractFrontmatter(content: string): FrontmatterResult {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = content.match(frontmatterRegex)
  if (!match) return { metadata: null, content, raw: '' }
  try {
    const parsed = yaml.load(match[1])
    return {
      metadata: (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>,
      content: content.substring(match[0].length),
      raw: match[0],
    }
  } catch {
    return { metadata: null, content, raw: '' }
  }
}

export function stripFrontmatter(content: string): string {
  const m = content.match(/^---\n[\s\S]*?\n---\n\n?/)
  return m ? content.slice(m[0].length) : content
}
