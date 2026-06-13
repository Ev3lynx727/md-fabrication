import { encodingForModel } from 'js-tiktoken'

export function countTokens(text: string): number {
  try { return encodingForModel('gpt-4').encode(text).length }
  catch { return Math.ceil(text.length / 4) }
}
