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
exports.parseFragment = parseFragment;
exports.gatherFragments = gatherFragments;
exports.buildDepGraph = buildDepGraph;
exports.computeDagLevels = computeDagLevels;
exports.splitTrilogy = splitTrilogy;
exports.generateToc = generateToc;
exports.collectReferences = collectReferences;
exports.extractTags = extractTags;
exports.extractDescription = extractDescription;
exports.generateAssembledFrontmatter = generateAssembledFrontmatter;
exports.assembleFragments = assembleFragments;
exports.enhanceTrilogy = enhanceTrilogy;
exports.assembleTrilogy = assembleTrilogy;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const dependency_graph_1 = require("dependency-graph");
const frontmatter_js_1 = require("./frontmatter.js");
const config_js_1 = require("./config.js");
const fabricate_js_1 = require("../transforms/fabricate.js");
const helpers_js_1 = require("./helpers.js");
function toLocalDateString(d, timeZone) {
    if (timeZone) {
        return d.toLocaleDateString('en-CA', { timeZone });
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}
function parseNaturalDate(value, timeZone) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime()))
            return d.toISOString().split('T')[0];
    }
    try {
        const nlp = require('compromise');
        const datePlugin = require('compromise-dates');
        nlp.plugin(datePlugin);
        const result = nlp(value).dates().get(0);
        if (result && result.start) {
            const d = new Date(result.start);
            if (!isNaN(d.getTime()))
                return toLocalDateString(d, timeZone);
        }
    }
    catch { }
    try {
        const d = new Date(value);
        if (!isNaN(d.getTime()))
            return toLocalDateString(d, timeZone);
    }
    catch { }
    return null;
}
function parseFragment(content) {
    const fm = (0, frontmatter_js_1.extractFrontmatter)(content);
    if (!fm.metadata)
        return { metadata: null, content: fm.content, raw: '' };
    const parsed = yaml.load(fm.raw.replace(/^---\s*\n/, '').replace(/\n---\s*$/, ''));
    if (!parsed || typeof parsed !== 'object')
        return { metadata: null, content: fm.content, raw: '' };
    const dependsRaw = parsed.depends_on;
    const depends = Array.isArray(dependsRaw) ? dependsRaw.map(String) : (typeof dependsRaw === 'string' ? [dependsRaw] : []);
    const timezone = (0, config_js_1.getTimezone)();
    return {
        metadata: {
            title: String(parsed.title || ''),
            author: parsed.author ? String(parsed.author) : null,
            tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : (typeof parsed.tags === 'string' ? [parsed.tags] : []),
            depends_on: depends,
            order: parsed.order != null ? Number(parsed.order) : null,
            status: parsed.status ? String(parsed.status) : null,
            source: parsed.source ? String(parsed.source) : null,
            date_iso: parsed.date ? parseNaturalDate(String(parsed.date), timezone) : (parsed.published ? parseNaturalDate(String(parsed.published), timezone) : null),
            description: parsed.description ? String(parsed.description) : null,
        },
        content: fm.content,
        raw: fm.raw
    };
}
function gatherFragments(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name).filter(f => f !== 'index.md' && f !== 'log.md' && f !== 'README.md').sort();
    const fragments = [];
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const r = parseFragment(rawContent);
        fragments.push({
            file: fullPath,
            fileName: file.replace(/\.md$/, ''),
            metadata: r.metadata || { title: file.replace(/\.md$/, ''), author: null, tags: [], depends_on: [], order: null, status: null, source: null, date_iso: null, description: null },
            content: r.metadata ? r.content : rawContent,
            raw: r.raw,
        });
    }
    return fragments;
}
function buildDepGraph(fragments) {
    const graph = new dependency_graph_1.DepGraph();
    for (const frag of fragments) {
        graph.addNode(frag.fileName, frag);
    }
    for (const frag of fragments) {
        for (const dep of frag.metadata.depends_on) {
            const depName = dep.replace(/\.md$/, '');
            if (graph.hasNode(depName)) {
                graph.addDependency(frag.fileName, depName);
            }
        }
    }
    return graph;
}
function computeDagLevels(graph) {
    const levels = new Map();
    const order = graph.overallOrder();
    for (const node of order) {
        const deps = graph.dependenciesOf(node);
        if (deps.length === 0) {
            levels.set(node, 0);
        }
        else {
            let maxDepLevel = 0;
            for (const dep of deps) {
                const l = levels.get(dep) ?? 0;
                if (l > maxDepLevel)
                    maxDepLevel = l;
            }
            levels.set(node, maxDepLevel + 1);
        }
    }
    return levels;
}
function splitTrilogy(fragments, order, graph) {
    const levels = computeDagLevels(graph);
    const maxLevel = Math.max(...levels.values(), 0);
    const orderedFrags = order.map(name => fragments.find(f => f.fileName === name)).filter(Boolean);
    const part1 = [];
    const part2 = [];
    const part3 = [];
    for (const frag of orderedFrags) {
        const level = levels.get(frag.fileName) ?? 0;
        if (level <= Math.ceil(maxLevel * 0.33))
            part1.push(frag);
        else if (level <= Math.ceil(maxLevel * 0.66))
            part2.push(frag);
        else
            part3.push(frag);
    }
    return [part1, part2, part3];
}
function generateToc(content) {
    const lines = content.split('\n');
    const toc = [];
    for (const line of lines) {
        const m = line.match(/^(#{1,6})\s+(.+)$/);
        if (m) {
            const level = m[1].length;
            const text = m[2].trim();
            const indent = '  '.repeat(level - 1);
            const anchor = (0, helpers_js_1.anchorName)(text);
            toc.push(indent + '- [' + text + '](#' + anchor + ')');
        }
    }
    return toc;
}
function collectReferences(fragments) {
    const refs = [];
    const seen = new Set();
    for (const frag of fragments) {
        if (frag.metadata.source && !seen.has(frag.metadata.source)) {
            seen.add(frag.metadata.source);
            refs.push('- [' + frag.metadata.title + '](' + frag.metadata.source + ')');
        }
    }
    return refs;
}
function extractTags(body, existingTags) {
    const tagSet = new Set(existingTags);
    try {
        const nlp = require('compromise');
        const doc = nlp(body);
        const phrases = doc.match('#Noun+').out('array');
        for (const phrase of phrases) {
            const cleaned = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean).filter(w => w.length > 3 && !helpers_js_1.COMMON_STOP.has(w));
            for (const w of cleaned) {
                if (w.length > 3)
                    tagSet.add(w);
            }
            if (cleaned.length > 0)
                tagSet.add(cleaned.join('-'));
        }
    }
    catch { }
    return [...tagSet].slice(0, 8);
}
function extractDescription(content) {
    const stripped = content.replace(/^#\s+.*$/m, '').replace(/^---[\s\S]*?---\n?/m, '').replace(/\n{2,}/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>_~]/g, '').trim();
    return stripped.length > 200 ? stripped.substring(0, 200).replace(/\s+\S*$/, '') + '...' : stripped;
}
function generateAssembledFrontmatter(fragments, assembledBody) {
    const titles = fragments.map(f => f.metadata.title).filter(Boolean);
    const allTags = new Set();
    for (const f of fragments) {
        for (const t of f.metadata.tags)
            allTags.add(t);
    }
    let earliestDate = null;
    let author = null;
    const origins = new Set();
    for (const f of fragments) {
        if (f.metadata.date_iso && (earliestDate === null || f.metadata.date_iso < earliestDate))
            earliestDate = f.metadata.date_iso;
        if (f.metadata.author && !author)
            author = f.metadata.author;
        if (f.metadata.source)
            origins.add(f.metadata.source);
    }
    const fm = { title: titles[0] || 'Assembled Article', tags: [...allTags], fragments: fragments.length };
    if (earliestDate)
        fm.published = earliestDate;
    if (author)
        fm.author = author;
    if (origins.size > 0)
        fm.origin = [...origins];
    return '---\n' + yaml.dump(fm).trim() + '\n---\n\n';
}
function rewireWikilinks(content, fragments) {
    const known = new Set(fragments.map(f => f.fileName));
    return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
        const slug = (0, helpers_js_1.anchorName)(target);
        const text = (display || target).trim();
        if (known.has(target.toLowerCase())) {
            return '[' + text + '](#' + slug + ')';
        }
        return '[' + text + '](#' + slug + ')';
    });
}
function assembleFragments(fragments, order) {
    const sorted = order.map(name => fragments.find(f => f.fileName === name)).filter(Boolean);
    sorted.sort((a, b) => {
        if (a.metadata.date_iso && b.metadata.date_iso)
            return a.metadata.date_iso.localeCompare(b.metadata.date_iso);
        if (a.metadata.date_iso)
            return -1;
        if (b.metadata.date_iso)
            return 1;
        return 0;
    });
    const actualOrder = sorted.map(f => f.fileName);
    const bodies = sorted.map(f => rewireWikilinks(f.content, sorted));
    const toc = generateToc(bodies.join('\n\n'));
    const refs = collectReferences(sorted);
    let output = '';
    let first = true;
    for (let i = 0; i < sorted.length; i++) {
        if (!first)
            output += '\n\n---\n\n';
        first = false;
        const frag = sorted[i];
        const label = frag.metadata.title || frag.fileName;
        const anchor = (0, helpers_js_1.anchorName)(frag.fileName);
        output += '<a name="' + anchor + '"></a>\n\n> **Source:** ' + label + '\n\n';
        output += bodies[i].trim();
    }
    if (toc.length > 0) {
        const tocBlock = toc.join('\n');
        output = '## Contents\n\n' + tocBlock + '\n\n---\n\n' + output;
    }
    if (refs.length > 0) {
        output += '\n\n---\n\n## References\n\n' + refs.join('\n');
    }
    const frontmatter = generateAssembledFrontmatter(fragments, output);
    return { content: frontmatter + output, actualOrder };
}
function enhanceTrilogy(parts, labels, filenames, contents) {
    const seriesTitle = parts.reduce((best, p) => {
        for (const f of p) {
            if (f.metadata.title && f.metadata.depends_on.length === 0)
                return f.metadata.title;
        }
        return best;
    }, 'Untitled Series');
    const enhanced = [];
    for (let i = 0; i < 3; i++) {
        if (!contents[i]) {
            enhanced.push('');
            continue;
        }
        let body = contents[i];
        const prevLabel = i > 0 ? labels[i - 1] : null;
        const nextLabel = i < 2 ? labels[i + 1] : null;
        const prevFile = i > 0 ? filenames[i - 1] : null;
        const nextFile = i < 2 ? filenames[i + 1] : null;
        if (prevFile) {
            body = '<div class="nav-prev">\u2190 <a href="./' + prevFile + '">Back to ' + prevLabel + '</a></div>\n\n' + body;
        }
        if (nextFile) {
            body = body + '\n\n---\n\n<div class="nav-next"><a href="./' + nextFile + '">Continue to ' + nextLabel + '</a> \u2192</div>';
        }
        const seriesFm = 'series: ' + seriesTitle + '\npart: ' + (i + 1) + '\npart_label: ' + labels[i] + '\n';
        const fmEnd = body.indexOf('\n---\n\n');
        if (fmEnd > 0) {
            body = body.slice(0, fmEnd + 1) + seriesFm + body.slice(fmEnd + 1);
        }
        enhanced.push(body);
    }
    const combinedToc = parts.map((p, idx) => {
        if (p.length === 0)
            return '';
        const headings = p.map(f => '  - [' + (f.metadata.title || f.fileName) + '](#' + (0, helpers_js_1.anchorName)(f.fileName) + ')').join('\n');
        return '- **' + labels[idx] + '**\n' + headings;
    }).filter(Boolean).join('\n');
    if (combinedToc && enhanced[0]) {
        const tocBlock = '> **Series:** ' + seriesTitle + '\n>\n> 1. [' + labels[0] + '](./' + filenames[0] + ')\n> 2. [' + labels[1] + '](./' + filenames[1] + ')\n> 3. [' + labels[2] + '](./' + filenames[2] + ')\n\n## Series Contents\n\n' + combinedToc + '\n\n---\n\n';
        enhanced[0] = tocBlock + enhanced[0];
    }
    return enhanced;
}
function assembleTrilogy(fragments, order, graph, targetDir, hasExplicitVoice, profile, jsonOnly, dryRun, enhanceMode) {
    const parts = splitTrilogy(fragments, order, graph);
    const labels = ['Introduction', 'Body', 'Conclusion'];
    const filenames = ['part-1-intro.md', 'part-2-body.md', 'part-3-conclusion.md'];
    const outDir = path.join(targetDir, '..', 'output');
    if (!dryRun && !fs.existsSync(outDir))
        fs.mkdirSync(outDir, { recursive: true });
    const contents = [];
    const changes = [];
    for (let i = 0; i < 3; i++) {
        if (parts[i].length === 0) {
            contents.push('');
            changes.push(0);
            continue;
        }
        const { content: assembledContent } = assembleFragments(parts[i], order.filter((n) => parts[i].some((f) => f.fileName === n)));
        let finalContent = assembledContent;
        let totalChanges = 0;
        if (hasExplicitVoice) {
            const r = (0, fabricate_js_1.fabricateText)(assembledContent, profile);
            finalContent = r.transformed;
            totalChanges = r.summary.sentencesRestructured + r.summary.transitionsAdded + r.summary.contractionsApplied + r.summary.passiveToActive + r.summary.conjunctionSoftened + r.summary.pacingAdjusted + r.summary.vocabularyDiversified + r.summary.hedgePhrasesInjected + r.summary.conjunctionStartsAdded + r.summary.sentenceOpeningsVaried;
        }
        contents.push(finalContent);
        changes.push(totalChanges);
    }
    const enhanced = enhanceMode ? enhanceTrilogy(parts, labels, filenames, contents) : contents;
    for (let i = 0; i < 3; i++) {
        if (!enhanced[i])
            continue;
        if (dryRun) {
            if (jsonOnly) {
                console.log(JSON.stringify({ part: i + 1, label: labels[i], fragments: parts[i].length, order: parts[i].map((f) => f.fileName), content: enhanced[i], voice: hasExplicitVoice ? 'enabled' : 'none', totalChanges: changes[i], enhance: enhanceMode }, null, 2));
            }
            else {
                console.log('\n=== Trilogy Part ' + (i + 1) + ': ' + labels[i] + ' ===');
                console.log('Fragments: ' + parts[i].map((f) => f.fileName).join(', '));
                console.log('Voice: ' + (hasExplicitVoice ? 'enabled (' + changes[i] + ' changes)' : 'none') + (enhanceMode ? ', Enhanced' : ''));
                console.log('\n' + enhanced[i].slice(0, 2000) + (enhanced[i].length > 2000 ? '\n... [truncated]' : ''));
            }
        }
        else {
            const outPath = path.join(outDir, filenames[i]);
            fs.writeFileSync(outPath, enhanced[i], 'utf-8');
        }
    }
    if (!dryRun) {
        const manifest = { parts: [], fragments: fragments.length, voice: hasExplicitVoice ? { enabled: true, changes: changes.reduce((a, b) => a + b, 0), profile } : { enabled: false } };
        for (let i = 0; i < 3; i++) {
            manifest.parts.push({ part: i + 1, label: labels[i], output: filenames[i], fragments: parts[i].length, order: parts[i].map((f) => f.fileName), voiceChanges: changes[i] });
        }
        const manifestPath = path.join(outDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('Trilogy assembly complete. Output in: ' + outDir);
    }
    return true;
}
//# sourceMappingURL=assembly.js.map