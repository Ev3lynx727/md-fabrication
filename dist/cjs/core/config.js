"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadVoiceConfig = loadVoiceConfig;
exports.getValidVoices = getValidVoices;
exports.getTimezone = getTimezone;
exports.getTomlConfig = getTomlConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const resolve_root_js_1 = require("./resolve-root.js");
const CONFIG_PATH = path.join(resolve_root_js_1.PROJECT_ROOT, 'config.yaml');
let VOICE_CONFIG = null;
let TIMEZONE = null;
function loadVoiceConfig() {
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
function getValidVoices() {
    return Object.keys(loadVoiceConfig().profiles);
}
function getTimezone() {
    loadVoiceConfig();
    return TIMEZONE;
}
function getTomlConfig(tomlPath) {
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