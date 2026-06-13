import { isInCodeBlock } from '../core/helpers.js';
export function adjustPacing(text) {
    const lines = text.split('\n');
    let changes = 0;
    for (let i = 1; i < lines.length; i++) {
        if (isInCodeBlock(lines, i))
            continue;
        const line = lines[i].trim();
        const prevLine = lines[i - 1].trim();
        if (line.length > 100 && prevLine.length > 100 && !line.startsWith('#') && !prevLine.startsWith('#')) {
            const mid = Math.floor(line.length / 2);
            const breakPoint = line.indexOf('. ', mid);
            if (breakPoint > 0 && breakPoint < line.length - 2) {
                lines[i] = line.substring(0, breakPoint + 1) + '\n' + line.substring(breakPoint + 2);
                changes++;
            }
        }
    }
    return { result: lines.join('\n'), changes };
}
//# sourceMappingURL=pacing.js.map