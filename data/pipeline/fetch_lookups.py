"""
Simplified approach: fetch just the geography codes we need for Ladywell
Uses ONS ArcGIS REST API endpoints
"""
import requests
import pandas as pd
import json
from pathlib import Path

# Ladywell ward details
LADYWELL_WARD_CODE = "E05013725"
LEWISHAM_LAD_CODE = "E09000023"

def fetch_lsoa_to_ward_lookup():
    """Fetch LSOA to Ward lookup for Lewisham from ONS"""
    # ONS Feature Server for LSOA 2021 to Ward 2022 lookup
    url = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LSOA_2021_to_Ward_2022_to_LAD_2022_BF_Lookup_for_EW_V3/FeatureServer/0/query"

    params = {
        'where': f"LAD22CD='{LEWISHAM_LAD_CODE}'",  # All Lewisham wards
        'outFields': 'LSOA21CD,LSOA21NM,WD22CD,WD22NM,LAD22CD,LAD22NM',
        'f': 'json'
    }

    print("Fetching LSOA → Ward lookup for Lewisham...")
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    features = data.get('features', [])
    records = [f['attributes'] for f in features]
    df = pd.DataFrame(records)

    print(f"  Found {len(df)} LSOA → Ward mappings")
    return df

def fetch_oa_to_lsoa_lookup():
    """Fetch OA to LSOA lookup for Lewisham from ONS"""
    url = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/OA_2021_to_LSOA_to_MSOA_to_LAD_DEC_2021_Lookup_EW/FeatureServer/0/query"

    params = {
        'where': f"LAD21CD='{LEWISHAM_LAD_CODE}'",
        'outFields': 'OA21CD,LSOA21CD,LSOA21NM,MSOA21CD,MSOA21NM,LAD21CD,LAD21NM',
        'f': 'json',
        'resultRecordCount': 2000,
        'resultOffset': 0
    }

    print("Fetching OA → LSOA → MSOA lookup for Lewisham...")

    all_records = []
    while True:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        features = data.get('features', [])
        if not features:
            break

        records = [f['attributes'] for f in features]
        all_records.extend(records)

        if len(features) < params['resultRecordCount']:
            break

        params['resultOffset'] += params['resultRecordCount']

    df = pd.DataFrame(all_records)
    print(f"  Found {len(df)} OA → LSOA mappings")
    return df

def main():
    output_dir = Path(__file__).parent.parent / "lookups"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Fetch lookups
    lsoa_ward_df = fetch_lsoa_to_ward_lookup()
    oa_lsoa_df = fetch_oa_to_lsoa_lookup()

    # Save to CSV
    lsoa_ward_path = output_dir / "lsoa21_to_ward22.csv"
    oa_lsoa_path = output_dir / "oa21_to_lsoa21_msoa21.csv"

    lsoa_ward_df.to_csv(lsoa_ward_path, index=False)
    oa_lsoa_df.to_csv(oa_lsoa_path, index=False)

    print(f"\nSaved lookups to:")
    print(f"  {lsoa_ward_path}")
    print(f"  {oa_lsoa_path}")

    # Get Ladywell-specific codes
    ladywell_lsoas = lsoa_ward_df[lsoa_ward_df['WD22CD'] == LADYWELL_WARD_CODE]
    print(f"\nLadywell ward contains {len(ladywell_lsoas)} LSOAs:")
    for _, row in ladywell_lsoas.iterrows():
        print(f"  {row['LSOA21CD']}: {row['LSOA21NM']}")

    ladywell_oas = oa_lsoa_df[oa_lsoa_df['LSOA21CD'].isin(ladywell_lsoas['LSOA21CD'])]
    ladywell_msoas = ladywell_oas['MSOA21CD'].unique()

    print(f"\nLadywell ward contains:")
    print(f"  {len(ladywell_lsoas)} LSOAs")
    print(f"  {len(ladywell_oas)} Output Areas")
    print(f"  {len(ladywell_msoas)} MSOAs (intersecting)")

    # Save summary
    summary = {
        "ward_code": LADYWELL_WARD_CODE,
        "ward_name": "Ladywell",
        "lad_code": LEWISHAM_LAD_CODE,
        "lad_name": "Lewisham",
        "lsoa_count": len(ladywell_lsoas),
        "oa_count": len(ladywell_oas),
        "msoa_count": len(ladywell_msoas),
        "lsoas": ladywell_lsoas['LSOA21CD'].tolist(),
        "oas": ladywell_oas['OA21CD'].tolist(),
        "msoas": ladywell_msoas.tolist()
    }

    summary_path = output_dir / "ladywell_geography_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary saved to: {summary_path}")

if __name__ == "__main__":
    main()
