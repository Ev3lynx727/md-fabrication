import { Transform } from '../core/types.js'

export const newsletterTransforms: Transform[] = [
  {
    type: 'structural',
    priority: 10,
    apply(content: string): string {
      return content
    }
  }
]
