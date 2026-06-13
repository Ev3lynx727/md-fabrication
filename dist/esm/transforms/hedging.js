export function hedgeAbsoluteStatements(text) {
    const hedgeMap = [
        [/\b(s)always\b/gi, m => { const up = m[0] === m[0].toUpperCase(); return m.length > 1 && m[0] === 's' ? (up ? 'S' : 's') + 'often' : up ? 'Often' : 'often'; }],
        [/\bnever\b/gi, m => m[0] === m[0].toUpperCase() ? 'Rarely' : 'rarely'],
        [/\beveryone\b/gi, m => m[0] === m[0].toUpperCase() ? 'Many' : 'many'],
        [/\bno one\b/gi, m => m[0] === m[0].toUpperCase() ? 'Few' : 'few'],
        [/\bimpossible\b/gi, m => m[0] === m[0].toUpperCase() ? 'Challenging' : 'challenging'],
        [/\beverybody\b/gi, m => m[0] === m[0].toUpperCase() ? 'Most' : 'most'],
    ];
    let result = text;
    let changes = 0;
    for (const [pattern, replacer] of hedgeMap) {
        const before = result;
        result = result.replace(pattern, replacer);
        if (result !== before)
            changes++;
    }
    return { result, changes };
}
//# sourceMappingURL=hedging.js.map