#!/usr/bin/env python3
"""Count words in dimension-page copy and flag anything over the spec caps.

Usage (from the repo root):
    python3 scripts/check_word_caps.py [dimension]

Checks, in site/js/app.js:
  - top summaries (dimensionDescriptions): 130 words
  - "What this measures" texts (getWhatThisMeasures return strings): 130 words
  - council-context card summaries: about 165 words
  - Get Involved card texts: about 30 words (warning only)
HTML tags are stripped and words counted with len(text.split()).
With a dimension argument, only that dimension's summary, context cards and
Get Involved cards are shown, plus every indicator text (indicator texts aren't
tagged by dimension in app.js).
"""
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "site/js/app.js"
src = APP.read_text()
only = sys.argv[1] if len(sys.argv) > 1 else None


def words(text):
    # Stat-card grids (.loti-snapshot) and source lines are data, not prose:
    # the 130-word cap applies to the paragraphs only.
    text = re.sub(r'<div class="(?:loti-snapshot|source-line)">.*?</div>\s*</div>|<div class="source-line">.*?</div>', " ", text, flags=re.S)
    return len(re.sub(r"<[^>]+>|\$\{[^}]*\}", " ", text).split())


def report(label, text, cap, warn_only=False):
    n = words(text)
    flag = "" if n <= cap else ("  <-- over (warning)" if warn_only else "  <-- OVER CAP")
    print(f"{n:4d}/{cap}  {label}{flag}")
    return n > cap and not warn_only


over = False
print("Top summaries")
block = src[src.index("const dimensionDescriptions = {"):]
block = block[: block.index("};")]
for dim, text in re.findall(r"'(\w+)':\s*\"((?:[^\"\\]|\\.)*)\"", block):
    if not only or dim == only:
        over |= report(dim, text, 130)

print("\nWhat this measures")
wtm = src[src.index("function getWhatThisMeasures"):src.index("function getWhyThisIsHappening")]
for base, body in re.findall(r"baseName === '((?:[^'\\]|\\.)*)'\)\s*\{(.*?)\n        \}", wtm, flags=re.S):
    for text in re.findall(r"return `(.*?)`;", body, flags=re.S):
        over |= report(base, text, 130)

print("\nContext cards")
ctx = src[src.index("function getCouncilContext"):src.index("function getWaysToGetInvolved")]
for dim, body in re.findall(r"dimensionName === '(\w+)'\)\s*\{(.*?)\n        \}", ctx, flags=re.S):
    if only and dim != only:
        continue
    for title, summary in re.findall(r"title:\s*['\"](.*?)['\"],.*?summary:\s*`(.*?)`", body, flags=re.S):
        over |= report(f"{dim}: {title[:60]}", summary, 165)

print("\nGet Involved cards")
gi = src[src.index("function getWaysToGetInvolved"):]
for dim, body in re.findall(r"dimensionName === '(\w+)'\)\s*\{(.*?)\n        \}", gi, flags=re.S):
    if only and dim != only:
        continue
    for action, text in re.findall(r"action:\s*['\"](.*?)['\"],\s*text:\s*`(.*?)`", body, flags=re.S):
        report(f"{dim}: {action[:60]}", text, 30, warn_only=True)

sys.exit(1 if over else 0)
