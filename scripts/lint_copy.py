#!/usr/bin/env python3
"""Check dimension-page copy against the SPEC_RULES.md rules a script can test.

Usage (from the repo root):
    python3 scripts/lint_copy.py [dimension]

Run it after drafting or editing copy, before showing it to the user or briefing the
fact-checker, and fix or justify every warning. It reads the live text from site/js/app.js
(summaries, "What this measures" texts, context cards) and the indicator list from
site/data/wards/ladywell.json. It complements check_word_caps.py; it does not replace reading
SPEC_RULES.md, and it can't judge tone or whether a cause is sourced.

Checks (each tied to a rule in SPEC_RULES.md):
  summary-new-fact   a number or proper name in the top summary that appears in none of the
                     dimension's indicator texts (the summary must not introduce new information)
  comparators        a sentence comparing one figure with more than two reference points
                     (thresholds and areas count alike: "one comparator per point")
  narration          a sentence carrying four or more figures (likely narrating a chart)
  summary-years      more than three distinct years in a summary
  banned-phrase      phrases the spec has ruled out ("The takeaway", "the causes are clear", ...)
  acronym            an acronym used without being spelled out in the same block
  vague-cause        "causes"/"solutions" mentioned without naming any
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "site/js/app.js").read_text()
DATA = json.loads((ROOT / "site/data/wards/ladywell.json").read_text())

SUFFIX = re.search(r"const baseName = ind\.indicator\.replace\((/.*?/),", SRC).group(1)
SUFFIX_RE = re.compile(SUFFIX.strip("/").replace("\\/", "/"))

BANNED = [
    "the takeaway", "causes are clear", "tells a better story", "more revealing",
    "target:", "squeeze", "definitely or tending to",
]
# Units, chemical names and codes that need no spelling out
ACRONYM_OK = {"NO2", "PM2", "PM10", "PM2.5", "CO2", "CO2e", "UK", "MWh", "GWh", "TWh", "PWh", "LSOA", "MSOA", "GCSE",
              "NHS", "PTAL", "EPC", "II", "III"}
AREA_WORDS = ["Ladywell", "Lewisham", "London", "Inner London", "England", "Great Britain", "UK", "national"]
COMPARE_CUES = re.compile(r"\b(against|compared with|than|above|below|under|over)\b", re.I)


def words(t):
    # drop tags, and treat financial-year spans such as 2024/25 as a single year
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\b((?:19|20)\d\d)/\d\d\b", r"\1", t)


def sentences(t):
    t = words(t)
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", t) if x.strip()]


NUM_RE = re.compile(r"(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])\d+(?:\.\d+)?")


def numbers(t):
    return set(NUM_RE.findall(words(t)))


def proper_names(t):
    # multi-word capitalised names (e.g. "Ultra Low Emission Zone", "European Union")
    out = set()
    for m in re.finditer(r"\b(?:[A-Z][a-z]+(?:'s)?)(?:\s+(?:of\s+|and\s+|for\s+)?[A-Z][a-z]+(?:'s)?)+", words(t)):
        name = re.sub(r"'s\b", "", m.group(0))
        if name.split()[0] in {"The", "In", "Across", "Its", "It", "This", "That", "These", "Some", "Most"}:
            name = " ".join(name.split()[1:])
        if len(name.split()) >= 2:
            out.add(name)
    return out


def dims_and_indicators():
    out = {}
    for lens in ("local_social", "local_ecological"):
        for e in DATA.get(lens, []):
            out.setdefault(e["dimension"], set()).add(SUFFIX_RE.sub("", e["indicator"]))
    return out


def summary_for(dim):
    m = re.search(r"\n\s+'" + re.escape(dim) + r"': \"((?:[^\"\\]|\\.)*)\",", SRC)
    return m.group(1) if m else None


def wtm_for(base, dim=None):
    if dim:
        m = re.search(r"dimension === '" + re.escape(dim) + r"' && baseName === '" + re.escape(base.replace("'", "\\'")) + r"'\)\s*\{(.*?)\n        \}", SRC, flags=re.S)
        if m:
            return " ".join(re.findall(r"return `(.*?)`;", m.group(1), flags=re.S))
    m = re.search(r"baseName === '" + re.escape(base).replace("'", "\\\\'") + r"'\)\s*\{(.*?)\n        \}", SRC, flags=re.S)
    if not m:
        m = re.search(r"baseName === '" + re.escape(base.replace("'", "\\'")) + r"'\)\s*\{(.*?)\n        \}", SRC, flags=re.S)
    if not m:
        return ""
    return " ".join(re.findall(r"return `(.*?)`;", m.group(1), flags=re.S))


def cards_for(dim):
    ctx = SRC[SRC.index("function getCouncilContext"):SRC.index("function getWaysToGetInvolved")]
    texts = []
    for d, body in re.findall(r"dimensionName === '(\w+)'\)\s*\{(.*?)\n        \}", ctx, flags=re.S):
        if d == dim:
            texts += re.findall(r"summary:\s*`(.*?)`", body, flags=re.S)
    if "const ECO_RESEARCH = {" in ctx:
        eco = ctx[ctx.index("const ECO_RESEARCH = {"):ctx.index("if (ECO_RESEARCH[dimensionName])")]
        for d, body in re.findall(r"\n            (\w+): \{(.*?)\n            \}", eco, flags=re.S):
            if d == dim:
                texts += re.findall(r"summary:\s*`(.*?)`", body, flags=re.S)
    return texts


def check_block(label, text, is_summary=False, indicator_text=""):
    issues = []
    low = words(text).lower()
    for p in BANNED:
        if p in low:
            issues.append(("banned-phrase", f'"{p}"'))
    if re.search(r"\b(causes|solutions|remedies)\b[^.]{0,40}\b(are clear|exist|are known)\b", low):
        issues.append(("vague-cause", "names neither the causes nor the solutions"))
    expanded = set(re.findall(r"\(([A-Z][A-Z0-9.]{1,})\)", text))
    for acr in sorted(set(re.findall(r"\b[A-Z][A-Z0-9]{1,}\b", words(text)))):
        if acr in ACRONYM_OK or acr in expanded or acr.isdigit():
            continue
        issues.append(("acronym", f"{acr} is not spelled out in this block"))
    for s in sentences(text):
        nums = [n for n in NUM_RE.findall(s) if not re.fullmatch(r"(19|20)\d\d", n)]
        cues = len(COMPARE_CUES.findall(s))
        areas = sum(1 for a in AREA_WORDS if re.search(r"\b" + re.escape(a) + r"\b", s))
        if len(nums) >= 3 and (cues >= 3 or (cues >= 2 and areas >= 2)):
            issues.append(("comparators", f"one figure compared with several references: \"{s[:110]}...\""))
        if len(nums) >= 4:
            issues.append(("narration", f"{len(nums)} figures in one sentence: \"{s[:110]}...\""))
    if is_summary:
        years = set(re.findall(r"\b(?:19|20)\d\d\b", words(text)))
        if len(years) > 3:
            issues.append(("summary-years", f"{len(years)} distinct years: {', '.join(sorted(years))}"))
        ind_nums = numbers(indicator_text)
        ind_low = words(indicator_text).lower()
        for n in sorted(numbers(text)):
            if re.fullmatch(r"(19|20)\d\d", n) or n in ind_nums:
                continue
            issues.append(("summary-new-fact", f"figure {n} is in no indicator text for this dimension"))
        for name in sorted(proper_names(text)):
            if name.lower() not in ind_low:
                issues.append(("summary-new-fact", f"'{name}' is in no indicator text for this dimension"))
    return [(label, c, m) for c, m in issues]


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    all_issues = []
    for dim, bases in sorted(dims_and_indicators().items()):
        if only and dim != only:
            continue
        ind_text = " ".join(wtm_for(b, dim) for b in bases)
        summ = summary_for(dim)
        if summ:
            all_issues += check_block(f"{dim}: summary", summ, True, ind_text)
        for b in sorted(bases):
            t = wtm_for(b, dim)
            if t:
                all_issues += check_block(f"{dim}: {b[:50]}", t)
        for i, c in enumerate(cards_for(dim)):
            all_issues += check_block(f"{dim}: context card {i + 1}", c)
    for label, code, msg in all_issues:
        print(f"[{code}] {label}: {msg}")
    print(f"\n{len(all_issues)} warning(s). Fix each, or be ready to say why it is a false alarm.")


if __name__ == "__main__":
    main()
