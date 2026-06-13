"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTransitions = addTransitions;
const helpers_js_1 = require("../core/helpers.js");
const TRANSITIONS = [
    'However,', 'That said,', 'More importantly,', 'Meanwhile,',
    'Furthermore,', 'In addition,', 'On the other hand,',
    'As a result,', 'Notably,', 'Specifically,',
    'In practice,', 'Beyond that,', 'Consequently,',
    'For context,', 'To illustrate,'
];
function addTransitions(text) {
    const lines = text.split('\n');
    let changes = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if ((0, helpers_js_1.isInCodeBlock)(lines, i))
            continue;
        if (line === '' || line.startsWith('#') || line.startsWith('>') || line.startsWith('-') || line.startsWith('*'))
            continue;
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        if (prevLine === '' && i > 1) {
            const prevContent = i > 1 ? lines[i - 2].trim() : '';
            if (prevContent && prevContent.length > 40 && line.length > 20 && !line.match(/^(However|That said|More importantly|Meanwhile|Furthermore|In addition|On the other hand|As a result|Notably|Specifically|In practice|Beyond that|Consequently|For context|To illustrate)/i)) {
                const transition = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
                lines[i] = transition + ' ' + line;
                changes++;
            }
        }
    }
    return { result: lines.join('\n'), changes };
}
//# sourceMappingURL=transitions.js.map