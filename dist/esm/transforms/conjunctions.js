export function softenConjunctions(text) {
    const patterns = [
        [/\bFirstly\b,/gi, 'First,'],
        [/\bSecondly\b,/gi, 'Second,'],
        [/\bThirdly\b,/gi, 'Third,'],
        [/\bFourthly\b,/gi, 'Fourth,'],
        [/\bLastly\b,/gi, 'Finally,'],
        [/\bIn conclusion\b,/gi, 'To wrap up,'],
        [/\bMoreover\b,/gi, "What's more,"],
        [/\bFurthermore\b,/gi, 'Beyond that,'],
        [/\bAdditionally\b,/gi, 'Also,'],
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
//# sourceMappingURL=conjunctions.js.map