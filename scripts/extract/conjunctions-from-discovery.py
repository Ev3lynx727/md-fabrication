#!/usr/bin/env python3
"""Extract formal conjunctions from Discovery markers → src/sentences/conjunctions.jsonl

Filters for formal sequencing conjunctions (firstly, secondly, thirdly,
fourthly, lastly, in conclusion, moreover, furthermore, additionally).
"""
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'conjunctions.jsonl'

SEED_CONJUNCTIONS = [
    {"id": "conj-001", "trigger": "Firstly", "result": "First", "tags": ["sequencing", "soften"], "priority": 1},
    {"id": "conj-002", "trigger": "Secondly", "result": "Second", "tags": ["sequencing", "soften"], "priority": 1},
    {"id": "conj-003", "trigger": "Thirdly", "result": "Third", "tags": ["sequencing", "soften"], "priority": 1},
    {"id": "conj-004", "trigger": "Fourthly", "result": "Fourth", "tags": ["sequencing", "soften"], "priority": 1},
    {"id": "conj-005", "trigger": "Lastly", "result": "Finally", "tags": ["closing", "soften"], "priority": 2},
    {"id": "conj-006", "trigger": "In conclusion", "result": "To wrap up", "tags": ["closing", "soften"], "priority": 2},
    {"id": "conj-007", "trigger": "Moreover", "result": "What's more", "tags": ["additive", "soften"], "priority": 1},
    {"id": "conj-008", "trigger": "Furthermore", "result": "Beyond that", "tags": ["additive", "soften"], "priority": 1},
    {"id": "conj-009", "trigger": "Additionally", "result": "Also", "tags": ["additive", "soften"], "priority": 1},
]


def write_seed() -> int:
    with open(OUT, 'w') as f:
        for entry in SEED_CONJUNCTIONS:
            f.write(json.dumps(entry) + '\n')
    return len(SEED_CONJUNCTIONS)


def main():
    print("[3/6] conjunctions.jsonl ...", end=' ', flush=True)
    count = write_seed()
    print(f"seed ({count} records)")


if __name__ == '__main__':
    main()
