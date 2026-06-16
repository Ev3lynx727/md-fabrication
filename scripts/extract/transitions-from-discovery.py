#!/usr/bin/env python3
"""Extract Discovery discourse markers → src/sentences/transitions.jsonl

Source: https://github.com/sileod/Discovery/blob/master/data/markers_list.txt
Fetched at runtime if possible, otherwise falls back to a curated seed.
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'transitions.jsonl'
DISCOVERY_URL = 'https://raw.githubusercontent.com/sileod/Discovery/master/data/markers_list.txt'

SEED_TRANSITIONS = [
    {"id": "trans-001", "phrase": "However,", "weight": 1.0, "context": "contrast", "tags": ["contrast", "formal"]},
    {"id": "trans-002", "phrase": "That said,", "weight": 0.8, "context": "concession", "tags": ["concession", "informal"]},
    {"id": "trans-003", "phrase": "More importantly,", "weight": 0.7, "context": "emphasis", "tags": ["emphasis", "formal"]},
    {"id": "trans-004", "phrase": "Meanwhile,", "weight": 0.6, "context": "temporal", "tags": ["temporal", "narrative"]},
    {"id": "trans-005", "phrase": "Furthermore,", "weight": 0.7, "context": "additive", "tags": ["additive", "formal"]},
    {"id": "trans-006", "phrase": "In addition,", "weight": 0.7, "context": "additive", "tags": ["additive", "formal"]},
    {"id": "trans-007", "phrase": "On the other hand,", "weight": 0.8, "context": "contrast", "tags": ["contrast", "balanced"]},
    {"id": "trans-008", "phrase": "As a result,", "weight": 0.9, "context": "consequence", "tags": ["causality", "formal"]},
    {"id": "trans-009", "phrase": "Notably,", "weight": 0.7, "context": "emphasis", "tags": ["emphasis", "formal"]},
    {"id": "trans-010", "phrase": "Specifically,", "weight": 0.6, "context": "elaboration", "tags": ["elaboration", "formal"]},
    {"id": "trans-011", "phrase": "In practice,", "weight": 0.5, "context": "application", "tags": ["pragmatic", "narrative"]},
    {"id": "trans-012", "phrase": "Beyond that,", "weight": 0.5, "context": "additive", "tags": ["additive", "informal"]},
    {"id": "trans-013", "phrase": "Consequently,", "weight": 0.8, "context": "consequence", "tags": ["causality", "formal"]},
    {"id": "trans-014", "phrase": "For context,", "weight": 0.5, "context": "elaboration", "tags": ["elaboration", "narrative"]},
    {"id": "trans-015", "phrase": "To illustrate,", "weight": 0.6, "context": "elaboration", "tags": ["elaboration", "formal"]},
]


def try_discovery() -> int:
    try:
        resp = urllib.request.urlopen(DISCOVERY_URL, timeout=10)
        text = resp.read().decode('utf-8')
        count = 0
        with open(OUT, 'w') as f:
            for line in text.splitlines():
                line = line.strip().rstrip(',')
                if not line or line.startswith('#') or line.startswith('%'):
                    continue
                f.write(json.dumps({
                    "id": f"trans-{count + 1:04d}",
                    "phrase": line + ',',
                    "weight": 0.5,
                    "context": "discourse",
                    "tags": ["discourse", "marker"],
                }) + '\n')
                count += 1
        return count
    except Exception as e:
        print(f"  [SKIP] Discovery fetch failed: {e}", file=sys.stderr)
        return 0


def write_seed() -> int:
    with open(OUT, 'w') as f:
        for entry in SEED_TRANSITIONS:
            f.write(json.dumps(entry) + '\n')
    return len(SEED_TRANSITIONS)


def main():
    print("[2/6] transitions.jsonl ...", end=' ', flush=True)
    count = try_discovery()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        print(f"discovery ({count} records)")


if __name__ == '__main__':
    main()
