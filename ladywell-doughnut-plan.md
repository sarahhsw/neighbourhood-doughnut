# Neighbourhood Doughnut Portrait — Build Plan
## Pilot: Ladywell ward, London Borough of Lewisham

This document is a build spec for Claude Code. It covers: why this ward, the data
model, a full data dictionary (source, metrics, geography, official targets)
for every Local Social dimension, the pipeline architecture, the frontend
architecture, and a phased task list.

---

## 1. Why Ladywell

Lewisham's wards were redrawn in May 2022 (18 → 19 wards). **Ladywell** survived
the review as a three-councillor ward — notably after a local "Save Ladywell"
campaign successfully argued for boundaries different from both the council's
and the opposition's original proposals, which tells you something useful in
itself: this is a ward with an active, organised local community (Ladywell
Society, Friends of Hilly Fields, Ladywell Village Improvement Group), which
matters if/when you add community-contributed notes in Phase 2.

Ladywell sits between Lewisham Central, Hither Green, Brockley and Catford.
It contains Ladywell Fields and Arena and shares Hilly Fields — real, named
green space assets, which is a genuine advantage for the Local Ecological
lens (most UK wards have thin green-space data; this one has identifiable
named parks to anchor it).

Lewisham's own ward-profile dashboard (Lewisham Observatory) already
publishes a dedicated Ladywell profile PDF with real figures, e.g.:
- Gender split: 50.8% female / 49.2% male
- Ethnicity breakdown including Black African 9.4%
- Main non-English language spoken vs. Lewisham average of 3.1%
- EPC ratings: 43% of assessed dwellings rated A/B/C, with an estimated
  potential of up to 82% if retrofit works were carried out
- £62,923 of Neighbourhood CIL (NCIL) funding awarded to 11 local projects

**First task for Claude Code**: confirm the current ONS ward (GSS) code for
Ladywell under the 2022 boundaries via the ONS Open Geography Portal — don't
guess it.

---

## 2. Data model

Every dimension, in every lens, is one record with this shape (the five-part
recipe from both source documents — target / indicator / threshold / snapshot
/ status — plus geography, provenance, confidence, and a community-notes
placeholder):

```json
{
  "ward": "Ladywell",
  "ward_code": "TBC — confirm current ONS ward code",
  "lens": "local_social",
  "dimension": "housing",
  "target": {
    "text": "Aspiration/policy target, verbatim where possible",
    "source_body": "GLA | UK Government (Defra/DfE/DESNZ) | none_found",
    "has_official_target": true
  },
  "indicator": "The specific metric used to track it",
  "threshold": { "value": null, "unit": null, "description": "what counts as safe/just" },
  "snapshot": { "value": null, "unit": null, "year": null },
  "status": "shortfall | overshoot | met | descriptive_only | unknown",
  "geography_of_data": "ward | lsoa_aggregated | msoa_aggregated | postcode_aggregated | borough_inherited | london_inherited | national_inherited",
  "source": {
    "name": "",
    "url": "",
    "accessed": "",
    "notes": "e.g. downscaled from borough figure using X assumption"
  },
  "confidence": "high | medium | low",
  "community_notes": []
}
```

Two additions since the last version:
- `target.has_official_target` — roughly half of the 15 Local Social
  dimensions have **no** GLA/UK-government numeric target at all (see §3).
  Where that's true, `status` should be `descriptive_only`, not forced into
  shortfall/overshoot against a target that doesn't exist.
- `geography_of_data` now has more granular values than before
  (msoa/postcode-level added), because several corrected sources below sit at
  a finer or different resolution than ward.

`community_notes` still ships empty for Phase 2.

---

## 3. Local Social lens — data dictionary (source, metrics, geography, target)

Corrections applied from the original draft, flagged explicitly:
- **Peace & Justice**: switched from Police.uk to the **London Datastore's MPS
  Recorded Crime: Geographic Breakdown** dataset — this is genuinely ward and
  LSOA level (confirmed), monthly, and is the dataset the London Portrait's
  own crime figures are ultimately drawn from. Police.uk is a different portal
  covering similar underlying data but wasn't what either source report cited.
- **Education**: split into two separate datasets that were previously
  conflated — **DfE school performance tables** (attainment: Attainment 8,
  Progress 8, grade 5+ English/Maths %) as the primary quantitative source,
  and **Ofsted inspection ratings** as a separate, optional supplementary
  indicator (rating band, not a performance score).
- **IMD 2019 downweighted**: the London City Portrait explicitly warns against
  over-reliance on it — "blunt and out of date" — and its underlying data is
  now stale (largely 2015-18). IMD is retained only as a **cross-check**
  against live sources (GLA ward atlas, Lewisham Observatory, DWP Stat-Xplore),
  never as the primary figure for a dimension, and every record sourced from
  IMD should carry `confidence: "low"` plus a note referencing this caveat.

### Health
- **Sources**: ONS Census 2021 (self-rated health, disability); OHID Fingertips
  (child obesity via National Child Measurement Programme, adult obesity,
  smoking, diabetes, recorded depression prevalence); GP practice QOF data
- **Metrics**: self-rated health (5-point scale), disability limitation status,
  healthy life expectancy (years), reception/Year 6 obesity %, disease
  register prevalence %
- **Geography**: Census — Output Area (aggregate to ward). OHID — mostly
  borough, some MSOA. GP QOF — practice level, doesn't map cleanly to ward
- **Official target**: Mayor's Health Inequalities Strategy (2018) — reduce the
  gap in healthy life expectancy between richest/poorest areas.
  `has_official_target: true`

### Housing
- **Sources**: EPC open data register; Census 2021 (tenure, occupancy rating,
  bedrooms); Land Registry Price Paid Data; CHAIN (rough sleeping, borough
  level only)
- **Metrics**: EPC rating (A-G) + potential rating, floor area, heating fuel;
  tenure type, occupancy rating (+2 to -2, a genuine overcrowding measure);
  sale price, property type; rough sleeper counts (borough only)
- **Geography**: EPC — address (aggregate to ward). Census — Output Area.
  CHAIN — borough only, cannot get Ladywell-specific rough sleeping counts
- **Official target**: London Plan (2021) — 50% affordable housing on public
  land, 35% viability threshold elsewhere; Mayor's commitment to end rough
  sleeping. `has_official_target: true`

### Food
- **Sources**: DfE school census (free school meal eligibility, proxy only);
  Food Foundation food insecurity tracker (national survey, not small-area);
  Trussell Trust (foodbank location, not resident demand)
- **Metrics**: % pupils FSM-eligible per school; % households food-insecure
  (national only); parcels distributed per foodbank
- **Geography**: FSM — school point. Food Foundation — national/regional only
- **Official target**: none found. `has_official_target: false`,
  `status: descriptive_only`

### Water
- **Sources**: Environment Agency flood risk maps (address-level, relevant to
  Local Ecological too); Thames Water Resource Management Plan (regional)
- **Metrics**: flood risk band (high/medium/low/very low); supply-demand gap,
  leakage rate (regional, not localisable)
- **Geography**: flood risk — address point (aggregate to ward). Supply data —
  regional only, inherit as `london_inherited`
- **Official target**: national target (Defra/Building Regs) of 110
  litres/person/day for new-build; no GLA-specific target.
  `has_official_target: true` (national, not GLA)

### Connectivity
- **Sources**: Ofcom Connected Nations (postcode-level coverage/speed); LOTI
  digital exclusion estimates (borough level)
- **Metrics**: % gigabit-capable premises, % with "decent" broadband, 4G/5G
  coverage %, median download speed
- **Geography**: Ofcom — postcode (aggregate to ward, strongest source here).
  LOTI — borough only
- **Official target**: LOTI's digital inclusion programme has an approximate
  Londoners-reached target — confirm current figure before citing it in the
  UI rather than relying on this document's recall. `has_official_target:
  true (approximate, verify)`

### Community
- **Sources**: Lewisham NCIL funding records (ward-native, itemised); Charity
  Commission register (postcode); Community Life Survey (national, no ward
  breakdown)
- **Metrics**: NCIL project name/amount/category per ward; charity count and
  income band per postcode; % volunteering / % feeling able to influence
  local decisions (national only)
- **Geography**: NCIL — ward (native). Charity Commission — postcode
  (aggregate). Community Life Survey — national/regional only
- **Official target**: Mayor's Strategy for Social Integration (2018) —
  aspirational, no hard numeric target. `has_official_target: false`,
  `status: descriptive_only`

### Culture
- **Sources**: GLA Cultural Infrastructure Map (venue point data); library
  service data (opening hours, visitor numbers); Arts Council England (grants,
  point data)
- **Metrics**: venue type/capacity/status; library visits and loans per
  branch; grant amounts per venue
- **Geography**: point data, aggregate to ward
- **Official target**: Mayor's Culture Strategy — protect grassroots venues,
  no citywide numeric target. `has_official_target: false`,
  `status: descriptive_only`

### Mobility
- **Sources**: TfL PTAL scores (point); TfL Open Data (bus stops, cycle hire,
  journey times); Census 2021 travel-to-work mode
- **Metrics**: PTAL band (0 to 6b); bus service frequency; cycle hire usage
  counts; % travelling to work by mode
- **Geography**: TfL data — point (aggregate to ward, strongest dimension for
  small-area London data). Census — Output Area
- **Official target**: Mayor's Transport Strategy — **80% of trips by
  sustainable modes by 2041** (London currently ~64-68%, tracked via the
  Healthy Streets Scorecard, borough-level targets vary, inner boroughs
  averaging 88%, outer 69%); Vision Zero — no one killed in/by a bus by 2030,
  zero deaths/serious injuries by 2041; car ownership down 250,000 vs 2018
  baseline of 2,507,585, by 2041. `has_official_target: true` — the strongest
  target/indicator pair of all 15 dimensions

### Education
- **Sources**: DfE school performance tables (attainment, primary source);
  Ofsted inspection ratings (separate dataset, supplementary only); Census
  2021 (adult qualifications)
- **Metrics**: Attainment 8 score, Progress 8 score, % grade 5+ English/Maths,
  EBacc entry rate (DfE); overall effectiveness rating + sub-judgements
  (Ofsted, kept separate from attainment); highest qualification held (Census)
- **Geography**: school point (assign to ward by location, noting pupils
  don't only attend in-ward schools). Census — Output Area
- **Official target**: none GLA-set (education is DfE-led nationally, not a
  Mayoral competency). `has_official_target: false`,
  `status: descriptive_only`

### Energy
- **Sources**: EPC register (same dataset as Housing); DESNZ sub-regional fuel
  poverty statistics
- **Metrics**: EPC rating/potential (reused from Housing); % households in
  fuel poverty (LILEE definition), average fuel poverty gap (£)
- **Geography**: EPC — address. DESNZ — LSOA (aggregate to ward)
- **Official target**: UK Fuel Poverty Strategy for England — as many
  fuel-poor homes as reasonably practicable to reach **EPC Band C by 2030**
  (national statutory milestone, not GLA-specific). `has_official_target:
  true` (national)

### Income
- **Sources**: DWP Stat-Xplore Universal Credit claimant data (ward level,
  monthly); ASHE (MSOA level, not ward); IMD income domain (cross-check only,
  see caveat above)
- **Metrics**: UC claimant count by conditionality regime and household type;
  median/mean gross weekly pay (MSOA); % income-deprived (IMD, LSOA)
- **Geography**: Stat-Xplore — ward (native, strongest source). ASHE — MSOA
  only. IMD — LSOA, cross-check only
- **Official target**: London Living Wage rate, set annually by the Mayor;
  tracked via GLA Economics' annual % paid below LLW survey.
  `has_official_target: true`

### Jobs
- **Sources**: ONS BRES (job counts by industry, LSOA/ward); Nomis claimant
  count (ward, monthly, strongest currency); ASHE occupation-level earnings
  (MSOA)
- **Metrics**: job counts by 2-digit SIC code; unemployment claimant count as
  % of working-age population; earnings by occupation type
- **Geography**: BRES/Nomis — ward/LSOA. ASHE — MSOA only
- **Official target**: London Growth Plan (2025) — **2% productivity growth
  per year**, grow London's economy by **£107bn over 10 years**, **20%
  increase in real household income by 2035**. `has_official_target: true`
  (city-wide target, not ward-specific, inherit as `london_inherited` for the
  target text itself while using ward-level Nomis data for the snapshot)

### Peace & Justice — corrected source
- **Sources**: **London Datastore — MPS Recorded Crime: Geographic Breakdown**
  (ward and LSOA level, monthly — replaces Police.uk in the original draft);
  Police & Crime Plan Outcomes dashboard (borough-level targets); MOPAC
  confidence-in-policing survey (borough only, no ward breakdown)
- **Metrics**: crime count by category (burglary, violence against the
  person, robbery, theft, criminal damage, drug offences); MOPAC outcome
  metrics (e.g. knife-crime injury reduction, victim satisfaction rate)
- **Geography**: MPS dataset — ward/LSOA (native, confirmed). Confidence
  survey — borough only
- **Official target**: Mayor's Police & Crime Plan sets specific numeric
  outcome targets (varies by measure, e.g. knife-crime injury reductions
  among under-25s) — tracked via the Police & Crime Plan Outcomes dashboard,
  not the raw crime count dataset. `has_official_target: true`

### Political Voice
- **Sources**: Lewisham Electoral Services (local election turnout/results,
  ward-native); electoral roll registration rate (confirm availability at
  ward level directly with Lewisham); British Social Attitudes Survey
  (national only)
- **Metrics**: turnout %, votes per candidate/party, seats won; registration
  rate as % eligible; % trusting politicians (national only)
- **Geography**: election results — ward (native, strongest source here).
  Trust survey — national only, inherit as `national_inherited`
- **Official target**: **none exists** — no GLA or UK government target for
  turnout or trust levels. `has_official_target: false`,
  `status: descriptive_only`

### Social Equity
- **Sources**: council tax valuation list (band distribution per ward,
  proxy for wealth spread); IMD income domain (cross-check only, see caveat)
- **Metrics**: % of properties per council tax band A-H; % income-deprived
  (IMD, low confidence)
- **Geography**: council tax bands — address (aggregate to ward). IMD — LSOA
- **Official target**: **none exists** — GLA's City Intelligence Unit
  publishes descriptive wealth-distribution analysis (e.g. the "poorest 50%
  hold 4% of wealth" figure) but there is no Mayoral target attached to it.
  `has_official_target: false`, `status: descriptive_only`

### Equality in Diversity
- **Sources**: Census 2021 (ethnicity, religion, national identity, language,
  disability, sexual orientation/gender identity — new in 2021); GLA
  ethnicity pay gap data (borough/London level, not ward); mandatory
  employer ethnicity pay gap reporting (company level, not neighbourhood)
- **Metrics**: 18-category ethnicity breakdown, religion, main language,
  disability status, sexual orientation/gender identity (16+, voluntary) —
  this is exactly what the Lewisham Observatory's Ladywell profile already
  draws from
- **Geography**: Census — Output Area (aggregate to ward, genuinely strong
  source). Pay gap data — company/borough level, not usable at ward scale
- **Official target**: GLA Group workforce diversity targets exist but apply
  to the GLA's own workforce, not London's population — **no population-level
  target exists**. `has_official_target: false`, `status: descriptive_only`

---

## 4. Local Ecological lens (unchanged from prior draft — still proxy-based)

UK Natural Capital Accounts don't exist below city/region level, so this
lens remains built from proxies, anchored on Ladywell's named green-space
assets (Ladywell Fields/Arena, part of Hilly Fields):

| Source | Proxy for | Geography |
|---|---|---|
| GiGL (Greenspace Information for Greater London) | Green space extent, access to nature | Borough/ward |
| London street tree data (GLA Datastore) | Tree canopy / biodiversity proxy | Point (aggregate to ward) |
| London Atmospheric Emissions Inventory (LAEI) | Air quality (NO2, PM2.5) | Small-area modelled grid (aggregate to ward) |
| Environment Agency flood risk maps | Flood risk | Address/point (aggregate to ward) |

Mark every dimension `geography_of_data: "lsoa_aggregated"` or similar, and
flag clearly in the UI that these are proxies, not direct ecosystem-service
accounts.

---

## 5. Global Ecological and Global Social lenses (unchanged — inherited)

Per your confirmed decision: hardcode the London City Portrait's own
published figures for every Lewisham ward, Ladywell included, all tagged
`geography_of_data: "london_inherited"`:

- Climate change / ocean acidification overshoot: 5.5×
- Material footprint overshoot: 1.1×
- Ecological footprint overshoot: 2.2×
- Nitrogen: 1.9×, Phosphate: 1.2×
- Land-system change: 2.8×
- Freshwater use: 2.6×
- Air pollution: 0.6× (within boundary)
- Biosphere integrity / novel entities / ozone depletion: no data — mark
  explicitly, don't fabricate a number

No income/deprivation scaling adjustment in Phase 1 — no precedent for it in
either source document; flag as a v2 idea only.

---

## 6. Repository structure

```
neighbourhood-doughnut/
├── data/
│   ├── raw/                  # untouched downloads, one subfolder per source
│   ├── lookups/               # ONS ward/LSOA/OA lookup tables, ward boundary GeoJSON
│   ├── pipeline/               # fetch + clean + aggregate scripts (Python)
│   └── wards/
│       └── ladywell.json      # final assembled record, matches schema in §2
├── site/
│   ├── index.html              # ward selector (just one ward for now)
│   ├── ward.html                # renders the four-lens doughnut for a ward
│   ├── js/
│   │   ├── chart.js             # radial doughnut chart renderer
│   │   └── app.js
│   └── css/
├── .github/workflows/deploy.yml   # GitHub Pages deploy on push
└── README.md
```

---

## 7. Data pipeline (Python)

1. `pipeline/fetch_*.py` — one script per source in §3/§4, downloads raw data
   into `data/raw/<source>/`, idempotent (skip if already downloaded today)
2. `pipeline/lookups.py` — loads ONS geography lookup tables (LSOA→ward,
   OA→LSOA, MSOA→ward, postcode→everything); confirm and hardcode Ladywell's
   current GSS ward code here
3. `pipeline/build_local_social.py`, `build_local_ecological.py`,
   `build_global.py` — each reads raw data + lookups, applies the schema in
   §2 (including `target.has_official_target`), writes partial records
4. `pipeline/assemble.py` — merges partial outputs into
   `data/wards/ladywell.json`
5. Run order: `lookups.py` first; `build_*` scripts are otherwise independent

Use `pandas` for aggregation, `geopandas` only for spatial joins (trees,
crime, schools, PTAL points) to the ward boundary polygon. Ward boundary
itself from the ONS Open Geography Portal or Lewisham Observatory's own file.

---

## 8. Frontend

Plain HTML/CSS/vanilla JS, no framework needed for one ward and four lenses:

- Fetches `data/wards/ladywell.json` at load time
- Hand-rolled SVG radial bar chart — N wedges around a circle, bar length =
  distance from a fixed inner radius, colour = status
- Dimensions with `status: "descriptive_only"` should render visually
  distinct from shortfall/overshoot bars (e.g. a neutral grey wedge, not a
  red one) — don't imply a target judgement where none exists
- Every dimension shows its `geography_of_data` tag and `confidence` level
  visibly, not buried in a tooltip
- `community_notes` renders as an empty "no notes yet" state for now

---

## 9. Hosting

**GitHub Pages.** Static output, no server, deploys from `site/` via GitHub
Actions on push to `main`. Data pipeline output (JSON) lives in the same
repo, versioned alongside code.

---

## 10. Phased task list for Claude Code

**Phase 1 — one ward, four lenses, static site**
1. Scaffold repo structure (§6)
2. Confirm Ladywell's current ONS ward (GSS) code and download/verify the
   ward boundary
3. Build `lookups.py`
4. Build and run the Local Social fetch/build scripts (§3) — cross-check
   against the Observatory's Ladywell PDF; use corrected sources (MPS
   Recorded Crime dataset for Peace & Justice, DfE attainment + separate
   Ofsted for Education, IMD as cross-check only)
5. Build and run the Local Ecological fetch/build scripts (§4), anchored on
   Ladywell Fields/Arena and Hilly Fields, flagged as proxy-based
6. Hardcode the Global Ecological/Global Social records (§5)
7. Run `assemble.py`, inspect `ladywell.json` against the schema
8. Build the static frontend (chart + four-lens layout, descriptive-only
   styling for the ~7 dimensions with no official target)
9. Deploy to GitHub Pages, confirm it renders

**Phase 2 — community notes**
10. Add a simple submission form (external form service to start) — Ladywell's
    existing civic groups are a plausible first testing audience
11. Fold approved submissions into `community_notes` on rebuild

**Phase 3 — scale to more wards** (not started — revisit once Phase 1 is
validated)

---

## 11. Caveats to carry into the UI itself

- Both source documents are explicit that shortfall/overshoot judgements
  involve interpretation, not pure arithmetic. Show `confidence` and
  `geography_of_data` per dimension; don't let the chart imply precision the
  data doesn't have.
- **IMD 2019 is a cross-check, not a primary source**, per the London
  Portrait's own warning that it "can be inaccurate and out of date." Any
  dimension leaning on IMD as its main figure should be reconsidered.
- **Roughly half of the 15 Local Social dimensions have no official
  GLA/UK-government target** (Food, Community, Culture, Education, Political
  Voice, Social Equity, Equality in Diversity). These render as
  `descriptive_only` — present the data honestly without forcing a
  shortfall/overshoot verdict that has no target to be measured against.
