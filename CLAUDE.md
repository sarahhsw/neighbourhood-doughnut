# CLAUDE.md

Neighbourhood Doughnut: a hyper-local Doughnut Economics data portrait for Ladywell ward, Lewisham. See `README.md` for project structure and the data pipeline. Dimension-page copy and charts live in `site/js/app.js`; indicator source metadata lives in `data/lookups/dimension_data_sources.json`.

## Before touching any dimension-page copy or data

**Read `SPEC_RULES.md`** (about 100 lines, one line per rule) before drafting or editing any dimension-page copy (top summary, "what this measures", "why this is happening", context cards, Get Involved cards) or indicator data - fresh each time, not from memory, since it gets revised.

`DIMENSION_PAGE_SPECIFICATION.md` is the full spec: the same rules with their worked examples, history and reasoning. Don't read it end to end by default (it's about 43k tokens). Open the section a rule points to (e.g. `[2.5]`) when a rule is unclear, when the user's request touches something `SPEC_RULES.md` doesn't cover, or when you're adding a lesson to it.

The rules most often missed:

- **130-word hard cap** on every description block; check with `python3 scripts/check_word_caps.py <dimension>`, don't estimate.
- **Get Involved cards**: one merged paragraph of about 25-30 words, with nothing that will date quickly.
- **Context cards**: max 3 documents per dimension including the research card; 2 is often enough.
- **Don't narrate a chart's datapoints in prose**; explain why it moved.
- **Every number or claim must be verified against a primary source you've actually read**, including text you inherited.
- **Run the `fact-checker` agent** (`.claude/agents/fact-checker.md`) on new or edited copy before considering it done: after showing the drafted wording for review when the user is present, not before. Brief it with just the dimension and which blocks changed; the agent file holds the standard instructions.

## Scripts (use these instead of rewriting them)

All run from the repo root:

- `python3 scripts/splice_dimension.py <dimension> --check` - confirm the builder in `data/pipeline/build_local_social_with_real_data.py` matches the live data before you edit it.
- `python3 scripts/splice_dimension.py <dimension>` - after editing the builder, write its output into all three ward JSON files and verify they agree and pass the schema.
- `python3 scripts/check_word_caps.py [dimension]` - word counts against the caps.
- `node scripts/render_check.js [dimension ...] [--shots DIR]` - open each dimension page in a headless browser; reports page errors, chart counts, headline values and any "undefined"/"NaN".
- `python3 scripts/ods2csv.py file.ods outdir` - convert an ODS spreadsheet to one CSV per sheet (pandas can't read ODS here).

## Data sources: what works and what doesn't

- curl goes through a preconfigured proxy. These work: gov.uk, assets.publishing.service.gov.uk, ons.gov.uk (including the Explore local statistics API at `ons.gov.uk/explore-local-statistics/api/v1/data/<indicator>.csv?geo=E09000023,...`), nomisweb.co.uk (API), data.london.gov.uk, trustforlondon.org.uk (chart data at `trustforlondon.org.uk/data/dataset/<id>/csv/`), councilmeetings.lewisham.gov.uk, healthystreetsscorecard.london (chart data via `datawrapper.dwcdn.net/<id>/<n>/dataset.csv`).
- These return bot-check 403s; don't retry them or try to get around them: lewisham.moderngov.co.uk (use the councilmeetings.lewisham.gov.uk mirror, same document ids), ofcom.org.uk and labs.thinkbroadband.com (Ofcom coverage data is on the ONS Explore local statistics API), london.gov.uk. If a claim can only be checked there, say so and mark it unverified.
- Never take a figure from a search-result snippet; snippet figures have been wrong several times.
- Ladywell ward is E05013725 (2022 boundaries). Its 7 best-fit LSOAs (2021): E01003273, E01003274, E01003275, E01003276, E01003278, E01003279, E01003291.

## Close the loop on corrections

Whenever the user corrects an approach to dimension-page copy or its surrounding code, in the same turn: add the lesson to `DIMENSION_PAGE_SPECIFICATION.md` the way the spec already does (the concrete example, what was tried first, what the user said, the general rule), **and** add a one-line rule to `SPEC_RULES.md` pointing to it. A fix applied only to the page in front of you is invisible to every future edit.

## If you're delegating this work to a subagent

A subagent started via the `Agent` tool (anything other than a `fork`) does not inherit this conversation's context. Its prompt must **explicitly say** to read `CLAUDE.md` and `SPEC_RULES.md`, comply with the word caps, use the scripts above, and that its copy will be fact-checked (subagents may not have the Agent tool to run the fact-checker themselves; if not, the delegating session runs it after merging). Group delegated work by dimension, and give each parallel subagent its own worktree so their edits to `app.js` and the ward JSON don't collide.

## Working through Todoist tasks

The user's preference: after finishing a block of tasks from Todoist (e.g. the "Claude 🦀" project), give them one preview link for the whole block, not one per task. Previews are built only for pull requests: `.github/workflows/pr-preview.yml` publishes `site/` to `https://sarahhsw.github.io/neighbourhood-doughnut/pr-preview/pr-<number>/`. So the preview link needs an open PR from the working branch against `master`. Link to `.../pr-preview/pr-<number>/ward.html` and name the dimension card to click, since dimension pages have no URL of their own. The preview deploys a minute or two after each push; check the PR's preview comment before sharing the link.
