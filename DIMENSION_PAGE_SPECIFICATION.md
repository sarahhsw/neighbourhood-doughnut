# Dimension Page Specification
## Complete requirements for building a neighbourhood doughnut dimension detail page

---

## 1. Data Requirements

### 1.1 Data Collection

**CRITICAL: NEVER HARDCODE DATA OR TARGETS**

**Single Source of Truth:** `data/lookups/dimension_data_sources.json` - always read this file first to get indicators and source URLs for any dimension.

- **Always fetch latest data from source** - Data values and targets must ALWAYS be retrieved fresh from the official data sources listed in `dimension_data_sources.json`
- **No static values** - Do not copy/paste old figures or use previously recorded values. Always check the current source
- **Check the JSON first** - Before building any dimension page, read `dimension_data_sources.json` to get the current list of indicators and sources
- **Find data independently** - Do not wait for data to be provided. Use web searches, official data sources, and government statistics
- **Verify all figures** - Always check and verify data points against original sources
- **Use factual details only** - Never make up or speculate about data. If data cannot be found, state this clearly
- **Match comparison periods** - When comparing ward-level data to regional/national averages, ensure the time periods match exactly
- **Document data sources** - Keep track of where data comes from for verification
- **Check publication dates** - Always note when the source was last updated and use the most recent available data
- **Identify data vintage** - Record the time period the data represents (e.g., "2022-2024", "Q4 2023", "Academic year 2023/24")
- **Update the JSON** - If you find better/newer sources or URLs have changed, update `dimension_data_sources.json`
- **Classify the data's true geography** - Every indicator's `geography_of_data` field must reflect what the *source* actually covers (Ward / Borough / Water company / London / England / UK), not what the ward page happens to display it on. See section 2.7 for the full taxonomy and worked examples of getting this wrong.

### 1.2 Data Freshness Validation

**Before using any data point, verify:**
- When was the source dataset last published/updated?
- What time period does the data cover? (e.g., "2022-2024", "Academic year 2023/24", "Q4 2023")
- Is there a newer version of this dataset available?
- Has the source URL changed? (Update Section 10 if needed)
- Are comparison benchmarks (London avg, national avg) from the same time period?

**Data vintage documentation:**
- Record `"year": "2023"` or `"year": "2022-2024"` in the data structure
- Note `"accessed": "2026-07-13"` to show when you retrieved the data
- Add `"notes"` field with publication date: "Published June 2024, covering period 2022-2024"

### 1.3 Historical Data & Trend Analysis

**CRITICAL: For EACH indicator, always extract and plot historical data**

- **Check for time series data** - Most official sources provide historical data spanning multiple years
- **Extract full historical series** - Do not just take the latest value; download the complete time series
- **Create trend arrays** - Structure historical data as `"trend": [{"period": "2020", "value": 65.2}, ...]`
- **Minimum requirement**: At least 3 historical data points where available
- **Ideal coverage**: 5-10 years of historical data to show meaningful trends
- **Plot trends visually** - Charts should display trend lines for each indicator
- **Identify trend direction**: Note whether indicators are improving, declining, or stable
- **Explain significant changes**: Document sharp rises/falls (e.g., pandemic impact, policy changes)

**Where to find historical data:**
- ONS datasets typically include time series going back 10+ years
- Trust for London often provides 5-year trends
- OHID Fingertips has multi-year data views
- Annual reports and statistical releases usually include prior year comparisons

**If historical data is unavailable:**
- State this explicitly: "No historical data available from source"
- Note confidence: `"confidence": "low"` for single data point indicators
- Search for alternative sources that may have longitudinal data

### 1.4 Finding Underlying Data Sources

**CRITICAL: Always trace back to the original government statistical source**

When you encounter aggregator sites (Trust for London, charities, think tanks), **do not stop there**:

1. **Look for data source citations** on the aggregator page
   - Check methodology sections
   - Look for footnotes and data source acknowledgments
   - Find "About this data" or "Data sources" sections

2. **Identify the underlying government statistical release:**
   - Example: Trust for London rent affordability → ONS Price Index of Private Rents (PIPR) + ASHE
   - Example: Trust for London rough sleeping → CHAIN database (GLA) + DLUHC Spotlight
   - Example: Trust for London temporary accommodation → DLUHC Statutory Homelessness Statistics

3. **Access the original source directly:**
   - Government sources provide fuller time series data
   - Original sources have better documentation and methodology
   - You can access data at finer geographic granularity
   - Historical data extends further back

4. **Update `dimension_data_sources.json` with BOTH:**
   - Keep the aggregator URL (e.g., Trust for London) for context
   - Add notes field with underlying source: `"notes": "Underlying source: ONS PIPR (ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics)"`
   - Or create additional entries for the underlying source if substantially different

5. **Common underlying sources:**
   - **ONS** (Office for National Statistics): Life expectancy, housing, income, employment
   - **DLUHC** (Department for Levelling Up, Housing and Communities): Homelessness, housing supply
   - **OHID/Fingertips**: Public health indicators
   - **DWP**: Benefits and poverty statistics
   - **NOMIS**: Labour market (hosts ONS microdata)
   - **ASHE**: Annual Survey of Hours and Earnings (pay data)

**Example workflow:**
```
Trust for London page says "Rent affordability"
→ Check methodology: "Uses ONS PIPR and ASHE data"
→ Access ONS PIPR directly: ons.gov.uk/economy/.../priceindexofprivaterentsukmonthlypricestatistics
→ Download Excel file with full LA time series
→ Extract Lewisham historical values 2015-2025
```

### 1.5 Data Interpretation
- **Gender-specific data handling**:
  - If male and female data are similar, use an average figure without explicitly mentioning gender
  - If data points differ significantly between genders, present both and explain the gap
  - Align description data with headline statistics for consistency
- **Contextualisation**:
  - Express figures as percentages where relevant (e.g., healthy life expectancy as % of total life expectancy)
  - Compare to London average and/or national average
  - Identify and explain trend shifts over time
  - Highlight any sharp changes (e.g., pandemic impact, policy changes)

### 1.6 Practical Lessons from Extracting Government Spreadsheets (Housing dimension, July 2026)

These are hard-won lessons from actually downloading and parsing ODS/XLSX files for the
housing dimension. Apply them to every future dimension - they will save hours.

- **No `odfpy`/`pandas.read_ods` in this environment.** Don't assume they're installed -
  check first (`python3 -c "import odfpy"`). If missing, unzip the `.ods` (it's a ZIP
  archive) and parse `content.xml` directly with a small regex-based cell parser (handles
  `table:number-rows-repeated` / `table:number-columns-repeated` compression). `openpyxl`
  and `xlrd` ARE available for the years a release happens to be published as `.xlsx`
  instead - check both.
- **Match rows by ONS/GSS code (e.g. `E09000023` for Lewisham), never by name substring.**
  Footnotes and "imputation methodology" text blocks in these files frequently mention area
  names too (e.g. "totals include imputations for missing values for ... Lewisham ...
  who provided no figures") - a naive `if 'Lewisham' in row` match will silently grab the
  footnote instead of the data row, or the wrong one if the LA name also appears earlier.
- **Check for suppressed/missing data explicitly.** Some quarters/years have no usable
  figure for a given LA (confirmed via footnotes listing which LAs were excluded from
  totals). Don't skip past this silently - substitute the nearest available period, and
  annotate that trend point with a `"note"` field explaining the substitution
  (e.g. `{"period": "2021/22", "value": 19.29, "note": "Dec 2021 quarter (Mar 2022 was
  suppressed - no data submitted)"}`).
- **Charity/NGO/aggregator sites built on Highcharts/Flourish-style embeds often expose the
  full underlying dataset via a hidden endpoint** even when the visible page only shows an
  interactive chart - check the page source for patterns like `/dataset/<id>/csv/` or
  `/dataset/<id>/settings/` before concluding "this data is only available as a chart, not
  downloadable." This is how the full 2015-2025 rent affordability series was found behind
  what looked like a static Trust for London chart.
- **When a data provider explicitly cautions against comparing releases/rounds** (e.g. MHCLG's
  Local Authority Housing Stock Condition Modelling says not to directly compare LA
  estimates year-to-year due to methodology changes), still include the trend, but:
  - set `"confidence": "medium"` instead of `"high"`
  - state the caveat explicitly in `source.notes`
  - treat the series as indicative of direction, not a precise measurement

---

## 2. Page Structure & Content Sections

### 2.1 Top Description (Plain English Summary)
**Location**: Top of dimension detail page
**Purpose**: A dimension-level overview - what the *dimension as a whole* looks like for this
ward, synthesized across every indicator in it. **This is not a summary of one indicator** -
each indicator gets its own "what this measures" treatment further down the page (2.5); this
top block's job is to say what the *collection* of indicators illustrates together.

**Requirements**:
- **Synthesize across ALL indicators in the dimension, don't zoom into one or two.** If the
  dimension has 4 indicators, the reader should come away understanding the shape of all 4,
  not read three sentences about the two indicators that happen to have the most dramatic
  numbers while a fourth goes unmentioned. Revised July 2026 after exactly this happened on
  the housing dimension (3 sentences on rent/temp accommodation/rough sleeping, zero on
  non-decent homes, once that indicator was added).
- **Do not repeat the headline stats verbatim - but don't strip out every number either.**
  Each indicator's exact current value is already shown as a large number in its own card
  just below, so restating "43.6%... 2,363 households... 345 people..." here is pure
  duplication. But removing every number in reaction to that produces something generic
  enough to describe almost any London borough - not useful either (this happened on a real
  first attempt, see Bad example #2 below). **Pick 1-3 sharply chosen, borough-specific facts**
  - not one per indicator, but ones that mechanically explain *why* the indicators move
  together - and build the synthesis around those, instead of either the full stat-dump or
  no numbers at all.
- **Do not assume or imply a single "the solution."** Describing what the council is doing
  belongs in Section 3 (Council & Government Context), not here - and even there, don't
  present one lever (e.g. "build more homes") as *the* fix when the underlying reality is more
  contested or multi-sided (e.g. long-term empty homes existing alongside a housing
  shortage). State the situation; let the reader draw conclusions.
- Compare to regional (London) or national average where it clarifies the overall picture
- **Cap comparison points at two in the headline description - don't stack a third.** Once
  you've picked two things worth comparing (e.g. a target and a current value), resist
  reaching for a third entity just because the data exists. Example: for the water
  dimension, compare the Environment Act 2021 target (122 l/p/d by 2038) against England's
  current per capita usage (136.5 l/p/d) - that's the headline comparison. Don't also work
  in Thames Water's own company-level figures (e.g. its water-stress classification or
  company-specific consumption data) as a third comparison point; that's one more than a
  headline paragraph can hold without becoming a stat-dump. Company/supplier-specific detail
  like that belongs in the indicator card's "what this measures" section further down (2.5),
  not the top plain-english summary.
- Avoid gender-specific mentions unless data differs significantly
- **Hard limit: 130 words maximum.** Count it (`len(text.split())`) before moving on -
  don't estimate.
- **Do not narrate any single indicator's trend chart datapoints.** If a chart below already
  shows "264 in 2021/22, peaking at 353 in 2023/24, declining to 325 in 2024/25" don't repeat
  that exact walk-through in prose - readers can see it. Use the words instead to explain
  *why* things moved or *what it means*, not to describe a line's shape.
- **Lead with a finding, not a data-provenance caveat.** "No local figure exists, so here's
  the national survey it's drawn from and why" is throat-clearing, not a headline - state
  what the data actually shows first, and fold the source/no-local-figure caveat into a later
  clause or sentence instead of opening with it. Revised July 2026 after exactly this happened
  on three England-only-survey dimensions in the same session (community, social_cohesion,
  connectivity), all of which opened with a sentence like "no Lewisham-specific figure exists"
  or "hard to pin to the borough itself" before ever stating what the numbers showed - see Bad
  example #4 below. Note this rule already existed for indicator descriptions (2.2's "lead with
  findings, not methodology") when this happened; it just hadn't been written down for the top
  summary specifically, and got missed here too as a result.

**Good example (single-indicator dimension)**: *"Healthy life expectancy measures the average number of years a person can expect to live in good health from birth. At 58.2 years in Lewisham (approximately 72% of total life expectancy), this sits below London's average of 62.9 years. The indicator has declined by 3.8 years from 62.0 years a decade ago, with a particularly sharp drop during the pandemic years."*

**Good example (multi-indicator dimension, synthesized AND borough-specific)**: *"The private rented sector now houses 40% of Lewisham residents, nearly double its share 20 years ago - and rents in it have grown 50% since 2011 (70% in the borough's historically cheaper streets) while incomes rose barely 12%. The council's own strategy identifies that gap as the single biggest cause of homelessness here: the ending of a private tenancy is behind roughly half of homelessness cases, more than any other reason. The same private rented sector also has a quality problem - a quarter of its homes are estimated to fall short of basic decency standards. Rough sleeping, meanwhile, has proven hard to shift - up nearly a third since 2021/22 to 345 people in 2025/26, despite a brief dip the year before."*

**Bad example #3 (do not write like this - unsourced causal glue between two real facts)**:
an earlier draft of the good example above read: *"...it's the most common reason a
Lewisham household becomes homeless, **it's why temporary accommodation stays full**, and
**it's part of why** a quarter of the private rented homes people are forced into don't meet
basic standards either."* Both underlying stats (biggest cause of homelessness; a quarter of
PRS homes non-decent) are real and sourced individually. The bolded connective claims -
that the affordability gap *causes* full temporary accommodation, and *causes* non-decency -
are not stated anywhere in any source. They're a plausible-sounding inference dressed as
documented fact, caught only when a user asked "what's the source for this?" and the honest
answer was "no source - I inferred it." **Two real, individually-sourced facts placed next to
each other with confident causal language between them is itself an unsourced claim.** If you
want to connect two facts causally, either find a source that makes that connection
explicitly, or use visibly softer language ("may contribute to", "sits alongside") that
doesn't overstate what's actually known - or just present them as parallel facts about the
same underlying market without claiming either causes the other, as the corrected version
above does.

**Bad example #1 (do not write like this - restates headline numbers)**: *"Housing affordability in Lewisham shows median private rent consuming 43.6% of median household pay... With 18.9 households per 1,000 in temporary accommodation (2,363 households)... and 345 people seen sleeping rough..."* - this just re-lists the headline numbers from the cards below, and ignores any indicator not mentioned in the first sentence.

**Bad example #2 (do not write like this either - overcorrects into genericness)**: *"Housing pressure in Lewisham shows up differently depending on where you look: rents that outpace what people earn, a stretched temporary accommodation system, rough sleeping that hasn't shifted much despite intervention, and private rented homes disproportionately falling short of basic standards. These aren't separate problems - a tight rental market pushes households toward eviction..."* - this was an actual first-attempt fix for Bad example #1, and it *was* a synthesis rather than a stat-dump, but it went too far the other way: strip out every specific number and you're left with a paragraph that could describe housing pressure in almost any London borough. There is nothing here that's identifiably *Lewisham*. **The fix isn't zero numbers, it's the *right* numbers** - 1-3 sharply chosen, borough-specific facts (not one per indicator) that mechanically explain why the indicators move together, the way "40% of residents in PRS, rents +50% vs incomes +12%" does in the good example above.

**Bad example #4 (do not write like this - opens with methodology/caveat instead of a finding)**: *"Both indicators come from DCMS's Community Life Survey, published only at England level - no Lewisham-specific figure exists yet, despite a 2023/24 sample boost meant to enable local estimates. Nationally, loneliness has drifted up: 6.6% of adults felt lonely often or always in 2024/25..."* - the community dimension's actual first-attempt summary. Two full sentences pass - which survey, what geography, why there's no local number, a footnote about a sample-size change - before the reader learns anything about what loneliness or belonging actually look like. The fix: state the finding first ("Loneliness and neighbourhood belonging have moved in the same direction nationally...") and push the source/geography caveat into a subordinate clause later in the paragraph, not the opening sentence.

### 2.2 Description Writing Style

**CRITICAL: Descriptions must be narrative, concise, and findings-focused**

**Principles:**
- **Lead with findings, not methodology** - Start with what the data shows (the result), not how it was collected
- **Narrative style** - Write as flowing paragraphs that tell a story, not as technical reports or lists
- **Concise and clear** - Every sentence should deliver insight; avoid redundant explanations
- **Focus on implications** - Explain what the data means for residents, not just what it measures

**When to explain methodology:**
- ✅ **Composite metrics** (Health Index, IMD, etc.) - DO explain components, weighting, and scoring methodology in detail
- ❌ **Straightforward metrics** (counts, percentages, rates) - DON'T overly explain how they're calculated
- ❌ **Forward-looking methodology trivia that doesn't change what's shown today** - e.g. "a
  2023/24 sample boost was designed to eventually enable local authority-level estimates, but
  no Lewisham-specific figure has yet been produced" tells the reader about a survey's future
  plans, not about anything they can use now. If the takeaway is just "no local figure exists
  yet," say that in a few words and stop - don't explain the mechanism by which a local figure
  might someday exist.

**Good examples:**

*Straightforward metric (rough sleepers):*
"345 people were seen sleeping rough in Lewisham during 2025/26, counted through outreach worker contacts over the year. This represents the most visible form of homelessness - people sleeping on streets, in doorways, parks, or other outdoor locations. The trend reveals a deepening crisis: rough sleeping increased by 31% from 264 in 2021/22 to a peak of 353 in 2023/24..."

*Composite metric (Health Index):*
"The Health Index combines over 50 indicators across three key domains: Healthy Lives (mortality, morbidity, mental health), Healthy People (personal behaviors), and Healthy Places (environmental factors). Each domain is weighted equally and indexed to England 2015 as baseline of 100. Lewisham scores 95.8, indicating health outcomes 4.2% below the national baseline..."

**What to avoid:**
- ❌ "This indicator is measured using the CHAIN database which tracks rough sleeper contacts via outreach workers using a unique identifier methodology established in 1999..." (excessive methodology for simple count)
- ❌ "The data collection process involves..." (methodology before findings)
- ❌ "This metric quantifies the number of..." (stating the obvious)
- ❌ Restating every datapoint the chart already shows (see word-limit rule in 2.1) - e.g.
  don't write "increased from 264 in 2021/22 to a peak of 353 in 2023/24, then declined to
  325 in 2024/25, then rose again" when that's exactly what the reader is about to see
  plotted. Say what it *means* instead. A real example this rule was written to catch and
  then still didn't: an election-turnout indicator description read *"60.7% in 2010... down
  to 37.2% in 2014, a low of 20.88% in 2022, then back up to 42.14% in May 2026"* - four exact
  chart values in a row. It did earn a "why" at the end (turnout tracks how contested the
  race feels), but the fix is to make that point with the one or two values that actually
  support it (the 2022 low and the 2026 rebound), not all four - drop the ones that are pure
  shape-narration.
- ❌ Session/process narration leaking into reader-facing copy - e.g. "could not be confirmed
  this session," "wasn't obtainable this session," "no verified figure was available this
  session." These describe what happened during a research session, not something a resident
  reading the page would find meaningful. If a figure couldn't be sourced, either state the
  gap plainly ("no Lewisham-specific figure is published") or omit the sentence - don't narrate
  the research process itself.
- ❌ Restating the headline number as arithmetic the reader can do themselves - e.g. "a
  household earning £42,500 spends £18,530 on rent, leaving £23,970" repeats the same 43.6%
  figure three ways without adding insight. One clear statement of the ratio is enough;
  spend the rest of the sentence budget on why it matters.
- ❌ Empty scene-setting phrases that add no information - e.g. "Rather than treating X as
  inevitable, the council..." Cut the throat-clearing half of the sentence and start with
  what the council actually did. Every sentence should earn its place; if deleting a phrase
  loses no information, delete it.

**Every specific factual claim needs a real source - including ones you didn't write.**
When editing or rewriting *existing* description text (not just adding new indicators),
audit every specific claim in it - rankings, named statistics, "top N" comparisons,
attributed figures - for a traceable source before keeping it, even if it was already
sitting in the file. Existing text is not pre-verified just because it's already there.
(This project has already had one fabricated-looking claim - "Lewisham ranks among London's
top five boroughs for homelessness presentations" - sitting unnoticed in committed code
with no source anywhere in the repo. It was removed once caught, but should have been
caught on first edit, not after a user flagged it.) If you can't find a source for an
inherited claim in a few minutes of searching, cut it - don't assume it's fine because it
predates your session.

**Structure for indicator descriptions:**
1. **What it shows** (the finding/current state) - 1-2 sentences
2. **Trend narrative** (how it's changed) - 1-2 sentences
3. **Implications** (what it means) - 1-2 sentences
4. **Methodology** (ONLY if composite/complex metric) - 2-4 sentences

All of the above, combined, must fit the 130-word limit from 2.1 (composite-metric
methodology explanations are the one place a little more room is reasonable - use
judgment, but still aim tight).

### 2.3 Visual Styling
- **Section divider** required after top description: `<div class="section-divider"></div>`
- **Spacing**: Ensure adequate vertical spacing between chart and dimension cards (minimum 48px padding-top)
- **Typography**: Match existing design system fonts and sizes
- **Colors**: Use CSS variables (--ink, --paper, --coral, etc.)

### 2.4 Status Labels and Dots

**CRITICAL: Status labels must be consistent across dimension cards and detail pages**

**Allowed status labels** (only these four):
- **"Shortfall"** - for social dimensions falling below targets
- **"Overshoot"** - for ecological dimensions exceeding safe limits
- **"Within bounds"** - when targets are met
- **"No data"** - when no valid status exists

**Status logic**:
- Indicators marked as `descriptive_only` (tracked without specific targets) should **NOT** show "Tracked, no target"
- Instead, map them to the appropriate status for their ring:
  - Social ring: `descriptive_only` → `shortfall`
  - Ecological ring: `descriptive_only` → `overshoot`
- This ensures status dots on dimension cards match the status pills on detail pages

**Implementation**:
```javascript
// Dimension cards
if (ring === 'social') {
    if (indicators.some(d => d.status === 'shortfall')) status = 'shortfall';
    else if (indicators.some(d => d.status === 'descriptive_only')) status = 'shortfall';
}

// Detail page
if (ring === 'social') {
    if (allIndicators.some(d => d.status === 'shortfall')) status = 'shortfall';
    else if (!status || status === 'descriptive_only') status = 'shortfall';
}
```

### 2.5 Data Indicator Cards
**Location**: Below the plain English summary

**Headline value formatting** (the large bold number/unit, `.big-value` in `app.js`):
- **No bracketed explainer clauses in the headline stat.** A qualifier like "(≥1 operator,
  high confidence)" or "(London-wide, 'completely offline')" reads as messy/disjointed
  stacked onto a big bold number. If the detail matters, it belongs in the grey text next to
  it - the source line, the indicator-meta line, or the "What this measures" paragraph below
  - not appended to the unit in the headline itself. Revised July 2026 after this happened on
  the connectivity dimension's 5G and digital-exclusion indicators; both were trimmed to a
  plain unit ("% of landmass", "people") with the qualifying detail moved into the
  description text, which already covered it in both cases.
- **Numbers of 1,000 or more get comma-separated thousands automatically** - `app.js`
  formats every numeric `snapshot.value` with `.toLocaleString('en-GB')` before rendering it
  as the headline (`renderDimensionDetail`'s `indicatorsToShow.forEach` block). Don't
  hand-format commas into a snapshot value in the pipeline; let the site do it. This also
  means large snapshot values (counts, £ totals) don't need special-casing when added.

**For each indicator**:
- **Indicator name** as heading
- **What this measures** section:
  - Brief explanation of the indicator
  - For **composite measures** (like Health Index): Explain in detail
    - List component domains/indicators
    - Explain weighting methodology
    - Describe baseline and scaling (e.g., "indexed to England 2015 = 100")
    - Example: *"The Health Index combines over 50 indicators across three key domains: Healthy Lives (mortality, morbidity, mental health), Healthy People (personal behaviors), and Healthy Places (environmental factors). Each domain is weighted equally and indexed to England 2015 as baseline of 100."*
  - For indicators with a **statutory/regulatory target**, explain not just the number but
    *why that number* - the underlying rationale, not just the figure. A target like "122
    litres/person/day by 2038" means little on its own; readers understand it once they know
    it's a 20% cut from a 140-litre 2019/20 baseline, set because the Environment Agency
    projects a multi-billion-litre/day supply-demand gap by mid-century (climate change
    shrinking supply, population growth raising demand, plus a push to cut unsustainable
    river/aquifer abstraction) - and that demand reduction is the cheapest, fastest of three
    levers used to close that gap, which is why it's a statutory target rather than an
    aspiration. This rationale belongs in the indicator card, not the top plain-english
    summary (which has a 130-word cap, see 2.1) - dig for it in the primary source (the
    government framework/strategy document behind the target, not just the number itself,
    e.g. the EA's National Framework for Water Resources rather than only the Environmental
    Targets Regulations that fixed the figure) and cite it.
- **Historical trend visualization**:
  - Display trend chart/sparkline showing historical trajectory (5-10 years where available)
  - Show ward trend line with comparison benchmarks (London/England) if available
  - Minimum 3 data points required for meaningful trend display
- **Trend comparison**:
  - Compare current value to baseline (e.g., "declined from 62.0 years in 2011-2013 to 58.2 years in 2022-2024")
  - Explain direction of change (improving/declining/stable)
  - Note magnitude and rate of change
  - Identify inflection points or sharp changes (e.g., "sharp drop during pandemic years")
- **Regional/national context**: Compare to London/England averages for same time period

### 2.6 No Separate "Target" Line or Marker

**As of July 2026, dimension pages do NOT render a standalone "Target: X" line or a dashed
target line/label on the trend chart.** This was tried and then deliberately removed
site-wide (both the `.target-line` div under the headline value, and the dashed
threshold line drawn on the SVG chart) because it read as a duplicate, disconnected
restatement of a number better explained in the narrative.

- The `threshold` field (value/unit/description) still exists in the data schema and should
  still be populated when a real benchmark exists - it's useful data and may be
  re-surfaced later - but **do not add UI that renders it as an isolated "Target: X" label**.
- Instead, weave the benchmark comparison into the "what this measures" narrative text
  itself (e.g. "...exceeds the 30% threshold that housing experts consider the ceiling for
  sustainable costs..." rather than a separate line reading "Target: 30%").
- If you're extending `app.js`, do not reintroduce `target-line` rendering or a target
  dashed-line/text pair inside `renderTrendChart` without this being an explicit, deliberate
  product decision (check with whoever's driving the session first).

### 2.7 Geography Level Labelling

**Every indicator must clearly state the resolution of its underlying source data**, not
just imply it by being shown on a ward page. This is a `Dimension`'s `geography_of_data`
field (`data/pipeline/schema.py`, `GeographyLevel` enum), and it's rendered on-page in the
source line for every indicator group (`geographyLabel()` in `site/js/app.js`) - e.g.
"Source: MHCLG ... · Borough (Lewisham) · last updated 2026-07-14".

**Fixed taxonomy** (enum value → on-page label → meaning):

| Enum value | On-page label | Meaning |
|---|---|---|
| `ward` | Ward | Measured for Ladywell specifically - true ward-level granularity |
| `lsoa_aggregated` / `msoa_aggregated` | Neighbourhood (LSOA/MSOA) | Small-area statistical geography, aggregated up to/for the ward |
| `postcode_aggregated` | Postcode area | Aggregated from postcode-level data |
| `borough_inherited` | Borough (Lewisham) | Local-authority-level figure, applied uniformly to every ward in Lewisham |
| `water_company` | Water company (Thames Water) | Set by the water company's supply-area boundary, which doesn't align with borough or ward boundaries |
| `london_inherited` | London-wide | Greater London figure, applied uniformly to every ward in the city |
| `england` | England-wide | England-only source (won't include Scotland/Wales/NI figures even if the source's title says "national" or "UK") |
| `uk` | UK-wide | Genuinely UK-wide source |

`national_inherited` still exists in the enum for older records but is **deprecated** -
it conflated England-only sources with genuinely UK-wide ones, which matters (e.g. DCMS's
Community Life Survey and MHCLG's English Housing Survey are both England-only; ONS
healthy life expectancy is UK-wide). Use `england` or `uk` explicitly for anything new, and
fix a `national_inherited` value to one of the two when you're already touching that
indicator.

**Why this matters**: a ward-page reader has no way to tell "measured for Ladywell" from
"Lewisham's borough-wide number, shown identically on all 15 ward pages" from "Thames
Water's supply-area classification, which doesn't follow council boundaries at all" unless
the label says so. Getting this wrong doesn't just mislabel a field - it lets contradictions
slip past unnoticed. Two examples found and fixed in a July 2026 audit of every indicator
in the live data:
- Three health indicators used the bare string `"local_authority"`, which isn't a valid
  `GeographyLevel` value at all (should have been `borough_inherited`) - a hand-splice typo
  that happened to still round-trip through `from_dict()`/`to_dict()` without erroring, so
  it went unnoticed until an explicit audit.
- Both water indicators were labelled `national_inherited`, even though one ("Per capita
  water consumption") is a genuine England-wide Defra/EA figure and the other ("Areas of
  water stress") is Thames Water's own company-specific regulatory classification - two
  different geographies wearing the same label. Split into `england` and `water_company`
  respectively.

**When adding a new indicator**: pick the taxonomy value that matches what the *source*
actually measured (check the source's own methodology/coverage notes, not just its name -
"National X Survey" is frequently England-only), not the value that sounds most authoritative.

---

## 3. Council & Government Context Section

**CRITICAL REQUIREMENTS**:

### 3.1 Finding the Document(s)

**First, map indicators to policy areas - don't just search for "the" dimension strategy.**
A dimension with several indicators often has no single document that covers all of them.
For housing (rent affordability, temporary accommodation, rough sleeping, non-decent homes),
one search for "Lewisham housing strategy" only surfaces the homelessness/rough sleeping
angle - it takes a second and third targeted search (e.g. "Lewisham private rented sector
enforcement", "Lewisham housing strategy affordable homes supply") to find the documents
that actually cover rent affordability and housing conditions.

1. **List the dimension's indicators first**, then ask which policy area each belongs to.
   Group indicators that share an obvious policy owner (e.g. "temporary accommodation" +
   "rough sleepers" both belong to a homelessness strategy).
2. **Search per policy area, not just per dimension name**:
   - "[Council name] [dimension topic] strategy [year range]"
   - "[Council name] [specific indicator topic] policy/strategy" for indicators the first
     search didn't cover (e.g. "enforcement", "licensing", "supply", "conditions")
   - Look for official council website URLs, council meeting documents (ModernGov platforms)
   - Verify the year/version is the most recent
3. **Access each document**
   - Try direct PDF links from council websites (if a generic web-fetch tool 403s/404s on a
     council PDF, try `curl` with a normal browser User-Agent before giving up - council
     ModernGov/PDF hosts sometimes block fetch-tool user agents specifically)
   - Try HTML/web page versions if PDFs are blocked
   - Search for news articles or council meeting reports about the strategy
   - If a document truly cannot be accessed, search for summaries or announcements
4. **Hard cap at 3 documents total per dimension; 2 is often the right number, not just the
   fallback.** Don't treat 3 as a target to hit - if 2 solid documents already cover every
   indicator between them (as happened on housing: the Housing Strategy 2020-26 alone covers
   both affordability *and* housing conditions, once its summary is written to mention both),
   stop there. A 3rd document is only worth adding when it's genuinely the best source for an
   indicator the other two don't cover - not because "we're allowed up to 3." If the 3rd
   candidate is thinner or less substantively interesting than folding its ground into an
   existing document's summary (see 3.2), prefer the fold-in.

### 3.2 Content Requirements

**Cover every indicator/consideration in the dimension - across up to 3 documents (2 is
often enough), not just whichever one document is easiest to find.** The original rule ("one
section per dimension") under-covered dimensions with several indicators spanning different
policy areas: a housing page that only cites the homelessness strategy silently ignores rent
affordability and housing conditions, even though both have their own indicators on the same
page. Revised July 2026:

- **One document per distinct policy area, up to a maximum of 3** - but don't force a 3rd
  document just to reach the cap. Check first whether an existing document's summary can be
  extended by a sentence to cover a gap (e.g. the Housing Strategy already discusses housing
  conditions in its own Priority 3 - one added sentence covered the non-decent-homes
  indicator without a whole extra document). Only add a separate document when the gap is
  substantive enough that folding it in would be misleading or would overload one summary.
- Before finishing, check: does every indicator on this dimension page trace back to at least
  one of the council-context documents shown (directly, or via a sentence added to an
  existing summary)? If an indicator has no document addressing it, either find/fold in one
  (3.1) or note explicitly that no relevant strategy was found for it.
- **Always include a source line with a hyperlink**, for every document shown - see the
  render pattern below. This isn't optional polish; a claim without a traceable source is
  exactly the failure mode Section 2.2 warns about.

**Implementation pattern**: `getCouncilContext(dimensionName)` returns an **array** of
`{title, year, url, summary}` objects (length 1-3), not a single object. The render loop
iterates the array, rendering one `.council-context` card per entry, each ending with its own
`<div class="source-line">Source: <a href="${url}">${title}</a></div>`. See
`site/js/app.js`'s housing implementation for the reference version (3 documents covering
all 4 indicators).

**Section structure**:
- **Title**: Official strategy/report name (e.g., "Lewisham Health & Wellbeing Strategy — Going further with prevention")
- **Year**: Strategy time period (e.g., "2025-2030")
- **URL**: Link to official document (actual URL, not placeholder '#')
- **Summary**: Actionable insights extracted from the actual document

**Prose by default; bullets only when there are genuinely several distinct themes**
(revised July 2026 - the original "narrative only, never bullets" rule was too strict and
made a real four-priority strategy read as one dense wall of text).

- If the strategy has **one central thread**, write it as a flowing narrative paragraph -
  problem, response, approach - exactly as before.
- If the strategy organises itself around **three or more genuinely distinct themes/priorities**
  (as most council strategies explicitly do), use a short narrative lead-in, then a bullet
  per theme with a **bold theme label** followed by a dash and one connecting sentence of
  substance, then a short closing paragraph. Bullets replace disjointed labels/fragments,
  they don't replace sentences - each `<li>` should still read as a real sentence, not a
  telegraphic fragment.
- Either way, cut empty scene-setting connective phrases that don't carry information (see
  2.2's filler-language rule) - "Rather than treating X as inevitable, the council..." should
  become "The council..." unless the contrast itself is the point being made.
- **Always include a source line with a hyperlink to the source document**, styled like the
  indicator source line: `<div class="source-line">Source: <a href="${url}" target="_blank">${title}</a></div>`,
  placed at the bottom of `.council-context`, right after `.council-summary`.

**What to avoid**:
- ❌ Disjointed bullet points with labels and no connecting sentence: "Strategic aim: X. Key finding: Y. Priority actions: Z."
- ❌ Using bullets for a strategy that really only has one theme - that's just narrative broken up for no reason
- ❌ Bullet text as sentence fragments rather than full sentences with a verb and information
- ❌ Empty scene-setting phrases ("Rather than...") that could be deleted with no loss of information
- ❌ Omitting the source line/hyperlink

**Good example (single-theme, narrative)**:
*"The strategy responds to stark health inequalities in Lewisham, where there's a 6.6-year gap in male life expectancy between the most and least deprived areas (2020-21), with cancer and cardiovascular disease as the leading causes of death. The council is targeting three root causes of poor health: poverty, housing, and education — particularly where these intersect with health and care, emphasizing prevention at the community level before problems manifest as serious illness."*

**Good example (multi-theme, bulleted)**:
*"The council assisted over 3,000 households experiencing homelessness in the past year, driven by cost-of-living pressures and the lasting impact of COVID-19 on vulnerable residents. It organises its response around four priorities:*
- *__Prevention first__ - early intervention, financial help with rent arrears, and protection from illegal eviction, connecting at-risk residents to support before they lose their home.*
- *__Expanding supply__ - building new council homes, bringing empty properties back into use, and increasing temporary accommodation capacity for families facing sudden housing loss.*
- *(two more priorities...)*

*Its stated commitment: "no individual should be forced to sleep on the streets" - despite 13 years of budget cuts constraining what the council can do alone."*
*[Source: Lewisham Homelessness and Rough Sleeping Strategy →]*

**Bad example** (do not write like this):
*"Strategic aim: Improve health and wellbeing. Three priority determinants: poverty, housing, education. Key finding: 6.6-year gap in life expectancy. Strategic approach: Population-level prevention interventions."*

**Visual**:
- Section divider before this section
- Use `.section-divider` class
- `.council-summary` supports `<p>` and `<ul>/<li>`/`<strong>` markup (rendered as raw HTML,
  not escaped) - see `.council-summary p/ul/li/strong` in `styles.css` for the spacing rules
  that keep bulleted and prose versions looking equally intentional

---

## 4. Neighbour Voices Section

### 4.1 Requirements
- **Section divider** before neighbour voices
- **Heading**: "Neighbour Voices" (uppercase, small size, opacity 0.55)
- **Display**: Show 3 quotes per page
- **Pagination**: If more than 3 quotes exist, implement prev/next navigation
  - Page indicator showing "1 / 2" format
  - Prev/next buttons disabled at boundaries
  - Navigation buttons styled with opacity states
- **Call-to-action button**: "Add your take" button at bottom
  - Must be highly visible and prominent
  - Orange background (var(--ringA) = #E8542D) matching the ward selector
  - NO border
  - Cream text color (var(--paper))
  - Generous padding: 14px 32px
  - Font size: 15px, weight: 700
  - Border radius: 24px
  - Hover effect: inverts to cream background with orange text
  - Example styling: `background: var(--ringA); color: var(--paper); border: none;`

### 4.2 Quote Format
Each voice block includes:
- **Name**: First name only
- **Location**: Specific area within ward
- **Date**: Month and year (e.g., "Jul 2026")
- **Quote**: Personal, concrete observation or experience related to the dimension

**Visual**:
```css
.voice-block {
    margin-bottom: 16px;
}
.voice-meta {
    font-size: 12px;
    opacity: 0.5;
}
.voice-body {
    font-size: 14px;
}
```

---

## 5. Technical Implementation

### 5.1 JavaScript Structure
**File**: `js/app.js`

**Functions required**:
- `getCouncilContext(dimensionName)` - Returns council strategy info for the dimension
- `getNeighbourVoices(dimensionName)` - Returns array of voice objects
- Pagination logic for neighbour voices (renderVoicesPage, event listeners)

### 5.2 CSS Requirements
**File**: `css/styles.css`

**Classes needed**:
- `.section-divider` - Visual separator between sections
- `.plain-english` - Top description paragraph
- `.neighbour-voices-heading` - Section heading
- `.voice-block`, `.voice-meta`, `.voice-body` - Quote styling
- `.voice-pagination`, `.voice-nav-btn`, `.voice-page-indicator` - Pagination controls
- `.add-take-btn` - CTA button (must be prominent)

**Gotcha: shared classes need context-specific overrides, not new classes.** `.source-line`
is used both under an indicator card and under `.council-context`, but the right spacing
differs in each place (a council-context card already has its own padding/margin, so the same
`margin-bottom` that's correct for an indicator's source line becomes double-spacing inside a
card). Don't invent a second class - scope an override to the parent: `.council-context
.source-line { margin-top: 14px; margin-bottom: 0; }`. Check spacing in both contexts
whenever you touch a shared class.

### 5.3 Cache Busting
- Increment version numbers in `ward.html` when updating CSS or JS
- Format: `css/styles.css?v=N` and `js/app.js?v=N`

---

## 6. Quality Checklist

Before completing a dimension page, verify:

**Data Quality & Freshness:**
- [ ] **All indicators present** - count in `dimension_data_sources.json` matches count in `ladywell.json` for this dimension
- [ ] **All data fetched fresh from official sources** (not copied from old analysis)
- [ ] **No hardcoded values** - every figure retrieved from live source during this session
- [ ] **Historical data extracted for EACH indicator** (minimum 3 data points where available)
- [ ] **Trend arrays populated** with time series data in proper format
- [ ] **Data publication dates recorded** for all indicators
- [ ] **Time periods documented** for all values (e.g., "2022-2024", "Q4 2023")
- [ ] **Targets/benchmarks fetched fresh** from same sources as indicator data
- [ ] All data is from verified sources (not speculative)
- [ ] Comparison periods match exactly between ward and regional data
- [ ] Trend data extracted from source (not manually created)
- [ ] Charts display trend lines for each indicator showing historical trajectory

**Content Quality:**
- [ ] Composite measures have detailed methodology explanations
- [ ] Latest version of council strategy has been found and verified
- [ ] Council context includes specific targets, actions, findings, and approach
- [ ] Strategy URL is real (not placeholder '#')
- [ ] All gender-specific data handled appropriately
- [ ] Trend shifts are explained with context

**Technical Implementation:**
- [ ] Section dividers are in place
- [ ] Neighbour voices pagination works (if >3 quotes)
- [ ] "Add your take" button is highly visible
- [ ] No JavaScript syntax errors (apostrophes escaped in strings)
- [ ] Vertical spacing is adequate (48px+ between chart and cards)
- [ ] Cache versions bumped in ward.html

**Editorial Quality (see Section 2.1, 2.2, 2.6, 3.2):**
- [ ] Every description is ≤130 words (actually counted, not estimated)
- [ ] No sentence just restates a datapoint the chart already shows
- [ ] **Every specific factual claim on the page - top summary, indicator descriptions, AND
      every council-context summary - has a traceable source you have personally checked**,
      including claims you inherited from existing text and ones you wrote fresh this
      session. This is not scoped to indicator descriptions only: the top summary and
      council-context blocks routinely carry fresh numeric claims (e.g. "40% of residents in
      PRS", "civil penalties up to £30,000") that need the same source-checking as anything
      else, precisely because they feel like "just framing" and are easy to wave through
      unverified.
- [ ] **Check the connective tissue, not just the individual stats.** When a sentence links
      two real, individually-sourced facts with causal language ("X, which is why Y", "X,
      and that's part of why Y"), that causal link is itself a claim needing its own source -
      two sourced facts next to each other don't make the sentence connecting them sourced
      (see Bad example #3 in 2.1). If no source states the connection, either find one, soften
      to something like "may contribute to" / "sits alongside", or present the facts in
      parallel without claiming either causes the other.
- [ ] The top summary has 1-3 sharply chosen, borough-specific facts - not zero (see Bad
      example #2 in 2.1) and not a full stat-dump (Bad example #1)
- [ ] No empty scene-setting filler phrases that could be deleted with no loss of information
- [ ] No separate "Target: X" line or dashed target marker anywhere (removed site-wide,
      see 2.6) - benchmark comparisons live in the narrative text instead
- [ ] Council context: up to 3 documents, but only as many as are actually needed (2 is often
      enough - don't force a 3rd, see 3.2); bullets used only if there are 3+ genuinely
      distinct themes within a document; every document has a hyperlinked source line

**Pipeline & Multi-File Sync (see Section 13):**
- [ ] `site/data/wards/ladywell.json`, `data/wards/ladywell.json`, and
      `data/wards/ladywell_local_social.json` are identical for this dimension after your
      edit (diff them, don't assume)
- [ ] The Python `build_<dimension>_dimensions()` function reproduces exactly what's in the
      JSON (verified via `to_dict()`, not just eyeballed)
- [ ] `dimension_data_sources.json` updated in the same pass if indicators were added/removed
- [ ] You did not run `assemble.py` unless every dimension it touches has been migrated (13.2)

---

## 7. Common Pitfalls to Avoid

**CRITICAL DATA ERRORS:**
1. **NEVER HARDCODE DATA VALUES** - Always fetch from live official sources, never copy old figures
2. **NEVER USE CACHED DATA** - Do not use saved/downloaded data from previous sessions without checking for updates
3. **NEVER COPY TARGETS FROM MEMORY** - Always extract benchmarks (London avg, national avg) fresh from current datasets
4. **NEVER SKIP HISTORICAL DATA** - For EACH indicator, extract the full time series (5-10 years), not just the latest value
5. **NEVER CREATE FAKE TRENDS** - If historical data doesn't exist, state this explicitly; don't fabricate or estimate trends
6. **NEVER SKIP INDICATORS** - All indicators in `dimension_data_sources.json` MUST be present in `ladywell.json` for the dimension. Verify counts match before completing the page.

**Content & Research Errors:**
7. **Do not speculate** - If you can't find data or a strategy document, state this clearly rather than making up plausible-sounding content
8. **Do not use placeholder URLs** - "#" links are unacceptable for government strategies
9. **Do not create generic strategy summaries** - Must be based on actual document content with specific targets and findings
10. **Do not make assumptions about gender data** - Always check if male/female data differ significantly before averaging
11. **Do not skip composite measure explanations** - Indices and composite scores must explain their methodology

**Technical Errors:**
12. **Do not forget apostrophe escaping** - JavaScript strings containing apostrophes must escape them: `dad's` → `dad\'s`
13. **Do not use faint/invisible CTAs** - Buttons must be prominent with adequate contrast and size
14. **Do not forget version bumps** - Always increment CSS/JS version numbers after changes

**Editorial Errors (added July 2026, see Section 2.2, 2.6):**
15. **Do not exceed 130 words** in any description block - count it
16. **Do not narrate the chart's own datapoints in prose** - explain meaning, not shape
17. **Do not trust inherited text as pre-verified** - audit every specific claim (rankings,
    named statistics) in text you're editing for a real source, even if you didn't write it
18. **Do not add a "Target: X" line or dashed target marker** - this was removed site-wide;
    weave benchmarks into the narrative instead
19. **Do not leave empty scene-setting filler** ("Rather than X, the council...") - cut it if
    deleting it loses no information

**Pipeline Errors (added July 2026, see Section 13):**
20. **Do not hand-edit only `site/data/wards/ladywell.json`** - splice changes into all three
    ward JSON files (13.3), or the pipeline silently drifts out of sync again
21. **Do not run `assemble.py`** unless you've verified every dimension it will touch has a
    Python builder that matches the live JSON (13.2) - it does a full overwrite
22. **Do not run scripts with relative output paths from inside `data/pipeline/`** - always
    run from the repo root and verify the output landed in `data/wards/`, not
    `data/pipeline/wards/` (13.5)

---

## 8. Example Workflow

### Step 1: Data Collection - ALWAYS FETCH FRESH DATA

**CRITICAL: You must download, extract, and parse data files directly. Do not rely solely on web scraping.**

1. **Read `data/lookups/dimension_data_sources.json`**
   - Filter for your target dimension
   - Get list of all indicators and their source URLs
   - **Count the total number of indicators** for this dimension

2. **CRITICAL: Verify indicator completeness**
   - Check how many indicators exist in `dimension_data_sources.json` for your dimension
   - Check how many indicators exist in `data/wards/ladywell.json` for the same dimension
   - **These counts MUST match** - if they don't, you're missing indicators
   - Example: If `dimension_data_sources.json` has 4 housing indicators, `ladywell.json` must also have 4 housing indicators

   **Verification commands:**
   ```bash
   # Count indicators in dimension_data_sources.json
   cat data/lookups/dimension_data_sources.json | jq '[.[] | select(.dimension=="housing")] | length'

   # Count indicators in ladywell.json
   cat data/wards/ladywell.json | jq '[.local_social[] | select(.dimension=="housing")] | length'

   # These numbers MUST be equal
   ```

3. **For each indicator:**
   - Access the `source_url` from the JSON
   - If `source_url` is null, web search for the indicator
   - Navigate to the latest dataset - check publication dates

4. **Verify source is current:**
   - Check if URL still works (sources move/update)
   - Look for newer versions of the dataset
   - Update JSON file if you find a better source

5. **Search for Lewisham data** at the specified granularity:
   - Ward-level: "Ladywell" or ward code E05013725
   - Borough-level: "Lewisham" or LA code E09000023
   - LSOA: Download full dataset and filter/aggregate to ward

6. **Extract exact figures** from the live source (not from memory or old notes)

7. **Extract historical data for each indicator:**
   - Look for time series data in the source
   - **Download data files directly** (ODS, XLSX, CSV, PDF) using curl/wget
   - **Parse downloaded files** to extract Lewisham-specific historical values
   - Structure as trend array: `[{"period": "2020", "value": 65.2}, ...]`
   - Note if no historical data available

   **How to download and parse data files:**

   a. **For ODS files** (OpenDocument Spreadsheet):
   ```bash
   # Download the file
   curl -s "https://data.source.gov.uk/file.ods" -o /tmp/data.ods

   # Extract XML (ODS is a ZIP archive)
   cd /tmp && unzip -q data.ods

   # Parse with Python
   python3 << 'EOF'
   import xml.etree.ElementTree as ET

   tree = ET.parse('/tmp/content.xml')
   root = tree.getroot()

   ns = {
       'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
       'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
   }

   # Find the relevant sheet
   sheets = root.findall('.//table:table', ns)
   for sheet in sheets:
       sheet_name = sheet.get('{...}name')
       rows = sheet.findall('.//table:table-row', ns)

       for row in rows:
           cells = row.findall('.//table:table-cell', ns)
           row_data = []
           for cell in cells:
               text = cell.find('.//text:p', ns)
               if text is not None and text.text:
                   row_data.append(text.text)

           # Check if row contains "Lewisham"
           if 'Lewisham' in ' '.join(row_data):
               print(row_data)
   EOF
   ```

   b. **For Excel files** (XLSX):
   ```bash
   # Download and parse with pandas
   python3 << 'EOF'
   import pandas as pd

   df = pd.read_excel('https://source.gov.uk/data.xlsx', sheet_name='Sheet1')
   lewisham_data = df[df['Area'] == 'Lewisham']
   print(lewisham_data.to_json(orient='records'))
   EOF
   ```

   c. **For CSV files**:
   ```bash
   # Download and filter
   curl -s "https://source.gov.uk/data.csv" | grep -i "lewisham"
   ```

   **Example - CHAIN Rough Sleeping Data:**
   ```bash
   # Download ODS file
   curl -s "https://data.london.gov.uk/download/2n88x/jk5/CHAIN%20annual%20data%20tables%202025-26.ods" -o /tmp/chain.ods

   # Extract and parse for Lewisham
   cd /tmp && unzip -q chain.ods
   python3 << 'EOF'
   import xml.etree.ElementTree as ET
   tree = ET.parse('/tmp/content.xml')
   # ... parse to find Lewisham row in P1 sheet
   EOF
   ```

8. **Find comparison benchmarks** from the same source:
   - London average (same time period)
   - National average (same time period)
   - Extract benchmark trends if available

9. **Record all metadata**:
   - Exact value
   - Time period (e.g., "2022-2024", "2023/24")
   - Confidence intervals if available
   - Source publication date
   - Data accessed date
   - Number of historical data points retrieved

10. **Update JSON file** if needed:
   - Update `source_url` if you found a newer/better source
   - Update `granularity` if data availability has changed
   - Add new indicators if you discover additional relevant data sources

### Step 2: Plain English Description
1. State what indicator measures
2. Give current ward value with context (% of total life expectancy)
3. Compare to London average
4. Identify trend (decline/improvement, magnitude, time period)
5. Explain any sharp changes with context

### Step 3: Indicator Details
1. For each indicator, explain "what this measures"
2. For composite measures, expand methodology significantly
3. Compare current to baseline values
4. **Extract and display historical trend data:**
   - Retrieve time series from source (5-10 years ideal)
   - Create trend visualization showing trajectory over time
   - Calculate trend direction: improving/declining/stable
   - Note magnitude of change from baseline to current
5. **Explain trend patterns:**
   - Identify any sharp changes or inflection points
   - Document contextual factors (e.g., pandemic, policy changes)
   - Compare ward trend to London/national trends if available

### Step 4: Council Strategy Research
1. Search: "Lewisham health wellbeing strategy 2025 2030"
2. Verify this is the latest version
3. Attempt to access document (PDF, web page, meeting reports)
4. Extract: targets, priority actions, key findings, strategic approach
5. Verify year is correct (e.g., 2025-2030 not 2023-2028)
6. Get actual URL to document

### Step 5: Neighbour Voices
1. Create 5+ authentic-sounding quotes related to dimension
2. Include name, location, date, and concrete observation
3. Implement pagination if >3 quotes
4. Style "Add your take" button prominently

### Step 6: Testing & Verification
1. Check JavaScript syntax: `node -c js/app.js`
2. Verify all data against sources
3. Confirm strategy year and URL are correct
4. Test pagination functionality
5. Review button visibility
6. Bump version numbers
7. Cross-check against quality checklist

---

## 9. File Locations

- **HTML**: `/site/ward.html`
- **JavaScript**: `/site/js/app.js`
- **CSS**: `/site/css/styles.css`
- **Chart**: `/site/js/chart.js`

---

## 10. Data Sources Reference - ALWAYS CHECK `dimension_data_sources.json`

**⚠️ CRITICAL: This section is a REFERENCE ONLY. The single source of truth for all data sources is:**

```
data/lookups/dimension_data_sources.json
```

**Before building any dimension page:**
1. **Read `dimension_data_sources.json`** to get the current list of indicators and sources
2. **Filter by dimension** using the `"dimension"` field (e.g., `"dimension": "health"`)
3. **Access the `source_url`** field for each indicator
4. **Check the `granularity`** field to understand data availability
5. **Never hardcode** - always fetch from the JSON file first

### How to use dimension_data_sources.json

The JSON structure:
```json
{
  "lens": "local_social",
  "dimension": "health",
  "category": "Healthy",
  "indicator": "Healthy life expectancy at birth",
  "source_url": "https://www.ons.gov.uk/...",
  "granularity": "LA"
}
```

**Workflow:**
1. Parse the JSON file
2. Filter records where `"dimension"` matches your target dimension
3. For each indicator:
   - Visit the `source_url`
   - Check if the URL is still valid (sources may move)
   - Verify data is available at the specified `granularity`
   - Extract latest data for Lewisham
4. If `source_url` is `null`, search for the indicator using web search
5. Update the JSON file if you find better/newer sources

### Dimension-to-Indicator Mapping

**To find indicators for a dimension:**
```bash
# Example: Get all health indicators
cat data/lookups/dimension_data_sources.json | jq '.[] | select(.dimension=="health")'
```

The JSON file currently contains indicators for these dimensions:
- health
- housing
- food
- water_and_sanitation
- connectivity
- community
- culture
- mobility
- education
- energy
- income_and_work
- peace_and_justice
- political_voice
- social_cohesion
- equality

---

### 10.16 Official UK Data Sources (General)

- **ONS (Office for National Statistics)**: Life expectancy, healthy life expectancy, health indices, EPC data
- **OHID Fingertips (Office for Health Improvement and Disparities)**: Public health profiles, obesity, smoking, disease prevalence
- **Trust for London**: Comprehensive London borough poverty profiles (housing, income, work, education, equality)
- **Food Foundation**: Health and diet inequalities dashboard (constituency level)
- **NOMIS**: Labour market and census data
- **Gov.uk statistics**: Various departmental data (DCMS, DfE, DESNZ, etc.)

### 10.17 Local Council Sources

- **Council strategy documents**: lewisham.gov.uk or lewisham.moderngov.co.uk
- **Joint Strategic Needs Assessments (JSNAs)**: Health and wellbeing data
- **Health and Wellbeing Board reports**: Meeting minutes and strategy documents
- **Local authority data portals**: Open data platforms

### 10.18 London-specific Sources

- **London Datastore (data.london.gov.uk)**: GLA data and statistics
- **TfL Open Data**: Transport accessibility, PTAL
- **GLA Topic Pages**: Cultural infrastructure, digital exclusion, crime data
- **Healthy Streets Scorecard**: Sustainable transport mode share

---

## 11. Data Extraction Workflow

**CRITICAL: Always fetch live data from official sources. Never use hardcoded values.**

When building a dimension page:

1. **Read `data/lookups/dimension_data_sources.json`**
   - This is the single source of truth for all indicators and data sources
   - Filter by your target dimension name

2. **For each indicator in the filtered list:**
   - Get the `source_url` field
   - Get the `granularity` field (tells you data availability level)
   - Get the `indicator` name (exact text to search for)

3. **Access source URLs** directly from the JSON
   - **DO NOT** use cached/saved data
   - **DO NOT** copy values from previous analysis
   - **ALWAYS** fetch fresh from the live source

4. **Verify data publication date** on the source website
   - Note when the source was last updated
   - Check if newer data is available than what's in the JSON
   - **Update `dimension_data_sources.json`** if you find newer sources or URLs have changed
5. **Extract ward-level data** where possible, or:
   - Use Lewisham borough data and note it's "borough_inherited"
   - Use London/regional data and note it's "london_inherited" or "national_inherited"
   - **Always record the exact time period** of the data (e.g., "2022-2024", "Financial year 2023/24")
6. **Download underlying datasets** where granular data (LSOA/postcode) exists:
   - IMD scores (LSOA → aggregate to ward)
   - PTAL (postcode → aggregate to ward)
   - EPC ratings (postcode → aggregate to ward)
   - Crime data (ward level available)
   - **Always use the latest available vintage** of these datasets
7. **Extract targets/thresholds** from the same fresh source:
   - London average (from same dataset, same time period)
   - National average (from same dataset, same time period)
   - Official targets (from government strategy documents)
   - **DO NOT** use old benchmark values - always fetch current ones
8. **Document data confidence**:
   - High: Ward or borough-specific actual data
   - Medium: LSOA aggregated or modeled estimates
   - Low: Regional or city-wide inherited figures
9. **Compare to benchmarks**: London average, national average, or specific targets
   - Ensure comparison periods match exactly
10. **Extract trend data for EACH indicator** - this is mandatory, not optional:
    - Look for time series datasets at the source
    - Download full historical series (aim for 5-10 years minimum)
    - Structure as trend array: `"trend": [{"period": "2020", "value": 65.2}, ...]`
    - Do not truncate or cherry-pick time periods
    - Extract comparison benchmark trends if available (London/England over time)
    - If no historical data exists, document this explicitly
11. **Validate trend data quality**:
    - Ensure all historical data points are from the same geographic unit (ward/borough/LA)
    - Verify methodology is consistent across time periods
    - Note any breaks in series or methodology changes
    - Document confidence intervals for each historical point if available

---

---

## 12. Living Data Source Registry

**Single Source of Truth:** `data/lookups/dimension_data_sources.json`

This JSON file is the authoritative, living registry of all data sources. It should be:
- **Read first** before building any dimension page
- **Updated** when you find newer/better data sources
- **Kept current** with latest source URLs and availability information
- **Never bypassed** - always check the JSON before accessing data

**Do not rely on this markdown file for specific URLs or indicators.** Section 10 provides general guidance, but `dimension_data_sources.json` is the only source you should trust for current, up-to-date data source information.

---

## 13. Multi-File Data Sync & Pipeline Safety

**Read this before editing anything under `data/wards/` or `site/data/wards/`.** This
section exists because the housing dimension's data quietly diverged across three files
before anyone noticed (July 2026), and reconciling it after the fact was expensive. Don't
let it happen again.

### 13.1 The three files, and why there are three

| File | Role |
|---|---|
| `site/data/wards/ladywell.json` | **What the live site actually reads.** This is the only file that matters to a visitor. |
| `data/wards/ladywell.json` | A duplicate `assemble.py` also writes, kept alongside the pipeline's other outputs. |
| `data/wards/ladywell_local_social.json` | The pipeline's **intermediate** per-lens file - the direct output of `data/pipeline/build_local_social_with_real_data.py`, and the input `assemble.py` reads to build the two files above. |

`assemble.py` reads the intermediate per-lens files (`ladywell_local_social.json`,
`ladywell_global_lenses.json`, `ladywell_local_ecological.json`) and does a **full overwrite**
of both `data/wards/ladywell.json` and `site/data/wards/ladywell.json` from them, in one run.

### 13.2 Do NOT run `assemble.py` yet - check this first

As of July 2026, `build_local_social_with_real_data.py`'s `build_*()` functions each return
**one** `Dimension` per dimension, but several dimensions in the live site file already carry
**multiple** indicators (health: 4 entries, income: 5 entries) that predate the current
Python source and aren't reproduced by it. Housing is the one dimension where the Python
source (`build_housing_dimensions()`, returning a list) actually matches the live data.

**Before running `assemble.py` for any reason**, verify every dimension's Python builder
output matches the live site file for that dimension (same indicator count, same values).
If it doesn't, running `assemble.py` will silently regress every dimension you haven't
migrated yet back to one flattened indicator. Migrate a dimension's builder fully (see 13.3)
before trusting `assemble.py` to touch it.

### 13.3 The pattern for adding/editing indicators in a dimension

Use `build_housing_dimensions()` in `build_local_social_with_real_data.py` as the template:

1. Write (or extend) a `build_<dimension>_dimensions()` function that returns a **list** of
   `Dimension` objects - one per indicator - using `create_targeted_dimension(...)` or
   `create_descriptive_dimension(...)`. Both now accept:
   - `trend=[{"period": "2020", "value": 65.2, "note": "optional caveat"}, ...]` - historical
     series, included in `to_dict()` only when set
   - `target_text=` - override the auto-generated "No official GLA or UK Government target
     established for this dimension/indicator" wording when you need it to read differently
2. Sanity-check it in isolation before touching any JSON file:
   ```bash
   PYTHONPATH=data/pipeline python3 -c "
   from build_local_social_with_real_data import build_<dimension>_dimensions
   for d in build_<dimension>_dimensions():
       print(d.to_dict()['indicator'], len(d.to_dict().get('trend') or []))
   "
   ```
3. **Splice the result into all three JSON files at once** - don't hand-edit just the site
   copy. A safe splice replaces only that dimension's entries and leaves everything else in
   each file untouched:
   ```python
   import json
   from build_local_social_with_real_data import build_<dimension>_dimensions

   new_entries = [d.to_dict() for d in build_<dimension>_dimensions()]
   for path in ['site/data/wards/ladywell.json', 'data/wards/ladywell.json',
                'data/wards/ladywell_local_social.json']:
       d = json.load(open(path))
       idx = next(i for i, e in enumerate(d['local_social']) if e['dimension'] == '<dimension>')
       d['local_social'] = (d['local_social'][:idx] + new_entries +
                             [e for e in d['local_social'][idx:] if e['dimension'] != '<dimension>'])
       json.dump(d, open(path, 'w'), indent=2)
   ```
4. **Verify all three are now identical for that dimension, and that the schema round-trips**:
   ```python
   from schema import Dimension
   site = json.load(open('site/data/wards/ladywell.json'))
   dw = json.load(open('data/wards/ladywell.json'))
   pipeline = json.load(open('data/wards/ladywell_local_social.json'))
   def dim(d): return {e['indicator']: e for e in d['local_social'] if e['dimension']=='<dimension>'}
   assert dim(site) == dim(dw) == dim(pipeline)
   for e in dim(pipeline).values():
       assert Dimension.from_dict(e).to_dict() == e
   print('OK')
   ```
5. Only after this passes should you consider the dimension "migrated" for the purposes of
   13.2.

### 13.4 Keep `dimension_data_sources.json` in lockstep

Adding or removing an indicator from the ward JSON files without also updating
`data/lookups/dimension_data_sources.json` recreates exactly the kind of drift this section
exists to prevent. Update both in the same pass, every time.

### 13.5 Don't create stray output copies

`data/pipeline/wards/` and `data/pipeline/site/data/wards/` existed as dead, silently stale
duplicate copies of the ward JSON (traced to a script once being run with the working
directory set to `data/pipeline/` itself, landing a relative output path inside the pipeline
folder instead of at the repo root) until they were found and deleted in July 2026. If a
script's output path is relative, run it from the repo root and verify with `git status`
afterwards that it landed in `data/wards/` and nowhere else - not from inside `data/pipeline/`.

---

*This specification is based on the Health dimension implementation (July 2026), and revised
after the Housing dimension deep-dive (July 2026) which surfaced most of the pipeline-sync,
sourcing-discipline, and editorial issues addressed in sections 1.5a, 2.1, 2.2, 2.6, 3.2, and
13. Follow these requirements for all future dimension pages to maintain consistency and
quality.*
