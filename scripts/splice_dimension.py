#!/usr/bin/env python3
"""Splice one dimension's builder output into all three ward JSON files.

Usage (from the repo root):
    python3 scripts/splice_dimension.py <dimension> [--check]

--check  compare the builder's output with the live site file and exit,
         without writing anything. Run this BEFORE editing a builder, to
         confirm it currently matches the live data (spec 13.2).

The builder is looked up in data/pipeline/build_local_social_with_real_data.py
(lens local_social) and then data/pipeline/build_local_ecological.py (lens
local_ecological). Without --check, replaces that dimension's entries in the
lens's list in site/data/wards/ladywell.json, data/wards/ladywell.json and the
lens's intermediate file (data/wards/ladywell_local_social.json or
data/wards/ladywell_local_ecological.json), appending the dimension if it is
new, then verifies the three files agree for that dimension and that every
entry round-trips through the schema.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data" / "pipeline"))
os.chdir(ROOT)  # the social builder opens data/manual/... relative to the repo root

import build_local_social_with_real_data as social_builders  # noqa: E402
import build_local_ecological as ecological_builders  # noqa: E402
from schema import Dimension  # noqa: E402

LENSES = [
    ("local_social", social_builders, ROOT / "data/wards/ladywell_local_social.json"),
    ("local_ecological", ecological_builders, ROOT / "data/wards/ladywell_local_ecological.json"),
]


def builder_for(dim):
    for lens, module, intermediate in LENSES:
        for name in (f"build_{dim}_dimensions", f"build_{dim}"):
            fn = getattr(module, name, None)
            if fn:
                return lens, intermediate, name, fn
    sys.exit(f"No builder found for '{dim}' (tried build_{dim}_dimensions and build_{dim} in both builder modules).")


def entries(data, lens, dim):
    return [e for e in data.get(lens, []) if e["dimension"] == dim]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    dim = args[0]
    lens, intermediate, name, fn = builder_for(dim)
    files = [ROOT / "site/data/wards/ladywell.json", ROOT / "data/wards/ladywell.json", intermediate]
    result = fn()
    new = [d.to_dict() for d in (result if isinstance(result, list) else [result])]

    if "--check" in sys.argv:
        live = entries(json.loads(files[0].read_text()), lens, dim)
        if new == live:
            print(f"OK: {name}() matches the live site data ({len(new)} indicators).")
            return
        print(f"MISMATCH: {name}() differs from the live site data.")
        live_by = {e["indicator"]: e for e in live}
        new_by = {e["indicator"]: e for e in new}
        for ind in sorted(set(live_by) | set(new_by)):
            a, b = live_by.get(ind), new_by.get(ind)
            if a is None or b is None:
                print(f"  {ind}: only in {'builder' if a is None else 'live file'}")
                continue
            for key in sorted(set(a) | set(b)):
                if a.get(key) != b.get(key):
                    print(f"  {ind} -> field '{key}' differs")
        sys.exit(1)

    for path in files:
        if path.exists():
            data = json.loads(path.read_text())
        else:  # a new intermediate per-lens file
            data = {"ward": "Ladywell", "ward_code": "E05013725", lens: []}
        items = data.setdefault(lens, [])
        idx = next((i for i, e in enumerate(items) if e["dimension"] == dim), None)
        if idx is None:
            data[lens] = items + new
        else:
            rest = [e for e in items[idx:] if e["dimension"] != dim]
            data[lens] = items[:idx] + new + rest
        path.write_text(json.dumps(data, indent=2))

    loaded = [{e["indicator"]: e for e in entries(json.loads(p.read_text()), lens, dim)} for p in files]
    assert loaded[0] == loaded[1] == loaded[2], "the three files disagree after splicing"
    for e in loaded[0].values():
        assert Dimension.from_dict(e).to_dict() == e, f"schema round-trip failed: {e['indicator']}"
    print(f"Spliced {len(new)} '{dim}' indicators into {lens} in all 3 files; identical and schema-valid.")
    for e in new:
        snap = e.get("snapshot", {})
        print(f"  {e['indicator']}: {snap.get('value')} {snap.get('unit') or ''} ({snap.get('year')}), "
              f"{len(e.get('trend') or [])} trend points")


if __name__ == "__main__":
    main()
