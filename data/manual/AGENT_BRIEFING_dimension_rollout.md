# Briefing: populate a Local Social dimension to full spec

You are one of several agents working in parallel, each on a **different** Local Social
dimension for the Ladywell ward doughnut. Each of you works in your own isolated git
worktree/branch, so there is no risk of clobbering another agent's files directly - but you
must still stay **strictly inside your assigned dimension's data** in every shared file you
touch, because your branch will later be merged alongside the others.

**Read `DIMENSION_PAGE_SPECIFICATION.md` in full before starting.** It is the authoritative
spec (workflow, sourcing discipline, editorial rules, JSON schema, pipeline sync rules). This
briefing is a short pointer into it with your specific parameters filled in - it does not
replace it.

Ladywell ward constants: `ward="Ladywell"`, `ward_code="E05013725"`. Borough: Lewisham,
GSS code `E09000023`. Comparators to use where relevant: London average, England average.
Today's date for `"accessed"` fields: use the actual current date you're running on.

## Reference implementations (your quality bar)

Two dimensions are already built to full spec - use them as your template for structure,
depth, and tone:
- **Housing**: `build_housing_dimensions()` in `data/pipeline/build_local_social_with_real_data.py`
  (lines ~51-170), plus its `'housing'` blocks in `site/js/app.js` (`dimensionDescriptions`,
  `getWhatThisMeasures`, `getCouncilContext`, `getNeighbourVoices`).
- **Food**: `build_food_dimensions()` in the same file, plus its `'food'` blocks in `app.js`.

Both show: real fetched data with full source metadata, 5-10yr trend arrays (with `"note"`
fields for suppressed/substituted data points), a synthesized ≤130-word top description
picking 1-3 sharp borough-specific facts (not a stat-dump, not generic), per-indicator "what
this measures" narrative text, up to 3 council-context documents with hyperlinked sources, and
5 neighbour-voice quotes.

## What "done" means for your dimension - six files, every time

1. **`data/pipeline/build_local_social_with_real_data.py`** - write/extend
   `build_<your_function_name>()` to return a **list** of `Dimension` objects (one per
   indicator), using `create_targeted_dimension(...)` when a real target/benchmark exists or
   `create_descriptive_dimension(...)` when it doesn't. Include `trend=[...]` on every
   indicator where historical data exists (minimum 3 points, aim 5-10 years). If you can't find
   real data for an indicator after a genuine search effort, do not fabricate a trend or a
   snapshot - use `Confidence.LOW`, state clearly in `source.notes` that only a single/partial
   data point was found, and move on. Never leave a placeholder `value=0.0` in the final output.

2. **Splice into all three ward JSON files** (do NOT hand-edit just one):
   `site/data/wards/ladywell.json`, `data/wards/ladywell.json`,
   `data/wards/ladywell_local_social.json`. Use this exact pattern (see spec 13.3), replacing
   only your dimension's block and leaving every other dimension's entries in each file
   byte-for-byte untouched:
   ```python
   import json
   from build_local_social_with_real_data import build_<your_function_name>

   new_entries = [d.to_dict() for d in build_<your_function_name>()]
   for path in ['site/data/wards/ladywell.json', 'data/wards/ladywell.json',
                'data/wards/ladywell_local_social.json']:
       d = json.load(open(path))
       idx = next(i for i, e in enumerate(d['local_social']) if e['dimension'] == '<your_json_dimension_key>')
       d['local_social'] = (d['local_social'][:idx] + new_entries +
                             [e for e in d['local_social'][idx:] if e['dimension'] != '<your_json_dimension_key>'])
       json.dump(d, open(path, 'w'), indent=2)
   ```
   Run from the **repo root**, never from inside `data/pipeline/` (relative-path footgun, see
   spec 13.5). Verify afterward the three files are identical for your dimension and that
   `Dimension.from_dict(e).to_dict() == e` round-trips (spec 13.3 step 4).

3. **`data/lookups/dimension_data_sources.json`** - update so it exactly matches the indicators
   you actually built (fix null `source_url` values you resolved, add `notes` on
   underlying-source chains per spec 1.4). Keep the `"dimension"` field value already used for
   your indicators in *this specific file* (given to you below - it may differ textually from
   the ward-JSON dimension key, e.g. `"income_and_work"` vs `"income"`; that mismatch is
   pre-existing across the codebase, don't try to rename it site-wide).

4. **`site/js/app.js`** - four separate additions, all keyed by your **ward-JSON dimension
   key** (given below):
   - One new entry in the `dimensionDescriptions` object (~line 424) - the ≤130-word top
     synthesis (spec 2.1/2.2).
   - One new `if (baseName === '...')` block inside `getWhatThisMeasures()` (~line 435) **per
     indicator**, matched on the indicator's exact name string (see existing blocks for
     pattern). This is the per-indicator narrative (spec 2.2/2.5).
   - One new `if (dimensionName === '...')` block inside `getCouncilContext()` (~line 516),
     returning an array of 1-3 `{title, year, url, summary}` objects (spec section 3). Research
     real Lewisham council/GLA/government strategy documents - do not invent URLs.
   - One new `if (dimensionName === '...')` block inside `getNeighbourVoices()` (~line 618),
     returning 5 `{name, location, date, quote}` objects - invented-but-plausible resident
     quotes tied to real findings from your research, per spec section 4.
   Insert your new blocks immediately before the existing `'water'` block's closing (or
   anywhere else that reads cleanly) - don't reorder or touch any other dimension's block.
   Run `node -c site/js/app.js` when done to confirm no syntax errors (watch apostrophe
   escaping - spec pitfall #12).

## Hard rules

- **Never hardcode/fabricate data.** Fetch live from official sources (ONS, MHCLG/DLUHC, OHID
  Fingertips, GLA/London Datastore, TfL, Trust for London, DCMS, NOMIS, LG Inform, MPS, Ofcom -
  whichever applies). If a source needs ODS/XLSX parsing, see spec section 1.6 for the
  no-`odfpy` workaround (unzip + parse `content.xml` with regex) and section 8 for
  curl/pandas/openpyxl examples. `curl` a council PDF with a normal browser User-Agent if a
  generic fetch 403s/404s.
- **Do not touch any other dimension's entries** in any of the 6 files above.
- **Do not bump the CSS/JS cache-busting version numbers in `ward.html`** - that's handled once,
  centrally, after all dimensions are merged.
- **Do not run `assemble.py`.**
- **Do not push to any git remote.** Just commit your work locally on your branch with a clear
  message; the orchestrating session will handle integration.
- **130-word cap on the top description - actually count it.** No stat-dump, no genericness
  (spec 2.1 bad examples #1 and #2). No empty scene-setting filler (spec 2.2). Every specific
  factual claim - including in council-context summaries - needs a source you personally
  checked (spec 2.2, 2.1 bad example #3: don't add unsourced causal language between two real
  facts).
- **Geography labelling**: pick `geography_of_data` from the fixed taxonomy in spec 2.7 based
  on what the *source* actually measured, not what sounds authoritative.
- **Status logic** (spec 2.4): `descriptive_only` indicators still map to `status: "shortfall"`
  for social-ring dimension-card/detail-page display purposes per the JS logic already in
  `app.js` - you don't need to change that logic, just make sure your `Dimension.status` field
  itself is set correctly per `create_targeted_dimension`/`create_descriptive_dimension`
  (targeted → shortfall/met/overshoot based on real comparison; descriptive → `descriptive_only`).

## When you're done

Report back (this is what gets read, so make it complete and skimmable):
- Your dimension name and JSON dimension key
- Every indicator you built: name, final value + year, source name/URL, trend point count,
  confidence level
- Any indicator you could NOT find real data for, and what you tried
- Confirmation that: all 6 files were updated correctly, the three ward JSONs are identical for
  your dimension, `Dimension.from_dict(e).to_dict() == e` round-trips, `node -c site/js/app.js`
  passes
- Your branch name (already known to the orchestrator from the worktree tool, but restate it)
- Word count of your top description (must be ≤130)
