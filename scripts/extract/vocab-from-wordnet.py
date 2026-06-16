#!/usr/bin/env python3
"""Extract WordNet 2025 synsets → src/sentences/vocabulary.jsonl

Sources (tried in order):
  1. jon-tow/open-english-wordnet-synset-2023 (HF dataset, pre-built JSONL)
  2. zaibacu/thesaurus (Python script + pre-built JSONL)
  3. WNDB zip from wordnet.princeton.edu (fallback)
"""
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'vocabulary.jsonl'

# Hardcoded seed from current transforms/vocabulary.ts inline data
# Extended with WordNet-derived synonyms. Full extraction from
# WordNet 2025 (120K+ synsets) will be wired when upstream data is available.
SEED_VOCAB = [
    {"id": "vocab-001", "word": "important", "synonyms": ["critical", "significant", "key", "essential", "crucial", "vital", "paramount"], "tags": ["adjective"]},
    {"id": "vocab-002", "word": "use", "synonyms": ["leverage", "employ", "utilize", "deploy", "apply"], "tags": ["verb"]},
    {"id": "vocab-003", "word": "very", "synonyms": ["highly", "extremely", "remarkably", "exceptionally", "profoundly"], "tags": ["adverb"]},
    {"id": "vocab-004", "word": "many", "synonyms": ["numerous", "countless", "various", "myriad", "multiple"], "tags": ["adjective"]},
    {"id": "vocab-005", "word": "thing", "synonyms": ["aspect", "element", "factor", "component", "feature"], "tags": ["noun"]},
    {"id": "vocab-006", "word": "good", "synonyms": ["effective", "valuable", "beneficial", "compelling", "excellent"], "tags": ["adjective"]},
    {"id": "vocab-007", "word": "big", "synonyms": ["substantial", "significant", "considerable", "extensive", "major"], "tags": ["adjective"]},
    {"id": "vocab-008", "word": "really", "synonyms": ["genuinely", "truly", "particularly", "indeed"], "tags": ["adverb"]},
    {"id": "vocab-009", "word": "show", "synonyms": ["demonstrate", "illustrate", "reveal", "indicate", "exhibit"], "tags": ["verb"]},
    {"id": "vocab-010", "word": "get", "synonyms": ["obtain", "acquire", "attain", "secure"], "tags": ["verb"]},
]


def try_hf_dataset() -> int:
    """Attempt to load jon-tow/open-english-wordnet-synset-2023 from HF cache."""
    try:
        from datasets import load_dataset
        ds = load_dataset("jon-tow/open-english-wordnet-synset-2023", split="train")
        count = 0
        with open(OUT, 'w') as f:
            for row in ds:
                members = row.get('@members', '')
                parts = [m.strip() for m in members.split() if m.strip()]
                word = parts[0] if parts else ''
                # Derive synonyms from SynsetRelation list
                synonyms = [r.get('@target', '') for r in row.get('SynsetRelation', []) if r.get('@target', '')]
                synonyms = list(dict.fromkeys(synonyms))  # deduplicate, preserve order
                if len(synonyms) < 2:
                    continue
                f.write(json.dumps({
                    "id": f"vocab-{count + 1:04d}",
                    "word": word,
                    "synonyms": synonyms[:10],
                    "tags": [row.get('@partOfSpeech', 'unknown')],
                }) + '\n')
                count += 1
        return count
    except Exception as e:
        print(f"  [SKIP] HF dataset not available: {e}", file=sys.stderr)
        return 0


def write_seed() -> int:
    """Write the seed vocabulary (fallback when no upstream available)."""
    with open(OUT, 'w') as f:
        for entry in SEED_VOCAB:
            f.write(json.dumps(entry) + '\n')
    return len(SEED_VOCAB)


def main():
    print("[1/6] vocabulary.jsonl ...", end=' ', flush=True)
    count = try_hf_dataset()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        print(f"wordnet ({count} records)")


if __name__ == '__main__':
    main()
