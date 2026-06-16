#!/usr/bin/env python3
"""Extract formal conjunction softenings from Discovery → src/sentences/conjunctions.jsonl

Sources (tried in order):
  1. Discovery markers list (cross-reference known conjunction triggers)
  2. Hardcoded seed (canonical trigger→result pairs)
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'conjunctions.jsonl'
DISCOVERY_URL = 'https://raw.githubusercontent.com/sileod/Discovery/master/data/markers_list.txt'

CANONICAL = [
    {"trigger": "Firstly", "result": "First", "tags": ["sequencing", "soften"], "priority": 1},
    {"trigger": "Secondly", "result": "Second", "tags": ["sequencing", "soften"], "priority": 1},
    {"trigger": "Thirdly", "result": "Third", "tags": ["sequencing", "soften"], "priority": 1},
    {"trigger": "Fourthly", "result": "Fourth", "tags": ["sequencing", "soften"], "priority": 1},
    {"trigger": "Fifthly", "result": "Fifth", "tags": ["sequencing", "soften"], "priority": 1},
    {"trigger": "Lastly", "result": "Finally", "tags": ["closing", "soften"], "priority": 2},
    {"trigger": "In conclusion", "result": "To wrap up", "tags": ["closing", "soften"], "priority": 2},
    {"trigger": "Moreover", "result": "What's more", "tags": ["additive", "soften"], "priority": 1},
    {"trigger": "Furthermore", "result": "Beyond that", "tags": ["additive", "soften"], "priority": 1},
    {"trigger": "Additionally", "result": "Also", "tags": ["additive", "soften"], "priority": 1},
]

EXTRA_PAIRS = {
    "in_addition": "Plus",
    "in_other_words": "Put differently",
    "by_contrast": "In contrast",
    "on_the_other_hand": "Then again",
    "as_a_result": "Because of that",
    "nevertheless": "Even so",
    "nonetheless": "Still",
    "consequently": "As a result",
    "therefore": "So",
    "thus": "That means",
    "hence": "From there",
}


def try_discovery() -> int:
    try:
        resp = urllib.request.urlopen(DISCOVERY_URL, timeout=10)
        markers = set()
        for line in resp.read().decode('utf-8').splitlines():
            m = line.strip().rstrip(',').replace('_', ' ')
            if m and not m.startswith('#'):
                markers.add(m)
        entries = []
        idx = 0
        for c in CANONICAL:
            trigger_lower = c["trigger"].lower()
            if trigger_lower in markers:
                idx += 1
                entries.append({"id": f"conj-{idx:03d}", **c})
        # Add extra pairs if the trigger marker exists in Discovery
        for trigger_slug, result in EXTRA_PAIRS.items():
            trigger_display = trigger_slug.replace('_', ' ')
            if trigger_slug in markers:
                idx += 1
                tag = "contrast" if "contrast" in trigger_slug else "consequence" if any(x in trigger_slug for x in ["result", "consequent", "therefore", "thus", "hence"]) else "additive"
                entries.append({
                    "id": f"conj-{idx:03d}",
                    "trigger": trigger_display.title(),
                    "result": result,
                    "tags": [tag, "soften"],
                    "priority": 2,
                })
        if not entries:
            return 0
        with open(OUT, 'w') as f:
            for e in entries:
                f.write(json.dumps(e) + '\n')
        return len(entries)
    except Exception as e:
        print(f"  [SKIP] Discovery fetch failed: {e}", file=sys.stderr)
        return 0


def write_seed() -> int:
    entries = []
    for idx, c in enumerate(CANONICAL):
        entries.append({"id": f"conj-{idx + 1:03d}", **c})
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def main():
    print("[3/6] conjunctions.jsonl ...", end=' ', flush=True)
    count = try_discovery()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        print(f"discovery ({count} records)")


if __name__ == '__main__':
    main()
