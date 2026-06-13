"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changelogTransforms = void 0;
exports.changelogTransforms = [
    {
        type: 'regex',
        priority: 10,
        apply(content) {
            const lines = content.split('\n');
            const result = [];
            for (const line of lines) {
                if (/^##\s+\d+\.\d+\.\d+/i.test(line)) {
                    result.push(line.replace(/^##\s+/, '## v'));
                }
                else {
                    result.push(line);
                }
            }
            return result.join('\n');
        }
    }
];
//# sourceMappingURL=changelog.js.map