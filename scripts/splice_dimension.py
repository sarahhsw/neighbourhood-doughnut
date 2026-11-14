#!/usr/bin/env python3
"""Splice one dimension's builder output into all three ward JSON files.

Usage (from the repo root):
    python3 scripts/splice_dimension.py <dimension> [--check]

--check  compare the builder's output with the live site file and exit,
         without writing anything. Run this BEFORE editing a builder, to
         confirm it currently matches the live data (spec 13.2).

Without --check, replaces that dimension's entries in
site/data/wards/ladywell.json, data/wards/ladywell.json and
data/wards/ladywell_local_social.json, then verifies the three files agree
for that dimension and that every entry round-trips through the schema.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data" / "pipeline"))

import build_local_social_with_real_data as builders  # noqa: E402
from schema import Dimension  # noqa: E402

FILES = [
    ROOT / "site/data/wards/ladywell.json",
    ROOT / "data/wards/ladywell.json",
    ROOT / "data/wards/ladywell_local_social.json",
]


def builder_for(dim):
    for name in (f"build_{dim}_dimensions", f"build_{dim}"):
        fn = getattr(builders, name, None)
        if fn:
            return name, fn
    sys.exit(f"No builder found for '{dim}' (tried build_{dim}_dimensions and build_{dim}).")


def entries(data, dim):
    return [e for e in data["local_social"] if e["dimension"] == dim]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    dim = args[0]
    name, fn = builder_for(dim)
    result = fn()
    new = [d.to_dict() for d in (result if isinstance(result, list) else [result])]

    if "--check" in sys.argv:
        live = entries(json.loads(FILES[0].read_text()), dim)
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

    for path in FILES:
        data = json.loads(path.read_text())
        idx = next((i for i, e in enumerate(data["local_social"]) if e["dimension"] == dim), None)
        if idx is None:
            sys.exit(f"'{dim}' not found in {path}")
        rest = [e for e in data["local_social"][idx:] if e["dimension"] != dim]
        data["local_social"] = data["local_social"][:idx] + new + rest
        path.write_text(json.dumps(data, indent=2))

    loaded = [{e["indicator"]: e for e in entries(json.loads(p.read_text()), dim)} for p in FILES]
    assert loaded[0] == loaded[1] == loaded[2], "the three files disagree after splicing"
    for e in loaded[0].values():
        assert Dimension.from_dict(e).to_dict() == e, f"schema round-trip failed: {e['indicator']}"
    print(f"Spliced {len(new)} '{dim}' indicators into all 3 files; identical and schema-valid.")
    for e in new:
        snap = e.get("snapshot", {})
        print(f"  {e['indicator']}: {snap.get('value')} {snap.get('unit') or ''} ({snap.get('year')}), "
              f"{len(e.get('trend') or [])} trend points")


if __name__ == "__main__":
    main()
