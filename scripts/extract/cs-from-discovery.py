#!/usr/bin/env python3
"""Extract single-word conjunction markers → src/sentences/conjunction-starts.jsonl"""
import json
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'conjunction-starts.jsonl'

SEED = [
    {"id": "cs-001", "word": "And", "weight": 0.35, "tags": ["additive"]},
    {"id": "cs-002", "word": "But", "weight": 0.35, "tags": ["contrast"]},
    {"id": "cs-003", "word": "So", "weight": 0.2, "tags": ["consequential"]},
    {"id": "cs-004", "word": "Yet", "weight": 0.1, "tags": ["contrast", "subtle"]},
]

with open(OUT, 'w') as f:
    for e in SEED:
        f.write(json.dumps(e) + chr(10))
print('[4/6] conjunction-starts.jsonl ...', end=' ', flush=True); print(f'seed ({len(SEED)} records)')
