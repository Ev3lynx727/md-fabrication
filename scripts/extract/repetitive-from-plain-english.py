#!/usr/bin/env python3
"""Extract verbose→concise phrase pairs → src/sentences/repetitive.jsonl

Sources (tried in order):
  1. xoxxel/Humanize-Text (GitHub raw en.json)
  2. kemitchell/kimble-plain-words.json (GitHub raw index.json)
  3. Microsoft Wordiness.yml (from n8n-docs Vale style guide)
  4. Hardcoded seed (current transform patterns)
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'repetitive.jsonl'

HUMANIZE_URL = 'https://raw.githubusercontent.com/xoxxel/Humanize-Text/main/dictionary/en.json'
KIMBLE_URL = 'https://raw.githubusercontent.com/kemitchell/kimble-plain-words.json/master/index.json'
WORDINESS_URL = 'https://raw.githubusercontent.com/n8n-io/n8n-docs/7b6d0c29/styles/from-microsoft/Wordiness.yml'

SEED = [
    {"phrase": "in order to", "replacement": "to", "confidence": 0.95, "category": "verbose", "source": "seed"},
    {"phrase": "due to the fact that", "replacement": "because", "confidence": 0.95, "category": "verbose", "source": "seed"},
    {"phrase": "at the end of the day", "replacement": "ultimately", "confidence": 0.8, "category": "cliche", "source": "seed"},
    {"phrase": "in the event that", "replacement": "if", "confidence": 0.9, "category": "verbose", "source": "seed"},
    {"phrase": "on a daily basis", "replacement": "daily", "confidence": 0.9, "category": "verbose", "source": "seed"},
    {"phrase": "in a timely manner", "replacement": "promptly", "confidence": 0.8, "category": "verbose", "source": "seed"},
    {"phrase": "the vast majority of", "replacement": "most", "confidence": 0.9, "category": "verbose", "source": "seed"},
    {"phrase": "a significant number of", "replacement": "many", "confidence": 0.9, "category": "verbose", "source": "seed"},
    {"phrase": "is able to", "replacement": "can", "confidence": 0.9, "category": "verbose", "source": "seed"},
    {"phrase": "has the ability to", "replacement": "can", "confidence": 0.9, "category": "verbose", "source": "seed"},
]


def parse_wordiness_yaml(text):
    pairs = []
    in_swap = False
    for line in text.splitlines():
        if line.startswith('swap:'):
            in_swap = True
            continue
        if in_swap:
            if not line or not line[0].isspace():
                break
            match = re.match(r'\s{2}(.+?):\s*(.+)', line)
            if match:
                phrase = match.group(1).strip()
                replacement = match.group(2).strip()
                phrase = re.sub(r'\(?:\?[:=!]|\(?i-m?x?\)|\(?\?u?\)', '', phrase).strip()
                pairs.append((phrase, replacement))
    return pairs


def try_humanize():
    try:
        resp = urllib.request.urlopen(HUMANIZE_URL, timeout=10)
        data = json.loads(resp.read().decode('utf-8'))
        entries = []
        for i, item in enumerate(data):
            phrase = item.get('from', '').strip()
            replacement = item.get('to', '').strip()
            if not phrase or not replacement:
                continue
            entries.append({
                "phrase": phrase,
                "replacement": replacement.split(' / ')[0].strip(),
                "confidence": 0.85,
                "category": "verbose",
                "source": "humanize-text",
            })
        print(f"    humanize-text: {len(entries)} entries")
        return entries
    except Exception as e:
        print(f"    [SKIP] humanize-text fetch failed: {e}", file=sys.stderr)
        return []


def try_kimble():
    try:
        resp = urllib.request.urlopen(KIMBLE_URL, timeout=10)
        data = json.loads(resp.read().decode('utf-8'))
        entries = []
        seen = set()
        for item in data:
            instead_of_list = item.get('instead of', [])
            consider = item.get('consider', [])
            if not instead_of_list or not consider:
                continue
            for io in instead_of_list:
                phrase = io.get('phrase', '').strip()
                if not phrase:
                    continue
                key = phrase.lower()
                if key in seen:
                    continue
                seen.add(key)
                entries.append({
                    "phrase": phrase,
                    "replacement": consider[0],
                    "confidence": 0.85,
                    "category": "wordy",
                    "source": "kimble",
                })
        print(f"    kimble: {len(entries)} entries")
        return entries
    except Exception as e:
        print(f"    [SKIP] kimble fetch failed: {e}", file=sys.stderr)
        return []


def try_wordiness():
    try:
        resp = urllib.request.urlopen(WORDINESS_URL, timeout=10)
        text = resp.read().decode('utf-8')
        raw_pairs = parse_wordiness_yaml(text)
        entries = []
        seen = set()
        for phrase, replacement in raw_pairs:
            key = phrase.lower().strip()
            if not key or key in seen:
                continue
            seen.add(key)
            entries.append({
                "phrase": phrase,
                "replacement": replacement,
                "confidence": 0.85,
                "category": "verbose",
                "source": "ms-wordiness",
            })
        print(f"    ms-wordiness: {len(entries)} entries")
        return entries
    except Exception as e:
        print(f"    [SKIP] ms-wordiness fetch failed: {e}", file=sys.stderr)
        return []


def deduplicate(entries):
    seen = set()
    unique = []
    for e in entries:
        key = e['phrase'].lower().strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(e)
    return unique


def write_entries(entries):
    with open(OUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e) + '\n')
    return len(entries)


def write_seed():
    with open(OUT, 'w') as f:
        for e in SEED:
            f.write(json.dumps(e) + '\n')
    return len(SEED)


def main():
    print("[7/9] repetitive.jsonl ...", flush=True)
    all_entries = list(SEED)
    humanize = try_humanize()
    all_entries.extend(humanize)
    kimble = try_kimble()
    all_entries.extend(kimble)
    wordiness = try_wordiness()
    all_entries.extend(wordiness)

    all_entries = deduplicate(all_entries)

    if len(all_entries) <= len(SEED):
        print(f"  seed only ({len(SEED)} records)")
        count = write_seed()
    else:
        count = write_entries(all_entries)
        upstream = count - len(SEED)
        print(f"  {count} total ({upstream} upstream + {len(SEED)} seed)")


if __name__ == '__main__':
    main()
