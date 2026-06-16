#!/usr/bin/env python3
"""Extract hedge words from words/hedges → src/sentences/hedges.jsonl

Sources (tried in order):
  1. words/hedges (npm package, raw GitHub)
  2. Hardcoded seed (current pattern→replacement pairs)
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'hedges.jsonl'
HEDGES_URL = 'https://raw.githubusercontent.com/words/hedges/master/index.js'

SEED_HEDGES = [
    {"id": "hedge-001", "pattern": "always", "replacement": "often", "confidence": 0.7, "tags": ["absolute"]},
    {"id": "hedge-002", "pattern": "never", "replacement": "rarely", "confidence": 0.7, "tags": ["absolute"]},
    {"id": "hedge-003", "pattern": "everyone", "replacement": "many", "confidence": 0.6, "tags": ["generalization"]},
    {"id": "hedge-004", "pattern": "no one", "replacement": "few", "confidence": 0.6, "tags": ["generalization"]},
    {"id": "hedge-005", "pattern": "impossible", "replacement": "challenging", "confidence": 0.5, "tags": ["certainty"]},
    {"id": "hedge-006", "pattern": "everybody", "replacement": "most", "confidence": 0.6, "tags": ["generalization"]},
]

HEDGE_TAG_MAP = {
    "about": "approximator", "almost": "approximator", "approximately": "approximator", "around": "approximator",
    "basically": "shielder", "essentially": "shielder", "generally": "shielder",
    "likely": "plausibility", "maybe": "plausibility", "perhaps": "plausibility", "possibly": "plausibility", "probably": "plausibility",
    "apparently": "evidential", "evidently": "evidential", "presumably": "evidential", "reportedly": "evidential", "seems": "evidential", "appear": "evidential",
    "arguably": "plausibility", "conceivably": "plausibility",
    "assert": "adaptor", "claim": "adaptor", "suggest": "adaptor", "believe": "adaptor", "think": "adaptor", "assume": "adaptor",
}


def try_words_hedges() -> int:
    try:
        resp = urllib.request.urlopen(HEDGES_URL, timeout=10)
        text = resp.read().decode('utf-8')
        lines = text.split('\n')
        count = 0
        idx = len(SEED_HEDGES)
        with open(OUT, 'w') as f:
            for entry in SEED_HEDGES:
                f.write(json.dumps(entry) + '\n')
            in_array = False
            for line in lines:
                raw = line.strip()
                if '[' in raw:
                    in_array = True
                if not in_array:
                    continue
                if raw == ']':
                    break
                word = raw.rstrip(',').strip().strip("'").strip('"')
                if not word or word.startswith('/') or word.startswith('*'):
                    continue
                tag = HEDGE_TAG_MAP.get(word, "hedge")
                idx += 1
                f.write(json.dumps({
                    "id": f"hedge-{idx:03d}",
                    "pattern": word,
                    "replacement": "",
                    "confidence": 0.5,
                    "tags": [tag, "linguistic-hedge"],
                }) + '\n')
                count += 1
        return count
    except Exception as e:
        print(f"  [SKIP] words/hedges fetch failed: {e}", file=sys.stderr)
        return 0


def write_seed() -> int:
    with open(OUT, 'w') as f:
        for entry in SEED_HEDGES:
            f.write(json.dumps(entry) + '\n')
    return len(SEED_HEDGES)


def main():
    print("[6/6] hedges.jsonl ...", end=' ', flush=True)
    count = try_words_hedges()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        seed_count = len(SEED_HEDGES)
        total = seed_count + count
        print(f"words/hedges ({count} + {seed_count} seed = {total} records)")


if __name__ == '__main__':
    main()
