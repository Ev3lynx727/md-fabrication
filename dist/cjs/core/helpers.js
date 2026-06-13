"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKIP_DIRS = exports.COMMON_STOP = void 0;
exports.isInCodeBlock = isInCodeBlock;
exports.getPositionalArg = getPositionalArg;
exports.getPositionalArgs = getPositionalArgs;
exports.getFlagArg = getFlagArg;
exports.extractFirstHeading = extractFirstHeading;
exports.anchorName = anchorName;
exports.countTokens = countTokens;
exports.COMMON_STOP = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any',
    'no', 'not', 'only', 'very', 'just', 'so', 'too', 'also', 'than',
    'then', 'now', 'here', 'there', 'about', 'into', 'over', 'such',
    'way', 'use', 'used', 'using', 'make', 'made', 'making', 'get', 'got',
    'one', 'two', 'like', 'well', 'back', 'even', 'still', 'much', 'yet',
    '---', 'source',
]);
exports.SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg',
    'services', 'data', 'appendonlydir',
    'dist', 'build', '__pycache__', '.next', 'coverage', 'log'
]);
function isInCodeBlock(lines, index) {
    let inBlock = false;
    for (let i = 0; i <= index; i++) {
        if (lines[i].trimStart().startsWith('```'))
            inBlock = !inBlock;
    }
    return inBlock;
}
function getPositionalArg(start) {
    for (let i = start; i < process.argv.length; i++) {
        if (!process.argv[i].startsWith('-'))
            return process.argv[i];
    }
    return '';
}
function getPositionalArgs(start) {
    const out = [];
    for (let i = start; i < process.argv.length; i++) {
        if (!process.argv[i].startsWith('-'))
            out.push(process.argv[i]);
    }
    return out;
}
function getFlagArg(flag) {
    const idx = process.argv.indexOf(flag);
    return idx > 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}
function extractFirstHeading(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
}
function anchorName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function countTokens(text) {
    try {
        const { encodingForModel } = require('js-tiktoken');
        return encodingForModel('gpt-4').encode(text).length;
    }
    catch {
        return Math.ceil(text.length / 4);
    }
}
//# sourceMappingURL=helpers.js.map