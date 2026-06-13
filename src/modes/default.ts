import { Transform } from '../core/types.js'
import { fabricateText } from '../transforms/fabricate.js'
import { loadVoiceConfig } from '../core/config.js'

const placeholderTransform: Transform = {
  type: 'regex',
  priority: 1,
  apply(content: string): string {
    return content
  }
}

export const defaultTransforms: Transform[] = [
  {
    ...placeholderTransform,
    priority: 10,
    apply: (c: string) => {
      const cfg = loadVoiceConfig()
      const profile = cfg.profiles[cfg.default]
      return fabricateText(c, profile).transformed
    }
  }
]
