# CLAUDE.md

Neighbourhood Doughnut: a hyper-local Doughnut Economics data portrait for Ladywell ward, Lewisham. See `README.md` for project structure and the data pipeline. Dimension-page copy and charts live in `site/js/app.js`; indicator source metadata lives in `data/lookups/dimension_data_sources.json`.

## Before touching any dimension-page copy

`DIMENSION_PAGE_SPECIFICATION.md` is the mandatory editorial and data-sourcing guide for every dimension page (top summary, indicator "what this measures"/"why this is happening" text, council-context cards, "Get Involved" cards). **Read it before drafting or editing any of this copy** - not from memory of a past read, since it gets revised.

The rules most often missed, because they're easy to blow past without noticing:

- **130-word hard cap** on every description block (top summary, each indicator's "what this measures" and "why this is happening" paragraphs) - count with `len(text.split())`, don't estimate. (Spec 2.1, 2.5, 2.8)
- **Get Involved cards**: one merged paragraph per card, ~25-30 words - action + example together, not a description plus a separate case-study block. (Spec 4.2)
- **Council-context section**: max 3 documents per dimension, 2 is often enough - don't add a 3rd just to reach the cap. (Spec 3.2)
- **Don't narrate a chart's datapoints in prose** - if the trend chart already shows the numbers, explain *why* it moved, don't re-list the series. (Spec 2.1)
- **Every number or claim must be independently verifiable against a real source you've actually checked** - not "this looks roughly right" and not inherited-as-correct just because it was already on the page. (Spec 2.2, checklist in 2.9)
- **Run the `fact-checker` agent on new/edited copy before considering it done** - after showing the drafted wording in chat for review, not before (wording that still might change isn't worth fact-checking yet).

## Close the loop on corrections

Whenever the user corrects an approach to dimension-page copy or its surrounding code (wording, structure, when to use a section like "why this is happening" vs. folding a fact into "what this measures", a rendering bug, etc.), **update `DIMENSION_PAGE_SPECIFICATION.md` with the learning as part of that same turn** - not just the one page being edited. The spec is what keeps the next session (or the next subagent) from re-making a mistake that's already been corrected once; a fix applied only to the page in front of you is invisible to every future edit. Write the addition the way the spec already does elsewhere: name the concrete example, what was tried first, what the user said, and the general rule that generalizes from it - not just "don't do X."

## If you're delegating this work to a subagent

A subagent started via the `Agent` tool (anything other than a `fork`) does not inherit this conversation's context. Loading this file alone is not enough - its task prompt needs to **explicitly say** "comply with `DIMENSION_PAGE_SPECIFICATION.md`'s word caps and run the fact-checker before finishing," or a narrowly-scoped task (e.g. "add a council-context card for strategy X") will produce content that's accurate but un-trimmed, uncapped, or never fact-checked at all.
