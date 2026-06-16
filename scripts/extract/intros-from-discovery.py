#!/usr/bin/env python3
"""Extract introductory phrases from Discovery → src/sentences/intros.jsonl

Sources (tried in order):
  1. Discovery markers list (filters for intro-like markers)
  2. Hardcoded seed (canonical intro phrases)
"""
import json
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'intros.jsonl'
DISCOVERY_URL = 'https://raw.githubusercontent.com/sileod/Discovery/master/data/markers_list.txt'

SEED_INTROS = [
    {"phrase": "In practice,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"phrase": "Notably,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"phrase": "Specifically,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"phrase": "In many cases,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"phrase": "Typically,", "triggers": ["^The ", "^This "], "weight": 0.3},
    {"phrase": "Fundamentally,", "triggers": ["^The ", "^This "], "weight": 0.3},
]

INTRO_CANDIDATES = [
    ("first", "First,", 0.3), ("firstly", "First,", 0.3),
    ("initially", "Initially,", 0.3), ("importantly", "Importantly,", 0.3),
    ("significantly", "Significantly,", 0.3), ("interestingly", "Interestingly,", 0.3),
    ("remarkably", "Remarkably,", 0.3), ("surprisingly", "Surprisingly,", 0.3),
    ("ultimately", "Ultimately,", 0.3), ("essentially", "Essentially,", 0.3),
    ("historically", "Historically,", 0.3), ("traditionally", "Traditionally,", 0.3),
    ("critically", "Critically,", 0.2), ("conceptually", "Conceptually,", 0.2),
    ("practically", "Practically,", 0.2), ("theoretically", "Theoretically,", 0.2),
    ("broadly", "Broadly,", 0.2), ("collectively", "Collectively,", 0.2),
    ("generally", "Generally,", 0.2), ("overall", "Overall,", 0.3),
    ("in_short", "In short,", 0.3), ("in_sum", "In sum,", 0.3),
    ("in_fact", "In fact,", 0.3), ("in_particular", "In particular,", 0.3),
    ("alternatively", "Alternatively,", 0.2), ("conversely", "Conversely,", 0.2),
    ("curiously", "Curiously,", 0.2), ("oddly", "Oddly,", 0.2),
    ("strangely", "Strangely,", 0.2), ("ironically", "Ironically,", 0.2),
    ("unfortunately", "Unfortunately,", 0.2), ("frankly", "Frankly,", 0.2),
    ("honestly", "Honestly,", 0.2), ("personally", "Personally,", 0.2),
    ("admittedly", "Admittedly,", 0.2), ("arguably", "Arguably,", 0.2),
    ("presumably", "Presumably,", 0.2), ("undoubtedly", "Undoubtedly,", 0.2),
    ("surely", "Surely,", 0.2), ("clearly", "Clearly,", 0.3),
    ("obviously", "Obviously,", 0.2), ("evidently", "Evidently,", 0.2),
    ("indeed", "Indeed,", 0.3), ("certainly", "Certainly,", 0.2),
    ("naturally", "Naturally,", 0.2), ("inevitably", "Inevitably,", 0.2),
    ("currently", "Currently,", 0.2), ("recently", "Recently,", 0.2),
    ("eventually", "Eventually,", 0.2), ("meanwhile", "Meanwhile,", 0.2),
    ("simultaneously", "Simultaneously,", 0.15), ("subsequently", "Subsequently,", 0.15),
    ("thereafter", "Thereafter,", 0.15), ("further", "Further,", 0.2),
    ("moreover", "Moreover,", 0.15), ("furthermore", "Furthermore,", 0.15),
    ("likewise", "Likewise,", 0.2), ("similarly", "Similarly,", 0.2),
    ("otherwise", "Otherwise,", 0.15), ("nevertheless", "Nevertheless,", 0.15),
    ("nonetheless", "Nonetheless,", 0.15), ("regardless", "Regardless,", 0.15),
    ("still", "Still,", 0.15), ("then", "Then,", 0.15),
    ("next", "Next,", 0.2), ("finally", "Finally,", 0.3),
]


def try_discovery() -> int:
    try:
        resp = urllib.request.urlopen(DISCOVERY_URL, timeout=10)
        markers = set()
        for line in resp.read().decode('utf-8').splitlines():
            m = line.strip().rstrip(',')
            if m and not m.startswith('#'):
                markers.add(m)
        entries = []
        idx = 0
        for s in SEED_INTROS:
            phrase_slug = s["phrase"].rstrip(',').lower().replace(',', '').replace(' ', '_')
            if phrase_slug in markers:
                idx += 1
                entries.append({"id": f"intro-{idx:03d}", **s})
        for marker_slug, phrase, weight in INTRO_CANDIDATES:
            if marker_slug in markers and not any(e["phrase"] == phrase for e in entries):
                idx += 1
                entries.append({
                    "id": f"intro-{idx:03d}",
                    "phrase": phrase,
                    "triggers": ["^The ", "^This "],
                    "weight": weight,
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
    for idx, s in enumerate(SEED_INTROS):
        entries.append({"id": f"intro-{idx + 1:03d}", **s})
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def main():
    print("[5/6] intros.jsonl ...", end=' ', flush=True)
    count = try_discovery()
    if count == 0:
        count = write_seed()
        print(f"seed ({count} records)")
    else:
        print(f"discovery ({count} records)")


if __name__ == '__main__':
    main()
