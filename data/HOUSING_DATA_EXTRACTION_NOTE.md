# Housing Dimension - Data Extraction Status

## Date: 2026-07-14

### Status: Complete ✅

All 4 housing indicators now have current snapshots and multi-year historical trends,
sourced directly from primary government/data-provider datasets (not just Trust for
London's summary page). See `HOUSING_TREND_DATA_STATUS.md` for full method notes per
indicator.

### Indicators & Current Values

#### 1. Temporary Accommodation
- **Current**: 18.90 per 1,000 households / 2,363 households (Lewisham, 31 Dec 2025)
- **Trend**: 7 years (FY2019-20 to FY2025-26)
- **Source**: MHCLG Detailed Local Authority Tables, Table TA1 (quarterly)

#### 2. Rough Sleeping
- **Current**: 345 people (Lewisham, 2025/26)
- **Trend**: 5 years (2021/22 - 2025/26)
- **Source**: CHAIN database via GLA London Datastore

#### 3. Rent Affordability (Median rent as % of median pay)
- **Current**: 43.6% (Lewisham, 2025 Q4) - previously mislabelled as "2023" data
- **Trend**: 11 years (2015-2025), quarterly resolution available if needed
- **Source**: Trust for London chart data export (ONS PIPR + ASHE via NOMIS underneath)

#### 4. % Non-Decent Homes
- **Current**: 12.9% (Lewisham, 2024) vs London average 13.2% - status MET
- **Trend**: 4 rounds (2019, 2020, 2023, 2024; no round in 2021/2022)
- **Source**: MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling
- **Caveat**: these are modelled estimates from EHS survey data, not a census, and MHCLG's
  own guidance says not to directly compare LA estimates across releases due to methodology
  changes between rounds - treat the trend as indicative rather than precise. Confidence
  set to MEDIUM (vs HIGH for the other 3) to reflect this.

**Empty homes (long-term vacant dwellings) was extracted (MHCLG Live Table 615, 19-year
trend 2007-2025) but subsequently removed from this dimension at the user's request on
2026-07-14** - dropped from `dimension_data_sources.json`, all 3 ward JSON files, the
`build_housing_dimensions()` builder, `lewisham_real_data.json`, and the app.js explainer
text. No longer tracked as a housing indicator.

### Architecture gap - reconciled 2026-07-14

The housing-specific part of this gap is now fixed:

- `schema.py`'s `Dimension` dataclass gained an optional `trend` field (and the
  `create_targeted_dimension`/`create_descriptive_dimension` helpers gained a `trend=`
  kwarg), included in `to_dict()` only when set. Verified `from_dict()` -> `to_dict()`
  round-trips all 4 housing entries byte-for-byte.
- `build_local_social_with_real_data.py`'s `build_housing()` was replaced with
  `build_housing_dimensions()`, returning all indicators (rent, temporary accommodation,
  rough sleepers) with full trend arrays, matching `site/data/wards/ladywell.json`
  exactly. `main()` now unpacks this list instead of appending a single dimension.
- `data/wards/ladywell_local_social.json` (the pipeline's intermediate file) had its 3 stale
  housing entries - including the unrelated "Gross median household income" mislabelled
  under `dimension: housing` - replaced with the correct set, spliced in directly (all other
  dimensions in that file were left untouched).
- `data/wards/ladywell.json` (the non-site duplicate that `assemble.py` also writes) was
  re-synced from `site/data/wards/ladywell.json`; the two are now byte-identical.

**Still open, out of scope for this pass**: `build_local_social_with_real_data.py`'s other
`build_*()` functions still each return a single `Dimension`, while several dimensions in the
live site file (health, income, etc.) carry multiple indicators - `data/wards/ladywell_local_social.json`
already reflects that richer multi-indicator shape (health: 4 entries, income: 5 entries) but
the Python source that's supposed to generate it doesn't. **Do not run `assemble.py`** until
those build functions are brought in line, since it does a full overwrite of both
`data/wards/ladywell.json` and `site/data/wards/ladywell.json` from the (currently
incomplete-for-non-housing) build scripts and would regress every dimension besides housing
back to one indicator each.
