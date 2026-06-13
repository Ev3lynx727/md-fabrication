"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fabricateText = fabricateText;
const conjunctions_js_1 = require("./conjunctions.js");
const passive_js_1 = require("./passive.js");
const contractions_js_1 = require("./contractions.js");
const transitions_js_1 = require("./transitions.js");
const pacing_js_1 = require("./pacing.js");
const repetitive_js_1 = require("./repetitive.js");
const vocabulary_js_1 = require("./vocabulary.js");
const hedging_js_1 = require("./hedging.js");
const conjunction_starts_js_1 = require("./conjunction-starts.js");
const sentence_variety_js_1 = require("./sentence-variety.js");
function fabricateText(content, profile) {
    let text = content;
    const changes = { conj: 0, passive: 0, cont: 0, trans: 0, pace: 0, vocab: 0, hedge: 0, conjStart: 0, sentStart: 0 };
    if (profile.conjunctionSoftening) {
        const t = (0, conjunctions_js_1.softenConjunctions)(text);
        text = t.result;
        changes.conj = t.changes;
    }
    if (profile.passiveToActive) {
        const t = (0, passive_js_1.passiveToActive)(text);
        text = t.result;
        changes.passive = t.changes;
    }
    const t3 = (0, contractions_js_1.applyContractions)(text, profile);
    text = t3.result;
    changes.cont = t3.changes;
    if (profile.repetitivePhrases) {
        const t = (0, repetitive_js_1.removeRepetitivePhrases)(text);
        text = t.result;
    }
    if (profile.transitions) {
        const t = (0, transitions_js_1.addTransitions)(text);
        text = t.result;
        changes.trans = t.changes;
    }
    if (profile.pacing) {
        const t = (0, pacing_js_1.adjustPacing)(text);
        text = t.result;
        changes.pace = t.changes;
    }
    if (profile.vocabularyDiversity) {
        const t = (0, vocabulary_js_1.diversifyVocabulary)(text);
        text = t.result;
        changes.vocab = t.changes;
    }
    if (profile.hedgePhrases) {
        const t = (0, hedging_js_1.hedgeAbsoluteStatements)(text);
        text = t.result;
        changes.hedge = t.changes;
    }
    if (profile.conjunctionStarts) {
        const t = (0, conjunction_starts_js_1.addConjunctionStarts)(text);
        text = t.result;
        changes.conjStart = t.changes;
    }
    if (profile.sentenceVariety) {
        const t = (0, sentence_variety_js_1.varySentenceOpenings)(text);
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