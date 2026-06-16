#!/usr/bin/env python3
"""Extract TOEFL vocabulary → src/sentences/vocabulary.jsonl

Sources (tried in order):
  1. wordlevel/toefl-essential-vocabulary-1k (HF dataset, 1000 records)
  2. Seed vocabulary from transforms/vocabulary.ts (fallback, 10 records)
"""
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'vocabulary.jsonl'

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

SEEN_WORDS = set()


def try_hf_toefl() -> int:
    """Fetch wordlevel/toefl-essential-vocabulary-1k from HuggingFace."""
    try:
        import urllib.request
        url = "https://huggingface.co/datasets/wordlevel/toefl-essential-vocabulary-1k/resolve/main/toefl_essential_vocabulary.json"
        resp = urllib.request.urlopen(url, timeout=30)
        data = json.loads(resp.read())
        count = 0
        with open(OUT, 'w') as f:
            for i, row in enumerate(data):
                word = row['word'].lower().strip()
                if ' ' in word:
                    continue
                synonyms = row.get('synonyms', [])
                if not synonyms:
                    continue
                f.write(json.dumps({
                    "id": f"toefl-{i + 1:04d}",
                    "word": word,
                    "synonyms": synonyms,
                    "tags": [row.get('pos', 'unknown')],
                }) + '\n')
                SEEN_WORDS.add(word)
                count += 1
        return count
    except Exception as e:
        print(f"  [SKIP] TOEFL dataset not available: {e}", file=sys.stderr)
        return 0


def merge_seed(count: int) -> int:
    """Append seed entries not already in the dataset."""
    added = 0
    with open(OUT, 'a') as f:
        for entry in SEED_VOCAB:
            if entry['word'] in SEEN_WORDS:
                continue
            f.write(json.dumps(entry) + '\n')
            added += 1
    return added


def main():
    print("[1/9] vocabulary.jsonl ...", end=' ', flush=True)
    count = try_hf_toefl()
    if count == 0:
        count = len(SEED_VOCAB)
        with open(OUT, 'w') as f:
            for entry in SEED_VOCAB:
                f.write(json.dumps(entry) + '\n')
        print(f"seed ({count} records)")
    else:
        merged = merge_seed(count)
        print(f"toefl ({count} records, {merged} seed merged)")


if __name__ == '__main__':
    main()
