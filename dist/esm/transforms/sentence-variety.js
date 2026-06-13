import { isInCodeBlock } from '../core/helpers.js';
export function varySentenceOpenings(text) {
    const lines = text.split('\n');
    let changes = 0;
    const intros = ['In practice,', 'Notably,', 'Specifically,', 'In many cases,', 'Typically,', 'Fundamentally,'];
    for (let i = 0; i < lines.length; i++) {
        if (isInCodeBlock(lines, i))
            continue;
        const trimmed = lines[i].trim();
        if (!trimmed)
            continue;
        if (trimmed.match(/^(The |This |It |We |They |There )/) && trimmed.length > 50 && changes < 5) {
            if (Math.random() < 0.3) {
                const intro = intros[Math.floor(Math.random() * intros.length)];
                lines[i] = intro + ' ' + trimmed[0].toLowerCase() + trimmed.slice(1);
                changes++;
            }
        }
    }
    return { result: lines.join('\n'), changes };
}
//# sourceMappingURL=sentence-variety.js.map