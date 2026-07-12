"""
Fetch ward boundary for Ladywell from ONS Open Geography Portal
"""
import requests
import json
from pathlib import Path

# Ladywell ward GSS code (2022 boundaries)
LADYWELL_GSS = "E05013725"

# ONS ArcGIS Feature Server endpoint for Wards (December 2022) Boundaries UK BGC
# BGC = Generalised (20m), clipped to coastline
BASE_URL = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Wards_December_2022_Boundaries_UK_BGC/FeatureServer/0/query"

def fetch_ward_boundary(ward_code):
    """Fetch ward boundary GeoJSON from ONS"""
    params = {
        'where': f"WD22CD='{ward_code}'",  # Filter by ward code
        'outFields': '*',                   # Get all fields
        'outSR': '4326',                   # WGS84 coordinate system
        'f': 'geojson'                     # Return as GeoJSON
    }

    print(f"Fetching boundary for ward {ward_code}...")
    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()

    return response.json()

def main():
    # Fetch Ladywell boundary
    geojson = fetch_ward_boundary(LADYWELL_GSS)

    # Verify we got the right ward
    features = geojson.get('features', [])
    if not features:
        print("ERROR: No boundary found for Ladywell!")
        return

    feature = features[0]
    properties = feature['properties']

    print(f"\nWard found:")
    print(f"  Code: {properties.get('WD22CD')}")
    print(f"  Name: {properties.get('WD22NM')}")
    print(f"  Welsh Name: {properties.get('WD22NMW', 'N/A')}")

    # Save to lookups folder
    output_path = Path(__file__).parent.parent / "lookups" / "ladywell_boundary.geojson"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(geojson, f, indent=2)

    print(f"\nSaved boundary to: {output_path}")

    # Also save ward metadata separately
    metadata = {
        "ward_code": properties.get('WD22CD'),
        "ward_name": properties.get('WD22NM'),
        "local_authority": "Lewisham",
        "local_authority_code": "E09000023",
        "boundary_date": "December 2022",
        "source": BASE_URL,
        "coordinate_system": "WGS84 (EPSG:4326)"
    }

    metadata_path = Path(__file__).parent.parent / "lookups" / "ladywell_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved metadata to: {metadata_path}")

if __name__ == "__main__":
    main()
