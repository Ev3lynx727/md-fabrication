import { softenConjunctions } from './conjunctions.js';
import { passiveToActive } from './passive.js';
import { applyContractions } from './contractions.js';
import { addTransitions } from './transitions.js';
import { adjustPacing } from './pacing.js';
import { removeRepetitivePhrases } from './repetitive.js';
import { diversifyVocabulary } from './vocabulary.js';
import { hedgeAbsoluteStatements } from './hedging.js';
import { addConjunctionStarts } from './conjunction-starts.js';
import { varySentenceOpenings } from './sentence-variety.js';
export function fabricateText(content, profile) {
    let text = content;
    const changes = { conj: 0, passive: 0, cont: 0, trans: 0, pace: 0, vocab: 0, hedge: 0, conjStart: 0, sentStart: 0 };
    if (profile.conjunctionSoftening) {
        const t = softenConjunctions(text);
        text = t.result;
        changes.conj = t.changes;
    }
    if (profile.passiveToActive) {
        const t = passiveToActive(text);
        text = t.result;
        changes.passive = t.changes;
    }
    const t3 = applyContractions(text, profile);
    text = t3.result;
    changes.cont = t3.changes;
    if (profile.repetitivePhrases) {
        const t = removeRepetitivePhrases(text);
        text = t.result;
    }
    if (profile.transitions) {
        const t = addTransitions(text);
        text = t.result;
        changes.trans = t.changes;
    }
    if (profile.pacing) {
        const t = adjustPacing(text);
        text = t.result;
        changes.pace = t.changes;
    }
    if (profile.vocabularyDiversity) {
        const t = diversifyVocabulary(text);
        text = t.result;
        changes.vocab = t.changes;
    }
    if (profile.hedgePhrases) {
        const t = hedgeAbsoluteStatements(text);
        text = t.result;
        changes.hedge = t.changes;
    }
    if (profile.conjunctionStarts) {
        const t = addConjunctionStarts(text);
        text = t.result;
        changes.conjStart = t.changes;
    }
    if (profile.sentenceVariety) {
        const t = varySentenceOpenings(text);
        text = t.result;
        changes.sentStart = t.changes;
    }
    return {
        transformed: text,
        summary: {
            sentencesRestructured: changes.conj,
            transitionsAdded: changes.trans,
            contractionsApplied: changes.cont,
            passiveToActive: changes.passive,
            conjunctionSoftened: changes.conj,
            pacingAdjusted: changes.pace,
            vocabularyDiversified: changes.vocab,
            hedgePhrasesInjected: changes.hedge,
            conjunctionStartsAdded: changes.conjStart,
            sentenceOpeningsVaried: changes.sentStart
        }
    };
}
//# sourceMappingURL=fabricate.js.map