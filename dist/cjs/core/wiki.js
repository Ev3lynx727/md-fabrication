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
exports.editDocs = editDocs;
exports.updateIndex = updateIndex;
exports.updateLog = updateLog;
exports.linkUp = linkUp;
exports.ingest = ingest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const frontmatter_js_1 = require("./frontmatter.js");
const assembly_js_1 = require("./assembly.js");
const config_js_1 = require("./config.js");
const helpers_js_1 = require("./helpers.js");
function extractWikilinkRefs(content) {
    const refs = [];
    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let m;
    while ((m = wikiRegex.exec(content)) !== null) {
        refs.push(m[1].trim());
    }
    return refs;
}
function extractDescription(content) {
    const stripped = content.replace(/^#\s+.*$/m, '').replace(/^---[\s\S]*?---\n?/m, '').replace(/\n{2,}/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>_~]/g, '').trim();
    return stripped.length > 200 ? stripped.substring(0, 200).replace(/\s+\S*$/, '') + '...' : stripped;
}
function toLocalDateString(d, timeZone) {
    if (timeZone) {
        return d.toLocaleDateString('en-CA', { timeZone });
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}
function extractTags(body, existingTags) {
    const tagSet = new Set(existingTags);
    try {
        const nlp = require('compromise');
        const doc = nlp(body);
        const phrases = doc.match('#Noun+').out('array');
        for (const phrase of phrases) {
            const cleaned = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(Boolean).filter((w) => w.length > 3 && !helpers_js_1.COMMON_STOP.has(w));
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
function editDocs(dir) {
    const errors = [];
    let changed = 0;
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        errors.push('Cannot read directory: ' + dir);
        return { changed, errors };
    }
    const entryNames = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name);
    for (const name of entryNames) {
        if (name === 'index.md' || name === 'log.md' || name === 'README.md')
            continue;
        const fullPath = path.join(dir, name);
        let content;
        try {
            content = fs.readFileSync(fullPath, 'utf-8');
        }
        catch {
            errors.push('Cannot read: ' + name);
            continue;
        }
        const fm = (0, frontmatter_js_1.extractFrontmatter)(content);
        if (fm.metadata)
            continue;
        const title = (0, helpers_js_1.extractFirstHeading)(content) || name.replace(/\.md$/, '');
        const wikiRefs = extractWikilinkRefs(content);
        const depends = wikiRefs.map(r => r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md').filter(r => entryNames.includes(r));
        const tags = extractTags(content, []);
        const description = extractDescription(content);
        const fmObj = { title, description, tags, depends_on: depends, source: name };
        const fmYaml = yaml.dump(fmObj);
        fs.writeFileSync(fullPath, '---\n' + fmYaml + '---\n\n' + content, 'utf-8');
        changed++;
    }
    return { changed, errors };
}
function updateIndex(dir) {
    const fragments = (0, assembly_js_1.gatherFragments)(dir);
    if (fragments.length === 0)
        return null;
    const lines = [];
    const timezone = (0, config_js_1.getTimezone)();
    const dateStr = toLocalDateString(new Date(), timezone);
    lines.push('---', 'title: Page Catalog', 'description: Auto-generated fragment index', 'generated: ' + dateStr, 'fragments: ' + fragments.length, '---', '');
    lines.push('# Page Catalog', '');
    lines.push('Auto-generated on ' + dateStr + '. ' + fragments.length + ' fragment(s).', '');
    const tagGroups = new Map();
    const untagged = [];
    for (const f of fragments) {
        const ft = f.metadata.tags;
        if (ft.length > 0) {
            for (const t of ft) {
                if (!tagGroups.has(t))
                    tagGroups.set(t, []);
                tagGroups.get(t).push(f);
            }
        }
        else {
            untagged.push(f);
        }
    }
    for (const [tag, frags] of tagGroups) {
        lines.push('## ' + tag.charAt(0).toUpperCase() + tag.slice(1));
        for (const f of frags)
            lines.push('- [[' + f.fileName + ']] \u2014 ' + extractDescription(f.content));
        lines.push('');
    }
    if (untagged.length > 0) {
        lines.push('## Uncategorized');
        for (const f of untagged)
            lines.push('- [[' + f.fileName + ']] \u2014 ' + extractDescription(f.content));
        lines.push('');
    }
    const indexPath = path.join(dir, 'index.md');
    fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8');
    return indexPath;
}
function updateLog(dir, action, description) {
    const logPath = path.join(dir, 'log.md');
    const timezone = (0, config_js_1.getTimezone)();
    const timestamp = toLocalDateString(new Date(), timezone);
    const entry = '## [' + timestamp + '] ' + action + ' | ' + description + '\n';
    let logContent;
    if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
        if (!logContent.endsWith('\n'))
            logContent += '\n';
    }
    else {
        logContent = '# Activity Log\n\n';
    }
    logContent += entry;
    fs.writeFileSync(logPath, logContent, 'utf-8');
    return logPath;
}
function linkUp(dir) {
    const fragments = (0, assembly_js_1.gatherFragments)(dir);
    const fragNames = new Set(fragments.map(f => f.fileName));
    let linksRewired = 0;
    let headingsDeduped = 0;
    let filesChanged = 0;
    let depsAutoWired = 0;
    const headingCounts = new Map();
    for (const f of fragments) {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let m;
        while ((m = headingRegex.exec(f.content)) !== null) {
            const text = m[2].trim().toLowerCase();
            headingCounts.set(text, (headingCounts.get(text) || 0) + 1);
        }
    }
    const headerCountsGlobal = new Map();
    for (const f of fragments) {
        let newContent = f.content;
        let changed = false;
        const wikiRefs = [];
        const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let m;
        while ((m = wikiRegex.exec(f.content)) !== null) {
            wikiRefs.push(m[1].trim());
        }
        for (const ref of wikiRefs) {
            const slug = ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (slug !== f.fileName && fragNames.has(slug) && !f.metadata.depends_on.includes(slug)) {
                f.metadata.depends_on.push(slug);
                depsAutoWired++;
                changed = true;
            }
        }
        newContent = newContent.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
            linksRewired++;
            const slug = (0, helpers_js_1.anchorName)(target);
            return '[' + (display || target).trim() + '](#' + slug + ')';
        });
        if (newContent !== f.content)
            changed = true;
        newContent = newContent.replace(/^(#{1,6})\s+(.+)$/gm, (match, level, text) => {
            const trimmed = text.trim();
            const key = trimmed.toLowerCase();
            if ((headingCounts.get(key) || 0) > 1) {
                const count = (headerCountsGlobal.get(key) || 0) + 1;
                headerCountsGlobal.set(key, count);
                headingsDeduped++;
                changed = true;
                return level + ' ' + trimmed + ' (' + String.fromCharCode(64 + count) + ')';
            }
            return match;
        });
        if (changed) {
            const fmObj = { title: f.metadata.title, tags: f.metadata.tags, depends_on: f.metadata.depends_on };
            if (f.metadata.description)
                fmObj.description = f.metadata.description;
            if (f.metadata.order != null)
                fmObj.order = f.metadata.order;
            if (f.metadata.status)
                fmObj.status = f.metadata.status;
            if (f.metadata.source)
                fmObj.source = f.metadata.source;
            const fmYaml = yaml.dump(fmObj);
            fs.writeFileSync(f.file, '---\n' + fmYaml + '---\n\n' + newContent, 'utf-8');
            filesChanged++;
        }
    }
    return { linksRewired, headingsDeduped, filesChanged, depsAutoWired };
}
function ingest(rawFile, targetDir) {
    let content;
    try {
        content = fs.readFileSync(rawFile, 'utf-8');
    }
    catch {
        return null;
    }
    const fm = (0, frontmatter_js_1.extractFrontmatter)(content);
    const body = fm.content;
    const title = (0, helpers_js_1.extractFirstHeading)(body) || path.basename(rawFile, '.md');
    const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md';
    const fragPath = path.join(targetDir, fileName);
    const tags = fm.metadata && fm.metadata.tags ? (Array.isArray(fm.metadata.tags) ? fm.metadata.tags : [fm.metadata.tags]) : extractTags(body, []);
    const description = extractDescription(body);
    const source = path.basename(rawFile);
    const fmObj = { title, description, tags, depends_on: [], source, status: 'draft' };
    if (fm.metadata && fm.metadata.date)
        fmObj.date = fm.metadata.date;
    if (fm.metadata && fm.metadata.author)
        fmObj.author = fm.metadata.author;
    const fmYaml = yaml.dump(fmObj);
    fs.writeFileSync(fragPath, '---\n' + fmYaml + '---\n\n' + body, 'utf-8');
    const indexPath = updateIndex(targetDir);
    const logPath = updateLog(targetDir, 'ingest', title);
    return { fragment: fragPath, index: indexPath || '', log: logPath };
}
//# sourceMappingURL=wiki.js.map