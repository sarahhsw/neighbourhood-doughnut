"""
Fetch data from Trust for London data pages for Lewisham
"""
import json
import re
from pathlib import Path

# Load data sources
with open('data/lookups/dimension_data_sources.json') as f:
    data_sources = json.load(f)

# Filter Trust for London sources
tfl_sources = [d for d in data_sources if d['source_url'] and 'trustforlondon.org.uk' in d['source_url']]

print(f"Found {len(tfl_sources)} Trust for London data sources:")
for source in tfl_sources:
    print(f"\n{source['dimension']} - {source['indicator']}")
    print(f"  URL: {source['source_url']}")
    print(f"  Granularity: {source['granularity']}")

# For now, let's list them for manual data entry or web scraping
# We can use WebFetch to get the data from each URL

output = {
    'trust_for_london_sources': tfl_sources
}

output_path = Path('data/lookups/trust_for_london_sources.json')
with open(output_path, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\n✓ Saved Trust for London sources to {output_path}")
