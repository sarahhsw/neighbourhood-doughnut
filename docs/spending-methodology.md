# Spending page: methodology

How `site/spending.html` ("Public spending and Ladywell's needs") is built, what it can and
can't tell you, and how to update it or reuse it for another ward. Last reviewed 23 November 2026.

Files involved:

| File | Role |
|---|---|
| `data/pipeline/build_public_spending.py` | Downloads every source, extracts the figures, converts to real terms, writes the data file |
| `data/lookups/budget_dimension_tags.json` | Which dimensions each spending column touches, what each column covers, its caveat, and the list of known gaps |
| `site/data/spending/lewisham_public_spending.json` | The pipeline's output, read by the page (don't edit by hand) |
| `site/spending.html`, `site/js/spending.js`, `site/css/spending.css` | The page |
| `site/ward.html` (`.spend-entry-card`) | The link to the page, under the ecological dimension cards |

Rebuild the data from the repo root with:

```bash
python3 data/pipeline/build_public_spending.py
```

Downloads are cached in `data/raw/council_spend/` (git-ignored). Delete that folder to force fresh downloads.

---

## 1. What the page is for

The doughnut shows what Ladywell **needs**: how far each dimension is from its social floor
or ecological ceiling. This page puts public **spending** next to it, so a reader can ask:
*is money going to the needs that are flagged, and is it growing or shrinking?*

It answers three questions honestly:

1. **Reach:** does any public budget touch this need at all? Rows with a flagged need and no
   Lewisham budget line are highlighted.
2. **Scale (Lewisham only):** how large is each Lewisham budget that touches it?
3. **Direction:** has each budget grown or shrunk after inflation?

It does **not** answer "is this enough?" or "how much is spent in Ladywell?". No source
records where in the borough money is spent, and spending levels can't be judged against need
without a model of what the need would cost to meet.

## 2. Principles (decisions already made; keep them unless you mean to change the method)

1. **No weights.** A budget is either *tagged* to a dimension or not. Its full amount is shown
   against every dimension it touches and is never split. (The user rejected weighting
   because it hides a judgement inside a number.) Tags are still a judgement, but a visible
   yes/no one, listed with each column's scope.
2. **Never put two geographies on one scale.** Lewisham budgets get filled dots sized by
   amount. London-wide budgets get a fixed-size hollow ring, a tinted column and a group
   label saying "Not comparable with Lewisham". A London total is tens of times larger than
   any borough budget, so sizing it would only mislead.
3. **Real terms.** Every amount is converted to the latest year's prices with the HM Treasury
   GDP deflator, so a change means a change in what the money can buy.
4. **Latest 10 years at most** (project rule, `SPEC_RULES.md` [1.2]). The Lewisham revenue
   series runs 2016-17 to 2025-26. Shorter series (capital, London-wide) use what exists.
5. **Latest vintage.** Check for a newer outturn release before reusing old figures.
6. **Match councils by ONS code, never by name** (`SPEC_RULES.md` [1.6]). Lewisham is
   E09000023.
7. **Need trends stay per indicator.** Combining a dimension's indicators into one "need is
   improving" score would mean deciding how much each indicator counts, which is weighting
   again. Opening a row shows each indicator's own trend beside each budget's trend.
8. **Change is measured from a sensible base year**, stated under every column
   ("since 2016-17"). London-wide columns measure from 2022-23 because 2020-21 and 2021-22
   include pandemic spending (see section 6).

## 3. How to read the page

| Element | Meaning |
|---|---|
| Row | A doughnut dimension. Its dot is the dimension's status from the ward data (worst indicator wins, same rule as the doughnut chart) |
| Column group band | Who spends the money: Lewisham Council day-to-day services; Lewisham Council homes, building and Housing Benefit; London-wide national bodies; London-wide regional bodies |
| Column header | Budget name, latest amount, a line of every year after inflation (axis starts at zero), change since the base year (blue up, brown down) |
| Filled dot | A Lewisham budget touches this dimension. Area is proportional to the latest amount, on one scale across all Lewisham columns |
| Hollow ring | A London-wide budget touches this dimension. Fixed size: not to scale |
| Tan row | Need flagged (shortfall or overshoot) and no **Lewisham** budget line touches it |
| Open row | Left: each indicator's trend, using its most local series (Ladywell, then Lewisham, then the first available). Right: each tagged budget's trend, scope and caveat; London-wide budgets in a separate "for context only" list |
| "What's not on this page yet" | The known gaps (section 7), read from the tags file |

**On phones (under 768px wide)** the grid can't show 25 columns, so `renderMobile()` in
`spending.js` draws a list instead: one row per dimension with a summary of the budgets that
touch it (filled dots for Lewisham, hollow rings for London-wide, plus counts, or "No Lewisham
budget" on gap rows). Tapping a row opens the same detail as the grid. An "All budgets and how
they've changed" section below gives what the desktop column headers show. CSS classes
`desktop-only` and `mobile-only` pick the layout; both are built from the same data.

## 4. Sources

All sources are official statistics downloaded from gov.uk. The pipeline finds each file
through the gov.uk content API (`https://www.gov.uk/api/content/government/statistics/<page>`),
so new years are picked up by changing a year range, not a URL.

### 4.1 Lewisham Council: day-to-day services (borough)

- **Publisher:** Ministry of Housing, Communities and Local Government (MHCLG).
- **Release:** "Local authority revenue expenditure and financing England: `<year>` individual
  local authority data - outturn", one page per financial year.
- **File:** "Revenue outturn service expenditure summary (RSX)".
- **Field:** Net Current Expenditure (C7) for each of 10 service groups (education, highways
  and transport, children's social care, adult social care, public health, housing General
  Fund, cultural, environmental and regulatory, planning and development, central). Police,
  fire and "other" are zero for London boroughs and aren't shown.
- **Unit:** £ thousand, nominal.
- **Years:** 2016-17 to 2025-26.
- **Extraction:** RSX lists services in a fixed order. The script reads the 14 "net current"
  columns by that order and checks every column header that names a service, so a header with
  a missing name (the 2021-22 Environmental column has none) can't shift the columns.
- **Net current expenditure** = gross spending minus fees, charges and other income. Some
  services look small because income offsets them (highways: parking income).

### 4.2 Lewisham Council: homes, building and Housing Benefit (borough)

| Column | Source and field | Years |
|---|---|---|
| Council homes (HRA) | Same release, "Revenue outturn summary (RS)": TOTAL HOUSING REVENUE ACCOUNT (HRA) EXPENDITURE | 2016-17 to 2025-26 |
| Housing Benefit | RS: Housing benefits mandatory payments: rent allowances + non-HRA rent rebates + rent rebates to HRA tenants | 2016-17 to 2025-26 |
| Building: housing, roads & transport, schools, culture & parks | MHCLG "Local authority capital expenditure and receipts in England final outturn time series" (CSV), field `EandR1_<service>_exptot` (total capital expenditure) for `houstot`, `transtot`, `edutot`, `cultot`. Years the time series doesn't cover yet come from that year's "individual local authority data" release, file "Capital outturn return (COR A1)", field "`<Service>`: Total capital expenditure" | 2018-19 to 2025-26 |

Housing Benefit is national money (the Department for Work and Pensions funds it); the council
only pays it out. It sits in this group because it's the one benefit published by council.

### 4.3 London-wide: national and regional bodies (region)

- **Publisher:** HM Treasury.
- **Release:** "Country and regional analysis: 2025", file "database in Excel format".
- **Field:** identifiable expenditure, region `ENGLAND_London`, £ thousand, nominal.
- **Years:** 2020-21 to 2024-25 (the 2025 edition's range).
- **Columns:** each is a filter on sector (CG central government, LG local government, PC
  public corporation), HMT function and department:

| Column | Filter | Tags |
|---|---|---|
| NHS & health | CG, function 7 Health | health |
| Benefits & pensions | CG, function 10 Social protection, DWP and HMRC | income, equality |
| Academies & colleges | CG, function 9 Education, Department for Education | education |
| Courts, prisons & national policing | CG, function 3 Public order and safety | peace_justice |
| Rail & national transport | CG, function 4 transport | mobility |
| Energy & net zero | CG, DESNZ and Ofgem, **excluding** the Energy Bills Support Scheme, Energy Price Guarantee and Energy Bills Relief Scheme segments | energy, energy_harvesting |
| Environment agencies | CG, function 5 Environment protection, Defra | biodiversity_support, water_provisioning |
| Police & fire | LG, function 3 Public order and safety | peace_justice |
| Transport for London & local transport | LG and PC, function 4 transport | mobility, air_quality_regulation |

Central government (CG) lines exclude councils, so the national columns don't overlap the
Lewisham columns. The two regional columns use local government (LG) lines, and the source puts
the Greater London Authority bodies (the Metropolitan Police via the Mayor's Office for Policing
and Crime, London Fire Brigade, Transport for London) in the same sector as the 33 London
councils. They **can't be separated** in this source, so those columns include councils' own
community safety and transport spending, and their caveats say so.

### 4.4 Inflation

- **Publisher:** HM Treasury, "GDP deflators at market prices, and money GDP", October 2026
  (Budget) update. Financial-year index.
- **Method:** real value = nominal × deflator(price base year) ÷ deflator(year). Price base 2025-26.

## 5. Tags: which budgets touch which dimension

Tags live in `data/lookups/budget_dimension_tags.json` under `columns`. Each entry has
`tags`, `rationale` (what the budget covers) and an optional `caveat`. The page shows the
rationale and caveat when a row is opened, so readers can see and challenge each judgement.

How the tags were set:

- **Council services:** each rationale lists the sub-lines in that service's detailed revenue
  return (RO1 education, RO2 highways, RO3 social care and public health, RO4 housing, RO5
  culture/environment/planning, RO6 central), 2024-25. A service is tagged to a dimension when
  a listed sub-line plainly serves it (e.g. RO3 youth justice → Peace & Justice; RO5 parks and
  open spaces → Biodiversity).
- **London-wide columns:** each rationale lists the departments and HMT sub-functions that make
  up the filter, from the Country and Regional Analysis database.

Open questions worth reviewing:

- Environmental & regulatory services also include flood defences and climate change costs,
  which could justify Water provisioning or Temperature regulation tags.
- Adult social care includes social isolation support, which could justify Social cohesion.
- Highways & transport could arguably touch Connectivity.

Change a tag in the JSON and re-run the pipeline; no code changes are needed.

## 6. Caveats to keep visible

| Caveat | Where it bites | How it's handled |
|---|---|---|
| Borough-wide, not Ladywell | Every Lewisham column | Footnote; no per-ward apportioning |
| Academies are outside council accounts | Education falls partly as schools convert | Education caveat; London-wide "Academies & colleges" column |
| Housing Benefit is moving to Universal Credit, paid by DWP directly | Housing Benefit −58% since 2016-17 | Column caveat: the fall mostly reflects the move, not less support |
| Capital spending is lumpy | Building columns jump between years | Column caveats |
| Net, not gross | Services with large fee income look small | Footnote |
| HRA and capital are separate from day-to-day spending | Housing looks small in the services group alone | Shown as their own columns |
| Pandemic years | 2020-21 and 2021-22 London-wide spending (NHS, transport) | London-wide change measured from 2022-23; full line still drawn |
| One-off energy bill support (2022-24) | Would make DESNZ spending look like it collapsed (£5.2bn of Energy Bills Support Scheme in London in 2022-23, nominal) | Excluded from the energy column; caveat says so |
| Regional bodies grouped with councils | Police & fire, transport columns | Caveat; group named "regional bodies" with "Not comparable" note |
| Accounting changes | Sharp one-year jumps (e.g. Central services 2022-23) | Footnote asks readers to check before drawing conclusions |

## 7. Gaps (not on the page yet)

The same list is in `budget_dimension_tags.json` under `gaps` and shown on the page.

| Gap | Why | Where it could come from |
|---|---|---|
| Water company investment (Thames Water) | Set company-wide by Ofwat. Ofwat's site refuses automated access from the build environment; Discover Water shows only the England and Wales total (£104bn for 2025-30) | Ofwat PR24 final determination for Thames Water; Thames Water annual performance report. Show as a separate "company-wide, not comparable" group |
| NHS spending in Lewisham | No borough figure published centrally; South East London Integrated Care Board covers six boroughs. NHS Digital and NHS England refuse automated access | NHS Payments to General Practice (per practice; sum Lewisham practices); ICB board papers |
| Benefits in Lewisham other than Housing Benefit | DWP stopped publishing spending by local authority after 2011-12 | Stat-Xplore (claimant counts, not amounts; free account) |
| Academies in Lewisham | Funded by DfE directly; allocations are in a web service, not a download | DfE academy accounts returns |
| TfL, the Met, London Fire Brigade, GLA separately or by borough | Grouped with councils in the Country and Regional Analysis; TfL and london.gov.uk refuse automated access | TfL Local Implementation Plan funding per borough; LFB financial reports (London Datastore); GLA group budget |
| GLA affordable housing grant | London Datastore has homes started/completed by borough, not grant amounts | GLA housing programme reports |
| Developer contributions (CIL and Section 106) | Only in the council's Infrastructure Funding Statement, on a site that refuses automated access | Lewisham Infrastructure Funding Statement |
| Council capital before 2018-19 | Time series starts in 2018-19 | Older per-council capital outturn files |
| Spending located in Ladywell | No source records location within the borough | Council capital programme by project and ward |

Any figure added from a manually downloaded file must still be read from the primary source,
recorded with its URL, and labelled with its geography.

## 8. Updating each year

1. **Revenue (September):** when MHCLG publishes the new year's individual local authority
   revenue outturn, add the year to `REVENUE_YEARS` and drop the oldest so the series stays at
   10 years.
2. **Capital (November):** the pipeline fetches COR A1 for any year the time series lacks, so
   nothing to change unless the file or column names change.
3. **Deflator:** point `DEFLATOR_PAGE` at the newest HM Treasury release and set `PRICE_BASE`
   to the newest financial year it covers.
4. **Country and Regional Analysis (November):** point `CRA_PAGE` at the new edition and check
   that the sector, function and department names in `CRA_COLUMNS` still match.
5. Re-run the pipeline. It stops with an error if a column, council row or deflator year is
   missing, rather than writing a partial file.
6. Check the output (section 10), update the year ranges in the footnote in
   `site/spending.html` and in the ward-page link text, then commit.

## 9. Reusing it for another ward

**Another ward in Lewisham.** The spending columns are borough-wide, so they don't change.
Only the rows (need statuses and trends) come from the other ward's JSON: change the ward file
fetched in `site/js/spending.js`, and the place names listed below.

**A ward in another London borough.**

1. In `build_public_spending.py`, set `ONS_CODE` and `AUTHORITY` (and the output filename in
   `OUT`). Region settings stay London.
2. Re-check the tags against that borough's services (the service groups are national, so
   most will hold).
3. Re-check the gaps list (e.g. the developer contributions source).
4. Update the place names in the page (list below).

**A ward outside London.** As above, plus set `CRA_REGION` (e.g. `ENGLAND_North West`) and
`REGION_LABEL`. Rename the regional group: outside London the local government sector means
county, district and combined authorities, police and crime commissioners and fire
authorities, not the GLA. Rename "Transport for London & local transport" accordingly.

**Place names to change by hand:**

- `site/spending.html`: title, heading, table caption, legend ("Lewisham budget", "London-wide
  budget", "no Lewisham budget line"), footnote.
- `site/js/spending.js`: the data file names in the `fetch` calls; `GEOGRAPHY_LABELS`; the
  series preference in `needSeries()` (looks for "Ladywell", then "Lewisham").
- `site/ward.html`: the link text in `.spend-entry-card`.

Group labels, column names and "Not comparable with …" notes come from the data file, so they
follow `AUTHORITY` and `REGION_LABEL`.

## 10. Checking the output

1. The pipeline prints each year's total service expenditure and HRA spending. Compare one
   year by hand against the RSX and RS files.
2. `node scripts/render_check.js housing` still passes (the ward page and dimension pages are
   unaffected).
3. Open `spending.html` at desktop and phone widths: no page errors, no "undefined" or "NaN",
   no sideways scroll of the whole page (only the grid scrolls), and the tan rows are the
   flagged needs with no Lewisham budget line.
4. Spot-check one London-wide figure against the CRA interactive table.

## 11. Decision log

| Date | Decision | Why |
|---|---|---|
| Nov 2026 | Tags, not weights | Weighting hides a judgement in a number |
| Nov 2026 | Coverage grid (prototype C) chosen over overlay ring, connection map and remit lens | Every tag visible at once; easy to review |
| Nov 2026 | No view toggles or tabs on the page; quiet text link from the ward page | Kept the page simple |
| Nov 2026 | Need trends shown per indicator, most local series | Avoids weighting indicators |
| Nov 2026 | Added council homes, building, Housing Benefit and London-wide bodies | Council day-to-day spending is a small part of public money reaching residents |
| Nov 2026 | London-wide columns as fixed hollow rings in tinted columns | Different geography; sizes not comparable |
| Nov 2026 | London-wide change from 2022-23; energy bill support excluded | Pandemic and one-off schemes would dominate the trend |
| Nov 2026 | Revenue series 2016-17 to 2025-26 | 10-year rule once 2025-26 outturn was published |
