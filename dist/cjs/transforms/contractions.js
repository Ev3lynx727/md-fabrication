"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyContractions = applyContractions;
function applyContractions(text, profile) {
    if (!profile.contractions)
        return { result: text, changes: 0 };
    const patterns = [
        [/\bdo not\b/gi, "don't"],
        [/\bdoes not\b/gi, "doesn't"],
        [/\bdid not\b/gi, "didn't"],
        [/\bwill not\b/gi, "won't"],
        [/\bcannot\b/gi, "can't"],
        [/\bcould not\b/gi, "couldn't"],
        [/\bshould not\b/gi, "shouldn't"],
        [/\bwould not\b/gi, "wouldn't"],
        [/\bhave not\b/gi, "haven't"],
        [/\bhas not\b/gi, "hasn't"],
        [/\bhad not\b/gi, "hadn't"],
        [/\bis not\b/gi, "isn't"],
        [/\bare not\b/gi, "aren't"],
        [/\bwas not\b/gi, "wasn't"],
        [/\bwere not\b/gi, "weren't"],
        [/\bit is\b/gi, "it's"],
        [/\bthat is\b/gi, "that's"],
        [/\bthere is\b/gi, "there's"],
        [/\bhere is\b/gi, "here's"],
        [/\bwhat is\b/gi, "what's"],
        [/\bwho is\b/gi, "who's"],
        [/\blet us\b/gi, "let's"],
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
//# sourceMappingURL=contractions.js.map