import { Transform } from '../core/types.js'

export const defaultTransforms: Transform[] = [
  {
    type: 'regex',
    priority: 1,
    apply(content: string): string {
      return content
    }
  }
]
