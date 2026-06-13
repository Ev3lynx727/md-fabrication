import { Transform } from '../core/types.js'

export const tutorialTransforms: Transform[] = [
  {
    type: 'structural',
    priority: 10,
    apply(content: string): string {
      return content
    }
  }
]
