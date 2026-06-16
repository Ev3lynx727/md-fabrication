#!/usr/bin/env python3
"""Extract banned/AI-slop words and phrases → src/sentences/banned-words.jsonl

Sources:
  1. b1rdmania/claude-plain-english-skill REFERENCE.md (hardcoded)
  2. Common AI tics and anti-patterns
"""
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent.parent / 'src' / 'sentences'
OUT = SRC / 'banned-words.jsonl'

DATA = []

# Banned vocabulary (b1rdmania REFERENCE.md)
for item in [
    ("delve", "vocabulary", "examine, study", "high"),
    ("tapestry", "metaphor", "(describe specifically)", "high"),
    ("navigate", "vocabulary", "handle, work through, deal with", "high"),
    ("leverage", "vocabulary", "use, apply", "high"),
    ("landscape", "metaphor", "field, area", "high"),
    ("ecosystem", "metaphor", "network, world", "high"),
    ("realm", "metaphor", "field, area", "high"),
    ("multifaceted", "vocabulary", "complex", "medium"),
    ("paramount", "vocabulary", "most important", "medium"),
    ("unprecedented", "vocabulary", "new, never seen", "medium"),
    ("crucial", "vocabulary", "important, key", "medium"),
    ("robust", "vocabulary", "strong, reliable", "medium"),
    ("comprehensive", "vocabulary", "full, thorough", "low"),
    ("nuanced", "vocabulary", "(state the nuance)", "medium"),
    ("intricate", "vocabulary", "complex, detailed", "medium"),
    ("foster", "vocabulary", "grow, build, encourage", "medium"),
    ("underscore", "vocabulary", "show, prove", "medium"),
    ("pivotal", "vocabulary", "key, central", "medium"),
    ("holistic", "vocabulary", "whole, full", "medium"),
    ("facilitate", "vocabulary", "help, enable", "medium"),
    ("utilize", "vocabulary", "use", "medium"),
    ("ameliorate", "vocabulary", "improve", "high"),
    ("expedite", "vocabulary", "speed up", "medium"),
    ("methodology", "vocabulary", "method", "low"),
    ("commence", "vocabulary", "start, begin", "low"),
    ("terminate", "vocabulary", "end", "low"),
    ("endeavour", "vocabulary", "try", "low"),
    ("numerous", "vocabulary", "many", "low"),
    ("approximately", "vocabulary", "about", "low"),
]:
    DATA.append({"phrase": item[0], "category": item[1], "replacement": item[2], "severity": item[3]})

# Banned constructions
for item in [
    ("it is important to note that", "filler", "", "high"),
    ("it's worth noting that", "filler", "", "high"),
    ("it should be noted that", "filler", "", "high"),
    ("in the realm of", "verbose", "in", "medium"),
    ("in the landscape of", "verbose", "in", "medium"),
    ("in the world of", "verbose", "in", "medium"),
    ("due to the fact that", "verbose", "because", "medium"),
    ("in the event that", "verbose", "if", "medium"),
    ("with regard to", "verbose", "about", "medium"),
    ("in light of", "verbose", "given, because of", "medium"),
    ("prior to", "verbose", "before", "medium"),
    ("subsequent to", "verbose", "after", "medium"),
    ("in order to", "verbose", "to", "medium"),
    ("a variety of", "verbose", "many, several", "low"),
    ("a number of", "verbose", "some", "low"),
    ("at the end of the day", "cliche", "", "medium"),
    ("when all is said and done", "cliche", "", "medium"),
    ("the fact of the matter is", "filler", "", "medium"),
]:
    DATA.append({"phrase": item[0], "category": item[1], "replacement": item[2], "severity": item[3]})

# Banned openers (sycophancy)
for item in [
    ("that's a great question", "sycophancy", "", "high"),
    ("certainly!", "sycophancy", "", "high"),
    ("absolutely!", "sycophancy", "", "high"),
    ("i'd be happy to", "sycophancy", "", "high"),
    ("great point", "sycophancy", "", "high"),
    ("what a thoughtful question", "sycophancy", "", "high"),
    ("i appreciate you asking", "sycophancy", "", "high"),
]:
    DATA.append({"phrase": item[0], "category": item[1], "replacement": item[2], "severity": item[3]})

# Banned closers
for item in [
    ("i hope this helps", "sycophancy", "", "high"),
    ("let me know if you have any questions", "sycophancy", "", "medium"),
    ("feel free to ask", "sycophancy", "", "medium"),
    ("in conclusion", "filler", "", "medium"),
    ("to summarise", "filler", "", "medium"),
    ("all in all", "filler", "", "medium"),
]:
    DATA.append({"phrase": item[0], "category": item[1], "replacement": item[2], "severity": item[3]})

# Verbal false limbs (Orwell)
for item in [
    ("make contact with", "false-limb", "call, meet", "medium"),
    ("give consideration to", "false-limb", "consider", "medium"),
    ("take into consideration", "false-limb", "consider", "medium"),
    ("exhibit a tendency to", "false-limb", "tend to", "medium"),
    ("play a leading role in", "false-limb", "lead", "low"),
    ("serve the purpose of", "false-limb", "serve", "low"),
    ("have the effect of", "false-limb", "(do directly)", "medium"),
    ("militate against", "false-limb", "fight", "low"),
    ("be subjected to", "false-limb", "(use active)", "medium"),
    ("give rise to", "false-limb", "cause", "medium"),
]:
    DATA.append({"phrase": item[0], "category": item[1], "replacement": item[2], "severity": item[3]})


def main():
    print("[9/9] banned-words.jsonl ...", end=' ', flush=True)
    with open(OUT, 'w') as f:
        for idx, entry in enumerate(DATA):
            entry["id"] = f"banned-{idx + 1:04d}"
            f.write(json.dumps(entry) + '\n')
    print(f"{len(DATA)} records")


if __name__ == '__main__':
    main()
