"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLinks = extractLinks;
exports.extractImages = extractImages;
exports.scanMarkdownFiles = scanMarkdownFiles;
exports.analyzeGraphFile = analyzeGraphFile;
exports.buildGraph = buildGraph;
exports.findOrphans = findOrphans;
exports.findBacklinks = findBacklinks;
exports.buildImageMap = buildImageMap;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const helpers_js_1 = require("./helpers.js");
function extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const url = match[2].trim();
        if (url.startsWith('mailto:'))
            continue;
        if (/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)(\?|#|$)/i.test(url)) {
            links.push({ text: match[1].trim(), url, type: 'image', fileName: null });
        }
        else {
            const isInternal = url.startsWith('#') || (!url.startsWith('http') && !url.startsWith('//'));
            let fileName = null;
            if (isInternal && !url.startsWith('#')) {
                const baseName = path.basename(url, '.md');
                if (baseName && baseName !== url)
                    fileName = baseName;
            }
            links.push({ text: match[1].trim(), url, type: isInternal ? 'internal' : 'external', fileName });
        }
    }
    return links;
}
function extractImages(content) {
    const images = [];
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
        const url = match[2].trim();
        let type;
        let bucketName = null;
        let exists = null;
        if (url.startsWith('http') || url.startsWith('//')) {
            type = 'remote';
        }
        else if (url.startsWith('s3://') || url.startsWith('gs://') || url.startsWith('r2://')) {
            type = 'bucket';
            bucketName = url.split('://')[0];
        }
        else {
            type = 'local';
            const fullPath = path.isAbsolute(url) ? url : path.resolve(url);
            exists = fs.existsSync(fullPath);
        }
        images.push({ alt: match[1].trim(), url, type, bucketName, exists });
    }
    return images;
}
function scanMarkdownFiles(dir) {
    const files = [], errors = [];
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            errors.push(`permission_denied: ${dir}`);
            return;
        }
        for (const entry of entries) {
            if (entry.name.startsWith('.') || helpers_js_1.SKIP_DIRS.has(entry.name))
                continue;
            const fullPath = path.join(dir, entry.name);
            try {
                if (entry.isDirectory())
                    walk(fullPath);
                else if (entry.isFile() && entry.name.endsWith('.md'))
                    files.push(fullPath);
            }
            catch {
                errors.push(`access_error: ${fullPath}`);
            }
        }
    }
    try {
        walk(dir);
    }
    catch {
        errors.push('scan_error');
    }
    return { files, errors };
}
function analyzeGraphFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return { file: filePath, fileName: path.basename(filePath, '.md'), links: [], images: [], metadata: null };
    }
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const fmMatch = content.match(frontmatterRegex);
    let metadata = null;
    let body = content;
    if (fmMatch) {
        metadata = {};
        fmMatch[1].split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0)
                metadata[line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim();
        });
        body = content.substring(fmMatch[0].length);
    }
    return { file: filePath, fileName: path.basename(filePath, '.md'), links: extractLinks(body), images: extractImages(body), metadata };
}
function buildGraph(results) {
    const nodes = {};
    const edges = [];
    for (const doc of results) {
        const source = doc.fileName;
        if (!nodes[source])
            nodes[source] = { inbound: [], outbound: [], images: [] };
        for (const link of doc.links) {
            if (link.type === 'internal' && link.fileName) {
                const target = link.fileName;
                if (!nodes[target])
                    nodes[target] = { inbound: [], outbound: [], images: [] };
                if (!nodes[source].outbound.includes(target))
                    nodes[source].outbound.push(target);
                if (!nodes[target].inbound.includes(source))
                    nodes[target].inbound.push(source);
                edges.push({ source, target, type: 'link' });
            }
        }
        nodes[source].images = doc.images;
        for (const img of doc.images) {
            if (img.type === 'local' && img.exists === false) {
                edges.push({ source, target: img.url, type: 'broken_image' });
            }
        }
    }
    return { nodes, edges };
}
function findOrphans(graph) {
    return Object.keys(graph.nodes).filter(n => graph.nodes[n].inbound.length === 0 && graph.nodes[n].outbound.length === 0);
}
function findBacklinks(results, targetFileName) {
    return results.filter(doc => doc.links.some(l => l.type === 'internal' && l.fileName === targetFileName));
}
function buildImageMap(results) {
    const images = { local: [], remote: [], bucket: [], broken: [] };
    for (const doc of results) {
        for (const img of doc.images) {
            images[img.type].push(img);
            if (img.type === 'local' && img.exists === false)
                images.broken.push(img);
        }
    }
    return images;
}
//# sourceMappingURL=graph.js.map