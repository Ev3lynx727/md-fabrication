const placeholderTransform = {
    type: 'regex',
    priority: 1,
    apply(content) {
        return content;
    }
};
export const defaultTransforms = [
    {
        ...placeholderTransform,
        priority: 10,
        apply: (c) => {
            const { fabricateText } = require('../transforms/fabricate.js');
            const { loadVoiceConfig } = require('../core/config.js');
            const cfg = loadVoiceConfig();
            const profile = cfg.profiles[cfg.default];
            return fabricateText(c, profile).transformed;
        }
    }
];
//# sourceMappingURL=default.js.map