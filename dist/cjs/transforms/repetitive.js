"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeRepetitivePhrases = removeRepetitivePhrases;
function removeRepetitivePhrases(text) {
    const patterns = [
        [/In order to\b/gi, 'To'],
        [/Due to the fact that\b/gi, 'Because'],
        [/At the end of the day\b/gi, 'Ultimately'],
        [/In the event that\b/gi, 'If'],
        [/On a daily basis\b/gi, 'Daily'],
        [/In a timely manner\b/gi, 'Promptly'],
        [/The vast majority of\b/gi, 'Most'],
        [/A significant number of\b/gi, 'Many'],
        [/Is able to\b/gi, 'Can'],
        [/Has the ability to\b/gi, 'Can'],
    ];
    let result = text;
    let changes = 0;
    for (const [pattern, replacement] of patterns) {
        const before = result;
        result = result.replace(pattern, replacement);
        if (result !== before)
            changes++;
    }
    return { result, changes };
}
//# sourceMappingURL=repetitive.js.map