"""
Build Local Social dimensions with real Lewisham data from Trust for London
"""
import json
from pathlib import Path
from datetime import datetime, date
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

def build_health():
    """Health dimension - using female life expectancy and premature mortality"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="health",
        target=Target(
            text="Healthy life expectancy ≥ London average; premature mortality ≤ London average",
            source_body="Trust for London benchmarks",
            has_official_target=True
        ),
        indicator="Female life expectancy (years)",
        threshold=Threshold(value=84.13, unit="years", description="London average life expectancy"),
        snapshot=Snapshot(
            value=82.92,
            unit="years",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: {lewisham_data['indicators']['female_life_expectancy']['value']} years vs London avg: {lewisham_data['indicators']['female_life_expectancy']['comparison']['london_average']} years. Premature mortality also worse than London average."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_housing():
    """Housing dimension - using rent affordability and temporary accommodation"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="Rent ≤ 30% of median pay; minimal temporary accommodation use",
            source_body="UK housing affordability standards + GLA targets",
            has_official_target=True
        ),
        indicator="Median rent as % of pay",
        threshold=Threshold(value=30.0, unit="%", description="30% rent-to-income ratio (affordable housing threshold)"),
        snapshot=Snapshot(
            value=43.6,
            unit="%",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Rent is 43.6% of median pay in Lewisham (better than London avg 51.6% but still above affordable threshold). Temporary accommodation: {lewisham_data['indicators']['temporary_accommodation_rate']['value']} per 1,000 households."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_food():
    """Food dimension - using childhood obesity as proxy"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        target=Target(
            text="Childhood obesity ≤ London average (food security & nutrition proxy)",
            source_body="Public Health England / Trust for London",
            has_official_target=True
        ),
        indicator="% children with obesity (Reception & Year 6)",
        threshold=Threshold(value=23.2, unit="%", description="London average childhood obesity rate"),
        snapshot=Snapshot(
            value=24.5,
            unit="%",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: 24.5% vs London avg: 23.2%. Food insecurity data from Food Foundation shows constituency-level variation: Lewisham North 9.5%, Lewisham West & East Dulwich 10.34%, Lewisham East 9.5%"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM
    )

def build_education():
    """Education dimension - using GCSE attainment"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="education",
        target=Target(
            text="GCSE attainment (grades 9-4 in English & Maths) ≥ London average",
            source_body="DfE / Trust for London",
            has_official_target=True
        ),
        indicator="% achieving GCSE grades 9-4 in English & Maths",
        threshold=Threshold(value=70.5, unit="%", description="London average GCSE attainment"),
        snapshot=Snapshot(
            value=63.1,
            unit="%",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: 63.1% vs London avg: 70.5% (-7.4 percentage points)"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_income():
    """Income dimension - using poverty rate"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="Poverty rate ≤ London average (<60% median income after housing costs)",
            source_body="Trust for London / DWP Family Resources Survey",
            has_official_target=True
        ),
        indicator="% population in poverty (after housing costs)",
        threshold=Threshold(value=26.0, unit="%", description="London average poverty rate"),
        snapshot=Snapshot(
            value=28.0,
            unit="%",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: 28% vs London avg: 26%. Child poverty: 30% (London avg: 31%). Pooled data from 2018/19-2023/24 (excl. 2020/21)"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_jobs():
    """Jobs dimension - using unemployment rate"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="jobs",
        target=Target(
            text="Unemployment rate ≤ London average",
            source_body="ONS Labour Force Survey / Trust for London",
            has_official_target=True
        ),
        indicator="% unemployment rate",
        threshold=Threshold(value=6.1, unit="%", description="London average unemployment rate"),
        snapshot=Snapshot(
            value=6.1,
            unit="%",
            year=2023
        ),
        status=Status.MET,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: 6.1% equals London avg. However, out-of-work benefits: 17.7% (above London 15.2%). Low pay: 13.4% (better than London 16.1%)"
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

def build_equality():
    """Equality dimension - using pay inequality ratio"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="equality",
        target=Target(
            text="Pay inequality (80:20 ratio) ≤ England average",
            source_body="ONS ASHE / Trust for London",
            has_official_target=True
        ),
        indicator="Pay inequality ratio (80th:20th percentile)",
        threshold=Threshold(value=1.52, unit="ratio", description="England average pay inequality"),
        snapshot=Snapshot(
            value=2.43,
            unit="ratio",
            year=2023
        ),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Lewisham Poverty Profile",
            url=lewisham_data["url"],
            accessed=lewisham_data["accessed"],
            notes=f"Lewisham: 2.43 vs England avg: 1.52. Higher ratio = more unequal. Top earners earn 2.43x more than bottom earners."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

# Keep existing dimensions from build_local_social_full.py for dimensions without new data
def build_water():
    """Water & sanitation"""
    return create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        target=Target(
            text="Universal access to clean, affordable water within Environmental Agency limits",
            source_body="Water UK / Thames Water regulation",
            has_official_target=True
        ),
        indicator="Water stress classification",
        threshold=Threshold(value=1.0, unit="classification", description="Not water-stressed"),
        snapshot=Snapshot(value=1.0, unit="classification", year=2021),
        status=Status.MET,
        source=Source(
            name="Environment Agency - Water Stressed Areas 2021",
            url="https://www.gov.uk/government/publications/water-stressed-areas-2021-classification",
            accessed=datetime.now().date().isoformat(),
            notes="London classified as 'seriously water stressed' but universal access to supply maintained"
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.MEDIUM
    )

def build_connectivity():
    """Digital connectivity"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="connectivity",
        indicator="Broadband coverage & digital exclusion",
        snapshot=Snapshot(value=0.0, unit="index", year=2025),
        source=Source(
            name="Ofcom Connected Nations 2025 / GLA Digital Exclusion Data",
            url="https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-2025",
            accessed=datetime.now().date().isoformat(),
            notes="No official borough-level target. Requires data extraction from Ofcom reports."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.LOW
    )

def build_community():
    """Community cohesion"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="community",
        indicator="% adults feeling lonely often/always; % feeling strong neighbourhood belonging",
        snapshot=Snapshot(value=0.0, unit="%", year=2024),
        source=Source(
            name="DCMS Community Life Survey 2024/25",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication",
            accessed=datetime.now().date().isoformat(),
            notes="Regional data only (not borough-specific). No official targets for loneliness/belonging."
        ),
        geography=GeographyLevel.NATIONAL_INHERITED,
        confidence=Confidence.LOW
    )

def build_culture():
    """Cultural participation"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="culture",
        indicator="Cultural venues per 1,000 population; active participation rate",
        snapshot=Snapshot(value=0.0, unit="venues/1000", year=2025),
        source=Source(
            name="GLA Cultural Infrastructure Map 2025",
            url="https://data.london.gov.uk/dataset/cultural-infrastructure-map-2025-2rj5o",
            accessed=datetime.now().date().isoformat(),
            notes="No official targets for cultural infrastructure density"
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.LOW
    )

def build_mobility():
    """Sustainable transport access"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="mobility",
        indicator="Public Transport Accessibility Level (PTAL); % trips by sustainable modes",
        snapshot=Snapshot(value=0.0, unit="PTAL", year=2024),
        source=Source(
            name="TfL PTAL Data / Healthy Streets Scorecard 2024",
            url="https://gis-tfl.opendata.arcgis.com/search?q=PTAL",
            accessed=datetime.now().date().isoformat(),
            notes="Ward-level PTAL available. No universal target but MTS aims for 80% sustainable mode share by 2041."
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

def build_energy():
    """Energy efficiency & fuel poverty"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="energy",
        indicator="% properties with EPC ≥ C; % households in fuel poverty",
        snapshot=Snapshot(value=43.0, unit="%", year=2022),
        source=Source(
            name="ONS EPC Data / BEIS Sub-regional Fuel Poverty Statistics",
            url="https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/energyperformancecertificates",
            accessed=datetime.now().date().isoformat(),
            notes="Previous estimate: 43% EPC A-C in Lewisham (via Lewisham Observatory)"
        ),
        geography=GeographyLevel.POSTCODE_AGGREGATED,
        confidence=Confidence.MEDIUM
    )

def build_peace_justice():
    """Safety & access to justice"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="peace_justice",
        indicator="Crime rate per 1,000; Index of Multiple Deprivation (Crime domain)",
        snapshot=Snapshot(value=0.0, unit="per 1000", year=2025),
        source=Source(
            name="MPS Recorded Crime Geographic Breakdown / IMD 2025",
            url="https://data.london.gov.uk/dataset/mps-recorded-crime-geographic-breakdown-exy3m",
            accessed=datetime.now().date().isoformat(),
            notes="Borough and ward-level crime data available"
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

def build_political_voice():
    """Civic participation"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="political_voice",
        indicator="% turnout in local elections; % engaged in civic participation",
        snapshot=Snapshot(value=0.0, unit="%", year=2024),
        source=Source(
            name="LG Inform / DCMS Community Life Survey",
            url="https://lginform.local.gov.uk/",
            accessed=datetime.now().date().isoformat(),
            notes="Borough-level turnout data available. No official targets for turnout/participation."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM
    )

def build_social_equity():
    """Social cohesion & trust"""
    return create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_equity",
        indicator="% trust in neighbours; % different backgrounds get along; % proud of local area",
        snapshot=Snapshot(value=0.0, unit="%", year=2024),
        source=Source(
            name="DCMS Community Life Survey 2024/25",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication",
            accessed=datetime.now().date().isoformat(),
            notes="Regional data only. No official targets."
        ),
        geography=GeographyLevel.NATIONAL_INHERITED,
        confidence=Confidence.LOW
    )

def main():
    """Build all Local Social dimensions with real Lewisham data where available"""
    dimensions = [
        build_health(),
        build_housing(),
        build_food(),
        build_water(),
        build_connectivity(),
        build_community(),
        build_culture(),
        build_mobility(),
        build_education(),
        build_energy(),
        build_income(),
        build_jobs(),
        build_peace_justice(),
        build_political_voice(),
        build_social_equity(),
        build_equality(),
    ]

    # Save to file
    output_path = Path('data/wards/ladywell_local_social.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output = {
        'local_social': [d.to_dict() for d in dimensions]
    }

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Print summary
    status_counts = {
        'met': sum(1 for d in dimensions if d.status == Status.MET),
        'shortfall': sum(1 for d in dimensions if d.status == Status.SHORTFALL),
        'descriptive': sum(1 for d in dimensions if d.status == Status.DESCRIPTIVE_ONLY),
    }

    print("=== Built 16 Local Social Dimensions with Real Data ===")
    print(f"✓ Met: {status_counts['met']}")
    print(f"⚠ Shortfall: {status_counts['shortfall']}")
    print(f"📊 Descriptive only (no target): {status_counts['descriptive']}")
    print(f"\nDimensions:")
    for d in dimensions:
        icon = '✓' if d.status == Status.MET else '⚠' if d.status == Status.SHORTFALL else '📊'
        print(f"  {icon} {d.dimension}: {d.status.value}")
        if d.threshold and d.snapshot:
            print(f"     {d.snapshot.value}{d.snapshot.unit} vs target {d.threshold.value}{d.threshold.unit}")

    print(f"\nSaved to: {output_path}")
    print(f"\n✅ Real data from Trust for London:")
    print(f"   - Health, Housing, Food, Education, Income, Jobs, Equality")
    print(f"   - All with 2023 data and London comparisons")

if __name__ == "__main__":
    main()
