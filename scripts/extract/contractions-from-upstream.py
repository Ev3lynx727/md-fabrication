#!/usr/bin/env python3
"""Extract contraction pairs → src/sentences/contractions.jsonl

Sources (tried in order):
  1. JamesHight/node-contractions word-lookup.js (GitHub raw)
  2. Hardcoded seed (current transform patterns)
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'contractions.jsonl'

CONTRACTIONS_URL = 'https://raw.githubusercontent.com/JamesHight/node-contractions/master/lib/word-lookup.js'

SEED = [
    {"full": "do not", "contracted": "don't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "does not", "contracted": "doesn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "did not", "contracted": "didn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "will not", "contracted": "won't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "cannot", "contracted": "can't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "could not", "contracted": "couldn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "should not", "contracted": "shouldn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "would not", "contracted": "wouldn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "have not", "contracted": "haven't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "has not", "contracted": "hasn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "had not", "contracted": "hadn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "is not", "contracted": "isn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "are not", "contracted": "aren't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "was not", "contracted": "wasn't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "were not", "contracted": "weren't", "confidence": 0.98, "tags": ["standard"]},
    {"full": "it is", "contracted": "it's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "that is", "contracted": "that's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "there is", "contracted": "there's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "here is", "contracted": "here's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "what is", "contracted": "what's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "who is", "contracted": "who's", "confidence": 0.95, "tags": ["standard"]},
    {"full": "let us", "contracted": "let's", "confidence": 0.95, "tags": ["standard"]},
]


def parse_word_lookup_js(text):
    """Parse JS module.exports = { 'key': 'value', ... } dict.
    Keys are in double quotes and can contain unescaped '.
    Values are in single quotes with escaped \'.
    """
    # Find the object literal
    match = re.search(r'module\.exports\s*=\s*({.*?});', text, re.DOTALL)
    if not match:
        return {}
    obj_str = match.group(1)

    result = {}
    # Match: "double-quoted-key"  :  'single-quoted-value'
    # Key can contain ' but not unescaped "
    # Value can contain \' but not unescaped '
    pattern = re.compile(
        r'"( (?:[^"\\]|\\.)* )" \s* : \s* \' ( (?:[^\'\\]|\\.)* ) \'',
        re.VERBOSE
    )
    for m in pattern.finditer(obj_str):
        key = m.group(1)
        value = m.group(2)
        value = value.replace("\\'", "'")
        result[key] = value

    return result


def try_upstream():
    try:
        resp = urllib.request.urlopen(CONTRACTIONS_URL, timeout=10)
        text = resp.read().decode('utf-8')
        lookup = parse_word_lookup_js(text)
        if not lookup:
            print("empty lookup", end='')
            return []

        # Build reverse lookup: full → contracted
        # When multiple contracted forms map to the same full form, prefer
        # the shorter (more common) one
        full_to_contracted = {}
        for contracted, full in lookup.items():
            full = full.strip().rstrip('.')
            if not full or not contracted:
                continue
            if full not in full_to_contracted or len(contracted) < len(full_to_contracted[full]):
                full_to_contracted[full] = contracted

        entries = []
        seen = set()
        for idx, (full, contracted) in enumerate(sorted(full_to_contracted.items(), key=lambda x: x[0])):
            key = full.lower()
            if key in seen:
                continue
            seen.add(key)
            tags = ["informal"] if any(s in contracted for s in ["'ve", "'ll", "'d", "'m", "'re"]) else ["standard"]
            entries.append({
                "id": f"con-{idx + 1:04d}",
                "full": full,
                "contracted": contracted,
                "confidence": 0.9,
                "tags": tags,
            })
        return entries
    except Exception as e:
        print(f"[SKIP] {e}", end='')
        return []


def write_entries(entries):
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def write_seed():
    entries = []
    for idx, s in enumerate(SEED):
        entries.append({"id": f"con-{idx + 1:04d}", **s})
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def main():
    print("[8/9] contractions.jsonl ...", end=' ', flush=True)
    entries = try_upstream()
    if entries:
        count = write_entries(entries)
        print(f"upstream ({count} records)")
    else:
        count = write_seed()
        print(f"seed ({count} records)")


if __name__ == '__main__':
    main()
