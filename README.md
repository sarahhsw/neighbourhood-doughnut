# Neighbourhood Doughnut Data Portrait

A hyper-local implementation of Doughnut Economics for London neighbourhoods, starting with Ladywell ward in Lewisham.

## Overview

This project visualizes ward-level data across four lenses of the Doughnut Economics framework:
- **Local Social** (15 dimensions): Health, Housing, Food, Water, Connectivity, Community, Culture, Mobility, Education, Energy, Income, Jobs, Peace & Justice, Political Voice, Social Equity, Equality in Diversity
- **Local Ecological**: Green space, air quality, biodiversity proxies, flood risk
- **Global Ecological**: Climate, materials, land use (London-inherited)
- **Global Social**: International supply-chain impacts (London-inherited)

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
├── .github/workflows/          # GitHub Pages deployment
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
python build_global_lenses.py      # Global Ecological & Social (London-inherited)
# python build_local_social.py     # TODO: 15 Local Social dimensions
# python build_local_ecological.py # TODO: Local Ecological proxies

# 3. Assemble final ward portrait
python assemble.py
```

### Viewing the visualization locally
```bash
cd site
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Current Status (Phase 1)
✅ Repository structure and schema
✅ Ward boundary and geography lookups (bootstrap)
✅ Global Ecological lens (11 dimensions from London City Portrait)
✅ Global Social lens (placeholder)
✅ Frontend visualization (radial doughnut chart)
✅ GitHub Pages deployment workflow

🚧 Local Social Foundation (0/15 dimensions) - In progress
🚧 Local Ecological Ceiling (0/4 proxy dimensions) - In progress

## Data Sources & Caveats

- **Ward geography**: ONS Open Geography Portal (2022 boundaries)
- **Local Social**: Census 2021, GLA Ward Atlas, London Datastore, DfE, OHID, DWP, TfL, etc.
- **Local Ecological**: Proxies only (GiGL green space, LAEI air quality, street trees, EA flood risk)
- **Global lenses**: Inherited from London City Portrait figures for Lewisham

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
