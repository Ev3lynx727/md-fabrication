#!/usr/bin/env python3
"""Extract conjunction starters from Discovery → src/sentences/conjunction-starts.jsonl

Sources (tried in order):
  1. Discovery markers list (filters for short conjunction-starters)
  2. Hardcoded seed (canonical And, But, So, Yet)
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'conjunction-starts.jsonl'
DISCOVERY_URL = 'https://raw.githubusercontent.com/sileod/Discovery/master/data/markers_list.txt'

SEED = [
    {"word": "And", "weight": 0.35, "tags": ["additive"]},
    {"word": "But", "weight": 0.35, "tags": ["contrast"]},
    {"word": "So", "weight": 0.20, "tags": ["consequential"]},
    {"word": "Yet", "weight": 0.10, "tags": ["contrast", "subtle"]},
]

# Conjunction-starters from Discovery (short, single-word, works as sentence opener)
CS_CANDIDATES = {
    "also": {"weight": 0.15, "tags": ["additive"]},
    "still": {"weight": 0.10, "tags": ["continuative"]},
    "though": {"weight": 0.08, "tags": ["concessive"]},
    "plus": {"weight": 0.08, "tags": ["additive", "informal"]},
    "or": {"weight": 0.05, "tags": ["alternative"]},
    "nor": {"weight": 0.03, "tags": ["negative", "additive"]},
    "then": {"weight": 0.10, "tags": ["sequential"]},
}


def try_discovery() -> int:
    try:
        resp = urllib.request.urlopen(DISCOVERY_URL, timeout=10)
        markers = set()
        for line in resp.read().decode('utf-8').splitlines():
            m = line.strip().rstrip(',')
            if m and not m.startswith('#'):
                markers.add(m)
        entries = []
        for idx, s in enumerate(SEED):
            entries.append({"id": f"cs-{idx + 1:03d}", **s})
        idx = len(SEED)
        for word, meta in sorted(CS_CANDIDATES.items()):
            if word in markers:
                idx += 1
                entries.append({
                    "id": f"cs-{idx:03d}",
                    "word": word[0].upper() + word[1:],
                    "weight": meta["weight"],
                    "tags": meta["tags"],
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
    for idx, s in enumerate(SEED):
        entries.append({"id": f"cs-{idx + 1:03d}", **s})
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def main():
    print("[4/6] conjunction-starts.jsonl ...", end=' ', flush=True)
    count = try_discovery()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        seed_count = len(SEED)
        extra_count = count - seed_count
        print(f"discovery ({seed_count} seed + {extra_count} extra = {count} records)")


if __name__ == '__main__':
    main()
