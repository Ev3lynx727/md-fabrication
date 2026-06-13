import * as fs from 'fs'
import * as path from 'path'
import { LinkRef, ImageRef, GraphFileResult, Graph, ImageMap, GraphNode } from './types.js'
import { SKIP_DIRS } from './helpers.js'

export function extractLinks(content: string): LinkRef[] {
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

export function extractImages(content: string): ImageRef[] {
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

export function scanMarkdownFiles(dir: string): { files: string[]; errors: string[] } {
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

export function analyzeGraphFile(filePath: string): GraphFileResult {
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

export function buildGraph(results: GraphFileResult[]): Graph {
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

export function findOrphans(graph: Graph): string[] {
  return Object.keys(graph.nodes).filter(n => graph.nodes[n].inbound.length === 0 && graph.nodes[n].outbound.length === 0)
}

export function findBacklinks(results: GraphFileResult[], targetFileName: string): GraphFileResult[] {
  return results.filter(doc => doc.links.some(l => l.type === 'internal' && l.fileName === targetFileName))
}

export function buildImageMap(results: GraphFileResult[]): ImageMap {
  const images: { local: ImageRef[]; remote: ImageRef[]; bucket: ImageRef[]; broken: ImageRef[] } = { local: [], remote: [], bucket: [], broken: [] }
  for (const doc of results) {
    for (const img of doc.images) {
      images[img.type].push(img)
      if (img.type === 'local' && img.exists === false) images.broken.push(img)
    }
  }
  return images
}
