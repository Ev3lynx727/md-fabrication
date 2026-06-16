import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { VoiceConfig, VoiceProfile } from './types.js'
import { PROJECT_ROOT } from './resolve-root.js'

function resolveConfigPath(): string {
  const cwdConfig = path.join(process.cwd(), 'config.yaml')
  if (fs.existsSync(cwdConfig)) return cwdConfig
  return path.join(PROJECT_ROOT, 'config.yaml')
}

const CONFIG_PATH = resolveConfigPath()

let VOICE_CONFIG: VoiceConfig | null = null
let TIMEZONE: string | null = null

export function loadVoiceConfig(): VoiceConfig {
  if (VOICE_CONFIG) return VOICE_CONFIG
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = yaml.load(raw) as { voice?: { default?: string; profiles?: Record<string, VoiceProfile> }; timezone?: string }
    VOICE_CONFIG = {
      default: parsed.voice?.default || 'professional',
      profiles: parsed.voice?.profiles || {}
    }
    TIMEZONE = parsed.timezone || 'UTC'
    return VOICE_CONFIG
  } catch {
    VOICE_CONFIG = {
      default: 'professional',
      profiles: {
        casual: { contractions: true, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: true, hedgePhrases: true, conjunctionStarts: true, sentenceVariety: true, bannedWords: true },
        professional: { contractions: false, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: true, hedgePhrases: true, conjunctionStarts: false, sentenceVariety: true, bannedWords: true },
        technical: { contractions: false, transitions: false, passiveToActive: true, conjunctionSoftening: false, pacing: false, repetitivePhrases: true, vocabularyDiversity: true, hedgePhrases: false, conjunctionStarts: false, sentenceVariety: false, bannedWords: true },
        'personal-branding': { contractions: true, transitions: true, passiveToActive: true, conjunctionSoftening: true, pacing: true, repetitivePhrases: true, vocabularyDiversity: true, hedgePhrases: false, conjunctionStarts: true, sentenceVariety: true, bannedWords: true }
      }
    }
    return VOICE_CONFIG
  }
}

export function getValidVoices(): string[] {
  return Object.keys(loadVoiceConfig().profiles)
}

export function getTimezone(): string | null {
  loadVoiceConfig()
  return TIMEZONE
}

export function getTomlConfig(tomlPath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(tomlPath, 'utf-8')
    const config: Record<string, string> = {}
    let inConfigSection = false
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed === '[tool.md-fabrication.config]') { inConfigSection = true; return }
      if (inConfigSection) {
        if (trimmed.startsWith('[')) { inConfigSection = false; return }
        if (trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
          config[key.trim()] = value
        }
      }
    })
    return config
  } catch { return {} }
}
