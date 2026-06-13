"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFrontmatter = extractFrontmatter;
exports.stripFrontmatter = stripFrontmatter;
function extractFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    if (!match)
        return { metadata: null, content, raw: '' };
    const metadata = {};
    match[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            metadata[line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim();
        }
    });
    return { metadata, content: content.substring(match[0].length), raw: match[0] };
}
function stripFrontmatter(content) {
    const m = content.match(/^---\n[\s\S]*?\n---\n\n?/);
    return m ? content.slice(m[0].length) : content;
}
//# sourceMappingURL=frontmatter.js.map