"""
Load and cache ONS geography lookup tables
Maps between Output Areas (OA), LSOAs, MSOAs, and wards
"""
import requests
import pandas as pd
import json
from pathlib import Path

# Ladywell ward details (confirmed from ONS)
LADYWELL_WARD_CODE = "E05013725"
LADYWELL_WARD_NAME = "Ladywell"
LEWISHAM_LAD_CODE = "E09000023"

# ONS Open Geography Portal - direct CSV download URLs
# These are static files that can be downloaded in full
LOOKUP_URLS = {
    "oa21_to_lsoa21_to_msoa21": "https://www.arcgis.com/sharing/rest/content/items/6beafbac0d9446fb832be35829635b5e/data",
    "lsoa21_to_ward22": "https://www.arcgis.com/sharing/rest/content/items/9e1f39e5af1b4c6a8e5e3cb40e3f21e5/data"
}

class GeographyLookups:
    """Handles loading and querying ONS geography lookups"""

    def __init__(self, cache_dir=None):
        if cache_dir is None:
            cache_dir = Path(__file__).parent.parent / "lookups"
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.lookups = {}
        self._load_all()

    def _load_all(self):
        """Load all lookup tables from cache or download if needed"""
        for name, url in LOOKUP_URLS.items():
            cache_file = self.cache_dir / f"{name}.csv"

            if cache_file.exists():
                print(f"Loading {name} from cache...")
                df = pd.read_csv(cache_file, encoding='utf-8')
            else:
                print(f"Downloading {name} from ONS...")
                df = self._fetch_lookup_csv(url)
                # Filter to Lewisham only to reduce file size
                if "LAD" in df.columns[0] or any("LAD" in col for col in df.columns):
                    lad_col = [col for col in df.columns if "LAD" in col and "CD" in col][0]
                    df = df[df[lad_col] == LEWISHAM_LAD_CODE]
                    print(f"  Filtered to Lewisham ({len(df)} records)")

                df.to_csv(cache_file, index=False)
                print(f"  Cached to {cache_file}")

            self.lookups[name] = df

        # Also load ward boundary metadata
        metadata_file = self.cache_dir / "ladywell_metadata.json"
        if metadata_file.exists():
            with open(metadata_file) as f:
                self.ward_metadata = json.load(f)
        else:
            self.ward_metadata = {
                "ward_code": LADYWELL_WARD_CODE,
                "ward_name": LADYWELL_WARD_NAME,
                "local_authority_code": LEWISHAM_LAD_CODE,
                "local_authority_name": "Lewisham"
            }

    def _fetch_lookup_csv(self, url):
        """Download CSV file from ONS"""
        response = requests.get(url)
        response.raise_for_status()

        # Save to temporary file and read with pandas
        from io import StringIO
        return pd.read_csv(StringIO(response.text))

    def get_lsoas_in_ward(self):
        """Get list of LSOAs that intersect with Ladywell ward"""
        df = self.lookups["lsoa21_to_ward22"]
        return df[df["WD22CD"] == LADYWELL_WARD_CODE]["LSOA21CD"].unique().tolist()

    def get_oas_in_ward(self):
        """Get list of Output Areas in Ladywell ward (via LSOA lookup)"""
        lsoas = self.get_lsoas_in_ward()
        df = self.lookups["oa21_to_lsoa21_to_msoa21"]
        return df[df["LSOA21CD"].isin(lsoas)]["OA21CD"].unique().tolist()

    def get_msoas_in_ward(self):
        """Get list of MSOAs that intersect with Ladywell ward"""
        lsoas = self.get_lsoas_in_ward()
        df = self.lookups["oa21_to_lsoa21_to_msoa21"]
        return df[df["LSOA21CD"].isin(lsoas)]["MSOA21CD"].unique().tolist()

    def oa_to_lsoa(self, oa_code):
        """Map OA code to LSOA code"""
        df = self.lookups["oa21_to_lsoa21_to_msoa21"]
        match = df[df["OA21CD"] == oa_code]
        return match.iloc[0]["LSOA21CD"] if not match.empty else None

    def lsoa_to_ward(self, lsoa_code):
        """Map LSOA code to ward code (best fit)"""
        df = self.lookups["lsoa21_to_ward22"]
        match = df[df["LSOA21CD"] == lsoa_code]
        return match.iloc[0]["WD22CD"] if not match.empty else None

    def summary(self):
        """Print summary of geography coverage"""
        print(f"\n=== Geography Lookups for {LADYWELL_WARD_NAME} ===")
        print(f"Ward code: {LADYWELL_WARD_CODE}")
        print(f"Local Authority: {self.ward_metadata.get('local_authority_name', 'Lewisham')}")

        lsoas = self.get_lsoas_in_ward()
        oas = self.get_oas_in_ward()
        msoas = self.get_msoas_in_ward()

        print(f"\nContains:")
        print(f"  {len(lsoas)} LSOAs")
        print(f"  {len(oas)} Output Areas")
        print(f"  {len(msoas)} MSOAs (intersecting)")

        return {
            "ward_code": LADYWELL_WARD_CODE,
            "ward_name": LADYWELL_WARD_NAME,
            "lsoa_count": len(lsoas),
            "oa_count": len(oas),
            "msoa_count": len(msoas),
            "lsoas": lsoas,
            "oas": oas,
            "msoas": msoas
        }

def main():
    """Load lookups and display summary"""
    print("Loading ONS geography lookups for Ladywell ward...")
    lookups = GeographyLookups()

    summary = lookups.summary()

    # Save summary for reference
    summary_path = lookups.cache_dir / "ladywell_geography_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary saved to: {summary_path}")

if __name__ == "__main__":
    main()
