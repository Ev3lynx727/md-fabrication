import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PROJECT_ROOT } from './resolve-root.js';
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.yaml');
let VOICE_CONFIG = null;
let TIMEZONE = null;
export function loadVoiceConfig() {
    if (VOICE_CONFIG)
        return VOICE_CONFIG;
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = yaml.load(raw);
        VOICE_CONFIG = {
            default: parsed.voice?.default || 'professional',
            profiles: parsed.voice?.profiles || {}
        };
        TIMEZONE = parsed.timezone || 'UTC';
        return VOICE_CONFIG;
    }
    catch {
        VOICE_CONFIG = {
            default: 'professional',
            profiles: {
                professional: { contractions: false, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false },
                casual: { contractions: true, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false },
                technical: { contractions: false, transitions: false, passiveToActive: true, conjunctionSoftening: false, pacing: false, repetitivePhrases: true, vocabularyDiversity: false, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false }
            }
        };
        return VOICE_CONFIG;
    }
}
export function getValidVoices() {
    return Object.keys(loadVoiceConfig().profiles);
}
export function getTimezone() {
    loadVoiceConfig();
    return TIMEZONE;
}
export function getTomlConfig(tomlPath) {
    try {
        const content = fs.readFileSync(tomlPath, 'utf-8');
        const config = {};
        let inConfigSection = false;
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed === '[tool.md-fabrication.config]') {
                inConfigSection = true;
                return;
            }
            if (inConfigSection) {
                if (trimmed.startsWith('[')) {
                    inConfigSection = false;
                    return;
                }
                if (trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                    config[key.trim()] = value;
                }
            }
        });
        return config;
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=config.js.map