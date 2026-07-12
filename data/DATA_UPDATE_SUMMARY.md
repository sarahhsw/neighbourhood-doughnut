# Ladywell Neighbourhood Doughnut - Data Update Summary

## Date: 2026-07-12

## Overview

Updated all Local Social dimensions with real Lewisham borough data from Trust for London's Poverty and Inequality Indicators (2023 data).

## Dimensions Updated with Real Data (7 total)

### 1. Health
- **Indicator**: Female life expectancy
- **Value**: 82.92 years (vs London avg: 84.13 years)
- **Status**: ⚠ **SHORTFALL** (-1.21 years)
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

### 2. Housing
- **Indicator**: Median rent as % of median pay
- **Value**: 43.6% (vs affordable threshold: 30%)
- **Status**: ⚠ **SHORTFALL** (+13.6 percentage points)
- **Context**: Better than London avg (51.6%) but above affordable threshold
- **Additional**: Temporary accommodation: 18.72 per 1,000 households
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

### 3. Food
- **Indicator**: Childhood obesity rate (Reception & Year 6)
- **Value**: 24.5% (vs London avg: 23.2%)
- **Status**: ⚠ **SHORTFALL** (+1.3 percentage points)
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: MEDIUM

### 4. Education
- **Indicator**: GCSE attainment (grades 9-4 in English & Maths)
- **Value**: 63.1% (vs London avg: 70.5%)
- **Status**: ⚠ **SHORTFALL** (-7.4 percentage points)
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

### 5. Income
- **Indicator**: Poverty rate (after housing costs)
- **Value**: 28% (vs London avg: 26%)
- **Status**: ⚠ **SHORTFALL** (+2 percentage points)
- **Additional**: Child poverty: 30% (London avg: 31%)
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

### 6. Jobs
- **Indicator**: Unemployment rate
- **Value**: 6.1% (equals London avg: 6.1%)
- **Status**: ✓ **MET**
- **Context**: Out-of-work benefits: 17.7% (above London 15.2%)
- **Context**: Low pay: 13.4% (better than London 16.1%)
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

### 7. Equality
- **Indicator**: Pay inequality ratio (80th:20th percentile)
- **Value**: 2.43 (vs England avg: 1.52)
- **Status**: ⚠ **SHORTFALL** (60% more unequal)
- **Interpretation**: Top earners make 2.43× more than bottom earners
- **Source**: Trust for London - Lewisham Poverty Profile 2023
- **Confidence**: HIGH

## Dimensions Kept from Previous Build (9 total)

These dimensions lack Lewisham-specific data or have placeholder values:

- Water & sanitation (✓ MET - universal access)
- Connectivity (📊 DESCRIPTIVE - no official target)
- Community (📊 DESCRIPTIVE - regional data only)
- Culture (📊 DESCRIPTIVE - no official target)
- Mobility (📊 DESCRIPTIVE - ward-level PTAL available but not fetched)
- Energy (📊 DESCRIPTIVE - 43% EPC A-C from previous estimate)
- Peace & Justice (📊 DESCRIPTIVE - crime data available but not fetched)
- Political Voice (📊 DESCRIPTIVE - no official target)
- Social Equity (📊 DESCRIPTIVE - regional data only)

## Summary Statistics

### Local Social Dimensions (16 total)
- ✓ **Met**: 2 (Water, Jobs)
- ⚠ **Shortfall**: 6 (Health, Housing, Food, Education, Income, Equality)
- 📊 **Descriptive only**: 8 (no official targets)

### Status Changes from Previous Build
- **Income**: Changed from placeholder to real data (28% poverty rate)
- **Jobs**: Changed from placeholder to MET with real data (6.1% unemployment)
- **Education**: Changed from descriptive to SHORTFALL with real data (63.1% attainment)
- **Equality**: Changed from descriptive to SHORTFALL with real data (2.43 ratio)
- **Health**: Updated with real life expectancy data (82.92 years)
- **Housing**: Updated with rent affordability data (43.6%)
- **Food**: Updated with childhood obesity data (24.5%)

## Data Source

**Primary Source**: Trust for London - Lewisham Poverty and Inequality Indicators
- URL: https://trustforlondon.org.uk/data/boroughs/lewisham-poverty-and-inequality-indicators/
- Data Year: 2022/23
- Accessed: 2026-07-12
- Coverage: Borough-level (not ward-specific)
- Population: 299,810 (2021 Census)

## Data Caveats

1. **Geographic Granularity**: All data is at Lewisham **borough** level, not Ladywell **ward** level. Ward-specific variation may exist.

2. **Poverty Data Pooling**: Poverty rates pool 5 years of survey data (2018/19-2023/24, excluding 2020/21 due to COVID impact).

3. **Comparison Benchmarks**: Most comparisons are against **London average**, not national targets.

4. **Missing Ward-Level Data**: Need to extract:
   - Ward-level PTAL scores (TfL data)
   - Ward-level IMD 2025 deciles
   - Ward-level crime rates (MPS data)
   - Ward-level EPC ratings (ONS postcode data)

## Next Steps for Data Enhancement

### High Priority (Ward-level data available)
1. **Mobility**: Extract PTAL scores for Ladywell ward from TfL GIS data
2. **Peace & Justice**: Get ward-level crime rates from MPS dataset
3. **Energy**: Aggregate postcode-level EPC data for Ladywell ward

### Medium Priority (Borough data available)
4. **Connectivity**: Extract Lewisham digital exclusion data from GLA
5. **Culture**: Count cultural venues in Lewisham from GLA Cultural Infrastructure Map

### Low Priority (No targets / Regional data only)
6. **Community**: Keep as descriptive (no borough-level Community Life Survey data)
7. **Political Voice**: Borough-level turnout from LG Inform
8. **Social Equity**: Keep as descriptive (regional data only)

## Historical Trend Data

**Status**: Not yet implemented

**Recommendation**: Trust for London pages often include time series charts. Could extract historical trends for:
- Poverty rates (2010-2023)
- Child poverty (2010-2023)
- Unemployment (2010-2023)
- GCSE attainment (2010-2023)

Would enable trend visualization in the frontend showing progress/regression over time.

## Files Updated

1. `/data/manual/lewisham_real_data.json` - Structured data from Trust for London
2. `/data/pipeline/build_local_social_with_real_data.py` - Updated dimension builder
3. `/data/wards/ladywell_local_social.json` - Generated dimensions with real data
4. `/site/data/wards/ladywell.json` - Assembled portrait for frontend
5. `/data/lookups/dimension_data_sources.json` - Catalog of all data sources from Excel

## Visualization Impact

The updated data will now show **more accurate bar lengths** in the doughnut chart:
- Housing: 13.6 percentage point shortfall (bar extends 45% inward)
- Education: 7.4 percentage point shortfall (bar extends 10% inward)
- Equality: 60% more unequal (bar extends 60% inward)
- Jobs: Met target (no bar, at foundation level)

All bars now reflect **real 2023 Lewisham data** instead of placeholders.
