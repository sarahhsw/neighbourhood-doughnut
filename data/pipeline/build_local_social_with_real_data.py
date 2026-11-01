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

    non_decent_homes_owner = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="% non-decent homes (owner-occupied) target: London owner-occupied non-decent homes rate",
            source_body="MHCLG English Housing Survey benchmarks",
            has_official_target=True
        ),
        indicator="% non-decent homes (Owner-occupied)",
        threshold=Threshold(value=11.7, unit="%", description="London owner-occupied non-decent homes rate"),
        snapshot=Snapshot(value=12.0, unit="%", year=2024),
        status=Status.SHORTFALL,
        source=Source(
            name="MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling",
            url="https://www.gov.uk/government/statistics/english-housing-survey-local-authority-housing-stock-condition-modelling-2024/local-authority-housing-stock-condition-modelling-2024-main-report",
            accessed="2026-10-31",
            notes="12.0% of Lewisham's owner-occupied homes were modelled as failing the Decent Homes Standard in 2024, just above the London owner-occupied average of 11.7% (Lewisham's all-tenure rate that year was 12.9%, against London's 13.2%). Across the four survey rounds with a published tenure breakdown, Lewisham's owner-occupied rate has been 13.4% (2019), 8.5% (2020), 10.0% (2023) and 12.0% (2024) - the lowest (most decent) of the three tenures in three of those four rounds. These are modelled estimates from English Housing Survey stock data, not a census; MHCLG's own guidance cautions against directly comparing local authority estimates across releases due to methodology changes between rounds, so treat the trend as indicative rather than precise. Source: Annex Table 1.2 (2023/2024 rounds, sheet AT1_2) / 'Decent_Homes_LA_Tenure' sheet (2019/2020 rounds), each release's Local Authority Housing Stock Condition Modelling workbook, matched to Lewisham by ONS code E09000023."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019", "value": 13.4, "note": "London average: 12.9%"},
            {"period": "2020", "value": 8.5, "note": "London average: 7.9%"},
            {"period": "2023", "value": 10.0, "note": "London average: 9.0% (no 2021/2022 round)"},
            {"period": "2024", "value": 12.0, "note": "London average: 11.7%"},
        ]
    )

    non_decent_homes_private = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="% non-decent homes (private rented) target: London private rented non-decent homes rate",
            source_body="MHCLG English Housing Survey benchmarks",
            has_official_target=True
        ),
        indicator="% non-decent homes (Private rented)",
        threshold=Threshold(value=16.3, unit="%", description="London private rented non-decent homes rate"),
        snapshot=Snapshot(value=16.0, unit="%", year=2024),
        status=Status.MET,
        source=Source(
            name="MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling",
            url="https://www.gov.uk/government/statistics/english-housing-survey-local-authority-housing-stock-condition-modelling-2024/local-authority-housing-stock-condition-modelling-2024-main-report",
            accessed="2026-10-31",
            notes="16.0% of Lewisham's private rented homes were modelled as failing the Decent Homes Standard in 2024, just below the London private rented average of 16.3%. Across the four survey rounds with a published tenure breakdown, Lewisham's private rented rate has been 17.7% (2019), 21.6% (2020), 12.7% (2023) and 16.0% (2024) - the highest (least decent) of the three tenures in three of those four rounds. These are modelled estimates from English Housing Survey stock data, not a census; MHCLG's own guidance cautions against directly comparing local authority estimates across releases due to methodology changes between rounds, so treat the trend as indicative rather than precise. Source: Annex Table 1.2 (2023/2024 rounds, sheet AT1_2) / 'Decent_Homes_LA_Tenure' sheet (2019/2020 rounds), each release's Local Authority Housing Stock Condition Modelling workbook, matched to Lewisham by ONS code E09000023."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019", "value": 17.7, "note": "London average: 17.2%"},
            {"period": "2020", "value": 21.6, "note": "London average: 20.0%"},
            {"period": "2023", "value": 12.7, "note": "London average: 12.4% (no 2021/2022 round)"},
            {"period": "2024", "value": 16.0, "note": "London average: 16.3%"},
        ]
    )

    non_decent_homes_social = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="housing",
        target=Target(
            text="% non-decent homes (social rented) target: London social rented non-decent homes rate",
            source_body="MHCLG English Housing Survey benchmarks",
            has_official_target=True
        ),
        indicator="% non-decent homes (Social rented)",
        threshold=Threshold(value=11.8, unit="%", description="London social rented non-decent homes rate"),
        snapshot=Snapshot(value=11.4, unit="%", year=2024),
        status=Status.MET,
        source=Source(
            name="MHCLG English Housing Survey - Local Authority Housing Stock Condition Modelling",
            url="https://www.gov.uk/government/statistics/english-housing-survey-local-authority-housing-stock-condition-modelling-2024/local-authority-housing-stock-condition-modelling-2024-main-report",
            accessed="2026-10-31",
            notes="11.4% of Lewisham's social rented homes were modelled as failing the Decent Homes Standard in 2024, just below the London social rented average of 11.8% - the lowest (most decent) of the three tenures that round, after being the highest (least decent) tenure in 2023 (13.4%, against a London rate of 12.6%). Across all four survey rounds with a published tenure breakdown, Lewisham's social rented rate has been 14.3% (2019), 12.9% (2020), 13.4% (2023) and 11.4% (2024) - the most volatile ranking of the three tenures. These are modelled estimates from English Housing Survey stock data, not a census; MHCLG's own guidance cautions against directly comparing local authority estimates across releases due to methodology changes between rounds, so treat the trend as indicative rather than precise. Source: Annex Table 1.2 (2023/2024 rounds, sheet AT1_2) / 'Decent_Homes_LA_Tenure' sheet (2019/2020 rounds), each release's Local Authority Housing Stock Condition Modelling workbook, matched to Lewisham by ONS code E09000023."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019", "value": 14.3, "note": "London average: 13.4%"},
            {"period": "2020", "value": 12.9, "note": "London average: 11.8%"},
            {"period": "2023", "value": 13.4, "note": "London average: 12.6% (no 2021/2022 round)"},
            {"period": "2024", "value": 11.4, "note": "London average: 11.8%"},
        ]
    )

    return [rent, temp_accommodation, rough_sleepers, non_decent_homes_owner, non_decent_homes_private, non_decent_homes_social]

def build_food_dimensions():
    """
    Food dimension - 4 indicators, each with real Lewisham (borough-level) data. Three
    are pulled directly from OHID Fingertips / NHS Digital NDEP source datasets (not the
    Food Foundation's own modelled constituency estimates - those are LSHTM model outputs
    derived FROM these same underlying LA datasets, so the primary source is used
    directly here for higher precision and longer trends). The food insecurity indicator
    instead uses Trussell's own Local Authority parcel-distribution data (2026-10-31) -
    the previous OHID Fingertips modelled risk measure only had two years published
    (2021-22) with no newer round in sight, so a differently-sourced but more current and
    more frequently updated proxy was substituted. See DIMENSION_PAGE_SPECIFICATION.md 1.4
    (trace back to underlying government source).
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    food_insecurity = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="food",
        indicator="Emergency food parcels distributed (Trussell network)",
        snapshot=Snapshot(value=22476, unit="parcels/year", year=2025),
        source=Source(
            name="Trussell - End of Year Stats (Local Authority data)",
            url="https://www.trussell.org.uk/news-and-research/latest-stats/end-of-year-stats",
            accessed="2026-10-31",
            notes="Lewisham's Trussell-network foodbanks distributed 22,476 emergency parcels in 2025 (14,961 for adults, 7,515 for children) across 7 locations - down 12% from a 2023 peak of 25,659, but still more than triple 2018's 7,311. Trussell switched from financial-year to calendar-year reporting in this release; data pulled directly from its 'Local authority' breakdown sheet (eys_2025_parcel_stats.xlsx, published March 2026). Counts parcels given out by Trussell-affiliated foodbanks only - excludes independent food banks and social supermarkets (e.g. Evelyn Community Store, see Get Involved) that aren't part of the Trussell network, so it understates total local food-aid demand. Replaces the previous indicator here (OHID Fingertips 'moderate to severe food insecurity' modelled risk measure, indicator 93864), which had only two years published (2021, 2022) with no newer round in sight - this dataset is genuinely local-authority level and updates annually."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2018", "value": 7311}, {"period": "2019", "value": 9018},
            {"period": "2020", "value": 16968}, {"period": "2021", "value": 19889},
            {"period": "2022", "value": 18532}, {"period": "2023", "value": 25659},
            {"period": "2024", "value": 24264}, {"period": "2025", "value": 22476},
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
        target_text="No official GLA or UK Government target established for this indicator. National ambition (NHS 10 Year Health Plan, 2025) is to raise 'the healthiest generation of children'. Separately, the 2018 Childhood Obesity Plan set a national ambition to halve childhood obesity by 2030 - Lewisham's own Whole Systems Approach to Obesity programme states it 'works toward the government's ambition', rather than setting its own distinct local target.",
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
        indicator="% of children with dental decay (Reception)",
        snapshot=Snapshot(value=18.90, unit="%", year="2023/24"),
        source=Source(
            name="OHID National Dental Epidemiology Programme (NDEP) - oral health surveys of 5-year-olds and Year 6 children",
            url="https://fingertips.phe.org.uk/profile/child-health-profiles",
            accessed="2026-07-15",
            notes="Headline and chart show Reception (5-year-olds) only: 18.90% in 2023/24, the most recent round, surveyed roughly every 2 years since 2007/08 with a well-established Lewisham time series. Year 6 has only ever been surveyed once nationally (9.90%, academic year 2022/23) - no repeat round exists yet, so it has no trend to chart and isn't blended into the headline figure (an earlier version averaged the two ages into an artificial 14.40%, which matched neither age group's own number nor the Reception-only chart - see 'what this measures' below for both figures stated separately). England averages for the same rounds: Reception 22.4%, Year 6 16.15% - Lewisham runs below England and well below the London average (27.4% Reception, 2024) on both age groups. Direct extraction of the official NDEP 2023/24 round results (UTLA table) ranks Lewisham's 18.9% as the 6th-lowest of 32 London boroughs (tied with Bromley) that round - corrects an earlier, unverifiable claim sourced to an NHS South East London ICB presentation that cited '4th-lowest of 33 boroughs', which could not be traced to a genuine 33-borough comparison (the only '4th-lowest' ranking found was among a 6-borough South East London ICB subset, not all London boroughs)."
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
            notes="7.22% of Lewisham residents aged 17+ had diabetes recorded on GP disease registers in 2024/25 (QOF prevalence), up from 5.67% in 2012/13. This QOF measure records all diagnosed diabetes (type 1 and type 2 combined); type 2 accounts for around 90% of diagnosed cases nationally. A type-2-only measure (National Diabetes Audit) is published only at South East London ICB level (covering Lewisham, Southwark, Lambeth, Greenwich, Bromley and Bexley together), where it stood at 6.35% in 2024/25 - consistent with Lewisham's QOF figure once the ~90% type-2 share is applied. Lewisham has run significantly below the England average (7.89% in 2024/25) throughout this series, and is now almost identical to the London average (7.22% in 2024/25, re-pulled directly from the Fingertips API 2026-10-31 - supersedes an earlier 7.08% figure, a genuine data revision between pulls, not an error in either)."
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
    """
    Education dimension - 1 indicator (GCSE attainment), matching
    data/lookups/dimension_data_sources.json ("education"). Re-verified July 2026: the
    site's previous 63.1%/"2023" figure paired a stale Lewisham value with what is actually
    London's 2024/25 average, not a same-year comparison - see source notes for the
    corrected, matched-year figures and the sourcing chain used to get them.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    gcse = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="education",
        target=Target(
            text="GCSE attainment (grades 9-4 in English & Maths) target: London average for state-funded schools, same academic year",
            source_body="Trust for London benchmarks",
            has_official_target=True
        ),
        indicator="GCSE attainment (grades 9-4 in English & Maths)",
        threshold=Threshold(value=71.0, unit="%", description="London average (state-funded schools), 2023/24 - the same academic year as Lewisham's latest confirmed figure"),
        snapshot=Snapshot(value=66.0, unit="%", year="2023/24"),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - GCSE attainment in English and Maths by London borough",
            url="https://trustforlondon.org.uk/data/gcse-attainment-borough/",
            accessed="2026-07-18",
            notes="66% of Lewisham pupils achieved grade 4 or above in both English and Maths GCSE in 2023/24 (summer 2024 exams), up from 61% in 2022/23 and 59% in 2018/19 (pre-pandemic baseline) - Lewisham Council's own Validated Outcomes 2024 Standards Report (lewisham.moderngov.co.uk) cites the 66%/59% comparison directly; the 61% figure for 2022/23 (58.8% boys, 63.2% girls) comes from GOV.UK's Ethnicity Facts and Figures local-authority breakdown of the same underlying DfE dataset. London (state-funded schools) averaged 71% for 2023/24 and 70.5% for 2024/25, against an England average of 64.8% (2024/25) and 65.1% (2022/23) - Lewisham has run below London throughout. Underlying primary source is DfE's Key Stage 4 performance statistics (published via Explore Education Statistics and reflected in GOV.UK Ethnicity Facts and Figures' local authority tables), which Trust for London's borough chart (the source originally listed in dimension_data_sources.json) also draws on. Trust for London's own interactive chart, and DfE's Explore Education Statistics portal, could not be queried directly in this session - both trustforlondon.org.uk and explore-education-statistics.service.gov.uk were blocked by this session's network egress policy - so the figures above were independently corroborated via Lewisham Council's own published Standards Report and GOV.UK's Ethnicity Facts and Figures instead, both of which trace back to the same DfE KS4 dataset. A confirmed Lewisham figure for 2024/25 (summer 2025 exams) was not found. 2019/20-2021/22 are excluded from the trend: GCSEs were not sat as standard exams in 2020 or 2021 (COVID-19 centre/teacher-assessed grading), DfE did not publish comparable local authority performance tables for those years, and a comparable grade-4 figure for 2021/22 could not be confirmed."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2018/19", "value": 59.0, "note": "Pre-pandemic baseline, as cited in Lewisham Council's 2024 Standards Report"},
            {"period": "2022/23", "value": 61.0, "note": "58.8% boys / 63.2% girls - GOV.UK Ethnicity Facts and Figures local authority data"},
            {"period": "2023/24", "value": 66.0, "note": "Latest confirmed borough figure - Lewisham Council's Validated Outcomes 2024 Standards Report"},
        ]
    )
    return [gcse]

def build_income():
    """
    Income dimension - 6 indicators. The first 5 are Trust for London's Lewisham Poverty
    Profile indicators (poverty, child poverty, unemployment, low pay, out-of-work benefits) -
    already live on site before this pass, re-verified fresh here (accessed 2026-07-18) rather
    than copied forward unchanged. A 6th indicator, IMD 2025 decile, was added per the data
    registry (data/lookups/dimension_data_sources.json listed IMD as the 5th income_and_work
    indicator even though the live site's 5th indicator was actually out-of-work benefits,
    which had no registry entry at all - both gaps are fixed in that file in the same pass).

    Re-verification note (all 5 TfL indicators): this session's direct-fetch tool (WebFetch)
    returned HTTP 403 on every external domain for the full session, confirmed with a control
    fetch to example.com, and the web-search tool's per-session quota (200 calls) was exhausted
    before Trust for London's hidden per-indicator CSV/dataset endpoints (see
    DIMENSION_PAGE_SPECIFICATION.md section 1.6 - the mechanism that produced the housing
    dimension's full 2015-2025 rent trend) could be located for these 5 indicators. Historical
    trend arrays could therefore NOT be extracted this session for indicators 1-5 despite a
    genuine, extensive effort (30+ search queries) - each indicator's source.notes documents
    this explicitly per DIMENSION_PAGE_SPECIFICATION.md section 1.3 ("if historical data is
    unavailable, state this explicitly") rather than fabricating one. Re-verification itself
    (confirming current values via search-engine synthesis of Trust for London's live pages,
    cross-referenced against ONS/DWP context) was possible and is documented per indicator.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    poverty = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="Overall poverty rate (after housing costs) target: London average poverty rate",
            source_body="Trust for London benchmarks (underlying: DWP Family Resources Survey / HBAI)",
            has_official_target=True
        ),
        indicator="Overall poverty rate (after housing costs)",
        threshold=Threshold(value=26.0, unit="%", description="London average poverty rate"),
        snapshot=Snapshot(value=28.0, unit="%", year=2023),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Poverty rates by London borough",
            url="https://trustforlondon.org.uk/data/poverty-borough/",
            accessed="2026-07-18",
            notes="Lewisham 28.0% vs London average 26.0%. Poverty is defined as household income below 60% of median, after housing costs (AHC). Figures pool five years of DWP Family Resources Survey / Households Below Average Income (HBAI) data across financial years 2018/19-2023/24 (2020/21 excluded - pandemic disruption to survey quality), which is Trust for London's stated method for getting a stable borough-level estimate from a national sample too small to give reliable single-year local figures. Re-verified 2026-07-18: multiple independently-dated (2025/2026) search results reproduce this same 28%/26% pairing with no evidence of a newer superseding figure. Trust for London's own commentary (10 charts series, borough-level poverty update) separately notes poverty rose across Lewisham both before and after housing costs over 2009/10-2019/20, but no exact yearly series could be retrieved this session (see function docstring) - trend intentionally left empty rather than fabricated."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

    child_poverty = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="Child poverty rate (after housing costs) target: London average child poverty",
            source_body="Trust for London benchmarks (underlying: DWP Family Resources Survey / HBAI)",
            has_official_target=True
        ),
        indicator="Child poverty rate (after housing costs)",
        threshold=Threshold(value=31.0, unit="%", description="London average child poverty"),
        snapshot=Snapshot(value=30.0, unit="%", year=2023),
        status=Status.MET,
        source=Source(
            name="Trust for London - Children in poverty by London borough",
            url="https://trustforlondon.org.uk/data/child-poverty-borough/",
            accessed="2026-07-18",
            notes="Lewisham 30.0% vs London average 31.0% (children in households below 60% of median income, after housing costs), same pooled 2018/19-2023/24 (excl. 2020/21) methodology as the overall poverty rate. Re-verified 2026-07-18: repeated exactly (30% Lewisham) across several independently-dated 2025/2026 sources. A different, non-comparable measure - DWP/HMRC 'children in low income families' local statistics (before-housing-costs, administrative rather than survey-based) - puts a higher figure on Lewisham child poverty in some council/PHE reporting; that is a distinct methodology and not used here to avoid conflating two different definitions. No exact yearly trend series could be retrieved this session (see function docstring) - trend intentionally left empty rather than fabricated."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

    unemployment = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="Unemployment rate target: London average unemployment",
            source_body="Trust for London benchmarks (underlying: ONS Annual Population Survey)",
            has_official_target=True
        ),
        indicator="Unemployment rate",
        threshold=Threshold(value=6.1, unit="%", description="London average unemployment"),
        snapshot=Snapshot(value=6.1, unit="%", year=2023),
        status=Status.MET,
        source=Source(
            name="Trust for London - Unemployment rate by London borough",
            url="https://trustforlondon.org.uk/data/unemployment-rate-borough/",
            accessed="2026-07-18",
            notes="Lewisham 6.1% equal to London average 6.1% (2023, ONS Annual Population Survey modelled estimate) - the last fully period-matched pairing this session could confirm. Flag for next refresh: search-engine synthesis of Trust for London's current page surfaced a higher, more recent-looking figure (~6.5%, described as '6th highest in London'), and ONS regional labour market bulletins independently show Lewisham's (differently-defined) claimant count rate rising from 5.7% in March 2023 to 6.5% in March 2024 - consistent directional evidence the borough's position has likely worsened since 2023. However, this session's WebFetch tool returned HTTP 403 on every external domain (confirmed via a control fetch to example.com) and the web-search quota was exhausted before a period-matched London-average comparator for the newer figure could be confirmed, so the unverified 6.5% was NOT substituted in to avoid pairing a newer borough figure against a stale benchmark (DIMENSION_PAGE_SPECIFICATION.md 1.1: comparison periods must match exactly). Confidence set to medium to reflect this open flag."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM
    )

    low_pay = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="% paid below London Living Wage target: London average low pay rate",
            source_body="Trust for London benchmarks (underlying: ONS ASHE)",
            has_official_target=True
        ),
        indicator="% paid below London Living Wage",
        threshold=Threshold(value=16.1, unit="%", description="London average low pay rate"),
        snapshot=Snapshot(value=13.4, unit="%", year=2023),
        status=Status.MET,
        source=Source(
            name="Trust for London - Low pay in London boroughs",
            url="https://trustforlondon.org.uk/data/low-pay-in-london-boroughs/",
            accessed="2026-07-18",
            notes="% of working residents paid below the London Living Wage (an hourly rate independently calculated by the Resolution Foundation and set by the Living Wage Foundation, currently £13.85 from April 2025 - higher than the statutory National Living Wage). Lewisham 13.4% vs London average 16.1% (2023). Re-verified 2026-07-18: could not retrieve an updated Lewisham-specific figure this session, but the London-wide comparator context found (16.1% of Londoners low-paid in 2025, down from 17.3% in 2024) is consistent with the existing 16.1% London benchmark, so it was not contradicted and is retained. No Lewisham-specific yearly trend series could be retrieved this session (see function docstring) - trend intentionally left empty rather than fabricated."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

    out_of_work_benefits = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        target=Target(
            text="% on out-of-work benefits target: London average benefit claimant rate",
            source_body="Trust for London benchmarks (underlying: DWP benefit claimant statistics)",
            has_official_target=True
        ),
        indicator="% on out-of-work benefits",
        threshold=Threshold(value=15.2, unit="%", description="London average benefit claimant rate"),
        snapshot=Snapshot(value=17.7, unit="%", year=2023),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - People on out-of-work benefits, by London borough",
            url="https://trustforlondon.org.uk/data/out-work-benefits-borough/",
            accessed="2026-07-18",
            notes="% of the working-age population claiming out-of-work benefits (DWP benefit claimant statistics). Lewisham 17.7% vs London average 15.2% (2023). Re-verified 2026-07-18: this session located the correct live source URL for the first time (dimension_data_sources.json previously had no entry at all for this indicator, despite it already being the site's 5th live income indicator - fixed in that file in this pass). Cross-checked against the current London borough range found this session (Enfield highest at 21.4%, Richmond upon Thames lowest at 7.9%, both August 2025) - Lewisham's 17.7% sits well toward the higher end of that range, consistent with Lewisham being 'one of the highest' London boroughs on this measure. No exact updated Lewisham figure or yearly trend series could be retrieved this session (see function docstring) - trend intentionally left empty rather than fabricated."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH
    )

    imd_decile = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="income",
        indicator="Index of Multiple Deprivation Decile",
        snapshot=Snapshot(
            value=14.3,
            unit="% of Ladywell's neighbourhoods (LSOAs) in England's most deprived national quintile (IMD decile 1-2)",
            year=2025
        ),
        source=Source(
            name="MHCLG English Indices of Deprivation 2025, aggregated to Ladywell ward",
            url="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025",
            accessed="2026-07-18",
            notes="Ward-level aggregation (per DIMENSION_PAGE_SPECIFICATION.md 1.6/11.6): Ladywell ward comprises 7 LSOAs (Lower-layer Super Output Areas, ~1,000-3,000 people each); 1 of the 7 (about 14%) ranks in England's most deprived national quintile (IMD decile 1-2), per Lewisham Observatory's Ladywell ward profile (observatory.lewisham.gov.uk/ladywell/) and corroborated by Ladywell Live's report on the IMD 2025 release (31 Oct 2025), which also states Ladywell's position 'has changed little since 2019' and that the ward scores comparatively well on the education domain specifically but poorly on income and living environment - directly relevant to this dimension. Full LSOA-by-LSOA decile aggregation (rather than this single 'how many of 7 are in the bottom quintile' statistic) was not feasible this session because the underlying LSOA-level dataset could not be downloaded (WebFetch blocked site-wide - see function docstring); this is a genuine, sourced ward aggregation rather than the borough-average fallback. Borough context: Lewisham LA ranks 172nd-least-deprived of 296 English local authorities on IMD 2025's 'Rank of Extent' summary measure (only 2% of Lewisham's LSOAs sit in the nationally most-deprived decile, vs 10% for England as a whole) - but this is a narrower, different summary measure from the LA's overall/average-rank deprivation position, which has historically been far more deprived-looking (48th of 326 local authorities under IMD 2015's average-rank measure; PHE's 2019 health profile classed Lewisham as 'one of the 20% most deprived districts/unitary authorities in England'). These different summary measures are NOT combined into one trend - IMD is not designed for cross-round comparison in any case (MHCLG's own IMD 2025 guidance cautions against directly comparing ranks/deciles across releases, since both the indicator set and LSOA boundaries change between rounds), so a single 2025 data point is used rather than a fabricated series."
        ),
        geography=GeographyLevel.LSOA_AGGREGATED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator. The Index of Multiple Deprivation is a relative ranking of neighbourhoods against each other, not a measure with a policy target to hit."
    )

    return [poverty, child_poverty, unemployment, low_pay, out_of_work_benefits, imd_decile]

def build_equality():
    """
    Equality dimension - 4 indicators matching data/lookups/dimension_data_sources.json
    ("equality"). Only one indicator (pay inequality) has a genuine borough-level figure;
    the other three are London-wide, because no Lewisham- or borough-specific data was
    found after a real search effort for wealth share, gender pay gap, or ethnicity pay
    gap (see per-indicator source notes for what was tried). "Pay gap (ethnic, gender)" in
    the source registry has been split into two separate indicators - gender and ethnicity
    pay gaps come from different underlying ONS surveys (ASHE vs Annual Population Survey)
    and telling genuinely distinct stories, so combining them into one number would have
    hidden more than it showed. dimension_data_sources.json updated accordingly (4 rows).
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    pay_inequality = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="equality",
        target=Target(
            text="Pay inequality (80:20 hourly wage ratio) target: England average pay inequality",
            source_body="Trust for London benchmarks (underlying: ONS ASHE via NOMIS)",
            has_official_target=True
        ),
        indicator="Pay inequality (80th:20th percentile ratio)",
        threshold=Threshold(value=1.52, unit="ratio", description="England average 80:20 hourly pay ratio"),
        snapshot=Snapshot(value=2.43, unit="ratio", year=2023),
        status=Status.SHORTFALL,
        source=Source(
            name="Trust for London - Pay inequality by London borough",
            url="https://trustforlondon.org.uk/data/pay-inequality-borough/",
            accessed="2026-07-17",
            notes=(
                "Lewisham's 80:20 hourly wage ratio is 2.43 (the top-paid 20% earn 2.43x more per hour than the "
                "bottom-paid 20%), vs an England average of 1.52 and a London average of 2.5. Underlying source: "
                "ONS Annual Survey of Hours and Earnings (ASHE) via NOMIS. Re-verified 2026-07-17: this figure is "
                "still shown as Lewisham's current value and is independently corroborated across multiple Trust "
                "for London borough/data pages. However, the Trust for London page itself now shows a 'last "
                "updated January 2026' stamp and states pay inequality has fallen in most London boroughs since "
                "the prior release (Lewisham is not among the four named exceptions - Hackney, Wandsworth, "
                "Hammersmith & Fulham, Richmond upon Thames - where it rose), which suggests a newer (likely "
                "2024 ASHE-based) figure may now be live and slightly lower than 2.43. This session's tools "
                "(WebFetch and direct curl) were blocked by the environment's egress policy for "
                "trustforlondon.org.uk, ons.gov.uk and nomisweb.co.uk, so the exact updated value and the "
                "multi-year trend behind the interactive chart could not be extracted - only the aggregate "
                "figures summarised in search results were retrievable. No historical series is included below "
                "for this reason; adding one would mean fabricating intermediate points, which the project's "
                "spec explicitly prohibits. A follow-up session with working page-fetch access should re-check "
                "this page directly for both the current value and the 2015-2025 trend."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM
    )

    wealth_share_poorest_half = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="equality",
        indicator="% of wealth held by the poorest 50%",
        snapshot=Snapshot(value=4.0, unit="%", year=2022),
        source=Source(
            name="GLA London Datastore - Economic Fairness: Wealth Inequality",
            url="https://data.london.gov.uk/economic-fairness/equal-opportunities/wealth-inequality",
            accessed="2026-07-17",
            notes=(
                "No Lewisham- or borough-level wealth distribution figure exists (the underlying ONS Wealth and "
                "Assets Survey - WAS - is not designed to produce reliable local authority estimates), so this "
                "uses the GLA's London-wide figure instead, labelled accordingly: households in the bottom half "
                "of London's wealth distribution hold just 4% of the capital's total household wealth, while the "
                "richest 10% of households hold over 60%. Underlying source: ONS Wealth and Assets Survey "
                "microdata, as analysed by the GLA's Economic Fairness programme. An older Trust for London "
                "page (trustforlondon.org.uk/data/wealth-distribution/, now archived and no longer updated) put "
                "the same England-wide poorest-50%-wealth-share at 9% and London's bottom-half share at 6.8%, "
                "using 2018-2020 WAS data - the GLA's 4% figure is treated as the more current reference here, "
                "but the two aren't a clean like-for-like trend (different WAS rounds/methodology), so no trend "
                "array is given rather than implying a precise year-on-year decline. Caveat: the Office for "
                "Statistics Regulation removed WAS's Official Statistics accreditation in June 2025, saying it "
                "was 'no longer of sufficient value or quality to meet users' needs' - treat this figure as "
                "broadly indicative of London's wealth concentration, not a precise measurement. This session's "
                "WebFetch/curl tools were blocked for both trustforlondon.org.uk and ons.gov.uk, so the exact "
                "WAS survey round behind the GLA's 4% figure could not be independently confirmed."
            )
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.LOW,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    gender_pay_gap = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="equality",
        indicator="Gender pay gap (mean hourly pay)",
        snapshot=Snapshot(value=14.0, unit="%", year=2023),
        source=Source(
            name="GLA London Datastore - Economic Fairness: Gender Pay Gap",
            url="https://data.london.gov.uk/economic-fairness/labour-market/gender-pay-gap",
            accessed="2026-07-17",
            notes=(
                "No Lewisham-specific gender pay gap figure was found for borough residents (ONS does publish "
                "ASHE Table 8, a residence-based earnings-by-local-authority dataset, which in principle could "
                "be used to derive one, but this session's tools could not reach ons.gov.uk to extract it - "
                "WebFetch and direct curl were both blocked by the environment's egress policy). This uses the "
                "GLA's London-wide figure instead: female employees in London were paid 14% less per hour than "
                "male employees on average in 2023 (mean hourly pay, all employees). Underlying source: ONS "
                "Annual Survey of Hours and Earnings (ASHE). Only this single year's figure could be confirmed "
                "via search; the GLA's own page reportedly notes the London gap 'has not fallen over more than a "
                "decade' unlike the national trend, but exact values for other years were not retrievable this "
                "session, so no fabricated trend is given - see Confidence.LOW."
            )
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.LOW,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    ethnicity_pay_gap = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="equality",
        indicator="Ethnicity pay gap (median hourly pay, White vs ethnic minority employees)",
        snapshot=Snapshot(value=22.0, unit="%", year=2023),
        source=Source(
            name="GLA London Datastore - Economic Fairness: Ethnicity Pay Gap",
            url="https://data.london.gov.uk/economic-fairness/labour-market/ethnicity-pay-gap",
            accessed="2026-07-17",
            notes=(
                "No Lewisham-specific ethnicity pay gap figure exists at borough level (sample sizes in ONS's "
                "source surveys are too small to support reliable local authority breakdowns by ethnicity), so "
                "this uses London-wide figures. The GLA states the gap in median hourly pay between White and "
                "Black/Asian/minority ethnic employees in London is 'more than 22%' (most recent, based on the "
                "ONS Annual Population Survey), against roughly 1% across England & Wales outside London - "
                "London has consistently had the largest regional ethnicity pay gap in the country. Trend points "
                "for 2018 (21.7%) and 2019 (23.8%) are from ONS's own annual 'Ethnicity pay gaps in Great "
                "Britain' regional bulletins (unadjusted/raw gap, London region); the current point uses 22.0 as "
                "a conservative reading of the GLA's 'more than 22%' statement since an exact decimal for the "
                "latest year could not be confirmed - WebFetch/curl access to data.london.gov.uk and ons.gov.uk "
                "was blocked in this session, so this is built from search-result summaries rather than the "
                "primary tables directly. Treat the three points as broadly indicative of a persistently large, "
                "fairly stable gap rather than a precise year-on-year series."
            )
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2018", "value": 21.7, "note": "ONS Ethnicity pay gaps in Great Britain: 2018 (London region, unadjusted gap)"},
            {"period": "2019", "value": 23.8, "note": "ONS Ethnicity pay gaps in Great Britain: 2019 (London region, unadjusted gap)"},
            {"period": "2023", "value": 22.0, "note": "GLA Economic Fairness states 'more than 22%'; exact decimal not confirmed this session"},
        ]
    )

    return [pay_inequality, wealth_share_poorest_half, gender_pay_gap, ethnicity_pay_gap]

# Keep existing dimensions from build_local_social_full.py for dimensions without new data
def build_water_dimensions():
    """
    Water dimension - 3 indicators matching data/lookups/dimension_data_sources.json
    ("water_and_sanitation"). No ward- or borough-specific water data is published (water
    is supplied and regulated at the water-company level, not by the council), so all
    three indicators use the best available company/national-level figures - see source
    notes for exactly what's inherited from where.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    per_capita_consumption = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        target=Target(
            text="Reduce Thames Water's average per capita water use to 110 litres/person/day by 2050, matching the Environment Act 2021 national statutory target (122 litres/person/day by March 2038 from the 2019/20 baseline).",
            source_body="Defra / Environment Act 2021 target framework; Thames Water's government-approved WRMP24 (October 2024)",
            has_official_target=True
        ),
        indicator="Per capita water consumption (litres/day)",
        threshold=Threshold(value=122.0, unit="litres/person/day", description="Environment Act 2021 target: 122 l/p/d by March 2038 (from a 2019/20 baseline); 110 l/p/d by 2050, which Thames Water's approved WRMP24 commits to matching."),
        snapshot=Snapshot(value=139.01, unit="litres/person/day", year="2025/26"),
        status=Status.SHORTFALL,
        source=Source(
            name="Environment Agency / Defra - Water resources 2025 to 2026: analysis of the water industry's annual water resources performance",
            url="https://www.gov.uk/government/publications/water-resources-2025-2026-analysis-of-the-water-industrys-annual-water-resources-performance/water-resources-2025-to-2026-analysis-of-the-water-industrys-annual-water-resources-performance",
            accessed="2026-10-31",
            notes="Replaces the previous England-wide snapshot with Thames Water's own company-level per capita consumption (PCC), more granular and more relevant to Ladywell (entirely within Thames Water's supply area) than the national average - the earlier session's note that company-level data 'could not be downloaded... blocked by this environment's network egress policy' did not hold on retry; both data.gov.uk and the EA's gov.uk report pages were directly fetchable. 2025/26 figure (139.01 l/p/d) taken directly from the EA's published report tables - the England-wide average for the same year is 136.87 l/p/d, slightly lower, confirming Thames Water's own PCC genuinely runs a little above the national figure (correcting an earlier version of this indicator that implied otherwise by substituting the national figure for Lewisham's actual supplier). Earlier years (2019/20-2024/25) are Thames Water's own 'Average household - pcc' figures from the same WRMP Annual Review Data workbook used for the leakage indicator below (data.gov.uk dataset 87b59684-3da3-45cf-8881-e4727cfd1415, file 'Annual Review Historic Data- For publication 17112025.xlsx', one tab per year). The 2024/25 figure from that workbook (137.69) matches the EA's separately-published 2024/25 report (137.70) almost exactly, cross-confirming both sources. The 2025/26 figure isn't yet in that workbook (published before that year's data existed), so it's taken from the EA's standalone 2025/26 report instead.",
        ),
        geography=GeographyLevel.WATER_COMPANY,
        confidence=Confidence.HIGH,
        trend=[
            {"period": "2019/20", "value": 145.0, "note": "Environment Act 2021 baseline year (national baseline is 140 l/p/d; Thames Water's own 2019/20 figure was higher, at 145)"},
            {"period": "2020/21", "value": 152.0},
            {"period": "2021/22", "value": 145.0},
            {"period": "2022/23", "value": 140.0},
            {"period": "2023/24", "value": 138.0},
            {"period": "2024/25", "value": 137.7},
            {"period": "2025/26", "value": 139.01},
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

    leakage = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="water",
        target=Target(
            text="Halve total leakage (by volume, Ml/d) from 2017/18 levels by 2050 - a public commitment made by English and Welsh water companies in 2018, incorporated into the Environment Agency's National Framework for Water Resources (March 2020), the same long-term framework behind the per capita consumption target above.",
            source_body="Water UK industry commitment / Environment Agency National Framework for Water Resources",
            has_official_target=True
        ),
        indicator="Water leakage (% of total supply)",
        threshold=Threshold(value=None, unit=None, description="The 2050 commitment is a volume reduction (halve total leakage in Ml/d from a 2017/18 baseline), not a percentage-of-supply figure, so no single numeric threshold translates directly onto this chart."),
        snapshot=Snapshot(value=22.5, unit="% of total supply", year="2024/25"),
        status=Status.SHORTFALL,
        source=Source(
            name="Environment Agency - Water Resources Management Plan (WRMP) Annual Review Data",
            url="https://www.data.gov.uk/dataset/87b59684-3da3-45cf-8881-e4727cfd1415/wrmp-annual-review-data",
            accessed="2026-10-31",
            notes="Calculated from the Annual Review Data workbook (file 'Annual Review Historic Data- For publication 17112025.xlsx', one tab per reporting year, downloaded directly from the Environment Agency's file host linked from this data.gov.uk dataset page): Thames Water's 'Total leakage (Ml/d)' divided by its 'Distribution input (Ml/d)' (the water put into its network), x100, for each year 2005/06-2024/25 - the standard industry 'leakage as % of distribution input' measure, not a column the source publishes directly as a percentage. The 2024/25 tab publishes two variants, 'OT' (actual outturn) and 'OTDYAA' (dry-year-annual-average-adjusted forecast); 'OT' is used here to stay methodologically consistent with every earlier year, which are all reported as actual outturns rather than weather-normalised estimates.",
        ),
        geography=GeographyLevel.WATER_COMPANY,
        confidence=Confidence.HIGH,
        trend=[
            {"period": "2005/06", "value": 30.9},
            {"period": "2006/07", "value": 30.1},
            {"period": "2007/08", "value": 27.9},
            {"period": "2008/09", "value": 27.3},
            {"period": "2009/10", "value": 26.2},
            {"period": "2010/11", "value": 25.8},
            {"period": "2011/12", "value": 25.1},
            {"period": "2012/13", "value": 25.7},
            {"period": "2013/14", "value": 25.2},
            {"period": "2014/15", "value": 25.6},
            {"period": "2015/16", "value": 24.9},
            {"period": "2016/17", "value": 25.3},
            {"period": "2017/18", "value": 25.6, "note": "2017/18 - baseline year for the industry's 50%-by-2050 leakage reduction commitment"},
            {"period": "2018/19", "value": 25.3},
            {"period": "2019/20", "value": 22.6},
            {"period": "2020/21", "value": 22.8},
            {"period": "2021/22", "value": 23.4},
            {"period": "2022/23", "value": 24.2},
            {"period": "2023/24", "value": 22.7},
            {"period": "2024/25", "value": 22.5},
        ]
    )

    return [per_capita_consumption, water_stress, leakage]

def build_connectivity():
    """
    Connectivity dimension - 3 indicators matching data/lookups/dimension_data_sources.json
    ("connectivity"): broadband coverage, mobile coverage, and digital exclusion.

    This session's network egress policy blocked direct access to every primary source for
    this dimension (ofcom.org.uk, data.london.gov.uk, ons.gov.uk, trustforlondon.org.uk, and
    essentially all other government/aggregator domains all returned connection-level
    rejections, not just occasional 403s - confirmed via repeated curl/WebFetch attempts
    against multiple hosts including a plain sanity check against wikipedia.org). Only
    web search (which appears to run outside this restriction) was available, so figures
    below are the most specific, real, dated numbers that could be surfaced that way, with
    confidence downgraded accordingly and every gap stated explicitly rather than papered
    over - see per-indicator source notes for exactly what could and couldn't be confirmed.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    broadband = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="connectivity",
        indicator="Full fibre broadband coverage (% of premises)",
        snapshot=Snapshot(value=81.0, unit="%", year=2026, date="17 July 2026"),
        source=Source(
            name="thinkbroadband Local Broadband Statistics (Lewisham), derived from Ofcom's postcode-level open coverage data",
            url="https://labs.thinkbroadband.com/local/lewisham,E09000023",
            accessed="2026-07-18",
            notes="80.96% of premises in Lewisham (rounded to 81%) have full-fibre (FTTP) access as of 17 July 2026, per thinkbroadband's local broadband statistics for Lewisham (E09000023) - an independent aggregator that builds its local-authority figures from Ofcom's own postcode-level open coverage dataset rather than running its own survey. This replaces the UK-wide 82% figure previously shown here: a genuine Lewisham-specific figure is available and is preferred over the national one. Ofcom's Connected Nations data is also published as a standalone local-authority indicator on ONS's 'Explore local statistics' service ('Gigabit-capable broadband', Ofcom-sourced, January 2026 vintage), confirming this granularity is officially available, though its interactive chart doesn't expose a plain-text figure; thinkbroadband's number is used as the concrete Lewisham figure instead. No ward-level (Ladywell-specific) breakdown exists - Ofcom and its aggregators publish at local-authority and postcode level, not electoral ward - so borough-level is the most granular figure available. Gigabit-capable coverage (a broader measure that also includes Virgin Media's DOCSIS3.1 cable network) is higher, at 91.57% of Lewisham premises. No historical Lewisham-specific series exists - thinkbroadband's figure is a live snapshot, not an archive - so no trend chart is shown here; nationally, UK-wide full-fibre coverage grew from 10% of premises in 2019 to 82% by January 2026, and Lewisham's local figure sits close to that national trajectory.",
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="UK Government's Project Gigabit programme has an ambition of nationwide gigabit-capable coverage; an earlier 85%-by-2025 gigabit-capable milestone was already exceeded by July 2025 (88% in England). The government's exact current wording/date for its longer-range target isn't confirmed here, so no specific target figure is asserted rather than risk citing one imprecisely."
    )

    mobile = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="connectivity",
        indicator="5G mobile coverage (% of landmass, at least one operator)",
        snapshot=Snapshot(value=99.8, unit="% of landmass", year=2026, date="January 2026"),
        source=Source(
            name="Ofcom Connected Nations (Spring 2026 update), via ONS 'Explore local statistics' - 5G coverage (Lewisham)",
            url="https://www.ons.gov.uk/explore-local-statistics/areas/E09000023-lewisham/indicators",
            accessed="2026-08-18",
            notes="Lewisham's own figure is now available and replaces the England-wide 81% previously shown here: 99.8% of Lewisham's geographic area has outdoor 5G signal from at least one mobile network operator (Ofcom's -110dBm 'high confidence' threshold), per Ofcom Connected Nations data as of January 2026, published via ONS's 'Explore local statistics' local-authority indicator ('5G coverage', E09000023). This is the same metric definition (outdoor, at least one operator, % of geographic area) as the England figure it replaces, so the two remain directly comparable. This session's network policy still blocks a direct fetch of the live ONS/Ofcom pages (as it did previously, when this same borough-level breakdown was flagged as existing but unreachable), so the figure is taken from search-engine result snippets of those pages rather than a direct read of the page itself; it's independently corroborated by a third-party mobile-coverage aggregator (connection-technologies.co.uk) citing the same 99.8% figure and Spring-2026-update vintage, which is why confidence is kept at 'medium' rather than 'high'. The near-total figure fits the pattern already noted elsewhere in this entry: Lewisham is fully urban and built-up, so its whole area sits within dense coverage footprints (97-99% indoor urban 4G vs 77-85% rural, per the same Ofcom report), unlike England's landmass figure (81% in July 2025, up from 76% in 2024), which is dragged down by rural not-spots - England's national trend is kept below as context, not a genuine Lewisham time series, since no historical Lewisham-specific series was found. No ward-level (Ladywell-specific) breakdown exists - Ofcom and ONS publish at local-authority level, not electoral ward - so borough is the most granular figure available, same as the full-fibre indicator above.",
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government numeric target for 5G/4G coverage percentage was confirmed and verified in this session.",
    )

    digital_exclusion = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="connectivity",
        indicator="Digital exclusion risk score (0-10 scale)",
        snapshot=Snapshot(value=2.5, unit="out of 10", year=2021, date="DERI v1.5"),
        source=Source(
            name="Digital Exclusion Risk Index (DERI) v1.5 - Greater Manchester Combined Authority",
            url="https://github.com/GreaterManchesterODA/Digital-Exclusion-Risk-Index",
            accessed="2026-07-18",
            notes="The GLA/LOTI 'Mapping Digital Exclusion' dataset previously cited as the intended source for this indicator is genuinely limited to its five pilot boroughs (Barnet, Brent, Kensington & Chelsea, Southwark, Westminster) - Lewisham isn't covered, and no Lewisham-specific output has been published from it, confirmed via the London Datastore and LOTI's own project pages. GMCA's Digital Exclusion Risk Index (DERI) does cover every LSOA in England, Scotland and Wales, so Ladywell's 7 constituent LSOAs (E01003273/274/275/276/278/279/291, confirmed via ONS's official LSOA-to-ward best-fit lookup) are all scored. 2.5 is the population-weighted average of those 7 LSOAs' individual DERI scores, using DERI's Great-Britain-normalised variant (England IMD basis) - the only one of DERI's three normalisation options (local authority / nation / Great Britain) that's comparable across different areas, per GMCA's own methodology guide. Scores range from 2.06 to 3.18 across the 7 LSOAs, i.e. genuine within-ward variation rather than a flat borough figure. Ladywell's score sits toward the low end of the 0-10 scale, consistent with Trust for London's own commentary that 'much of London, due to its relatively young demographic and good broadband access, is in the lower range' nationally. Caveat: DERI is a composite built from 11 proxy indicators (deprivation, demography, broadband access) across three domains, not a direct survey of who's actually offline, and several of its components are dated - 'no qualifications', 'social grade' and 'day-to-day activities limited' all come from Census 2011, while IMD is 2019-based and broadband/unemployment/pension-credit data is from 2019-2021. GMCA's in-progress v2.0 rebuild moves to 2021 Census data but has not yet published a scored output, and the repo's latest release (v1.6, November 2022) publishes no LSOA-level scores file, so v1.5 remains the latest version with usable LSOA scores. The previous indicator here - GLA's 2022 estimate of ~270,000 Londoners completely offline (London-wide, not Lewisham-specific) - is kept as descriptive context below rather than as the snapshot, since it measures something DERI doesn't (an absolute headcount rather than a relative risk score).",
        ),
        geography=GeographyLevel.LSOA_AGGREGATED,
        confidence=Confidence.MEDIUM,
        target_text="No official target exists for this composite risk index - it's designed to identify relative risk, not track progress against a threshold. Lower scores indicate lower risk of digital exclusion."
    )

    return [broadband, mobile, digital_exclusion]

def build_community():
    """
    Community dimension - 3 indicators. DCMS replaced the Community Life Survey (CLS) with
    the Community and Engagement Survey (CES) in October 2025. CES's Community-pathway
    tables are produced with the CLS methodology "to allow for robust comparability with the
    CLS time-series" (CES data tables, 'Methodological Alignment' note), so CES 2025/26 points
    continue the CLS England series directly. Local-authority estimates exist from 2023/24:
    DCMS/MHCLG boosted the CLS sample in 2023/24 and 2024/25 (CLS 2024/25 tables, Note 20) and
    CES again in 2025/26. Loneliness and belonging therefore show two series each - England
    (2018/19 onward, the CLS's own published time series) and Lewisham (2023/24 onward).
    Support networks has no LA breakdown in any year, so its local series is the ITL2
    sub-region 'Inner London - East', which includes Lewisham. Trend points carry a `series`
    label that app.js draws as a separate, labelled line. No official GLA or UK Government
    target exists for any of the three, so all three are descriptive_only.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    england_note = "CLS time series table (CLS 2024/25 annual data tables, 'Timeseries' sheet)"
    loneliness = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="community",
        indicator="% adults reported feeling lonely often or always",
        snapshot=Snapshot(value=8, unit="%", year="2025/26"),
        source=Source(
            name="Community and Engagement Survey 2025/26 - Loneliness (Table C3, by local authority); Community Life Survey 2024/25 annual data tables (Timeseries, Table A1c)",
            url="https://www.gov.uk/government/statistics/community-and-engagement-survey-202526-loneliness",
            accessed="2026-11-01",
            notes=(
                "8.0% of Lewisham adults reported feeling lonely 'often or always' in 2025/26 (95% CI 5.9-10.8%, 61 "
                "respondents, unweighted base 869; CES 2025/26 Table C3, LAD25 E09000023). Lewisham figures exist for "
                "two earlier years from the CLS local-authority boost (CLS 2024/25 tables, Table A1c and Note 20): 6.3% "
                "in 2023/24 (95% CI 4.4-8.8%) and 7.4% in 2024/25 (95% CI 5.3-10.2%). The survey's own significance test "
                "marks both year-on-year moves as 'No Change' - the confidence intervals overlap, so the apparent rise is "
                "within sampling noise. England series (CLS Timeseries sheet, then CES Table C1): 6.1% (2018/19), 6.4% "
                "(2019/20), 6.5% (2020/21), 6.2% (2021/22), no survey in 2022/23, 7.1% (2023/24), 6.6% (2024/25), 6.7% "
                "(2025/26). The CLS time series starts in 2018/19. Demographic breakdown (CES Table C2, England-wide, not "
                "Lewisham-specific): loneliness runs several times higher among disabled adults (14%, vs 3% non-disabled) "
                "and residents of England's most deprived IMD decile (11%, vs 4% least deprived), and is highest among "
                "16-24s (9%, tapering to 4% at 65-74), LGB+ people (11-14% vs 6% heterosexual), and some minority ethnic "
                "groups (10-16% vs 6% White British). Earlier versions of this page said 2025/26 was the first year with a "
                "Lewisham figure; that was wrong - the CLS published Lewisham estimates for 2023/24 and 2024/25."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        trend=[
            {"period": "2018/19", "value": 6.1, "series": "England", "note": england_note},
            {"period": "2019/20", "value": 6.4, "series": "England"},
            {"period": "2020/21", "value": 6.5, "series": "England"},
            {"period": "2021/22", "value": 6.2, "series": "England"},
            {"period": "2023/24", "value": 7.1, "series": "England", "note": "No survey in 2022/23"},
            {"period": "2024/25", "value": 6.6, "series": "England"},
            {"period": "2025/26", "value": 6.7, "series": "England", "note": "CES 2025/26 Table C1 (CLS methodology)"},
            {"period": "2023/24", "value": 6.3, "series": "Lewisham", "note": "CLS 2024/25 Table A1c; 95% CI 4.4-8.8%"},
            {"period": "2024/25", "value": 7.4, "series": "Lewisham", "note": "CLS 2024/25 Table A1c; 95% CI 5.3-10.2%"},
            {"period": "2025/26", "value": 8.0, "series": "Lewisham", "note": "CES 2025/26 Table C3; 95% CI 5.9-10.8%"},
        ]
    )

    belonging = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="community",
        indicator="% adults felt strongly belonged to their neighbourhood",
        snapshot=Snapshot(value=54, unit="%", year="2025/26"),
        source=Source(
            name="Community and Engagement Survey 2025/26 - Neighbourhood and community (Tables D1-D3); Community Life Survey 2024/25 annual data tables (Timeseries, Table B1c)",
            url="https://www.gov.uk/government/statistics/community-and-engagement-survey-202526-neighbourhood",
            accessed="2026-11-01",
            notes=(
                "53.8% of Lewisham adults felt they belonged 'very strongly' or 'fairly strongly' to their immediate "
                "neighbourhood in 2025/26 (95% CI 49.5-58.0%, 458 of 797 respondents; CES 2025/26 Table D3, LAD25 "
                "E09000023), shown rounded to 54%. Earlier Lewisham estimates from the CLS local-authority boost (CLS "
                "2024/25 Table B1c): 56.8% in 2023/24 (95% CI 51.7-61.7%) and 56.6% in 2024/25 (95% CI 51.7-61.4%). The "
                "survey's own test marks both year-on-year moves as 'No Change'. Lewisham sits below both London (57.9% in "
                "2025/26, 59.0% in 2024/25; CES Table D2, ITL1 row) and England (61.2% in 2025/26; Table D1). England "
                "series (CLS Timeseries sheet, then CES Table D1): 62.1% (2018/19), 62.6% (2019/20), 64.6% (2020/21, "
                "pandemic-era high), 62.5% (2021/22), no survey in 2022/23, 61.1% (2023/24), 62.1% (2024/25), 61.2% "
                "(2025/26). CES Community-pathway tables use the CLS methodology for comparability with the CLS time "
                "series, so the 2025/26 points continue the same series."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        trend=[
            {"period": "2018/19", "value": 62.1, "series": "England", "note": england_note},
            {"period": "2019/20", "value": 62.6, "series": "England"},
            {"period": "2020/21", "value": 64.6, "series": "England", "note": "Pandemic-era high"},
            {"period": "2021/22", "value": 62.5, "series": "England"},
            {"period": "2023/24", "value": 61.1, "series": "England", "note": "No survey in 2022/23"},
            {"period": "2024/25", "value": 62.1, "series": "England"},
            {"period": "2025/26", "value": 61.2, "series": "England", "note": "CES 2025/26 Table D1 (CLS methodology)"},
            {"period": "2023/24", "value": 56.8, "series": "Lewisham", "note": "CLS 2024/25 Table B1c; 95% CI 51.7-61.7%"},
            {"period": "2024/25", "value": 56.6, "series": "Lewisham", "note": "CLS 2024/25 Table B1c; 95% CI 51.7-61.4%"},
            {"period": "2025/26", "value": 53.8, "series": "Lewisham", "note": "CES 2025/26 Table D3; 95% CI 49.5-58.0%"},
        ]
    )

    support_networks = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="community",
        indicator="% adults agreed that if they needed help, there would be people there for them",
        snapshot=Snapshot(value=95, unit="%", year="2025/26"),
        source=Source(
            name="Community and Engagement Survey 2025/26 - Support Networks (Tables F12-F13); Community Life Survey 2024/25 annual data tables (Timeseries)",
            url="https://www.gov.uk/government/statistics/community-and-engagement-survey-202526-support-networks",
            accessed="2026-11-01",
            notes=(
                "95.2% of adults in the ITL2 sub-region 'Inner London - East' (Hackney, Haringey, Islington, Lambeth, "
                "Lewisham, Newham, Southwark, Tower Hamlets) agreed that if they needed help there are people who would "
                "be there for them in 2025/26 (95% CI 93.8-96.3%, 1,661 respondents; CES Table F13), up from 93.4% in "
                "2024/25 (95% CI 91.6-94.8%) - marked 'No Change' by the survey's own test. This question is not "
                "published at local-authority level in any year, so the sub-region is the most granular figure available. "
                "London (ITL1) ran 94.7% in 2025/26 and 92.9% in 2024/25. England series (CLS Timeseries sheet, then CES "
                "Table F12): 95.2% (2018/19), 95.2% (2019/20), 95.3% (2020/21), 95.2% (2021/22), no survey in 2022/23, "
                "94.3% (2023/24), 94.3% (2024/25), 95.9% (2025/26) - England's 2025/26 rise is statistically significant. "
                "These questions were asked online only (CES Note 6), so results reflect the online-responding population."
            )
        ),
        geography=GeographyLevel.LONDON_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2018/19", "value": 95.2, "series": "England", "note": england_note},
            {"period": "2019/20", "value": 95.2, "series": "England"},
            {"period": "2020/21", "value": 95.3, "series": "England"},
            {"period": "2021/22", "value": 95.2, "series": "England"},
            {"period": "2023/24", "value": 94.3, "series": "England", "note": "No survey in 2022/23"},
            {"period": "2024/25", "value": 94.3, "series": "England"},
            {"period": "2025/26", "value": 95.9, "series": "England", "note": "CES 2025/26 Table F12 (CLS methodology)"},
            {"period": "2024/25", "value": 93.4, "series": "Inner London East", "note": "CES 2025/26 Table F13; 95% CI 91.6-94.8%"},
            {"period": "2025/26", "value": 95.2, "series": "Inner London East", "note": "CES 2025/26 Table F13; 95% CI 93.8-96.3%"},
        ]
    )

    return [loneliness, belonging, support_networks]

def build_culture_dimensions():
    """
    Culture dimension - 3 indicators matching data/lookups/dimension_data_sources.json
    ("culture"). This session's WebFetch and curl tools were both blocked by the
    environment's network egress policy for every external host tested (including neutral
    control domains), so all research here was done via web-search snippets only - no
    dataset, PDF, or webpage could be fetched and parsed directly. That materially limited
    what could be extracted for the venue-density indicator in particular; see its notes for
    exactly what was and wasn't recoverable.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    venue_density = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="culture",
        indicator="# of cultural venue per 1,000 population",
        snapshot=Snapshot(value=0.32, unit="venues per 1,000 residents", year=2026),
        source=Source(
            name="GLA Cultural Infrastructure Data 2025 and 2026 (London Datastore)",
            url="https://data.london.gov.uk/dataset/cultural-infrastructure-data-2025-and-2026-2rj5o",
            accessed="2026-11-01",
            notes=(
                "Counted directly from the GLA's long-list file (GLA_Cultural_Infrastructure_Map_data_2026_all.xlsx, "
                "sheet CIM_2026_long_all_v3, 5,202 rows covering both cultural production and consumption spaces), "
                "filtered on the dataset's own ward column = 'Ladywell' and status = 'Open'. 5 open venues: Ayyappaa "
                "Jewellery Workshop (jewellery design), Chemist Gallery (commercial gallery), South London Dance Academy "
                "Studios (dance rehearsal), Marcus Hall Props (prop and costume making) and The Fox and Firkin (music "
                "venue). A further 3 Ladywell entries are listed as Closed (PLACE/Ladywell coworking space, Taco Queer "
                "music venue, V22 Ladywell Bridge artist workspace) and are excluded. Denominator: Census 2021 usual "
                "residents for Ladywell ward (E05013725) = 15,576 (Nomis, NM_2021_1). 5 / 15,576 x 1,000 = 0.32. "
                "Comparators computed the same way from the same file: Lewisham 157 open venues / 300,553 residents = "
                "0.52 per 1,000; London 4,629 / 8,799,728 = 0.53 per 1,000 - so Ladywell has around 60% of the borough "
                "and London density. Within Lewisham venues cluster in Deptford (42) and Brockley (20). Caveats: a "
                "single-ward count this small moves a lot with one opening or closure; the long list includes every "
                "typology the GLA audits (archives, libraries, workspaces and commercial galleries as well as theatres "
                "and music venues), all counted equally; ward assignment is the GLA's own. The shorter "
                "CIM_data_2026_LDS file (1,557 rows) covers only the production typologies refreshed in 2025-26 and "
                "lists 3 Ladywell sites, so the long list is used here as the complete inventory."
            )
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    arts_funding = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="culture",
        indicator="£ local authority funding in art & culture",
        snapshot=Snapshot(value=386000, unit="£, 3-year total", year="2022-2025"),
        source=Source(
            name="Equity Local Government Arts Funding Tracker (Autonomy Institute analysis for Equity) / Lewisham Council Main Grants Programme papers",
            url="https://www.equity.org.uk/campaigns-policy/elections-2026/local-government-arts-funding-tracker",
            accessed="2026-07-18",
            notes=(
                "equity.org.uk could not be fetched this session (blocked by the environment's "
                "network egress policy, like every other external host tried), so the Lewisham "
                "figure was sourced directly from the council's own committee papers instead: "
                "Lewisham's Arts & Culture Fund allocated £386,000 over the 2022-25 grant cycle - "
                "£150,000/year to a single 'cultural anchor' organisation (The Albany) plus roughly "
                "£236,000 split across 8 further organisations (including Entelechy Arts, Irie!, "
                "LEAN, LYT, Midi Music, Heart n Soul, Second Wave and the Migration Museum) in "
                "grants of up to £30,000 each. Source: 'Extension of the Main Grants Programme, "
                "Appendix 1 - Main Grants 2022-25' (lewisham.moderngov.co.uk, document ID s113598). "
                "Note this is Lewisham's discretionary arts & culture grants stream specifically, "
                "not the council's full culture/library service net budget line, which is a "
                "different (larger) accounting figure this session could not obtain - so it "
                "understates total local authority arts & culture spend. For national context "
                "(via press coverage of the Equity/Autonomy Institute tracker itself, which "
                "compiles net arts spend for 317 English councils 2010/11-2024/25): average "
                "English council arts spending per resident fell from £18.67/year in 2010/11 to "
                "£6.47/year in 2024/25, a 61% real-terms fall (£660m/year less across England); at "
                "least 8 of the 136 councils with seats up for election in May 2026 (Lewisham's "
                "council term is among the cycles due for all-out election in 2026) now report zero "
                "net arts spend. No comparable multi-year trend for Lewisham specifically could be "
                "confirmed this session, so none is given rather than an inferred one."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    active_participation = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="culture",
        indicator="% of people aged 16+ who engaged with the arts in the last 12 months",
        snapshot=Snapshot(value=88.5, unit="%", year="2025/26"),
        source=Source(
            name="DCMS Community and Engagement Survey 2025/26 - Arts (data tables I7 and I8); DCMS Participation Survey annual reports 2022/23-2024/25",
            url="https://www.gov.uk/government/statistics/community-and-engagement-survey-202526-arts",
            accessed="2026-11-01",
            notes=(
                "Snapshot: 88.5% of Lewisham residents aged 16+ engaged with the arts physically or digitally at least "
                "once in the last 12 months in 2025/26 (95% CI 85.7-90.8%, 817 of 910 respondents) - CES 2025/26 arts "
                "data tables, Table I8 (by local authority, LAD25 E09000023). That is above both England (84.4%, Table I7) "
                "and London (83.2%, Table I7 ITL1 row) for the same year. 2025/26 is the first year with a local-authority "
                "figure: DCMS and MHCLG boosted the sample to produce LA estimates (Note 9), so no earlier Lewisham figure "
                "exists. England trend: Participation Survey annual reports give 88% (2021/22, first year, survey started "
                "Oct 2021), 90% (2022/23), 91.4% (2023/24) and 90.6% (2024/25); the CES 2025/26 arts report's own time "
                "series quotes 85% for 2021/22, which differs from the 88% in the Participation Survey 2022/23 report - the "
                "originally published Participation Survey figures are used. Series break: the 2025/26 England figure "
                "(84.4%) comes from the new CES, and DCMS states it is 'lower than anticipated' and that it is 'unclear "
                "whether this is a true decrease... or due to methodological differences between the CES and "
                "Participation Survey, such as differences in question placement' (CES arts report, footnote 3). It is "
                "therefore plotted as a separate series rather than joined to the Participation Survey line. The 2025/26 "
                "estimates combine Participation Survey responses (Apr-Sep 2025) with the much larger CES sample (Oct "
                "2025-Mar 2026), so they are weighted towards the CES half (footnote 1)."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2021/22", "value": 88.0, "series": "England", "note": "Participation Survey, first year (started Oct 2021)"},
            {"period": "2022/23", "value": 90.0, "series": "England", "note": "Participation Survey"},
            {"period": "2023/24", "value": 91.4, "series": "England", "note": "Participation Survey; peak year"},
            {"period": "2024/25", "value": 90.6, "series": "England", "note": "Participation Survey"},
            {"period": "2025/26", "value": 84.4, "series": "England, new survey", "note": "Community and Engagement Survey; DCMS flags the fall may be partly methodological"},
            {"period": "2025/26", "value": 88.5, "series": "Lewisham", "note": "CES 2025/26 Table I8; 95% CI 85.7-90.8%; first local-authority figure"},
        ]
    )

    return [venue_density, arts_funding, active_participation]

def build_mobility_dimensions():
    """
    Mobility dimension - 2 indicators matching data/lookups/dimension_data_sources.json.

    PTAL indicator: TfL does not publish a single official "ward average" PTAL - PTAL is
    calculated point-by-point (walk time + service frequency to nearest stops) via TfL's
    WebCAT tool and GIS layer, not aggregated to ward or borough boundaries. Ladywell is one
    of the few indicators across all 15 dimensions with genuine ward-level granularity
    available in principle, but no clean single "ward figure" is published by TfL itself -
    real point-level PTAL assessments from Lewisham Council planning applications within the
    ward are used instead, honestly presented as a range rather than a fabricated average.

    Sustainable mode share: Healthy Streets Scorecard borough-level figure, drawn from TfL's
    London Travel Demand Survey (LTDS), with a real Mayor's Transport Strategy / Lewisham LIP3
    target of 80% by 2041.

    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    ptal = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="mobility",
        indicator="Public Transport Accessibility Levels",
        snapshot=Snapshot(value="4 to 6 (Good to Excellent)", unit="PTAL band, TfL 0-6b scale", year=2025),
        source=Source(
            name="TfL Public Transport Accessibility Levels (PTAL) / WebCAT - GIS Open Data Hub",
            url="https://gis-tfl.opendata.arcgis.com/search?q=PTAL",
            accessed="2026-07-18",
            notes="TfL does not publish a single official 'ward average' PTAL figure - PTAL is a point-by-point accessibility calculation (walk time and service frequency to the nearest public transport stops), surfaced via TfL's WebCAT tool and this GIS layer, not aggregated to ward or borough geography. Genuine point-level PTAL values within Ladywell were instead sourced from real Lewisham Council planning application assessments, which cite TfL's PTAL methodology directly: 31 Gillian Street (application DC/25/139782, Sept 2025, https://lewisham.moderngov.co.uk/mgAi.aspx?ID=37128) was assessed at PTAL 4 ('good'), while the Ladywell Playtower site on Ladywell Road, immediately by Ladywell station (application DC/22/126038, https://lewisham.moderngov.co.uk/mgAi.aspx?ID=32690), was assessed at PTAL 6 ('excellent'). Lewisham's own Local Plan evidence base describes the borough's northern, western and central neighbourhoods - which include Ladywell, served directly by Ladywell mainline station - as its best-connected, with southern wards less well served. TfL refreshed its PTAL toolkit to 'WebCAT 3.0' in 2025, updating scores from a 2015 baseline (with an interim 2019 borough-level PDF release for Lewisham) to reflect network changes since, including the Elizabeth line. No numeric trend is included: PTAL is a periodic recalculation exercise tied to toolkit versions (2015, 2019, 2025), not an annual survey, and no single ward-wide figure exists to trend consistently across those versions."
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator - PTAL is a descriptive accessibility measure, not a policy target."
    )

    mode_share = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="mobility",
        target=Target(
            text="80% of all trips in London to be made by sustainable modes (walking, cycling, public transport) by 2041, up from a 63% London-wide baseline in 2015.",
            source_body="Mayor's Transport Strategy (GLA, 2018), adopted locally in Lewisham's own Transport Strategy and Local Implementation Plan 2019-2041 (LIP3)",
            has_official_target=True
        ),
        indicator="% of trips by sustainable modes",
        threshold=Threshold(value=80.0, unit="%", description="Mayor's Transport Strategy target: 80% of all trips made by sustainable modes (walking, cycling, public transport) by 2041."),
        snapshot=Snapshot(value=72.8, unit="%", year=2024),
        status=Status.SHORTFALL,
        source=Source(
            name="Healthy Streets Scorecard - Results: Outcome Indicators 2024 (Lewisham)",
            url="https://www.healthystreetsscorecard.london/results_2024/results_outcome_indicators_2024/#ResultsModeshare",
            accessed="2026-07-18",
            notes="Underlying source: TfL's London Travel Demand Survey (LTDS), a continuous household survey of ~8,000 households/year. Lewisham's combined sustainable mode share (walking + cycling + public transport) was 72.8% in the Healthy Streets Scorecard's 2024 results, down from 75.6% the prior round but still well above the 66.0% recorded in the Scorecard's first (2019) year. London-wide comparator over the same rounds: 67.6% in 2024, up from 65.6% (used for 2021-2023) and a 63% baseline in 2015 - Lewisham currently runs several points above the London average despite ranking near the bottom of Inner London (only Wandsworth and Newham score lower among Inner London's 14 boroughs). The most recent Healthy Streets Scorecard (2026, reported July 2026 by Salamander News, a Lewisham community news site) put mode share at approximately 72%, a further ~1-point fall, with Lewisham last in Inner London for the third year running. Caution: the Scorecard's methodology changed between rounds - the 2024 figure used a single year of LTDS data, while the 2025 round moved to a two-year rolling average (2022/23-2023/24) - so year-to-year movements should be read with that in mind, per the Scorecard's own published small-sample-size caveat for borough-level LTDS estimates."
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2019", "value": 66.0, "note": "Healthy Streets Scorecard's first published year"},
            {"period": "2023", "value": 75.6, "note": "Prior round's figure, cited in the 2024 results as the year-on-year comparison point"},
            {"period": "2024", "value": 72.8},
            {"period": "2026", "value": 72.0, "note": "Approximate - reported by Salamander News as 'fell by a single percentage point to 72%'; exact decimal not independently confirmed, and methodology shifted to a multi-year rolling LTDS average in the interim"},
        ]
    )

    return [ptal, mode_share]

def build_energy():
    """
    Energy dimension - 2 indicators matching data/lookups/dimension_data_sources.json
    ("energy"): EPC Band C-or-above coverage and fuel poverty (LILEE metric). No genuinely
    ward-level government dataset exists for either indicator on a recurring basis - EPC
    coverage uses the Lewisham Observatory's 2022 Ward Profile (a real ward-level breakdown
    of EPC register data, cross-referenced against ONS's own regional figures), and fuel
    poverty uses DESNZ's borough-level sub-regional statistics. See source notes for the full
    chain and for what could not be independently re-verified this session: this environment's
    network egress policy blocked direct access to ons.gov.uk/gov.uk/data.gov.uk to download
    and parse the underlying spreadsheets (unlike the direct file access used for prior
    dimensions), so figures below are drawn from cross-checked secondary reporting of the same
    underlying official releases, not directly parsed downloads.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    epc_band_c = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="energy",
        target=Target(
            text="% properties with EPC Band C or above target: London average (56%)",
            source_body="ONS Energy Performance Certificate statistics - London regional benchmark",
            has_official_target=True
        ),
        indicator="% properties with EPC Band C or above",
        threshold=Threshold(value=56.0, unit="%", description="London average % of dwellings with a valid EPC rated Band C or above, records up to financial year ending March 2024"),
        snapshot=Snapshot(value=43.0, unit="%", year=2022),
        status=Status.SHORTFALL,
        source=Source(
            name="Lewisham Observatory - Ladywell Ward Profile (2022), cross-referenced with ONS 'Energy Performance Certificate (EPC) Band C or above, England and Wales'",
            url="https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/energyperformancecertificateepcbandcoraboveenglandandwales",
            accessed="2026-07-18",
            notes=(
                "43% of assessed homes in Ladywell ward specifically held an EPC of A, B or C in the Lewisham Observatory's 2022 Ward Profile "
                "(published May 2022: https://www.observatory.lewisham.gov.uk/wp-content/uploads/2022/05/Ladywell-digital.pdf) - genuine ward-level "
                "data, not a borough figure applied uniformly. The same profile round showed a wide spread across Lewisham's other wards, from 37% "
                "(Hither Green) and 38% (Lee Green) up to 66% (Deptford) and 78% (Lewisham Central), so Ladywell sits toward the less energy-efficient "
                "end of the borough, not at its average. ONS's own EPC Band C-or-above dataset (dimension_data_sources.json's designated source for "
                "this indicator) only publishes at local-authority level, not ward, and this environment's network egress policy blocked downloading "
                "and parsing that spreadsheet directly this session for a clean Lewisham-borough figure or historical series - the London-region "
                "comparator used as the threshold here (56% Band C or above, records to FYE March 2024) and its accompanying median-EPC-score context "
                "(England: 68/band D rising to 69/band C between the FYE2024 and FYE2025 ONS releases; London: 70/band C in both) come from ONS's own "
                "published 'Energy efficiency of housing in England and Wales' annual articles. A separate live EPC-register aggregator "
                "(theepcregister.co.uk / greatbritishenergy.com, accessed 2026-07-18) puts Lewisham borough-wide at approximately 52% Band C or above "
                "currently, consistent with Ladywell sitting below its borough's own average. No multi-year Ladywell-specific series exists - Ward "
                "Profiles are a point-in-time exercise last run by Lewisham Observatory in 2022 - so this is a single data point, not a trend; "
                "confidence set to medium given the value's real, dated, genuinely ward-specific origin but the lack of a time series."
            )
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM
    )

    fuel_poverty = create_targeted_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="energy",
        target=Target(
            text="% households in fuel poverty (LILEE) target: England average (13.1% in 2022, the same data year as Lewisham's own most recently confirmed figure)",
            source_body="DESNZ Annual & Sub-regional Fuel Poverty Statistics - England benchmark",
            has_official_target=True
        ),
        indicator="% households in fuel poverty",
        threshold=Threshold(value=13.1, unit="%", description="England average fuel poverty rate (LILEE metric), 2022 data year"),
        snapshot=Snapshot(value=13.8, unit="%", year=2022),
        status=Status.SHORTFALL,
        source=Source(
            name="DESNZ (formerly BEIS) - Sub-regional Fuel Poverty Statistics",
            url="https://www.data.gov.uk/dataset/f3009590-2bc9-40d9-8dc3-571e6fddae45/fuel_poverty_sub-regional_statistics",
            accessed="2026-07-18",
            notes=(
                "13.8% of Lewisham households (17,700) were in fuel poverty on the Low Income Low Energy Efficiency (LILEE) metric in the 2022 data "
                "year, published in DESNZ's 'Sub-regional fuel poverty in England, 2024 report (2022 data)' - above England's 2022 average of 13.1% "
                "for the same year. In the earlier 2020 data year (BEIS 'Sub-regional fuel poverty, 2022 report (2020 data)', reported by "
                "Eastlondonlines, Nov 2022), Lewisham was 14.1% and the worst-performing inner-London borough (4th worst across all of London). Both "
                "years use the LILEE metric (adopted 2021), not the older LIHC methodology, so they're directly comparable to each other. England's "
                "national LILEE average has continued falling since (11.4% in 2023, 9.9% in 2024), and DESNZ published a newer local-authority-level "
                "release covering 2024 data on 14 May 2026 ('Sub-regional fuel poverty data 2026 (2024 data)'), but this environment's network egress "
                "policy blocked direct access to gov.uk/data.gov.uk to download that spreadsheet this session, and repeated searches for Lewisham's "
                "specific 2024-data figure kept returning the same cached 2022-data figure (13.8%/17,700 households, paired with the 13.1% England "
                "comparator) regardless of which release year was queried - so a 2024-data figure could not be independently confirmed and is "
                "deliberately not included below rather than guessed. Lewisham's own 2023-24 Annual Public Health Report additionally notes fuel "
                "poverty exceeding 23% in some neighbourhoods and 20% in seven LSOAs - i.e. meaningful variation within the borough above this "
                "13.8% average."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        trend=[
            {"period": "2020", "value": 14.1, "note": "BEIS sub-regional fuel poverty, 2022 report (2020 data); worst inner-London borough that year"},
            {"period": "2022", "value": 13.8, "note": "DESNZ sub-regional fuel poverty, 2024 report (2022 data); England average 13.1% same year"},
        ]
    )

    return [epc_band_c, fuel_poverty]

def build_peace_justice():
    """
    Peace & Justice dimension - 2 indicators (crime rate; IMD Crime domain deprivation).

    IMPORTANT PROVENANCE NOTE (2026-07-18 build): the intended primary sources for both
    indicators - MPS Recorded Crime: Geographic Breakdown (data.london.gov.uk, genuine
    ward-level monthly crime counts for Ladywell) and Trust for London's Crime-domain-specific
    IMD 2025 page (trustforlondon.org.uk) - could NOT be downloaded/parsed this session due to
    a sustained outbound-network access failure in this environment (confirmed via repeated
    curl/fetch attempts against these hosts AND neutral control hosts like example.com and
    en.wikipedia.org, all returning connection failures across a multi-hour window). Per
    DIMENSION_PAGE_SPECIFICATION.md's hard rule against fabricating data, both indicators below
    use the best real, sourced figures locatable via web search of secondary aggregators built
    on the same underlying MPS/MHCLG datasets, at Confidence.MEDIUM/LOW with the specific
    limitation spelled out in each Source.notes. Both should be revisited to pull the true
    ward-level MPS figure and the true Crime-domain LSOA decile once direct source access is
    restored - see notes below for exactly what's missing and where to get it.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    crime_rate = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="peace_justice",
        indicator="Crime rate per 1,000 population",
        snapshot=Snapshot(value=93.0, unit="per 1,000 population", year="2025/26", date="12 months to ~Feb 2026"),
        source=Source(
            name="MPS recorded crime data (Lewisham borough-wide), via CrimeRate.co.uk and homenicom.co.uk aggregation of Metropolitan Police statistics",
            url="https://homenicom.co.uk/area/lewisham/crime-rate",
            accessed="2026-07-18",
            notes=(
                "Lewisham borough-wide recorded crime rate. crimerate.co.uk reports ~93 per 1,000 "
                "population for the 12 months to ~Feb 2026 (vs London's 82 per 1,000 on a "
                "daytime-population basis - not a like-for-like comparison, included here for "
                "directional context only); homenicom.co.uk separately reports 94.4 per 1,000 to "
                "September 2025, explicitly attributed to 'official Metropolitan Police statistics'. "
                "A third aggregator (scos.co.uk) reports a notably higher 119.4 per 1,000 for 2025, "
                "likely reflecting a different scope/population base and treated as an outlier, not "
                "used. PRIMARY SOURCE NOT YET DIRECTLY QUERIED: the MPS Recorded Crime: Geographic "
                "Breakdown dataset (data.london.gov.uk/dataset/mps-recorded-crime-geographic-breakdown-exy3m) "
                "publishes genuine ward-level monthly crime counts for Ladywell specifically (by Home "
                "Office offence category, back to 2008 for historic categories / 2019 for current "
                "ones) - a future update should download it directly and divide Ladywell's 12-month "
                "total by Ladywell's ONS/Census population to get a true ward-level rate, rather than "
                "this borough-wide figure. This session could not download/parse it due to a sustained "
                "network access failure. Partial ward-level context found via search: Ladywell recorded "
                "192 violence-and-sexual-offence incidents in the 12 months to March 2026 (unchanged "
                "from 2025), the single largest crime category, plus 29 robbery, 21 theft-from-person, "
                "8 weapons-possession and 5 shoplifting offences over the same period (crimerate.co.uk, "
                "itself built on police.uk/MPS data) - this is a partial category list, not an "
                "exhaustive cross-category total, so was not used as the headline figure."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    imd_crime_decile = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="peace_justice",
        indicator="Index of Multiple Deprivation Decile",
        snapshot=Snapshot(value=172, unit="rank out of 296 English local authorities (IMD 2025, overall/all-domain; 1 = most deprived)", year=2025),
        source=Source(
            name="MHCLG English Indices of Deprivation 2025 (overall/all-domain local authority summary), via Ladywell Live reporting on the government release",
            url="https://ladywell-live.org/2025/10/31/2-of-neighbourhoods-in-lewisham-highly-deprived-with-borough-ranked-172-out-of-296-government-deprivation-data-shows/",
            accessed="2026-07-18",
            notes=(
                "dimension_data_sources.json specifies Trust for London's Crime-domain-specific IMD "
                "page (trustforlondon.org.uk/data/crime-deprivation-across-london-neighbourhoods/) as "
                "the intended source for THIS indicator - itself built on the MHCLG English Indices of "
                "Deprivation 2025 (published 30 Oct 2025, LSOA-level; "
                "gov.uk/government/statistics/english-indices-of-deprivation-2025). That page, and the "
                "government's own LSOA-level Local Deprivation Explorer "
                "(deprivation.communities.gov.uk) which would let a future update pinpoint the actual "
                "Crime domain decile for each of Ladywell's 7 constituent LSOAs individually, could not "
                "be accessed this session due to a sustained outbound-network access failure; web "
                "search located only partial, non-crime-domain-specific figures. What IS confirmed via "
                "search this session: Lewisham ranks 172nd of 296 English local authorities on the "
                "OVERALL (all 7 domains combined) IMD 2025 - close to the middle, moderately deprived, "
                "little changed in relative position since IMD 2019 - and locally, 1 of Ladywell's 7 "
                "LSOAs falls within the most-deprived 20% of neighbourhoods in England on that same "
                "overall index (Ladywell Live, 31 Oct 2025, reporting on the same government release). "
                "Crime contributes only 9.3% of the weighting toward that overall IMD score (one of "
                "seven domains, alongside Income and Employment at 22.5% each, Education and Health at "
                "13.5% each, and Barriers to Housing/Services and Living Environment at 9.3% each) - so "
                "neither figure above is a substitute for the crime-specific decile this indicator is "
                "meant to track, and the value/unit above is reported as an overall-IMD local authority "
                "rank, not a neighbourhood-level crime decile, to avoid overstating precision. Revisit "
                "once direct access to Trust for London or the government's LSOA explorer is restored."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.LOW,
        target_text="No official GLA or UK Government target established for this indicator."
    )

    return [crime_rate, imd_crime_decile]

def build_political_voice():
    """
    Political Voice dimension - 3 indicators: local election turnout (Lewisham borough,
    since Lewisham elects a directly-elected Mayor and councillors on one combined ballot -
    no ward-level turnout figures could be reliably sourced this session, see source notes)
    and two DCMS Community Life Survey measures of civic participation and perceived local
    influence (England-wide only - the survey is not run below national level).
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    turnout = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="political_voice",
        indicator="% turnout in local election",
        snapshot=Snapshot(value=42.14, unit="%", year=2026, date="7 May 2026"),
        source=Source(
            name="Lewisham Council official election results / Wikipedia election summaries, cross-checked against Electoral Commission-reported figures",
            url="https://lginform.local.gov.uk/reports/lgastandard?mod-area=E92000001&mod-group=E09000023&mod-metric=3361&mod-type=area",
            accessed="2026-07-17",
            notes=(
                "Borough-wide combined Mayor-and-council turnout (Lewisham elects both on one ballot paper on the same day, so there is a single turnout figure, not separate mayoral/council ones). "
                "42.14% on 7 May 2026 - the election in which the Green Party won a majority on Lewisham Council for the first time, ending decades of Labour control, in a genuinely contested three-way race. "
                "20.88% on 5 May 2022. 37.2% on 22 May 2014. 60.7% on 6 May 2010, but that round was held on the same day as the UK general election, which drove exceptional turnout - not comparable to the other rounds. "
                "3 May 2018 borough-wide turnout could not be reliably sourced this session despite a genuine, repeated search effort (Wikipedia's 2018 election article, the Electoral Commission's 'Results and turnout at the 2018 May England local elections' report, and Lewisham Council's own results pages were all identified but could not be directly fetched or searched to the specific figure - see below). "
                "Ward-level Ladywell turnout was also specifically sought, per this indicator's data-source brief, since Ladywell's current boundaries have been used since the 2022 election: individual 2022 candidate vote counts were found (Labour: Cunningham 2,151, Johnston-Franklin 1,950, Brown 1,930; Green: Stein 1,810, Humberstone 1,786, Crossley 1,759), but the full candidate list, total ballots cast, and ward electorate needed to compute a genuine ward-level turnout percentage could not be extracted. "
                "This environment's network egress policy blocks direct page fetches to councilmeetings.lewisham.gov.uk, lewisham.moderngov.co.uk, lginform.local.gov.uk and en.wikipedia.org (every direct fetch attempt this session returned a connection failure or 403, including via curl with a browser User-Agent), leaving only web-search-engine snippets, which do not carry electorate/total-ballot detail. "
                "The figure shown is therefore the borough-wide (Lewisham) figure the assigned LG Inform source itself measures at metric 3361, not Ladywell specifically."
            )
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2010", "value": 60.7, "note": "Held the same day as the UK general election - turnout not comparable to other rounds"},
            {"period": "2014", "value": 37.2},
            {"period": "2022", "value": 20.88, "note": "2018 borough turnout could not be reliably sourced this session"},
            {"period": "2026", "value": 42.14, "note": "Green Party won a council majority for the first time"},
        ]
    )

    civic_participation = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="political_voice",
        indicator="% adults that have engaged in civic participation",
        snapshot=Snapshot(value=34, unit="%", year="2024/25"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Civic engagement and social action",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-civic-engagement-and-social-action",
            accessed="2026-07-17",
            notes=(
                "34% of adults in England had engaged in some form of civic participation - contacting a local councillor or MP, signing a petition, or attending a public rally/meeting, in person or online, excluding voting - at least once in the 12 months to March 2025 (published 10 December 2025). "
                "No significant change from 33% in 2023/24, and in line with 34% in 2021/22, but down from a 2020/21 peak of 42% (and 41% in 2019/20). "
                "No 2022/23 survey round was published - the Community Life Survey was redesigned around that time, moving fieldwork from 3-4 quarters to 2. "
                "England-wide figure only: DCMS does not publish this indicator below national level, so no Lewisham- or London-specific figure exists - the same limitation applies to the 'personally influence local decisions' indicator on this page, from the same survey."
            )
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2019/20", "value": 41},
            {"period": "2020/21", "value": 42},
            {"period": "2021/22", "value": 34},
            {"period": "2023/24", "value": 33, "note": "No 2022/23 survey round was published (methodology redesign gap)"},
            {"period": "2024/25", "value": 34},
        ]
    )

    local_influence = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="political_voice",
        indicator="% adults agreed they can personally influence decisions affecting local area",
        snapshot=Snapshot(value=24, unit="%", year="2024/25"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Civic engagement and social action",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-civic-engagement-and-social-action",
            accessed="2026-07-17",
            notes=(
                "24% of adults in England agreed (definitely or tended to agree) that they personally can influence decisions affecting their local area in 2024/25 (12 months to March 2025, published 10 December 2025), essentially unchanged from 23% in 2023/24. "
                "Both of those years sit below every year on record between 2013/14 and 2021/22, when the figure held in a narrow 25-28% band (27% in 2013/14, 2019/20, 2020/21 and 2021/22 specifically). "
                "No 2022/23 survey round was published, same redesign gap as the civic participation indicator on this page. England-wide figure only - not published below national level."
            )
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.HIGH,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2013/14", "value": 27},
            {"period": "2019/20", "value": 27},
            {"period": "2020/21", "value": 27},
            {"period": "2021/22", "value": 27},
            {"period": "2023/24", "value": 23, "note": "No 2022/23 survey round was published (methodology redesign gap)"},
            {"period": "2024/25", "value": 24},
        ]
    )

    return [turnout, civic_participation, local_influence]

def build_social_cohesion_dimensions():
    """
    Social cohesion dimension - 4 indicators, all from DCMS's Community Life Survey
    2024/25 (the same annual release used by the Community and Political Voice
    dimensions - different questions from the same survey). No ward- or borough-level
    breakdown could be retrieved for any of the four questions in this session: DCMS/MHCLG
    boosted the survey's sample from 2023/24 to enable local-authority-level estimates and
    maps, but gov.uk (including assets.publishing.service.gov.uk, the data-table host) was
    blocked by this environment's network egress policy throughout this session, so only
    the England-wide headline figures quoted in the annual releases could be independently
    verified - a genuinely Lewisham-specific value could not be confirmed for any indicator.
    No 2022/23 survey round exists (methodology redesign gap - confirmed independently by
    the political_voice dimension built the same session from the same survey), which is
    why several trends below skip straight from 2021/22 to 2023/24.
    All four are descriptive_only (no official GLA/UK Government target for any of them).
    The Community Life Survey's fieldwork ended 30 March 2025 (last round: 2024/25); it has
    been succeeded by the Community and Engagement Survey (CES), which will be the source
    for future updates to this dimension.
    Kept in sync by hand with site/data/wards/ladywell.json - if you change one, change both.
    """
    trust = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_cohesion",
        indicator="% adults agreed that people in neighbourhood can be trusted",
        snapshot=Snapshot(value=40, unit="%", year="2024/25"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Neighbourhood and community",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-neighbourhood-and-community",
            accessed="2026-07-18",
            notes="40% of adults in England agreed that many of the people in their neighbourhood can be trusted in 2024/25, no significant change from 41% in 2023/24; levels have held broadly steady in a 40-42% band since 2016/17, down from 48% when push-to-web data collection began in 2013/14. The 2024/25 release's own regional breakdown shows London running well below the England average (reported in the low-to-mid 30s%, e.g. one regional analysis cites 32%) and a wider local-authority breakdown exists (DCMS/MHCLG boosted the sample from 2023/24, to roughly 175,000 responses from around 10,000 previously, specifically to produce local-authority-level estimates and maps) - but the exact current London-region figure and any Lewisham-specific value could not be independently confirmed in this session because gov.uk's data-table hosts were blocked by this environment's network egress policy. The England-wide headline figure is used here as the only value directly verified this session."
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2013/14", "value": 48},
            {"period": "2018/19", "value": 40},
            {"period": "2021/22", "value": 41},
            {"period": "2023/24", "value": 41},
            {"period": "2024/25", "value": 40},
        ]
    )

    cohesion = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_cohesion",
        indicator="% adults agreed people from different backgrounds get along well together",
        snapshot=Snapshot(value=80.6, unit="%", year="2024/25"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Neighbourhood and community",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-neighbourhood-and-community",
            accessed="2026-07-18",
            notes="80.6% of adults in England agreed their local area is a place where people from different backgrounds get along well together in 2024/25, a small but statistically significant fall from 81.4% in 2023/24 and down from a recent peak of 84% in 2021/22 (82% in 2019/20, 83% in 2020/21). Younger adults are consistently less likely to agree than older adults (78% of 16-24s and 79% of 25-34s vs 81-88% among older age bands in 2024/25). As with the trust indicator above, this is the England-wide headline figure; a London-region and local-authority breakdown is also published by DCMS/MHCLG but no specific London or Lewisham value could be independently confirmed in this session because gov.uk's data-table hosts were blocked by this environment's network egress policy."
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2019/20", "value": 82},
            {"period": "2020/21", "value": 83},
            {"period": "2021/22", "value": 84},
            {"period": "2023/24", "value": 81.4},
            {"period": "2024/25", "value": 80.6},
        ]
    )

    pride = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_cohesion",
        indicator="% proud to live in their local area",
        snapshot=Snapshot(value=60, unit="%", year="2024/25"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Neighbourhood and community",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-neighbourhood-and-community",
            accessed="2026-07-18",
            notes="60% of adults in England agreed they were proud to live in their local area in 2024/25, essentially unchanged from 59% in 2023/24 - the first year this exact question was included in the survey, so no earlier trend exists (predecessor 'neighbourhood belonging'/'attachment to area' questions are related but measure something different, so are not spliced in as earlier points). Of those who felt proud, the most commonly cited reasons in 2024/25 were that the area felt safe (69%), had green/natural spaces (63%), and had respectful, friendly people (58%). England-wide figure only; no London-specific breakdown for this newer question could be confirmed in this session."
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2023/24", "value": 59, "note": "First year this question was included in the survey - no earlier trend exists"},
            {"period": "2024/25", "value": 60},
        ]
    )

    volunteering = create_descriptive_dimension(
        ward=LADYWELL_WARD_NAME,
        ward_code=LADYWELL_WARD_CODE,
        lens=Lens.LOCAL_SOCIAL,
        dimension_name="social_cohesion",
        indicator="% adults that have participated in formal/informal volunteering",
        snapshot=Snapshot(value=54, unit="%", year="2024/25", date="at least once in the last 12 months"),
        source=Source(
            name="DCMS Community Life Survey 2024/25 - Volunteering and charitable giving",
            url="https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication/community-life-survey-202425-volunteering-and-charitable-giving",
            accessed="2026-07-18",
            notes="54% of adults in England took part in formal or informal volunteering at least once in the last 12 months in 2024/25, unchanged from 2023/24 (54%) - the lowest recorded for this combined measure since push-to-web data collection began in 2013/14, down from 62% in both 2019/20 and 2020/21 and 55% in 2021/22. Split by type: formal volunteering (through a group, club or organisation) fell to 28% at least once/year in 2024/25, below the pre-pandemic 37%; informal volunteering (unpaid help to people who aren't relatives, outside any organisation) fell to 44%, down from a pandemic-era peak of 54% in 2020/21, when informal mutual aid rose even as formal volunteering activity paused. A stricter 'at least once a month' version of this same combined measure also exists (33% in both 2023/24 and 2024/25); the 'at least once in the last 12 months' measure is used here as the closer match to the indicator's wording in dimension_data_sources.json ('participated in ... volunteering', with no monthly frequency qualifier). England-wide figure only; local-authority-level volunteering estimates are also published (sample boosted since 2023/24) but no Lewisham-specific figure could be confirmed in this session because gov.uk's data-table hosts were blocked by this environment's network egress policy. Note: Community Life Survey fieldwork ended 30 March 2025; it has been succeeded by the Community and Engagement Survey (CES), which will be the source for future updates to this indicator."
        ),
        geography=GeographyLevel.ENGLAND,
        confidence=Confidence.MEDIUM,
        target_text="No official GLA or UK Government target established for this indicator.",
        trend=[
            {"period": "2019/20", "value": 62},
            {"period": "2020/21", "value": 62},
            {"period": "2021/22", "value": 55},
            {"period": "2023/24", "value": 54},
            {"period": "2024/25", "value": 54},
        ]
    )

    return [trust, cohesion, pride, volunteering]

def main():
    """Build all Local Social dimensions with real Lewisham data where available"""
    dimensions = [
        build_health(),
        *build_housing_dimensions(),
        *build_food_dimensions(),
        *build_water_dimensions(),
        *build_connectivity(),
        *build_community(),
        *build_culture_dimensions(),
        *build_mobility_dimensions(),
        *build_education(),
        *build_energy(),
        *build_income(),
        *build_peace_justice(),
        *build_political_voice(),
        *build_social_cohesion_dimensions(),
        *build_equality(),
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
