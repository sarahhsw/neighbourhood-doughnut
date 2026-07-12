"""
Build Global Ecological and Global Social dimensions
Hardcoded from London City Portrait figures (applies to all Lewisham wards)
"""
from schema import (
    Dimension, Lens, Status, GeographyLevel, Confidence,
    Target, Threshold, Snapshot, Source
)
import json
from datetime import datetime
from pathlib import Path

# Ladywell ward details
LADYWELL_WARD_CODE = "E05013725"
LADYWELL_WARD_NAME = "Ladywell"

def build_global_ecological():
    """
    Global Ecological lens - London City Portrait overshoot factors.
    All tagged as london_inherited since they apply citywide.
    """
    source = Source(
        name="London City Portrait 2024 - Doughnut Ecological Overshoot Analysis",
        url="https://www.thriving-cities-initiative.org/london-portrait",
        accessed=datetime.now().date().isoformat(),
        notes="City-wide figures applied to all Lewisham wards. No ward-level differentiation in source data."
    )

    dimensions = []

    # Climate change - 5.5x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="climate_change",
        target=Target(
            text="Stay within planetary boundary for greenhouse gas emissions",
            source_body="Stockholm Resilience Centre / Planetary Boundaries Framework",
            has_official_target=True
        ),
        indicator="CO2 emissions overshoot factor (territorial + consumption-based)",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=5.5, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW  # Low confidence at ward level
    ))

    # Material footprint - 1.1x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="material_footprint",
        target=Target(
            text="Material consumption within sustainable limits",
            source_body="Material footprint methodology (consumption-based)",
            has_official_target=True
        ),
        indicator="Material footprint overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=1.1, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Ecological footprint - 2.2x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="ecological_footprint",
        target=Target(
            text="Consumption footprint within Earth's biocapacity",
            source_body="Global Footprint Network",
            has_official_target=True
        ),
        indicator="Ecological footprint overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within biocapacity"),
        snapshot=Snapshot(value=2.2, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Nitrogen - 1.9x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="nitrogen",
        target=Target(
            text="Nitrogen flows within planetary boundary",
            source_body="Planetary Boundaries Framework - Biochemical Flows",
            has_official_target=True
        ),
        indicator="Nitrogen flow overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=1.9, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Phosphorus - 1.2x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="phosphorus",
        target=Target(
            text="Phosphorus flows within planetary boundary",
            source_body="Planetary Boundaries Framework - Biochemical Flows",
            has_official_target=True
        ),
        indicator="Phosphorus flow overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=1.2, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Land system change - 2.8x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="land_system_change",
        target=Target(
            text="Land-use change within sustainable limits",
            source_body="Planetary Boundaries Framework",
            has_official_target=True
        ),
        indicator="Land system change overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=2.8, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Freshwater use - 2.6x overshoot
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="freshwater_use",
        target=Target(
            text="Freshwater consumption within planetary boundary",
            source_body="Planetary Boundaries Framework",
            has_official_target=True
        ),
        indicator="Freshwater use overshoot factor",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = within boundary"),
        snapshot=Snapshot(value=2.6, unit="×", year=2024),
        status=Status.OVERSHOOT,
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Air pollution - 0.6x (WITHIN boundary!)
    dimensions.append(Dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.GLOBAL_ECOLOGICAL,
        dimension="air_pollution",
        target=Target(
            text="Air pollution within safe levels",
            source_body="WHO Air Quality Guidelines / Planetary Boundaries",
            has_official_target=True
        ),
        indicator="Air pollution boundary status",
        threshold=Threshold(value=1.0, unit="factor", description="1.0 = at boundary, <1.0 = within"),
        snapshot=Snapshot(value=0.6, unit="×", year=2024),
        status=Status.MET,  # The only Global Ecological dimension within bounds!
        geography_of_data=GeographyLevel.LONDON_INHERITED,
        source=source,
        confidence=Confidence.LOW
    ))

    # Dimensions with no data (explicitly marked)
    no_data_dimensions = [
        ("biosphere_integrity", "Biodiversity loss and species extinction rates"),
        ("novel_entities", "Chemical pollution and plastic pollution"),
        ("ozone_depletion", "Stratospheric ozone depletion")
    ]

    for dim_name, indicator_text in no_data_dimensions:
        dimensions.append(Dimension(
            ward=LADYWELL_WARD_NAME,
            ward_code=LADYWELL_WARD_CODE,
            lens=Lens.GLOBAL_ECOLOGICAL,
            dimension=dim_name,
            target=Target(
                text=f"Stay within planetary boundary for {dim_name.replace('_', ' ')}",
                source_body="Planetary Boundaries Framework",
                has_official_target=True
            ),
            indicator=indicator_text,
            threshold=Threshold(description="Boundary defined but London data unavailable"),
            snapshot=Snapshot(value=None, unit=None, year=None),
            status=Status.UNKNOWN,
            geography_of_data=GeographyLevel.LONDON_INHERITED,
            source=Source(
                name="London City Portrait 2024",
                notes="No data available for this planetary boundary at London scale"
            ),
            confidence=Confidence.LOW
        ))

    return dimensions

def build_global_social():
    """
    Global Social lens - international supply chain impacts.
    Placeholder for Phase 1 (no specific data in London Portrait).
    """
    # The London City Portrait doesn't provide Global Social Foundation metrics
    # (income inequality, decent work conditions in supply chains, etc.)
    # Mark as descriptive_only placeholder

    return [
        Dimension(
            ward=LADYWELL_WARD_NAME,
            ward_code=LADYWELL_WARD_CODE,
            lens=Lens.GLOBAL_SOCIAL,
            dimension="global_social_placeholder",
            target=Target(
                text="International supply-chain justice and fair trade",
                source_body="none_found",
                has_official_target=False
            ),
            indicator="Global Social Foundation metrics (placeholder)",
            threshold=Threshold(description="No London-level data available"),
            snapshot=Snapshot(value=None, unit=None, year=None),
            status=Status.DESCRIPTIVE_ONLY,
            geography_of_data=GeographyLevel.LONDON_INHERITED,
            source=Source(
                name="Placeholder - Global Social lens not implemented in London City Portrait 2024",
                notes="Future versions may include fair trade data, supply chain labor conditions, etc."
            ),
            confidence=Confidence.LOW
        )
    ]

def main():
    """Build and save Global lens dimensions"""
    output_dir = Path(__file__).parent.parent / "wards"
    output_dir.mkdir(parents=True, exist_ok=True)

    global_eco = build_global_ecological()
    global_soc = build_global_social()

    print(f"\nGlobal Ecological dimensions: {len(global_eco)}")
    print(f"  Overshoot: {sum(1 for d in global_eco if d.status == Status.OVERSHOOT)}")
    print(f"  Met: {sum(1 for d in global_eco if d.status == Status.MET)}")
    print(f"  Unknown: {sum(1 for d in global_eco if d.status == Status.UNKNOWN)}")

    print(f"\nGlobal Social dimensions: {len(global_soc)}")

    # Save partial output
    output = {
        "global_ecological": [d.to_dict() for d in global_eco],
        "global_social": [d.to_dict() for d in global_soc]
    }

    output_path = output_dir / "ladywell_global_lenses.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to: {output_path}")

if __name__ == "__main__":
    main()
