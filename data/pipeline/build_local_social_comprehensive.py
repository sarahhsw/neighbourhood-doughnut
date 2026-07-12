"""
Build Local Social dimensions with ALL available indicators from Trust for London
Creates multiple dimension entries per category to show full data richness
"""
import json
from pathlib import Path
from datetime import datetime
from schema import (
    Dimension, Target, Threshold, Snapshot, Source,
    Lens, Status, GeographyLevel, Confidence,
    create_targeted_dimension, create_descriptive_dimension
)

# Ward details
LADYWELL_WARD_CODE = "E05013725"
LADYWELL_WARD_NAME = "Ladywell"

# Load real Lewisham data
with open('data/manual/lewisham_real_data.json') as f:
    lewisham_data = json.load(f)

def create_tfl_dimension(dim_name, indicator_key, indicator_name, target_val, target_unit, target_desc, higher_is_better=True):
    """Helper to create dimension from Trust for London data"""
    ind_data = lewisham_data['indicators'][indicator_key]

    # Determine status
    if higher_is_better:
        status = Status.MET if ind_data['value'] >= target_val else Status.SHORTFALL
    else:
        status = Status.MET if ind_data['value'] <= target_val else Status.SHORTFALL

    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name=dim_name,
        target=Target(
            text=f"{indicator_name} target: {target_desc}",
            source_body="Trust for London benchmarks",
            has_official_target=True
        ),
        indicator=indicator_name,
        threshold=Threshold(
            value=target_val,
            unit=target_unit,
            description=target_desc
        ),
        snapshot=Snapshot(
            value=ind_data['value'],
            unit=target_unit,
            year=ind_data['year']
        ),
        status=status,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=ind_data.get('note', f"Lewisham: {ind_data['value']}{target_unit}. Comparison: {ind_data['comparison'].get('status', 'N/A')} vs benchmark")
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

# HEALTH DIMENSIONS (3 indicators)
def build_health_life_expectancy():
    return create_tfl_dimension(
        "health",
        "female_life_expectancy",
        "Female life expectancy",
        84.13, "years",
        "London average life expectancy",
        higher_is_better=True
    )

def build_health_premature_mortality():
    return create_tfl_dimension(
        "health",
        "premature_mortality",
        "Premature mortality rate",
        294, "per 100,000",
        "London average premature mortality",
        higher_is_better=False  # Lower is better
    )

def build_health_childhood_obesity():
    return create_tfl_dimension(
        "health",
        "childhood_obesity",
        "Childhood obesity prevalence",
        23.2, "%",
        "London average childhood obesity",
        higher_is_better=False
    )

# HOUSING DIMENSIONS (3 indicators)
def build_housing_rent_affordability():
    return create_tfl_dimension(
        "housing",
        "median_rent_percent_of_pay",
        "Median rent as % of median pay",
        30.0, "%",
        "30% rent-to-income ratio (affordable threshold)",
        higher_is_better=False
    )

def build_housing_temporary_accommodation():
    ind_data = lewisham_data['indicators']['temporary_accommodation_rate']
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        indicator="Households in temporary accommodation",
        snapshot=Snapshot(
            value=ind_data['value'],
            unit=ind_data['unit'],
            year=ind_data['year']
        ),
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"18.72 per 1,000 households - better than London average"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_housing_income():
    ind_data = lewisham_data['indicators']['gross_household_income']
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        indicator="Gross median household income",
        snapshot=Snapshot(
            value=ind_data['value'],
            unit=ind_data['unit'],
            year=ind_data['year']
        ),
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"£72,200 vs London average £74,200"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

# FOOD DIMENSIONS (1 indicator with data)
def build_food_obesity():
    return build_health_childhood_obesity()  # Same data, different lens

# EDUCATION DIMENSIONS (1 indicator)
def build_education_gcse():
    return create_tfl_dimension(
        "education",
        "gcse_attainment_9_4",
        "GCSE attainment (grades 9-4 in English & Maths)",
        70.5, "%",
        "London average GCSE attainment",
        higher_is_better=True
    )

# INCOME & WORK DIMENSIONS (5 indicators)
def build_income_poverty():
    return create_tfl_dimension(
        "income",
        "poverty_rate",
        "Overall poverty rate (after housing costs)",
        26.0, "%",
        "London average poverty rate",
        higher_is_better=False
    )

def build_income_child_poverty():
    return create_tfl_dimension(
        "income",
        "child_poverty_rate_ahc",
        "Child poverty rate (after housing costs)",
        31.0, "%",
        "London average child poverty",
        higher_is_better=False
    )

def build_income_unemployment():
    return create_tfl_dimension(
        "income",
        "unemployment_rate",
        "Unemployment rate",
        6.1, "%",
        "London average unemployment",
        higher_is_better=False
    )

def build_income_low_pay():
    return create_tfl_dimension(
        "income",
        "low_pay_residents",
        "% paid below London Living Wage",
        16.1, "%",
        "London average low pay rate",
        higher_is_better=False
    )

def build_income_benefits():
    return create_tfl_dimension(
        "income",
        "out_of_work_benefits",
        "% on out-of-work benefits",
        15.2, "%",
        "London average benefit claimant rate",
        higher_is_better=False
    )

# EQUALITY DIMENSIONS (1 indicator)
def build_equality_pay_gap():
    return create_tfl_dimension(
        "equality",
        "pay_inequality_ratio",
        "Pay inequality (80th:20th percentile ratio)",
        1.52, "ratio",
        "England average pay inequality",
        higher_is_better=False  # Lower ratio = more equal
    )

# Keep other dimensions as descriptive for now
def build_water():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        indicator="Universal access to clean water",
        snapshot=Snapshot(value=100.0, unit="%", year=2024),
        source=Source(
            name="Thames Water - Service Standards",
            url="https://www.thameswater.co.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Universal mains water access in Lewisham"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_connectivity():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="connectivity",
        indicator="Digital connectivity and inclusion",
        snapshot=Snapshot(value=0.0, unit="index", year=2025),
        source=Source(
            name="Ofcom Connected Nations / GLA Digital Exclusion Data",
            url="https://www.ofcom.org.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Broadband and mobile coverage data available - needs extraction"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.LOW
    )

def build_community():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="community",
        indicator="Community cohesion and belonging",
        snapshot=Snapshot(value=0.0, unit="%", year=2025),
        source=Source(
            name="DCMS Community Life Survey",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication",
            accessed=datetime.now().date().isoformat(),
            notes="Regional data only - not borough-specific"
        ),
        geography=GeographyLevel.NATIONAL_INHERITED,
        confidence=Confidence.LOW
    )

def build_culture():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="culture",
        indicator="Cultural infrastructure and participation",
        snapshot=Snapshot(value=0.0, unit="venues/1000", year=2025),
        source=Source(
            name="GLA Cultural Infrastructure Map",
            url="https://data.london.gov.uk/dataset/cultural-infrastructure-map-2025",
            accessed=datetime.now().date().isoformat(),
            notes="Borough-level cultural venue data available"
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.LOW
    )

def build_mobility():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="mobility",
        indicator="Public transport accessibility",
        snapshot=Snapshot(value=0.0, unit="PTAL", year=2024),
        source=Source(
            name="TfL Public Transport Accessibility Levels",
            url="https://tfl.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Ward-level PTAL data available"
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

def build_energy():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="energy",
        indicator="Energy efficiency and fuel poverty",
        snapshot=Snapshot(value=43.0, unit="%", year=2022),
        source=Source(
            name="ONS EPC Data",
            url="https://www.ons.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="43% of properties EPC A-C (Lewisham Observatory estimate)"
        ),
        geography=GeographyLevel.POSTCODE_AGGREGATED,
        confidence=Confidence.MEDIUM
    )

def build_peace_justice():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="peace_justice",
        indicator="Crime rate and community safety",
        snapshot=Snapshot(value=0.0, unit="per 1000", year=2025),
        source=Source(
            name="MPS Recorded Crime Data",
            url="https://data.london.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Ward and borough-level crime data available"
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

def build_political_voice():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="political_voice",
        indicator="Electoral turnout and civic participation",
        snapshot=Snapshot(value=0.0, unit="%", year=2024),
        source=Source(
            name="Electoral Commission / LG Inform",
            url="https://lginform.local.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Ward-level turnout data available"
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

def build_social_cohesion():
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_cohesion",
        indicator="Social trust and cohesion",
        snapshot=Snapshot(value=0.0, unit="%", year=2025),
        source=Source(
            name="DCMS Community Life Survey",
            url="https://www.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Regional data only"
        ),
        geography=GeographyLevel.NATIONAL_INHERITED,
        confidence=Confidence.LOW
    )

def main():
    """Build comprehensive Local Social dimensions with multiple indicators"""

    # Build all dimensions - now with multiple indicators per category
    dimensions = [
        # Health (3 indicators)
        build_health_life_expectancy(),
        build_health_premature_mortality(),
        build_health_childhood_obesity(),

        # Housing (3 indicators)
        build_housing_rent_affordability(),
        build_housing_temporary_accommodation(),
        build_housing_income(),

        # Food (using health obesity data)
        build_food_obesity(),

        # Water
        build_water(),

        # Connectivity
        build_connectivity(),

        # Community
        build_community(),

        # Culture
        build_culture(),

        # Mobility
        build_mobility(),

        # Education (1 indicator)
        build_education_gcse(),

        # Energy
        build_energy(),

        # Income & Work (5 indicators)
        build_income_poverty(),
        build_income_child_poverty(),
        build_income_unemployment(),
        build_income_low_pay(),
        build_income_benefits(),

        # Peace & Justice
        build_peace_justice(),

        # Political Voice
        build_political_voice(),

        # Social Cohesion
        build_social_cohesion(),

        # Equality (1 indicator)
        build_equality_pay_gap(),
    ]

    # Save to file
    output_path = Path('data/wards/ladywell_local_social.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output = {
        'local_social': [d.to_dict() for d in dimensions]
    }

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Print summary grouped by dimension
    from collections import defaultdict
    by_dim = defaultdict(list)
    for d in dimensions:
        by_dim[d.dimension].append(d)

    print(f"=== Built {len(dimensions)} Local Social Indicators across {len(by_dim)} Dimensions ===\n")

    for dim_name in sorted(by_dim.keys()):
        dim_list = by_dim[dim_name]
        print(f"{dim_name.upper().replace('_', ' ')} ({len(dim_list)} indicators):")
        for d in dim_list:
            icon = '✓' if d.status == Status.MET else '⚠' if d.status == Status.SHORTFALL else '📊'
            print(f"  {icon} {d.indicator}")
            if d.snapshot and d.snapshot.value is not None:
                val = d.snapshot.value
                unit = d.snapshot.unit
                year = d.snapshot.year
                if d.threshold and d.threshold.value:
                    target = d.threshold.value
                    print(f"     {val}{unit} vs {target}{unit} [{year}]")
                else:
                    print(f"     {val}{unit} [{year}]")
        print()

    print(f"Saved to: {output_path}")
    print(f"\n✅ Trust for London data coverage:")
    print(f"   Health: 3 indicators")
    print(f"   Housing: 3 indicators")
    print(f"   Income & Work: 5 indicators")
    print(f"   Education: 1 indicator")
    print(f"   Equality: 1 indicator")
    print(f"   Total: 13 indicators with real 2023 Lewisham data")

if __name__ == "__main__":
    main()
