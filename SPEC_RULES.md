# Dimension page rules (short form)

Read this before editing any dimension-page copy or data. Every rule here is one line; the
worked examples, history and reasoning behind each live in `DIMENSION_PAGE_SPECIFICATION.md`
(section numbers in brackets). Open the full spec section only when a rule is unclear, or
when you're doing something this file doesn't cover.

## Data

- Fetch every figure fresh from the primary source; never write a number from memory or a search snippet. [1.1, 7]
- Trace secondary sites (Trust for London, news, aggregators) back to the government release they draw on, and cite that. [1.4]
- Use the latest vintage; check for a newer release, budget cycle or edition before reusing an old one. [1.2, 11]
- Comparators must cover the same period as the figure they're compared with. [1.1]
- No data point older than 10 years, even if it's the only one at that geography. [1.2]
- Build a time series for every indicator where one exists; never invent intermediate points. [1.3, 7]
- The headline value is the chart's latest point, labelled with the year or edition the source itself uses. [2.5]
- Join points into one line only when they share geography and method; otherwise give each a `series` label (drawn as a separate coloured line). [2.5]
- Small-area modelled estimates (e.g. DESNZ LSOA fuel poverty) aren't for tracking one area over time; don't claim a local trend from them. [2.5]
- Use the most granular real geography; set `geography_of_data` honestly from the 2.7 taxonomy. [2.7]
- Match spreadsheet rows by ONS/GSS code, never by name; check for suppressed cells. [1.6]
- "I couldn't fetch it" must never become "it doesn't exist" in reader-facing copy. [2.5]
- Before removing an indicator, check whether another dimension shares its name. [2.5]

## Top summary [2.1]

- 130 words maximum, counted with `len(text.split())`.
- Synthesise across all the dimension's indicators, not just the dramatic ones.
- Lead with the finding, never with a methodology or data-availability caveat.
- Pick 1-3 sharply chosen, borough-specific facts that explain the argument; don't restate every headline number, and don't strip them all out either.
- At most two comparison points; compare with the borough's real peer group (Lewisham is Inner London).
- Say why, using a sourced cause where one exists; never glue two facts together with unsourced causal language.
- A sourced cause for some indicators isn't licence to claim it explains all of them.
- Don't narrate a chart's datapoints; explain what moved and why.
- Keep the number of distinct years low; drop provenance-only dates already shown in the card.
- Plain words a resident could repeat back; no labels the reader has to decode.
- Explain any scale or measure as if the reader has never seen it (what it measures, what its range means). [2.1]
- Don't announce a contrast ("tells a better story"); state it.
- Every sentence must land its point; don't end on a list of facts that never says what they show.
- One clause per indicator; amounts, recipients and before-and-after figures belong in the indicator text.
- Cut signpost sentences that only announce what's coming ("the more revealing picture is..."); let the next fact carry the turn.
- State a framework's risk groups as tendencies ("more vulnerable to"), not certainties ("the most likely").
- Don't present one lever as "the solution"; policy belongs in the context cards.
- No decile or "tenth" ranking language in the summary, and no method aside explaining it; state what it means in plain words. [2.1]
- Don't open with a thesis built on terms not yet explained ("not job-seekers"); let the facts make the point. [2.1]
- Flow from place to borough to cause; a cause must be sourced at the geography the sentence claims. [2.1]

## Indicator text ("What this measures") [2.2, 2.5]

- 130 words maximum.
- Findings first, methodology only where the measure is composite or the method changes what the number means.
- Cut source nuances, toolkit refreshes, dated components and geography-provenance reasoning; they go in `source.notes`.
- No filler that restates a trend, and no dismissive words about a positive finding.
- Every claim needs a real source, including text you inherited and didn't write. [2.2, 2.9]
- Unit qualifiers belong in the indicator name, not the headline; no bracketed explainers in the big number.
- Headline stats must read cleanly at phone width (about 390px); check layout changes on a phone-width screenshot as well as desktop. [2.5]
- Figures with different population bases get labelled stat cards, not a shared-axis chart; each card names its base.
- Choose stat-card groups by the framework's own categories, not by singling out one subgroup.
- When the framework's group is narrower than any published category, use the closest proxy and say in the label what it measures. [2.5]
- One comparator per point in indicator text as well as the summary. [2.5]
- Describe benefit recipients, health and disability by circumstance in neutral official terms; no "not expected to..." framing or stigmatising survey labels. [2.5]
- No standalone "Target: X" line or dashed target on charts; weave benchmarks into the text. [2.6]
- Spell out acronyms. [7]
- "Why this is happening" only for a real local causal story with evidence; otherwise fold the fact into this text. [2.8]

## Context cards [3]

- At most 3 documents including the global research card; 2 is often enough.
- One document per distinct policy area; read the actual document and confirm it's the latest version.
- Check any dated target in a card: if the date has passed, report the outcome from a source or reword it as a commitment. [3.2]
- About 165 words per card; prose by default, bullets only for genuinely distinct themes; always a source link.

## Get Involved cards [4]

- Real, verified local actions only; return `null` rather than inventing one.
- One merged paragraph of about 25-30 words; the whole card is the link.
- No recurring-event dates, waiting lists, "recruiting now" or other status that will date quickly.

## Fact-checking [2.9]

- After drafting, show the wording for review when the user is present, then run the `fact-checker` agent on the final text.
- The edit isn't done until every FAIL and UNVERIFIED item is fixed or explained.

## Files and pipeline [13, 5.3]

- Edit the dimension's builder in `data/pipeline/build_local_social_with_real_data.py`, then run `python3 scripts/splice_dimension.py <dimension>`; never hand-edit only one ward JSON file.
- Keep `data/lookups/dimension_data_sources.json` in step with every indicator change.
- Never run `assemble.py`; run scripts from the repo root.
- Bump `app.js?v=` (and `styles.css?v=` / `chart.js?v=` separately) in `site/ward.html` whenever that file changes.
- Escape apostrophes in single-quoted JS strings.

## When the user corrects something

- Add the lesson to `DIMENSION_PAGE_SPECIFICATION.md` with its worked example, and add a one-line rule here in the same turn.
