#!/usr/bin/env python3
"""Extract hedge words from words/hedges → src/sentences/hedges.jsonl

Source: https://github.com/words/hedges/blob/master/data.txt
Fetched at runtime if possible, otherwise falls back to a curated seed.
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'hedges.jsonl'
HEDGES_URL = 'https://raw.githubusercontent.com/words/hedges/master/data.txt'

SEED = [
    {"id": "hedge-001", "pattern": "always", "replacement": "often", "confidence": 0.7, "tags": ["absolute"]},
    {"id": "hedge-002", "pattern": "never", "replacement": "rarely", "confidence": 0.7, "tags": ["absolute"]},
    {"id": "hedge-003", "pattern": "everyone", "replacement": "many", "confidence": 0.6, "tags": ["generalization"]},
    {"id": "hedge-004", "pattern": "no one", "replacement": "few", "confidence": 0.6, "tags": ["generalization"]},
    {"id": "hedge-005", "pattern": "impossible", "replacement": "challenging", "confidence": 0.5, "tags": ["certainty"]},
    {"id": "hedge-006", "pattern": "everybody", "replacement": "most", "confidence": 0.6, "tags": ["generalization"]},
]

def try_hedges() -> int:
    try:
        resp = urllib.request.urlopen(HEDGES_URL, timeout=10)
        text = resp.read().decode('utf-8')
        count = 0
        with open(OUT, 'w') as f:
            for line in text.splitlines():
                line = line.strip()
                if not line or line.startswith('%'):
                    continue
                f.write(json.dumps({
                    "id": f"hedge-{count + 1:04d}",
                    "pattern": line,
                    "replacement": "",
                    "confidence": 0.5,
                    "tags": ["hedge"],
                }) + chr(10))
                count += 1
        return count
    except Exception as e:
        print(f"  [SKIP] Hedges fetch failed: {e}", file=sys.stderr)
        return 0

def write_seed() -> int:
    with open(OUT, 'w') as f:
        for e in SEED:
            f.write(json.dumps(e) + chr(10))
    return len(SEED)

print('[6/6] hedges.jsonl ...', end=' ', flush=True)
count = try_hedges() if len(sys.argv) > 1 and sys.argv[1] == '--fetch' else 0
if count == 0:
    count = write_seed()
    print(f'seed ({count} records)')
else:
    print(f'words/hedges ({count} records)')
