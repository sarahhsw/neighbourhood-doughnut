# Neighbourhood Doughnut Data Portrait

A hyper-local implementation of Doughnut Economics for London neighbourhoods, starting with Ladywell ward in Lewisham.

## Overview

This project visualizes ward-level data across the two local lenses of the Doughnut Economics framework (the project covers local lenses only):
- **Local Social**: the social foundation dimensions (health, housing, food, water, education, income and others)
- **Local Ecological** (7 dimensions): water provisioning, carbon sequestration, biodiversity support, energy harvesting, air quality regulation, temperature regulation, wellbeing

## Project Structure

```
neighbourhood-doughnut/
├── data/
│   ├── raw/                  # Raw data downloads from sources
│   ├── lookups/               # ONS geography lookup tables, ward boundaries
│   ├── pipeline/               # Python ETL scripts
│   └── wards/                 # Final assembled JSON per ward
├── site/
│   ├── index.html              # Ward selector
│   ├── ward.html                # Four-lens doughnut visualization
│   ├── js/                     # Chart renderer & app logic
│   └── css/                    # Styles
├── scripts/                    # Helpers: splice a dimension into the ward JSON, word caps, render check, ODS->CSV
├── SPEC_RULES.md               # One-line editorial and data rules (full detail in DIMENSION_PAGE_SPECIFICATION.md)
├── .github/workflows/          # GitHub Pages: live site (pages.yml) + per-PR previews (pr-preview.yml)
└── README.md
```

## Data Pipeline

1. **Fetch** scripts download raw data from official sources (ONS, GLA Datastore, DfE, etc.)
2. **Lookups** load ONS geography tables to map LSOA/MSOA/OA → ward
3. **Build** scripts aggregate and transform data to match the doughnut schema
4. **Assemble** merges all dimensions into a single ward JSON file

## Development

### Requirements
- Python 3.9+
- pandas, requests (geopandas optional for future spatial operations)

### Running the data pipeline
```bash
cd data/pipeline

# 1. Fetch ward boundary and geography lookups
python fetch_ward_boundary.py
python fetch_lookups.py  # (optional - bootstrap file exists)

# 2. Build dimension data for each lens
# Dimensions are built per dimension and spliced into the ward JSON from the repo root:
#   python3 scripts/splice_dimension.py <dimension>
# (builders: build_local_social_with_real_data.py, build_local_ecological.py)

# 3. Assemble final ward portrait
python assemble.py
```

### Council spending page
`site/spending.html` compares the doughnut dimensions with Lewisham's service budgets. Its data comes from MHCLG revenue outturn returns and the HM Treasury GDP deflator, rebuilt from the repo root with:
```bash
python3 data/pipeline/build_council_spend.py
```
Which services touch which dimension is set in `data/lookups/budget_dimension_tags.json` (yes/no tags, never weights).

### Viewing the visualization locally
```bash
cd site
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Current Status (Phase 1)
✅ Repository structure and schema
✅ Ward boundary and geography lookups (bootstrap)
✅ Frontend visualization (radial doughnut chart)
✅ GitHub Pages deployment workflow, with a preview of every pull request at `/pr-preview/pr-<number>/` (served from the `gh-pages` branch)

🚧 Local Social Foundation (0/15 dimensions) - In progress
🚧 Local Ecological Ceiling (0/4 proxy dimensions) - In progress

## Data Sources & Caveats

- **Ward geography**: ONS Open Geography Portal (2022 boundaries)
- **Local Social**: Census 2021, GLA Ward Atlas, London Datastore, DfE, OHID, DWP, TfL, etc.
- **Local Ecological**: Proxies only (GiGL green space, LAEI air quality, street trees, EA flood risk)

**Important**: Approximately half of the Local Social dimensions have **no official GLA or UK Government target** (Food, Community, Culture, Education, Political Voice, Social Equity, Equality in Diversity). These are marked `descriptive_only` in the visualization.

IMD 2019 is used as a **cross-check only**, not a primary source, per London City Portrait guidance.

## License

Data sources remain under their original licenses (primarily OGL 3.0). Visualization code is open source.

## Acknowledgments

Built on the frameworks of:
- Kate Raworth's Doughnut Economics
- C40's Thriving Cities Initiative
- London City Portrait (2024)
- Neighbourhood Doughnut research by Daniel O'Neill et al.
