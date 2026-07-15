// Neighbourhood Doughnut Portrait - Main App

let wardData = null;
let currentChart = null;
let currentView = 'local'; // 'local' or 'global'

// Global function to initialize tooltips for trend charts
function initializeTooltips(dimensionName) {
    const chartId = 'trend-chart-' + dimensionName;
    const tooltipId = 'html-tooltip-' + dimensionName;

    const chartSvg = document.getElementById(chartId);
    const tooltip = document.getElementById(tooltipId);
    const periodElem = document.getElementById('html-tooltip-period-' + dimensionName);
    const valueElem = document.getElementById('html-tooltip-value-' + dimensionName);

    if (!chartSvg || !tooltip) {
        return;
    }

    const circles = chartSvg.querySelectorAll('.chart-hit-area');

    if (circles.length === 0) {
        return;
    }

    circles.forEach(function(circle, idx) {
        circle.addEventListener('mouseenter', function(evt) {
            const period = this.getAttribute('data-period');
            const value = this.getAttribute('data-value');
            const unit = this.getAttribute('data-unit') || '';

            periodElem.textContent = period;
            valueElem.textContent = value + (unit ? ' ' + unit : '');

            const rect = chartSvg.getBoundingClientRect();
            const circleX = parseFloat(this.getAttribute('cx'));
            const circleY = parseFloat(this.getAttribute('cy'));

            const svgWidth = chartSvg.viewBox.baseVal.width;
            const svgHeight = chartSvg.viewBox.baseVal.height;
            const scaleX = rect.width / svgWidth;
            const scaleY = rect.height / svgHeight;

            const pageX = rect.left + (circleX * scaleX);
            const pageY = rect.top + (circleY * scaleY);

            // Position tooltip
            tooltip.style.left = (pageX + 15) + 'px';
            tooltip.style.top = (pageY - 55) + 'px';
            tooltip.style.display = 'block';

            // Trigger fade-in animation
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 10);
        });

        circle.addEventListener('mouseleave', function() {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 200);
        });
    });
}

async function loadWardData() {
    try {
        // Add cache-busting parameter
        const response = await fetch('../data/wards/ladywell.json?v=' + Date.now());
        if (!response.ok) throw new Error('Failed to load ward data');
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('dimensions-detail').innerHTML = `
            <p class="loading" style="color: #ef5350;">
                Error loading ward data. Please ensure ladywell.json exists in data/wards/
            </p>
        `;
        return null;
    }
}

function updateCounts() {
    const socialDims = currentView === 'local'
        ? wardData.local_social
        : wardData.global_social;

    const ecologicalDims = currentView === 'local'
        ? wardData.local_ecological
        : wardData.global_ecological;

    const socialGrouped = groupDimensions(socialDims);
    const ecoGrouped = groupDimensions(ecologicalDims);

    const socialDimCount = Object.keys(socialGrouped).length;
    const ecoDimCount = Object.keys(ecoGrouped).length;

    document.getElementById('generated-at').textContent = new Date(wardData.generated_at).toLocaleString();

    // Update section headings
    const viewLabel = currentView === 'local' ? 'LOCAL' : 'GLOBAL';
    document.getElementById('social-heading').textContent = `${viewLabel} SOCIAL`;
    document.getElementById('ecological-heading').textContent = `${viewLabel} ECOLOGICAL`;
}

function renderPinnedCards() {
    const socialDims = currentView === 'local'
        ? wardData.local_social
        : wardData.global_social;

    const ecologicalDims = currentView === 'local'
        ? wardData.local_ecological
        : wardData.global_ecological;

    const socialGrouped = groupDimensions(socialDims);
    const ecoGrouped = groupDimensions(ecologicalDims);

    // Render social cards
    const socialCardsContainer = document.getElementById('social-cards');
    if (Object.keys(socialGrouped).length === 0) {
        const emptyNote = currentView === 'local'
            ? 'No local social data loaded yet.'
            : 'Global social data (supply-chain impacts) not yet loaded — see project README.';
        socialCardsContainer.innerHTML = `<p class="empty-state">${emptyNote}</p>`;
    } else {
        socialCardsContainer.innerHTML = Object.keys(socialGrouped).sort().map(dimName => {
            const indicators = socialGrouped[dimName];
            // Determine overall status (worst status wins)
            let status = 'met';
            if (indicators.some(d => d.status === 'shortfall')) status = 'shortfall';
            else if (indicators.some(d => d.status === 'descriptive_only')) status = 'shortfall';

            return `
                <button class="dimension-card" data-dimension="${dimName}" data-ring="social">
                    ${formatDimensionName(dimName)}
                    <span class="status-dot ${status}"></span>
                </button>
            `;
        }).join('');
    }

    // Render ecological cards
    const ecoCardsContainer = document.getElementById('ecological-cards');
    if (Object.keys(ecoGrouped).length === 0) {
        const emptyNote = currentView === 'local'
            ? 'Local ecological proxies (green space, air quality, flood risk) not yet loaded — see project README.'
            : 'No global ecological data loaded yet.';
        ecoCardsContainer.innerHTML = `<p class="empty-state">${emptyNote}</p>`;
    } else {
        ecoCardsContainer.innerHTML = Object.keys(ecoGrouped).sort().map(dimName => {
            const indicators = ecoGrouped[dimName];
            // Determine overall status
            let status = 'met';
            if (indicators.some(d => d.status === 'overshoot')) status = 'overshoot';
            else if (indicators.some(d => d.status === 'descriptive_only')) status = 'overshoot';

            return `
                <button class="dimension-card" data-dimension="${dimName}" data-ring="ecological">
                    ${formatDimensionName(dimName)}
                    <span class="status-dot ${status}"></span>
                </button>
            `;
        }).join('');
    }

    // Add click handlers to dimension cards
    document.querySelectorAll('.dimension-card').forEach(card => {
        card.addEventListener('click', () => {
            const dimName = card.dataset.dimension;
            const ring = card.dataset.ring;
            openDimensionDetail(dimName, ring);
        });
    });
}

function renderChart() {
    if (!wardData) return;

    currentChart = new DoughnutChart('doughnut-chart', wardData, currentView);
    currentChart.render();
    updateCounts();
    renderPinnedCards();
}

function openDimensionDetail(dimName, ring) {
    const allDims = currentView === 'local'
        ? [...wardData.local_social, ...wardData.local_ecological]
        : [...wardData.global_social, ...wardData.global_ecological];

    const grouped = groupDimensions(allDims);
    const indicators = grouped[dimName];

    if (!indicators || indicators.length === 0) return;

    // Use first indicator as representative (or blend later)
    const dimension = indicators[0];

    // Render detail view
    renderDimensionDetail(dimension, indicators, ring);

    // Show overlay
    const overlay = document.getElementById('dimension-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
}

function closeDimensionDetail() {
    const overlay = document.getElementById('dimension-overlay');
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
}

function renderTrendChart(allIndicators, dimension) {
    console.log('renderTrendChart called with:', allIndicators, dimension);

    // Check if any indicators have trend data
    const indicatorsWithTrend = allIndicators.filter(ind => ind.trend && ind.trend.length > 0);

    console.log('Indicators with trend:', indicatorsWithTrend.length);

    if (indicatorsWithTrend.length === 0) {
        console.log('No trend data available - returning empty string');
        return ''; // No trend data available
    }

    // Chart dimensions
    const width = 600;
    const height = 280;
    const margin = { top: 20, right: 120, bottom: 35, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Get all unique periods and sort them
    const allPeriods = [...new Set(indicatorsWithTrend.flatMap(ind => ind.trend.map(t => t.period)))].sort();

    // Get min/max values for Y axis
    const allValues = indicatorsWithTrend.flatMap(ind => ind.trend.map(t => t.value));
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const yMin = Math.floor(minValue - valueRange * 0.1);
    const yMax = Math.ceil(maxValue + valueRange * 0.1);

    // Create scales
    const xScale = (index) => margin.left + (index / (allPeriods.length - 1)) * chartWidth;
    const yScale = (value) => margin.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

    // Colors for different indicators
    const colors = ['#E8542D', '#4B3F8F', '#3F8F5B', '#E8A23A'];

    // Get common indicator name (without gender suffix)
    const chartTitle = indicatorsWithTrend[0].indicator.replace(/\s*\((Male|Female)\)$/, '');

    let svg = `
        <div class="detail-section">
            <h3>${chartTitle}</h3>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 600px;" id="trend-chart-${dimension.dimension}">
                <!-- Y axis -->
                <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>
                <!-- X axis -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>
    `;

    // Draw lines for each indicator
    indicatorsWithTrend.forEach((ind, indIndex) => {
        const color = colors[indIndex % colors.length];
        const points = ind.trend.map((point, i) => {
            const x = xScale(allPeriods.indexOf(point.period));
            const y = yScale(point.value);
            return `${x},${y}`;
        }).join(' ');

        svg += `
            <!-- Line for ${ind.indicator} -->
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>

            <!-- Data points -->
        `;

        ind.trend.forEach((point, i) => {
            const x = xScale(allPeriods.indexOf(point.period));
            const y = yScale(point.value);
            const unit = ind.snapshot.unit || '';
            const dataPointId = `datapoint-${dimension.dimension}-${indIndex}-${i}`;
            svg += `
                <!-- Larger invisible hit area -->
                <circle cx="${x}" cy="${y}" r="12" fill="transparent" style="cursor: pointer;"
                    data-period="${point.period}" data-value="${point.value}" data-unit="${unit}" class="chart-hit-area"></circle>
                <!-- Visible data point -->
                <circle id="${dataPointId}" cx="${x}" cy="${y}" r="4" fill="${color}" style="pointer-events: none;"></circle>
            `;
        });

        // Legend (only needed to distinguish multiple lines - the chart title
        // already names the indicator when there's just one)
        if (indicatorsWithTrend.length > 1) {
            const legendY = margin.top + indIndex * 20;
            svg += `
                <line x1="${width - margin.right + 10}" y1="${legendY}" x2="${width - margin.right + 30}" y2="${legendY}" stroke="${color}" stroke-width="2"/>
                <text x="${width - margin.right + 35}" y="${legendY + 4}" font-size="11px" fill="#333">${ind.indicator.replace('Healthy life expectancy at birth ', '')}</text>
            `;
        }
    });

    // X-axis labels - use midpoint year for rolling periods
    allPeriods.forEach((period, i) => {
        if (i % 2 === 0 || i === allPeriods.length - 1) {
            const x = xScale(i);
            // Extract midpoint year from period like "2011-2013" or "2011 to 2013"
            const years = period.match(/\d{4}/g);
            const label = years && years.length === 2
                ? Math.round((parseInt(years[0]) + parseInt(years[1])) / 2).toString()
                : period;
            svg += `
                <text x="${x}" y="${height - margin.bottom + 20}"
                      text-anchor="middle" font-size="10px" fill="#666">${label}</text>
            `;
        }
    });

    // Y-axis labels
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const value = yMin + (yMax - yMin) * (i / yTicks);
        const y = yScale(value);
        svg += `
            <text x="${margin.left - 10}" y="${y + 4}"
                  text-anchor="end" font-size="10px" fill="#666">${value.toFixed(1)}</text>
            <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#999" stroke-width="1"/>
        `;
    }

    svg += `
            </svg>
        </div>
    `;

    // Create tooltip and append to body (outside stacking context)
    const dimName = dimension.dimension;
    setTimeout(() => {
        // Remove any existing tooltip
        const existingTooltip = document.getElementById('html-tooltip-' + dimName);
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create new tooltip appended to body
        const tooltip = document.createElement('div');
        tooltip.id = 'html-tooltip-' + dimName;
        tooltip.style.cssText = 'position: fixed; display: none; background: rgba(255, 255, 255, 0.98); border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 8px; padding: 10px 14px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1); pointer-events: none; z-index: 99999; font-family: var(--font-sans); white-space: nowrap; opacity: 0; transition: opacity 0.2s ease; backdrop-filter: blur(8px);';

        const periodDiv = document.createElement('div');
        periodDiv.id = 'html-tooltip-period-' + dimName;
        periodDiv.style.cssText = 'font-weight: 600; margin-bottom: 3px; color: #241226; font-size: 13px; letter-spacing: -0.01em;';

        const valueDiv = document.createElement('div');
        valueDiv.id = 'html-tooltip-value-' + dimName;
        valueDiv.style.cssText = 'color: #4B3F8F; font-size: 15px; font-weight: 700; letter-spacing: -0.02em;';

        tooltip.appendChild(periodDiv);
        tooltip.appendChild(valueDiv);
        document.body.appendChild(tooltip);

        initializeTooltips(dimName);
    }, 100);

    console.log('Trend chart SVG generated, length:', svg.length);
    return svg;
}

function renderDimensionDetail(dimension, allIndicators, ring) {
    const container = document.getElementById('detail-container');

    // Determine overall status
    let status = dimension.status;
    if (ring === 'social') {
        if (allIndicators.some(d => d.status === 'shortfall')) status = 'shortfall';
        else if (!status || status === 'descriptive_only') status = 'shortfall';
    } else {
        if (allIndicators.some(d => d.status === 'overshoot')) status = 'overshoot';
        else if (!status || status === 'descriptive_only') status = 'overshoot';
    }

    const ringLabel = ring === 'social' ? 'SOCIAL FOUNDATION' : 'ECOLOGICAL CEILING';
    const statusLabel = {
        'met': 'Within bounds',
        'shortfall': 'Shortfall',
        'overshoot': 'Overshoot'
    }[status] || 'No data';

    // Group indicators by their base name (without gender suffix)
    const indicatorGroups = {};
    allIndicators.forEach(ind => {
        const baseName = ind.indicator.replace(/\s*\((Male|Female)\)$/, '');
        if (!indicatorGroups[baseName]) {
            indicatorGroups[baseName] = [];
        }
        indicatorGroups[baseName].push(ind);
    });

    // Custom descriptions for specific dimensions
    const dimensionDescriptions = {
        'health': "Healthy life expectancy in Lewisham sits below London's average of 62.9 years and has fallen from 65 years a decade ago, with a sharp drop during the pandemic. This gap suggests health inequalities are affecting how long residents live without serious illness or disability.",
        'housing': "The private rented sector now houses 40% of Lewisham residents, nearly double its share 20 years ago - and rents in it have grown 50% since 2011 (70% in the borough's historically cheaper streets) while incomes rose barely 12%. The council's own strategy identifies that gap as the single biggest cause of homelessness here: the ending of a private tenancy is behind roughly half of homelessness cases, more than any other reason. The same private rented sector also has a quality problem - a quarter of its homes are estimated to fall short of basic decency standards. Rough sleeping, meanwhile, has proven hard to shift - up nearly a third since 2021/22 to 345 people in 2025/26, despite a brief dip the year before.",
        'food': "Lewisham's diet-related health mostly compares favourably with London: food insecurity risk (7.8% of residents) and dental decay in five-year-olds (18.9%) both run below the London average, and diagnosed diabetes (7.2% of adults) sits well under England's rate. Child obesity is the exception. Reception-age obesity (10%) is close to average, but by Year 6 it has climbed to 24.5% - more than double - a jump repeated every year since national measurement began in 2006/07, and slightly worse than London's Year 6 average. That reception-to-Year-6 widening, rather than any single indicator in isolation, is the borough's clearest diet-related health signal.",
        'water': "Lewisham sits within Thames Water's supply area, one of England's most seriously water-stressed regions - a status confirmed in both the 2013 and 2021 government classifications and unchanged since. Average per-person water use has stayed well above the levels needed to meet the Environment Act's 2038 target of 122 litres a day: England's figure was around 136.5 litres in 2024/25, only a few percentage points below its 2019/20 baseline. Thames Water's own 2050 target (123 litres) is looser than the government's, because the company says it isn't yet confident of reaching it. New London developments, including in Lewisham, must already meet a stricter 105-litre planning standard - a gap between what's built and what's actually used."
    };

    const plainEnglishText = dimensionDescriptions[dimension.dimension] ||
        `${allIndicators.length} indicator${allIndicators.length > 1 ? 's' : ''} tracked for this dimension. ${status === 'shortfall' ? 'Below the social foundation.' : ''} ${status === 'overshoot' ? 'Exceeding the ecological ceiling.' : ''} ${status === 'met' ? 'Meeting the target.' : ''}`;

    // Function to get contextual "What this measures" text for each indicator
    function getWhatThisMeasures(baseName, firstIndicator, indicators) {
        // Health-specific explanations
        if (baseName === 'Healthy life expectancy at birth') {
            const maleData = indicators.find(ind => ind.indicator.includes('Male'));

            if (maleData && maleData.trend && maleData.trend.length > 0) {
                const latestValue = maleData.snapshot.value;
                const oldestValue = maleData.trend[0].value;
                const decline = oldestValue - latestValue;

                // Approximate total life expectancy (HLE is typically ~70-80% of total LE)
                // Using rough estimate of 80 years total LE for Lewisham
                const estimatedTotalLE = 80;
                const hlePercentage = ((latestValue / estimatedTotalLE) * 100).toFixed(0);

                return `Healthy life expectancy measures the average number of years a person can expect to live in good health from birth. At ${latestValue} years in Lewisham (approximately ${hlePercentage}% of total life expectancy), this sits below London's average of 62.9 years. The indicator has declined by ${decline.toFixed(1)} years from ${oldestValue} years a decade ago, with a particularly sharp drop during the pandemic years. This widening gap suggests growing health inequalities affecting how long residents live without serious illness or disability.`;
            }
        }

        if (baseName === 'Health index score') {
            if (firstIndicator.trend && firstIndicator.trend.length > 0) {
                const oldestValue = firstIndicator.trend[0].value;
                const latestValue = firstIndicator.snapshot.value;
                const change = latestValue - oldestValue;
                const changeDirection = change > 0 ? 'increased' : 'decreased';

                return `The Health Index is a composite measure developed by ONS that combines over 50 indicators across three key domains: Healthy Lives (mortality, morbidity, mental health), Healthy People (personal behaviors like smoking, physical activity), and Healthy Places (environmental factors including air quality, crime, housing). Each domain is weighted equally and indexed to England 2015 as a baseline of 100. Lewisham's score of ${latestValue} sits just below the national average, having ${changeDirection} by ${Math.abs(change).toFixed(1)} points since 2015. While the index shows relative stability compared to the sharper decline in healthy life expectancy, it still indicates room for improvement across multiple health domains.`;
            }
        }

        // Housing-specific explanations
        if (baseName === 'Median rent as % of median pay') {
            return `This indicator measures housing affordability by comparing median private rents to median gross pay. At 43.6% in Lewisham (2025 Q4), it exceeds the 30% threshold that housing experts consider the ceiling for sustainable costs - beyond it, households typically cut back on essentials and have little cushion against a rent rise or income shock. Lewisham's ratio has hovered in the low-to-mid 40s since 2015 rather than trending steadily in either direction, suggesting a persistently strained affordability band rather than a temporary spike. With so little slack, even a modest rent rise or a missed pay cheque can be enough to tip a household toward eviction or needing the council's help to avoid homelessness.`;
        }

        if (baseName === 'Households in temporary accommodation') {
            return `Temporary accommodation is emergency housing the council must provide to households legally assessed as homeless and in priority need - nightly-paid hotels (the most expensive and often least suitable), council-owned properties, and privately leased units. Despite the name, stays commonly run for years rather than months, so families can spend a child's entire primary school career in a single hotel room. Its use here has been driven by rising private rents pricing people out of the market and by evictions outpacing the supply of settled homes to move people into. It functions as both a safety net keeping people off the street and a warning sign of how much strain the wider housing system is under.`;
        }

        if (baseName === '% non-decent homes') {
            return `A home is "non-decent" if it fails to meet basic standards for safety, state of repair, facilities, or thermal comfort - the Decent Homes Standard the government has used since 2006 to judge housing quality. These are modelled estimates from national survey data rather than an inspection of every home, so year-to-year movement should be read as broad direction rather than precise change. Lewisham's rate has run below the London average in three of the last four rounds, but the 2024 uptick is worth watching alongside the borough's other housing pressures: disrepair and overcrowding often cluster in the same low-income, high-rent households already stretched by rent affordability and temporary accommodation.`;
        }

        if (baseName === 'Rough sleepers') {
            return `Rough sleeping counts people seen sleeping on streets, in doorways, parks, or other outdoor locations by outreach workers over the year - the most visible, and most dangerous, form of homelessness. Lewisham was one of nine London boroughs to achieve a temporary reduction in 2024/25, but the rise since suggests those gains were fragile rather than structural: without sustained investment in prevention and move-on accommodation, people cycle back onto the street as fast as they're helped off it. Each person counted here faces acute health risks, vulnerability to violence, and barriers to support, making rough sleeping both a symptom of the borough's housing crisis and one of its most severe consequences.`;
        }

        // Food-specific explanations
        if (baseName === '% population with moderate to severe food insecurity') {
            return `This measures the share of Lewisham residents living in neighbourhoods classed by government modelling as at highest risk of food insecurity - not a direct survey of household experience. At 7.8% in 2022, Lewisham sits comfortably below both the London (13.3%) and England (10%) averages, and the risk fell from 9.6% in 2021. The council's own Food Justice Action Plan cites the same figure as evidence that, despite the visible strain on foodbanks since the cost-of-living crisis, structural food insecurity risk here is lower than in most of London - though only two years of data exist so far, too short to call this a settled trend.`;
        }

        if (baseName === '% of children in reception and year 6 with obesity') {
            return `Obesity is measured separately for Reception-age children (4-5) and Year 6 (10-11) through the National Child Measurement Programme; Lewisham's 2024/25 rates were 10.0% and 24.5%. The near-doubling between the two ages has held in every year since measurement began in 2006/07, both nationally and in Lewisham, and points to the primary-school years as where obesity risk accumulates fastest. Lewisham's Year 6 rate has run above the London average every year on record; Reception has mostly tracked close to it. The council's Whole Systems Approach to Obesity has an explicit ambition to halve childhood obesity by 2030.`;
        }

        if (baseName === '% of children in reception and year 6 with dental decay') {
            return `Tooth decay in children is tracked through separate national surveys: a biennial one for 5-year-olds (Reception age) and a single one-off survey of Year 6 children in 2022/23, the first and only time that age group has been surveyed nationally. Lewisham's most recent Reception figure (18.9%, 2023/24) and Year 6 figure (9.9%, 2022/23) both sit below the London and England averages - Lewisham had the 4th-lowest Reception decay rate of London's 33 boroughs in 2024. The Reception trend has been volatile rather than steadily improving, dropping to 12.4% in 2021/22 before rising again, which NHS commissioners partly attribute to reduced dental access during and after the pandemic.`;
        }

        if (baseName === '% of people over 17 years old with type 2 diabetes') {
            return `This tracks the share of Lewisham residents aged 17+ with diabetes recorded on their GP's disease register (both type 1 and type 2, though type 2 accounts for roughly 90% of diagnosed cases). At 7.2% in 2024/25, up steadily from 5.7% in 2012/13, Lewisham has stayed significantly below the England average (7.9%) throughout, and close to London's (7.1%). The rise mirrors a national trend in an ageing, increasingly overweight population; Lewisham's Whole Systems Approach to Obesity explicitly frames type 2 diabetes prevention as one of the direct health benefits of its weight-management work, alongside cardiovascular risk and joint disease.`;
        }

        // Water-specific explanations
        if (baseName === 'Per capita water consumption (litres/day)') {
            return `Per capita consumption measures the average litres of water each person uses per day, drawn from national statutory reporting rather than metered data specific to Lewisham (no ward or borough breakdown is published). England-wide use was around 136.5 litres per person per day in 2024/25, down only slightly from the 140-litre 2019/20 baseline the government uses to track progress. The Environment Act 2021 sets a national target of 122 litres by 2038 and 110 by 2050 - reductions of 13% and 21% respectively from where usage sits today. Thames Water's own resource plan commits to a less ambitious 123-litre target by 2050, citing insufficient confidence that the tighter national goal is achievable in its area.`;
        }

        if (baseName === 'Areas of water stress') {
            return `This records a one-off regulatory classification, not a measurement that moves year to year: whether a water company's area has enough water resource, relative to expected demand, to avoid regular restrictions during a drought. Thames Water - which supplies Lewisham - was designated "seriously water stressed" when the Environment Agency first ran this assessment in 2013, and remained so when it repeated the exercise in 2021, alongside several other companies newly added to the list. The designation underpins Thames Water's ability to introduce compulsory water metering and its 2024 Water Resources Management Plan, which forecasts a supply deficit in parts of its area by 2050 without further leakage reduction, demand reduction, and new supply projects including a reservoir and a water recycling scheme.`;
        }

        // Generic fallback
        return null;
    }

    // Function to get council/government context for each dimension
    // Returns an ARRAY of { title, year, url, summary } objects - most dimensions have one,
    // but a dimension can have up to 3 when its indicators span genuinely distinct policy
    // areas that no single document covers (see DIMENSION_PAGE_SPECIFICATION.md Section 3).
    function getCouncilContext(dimensionName) {
        // Health dimension council context
        if (dimensionName === 'health') {
            return [{
                title: 'Lewisham Health & Wellbeing Strategy — Going further with prevention',
                year: '2025-2030',
                url: 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/strategies/health-and-wellbeing-strategy-2025-2030.pdf',
                summary: 'The strategy responds to stark health inequalities in Lewisham, where there\'s a 6.6-year gap in male life expectancy between the most and least deprived areas (2020-21), with cancer and cardiovascular disease as the leading causes of death. Rather than focusing solely on healthcare services, the council is targeting three root causes of poor health: poverty, housing, and education — particularly where these intersect with health and care. The approach emphasizes prevention at the community level, aiming to tackle the fundamental drivers of health inequality before they manifest as serious illness, shifting resources upstream from reactive treatment to proactive intervention.'
            }];
        }

        // Housing dimension council context - 2 documents for now (capped per current
        // guidance): Housing Strategy covers rent affordability, supply, AND housing
        // conditions/non-decent homes (its Priority 3); Homelessness Strategy covers
        // temporary accommodation + rough sleeping. A dedicated enforcement/licensing
        // document exists (Policies to Support the Regulation and Enforcement of the
        // Private Rented Housing Sector, 2021) but was judged less interesting to surface
        // here - see git history if it's wanted back.
        if (dimensionName === 'housing') {
            return [
                {
                    title: "Lewisham's Housing Strategy 2020-26",
                    year: '2020-2026',
                    url: 'https://lewisham.moderngov.co.uk/documents/s75863/Housing%20Strategy%202020-26.pdf',
                    summary: `<p>Lewisham's housing strategy sets out five priorities: delivering more genuinely affordable homes, preventing homelessness, improving housing quality and safety, supporting independent living, and strengthening communities. It documents private rented sector rents growing 50% between 2011-2017 (70% in the borough's historically cheaper areas) while household incomes rose only around 12% over a comparable period - the gap it identifies as the single biggest driver of homelessness, since the ending of a private tenancy is the most common reason households approach the council for help. The strategy also estimates a quarter of private rented homes are non-decent. Its actions span all of this: building new council and social rent homes, bringing empty properties back into use, pushing for longer and more secure private tenancies, and expanding licensing to raise standards.</p>`
                },
                {
                    title: 'Lewisham Homelessness and Rough Sleeping Strategy',
                    year: '2023-2026',
                    url: 'https://lewisham.moderngov.co.uk/ieDecisionDetails.aspx?ID=9725',
                    summary: `<p>The council assisted over 3,000 households experiencing homelessness in the past year, driven by cost-of-living pressures and the lasting impact of COVID-19 on vulnerable residents. It organises its response around four priorities:</p>
                    <ul>
                        <li><strong>Prevention first</strong> - early intervention, financial help with rent arrears, and protection from illegal eviction, connecting at-risk residents to support before they lose their home.</li>
                        <li><strong>Expanding supply</strong> - building new council homes, bringing empty properties back into use, and increasing temporary accommodation capacity for families facing sudden housing loss.</li>
                        <li><strong>Health-led support for rough sleepers</strong> - closer working with health services on the physical and mental health needs and substance misuse that often accompany rough sleeping, with specific provision for people with unclear immigration status and for women's needs.</li>
                        <li><strong>Cross-service partnership</strong> - mobilising council departments alongside borough-wide charities and public services.</li>
                    </ul>
                    <p>Its stated commitment: "no individual should be forced to sleep on the streets" - despite 13 years of budget cuts constraining what the council can do alone.</p>`
                }
            ];
        }

        // Food dimension council context - 3 documents: Food Justice Action Plan covers
        // food insecurity; Whole Systems Approach to Obesity covers obesity and touches
        // diabetes (explicitly framed as a prevention benefit); a dedicated NHS dental
        // commissioning presentation covers dental decay, which neither of the other two
        // documents addresses.
        if (dimensionName === 'food') {
            return [
                {
                    title: 'Lewisham Food Justice Action Plan - Update Report (Health & Wellbeing Board)',
                    year: '2023-2027',
                    url: 'https://lewisham.moderngov.co.uk/documents/s123350/6%20Food%20Justice%20action%20plan%20update%20REPORT.pdf',
                    summary: `<p>Lewisham launched its Food Justice Action Plan in April 2023 as food bank demand rose sharply after the pandemic and into the cost-of-living crisis, and has since become a Sustainable Food Places Silver Award borough and passed a motion to become a "Right to Food" borough. Its Community Food Justice Grants had, by December 2025, funded 31 local organisations reaching over 20,000 people, and the programme - now funded to April 2027 - sits formally under the council's Whole Systems Approach to Obesity as part of the wider food environment.</p>`
                },
                {
                    title: 'Lewisham Whole Systems Approach to Obesity and weight management medication',
                    year: '2026',
                    url: 'https://lewisham.moderngov.co.uk/documents/s123840/06b.%20Systems%20Approach%20to%20Obesity%20and%20weight%20management%20medication.pdf',
                    summary: `<p>Lewisham's Whole Systems Approach to Obesity (WSAO), running since 2016, is the council's system-wide response to a borough where 21.8% of Reception children and 39% of Year 6 children carry excess weight, and where obesity-related hospital admissions run three times the national rate (62 vs 20 per 100,000, 2019-20). Its most recent focus is integrating new weight-loss medications (Wegovy, Mounjaro) into wider prevention work rather than a standalone fix - both are limited to patients with a BMI over 35 and a weight-related condition, referred through specialist NHS services, since unsupported use tends to see weight regained within two years of stopping. The council frames type 2 diabetes prevention as a direct benefit of this work.</p>`
                },
                {
                    title: 'Dental Services Lewisham (NHS South East London ICB)',
                    year: '2026',
                    url: 'https://lewisham.moderngov.co.uk/mgConvert2PDF.aspx?ID=121820',
                    summary: `<p>Lewisham's NHS dental commissioning is run jointly across South East London by the ICB rather than the council, but the council receives regular updates because access shapes outcomes like decay rates. Lewisham has 35 NHS general dental practices, delivering 98.1% of its contracted treatment target in 2024/25 - above the South East London average. Community Dental Services (run by King's) provide targeted outreach - supervised toothbrushing, oral health education and personalised support for children with visible decay - through food banks, libraries and family hubs; paediatric referrals into these services have risen 40% since before the pandemic. Lewisham's 2024 child dental decay rate was the fourth-lowest of London's 33 boroughs.</p>`
                }
            ];
        }

        // Water dimension council context - 2 documents: Thames Water's own Water
        // Resources Management Plan covers consumption/target and the water-stress driver
        // behind it; the London Plan's water efficiency policy covers the planning-level
        // response Lewisham (as local planning authority) actually applies.
        if (dimensionName === 'water') {
            return [
                {
                    title: 'Thames Water Resources Management Plan 2024 (WRMP24)',
                    year: '2024',
                    url: 'https://www.thameswater.co.uk/news/2024/oct/thames-water-publishes-its-water-resources-management-plan',
                    summary: `<p>Thames Water forecasts it will need an extra one billion litres of water a day for its customers by 2050, and that several of its supply zones would run into deficit under severe drought conditions without further action. Its October 2024 plan, approved by government, sets out three strands:</p>
                    <ul>
                        <li><strong>Cutting leakage</strong> - reducing losses from the distribution network to around 14.9% of total supply by 2049/50.</li>
                        <li><strong>Reducing demand</strong> - bringing average consumption down to 123 litres per person per day by 2050, looser than the government's 110-litre goal because the company says it isn't yet confident the tighter figure is achievable.</li>
                        <li><strong>New supply</strong> - a new reservoir for the South East and a water recycling project in West London, to close the gap leakage and demand reduction alone can't cover.</li>
                    </ul>
                    <p>Leakage and demand reduction together account for roughly four-fifths of the plan's contribution to closing the supply-demand gap.</p>`
                },
                {
                    title: "The London Plan — Policy 5.15 (Water use and supplies)",
                    year: '2021',
                    url: 'https://www.london.gov.uk/what-we-do/planning/london-plan/current-london-plan/london-plan-chapter-five-londons-response/pol-14',
                    summary: `<p>Because Thames Water's area is seriously water-stressed, the Mayor of London's London Plan requires new homes to be built water-efficient rather than relying on the water company alone to close the gap: Policy 5.15 sets a maximum of 105 litres of mains water per person per day for new residential development (110 including a small allowance), and requires major non-residential schemes to meet the BREEAM "excellent" standard for water use. As the local planning authority, Lewisham Council applies this standard - alongside smart metering, water-saving fittings, and retrofit measures - to development it approves, while the Mayor separately holds water companies to account on leakage and demand reduction through the London Environment Strategy.</p>`
                }
            ];
        }

        // Generic fallback
        return null;
    }

    // Function to get neighbour voices for each dimension
    function getNeighbourVoices(dimensionName) {
        // Health dimension neighbour voices
        if (dimensionName === 'health') {
            return [
                {
                    name: 'Femi',
                    location: 'Ladywell Road',
                    date: 'Jul 2026',
                    quote: 'Two of my neighbours have moved out this year — priced out, not by choice.'
                },
                {
                    name: 'Sarah',
                    location: 'Hither Green',
                    date: 'Jun 2026',
                    quote: 'The new GP surgery closed down before it even opened properly. Now the nearest one has a three-week wait for appointments.'
                },
                {
                    name: 'Marcus',
                    location: 'Brockley',
                    date: 'May 2026',
                    quote: 'My dad\'s diabetes clinic moved further away. He\'s 72 and doesn\'t drive — managing his condition just got harder.'
                },
                {
                    name: 'Aisha',
                    location: 'Telegraph Hill',
                    date: 'Apr 2026',
                    quote: 'The park near us used to have a running track. Now it\'s just mud. Where are families supposed to stay active?'
                },
                {
                    name: 'Tom',
                    location: 'Crofton Park',
                    date: 'Mar 2026',
                    quote: 'Mental health support waiting times are six months. That\'s not support, that\'s abandonment.'
                }
            ];
        }

        // Housing dimension neighbour voices
        if (dimensionName === 'housing') {
            return [
                {
                    name: 'Rachel',
                    location: 'Ladywell Fields',
                    date: 'Jul 2026',
                    quote: 'Our landlord raised the rent by £200 a month. We\'re a family of four and now over half my salary goes on rent alone.'
                },
                {
                    name: 'James',
                    location: 'Hither Green Lane',
                    date: 'Jun 2026',
                    quote: 'Been in temporary accommodation for two years now. They call it temporary, but my daughter has started and finished reception year in the same hotel room.'
                },
                {
                    name: 'Amara',
                    location: 'Ladywell Village',
                    date: 'May 2026',
                    quote: 'The damp in our flat keeps coming back. Landlord says he\'ll fix it but never does. My son\'s asthma has gotten worse.'
                },
                {
                    name: 'David',
                    location: 'Crofton Park',
                    date: 'Apr 2026',
                    quote: 'I work full time as a teaching assistant. Can\'t afford a one-bed flat on my own anymore — had to move back with my mum at 34.'
                },
                {
                    name: 'Sofia',
                    location: 'Brockley Road',
                    date: 'Mar 2026',
                    quote: 'We got our eviction notice last month. Section 21, no reason given. Just two months to find somewhere we can afford, which doesn\'t exist.'
                },
                {
                    name: 'Michael',
                    location: 'Ladywell Station',
                    date: 'Feb 2026',
                    quote: 'Three viewings this week. Each flat had 15 other people looking. One landlord asked for six months rent upfront. How is that legal?'
                }
            ];
        }

        // Food dimension neighbour voices
        if (dimensionName === 'food') {
            return [
                {
                    name: 'Priya',
                    location: 'Ladywell Fields',
                    date: 'Jul 2026',
                    quote: 'The food bank queue outside the community centre used to be short. Now it wraps round the block every Thursday.'
                },
                {
                    name: 'Kwame',
                    location: 'Verdant Lane',
                    date: 'Jun 2026',
                    quote: 'My daughter\'s school stopped doing the fruit and veg scheme this year. Budget cuts, they said.'
                },
                {
                    name: 'Grace',
                    location: 'Ladywell Village',
                    date: 'May 2026',
                    quote: 'Waited four months for an NHS dentist appointment for my son. In the end we paid privately, which we couldn\'t really afford.'
                },
                {
                    name: 'Daniel',
                    location: 'Brockley Road',
                    date: 'Apr 2026',
                    quote: 'Diabetes runs in my family. The GP\'s dietician clinic has a three month wait, so I\'ve mostly had to work it out myself.'
                },
                {
                    name: 'Amaka',
                    location: 'Hither Green Lane',
                    date: 'Mar 2026',
                    quote: 'Since the Healthy Start vouchers got easier to claim, it\'s made a real difference for fruit and milk each week.'
                },
                {
                    name: 'Tomasz',
                    location: 'Crofton Park',
                    date: 'Feb 2026',
                    quote: 'Every fast food place on the high street does a meal deal under £4. The greengrocer can\'t compete on price.'
                }
            ];
        }

        // Water dimension neighbour voices
        if (dimensionName === 'water') {
            return [
                {
                    name: 'Priya',
                    location: 'Ladywell Fields',
                    date: 'Jul 2026',
                    quote: 'The hosepipe ban again this summer. Feels like every year now, not just the really dry ones.'
                },
                {
                    name: 'Oliver',
                    location: 'Algernon Road',
                    date: 'Jun 2026',
                    quote: 'Thames Water finally fixed the leak that had been running down our street for three months. Took about a dozen calls.'
                },
                {
                    name: 'Fatima',
                    location: 'Lewisham Way',
                    date: 'May 2026',
                    quote: 'Got a smart meter fitted in the spring. Bill actually went down once I stopped topping up the paddling pool every week.'
                },
                {
                    name: 'Ben',
                    location: 'Ladywell Village',
                    date: 'Apr 2026',
                    quote: 'Water pressure drops to nothing most evenings around six. Something to do with everyone on the street cooking dinner at once, apparently.'
                },
                {
                    name: 'Grace',
                    location: 'Brockley Road',
                    date: 'Mar 2026',
                    quote: 'Put a water butt in after the last drought warning. Doesn\'t feel like much on its own, but it\'s something.'
                },
                {
                    name: 'Daniel',
                    location: 'Hither Green Lane',
                    date: 'Feb 2026',
                    quote: 'Read that our water company still loses something like a fifth of what it treats to leaks before it even reaches a tap. Hard to take the hosepipe ban seriously after that.'
                }
            ];
        }

        // Generic fallback
        return null;
    }

    let html = `
        <div class="ring-label ${ring}">${ringLabel}</div>
        <h2 class="detail-dimension-name">${formatDimensionName(dimension.dimension)}</h2>
        <div class="detail-status-pill ${status}">${statusLabel}</div>
        <p class="plain-english">${plainEnglishText}</p>
        <div class="section-divider"></div>
    `;

    // Render a chart and source for each indicator group
    const groupKeys = Object.keys(indicatorGroups);
    groupKeys.forEach((baseName, groupIndex) => {
        const indicators = indicatorGroups[baseName];
        const firstIndicator = indicators[0];

        // Show snapshot values for all indicators in this group
        // For the first group (HLE), only show Male. For others, show all.
        const indicatorsToShow = (groupIndex === 0 && indicators.length > 1)
            ? indicators.filter(ind => ind.indicator.includes('Male'))
            : indicators;

        indicatorsToShow.forEach((ind, idx) => {
            const value = ind.snapshot.value !== null
                ? `${ind.snapshot.value}${ind.snapshot.unit ? ' ' + ind.snapshot.unit : ''}`
                : 'No data';
            const label = indicatorsToShow.length > 1
                ? ind.indicator.replace(baseName, '').trim().replace(/^\(|\)$/g, '')  // Extract gender/type suffix
                : ind.indicator;

            html += `
                <div class="value-readout">
                    <div class="big-value">${value}</div>
                    <div class="indicator-meta">${label} · ${ind.snapshot.year || 'recent'}</div>
                </div>
            `;
        });

        // Render trend chart for this group (no divider before chart)
        html += renderTrendChart(indicators, firstIndicator);

        // Add source line for this group
        html += `
            <div class="source-line">
                Source: <a href="${firstIndicator.source.url}" target="_blank">${firstIndicator.source.name}</a> · last updated ${firstIndicator.source.accessed || 'recently'}
            </div>
        `;

        // Add "What this measures" section for this group
        const whatThisMeasures = getWhatThisMeasures(baseName, firstIndicator, indicators);
        if (whatThisMeasures) {
            html += `
                <div class="detail-section">
                    <h3>What this measures</h3>
                    <p>${whatThisMeasures}</p>
                </div>
            `;
        }

        // Add divider after each group except the last
        if (groupIndex < groupKeys.length - 1) {
            html += '<div class="section-divider"></div>';
        }
    });

    // Add council/government context section(s) for the entire dimension - up to 3 documents
    // when the dimension's indicators span genuinely distinct policy areas (see 3.2 in spec)
    const councilContexts = getCouncilContext(dimension.dimension);
    if (councilContexts && councilContexts.length > 0) {
        html += '<div class="section-divider"></div>';
        html += '<h3 class="council-context-heading">Council & Government Context</h3>';
        councilContexts.forEach(ctx => {
            html += `
                <div class="council-context">
                    <h4>${ctx.title}</h4>
                    <div class="council-date">${ctx.year}</div>
                    <div class="council-summary">${ctx.summary}</div>
                    ${ctx.url ? `<div class="source-line">Source: <a href="${ctx.url}" target="_blank">${ctx.title}</a></div>` : ''}
                </div>
            `;
        });
    }

    // Add neighbour voices section for the entire dimension
    const neighbourVoices = getNeighbourVoices(dimension.dimension);
    if (neighbourVoices && neighbourVoices.length > 0) {
        html += '<div class="section-divider"></div>';
        html += '<h3 class="neighbour-voices-heading">Neighbour Voices</h3>';

        const voicesPerPage = 3;
        const totalPages = Math.ceil(neighbourVoices.length / voicesPerPage);

        html += `<div id="voices-container-${dimension.dimension}" class="voices-container"></div>`;

        if (totalPages > 1) {
            html += `
                <div class="voice-pagination">
                    <button class="voice-nav-btn" id="voice-prev-${dimension.dimension}">←</button>
                    <span class="voice-page-indicator" id="voice-page-indicator-${dimension.dimension}">1 / ${totalPages}</span>
                    <button class="voice-nav-btn" id="voice-next-${dimension.dimension}">→</button>
                </div>
            `;
        }

        html += '<button class="add-take-btn">Add your take</button>';
    }

    container.innerHTML = html;

    // Set up pagination for neighbour voices
    if (neighbourVoices && neighbourVoices.length > 0) {
        let currentVoicePage = 0;
        const voicesPerPage = 3;
        const totalPages = Math.ceil(neighbourVoices.length / voicesPerPage);

        function renderVoicesPage(page) {
            const start = page * voicesPerPage;
            const end = start + voicesPerPage;
            const voicesToShow = neighbourVoices.slice(start, end);

            const voicesContainer = document.getElementById(`voices-container-${dimension.dimension}`);
            if (voicesContainer) {
                let voicesHtml = '';
                voicesToShow.forEach(voice => {
                    voicesHtml += `
                        <div class="voice-block">
                            <div class="voice-meta">${voice.name}, ${voice.location} · ${voice.date}</div>
                            <div class="voice-body">${voice.quote}</div>
                        </div>
                    `;
                });
                voicesContainer.innerHTML = voicesHtml;
            }

            // Update pagination controls
            const prevBtn = document.getElementById(`voice-prev-${dimension.dimension}`);
            const nextBtn = document.getElementById(`voice-next-${dimension.dimension}`);
            const indicator = document.getElementById(`voice-page-indicator-${dimension.dimension}`);

            if (prevBtn) prevBtn.disabled = page === 0;
            if (nextBtn) nextBtn.disabled = page === totalPages - 1;
            if (indicator) indicator.textContent = `${page + 1} / ${totalPages}`;
        }

        // Initial render
        renderVoicesPage(0);

        // Set up event listeners for pagination
        const prevBtn = document.getElementById(`voice-prev-${dimension.dimension}`);
        const nextBtn = document.getElementById(`voice-next-${dimension.dimension}`);

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentVoicePage > 0) {
                    currentVoicePage--;
                    renderVoicesPage(currentVoicePage);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentVoicePage < totalPages - 1) {
                    currentVoicePage++;
                    renderVoicesPage(currentVoicePage);
                }
            });
        }
    }
}

function switchView(newView) {
    currentView = newView;

    // Update toggle buttons
    document.getElementById('toggle-local').classList.toggle('active', newView === 'local');
    document.getElementById('toggle-global').classList.toggle('active', newView === 'global');

    // Re-render chart
    renderChart();
}

function groupDimensions(dimensions) {
    // Group dimensions by name
    const grouped = {};
    dimensions.forEach(dim => {
        if (!grouped[dim.dimension]) {
            grouped[dim.dimension] = [];
        }
        grouped[dim.dimension].push(dim);
    });
    return grouped;
}


function formatDimensionName(name) {
    return name
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    wardData = await loadWardData();
    if (wardData) {
        renderChart();

        // Set up toggle buttons
        document.getElementById('toggle-local').addEventListener('click', () => switchView('local'));
        document.getElementById('toggle-global').addEventListener('click', () => switchView('global'));

        // Set up back button
        document.getElementById('back-button').addEventListener('click', closeDimensionDetail);
    }
});
