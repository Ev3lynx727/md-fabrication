export function passiveToActive(text) {
    const patterns = [
        [/\bwas written\b/gi, 'wrote'],
        [/\bwas created\b/gi, 'created'],
        [/\bwas built\b/gi, 'built'],
        [/\bwas developed\b/gi, 'developed'],
        [/\bwas designed\b/gi, 'designed'],
        [/\bwas implemented\b/gi, 'implemented'],
        [/\bwas conducted\b/gi, 'conducted'],
        [/\bwas performed\b/gi, 'performed'],
        [/\bwas carried out\b/gi, 'performed'],
        [/\bwas observed\b/gi, 'observed'],
        [/\bwas found\b/gi, 'found'],
        [/\bwas considered\b/gi, 'considered'],
        [/\bwas defined\b/gi, 'defined'],
        [/\bwas generated\b/gi, 'generated'],
        [/\bwas processed\b/gi, 'processed'],
        [/\bare written\b/gi, 'write'],
        [/\bare created\b/gi, 'create'],
        [/\bare built\b/gi, 'build'],
        [/\bare developed\b/gi, 'develop'],
        [/\bare implemented\b/gi, 'implement'],
        [/\bare conducted\b/gi, 'conduct'],
        [/\bare performed\b/gi, 'perform'],
        [/\bare carried out\b/gi, 'perform'],
        [/\bare observed\b/gi, 'observe'],
        [/\bare found\b/gi, 'find'],
        [/\bare considered\b/gi, 'consider'],
        [/^It is important to note that /gmi, ''],
        [/^It should be noted that /gmi, ''],
        [/^It is worth mentioning that /gmi, ''],
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
//# sourceMappingURL=passive.js.map