export const readmeTransforms = [
    {
        type: 'regex',
        priority: 10,
        apply(content) {
            const lines = content.split('\n');
            let inBadgeRow = false;
            const result = [];
            let i = 0;
            while (i < lines.length) {
                const line = lines[i];
                if (/^\[!\[/.test(line) || /^<img/.test(line) || /^\s*$/.test(line) && i + 1 < lines.length && /^\[!\[/.test(lines[i + 1])) {
                    if (!inBadgeRow) {
                        result.push('<!-- BADGES -->');
                        inBadgeRow = true;
                    }
                    if (/^\s*$/.test(line)) {
                        i++;
                        continue;
                    }
                    result.push(line);
                }
                else {
                    if (inBadgeRow) {
                        inBadgeRow = false;
                    }
                    result.push(line);
                }
                i++;
            }
            return result.join('\n');
        }
    },
    {
        type: 'structural',
        priority: 20,
        apply(content) {
            const lines = content.split('\n');
            let h1Found = false;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('# ') && !h1Found) {
                    h1Found = true;
                }
            }
            if (!h1Found) {
                lines.unshift('# Project\n');
            }
            return lines.join('\n');
        }
    }
];
//# sourceMappingURL=readme.js.map