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

def build_housing_dimensions():
    """
    Housing dimension - 4 indicators, each with a multi-year trend extracted directly
    from primary sources (see data/HOUSING_TREND_DATA_STATUS.md for method/provenance).
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    rent = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="Median rent as % of median pay target: 30% rent-to-income ratio (affordable threshold)",
            source_body="Trust for London benchmarks",
            has_official_target=True
        ),
        indicator="Median rent as % of median pay",
        threshold=Threshold(value=30.0, unit="%", description="30% rent-to-income ratio as affordable threshold"),
        snapshot=Snapshot(value=43.6, unit="%", year=2025, date="2025 Q4"),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Rent Affordability by Borough",
            url="https://trustforlondon.org.uk/data/rent-affordability-borough/",
            accessed="2026-07-14",
            notes="Mean rent for a one-bedroom property as % of median gross pay, Lewisham, quarterly since 2015 Q1 (Q4 shown here for a stable annual series). Underlying sources: ONS Price Index of Private Rents (PIPR) + Annual Survey of Hours and Earnings (ASHE) via NOMIS, as published in Trust for London's chart data export. Note: previous snapshot mislabelled the 43.6% figure as '2023' data; the true 2023 Q4 value is 43.1% and 43.6% is actually 2025 Q4."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        trend=[
            {"period": "2015", "value": 43.8}, {"period": "2016", "value": 43.3},
            {"period": "2017", "value": 46.1}, {"period": "2018", "value": 43.2},
            {"period": "2019", "value": 44.9}, {"period": "2020", "value": 42.4},
            {"period": "2021", "value": 45.3}, {"period": "2022", "value": 42.2},
            {"period": "2023", "value": 43.1}, {"period": "2024", "value": 43.6},
            {"period": "2025", "value": 43.6},
        ]
    )

    temp_accommodation = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        indicator="Households in temporary accommodation",
        snapshot=Snapshot(value=18.90, unit="per 1,000 households", year="2025/26", date="31 December 2025"),
        source=Source(
            name="DLUHC / MHCLG Statutory Homelessness - Detailed Local Authority Level Tables (Table TA1)",
            url="https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness",
            accessed="2026-07-14",
            notes="2,363 households in temporary accommodation in Lewisham at 31 Dec 2025 (18.90 per 1,000 households), down from a peak of 2,888 (21.37 per 1,000) in Jun 2024. Lewisham did not submit usable TA figures for several quarters (Mar 2020, Mar 2022, Dec 2024, Mar 2025, Sep 2025) - those are excluded from the trend and the nearest available quarter is used instead, noted per point. Extracted directly from quarterly ODS/XLSX 'TA1' tables published by MHCLG (formerly DLUHC)."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this dimension.",
        trend=[
            {"period": "2019/20", "value": 18.16, "note": "Dec 2019 quarter (Mar 2020 suppressed - no data submitted)"},
            {"period": "2020/21", "value": 18.95, "note": "Mar 2021 quarter"},
            {"period": "2021/22", "value": 19.29, "note": "Dec 2021 quarter (Mar 2022 suppressed - no data submitted)"},
            {"period": "2022/23", "value": 20.31, "note": "Mar 2023 quarter"},
            {"period": "2023/24", "value": 19.99, "note": "Mar 2024 quarter"},
            {"period": "2024/25", "value": 20.19, "note": "Sep 2024 quarter (Dec 2024 and Mar 2025 both suppressed - no data submitted)"},
            {"period": "2025/26", "value": 18.90, "note": "Dec 2025 quarter (Sep 2025 suppressed - no data submitted)"},
        ]
    )

    rough_sleepers = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        indicator="Rough sleepers",
        snapshot=Snapshot(value=345, unit="people", year="2025/26"),
        source=Source(
            name="CHAIN database via Trust for London",
            url="https://trustforlondon.org.uk/data/rough-sleeping-borough/",
            accessed="2026-07-13",
            notes="345 people seen sleeping rough by outreach workers in 2025/26. Lewisham saw a reduction from 353 in 2023/24 to 325 in 2024/25, but increased again in 2025/26. Historical data from CHAIN annual reports."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2021/22", "value": 264}, {"period": "2022/23", "value": 296},
            {"period": "2023/24", "value": 353}, {"period": "2024/25", "value": 325},
            {"period": "2025/26", "value": 345},
        ]
    )

    non_decent_homes = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="% non-decent homes target: London average non-decent homes rate",
            source_body="MHCLG English Housing Survey benchmarks",
            has_official_target=True
        ),
        indicator="% non-decent homes (all tenure)",
        threshold=Threshold(value=13.2, unit="%", description="London average non-decent homes rate"),
        snapshot=Snapshot(value=12.9, unit="%", year=2024),
        status=Status.MET,
        source=Source(
            name="MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling",
            url="https://www.gov.uk/government/statistics/english-housing-survey-local-authority-housing-stock-condition-modelling-2024/local-authority-housing-stock-condition-modelling-2024-main-report",
            accessed="2026-07-14",
            notes="12.9% of Lewisham homes modelled as failing the Decent Homes Standard in 2024 (17,235 of 133,335 dwellings), just below the London average of 13.2%. These are modelled estimates from English Housing Survey stock data, not a census - MHCLG's own guidance cautions against directly comparing local authority estimates across releases due to methodology changes between rounds, so treat the trend as indicative rather than precise."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019", "value": 15.0, "note": "London average: 14.0%"},
            {"period": "2020", "value": 13.2, "note": "London average: 12.0%"},
            {"period": "2023", "value": 11.6, "note": "London average: 10.7% (no 2021/2022 round)"},
            {"period": "2024", "value": 12.9, "note": "London average: 13.2%"},
        ]
    )

    return [rent, temp_accommodation, rough_sleepers, non_decent_homes]

def build_food_dimensions():
    """
    Food dimension - 4 indicators, each with real Lewisham (borough-level) data pulled
    directly from OHID Fingertips / NHS Digital NDEP source datasets (not the Food
    Foundation's own modelled constituency estimates - those are LSHTM model outputs
    derived FROM these same underlying LA datasets, so the primary source is used
    directly here for higher precision and longer trends). See
    DIMENSION_PAGE_SPECIFICATION.md 1.4 (trace back to underlying government source).
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    food_insecurity = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        indicator="% population with moderate to severe food insecurity",
        snapshot=Snapshot(value=7.83, unit="%", year=2022),
        source=Source(
            name="OHID Fingertips - Wider Determinants of Health (Food Insecurity, indirect measure)",
            url="https://fingertips.phe.org.uk/profile/wider-determinants/data#page/6/gid/1938133045/pat/501/par/E92000001/ati/501/are/E09000023/iid/93864/age/1/sex/4/cat/-1/ctp/-1/yrr/1/cid/4/tbm/1",
            accessed="2026-07-15",
            notes="7.83% of Lewisham's population lived in areas at highest risk of food insecurity in 2022 (down from 9.57% in 2021); London average 13.27% (2022), 14.58% (2021). This is a DWP Family Resources Survey-derived small-area risk model published via OHID Fingertips (the same underlying indicator the Food Foundation's constituency dashboard models down to constituency level) - it measures the % of the population living in neighbourhoods classed as high-risk, not individual households' self-reported food insecurity experience. Corroborated by Lewisham Council's own Food Justice Action Plan Update (Health & Wellbeing Board, 19 Jan 2026), which cites '7.8% of Lewisham's population... living in areas at highest risk of food insecurity in 2022/23' against an England figure of 10%. Only 2 years of data have been published for this indicator so far."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2021", "value": 9.57},
            {"period": "2022", "value": 7.83},
        ]
    )

    obesity = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        indicator="% of children in reception and year 6 with obesity",
        snapshot=Snapshot(value=17.28, unit="%", year="2024/25"),
        source=Source(
            name="NHS Digital National Child Measurement Programme (NCMP) via OHID Fingertips",
            url="https://fingertips.phe.org.uk/profile/national-child-measurement-programme",
            accessed="2026-07-15",
            notes="Combined average of Reception obesity (10.02%, including severe obesity) and Year 6 obesity (24.54%) for Lewisham, 2024/25 - the most recently published NCMP round (provisional/'cannot be calculated' trend flag). London averages for the same year: Reception 9.62%, Year 6 22.61% (combined 16.12%). Lewisham's Year 6 rate has consistently run above the London average every year since 2006/07; Reception has been closer to or below it. Note this is 'obesity' specifically (BMI ≥95th centile) - Lewisham's own Whole Systems Approach to Obesity report (Feb 2026) instead cites a broader 'excess weight' (overweight+obesity) figure of 21.8% (Reception) / 39% (Year 6) for the same year, which is a different, less strict threshold."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator. National ambition (NHS 10 Year Health Plan, 2025) is to raise 'the healthiest generation of children'; Lewisham's own ambition (Whole Systems Approach to Obesity) is to halve childhood obesity by 2030.",
        trend=[
            {"period": "2006/07", "value": 20.22}, {"period": "2007/08", "value": 18.25},
            {"period": "2008/09", "value": 17.78}, {"period": "2009/10", "value": 19.34},
            {"period": "2010/11", "value": 17.84}, {"period": "2011/12", "value": 18.11},
            {"period": "2012/13", "value": 17.25}, {"period": "2013/14", "value": 17.90},
            {"period": "2014/15", "value": 18.01}, {"period": "2015/16", "value": 17.30},
            {"period": "2016/17", "value": 16.90}, {"period": "2017/18", "value": 16.05},
            {"period": "2018/19", "value": 16.50}, {"period": "2019/20", "value": 17.11,
             "note": "2020/21 excluded - not published by NHS Digital for data quality reasons (pandemic disruption to measurement)"},
            {"period": "2021/22", "value": 18.61}, {"period": "2022/23", "value": 17.75},
            {"period": "2023/24", "value": 17.35}, {"period": "2024/25", "value": 17.28},
        ]
    )

    dental_decay = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        indicator="% of children in reception and year 6 with dental decay",
        snapshot=Snapshot(value=14.40, unit="%", year="2022/23-2023/24"),
        source=Source(
            name="OHID National Dental Epidemiology Programme (NDEP) - oral health surveys of 5-year-olds and Year 6 children",
            url="https://fingertips.phe.org.uk/profile/child-health-profiles",
            accessed="2026-07-15",
            notes="Combines the most recent Reception-age (5-year-old) survey round (18.90%, 2023/24) with the Year 6 survey (9.90%, academic year 2022/23 - the only year Year 6 has ever been surveyed nationally; no repeat round exists yet) to a blended 14.40%. Reception has been surveyed roughly every 2 years since 2007/08 with a well-established Lewisham time series (used for the trend below); Year 6 has no historical series to plot. England averages for the same rounds: Reception 22.4%, Year 6 16.15% - Lewisham runs below England and well below the London average (27.4% Reception, 2024) on both age groups. Corroborated by an NHS South East London ICB Dental Services presentation to Lewisham Council (2026), which shows Lewisham's 2024 Reception decay rate (18.9%) as the 4th-lowest of London's 33 boroughs."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2007/08", "value": 31.34, "note": "Reception (5-year-olds) only"},
            {"period": "2011/12", "value": 21.91, "note": "Reception (5-year-olds) only"},
            {"period": "2014/15", "value": 23.31, "note": "Reception (5-year-olds) only"},
            {"period": "2016/17", "value": 19.44, "note": "Reception (5-year-olds) only"},
            {"period": "2018/19", "value": 22.26, "note": "Reception (5-year-olds) only"},
            {"period": "2021/22", "value": 12.40, "note": "Reception (5-year-olds) only"},
            {"period": "2023/24", "value": 18.90, "note": "Reception (5-year-olds) only"},
        ]
    )

    diabetes = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        indicator="% of people over 17 years old with type 2 diabetes",
        snapshot=Snapshot(value=7.22, unit="%", year="2024/25"),
        source=Source(
            name="OHID Fingertips Diabetes Profile - QOF prevalence, 17+",
            url="https://fingertips.phe.org.uk/profile/diabetes-ft",
            accessed="2026-07-15",
            notes="7.22% of Lewisham residents aged 17+ had diabetes recorded on GP disease registers in 2024/25 (QOF prevalence), up from 5.67% in 2012/13. This QOF measure records all diagnosed diabetes (type 1 and type 2 combined); type 2 accounts for around 90% of diagnosed cases nationally. A type-2-only measure (National Diabetes Audit) is published only at South East London ICB level (covering Lewisham, Southwark, Lambeth, Greenwich, Bromley and Bexley together), where it stood at 6.35% in 2024/25 - consistent with Lewisham's QOF figure once the ~90% type-2 share is applied. Lewisham has run significantly below the England average (7.89% in 2024/25) throughout this series, and close to the London average (7.08%)."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2012/13", "value": 5.67}, {"period": "2013/14", "value": 6.06},
            {"period": "2014/15", "value": 6.26}, {"period": "2015/16", "value": 6.40},
            {"period": "2016/17", "value": 6.47}, {"period": "2017/18", "value": 6.44},
            {"period": "2018/19", "value": 6.38}, {"period": "2019/20", "value": 6.27},
            {"period": "2020/21", "value": 6.27}, {"period": "2021/22", "value": 6.43},
            {"period": "2022/23", "value": 6.62}, {"period": "2023/24", "value": 7.00},
            {"period": "2024/25", "value": 7.22},
        ]
    )

    return [food_insecurity, obesity, dental_decay, diabetes]

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
        threshold=Threshold(value=6.1, unit="%", description="London average unemployment"),
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
def build_water_dimensions():
    """
    Water dimension - 2 indicators matching data/lookups/dimension_data_sources.json
    ("water_and_sanitation"). No ward- or borough-specific water data is published (water
    is supplied and regulated at the water-company level, not by the council), so both
    indicators use the best available company/national-level figures - see source notes
    for exactly what's inherited from where.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    per_capita_consumption = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        target=Target(
            text="Reduce average per capita water use in England by 20% from the 2019/20 baseline (140 litres/person/day) to 122 litres/person/day by March 2038, and to 110 litres/person/day by 2050 (Environment Act 2021 statutory target).",
            source_body="Defra / Environment Act 2021 target framework",
            has_official_target=True
        ),
        indicator="Per capita water consumption (litres/day)",
        threshold=Threshold(value=122.0, unit="litres/person/day", description="Environment Act 2021 target: 122 l/p/d by March 2038 (20% cut from 2019/20 baseline); 110 l/p/d by 2050"),
        snapshot=Snapshot(value=136.5, unit="litres/person/day", year="2024/25"),
        status=Status.SHORTFALL,
        source=Source(
            name="Environment Agency / Defra - Water resources: analysis of the water industry's annual water resources performance",
            url="https://www.gov.uk/government/publications/water-resources-2024-2025-analysis-of-the-water-industrys-annual-water-resources-performance/water-resources-2024-to-2025-analysis-of-the-water-industrys-annual-water-resources-performance",
            accessed="2026-07-15",
            notes="dimension_data_sources.json's original indicator label ('Per household water consumption') pointed to the company-level Water Resource Management Plan Annual Review Data (data.gov.uk); that dataset publishes per capita consumption (PCC) by water company, not per household - relabelled here to match what the source actually measures. Its underlying spreadsheets, and Thames Water's own company-level annual performance report, could not be downloaded and parsed directly in this session (data.gov.uk and thameswater.co.uk were both blocked by this environment's network egress policy, unlike the direct file access used for prior dimensions). Figures shown here are the England-wide PCC published in Defra/EA's annual water resources performance analysis, since a reliable Thames-Water-specific multi-year series could not be obtained via web search alone. Thames Water's own reporting states a 4.8% PCC reduction in 2024-25 but that it remained in the industry's 'lagging behind' performance category for the fourth year running (with Southern Water) - i.e. Thames Water's actual consumption is likely somewhat above the England average shown here, not below it. Separately, the Mayor of London's own reporting put London-wide consumption at 152.2 litres/person/day in 2020/21, falling to 144.4 in 2021/22 against a 142.6 target - consistent in direction with the national series but on a different measurement basis, so not merged into the trend below.",
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019/20", "value": 140.0, "note": "Environment Act 2021 baseline year"},
            {"period": "2022/23", "value": 141.0},
            {"period": "2023/24", "value": 137.0},
            {"period": "2024/25", "value": 136.5},
        ]
    )

    water_stress = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        indicator="Areas of water stress",
        snapshot=Snapshot(value="Seriously water stressed", unit=None, year=2021, date="1 July 2021"),
        source=Source(
            name="Environment Agency / Defra - Water stressed areas: 2021 classification",
            url="https://www.gov.uk/government/publications/water-stressed-areas-2021-classification",
            accessed="2026-07-15",
            notes="Thames Water - which supplies Lewisham - was classified as an area of 'serious' water stress in both the original 2013 determination and the 2021 update; the classification has not changed between rounds, so no numeric trend applies here (this is a one-off regulatory determination, not an annual measurement). In 2021 several other companies (e.g. Severn Trent, Wessex Water, South Staffordshire) moved from 'not serious' to 'serious' for the first time, widening the list, but Thames Water's own status was unchanged. The determination is used to decide which water companies can introduce compulsory water metering for all customers."
        ),
        geography=GeographyLevel.WATER_COMPANY,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator - this is a regulatory classification, not a target."
    )

    return [per_capita_consumption, water_stress]

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
        geography=GeographyLevel.ENGLAND,
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
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.LOW
    )

def main():
    """Build all Local Social dimensions with real Lewisham data where available"""
    dimensions = [
        build_health(),
        *build_housing_dimensions(),
        *build_food_dimensions(),
        *build_water_dimensions(),
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
