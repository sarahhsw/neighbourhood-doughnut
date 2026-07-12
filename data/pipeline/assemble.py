"""
Assemble final ward portrait from partial lens outputs
"""
import json
from pathlib import Path
from datetime import datetime
from schema import WardPortrait, Dimension

# Ward details
LADYWELL_WARD_CODE = "E05013725"
LADYWELL_WARD_NAME = "Ladywell"

def load_dimensions_from_file(filepath):
    """Load dimension records from a JSON file"""
    if not filepath.exists():
        print(f"  Warning: {filepath.name} not found, skipping")
        return []

    with open(filepath) as f:
        data = json.load(f)

    # Handle different file structures
    dimensions = []
    for key, value in data.items():
        if isinstance(value, list):
            # Convert each dict to Dimension object
            for item in value:
                try:
                    dimensions.append(Dimension.from_dict(item))
                except Exception as e:
                    print(f"  Warning: Failed to parse dimension in {filepath.name}: {e}")

    return dimensions

def main():
    """Assemble all lens outputs into final ladywell.json"""
    wards_dir = Path(__file__).parent.parent / "wards"
    wards_dir.mkdir(parents=True, exist_ok=True)

    print("Assembling Ladywell ward portrait...")

    # Load partial outputs
    global_lenses_path = wards_dir / "ladywell_global_lenses.json"
    local_social_path = wards_dir / "ladywell_local_social.json"
    local_ecological_path = wards_dir / "ladywell_local_ecological.json"

    # Load Global lenses (we have this)
    print("\nLoading Global lenses...")
    all_dimensions = load_dimensions_from_file(global_lenses_path)

    # Separate by lens
    global_ecological = [d for d in all_dimensions if d.lens.value == "global_ecological"]
    global_social = [d for d in all_dimensions if d.lens.value == "global_social"]

    print(f"  Global Ecological: {len(global_ecological)} dimensions")
    print(f"  Global Social: {len(global_social)} dimensions")

    # Load Local Social (if exists)
    print("\nLoading Local Social lens...")
    local_social_dims = load_dimensions_from_file(local_social_path)
    if local_social_dims:
        local_social = [d for d in local_social_dims if d.lens.value == "local_social"]
        print(f"  Local Social: {len(local_social)} dimensions")
    else:
        local_social = []
        print("  Local Social: No data yet (Phase 1 in progress)")

    # Load Local Ecological (if exists)
    print("\nLoading Local Ecological lens...")
    local_ecological_dims = load_dimensions_from_file(local_ecological_path)
    if local_ecological_dims:
        local_ecological = [d for d in local_ecological_dims if d.lens.value == "local_ecological"]
        print(f"  Local Ecological: {len(local_ecological)} dimensions")
    else:
        local_ecological = []
        print("  Local Ecological: No data yet (Phase 1 in progress)")

    # Create WardPortrait
    portrait = WardPortrait(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        local_social=local_social,
        local_ecological=local_ecological,
        global_ecological=global_ecological,
        global_social=global_social,
        generated_at=datetime.now().isoformat()
    )

    # Save final output
    output_path = wards_dir / "ladywell.json"
    with open(output_path, 'w') as f:
        json.dump(portrait.to_dict(), f, indent=2)

    # Also copy to site/data/wards/ for GitHub Pages deployment
    site_data_dir = Path(__file__).parent.parent.parent / "site" / "data" / "wards"
    site_data_dir.mkdir(parents=True, exist_ok=True)
    site_output_path = site_data_dir / "ladywell.json"
    with open(site_output_path, 'w') as f:
        json.dump(portrait.to_dict(), f, indent=2)

    print(f"\n✓ Assembled ward portrait:")
    print(f"  Total dimensions: {len(local_social) + len(local_ecological) + len(global_ecological) + len(global_social)}")
    print(f"  Output: {output_path}")
    print(f"  Site copy: {site_output_path}")

    # Print summary
    print("\n=== Ladywell Neighbourhood Doughnut Portrait ===")
    print(f"Local Social Foundation:    {len(local_social)} dimensions")
    print(f"Local Ecological Ceiling:   {len(local_ecological)} dimensions")
    print(f"Global Ecological Ceiling:  {len(global_ecological)} dimensions")
    print(f"Global Social Foundation:   {len(global_social)} dimensions")
    print(f"\nGenerated: {portrait.generated_at}")

if __name__ == "__main__":
    main()
