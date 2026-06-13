export function diversifyVocabulary(text: string): { result: string; changes: number } {
  const vocabMap: [RegExp, string[]][] = [
    [/\bimportant\b/gi, ['critical', 'significant', 'key', 'essential', 'crucial']],
    [/\buse\b/gi, ['leverage', 'employ', 'utilize']],
    [/\bvery\b/gi, ['highly', 'extremely', 'remarkably', 'exceptionally']],
    [/\bmany\b/gi, ['numerous', 'countless', 'various', 'myriad']],
    [/\bthing\b/gi, ['aspect', 'element', 'factor', 'component']],
    [/\bgood\b/gi, ['effective', 'valuable', 'beneficial', 'compelling']],
    [/\bbig\b/gi, ['substantial', 'significant', 'considerable', 'extensive']],
    [/\breally\b/gi, ['genuinely', 'truly', 'particularly']],
    [/\bshow\b/gi, ['demonstrate', 'illustrate', 'reveal', 'indicate']],
    [/\bget\b/gi, ['obtain', 'acquire', 'attain']],
  ]
  let result = text
  let changes = 0
  for (const [pattern, replacements] of vocabMap) {
    const before = result
    result = result.replace(pattern, () => replacements[Math.floor(Math.random() * replacements.length)])
    if (result !== before) changes++
  }
  return { result, changes }
}
