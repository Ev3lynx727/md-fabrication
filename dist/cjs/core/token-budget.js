"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
const js_tiktoken_1 = require("js-tiktoken");
function countTokens(text) {
    try {
        return (0, js_tiktoken_1.encodingForModel)('gpt-4').encode(text).length;
    }
    catch {
        return Math.ceil(text.length / 4);
    }
}
//# sourceMappingURL=token-budget.js.map