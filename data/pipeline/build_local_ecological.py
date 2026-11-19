"""
Build Local Ecological dimensions for Ladywell (Lewisham).

Seven dimensions, built November 2026 from directly downloaded primary files. Each
build_<dimension>() returns a list of Dimension objects (one per indicator) and is
spliced into the ward JSON files with:

    python3 scripts/splice_dimension.py <dimension>

which writes the lens 'local_ecological' in site/data/wards/ladywell.json,
data/wards/ladywell.json and data/wards/ladywell_local_ecological.json.

Ladywell geographies used here:
- Ward boundary: ONS Wards (December 2022) Boundaries UK BFC, E05013725 (204.2 ha).
- 7 best-fit LSOAs (2021): E01003273, E01003274, E01003275, E01003276, E01003278,
  E01003279, E01003291. Together they cover about 160 ha, less than the ward's 204 ha,
  so LSOA aggregates are labelled lsoa_aggregated, not ward.

Statuses: the ecological ring maps descriptive_only to "Overshoot" (spec 2.4). The two
indicators copied from the social water dimension keep their targets, but the per capita
consumption status is set to OVERSHOOT so the ecological page never shows "Shortfall".
Wellbeing's green/blue space access is MET: 99.8% of Ladywell households are within a
15-minute walk, against the Environmental Improvement Plan 2025 commitment.
"""
from dataclasses import replace

from schema import (
    Target, Threshold, Snapshot, Source,
    Lens, Status, GeographyLevel, Confidence,
    create_targeted_dimension, create_descriptive_dimension
)
import build_local_social_with_real_data as social

WARD = "Ladywell"
WARD_CODE = "E05013725"
ECO = Lens.LOCAL_ECOLOGICAL
ACCESSED = "2026-11-19"

# ---------------------------------------------------------------------------
# Shared sources
# ---------------------------------------------------------------------------

GLA_CANOPY_2024 = dict(
    name="Greater London Authority - Tree Canopy Cover 2024 (ward and borough statistics)",
    url="https://data.london.gov.uk/dataset/tree-canopy-cover-2024-2w4m3",
)
GLA_GREEN_2024 = dict(
    name="Greater London Authority - Green Cover 2024 (ward and borough statistics)",
    url="https://data.london.gov.uk/dataset/green-cover-2024-e56n0",
)
GLA_METHOD_NOTE = (
    "Both 2024 maps were modelled by the GLA from 25cm colour and infrared aerial imagery plus height data, "
    "captured mainly in 2022 (GLA Methodology Report, Canopy & Green Cover 2024, June 2024). Typical standard "
    "error for an average-sized ward is about 0.6 percentage points for canopy and 1.2 for green cover. "
    "The GLA says the 2024 estimates should not be compared with the 2018 Curio Canopy map (2016 imagery): the "
    "new model uses height data, and the apparent London-wide fall from 21.06% to 19.56% is 'not an indication "
    "of true change' (section 4.3). No time series is therefore drawn."
)


def build_water_provisioning():
    """
    Water provisioning - 4 indicators. The first two are copied from the social water
    dimension's builder (same data and sources, re-lensed), as the Todoist task asked.
    """
    social_water = {d.indicator: d for d in social.build_water_dimensions()}

    pcc = replace(
        social_water["Per capita water consumption (litres/day)"],
        lens=ECO, dimension="water_provisioning", status=Status.OVERSHOOT,
    )
    stress = replace(
        social_water["Areas of water stress"],
        lens=ECO, dimension="water_provisioning",
    )

    river = create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="water_provisioning",
        target=Target(
            text="Good ecological status by 2027 (Environment Agency objective for this water body, low confidence); good overall status by 2063.",
            source_body="Environment Agency - Thames River Basin Management Plan objectives (Catchment Data Explorer)",
            has_official_target=True,
        ),
        indicator="River water body status (Ravensbourne, Catford to Deptford)",
        threshold=Threshold(value=None, unit=None, description="Good ecological status (Water Framework Directive scale: high, good, moderate, poor, bad)"),
        snapshot=Snapshot(value="Moderate", unit=None, year="2022", date="Cycle 3 classification"),
        status=Status.OVERSHOOT,
        source=Source(
            name="Environment Agency - Catchment Data Explorer, Ravensbourne (Catford to Deptford) water body GB106039023270",
            url="https://environment.data.gov.uk/catchment-planning/WaterBody/GB106039023270",
            accessed=ACCESSED,
            notes=(
                "Classifications CSV (data updated 17 March 2025). The water body's geometry was intersected with the ONS 2022 ward "
                "boundary: it runs through Ladywell (Ladywell Fields); the upstream Keston-to-Catford water body (GB106039023260) does not. "
                "Ecological status: 2009 Poor, 2010 Poor, 2011 Bad, 2012 Bad, 2013 Poor, 2014 Moderate, 2015 Moderate, 2016 Moderate, "
                "2019 Moderate, 2022 Moderate. Classification methods change between planning cycles (cycle 1 to 2009-15, cycle 3 for 2019 "
                "and 2022), so no line is drawn. In 2022: fish Bad, invertebrates Moderate, macrophytes Poor, phosphate Poor, dissolved "
                "oxygen and ammonia High. Chemical status failed in 2019 (PFOS and PBDEs); in 2022 it is listed as 'does not require "
                "assessment'. Designated heavily modified. Reasons for not achieving good status (cycle 3) include physical modification "
                "(flood protection structures, barriers to fish, urbanisation), sewage discharges, leaking sewers and misconnected household "
                "drains (confirmed for invertebrates). Objectives CSV: ecological Good by 2027 (low confidence), overall Good by 2063."
            ),
        ),
        geography=GeographyLevel.WATER_BODY,
        confidence=Confidence.HIGH,
    )

    sealed = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="water_provisioning",
        indicator="% of land not covered by vegetation (proxy for impervious surface)",
        snapshot=Snapshot(value=53.4, unit="%", year="2022", date="aerial imagery captured mainly in 2022"),
        source=Source(
            accessed=ACCESSED,
            notes=(
                "Proxy: 100% minus the GLA's 2024 green cover estimate. It counts everything not vegetated - roofs, roads, paving, "
                "bare ground and open water - so it slightly overstates sealed surfaces where there is water or bare soil. "
                "Ladywell: ward area 204.26 ha, green 95.16 ha (46.59%), so 53.4% not vegetated. Lewisham: 39.06% green, 60.9% not. "
                "London: 51.68% green, 48.3% not. " + GLA_METHOD_NOTE
            ),
            **GLA_GREEN_2024,
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM,
        target_text="No official target for impervious surface. The London Environment Strategy aims for at least 50% of London to be green by 2050.",
    )
    return [stress, pcc, river, sealed]


def _canopy(dimension):
    return create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name=dimension,
        target=Target(
            text="London Environment Strategy (2018): increase London's tree canopy cover by 10% by 2050.",
            source_body="Mayor of London - London Environment Strategy",
            has_official_target=True,
        ),
        indicator="% tree canopy coverage",
        threshold=Threshold(value=None, unit="%", description="London average 19.56% (2022 imagery)"),
        snapshot=Snapshot(value=25.0, unit="%", year="2022", date="aerial imagery captured mainly in 2022"),
        status=Status.DESCRIPTIVE_ONLY,
        source=Source(
            accessed=ACCESSED,
            notes=(
                "Ladywell (2022 ward E05013725): 50.97 ha of canopy in 204.26 ha = 24.95%. Lewisham 19.60% (SE 0.36), London "
                "19.56% (SE 0.30). Canopy means tree crowns about 4m tall or more; young and newly planted trees are mostly not "
                "detected. " + GLA_METHOD_NOTE
            ),
            **GLA_CANOPY_2024,
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.HIGH,
    )


def build_carbon_sequestration():
    green = create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="carbon_sequestration",
        target=Target(
            text="London Environment Strategy (2018): increase green cover to at least 50% of London by 2050.",
            source_body="Mayor of London - London Environment Strategy",
            has_official_target=True,
        ),
        indicator="% green cover",
        threshold=Threshold(value=50.0, unit="%", description="At least 50% of London green by 2050 (London-wide aim)"),
        snapshot=Snapshot(value=46.6, unit="%", year="2022", date="aerial imagery captured mainly in 2022"),
        status=Status.DESCRIPTIVE_ONLY,
        source=Source(
            accessed=ACCESSED,
            notes=(
                "Green cover = all vegetation (trees, shrubs, grass, gardens, green roofs). Ladywell: 95.16 ha of 204.26 ha = 46.59%. "
                "Lewisham 39.06% (SE 1.14), London 51.68% (SE 1.11). The 2019 'How green is London' baseline (2016 imagery) gave "
                "London only as a range, 47.6-50.7%, so no comparable earlier ward figure exists. " + GLA_METHOD_NOTE
            ),
            **GLA_GREEN_2024,
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.HIGH,
    )
    return [_canopy("carbon_sequestration"), green]


def build_biodiversity_support():
    lnrs = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="biodiversity_support",
        indicator="% of land identified for nature recovery (London Local Nature Recovery Strategy)",
        snapshot=Snapshot(value=26.5, unit="%", year="2026", date="London LNRS published March 2026"),
        source=Source(
            name="Greater London Authority / GiGL - London Local Nature Recovery Strategy (LNRS) open data layers (April 2026)",
            url="https://data.london.gov.uk/dataset/london-local-nature-recovery-strategy-lnrs-20gj6",
            accessed=ACCESSED,
            notes=(
                "Area of the union of 'Potential measure locations' polygons inside the ONS 2022 ward boundary, divided by ward area: "
                "54.2 ha of 204.2 ha = 26.5%. Lewisham 19.5% (683.7 of 3,514.8 ha, ONS LAD BFC); Greater London 28.4% (44,618 of 157,340 ha, ONS Region December 2022 BFC, the same boundary basis as ward and borough). "
                "Priorities assigned to the Ladywell locations: parks and open spaces, woodland, floodplain, lowland meadow, rivers "
                "and streams, ponds and lakes, scrub and urban mosaic habitat. "
                "Areas of Particular Importance for Biodiversity (APIB) in the open layer cover 0% of Ladywell (3.2% of Lewisham, "
                "6.2% of London), but the open layer includes only nationally designated sites, Local Nature Reserves and ancient "
                "woodland: Local Wildlife Sites (SINCs) are excluded for licensing reasons (GiGL metadata, 7 April 2026), so local "
                "sites in Ladywell are not counted. The 'Areas that could become of particular importance' layer covers 1.9 ha (0.9%). "
                "Potential measure locations are opportunities, not designations."
            ),
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM,
        target_text="No numeric target. The LNRS sets London's biodiversity priorities and maps where nature recovery could happen.",
    )
    return [lnrs]


def build_energy_harvesting():
    energy = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="energy_harvesting",
        indicator="Energy consumption per resident (MWh per year)",
        snapshot=Snapshot(value=10.1, unit="MWh", year="2024"),
        source=Source(
            name="DESNZ - Total final energy consumption at regional and local authority level: 2005 to 2024 (July 2026)",
            url="https://www.gov.uk/government/statistics/total-final-energy-consumption-at-regional-and-local-authority-level-2005-to-2024",
            accessed=ACCESSED,
            notes=(
                "All fuels total (domestic, transport, industrial and commercial) in ktoe, converted at 1 ktoe = 11.63 GWh, divided by "
                "the ONS mid-year population carried in DESNZ's 2005-2024 local authority greenhouse gas workbook (Table 1.1). "
                "Lewisham 2024: 261.7 ktoe (3,044 GWh) for 301,255 residents = 10.1 MWh; domestic use 5.3 MWh per resident. London "
                "(E12000007) 14.0 MWh; England (E92000001) 19.2 MWh. Borough is the smallest geography published."
            ),
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        trend=(
            [{"period": str(y), "value": v, "series": "Lewisham"} for y, v in zip(range(2015, 2025),
                [12.3, 12.1, 12.1, 12.1, 12.1, 11.4, 11.2, 10.5, 10.4, 10.1])]
            + [{"period": str(y), "value": v, "series": "London"} for y, v in zip(range(2015, 2025),
                [16.8, 16.6, 16.7, 16.6, 16.4, 15.3, 15.5, 14.6, 14.3, 14.0])]
            + [{"period": str(y), "value": v, "series": "England"} for y, v in zip(range(2015, 2025),
                [22.8, 22.4, 22.6, 22.5, 22.3, 20.6, 20.8, 19.9, 19.5, 19.2])]
        ),
    )

    solar = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="energy_harvesting",
        indicator="% of electricity use matched by solar generated in the borough",
        snapshot=Snapshot(value=1.1, unit="%", year="2024"),
        source=Source(
            name="DESNZ - Regional Renewable Statistics: renewable electricity by local authority 2014-2025 (September 2026); Total final energy consumption 2005-2024",
            url="https://www.gov.uk/government/statistics/regional-renewable-statistics",
            accessed=ACCESSED,
            notes=(
                "Solar PV generation in Lewisham (MWh) divided by Lewisham's electricity consumption from the total final energy "
                "consumption tables (ktoe x 11.63). 2024: 7,078 MWh of 641.7 GWh = 1.1%. Installed solar capacity rose from 3.3 MW "
                "(2015) to 9.9 MW (2024) and 11.0 MW (2025). Solar is the only renewable source with published Lewisham generation: "
                "the borough also has 35 MW of municipal solid waste (energy-from-waste) capacity, whose generation "
                "is suppressed ([X]) from 2019 for confidentiality, so a full renewable share cannot be calculated. 2025 is not used: "
                "DESNZ notes many 2025 installations could not yet be assigned to a local authority, and 2025 consumption is not "
                "published. London series uses the sum of London local authority rows (installations not assigned to any authority "
                "are excluded)."
            ),
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.MEDIUM,
        target_text="No local target for renewable electricity share.",
        trend=(
            [{"period": str(y), "value": v, "series": "Lewisham"} for y, v in zip(range(2015, 2025),
                [0.36, 0.44, 0.46, 0.52, 0.68, 0.50, 0.72, 0.99, 0.97, 1.10])]
            + [{"period": str(y), "value": v, "series": "London"} for y, v in zip(range(2015, 2025),
                [0.19, 0.24, 0.27, 0.31, 0.43, 0.33, 0.47, 0.62, 0.63, 0.70])]
        ),
    )

    years = ["2015/16", "2016/17", "2017/18", "2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24", "2024/25"]
    recycling = create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="energy_harvesting",
        target=Target(
            text="London Environment Strategy: 65% of London's municipal waste recycled by 2030.",
            source_body="Mayor of London - London Environment Strategy",
            has_official_target=True,
        ),
        indicator="Household recycling and composting rate",
        threshold=Threshold(value=None, unit="%", description="London average 32.6% (2024/25)"),
        snapshot=Snapshot(value=27.2, unit="%", year="2024/25"),
        status=Status.DESCRIPTIVE_ONLY,
        source=Source(
            name="Defra - Local authority collected waste management: annual results 2024/25 (March 2026), Tables 3 and 3a",
            url="https://www.gov.uk/government/statistics/local-authority-collected-waste-management-annual-results",
            accessed=ACCESSED,
            notes=(
                "Percentage of household waste sent for reuse, recycling or composting (ex NI192). Lewisham (E09000023) Table 3: "
                "2010/11 18.1%, 2011/12 17.2%, 2012/13 20.0%, 2013/14 17.7%, 2014/15 17.1%, then as charted. London and England "
                "from Table 3a. England 2024/25: 42.0%."
            ),
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        trend=(
            [{"period": p, "value": v, "series": "Lewisham"} for p, v in zip(years,
                [18.0, 17.7, 21.8, 28.0, 26.6, 28.4, 27.2, 23.0, 26.8, 27.2])]
            + [{"period": p, "value": v, "series": "London"} for p, v in zip(years,
                [32.0, 33.0, 33.1, 33.4, 33.5, 33.0, 32.7, 32.7, 32.7, 32.6])]
            + [{"period": p, "value": v, "series": "England"} for p, v in zip(years,
                [43.0, 43.7, 43.2, 43.5, 43.8, 42.3, 42.5, 41.7, 42.3, 42.0])]
        ),
    )
    return [energy, solar, recycling]


def build_air_quality_regulation():
    LAEI22 = "https://data.london.gov.uk/dataset/london-atmospheric-emissions-inventory-laei-2022-2lg5g"
    exceed = create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="air_quality_regulation",
        target=Target(
            text="UK legal limit for nitrogen dioxide: 40 µg/m³ annual mean. WHO 2021 guideline: 10 µg/m³.",
            source_body="Air Quality Standards Regulations 2010; World Health Organization",
            has_official_target=True,
        ),
        indicator="% of residents living where air pollution exceeds legal limits",
        threshold=Threshold(value=None, unit="%", description="UK annual mean limit value for NO2, 40 µg/m³"),
        snapshot=Snapshot(value=0, unit="%", year="2022"),
        status=Status.DESCRIPTIVE_ONLY,
        source=Source(
            name="Transport for London / GLA - LAEI 2022 Population Exposure and Proportion of Road Length Exceeding statistics (November 2025)",
            url=LAEI22,
            accessed=ACCESSED,
            notes=(
                "Modelled 2022 annual mean concentrations, population-weighted by Output Area. Lewisham: 298,700 residents, 0 living "
                "where NO2 exceeds the 40 µg/m³ legal limit; 100 above 30 µg/m³; 272,900 (91.4%) above 20 µg/m³, the WHO interim "
                "target that the workbook notes will be the EU legal limit from 2030 (London 70.2%). Every Londoner lives above the "
                "WHO 2021 guideline of 10 µg/m³. PM2.5: 2.5% of Lewisham residents live above 10 µg/m³ (London 11.8%). London as a "
                "whole: about 161,000 people above the NO2 legal limit in 2019, just over 1,000 in 2022. Lewisham's population-weighted "
                "NO2 fell from 27.7 to 21.9 µg/m³ between 2019 and 2022. The workbook publishes boroughs, not wards. Breathe London "
                "(suggested source) runs a sensor network and does not publish resident exposure shares, so LAEI is used."
            ),
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
    )

    conc = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="air_quality_regulation",
        indicator="Annual average air pollution concentration (µg/m³)",
        snapshot=Snapshot(value=21.9, unit="µg/m³", year="2022", date="nitrogen dioxide (NO2)"),
        source=Source(
            name="GLA / TfL - London Atmospheric Emissions Inventory (LAEI) 2022 and 2019, modelled concentrations (20m grid)",
            url=LAEI22,
            accessed=ACCESSED,
            notes=(
                "Ward mean of every 20m grid point inside the ONS 2022 Ladywell boundary (5,107 points), from LAEI2022_V1_*.csv and "
                "LAEI2019v3_CorNOx15_*.csv. NO2 27.6 (2019) to 21.9 (2022); PM2.5 10.7 to 9.4; PM10 16.3 to 16.4. Lewisham area "
                "means: NO2 27.3 to 21.6; PM2.5 10.7 to 9.3; PM10 16.2 to 16.0. These are area averages, not population-weighted. "
                "1.2% of the ward's area exceeded 40 µg/m³ NO2 in 2019 and 0.06% in 2022 (along the busiest roads); all of it was "
                "above 20 µg/m³ in both years. WHO 2021 guidelines: NO2 10, PM2.5 5, PM10 15. The GLA's own tables compare 2019 and "
                "2022, though each inventory is a separate modelling exercise."
            ),
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM,
        target_text="UK legal annual limits: NO2 40 µg/m³, PM10 40 µg/m³, PM2.5 20 µg/m³ (10 µg/m³ by 2040). WHO 2021 guidelines: NO2 10, PM2.5 5, PM10 15.",
        trend=[
            {"period": "2019", "value": 27.6, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2022", "value": 21.9, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2019", "value": 16.3, "series": "Coarse particles (PM10)"},
            {"period": "2022", "value": 16.4, "series": "Coarse particles (PM10)"},
            {"period": "2019", "value": 10.7, "series": "Fine particles (PM2.5)"},
            {"period": "2022", "value": 9.4, "series": "Fine particles (PM2.5)"},
        ],
    )
    return [exceed, _canopy("air_quality_regulation"), conc]


def build_temperature_regulation():
    yrs = range(2015, 2025)
    ghg = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="temperature_regulation",
        indicator="Territorial greenhouse gas emissions per resident (tonnes CO2e)",
        snapshot=Snapshot(value=2.1, unit="tonnes", year="2024"),
        source=Source(
            name="DESNZ - UK local authority and regional greenhouse gas emissions statistics, 2005 to 2024 (June 2026), Table 1.1",
            url="https://www.gov.uk/government/statistics/uk-local-authority-and-regional-greenhouse-gas-emissions-statistics-2005-to-2024",
            accessed=ACCESSED,
            notes=(
                "Territorial emissions: everything emitted within the borough boundary, including electricity attributed to where it "
                "is used, not emissions embodied in goods. Lewisham 2024: 637.4 kt CO2e, 2.12 t per resident; 2005: 1,382.7 kt "
                "(-54%); 2015: 1,107.9 kt (-42%). 2024 by sector: domestic 286.6 kt (45%), transport 179.4 kt (28%), commercial "
                "87.3, public sector 26.5, industry 30.0, waste 25.3 (191.5 in 2015). London Total 3.01 t, England Total 4.67 t per "
                "resident. Borough is the smallest geography published."
            ),
        ),
        geography=GeographyLevel.BOROUGH_INHERITED,
        confidence=Confidence.HIGH,
        target_text="Lewisham's Climate Emergency Action Plan (approved 2020) aims for a carbon-neutral borough by 2030 (Lewisham Air Quality Action Plan 2022-2027 foreword); the UK target is net zero by 2050.",
        trend=(
            [{"period": str(y), "value": v, "series": "Lewisham"} for y, v in zip(yrs,
                [3.75, 3.80, 3.49, 3.15, 3.10, 2.58, 2.55, 2.32, 2.17, 2.12])]
            + [{"period": str(y), "value": v, "series": "London"} for y, v in zip(yrs,
                [4.73, 4.39, 4.16, 4.05, 3.83, 3.46, 3.72, 3.40, 3.14, 3.01])]
            + [{"period": str(y), "value": v, "series": "England"} for y, v in zip(yrs,
                [6.90, 6.43, 6.23, 6.11, 5.84, 5.32, 5.52, 5.13, 4.81, 4.67])]
        ),
    )

    uhi = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="temperature_regulation",
        indicator="Summer daytime air temperature compared with the London average (°C)",
        snapshot=Snapshot(value="+0.25", unit="°C", year="2018-2022", date="summer months"),
        source=Source(
            name="GLA - Properties Vulnerable to Heat Impacts in London (Arup, 2024): LSOA air temperature (T2) layer",
            url="https://data.london.gov.uk/dataset/properties-vulnerable-to-heat-impacts-in-london-e769n",
            accessed=ACCESSED,
            notes=(
                "The geodatabase's T2 field is the high-resolution air temperature at the surface produced by Arup, averaged over "
                "summer daytime 2018-2022 for each 2021 LSOA (described in the GLA London Climate Risk Maps metadata, September 2024, "
                "which uses it as its 'mean air temperature' layer: data.london.gov.uk/dataset/climate-risk-mapping-2oxg6). "
                "Area-weighted means: Ladywell's 7 LSOAs 18.21°C, Lewisham 18.05°C, London (4,994 LSOAs) 17.96°C, so Ladywell is "
                "0.25°C warmer than London's average and Lewisham 0.09°C. LSOA values in Ladywell range from 18.00°C to 18.75°C "
                "(Lewisham 011A and 011D, the two warmest). This is a difference from the London average, not the classic urban heat "
                "island differential against surrounding countryside, which this dataset does not give; London-wide heat-island maps "
                "on the Datastore use 2006 and 2011 data, older than the 10-year limit."
            ),
        ),
        geography=GeographyLevel.LSOA_AGGREGATED,
        confidence=Confidence.MEDIUM,
        target_text="No official target for local air temperature.",
    )
    return [ghg, uhi]


def build_wellbeing():
    access = create_targeted_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="wellbeing",
        target=Target(
            text="Environmental Improvement Plan 2025: everyone in England should have access to green or blue space within a 15-minute walk from home.",
            source_body="Defra - Environmental Improvement Plan 2025",
            has_official_target=True,
        ),
        indicator="% of households within a 15-minute walk of green or blue space",
        threshold=Threshold(value=100.0, unit="%", description="Everyone within a 15-minute walk (EIP 2025 commitment)"),
        snapshot=Snapshot(value=99.8, unit="%", year="2026", date="published 4 March 2026"),
        status=Status.MET,
        source=Source(
            name="Defra - Access to green and blue space in England (official statistics in development, March 2026)",
            url="https://www.gov.uk/government/statistics/access-to-green-and-blue-space-in-england",
            accessed=ACCESSED,
            notes=(
                "Output Area table, worksheet 1 (green and blue space, 15-minute commitment): households (residential addresses, "
                "UPRNs) within walking-network distance of a qualifying space, summed over the Output Areas in Ladywell's 7 LSOAs: "
                "5,276 of 5,288 = 99.8%. Lewisham 63.4% (137,698 households), London 73.2%, England 80.1%. Green space only: "
                "Ladywell 93.9%, Lewisham 57.5%. Blue space only: Ladywell 94.1%, Lewisham 25.3%. Doorstep standard (small space "
                "very close to home): Ladywell 25.2%, Lewisham 17.8%. First edition, so no time series yet."
            ),
        ),
        geography=GeographyLevel.LSOA_AGGREGATED,
        confidence=Confidence.HIGH,
    )
    return [access]
