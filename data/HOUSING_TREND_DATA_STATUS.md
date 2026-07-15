# Housing Dimension - Trend Data Status

## Date: 2026-07-14

### All 4 indicators complete ✅

**Rough Sleeping** (CHAIN database)
- Source: https://data.london.gov.uk/download/2n88x/jk5/CHAIN%20annual%20data%20tables%202025-26.ods
- Trend: 5 years (2021/22 - 2025/26)

```json
"trend": [
  {"period": "2021/22", "value": 264},
  {"period": "2022/23", "value": 296},
  {"period": "2023/24", "value": 353},
  {"period": "2024/25", "value": 325},
  {"period": "2025/26", "value": 345}
]
```

**Median rent as % of median pay**
- Source: Trust for London chart data export - https://trustforlondon.org.uk/data/dataset/1497/csv/
  (underlying: ONS Price Index of Private Rents + Annual Survey of Hours and Earnings via NOMIS)
- Method: Trust for London's site exposes the JSON/CSV feeding its Highcharts charts directly
  (`/data/dataset/<id>/settings/` and `/data/dataset/<id>/csv/`) - no manual chart-scraping or
  ODS parsing needed. Full quarterly series 2015 Q1-2025 Q4 downloaded; Q4 value used per year.
- Trend: 11 years (2015-2025)
- **Correction**: the previous snapshot (43.6%) was mislabelled "2023" - it is actually the
  2025 Q4 value. True 2023 Q4 value is 43.1%.

**Households in temporary accommodation**
- Source: MHCLG (formerly DLUHC) "Detailed local authority-level tables", Table TA1 -
  https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness
- Method: Downloaded quarterly ODS/XLSX files (one per quarter, not one per year), unzipped,
  parsed the `TA1` (or `TA1_`) sheet's raw `content.xml`/sheet XML directly with a small
  hand-written OpenDocument/OOXML cell parser (no `odfpy`/`pandas` available in this env).
  Matched Lewisham by ONS code `E09000023` rather than by name, since several quarters'
  footnotes also mention "Lewisham" as one of the local authorities with suppressed data.
- Lewisham did **not** submit usable figures for several quarters (Mar 2020, Jun 2020, Dec 2020,
  Mar 2022, Dec 2024, Mar 2025, Sep 2025) - confirmed via the England-level footnotes naming
  Lewisham among LAs with "no temporary accommodation figures or incomplete figures". The
  nearest available quarter was substituted for those years and is annotated per point.
- Trend: 7 years (FY2019-20 to FY2025-26), per-1,000-households rate

**% non-decent homes** (Decent Homes Standard failure rate)
- Source: MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling -
  https://www.gov.uk/government/collections/english-housing-survey-local-authority-stock-condition-modelling
  (part of the wider https://www.gov.uk/government/collections/english-housing-survey programme)
- Method: Each round publishes a "Non-Decent Homes by Local Authority" annex table (ODS) with
  every English LA's modelled non-decency rate. Sheet names vary by round (`Decent_Homes_LA` for
  2019/2020, `AT1_1` for 2023/2024) - located via each release's cover/contents sheet, then
  parsed the same way as the homelessness ODS files. Matched Lewisham by ONS code `E09000023`.
- Rounds: 2019, 2020, 2023, 2024 (no round in 2021/2022, likely COVID fieldwork disruption)
- Trend: Lewisham 15.0% (2019) -> 13.2% (2020) -> 11.6% (2023) -> 12.9% (2024), compared
  against the London-region row present in the same tables (14.0% / 12.0% / 10.7% / 13.2%)
- **Caveat**: MHCLG's own guidance explicitly says not to directly compare LA-level estimates
  across releases due to methodology changes between rounds - these are modelled estimates
  from EHS survey data, not a census. Set `confidence: medium` (vs `high` for the other 3
  housing indicators) to reflect this, and noted the caveat in the source notes.

**Empty homes (long-term vacant dwellings)** - *removed 2026-07-14 at user's request*
- Was sourced from MHCLG Live Table 615, "All_long_term_vacants" sheet (19-year trend,
  2007-2025), fully populated for the first time. Dropped from the housing dimension
  entirely (all 3 ward JSON files, `dimension_data_sources.json`,
  `build_housing_dimensions()`, `lewisham_real_data.json`, and the app.js explainer text)
  - no longer tracked here. Kept in git history if it's ever wanted back.

### Technical notes for future dimension extractions

- Government "Detailed local authority-level tables" ODS files are large (~1.3-2.3MB) but
  parseable directly from `content.xml` with regex once you know the target sheet name -
  no need for `odfpy` (not installed in this environment; `openpyxl`/`xlrd` are available
  for the years published as `.xlsx` instead of `.ods`).
- Always verify a candidate LA row by ONS/GSS code, not by name substring - footnotes and
  imputation-methodology text frequently contain LA names too.
- Charity/NGO sites built on Highcharts/Flourish-style embeds often expose the full
  underlying data via a `/dataset/<id>/csv/` or `/dataset/<id>/settings/` endpoint even when
  the visible page only shows an interactive chart - check page source for these before
  concluding data is only available as "an interactive chart" (this unblocked the rent series).
- `data/wards/ladywell_local_social.json` (pipeline-generated), `data/wards/ladywell.json`,
  and `site/data/wards/ladywell.json` are kept byte-identical for the housing dimension by
  always regenerating from `build_housing_dimensions()` and splicing into all 3 files -
  see `HOUSING_DATA_EXTRACTION_NOTE.md` for the reconciliation and why `assemble.py` itself
  still shouldn't be run.
