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
                "Classifications CSV (data updated 17 March 2025). The EA published 2025 classifications on 6 August 2026, but as of 20 November 2026 the Catchment Data Explorer still shows 2022 as the latest year for this water body. The water body's geometry was intersected with the ONS 2022 ward "
                "boundary: it runs through Ladywell (Ladywell Fields); the upstream Keston-to-Catford water body (GB106039023260) does not. "
                "Ecological status: 2009 Poor, 2010 Poor, 2011 Bad, 2012 Bad, 2013 Poor (cycle 2; cycle 1 rated 2013 Moderate), 2014 Moderate, 2015 Moderate, 2016 Moderate, "
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
                "19.56% (SE 0.30). Cross-check: Forest Research's UK Ward Canopy Cover (citizen-science i-Tree Canopy sampling on Google aerial imagery, published via data.gov.uk dataset 43ca8e70, updated February 2026) gives Ladywell (pre-2022 ward E05000446, 160.6 ha) 26% +/- 2.53 SE from 300 points, surveyed 2020. Not used as the headline: older survey, older boundary, larger error, one survey per ward (2018-2022), so no time series. Canopy means tree crowns about 4m tall or more; young and newly planted trees are mostly not "
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
                "Lewisham 2024: 261.7 ktoe (3,044 GWh) for 301,255 residents = 10.1 MWh; domestic use 5.3 MWh per resident. London domestic use 5.4 MWh per resident (E12000007 all fuels domestic, London Total population). London "
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
    """
    Air quality regulation - one concentration indicator split into NO2 / PM2.5 / PM10 sub-indicators (November 2026 revision). The separate 'residents above
    legal limits' indicator was folded into the concentration indicator at the user's request (one
    finding, one indicator), and the concentration series moved from LAEI 2019/2022 to Defra's
    yearly PCM background maps, 2015-2024.
    """
    conc = create_descriptive_dimension(
        ward=WARD, ward_code=WARD_CODE, lens=ECO,
        dimension_name="air_quality_regulation",
        indicator="Annual average air pollution concentration (µg/m³)",
        snapshot=Snapshot(value=18.5, unit="µg/m³", year="2024", date="nitrogen dioxide (NO2), background"),
        source=Source(
            name="Defra UK-AIR - Modelled background pollution data (PCM 1x1 km annual mean maps, 2015-2024)",
            url="https://uk-air.defra.gov.uk/data/pcm-data",
            accessed="2026-11-20",
            notes=(
                "Area-weighted mean of the 1x1 km background cells overlapping the ONS 2022 Ladywell ward boundary (7 cells), "
                "from mapno2YYYY.csv, mappm25YYYYg.csv and mappm10YYYYg.csv. Ladywell NO2 2015-2024: 25.4, 26.3, 25.4, 24.0, 23.5, 21.0, 22.3, 21.4, 18.3, 18.5; "
                "PM2.5: 11.0, 12.4, 12.3, 12.5, 12.0, 10.1, 8.8, 9.4, 8.3, 9.0; PM10: 17.2, 18.5, 17.8, 18.6, 18.4, 16.6, 15.2, 17.1, 14.0, 14.4. "
                "2024 comparators (same method): Lewisham NO2 17.5, PM2.5 9.0, PM10 14.2; London (ONS region) NO2 15.9, PM2.5 8.5, "
                "PM10 13.7. Background maps represent levels away from the immediate influence of busy roads. Defra: 'The models are "
                "continually updated and improved and so the methodology often changes each year... Users should be mindful of these "
                "year to year changes when comparing model outputs between years.' "
                "Exceedance (moved from the former separate indicator; TfL/GLA LAEI 2022 Population Exposure statistics, November "
                "2025, data.london.gov.uk/dataset/london-atmospheric-emissions-inventory-laei-2022-2lg5g): in 2022, 0 of Lewisham's "
                "298,700 residents lived where NO2 exceeded the 40 µg/m³ legal limit; 272,900 (91.4%) lived above 20 µg/m³, the WHO's "
                "strictest interim target and the EU limit from 2030 (London 70.2%); every Londoner lived above the WHO 2021 guideline "
                "of 10. London: about 161,000 people above the NO2 legal limit in 2019, just over 1,000 in 2022. LAEI's 20m model gave "
                "a Ladywell area mean of 21.9 µg/m³ NO2 in 2022 (27.6 in 2019), including roadside cells, so it is not joined to the "
                "PCM series. WHO 2021 guidelines: NO2 10, PM2.5 5, PM10 15 (Ladywell PM10 was below 15 in 2023 and 2024). "
                "Defra published 2025 modelled maps on 9 October 2026 (Air quality compliance assessment 2025) from a new model, "
                "CMAQ-Urban; that is a method break, so 2025 is not added to this PCM line. Health effects text: OHID/UKHSA, 'Air pollution: applying All Our Health' (gov.uk, February 2022): short-term exposure can cause coughing, wheezing, shortness of breath and exacerbation of asthma; long-term exposure can cause cardiovascular and respiratory disease and lung cancer; children, the elderly and people with existing cardiovascular or respiratory disease are more susceptible. ULEZ attribution: GLA LAEI 2022 Summary Note (May 2026), London-wide NO2 fall 2019-2022."
            ),
        ),
        geography=GeographyLevel.WARD,
        confidence=Confidence.MEDIUM,
        target_text="UK legal annual limits: NO2 40 µg/m³, PM10 40 µg/m³, PM2.5 20 µg/m³ (10 µg/m³ by 2040). WHO 2021 guidelines: NO2 10, PM2.5 5, PM10 15.",
        trend=[
            {"period": "2015", "value": 25.4, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2016", "value": 26.3, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2017", "value": 25.4, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2018", "value": 24.0, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2019", "value": 23.5, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2020", "value": 21.0, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2021", "value": 22.3, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2022", "value": 21.4, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2023", "value": 18.3, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2024", "value": 18.5, "series": "Nitrogen dioxide (NO2)"},
            {"period": "2015", "value": 17.2, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2016", "value": 18.5, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2017", "value": 17.8, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2018", "value": 18.6, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2019", "value": 18.4, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2020", "value": 16.6, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2021", "value": 15.2, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2022", "value": 17.1, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2023", "value": 14.0, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2024", "value": 14.4, "series": "All particles up to 10 microns (PM10)"},
            {"period": "2015", "value": 11.0, "series": "Fine particles (PM2.5)"},
            {"period": "2016", "value": 12.4, "series": "Fine particles (PM2.5)"},
            {"period": "2017", "value": 12.3, "series": "Fine particles (PM2.5)"},
            {"period": "2018", "value": 12.5, "series": "Fine particles (PM2.5)"},
            {"period": "2019", "value": 12.0, "series": "Fine particles (PM2.5)"},
            {"period": "2020", "value": 10.1, "series": "Fine particles (PM2.5)"},
            {"period": "2021", "value": 8.8, "series": "Fine particles (PM2.5)"},
            {"period": "2022", "value": 9.4, "series": "Fine particles (PM2.5)"},
            {"period": "2023", "value": 8.3, "series": "Fine particles (PM2.5)"},
            {"period": "2024", "value": 9.0, "series": "Fine particles (PM2.5)"}
        ],
    )
    # One chart, three sub-indicators (grouped on the page by their bracketed suffix), so the
    # headline can name its pollutant (NO2). Tree canopy was removed from this dimension at the
    # user's request (it stays in carbon sequestration).
    parts = []
    for label, series, value in [
        ("Nitrogen dioxide, NO2", "Nitrogen dioxide (NO2)", 18.5),
        ("Fine particles, PM2.5", "Fine particles (PM2.5)", 9.0),
        ("All particles up to 10 microns, PM10", "All particles up to 10 microns (PM10)", 14.4),
    ]:
        parts.append(replace(
            conc,
            indicator=f"Annual average air pollution, micrograms per cubic metre ({label})",
            snapshot=Snapshot(value=value, unit="µg/m³", year="2024", date="background, away from the busiest roads"),
            trend=[{"period": t["period"], "value": t["value"]} for t in conc.trend if t["series"] == series],
        ))
    return parts


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
        indicator="Summer air temperature compared with the London average (°C)",
        snapshot=Snapshot(value="+0.25", unit="°C", year="2018-2022", date="summer months"),
        source=Source(
            name="GLA - Properties Vulnerable to Heat Impacts in London (Arup, 2024): LSOA air temperature (T2) layer",
            url="https://data.london.gov.uk/dataset/properties-vulnerable-to-heat-impacts-in-london-e769n",
            accessed=ACCESSED,
            notes=(
                "The geodatabase's T2 field is the high-resolution air temperature at the surface produced by Arup, averaged over "
                "summer daytime 2018-2022 for each 2021 LSOA (described in the GLA London Climate Risk Maps metadata, September 2024, "
                "which uses it as its 'mean air temperature' layer: data.london.gov.uk/dataset/climate-risk-mapping-2oxg6). "
                "Area-weighted means (weighting by LSOA area gives more weight to large, green outer-London LSOAs; the unweighted London LSOA mean, 18.07°C, would give a gap of about +0.14 to +0.19°C): Ladywell's 7 LSOAs 18.21°C, Lewisham 18.05°C, London (4,994 LSOAs) 17.96°C, so Ladywell is "
                "0.25°C warmer than London's average and Lewisham 0.09°C. LSOA values in Ladywell range from 18.00°C to 18.75°C "
                "(Lewisham 011A and 011D share an identical value, 18.754°C, so they sit in one model cell; T2 has only 1,974 distinct values across 4,994 LSOAs). The metadata describes the layer as 'summertime, daytime LST' while calling it air temperature, and its ~18°C means look like 24-hour rather than daytime means, so the page says 'summer air temperature'. This is a difference from the London average, not the classic urban heat "
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
