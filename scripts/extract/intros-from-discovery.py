#!/usr/bin/env python3
"""Extract style-markers from Discovery → src/sentences/intros.jsonl"""
import json
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'intros.jsonl'

SEED = [
    {"id": "intro-001", "phrase": "In practice,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"id": "intro-002", "phrase": "Notably,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"id": "intro-003", "phrase": "Specifically,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"id": "intro-004", "phrase": "In many cases,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"id": "intro-005", "phrase": "Typically,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"id": "intro-006", "phrase": "Fundamentally,", "triggers": ["^The ", "^This "], "weight": 0.3},
]

with open(OUT, 'w') as f:
    for e in SEED:
        f.write(json.dumps(e) + chr(10))
print('[5/6] intros.jsonl ...', end=' ', flush=True); print(f'seed ({len(SEED)} records)')
