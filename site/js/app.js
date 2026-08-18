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
        const response = await fetch('data/wards/ladywell.json?v=' + Date.now());
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

// Human-readable label for each geography_of_data value - see DIMENSION_PAGE_SPECIFICATION.md
// for the full taxonomy. Anything not WARD means the figure shown is inherited from a wider
// area applied uniformly to every ward in it, not measured for Ladywell specifically.
const GEOGRAPHY_LABELS = {
    'ward': 'Ward',
    'lsoa_aggregated': 'Neighbourhood (LSOA)',
    'msoa_aggregated': 'Neighbourhood (MSOA)',
    'postcode_aggregated': 'Postcode area',
    'borough_inherited': 'Borough (Lewisham)',
    'water_company': 'Water company (Thames Water)',
    'london_inherited': 'London-wide',
    'england': 'England-wide',
    'uk': 'UK-wide',
    'national_inherited': 'England/UK-wide'
};

function geographyLabel(geo) {
    return GEOGRAPHY_LABELS[geo] || null;
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
        'housing': "The private rented sector now houses 27% of Lewisham residents, nearly double its 14% share in 2001. Lewisham's Housing Strategy found rents grew 50% between 2011 and 2017, against incomes up just 12% between 2010 and 2018 - and names ending of a private tenancy as the single biggest cause of local homelessness, behind roughly half of cases as of its 2020 assessment, more than any other reason. That shows up in both temporary accommodation and rough sleeping, up nearly a third since 2021/22 to 345 people in 2025/26. The same stretched, low-income renters are also more likely to live in a non-decent home: MHCLG puts 16% of private rented homes as non-decent in 2024, above the 12.9% average for all tenures.",
        'food': "Lewisham's diet-related health mostly compares favourably with London: food insecurity risk (7.8% of residents) and dental decay in five-year-olds (18.9%) both run below the London average, and diagnosed diabetes (7.2% of adults) sits well under England's rate. Child obesity is the exception. Reception-age obesity (10%) is close to average, but by Year 6 it has climbed to 24.5% - more than double - a jump repeated every year since national measurement began in 2006/07, and slightly worse than London's Year 6 average. That reception-to-Year-6 widening, rather than any single indicator in isolation, is the borough's clearest diet-related health signal.",
        'water': "Lewisham sits in Thames Water's supply area, classified as seriously water-stressed in both 2013 and 2021. Per-person use has stayed persistently high: England's 2024/25 average was around 136.5 litres a day, well above the Environment Act's 2038 target of 122 litres - a gap that's barely narrowed since 2019/20.",
        'mobility': "Ladywell's transport accessibility is hyper-local: real planning assessments show excellent PTAL 6 immediately around Ladywell station, falling to good PTAL 4 just a few streets away, since TfL scores access point by point rather than for the ward as a whole. Lewisham's sustainable mode share - trips made on foot, by bike, or by public transport - stood at 72.8% in 2024, short of the Mayor's Transport Strategy target of 80% by 2041 that Lewisham's own transport plan also adopts, and still above London's 67.6% average despite a recent decline from a high of 75.6%.",
        'equality': "Lewisham's highest-paid fifth earn 2.43 times more per hour than the lowest-paid fifth, a wider gap than England's 1.52 average - the only indicator here with a genuine borough figure. The other three describe London as a whole, because no equivalent breakdown exists for Lewisham specifically: the bottom half of the city's households hold just 4% of its wealth, and gender and ethnicity pay gaps (14% and over 22% respectively) both run well above the national picture. None of these numbers are new arrivals - each reflects a long-standing, slow-moving pattern rather than a recent shift - but taken together they describe income, wealth, gender and ethnicity inequalities that compound rather than cancel out.",
        'community': "Loneliness and neighbourhood belonging have moved in the same direction nationally: the share of adults feeling lonely often or always crept up to 6.6% in 2024/25, while strong neighbourhood belonging slipped to 62%, down from a pandemic-era high of 65% in 2020/21. Neither figure has a Lewisham-specific equivalent - both come from DCMS's England-only Community Life Survey - though London itself has reported weaker neighbourhood belonging than the England average in every year the two are compared.",
        'political_voice': "Lewisham's own local election turnout swung sharply: just 20.88% voted in 2022, before a genuinely contested three-way race lifted it to 42.14% in May 2026, when the Green Party ended decades of Labour control of the council. That volatility sits alongside a steadier national trend: the share of English adults who feel they can personally influence decisions affecting their local area has fallen to 24% in 2024/25, below every year recorded between 2013/14 and 2021/22 (25-28%). Civic participation - contacting a councillor, signing a petition, attending a public meeting - has settled at 34%, down from a pandemic-era peak near 42% but level with the pre-2023 norm of 2021/22.",
        'culture': "Lewisham's own arts funding is concentrated on a small number of organisations: its Arts & Culture Fund gave £150,000 a year to a single anchor organisation, The Albany, and split roughly £236,000 across eight others over the 2022-25 cycle. That sits within a wider English picture of squeezed council arts budgets, which have fallen 61% in real terms nationally since 2010 (from £18.67 to £6.47 per person a year). Participation itself has held up better than funding: 90.6% of adults nationally engaged with the arts in 2024/25, just below the survey's 2023/24 peak.",
        'education': "GCSE attainment measures the share of pupils leaving compulsory schooling with at least a standard pass (grade 4) in both English and Maths - the government's baseline for further study, apprenticeships and most jobs. In Lewisham, 66% of pupils met it in 2023/24, up from 61% the year before and 59% in 2019, fully reversing the pandemic-era dip. That leaves the borough five points below London's 71% for the same year - London being the strongest-performing region in England - so roughly one in three Lewisham pupils still leaves school without this baseline qualification, a marker closely tied to what comes next in education or work.",
        'connectivity': "Broadband and mobile infrastructure have expanded fast nationally - full fibre reached 82% of UK premises by January 2026, up from just 10% in 2019 - and Lewisham's own coverage (81%) sits close to that national figure. Usage lags behind availability, though: Ladywell scores 2.5 out of 10 on a composite digital-exclusion risk index, toward the low end nationally, consistent with London's younger demographic and stronger broadband access generally - but that gap is more about skills and affordability than infrastructure, and is unlikely to have closed quickly given how slowly those barriers typically shift. 5G mobile coverage is the one indicator here without a local figure, shown at 81% of England's landmass.",
        'energy': "Ladywell's homes run well behind London's energy-efficiency average: 43% hold an EPC of C or above, against 56% across the city as a whole, and it isn't Lewisham's most efficient ward - that's Lewisham Central at 78%. Fuel poverty compounds the gap: 13.8% of Lewisham households (17,700) were fuel poor in 2022, above England's 13.1% average that year, and Lewisham was the worst-performing inner-London borough in the count before that. The two aren't unrelated: the fuel poverty metric itself only counts a household as fuel poor if its home also rates D-G for energy efficiency.",
        'social_cohesion': "Trust, cross-background cohesion and volunteering have all drifted down together nationally over the past decade: the share who think most neighbours can be trusted fell from 48% to 40%, and adults giving any unpaid help slipped to 54%, the lowest since records began. That volunteering fall is driven almost entirely by formal, organisation-based volunteering (down to 28%, from 37%), while informal neighbourly help has held up far better - the erosion looks concentrated in structured civic participation rather than in people helping each other directly. Pride in local area, tracked only since 2023/24, has stayed flat around 60%. None of these figures has a Lewisham-specific equivalent; all come from DCMS's England-wide Community Life Survey.",
        'income': "Poverty in Lewisham runs above the London average - 28% of residents after housing costs, against 26% citywide - despite an unemployment rate roughly level with London's. That combination points to low pay rather than joblessness as the sharper driver: 17.7% of working-age residents are on out-of-work benefits, well above London's 15.2%, even though residents in work are less likely than the London average to be paid below the London Living Wage. Deprivation is unevenly spread within the ward itself - one of Ladywell's seven neighbourhoods sits among the most deprived tenth of England, despite the ward scoring comparatively well on education specifically.",
        'peace_justice': "Lewisham's recorded crime rate has run at roughly 93 to 94 incidents per 1,000 residents through the year to early 2026, according to Metropolitan Police figures - modestly above London's borough-wide average. Violence and sexual offences are the largest single category the police record here, including in Ladywell specifically. Nationally, Lewisham sits close to the middle of England's 296 local authorities for overall deprivation (172nd, Index of Multiple Deprivation 2025), a position little changed since 2019; crime contributes under a tenth of that composite score, alongside income, employment, education, health, housing and living environment. Locally, one of Ladywell's seven neighbourhoods falls within England's most-deprived fifth on that same overall measure."
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

        // Housing-specific explanations
        if (baseName === 'Median rent as % of median pay') {
            return `This indicator compares mean rent for a one-bed property to median gross pay - a standard measure of housing affordability. At 43.6% in Lewisham (2025 Q4), it sits below London's own 52% average for the same measure, but well above both the 42% average for the rest of England and the 30%-of-income rule of thumb widely used to judge whether housing costs are sustainable. The ratio has held in the low-to-mid 40s since 2015 rather than easing or worsening steadily, suggesting a persistently strained affordability band rather than a temporary spike - one that's typical for London, not exceptional to Lewisham. With so little slack, even a modest rent rise or a missed pay cheque can be enough to tip a household toward eviction or needing the council's help.`;
        }

        if (baseName === 'Households in temporary accommodation') {
            return `Temporary accommodation is emergency housing the council must provide to households legally assessed as homeless and in priority need - nightly-paid hotels (the most expensive and often least suitable), council-owned properties, and privately leased units. Despite the name, stays commonly run for years rather than months, so families can spend a child's entire primary school career in a single hotel room. Its use here has been driven by rising private rents pricing people out of the market and by evictions outpacing the supply of settled homes to move people into. It functions as both a safety net keeping people off the street and a warning sign of how much strain the wider housing system is under.`;
        }

        if (baseName === '% non-decent homes (all tenure)') {
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
            return `Per capita consumption measures the average litres of water each person uses per day, drawn from national statutory reporting rather than metered data specific to Lewisham (no ward or borough breakdown is published). England-wide use was around 136.5 litres per person per day in 2024/25, down only slightly from the 140-litre 2019/20 baseline the government uses to track progress. The Environment Act 2021 target - 122 litres by 2038, 110 by 2050 - exists because the Environment Agency's National Framework for Water Resources projects a supply-demand gap of several billion litres a day by mid-century, driven by climate change shrinking supply, population growth increasing demand, and a parallel push to cut unsustainable abstraction from rivers and aquifers. Cutting demand is the fastest and cheapest of the three levers used to close that gap (alongside cutting leakage and building new supply), which is why it was set as a statutory target rather than left as an aspiration. Thames Water's own resource plan commits to a less ambitious 123-litre target by 2050, citing insufficient confidence that the tighter national goal is achievable in its area.`;
        }

        if (baseName === 'Areas of water stress') {
            return `This records a one-off regulatory classification, not a measurement that moves year to year: whether a water company's area has enough water resource, relative to expected demand, to avoid regular restrictions during a drought. Thames Water - which supplies Lewisham - was designated "seriously water stressed" when the Environment Agency first ran this assessment in 2013, and remained so when it repeated the exercise in 2021, alongside several other companies newly added to the list. The designation underpins Thames Water's ability to introduce compulsory water metering and its 2024 Water Resources Management Plan, which forecasts a supply deficit in parts of its area by 2050 without further leakage reduction, demand reduction, and new supply projects including a reservoir and a water recycling scheme.`;
        }

        // Mobility-specific explanations
        if (baseName === 'Public Transport Accessibility Levels') {
            return `PTAL scores how easy it is to reach public transport from a given point, combining walk time to the nearest stops with how frequently services run there - it's calculated location by location, not as a single ward or borough figure. Real Lewisham Council planning assessments within Ladywell show that variation directly: sites right by Ladywell station score PTAL 6 ("excellent"), while sites a few streets away score PTAL 4 ("good") - both comfortably above the London-wide low end of the 0-6b scale, but a reminder that "Ladywell's PTAL" depends heavily on which part of the ward you mean. TfL refreshed its scoring toolkit in 2025 to reflect network changes since its 2015 baseline, including the Elizabeth line.`;
        }

        if (baseName === '% of trips by sustainable modes') {
            return `This tracks the share of all trips in Lewisham made by walking, cycling, or public transport, drawn from TfL's London Travel Demand Survey - a continuous household survey rather than a full census of journeys, so borough-level figures can move around with sample size. At 72.8% in 2024, Lewisham sits above London's 67.6% average, but the figure has fallen from a recent high of 75.6% and the borough still ranks near the bottom of Inner London. The Mayor's Transport Strategy - and Lewisham's own transport plan - set a shared goal of 80% by 2041, up from a 63% London-wide baseline in 2015; closing that gap is the explicit aim behind the council's low-traffic-neighbourhood and school streets schemes.`;
        }

        // Equality-specific explanations
        if (baseName === 'Pay inequality (80th:20th percentile ratio)') {
            return `This compares hourly pay at the 80th percentile (higher earners) against the 20th percentile (lower earners) among people working in Lewisham, using ONS's Annual Survey of Hours and Earnings. A ratio of 2.43 means the top-paid fifth earn nearly two and a half times more per hour than the bottom-paid fifth here - noticeably wider than England's 1.52 average, and close to London's own average of around 2.5, reflecting a labour market where well-paid professional and financial jobs sit alongside a large low-paid service sector. Trust for London's data page was refreshed in January 2026 and now reports pay inequality falling in most London boroughs since the previous release; Lewisham was not named among the small number of boroughs where it rose, which suggests some narrowing, though Lewisham's precise updated figure and the year-by-year trend behind it aren't available here.`;
        }

        if (baseName === '% of wealth held by the poorest 50%') {
            return `This measures how household wealth - property, pensions, savings, and other assets, not income - is split between the richest and poorest halves of the population, drawn from the ONS Wealth and Assets Survey. No Lewisham or borough figure is published, so the number shown is London-wide: households in the bottom half of London's wealth distribution hold just 4% of the capital's total wealth, while the richest tenth hold more than 60%. Because property makes up a larger share of wealth in London than anywhere else in Great Britain, and London property prices have risen far faster than incomes, this gap is structurally wider here than the England-wide picture (where the poorest half hold closer to a tenth of total wealth). Wealth gaps like this tend to compound over generations, since assets - unlike pay - can be passed on and grow largely independently of work.`;
        }

        if (baseName === 'Gender pay gap (mean hourly pay)') {
            return `This compares average hourly pay for men and women across all employee jobs, drawn from ONS's Annual Survey of Hours and Earnings. No Lewisham-specific figure is published, so the number shown - a 14% gap in 2023 - is London-wide. It is driven less by unequal pay for the same job (illegal since 1970) than by occupational segregation and the "motherhood penalty": women remain more likely to work part-time or in lower-paid sectors, often after taking on a larger share of childcare and caring responsibilities. London's gap has been reported as unusually persistent, not falling over the past decade the way the national figure has - a pattern researchers link to the capital's especially high childcare costs and its concentration of very high-paying, male-dominated finance and tech roles at the top of the distribution.`;
        }

        if (baseName === 'Ethnicity pay gap (median hourly pay, White vs ethnic minority employees)') {
            return `This compares median hourly pay between White employees and employees from Black, Asian, and other minority ethnic backgrounds, drawn from ONS's Annual Population Survey. No Lewisham-specific figure is published, so the number shown is London-wide, where the gap has consistently been the largest of any English region - more than 22%, versus roughly 1% across the rest of England and Wales. That's a striking contrast given London is also the most ethnically diverse region: Black, African, Caribbean and Black British workers alone make up close to half of that group nationally while concentrated in London, yet are paid proportionately less here than the same gap would predict elsewhere. Researchers attribute the London-specific scale of the gap to a mix of occupational segregation, discrimination in hiring and promotion, and the capital's unusually high-paying finance sector being disproportionately White at senior levels.`;
        }

        // Community-specific explanations
        if (baseName === '% adults reported feeling lonely often or always') {
            return `This tracks the share of adults who say they feel lonely often or always - the most severe end of a scale used annually by DCMS's Community Life Survey, England's main survey of civic and community life. It's published for England only, with no Lewisham-specific figure available. Younger adults and people with a limiting long-term illness report substantially higher rates than the headline figure.`;
        }

        if (baseName === '% adults felt strongly belonged to their neighbourhood') {
            return `This measures the share of adults who say they belong very strongly or fairly strongly to their immediate neighbourhood, one of the Community Life Survey's core measures of social cohesion. The pandemic-era peak, when people spent far more time in their local area, has since eased. The measure is published for England only, but where the survey does break results down by region, London has reported weaker neighbourhood belonging than the England average in every year compared - a gap that predates the pandemic and has persisted since.`;
        }

        // Political voice-specific explanations
        if (baseName === '% turnout in local election') {
            return `Lewisham elects its Mayor and 54 councillors together on one ballot paper, so there's a single borough-wide turnout figure rather than separate mayoral and council numbers. The 2010 spike is a poor comparison point - it coincided with a UK general election held the same day, which inflates turnout well beyond what a normal local round produces. More tellingly, turnout swung from a 20.88% low in 2022 to 42.14% in May 2026 - the election where the Green Party won a council majority for the first time, ending decades of Labour control - suggesting turnout here tracks how genuinely contested the race feels at least as much as any steady long-term trend. No ward-level Ladywell figure is published or reliably reconstructable from public sources, so the borough-wide figure is shown.`;
        }

        if (baseName === '% adults that have engaged in civic participation') {
            return `Civic participation covers contacting a local councillor or MP, signing a petition, or attending a public meeting or rally, in person or online, but excludes voting itself - a DCMS Community Life Survey measure published for England only, with no Lewisham or London breakdown. Current levels sit well down from a 2020/21 peak, when lockdown-era mutual aid and local campaigning likely pushed participation unusually high. No survey was run in 2022/23, leaving a gap in the series between the pandemic peak and its settling-down since.`;
        }

        if (baseName === '% adults agreed they can personally influence decisions affecting local area') {
            return `This tracks the share of adults who agree - definitely or tending to - that they personally can influence decisions affecting their local area, from the same Community Life Survey and with the same England-only, no-2022/23-round limitations as civic participation above. At 24% in 2024/25, it has settled at its lowest recorded level: every year from 2013/14 to 2021/22 held in a narrow 25-28% band, before dropping to 23% in 2023/24. Unlike civic participation, which has recovered somewhat since its pandemic peak, this measure of felt influence has not - a gap between doing more (contacting officials, signing petitions) and feeling it changes anything.`;
        }

        // Culture-specific explanations
        if (baseName === '# of cultural venue per 1,000 population') {
            return `This is meant to measure the density of cultural venues - museums, theatres, music venues, artist workspaces and similar - relative to population, drawn from the GLA's Cultural Infrastructure Map, which tags each venue it catalogues by borough. No verified Lewisham venue count is available, so no rate is shown here rather than an estimated one. What's known instead is qualitative: Lewisham anchors include the Horniman Museum and Gardens, The Albany in Deptford, the Broadway Theatre in Catford, Trinity Laban Conservatoire, and Goldsmiths, University of London, and the borough was London Borough of Culture in 2022. Its Deptford/New Cross Creative Enterprise Zone - one of London's original zones, running since 2018 - has also brought hundreds of affordable artist studios into the borough, though these sit outside the Cultural Infrastructure Map's own venue categories.`;
        }

        if (baseName === '£ local authority funding in art & culture') {
            return `This tracks Lewisham Council's own spending on arts and culture, distinct from money the sector raises independently or receives from Arts Council England or the Mayor of London. The figure shown - £386,000 over the 2022-25 grant cycle - is specifically the council's Arts & Culture Fund: £150,000 a year to a single "cultural anchor" organisation, The Albany, plus roughly £236,000 split across eight further organisations including Entelechy Arts, Irie!, LEAN and Heart n Soul. It doesn't capture the council's full culture and library service budget, which is larger and isn't published in comparable form. Nationally, council arts spending has fallen 61% in real terms since 2010 - from £18.67 to £6.47 per resident a year - a squeeze widely attributed to over a decade of reduced central government funding to local authorities generally, arts being a non-statutory service more exposed to cuts than areas like social care.`;
        }

        if (baseName === 'Active participation') {
            return `This measures the share of adults who engaged with the arts - attending, watching or taking part, in person or online - at least once in the past year, from DCMS's annual Participation Survey. It's an England-wide figure only: the survey publishes results down to broad regions, not by borough, so no Lewisham-specific number exists. At 90.6% in 2024/25, participation sits close to record levels but has eased slightly from a 91.4% peak in 2023/24. The survey began in October 2021, replacing the discontinued Taking Part survey run on different methodology, so no earlier comparable trend exists. It's a distinct measure from council arts funding above: one counts money councils choose to spend, the other counts what people actually do, and the two aren't tracked together by either source.`;
        }

        // Education-specific explanations
        if (baseName === 'GCSE attainment (grades 9-4 in English & Maths)') {
            return `This tracks the government's standard pass benchmark - grade 4 or above in both English and Maths GCSE - the threshold used to judge whether a pupil leaves compulsory education equipped for further study or work; anyone missing it is generally required to keep resitting English and/or Maths post-16. Lewisham's 66% in 2023/24 sits five points below London's 71% for the same year, though the borough has closed the gap that opened during the pandemic: results dipped through the disrupted 2020-2022 exam years before recovering past pre-pandemic levels to a new recent high. Attainment 8, a broader points score across 8 subjects, tells a similar story - up 2.5 points on 2019. The remaining shortfall matters because English and Maths passes gate entry to most level 3 courses and apprenticeships.`;
        }

        // Connectivity-specific explanations
        if (baseName === 'Full fibre broadband coverage (% of premises)') {
            return `Full fibre broadband means the fibre-optic cable runs all the way to the building rather than switching to old copper wiring for the last stretch, giving faster and more reliable speeds than earlier "superfast" broadband. UK coverage has grown from just 10% of premises in 2019 to 82% by January 2026 - one of the fastest infrastructure build-outs in the country's history, driven by competing commercial rollouts (Openreach, Virgin Media O2, and dozens of smaller "altnet" builders) rather than a single programme. Lewisham's own figure sits close to that national trajectory: 81% of premises have full fibre access, per an independent aggregator built on Ofcom's own postcode-level coverage data - gigabit-capable coverage (a broader measure that also includes cable) runs higher still, at 92%.`;
        }

        if (baseName === '5G mobile coverage (% of landmass, at least one operator)') {
            return `This measures how much of England's landmass - not premises or population - has outdoor 5G signal from at least one of the four mobile network operators, at Ofcom's "high confidence" reporting threshold. It reached 81% in 2025, up from 76% the year before, though landmass coverage understates real-world access in a place like Lewisham: dense urban areas are covered far more completely than the rural land dragging the national average down, since indoor 4G coverage alone already reaches 97-99% of premises in English urban areas versus 77-85% in rural ones. No Lewisham- or London-specific coverage percentage is shown here, even though Ofcom and ONS both publish exactly this kind of borough-level breakdown.`;
        }

        if (baseName === 'Digital exclusion risk score (0-10 scale)') {
            return `Ladywell scores 2.5 out of 10 on the Digital Exclusion Risk Index (DERI), a composite built from 11 indicators - age, disability, lack of qualifications, social grade, and broadband access and speed - across the ward's 7 constituent neighbourhoods, normalised so the score is comparable across Great Britain rather than just within Lewisham. That's toward the low end of the scale, consistent with London generally scoring low nationally thanks to its younger demographic and stronger broadband access - though risk isn't uniform across the ward: individual neighbourhood scores within Ladywell range from 2.1 to 3.2. Several of the index's components are dated (some drawn from the 2011 Census), so it's best read as relative risk rather than a precise current count. For an absolute sense of scale, if London-wide rather than Lewisham-specific: the GLA estimated around 270,000 Londoners were completely offline in 2022, with a further 2 million using the internet only rarely, when it launched a Digital Inclusion Service combining a loaned device, low-cost connectivity, and basic skills support.`;
        }

        // Energy-specific explanations
        if (baseName === '% properties with EPC Band C or above') {
            return `EPC (Energy Performance Certificate) ratings run A, the most efficient, to G, the least, based on estimated running costs, insulation, heating type and fabric quality rather than an actual bill - Band C or above is the level national policy repeatedly uses as its improvement marker for both landlords and fuel-poor households. In Ladywell specifically, 43% of assessed homes reach Band C or above, well below London's 56% average and near the less efficient end of Lewisham's own wards, which ranged from 37% (Hither Green) to 78% (Lewisham Central) in the same 2022 count. No ward-level time series exists to chart a trend - Lewisham Observatory's Ward Profiles are a point-in-time exercise, last run in 2022 - but the borough's older, often converted housing stock is the likeliest driver of a lower starting point for retrofit than newer parts of London.`;
        }

        if (baseName === '% households in fuel poverty') {
            return `Fuel poverty (the Low Income Low Energy Efficiency, or LILEE, metric DESNZ adopted in 2021) counts a household as fuel poor only if it is both low income and living in a home rated Band D or below for energy efficiency - not simply a measure of who struggles to pay a bill. Lewisham's 13.8% (17,700 households) in the 2022 data year sat above England's 13.1% average for the same year, and in the 2020 data year Lewisham was reported as the worst-performing inner-London borough at 14.1%. Because the metric bundles income with home efficiency, it moves with both energy prices and how much of the housing stock has been retrofitted. Some Lewisham neighbourhoods run far higher than the borough figure - the council's own public health reporting cites rates above 23% in parts of the borough and above 20% in seven small areas.`;
        }

        // Social cohesion-specific explanations
        if (baseName === '% adults agreed that people in neighbourhood can be trusted') {
            return `This asks whether people agree that "many of the people in this neighbourhood can be trusted" - a standard measure of generalised social trust, one of the building blocks researchers use to explain why some communities find it easier than others to organise informally, look out for each other, or resolve local disputes without escalation. Nationally it has fallen from 48% when the survey moved to its current push-to-web method in 2013/14 to 40% now, though it's held in a narrow 40-42% band since 2016/17 rather than continuing to slide. No Lewisham figure is published, but the survey's own regional breakdown shows London running well below the England average - trust tends to read lower in dense, high-turnover urban areas than in smaller or more settled communities, a pattern this borough likely shares.`;
        }

        if (baseName === '% adults agreed people from different backgrounds get along well together') {
            return `This tracks agreement that the local area is "a place where people from different backgrounds get along well together" - a direct measure of perceived cohesion in ethnically and culturally mixed areas like Lewisham, one of London's more diverse boroughs. The England figure rose through the pandemic years before easing back since. Younger adults are consistently the least likely age group to agree (78-79% among 16-34s versus up to 88% among older residents), a gap that has held across multiple survey years rather than being a one-off finding. No Lewisham-specific figure exists, so this shows the national backdrop the borough sits within rather than a local reading.`;
        }

        if (baseName === '% proud to live in their local area') {
            return `This is one of the newer questions DCMS added to the Community Life Survey, first asked in 2023/24, so it doesn't yet have the decade-long trend some of the other indicators on this page do. 60% of adults in England agreed they were proud to live in their local area in 2024/25, barely moved from 59% the year before. Where people explained their pride, feeling safe was the most common reason (69%), ahead of green and natural spaces (63%) and friendly, respectful neighbours (58%) - a reminder that "pride" here is downstream of concrete, everyday conditions rather than an abstract attachment. No Lewisham-specific breakdown of this measure has been published yet.`;
        }

        if (baseName === '% adults that have participated in formal/informal volunteering') {
            return `This combines two kinds of unpaid help: "formal" volunteering through a group, club or organisation, and "informal" volunteering - helping someone who isn't a relative, unprompted by any organisation, like checking on an elderly neighbour or picking up shopping for someone unwell. 54% of adults in England did at least one of the two in the 12 months to 2024/25, the lowest this combined measure has been since the survey adopted its current method in 2013/14, and down from 62% just before the pandemic. The two halves moved differently: formal volunteering has fallen further and shows no sign of recovering (28%/year, down from 37% pre-pandemic), while informal help - which spiked to 54% in 2020/21 as mutual-aid groups formed during lockdowns - has cooled but held up comparatively better (44%). No Lewisham-specific figure exists; this is the England-wide picture only.`;
        }

        // Income-specific explanations
        if (baseName === 'Overall poverty rate (after housing costs)') {
            return `Poverty here means household income below 60% of the local median, after housing costs are deducted - the standard relative-poverty threshold. At 28% in Lewisham, above London's 26% average, this figure pools five years of national survey data (2018/19-2023/24, excluding the pandemic-disrupted 2020/21) because a single year's sample is too small to give a reliable borough-level estimate on its own - which also means it moves slowly and won't reflect a single year's cost-of-living shock immediately. Trust for London's wider commentary notes poverty rose in Lewisham across the decade to 2019/20, both before and after housing costs, though a precise year-by-year figure for that rise isn't available here.`;
        }

        if (baseName === 'Child poverty rate (after housing costs)') {
            return `This is the same after-housing-costs, 60%-of-median poverty measure as the overall rate, restricted to households with children, using the same pooled 2018/19-2023/24 survey data. At 30%, Lewisham sits fractionally below London's 31% average - a rare indicator on this page where the borough isn't worse than the city as a whole - though both figures mean roughly three in ten local children are growing up below the poverty line. A different, more commonly quoted figure in council and public health reporting - DWP/HMRC's "children in low income families" statistic - uses a before-housing-costs, administrative definition and typically shows a higher number for Lewisham; it isn't used here because mixing the two definitions would overstate the change between them.`;
        }

        if (baseName === 'Unemployment rate') {
            return `This is the Annual Population Survey's modelled unemployment rate - the share of economically active residents who are out of work and looking for it - not the narrower claimant count of people actually receiving unemployment-related benefits. At 6.1%, Lewisham matched the London average in 2023, the most recent period with a matching benchmark available. Other, differently-defined figures suggest the picture may have worsened since: Lewisham's claimant count rate (a distinct, administrative measure) rose from 5.7% to 6.5% between March 2023 and March 2024. Unemployment being level with London while out-of-work benefit claims and poverty both run higher points toward low pay and economic inactivity, not joblessness itself, as the sharper local pressure.`;
        }

        if (baseName === '% paid below London Living Wage') {
            return `The London Living Wage is an hourly rate calculated independently by the Resolution Foundation to reflect London's actual cost of living (£13.85 from April 2025), set by the Living Wage Foundation and higher than the government's statutory National Living Wage - employers who pay it do so voluntarily, through accreditation rather than legal requirement. At 13.4%, the share of Lewisham's working residents paid below it runs well under London's 16.1% average, one of the few indicators on this page where the borough compares favourably. That doesn't mean pay is generous locally - it means a smaller share sits below this specific, London-cost-of-living-adjusted floor than in the city overall, even as poverty and benefit claims here remain above average.`;
        }

        if (baseName === '% on out-of-work benefits') {
            return `This tracks the share of working-age residents claiming out-of-work benefits (Universal Credit or legacy equivalents, where claimants are not in paid work) - a DWP administrative count, not a survey estimate. At 17.7%, Lewisham runs well above London's 15.2% average, and sits toward the higher end of the London range (Enfield highest at 21.4%, Richmond upon Thames lowest at 7.9%, August 2025). Combined with an unemployment rate level with London's, this gap suggests the gulf isn't primarily people actively looking for work and not finding it, but a wider group - including those with health conditions, caring responsibilities, or otherwise outside the active labour force - relying on out-of-work support.`;
        }

        if (baseName === 'Index of Multiple Deprivation Decile') {
            return `The Index of Multiple Deprivation ranks every neighbourhood in England (LSOAs, small areas of 1,000-3,000 people) against every other on a composite of income, employment, education, health, crime, housing and living-environment deprivation, then groups them into ten equal-sized deciles from 1 (most deprived nationally) to 10 (least). Ladywell ward is made up of 7 such neighbourhoods; one of them - about 14% - falls within the most deprived national fifth (decile 1-2) under the October 2025 release, a position local reporting describes as little changed since the index was last published in 2019. That single deprived neighbourhood sits alongside six others that are not, illustrating how deprivation in Ladywell is localised rather than ward-wide - consistent with the ward's own domain breakdown, which scores comparatively well on education but poorly on income and living environment specifically. Lewisham as a whole ranks 172nd-least-deprived of England's 296 local authorities on the IMD's "extent" measure (only 2% of its neighbourhoods are in the nationally most-deprived decile, against 10% for England), though the borough has historically scored as more deprived on other summary measures - a reminder that "how deprived is Lewisham" depends on which of several official measures is used, and the IMD does not have an official comparative target the way a rate-based indicator would.`;
        }

        // Peace & justice-specific explanations
        if (baseName === 'Crime rate per 1,000 population') {
            return `This is Lewisham's recorded crime rate - crimes reported to and recorded by the Metropolitan Police, divided by population, not a survey of residents' experience of crime. At roughly 93 per 1,000 residents in the year to early 2026, the borough runs a little above London's own average, though exactly how far above depends on which population base is used for the comparison. Violence and sexual offences are the single largest category the police record here, both boroughwide and in Ladywell specifically, ahead of theft, robbery and criminal damage. The Metropolitan Police also publishes this data at ward level every month, which would let a genuinely Ladywell-specific rate be calculated directly against the ward's own population rather than the borough-wide figure shown here - a more precise version of this indicator to pursue as that dataset becomes easier to draw from directly.`;
        }

        // Generic fallback
        return null;
    }

    // Function to get a "Why this is happening" explainer for indicators where a reader's
    // natural next question ("why?") isn't answered elsewhere on the page. Returns
    // { localParagraphs, localSources, nationalCard } - localParagraphs is real Ladywell/
    // Lewisham evidence (may not exist for every indicator); nationalCard is the academic/
    // global research consensus, included ONLY as a clearly-labelled fallback for the parts
    // local data can't explain, never presented as a Ladywell-specific finding.
    function getWhyThisIsHappening(baseName) {
        if (baseName === 'Healthy life expectancy at birth') {
            return {
                localParagraphs: [
                    `Lewisham's leading causes of death are cancer (30.4%), circulatory disease (28.6%), and respiratory illness (10.8%) (2024/25), with premature death rates worse than England's - 6th-highest in London. The gap is deprivation-linked and widening: men in Lewisham's least deprived areas now live 8.1 years longer than men in the most deprived areas (2021-23), up from 6.6 years in 2020-21.`
                ],
                localSources: [
                    { name: 'A Picture of Lewisham 2025 - Lewisham Council Public Health', url: 'https://www.observatory.lewisham.gov.uk/wp-content/uploads/2025/09/Picture_of_Lewisham_2025_updated_September_2025.pdf' }
                ],
                nationalCard: {
                    title: 'Perspectives from global health research',
                    summary: `Two strands of research explain what typically drives healthy life expectancy more broadly. The Global Burden of Disease Study 2023 attributes nearly half of all healthy years lost globally to modifiable risk factors, led by high blood pressure, air pollution, high blood glucose, smoking, and low birthweight. Why those risks cluster more heavily in some places is the focus of the UK's Marmot Review: income, employment, education, early-childhood conditions, housing, and access to preventive care - the "causes of the causes." Marmot found healthy life expectancy differs by roughly 12 years between England's most and least deprived areas, a steeper gradient than for life expectancy itself.`,
                    sources: [
                        { name: 'GBD 2023 risk factor analysis - The Lancet / PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/41092926/' },
                        { name: 'Marmot Review 10 Years On - Institute of Health Equity', url: 'https://www.instituteofhealthequity.org/resources-reports/marmot-review-10-years-on/the-marmot-review-10-years-on-full-report.pdf' }
                    ]
                }
            };
        }
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
                summary: `<p>Rather than treating healthcare alone as the lever, the strategy organises action around four priority areas, treating poverty, housing and education as the "core determinants" driving the borough's health gap:</p>
                    <ul>
                        <li><strong>Poverty</strong> - embedding financial wellbeing and debt advice within GP and social care settings, plus an annual Warm Welcome Scheme.</li>
                        <li><strong>Housing</strong> - a joint damp-and-mould protocol across health and housing providers, and closer working on hospital discharge.</li>
                        <li><strong>Education</strong> - embedding prevention within schools for children and young people.</li>
                        <li><strong>Prevention</strong> - targeting the borough's two leading causes of death directly, via new Neighbourhood Health Equity Teams for cancer and cardiovascular disease.</li>
                    </ul>
                    <p>It commits to shifting resources upstream from treatment toward prevention over its 5-year span.</p>`
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
                    summary: `<p>Lewisham's housing strategy sets out five priorities: delivering more genuinely affordable homes, preventing homelessness, improving housing quality and safety, supporting independent living, and strengthening communities. It identifies the widening gap between private rents and incomes as the single biggest driver of homelessness locally, and estimates a quarter of private rented homes are non-decent. Its actions span building new council and social rent homes, bringing empty properties back into use, pushing for longer and more secure private tenancies, and expanding licensing to raise standards.</p>`
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
                },
                {
                    title: 'Perspectives from global housing research',
                    summary: `<p>Finland is the clearest global example of what works against chronic homelessness: a national "Housing First" programme that gives people permanent housing immediately, without requiring sobriety or treatment first, then wraps support around them, with retention rates typically around 70-80%. But US research found unsheltered homelessness kept rising even as Housing First expanded nationally - researchers trace this to an "inflow" problem: keeping already-housed people housed doesn't stop new people becoming homeless, and that inflow is tied to the same supply and affordability pressures below. On affordability itself, both under-building and over-investment appear to matter: constrained supply where land-use rules limit new homes, and demand from housing treated as a financial asset - buy-to-let purchases and homes left vacant for capital appreciation - both push rents up independent of each other. On housing quality, the World Health Organization has documented direct health harms from poor housing - damp and mould linked to asthma, cold homes to cardiovascular illness - making substandard housing a measurable population health risk, not just a comfort issue.</p>`,
                    sources: [
                        { name: 'Finnish Housing First Policy - United Nations DESA', url: 'https://www.un.org/development/desa/dspd/wp-content/uploads/sites/22/2019/05/Taina-Finnish-Housing-First-Policy.pdf' },
                        { name: 'Housing Supply and the Drivers of Homelessness - Bipartisan Policy Center', url: 'https://bipartisanpolicy.org/report/housing-supply-and-homelessness/' },
                        { name: 'Land Use Reforms and Housing Costs - Urban Institute', url: 'https://www.urban.org/research/publication/land-use-reforms-and-housing-costs' },
                        { name: 'Rapid Evidence Assessment: Buy-to-Let Housing - Sheffield Hallam University', url: 'https://www.shu.ac.uk/-/media/home/research/cresr/reports/r/rapid-evidence-assessment-buytolet-housing.pdf' },
                        { name: 'WHO Housing and Health Guidelines (2018)', url: 'https://www.who.int/publications/i/item/9789289041683' }
                    ]
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
                },
                {
                    title: 'Perspectives from global food research',
                    summary: `<p>On food insecurity, research from bodies like the UN Food and Agriculture Organization finds that in high-income countries, insecurity is overwhelmingly an income/access problem rather than a food-availability one - food banks treat the symptom, while income support treats the cause. On diet quality, an emerging body of nutrition research, built around the NOVA classification system developed at the University of São Paulo and already written into national dietary guidelines in several countries, links ultra-processed food (UPF) consumption to poor health outcomes independent of a food's individual nutrient content - packaged, industrially formulated products now make up more than half of dietary energy intake in the UK. Both point the same way: the World Cancer Research Fund's "NOURISHING" framework - fiscal tools like sugar taxes, marketing restrictions, reformulation targets and food labelling - treats poor diet as a food-system problem to fix at the shelf and in policy, not a matter of individual willpower.</p>`,
                    sources: [
                        { name: 'The State of Food Security and Nutrition in the World - UN FAO', url: 'https://openknowledge.fao.org/server/api/core/bitstreams/5277b379-0acb-4d97-a6a3-602774104629/content' },
                        { name: 'Ultra-processed foods and calorie intake in the UK - MRC Epidemiology Unit, Cambridge', url: 'https://www.mrc-epid.cam.ac.uk/blog/2024/07/17/upf-two-thirds-calorie-intake-uk-adolescents/' },
                        { name: 'NOURISHING policy framework - World Cancer Research Fund International', url: 'https://www.wcrf.org/research-policy/policy/nutrition-policy/nourishing-framework/' }
                    ]
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
                },
                {
                    title: 'Perspectives from global water research',
                    summary: `<p>Global water stress is being pushed up by three forces largely outside any single utility's control: climate change, which is shifting when and how much rain falls rather than just annual totals; population growth; and rising economic demand as agriculture, industry and households all draw more water. That pressure lands unevenly - the World Resources Institute's Aqueduct tool measures stress as water withdrawn relative to how much renewable supply is actually available in a catchment, not total rainfall, which is why a moderately dry but densely populated, high-demand region like South East England registers as more water-stressed than many drier-looking but sparsely populated places. Within that structural pressure, though, international comparisons show real headroom on the supply side: the UK loses around 20% of treated water to leaking pipes, roughly the international middle, while Tokyo - a comparably dense city - has brought its leakage down to around 3% through sustained investment in pipe replacement and leak detection, proof that high leakage reflects investment choices, not an unavoidable cost of an old, dense network.</p>`,
                    sources: [
                        { name: 'Aqueduct 4.0 - Updated Decision-Relevant Global Water Risk Indicators - World Resources Institute', url: 'https://www.wri.org/research/aqueduct-40-updated-decision-relevant-global-water-risk-indicators' },
                        { name: '25 Countries, Housing One-Quarter of the Population, Face Extremely High Water Stress - World Resources Institute', url: 'https://www.wri.org/insights/highest-water-stressed-countries' },
                        { name: 'Leakage - Water UK', url: 'https://www.water.org.uk/water-supply/leakage' },
                        { name: "The Secret to Tokyo's Low Water Leakage Rate - Outokumpu", url: 'https://www.outokumpu.com/en/expertise/2021/the-secret-to-tokyos-low-water-leakage-rate' }
                    ]
                }
            ];
        }

        // Mobility dimension council context - 2 documents: the borough transport
        // strategy covers the mode-share target (and PTAL's role in planning) while the
        // Sustainable Streets programme covers the current delivery mechanism.
        if (dimensionName === 'mobility') {
            return [
                {
                    title: 'Lewisham Transport Strategy and Local Implementation Plan 2019-2041 (LIP3)',
                    year: '2019-2041',
                    url: 'https://lewisham.gov.uk/myservices/roads-and-transport/transport-strategy-and-programmes',
                    summary: `<p>LIP3 is Lewisham's primary transport strategy, adopted locally in support of the Mayor's Transport Strategy. It commits the borough to the same 80%-by-2041 sustainable mode share goal citywide policy sets, alongside a target for residents to do at least 20 minutes of active travel a day. It also set a shorter-term ambition to cut borough car ownership from 77,715 vehicles in 2019 to 75,100 by 2021. Public Transport Accessibility Levels feed directly into where the strategy - and the Lewisham Local Plan it sits alongside - directs new homes and density: better-connected areas near stations, including the area around Ladywell station itself, are prioritised for growth, while lower-PTAL areas further from it are not.</p>`
                },
                {
                    title: 'Lewisham Council - Sustainable Streets Programme',
                    year: '2024-',
                    url: 'https://lewisham.gov.uk/myservices/roads-and-transport/sustainable-streets-programme',
                    summary: `<p>Sustainable Streets is the council's current delivery vehicle for the LIP3 mode-share goal: a rolling programme of low-traffic neighbourhood measures - banned turns, modal filters, and similar traffic management - designed to cut car journeys and make walking, cycling, and bus use more attractive, alongside School Streets closures outside schools at pick-up and drop-off. Lewisham had the highest proportion of School Streets in London for the second year running in 2025, at a record 56.7% of eligible schools, even as its wider sustainable mode share fell - a reminder that individual scheme successes have not yet been enough to reverse the borough-wide trend.</p>`
                },
                {
                    title: 'Perspectives from global mobility research',
                    summary: `<p>Transport research distinguishes accessibility - whether people can actually reach jobs, healthcare, education and amenities - from transport infrastructure itself. The UK's own foundational research here, the government's 2003 "Making the Connections" report, found this gap falls hardest on disabled people, older residents and people on low incomes: good transport coverage on a map doesn't mean much if the people most likely to need it can't actually use it to reach the things that matter.</p><p>On sustainable travel, transport economics has a well-replicated finding for why simply adding road capacity doesn't relieve congestion: "induced demand" research, most influentially Duranton and Turner's study across US cities, finds new road capacity gets filled by new traffic almost one-for-one. Investment in public transport and cycling infrastructure runs into a different problem: reviews of these schemes consistently find they mostly attract people who'd otherwise have walked, cycled or used transit anyway, with real reductions in driving only appearing when better alternatives are paired with something that makes driving itself less convenient, like road pricing or reduced parking. Shifting trips away from cars usually needs both a pull toward alternatives and a push away from driving, not either alone.</p>`,
                    sources: [
                        { name: 'Making the Connections: Final Report on Transport and Social Exclusion - UK Social Exclusion Unit (2003)', url: 'https://www.ilo.org/media/312721/download' },
                        { name: 'The Fundamental Law of Road Congestion - Duranton & Turner, American Economic Review (2011)', url: 'https://www.nber.org/papers/w15376' }
                    ]
                }
            ];
        }

        // Community dimension council context - 2 documents: the Health and Wellbeing
        // Strategy covers loneliness/social isolation as a named adult social care
        // priority (delivered practically through Community Connections Lewisham); the
        // Main Grants Programme Allocations report covers the funding behind
        // neighbourhood-level community infrastructure and belonging.
        if (dimensionName === 'community') {
            return [
                {
                    title: 'Lewisham Health & Wellbeing Strategy — Going further with prevention',
                    year: '2025-2030',
                    url: 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/strategies/health-and-wellbeing-strategy-2025-2030.pdf',
                    summary: `<p>Lewisham's Health and Wellbeing Strategy names "promoting social connection and purpose" and "reducing isolation and loneliness" as explicit priorities within its adult social care outcomes, and identifies social participation - alongside housing - as a core wider determinant of health that poverty erodes. In practice this is delivered through Community Connections Lewisham, a free social prescribing service for residents aged 18 and over that matches isolated adults with local groups, activities, and trained befriending volunteers rather than clinical treatment. The council-backed "Lewisham Against Loneliness" campaign, run through the same service, has recruited over a hundred volunteer befrienders and matched 84 residents to date.</p>`
                },
                {
                    title: 'Main Grants Programme Allocations 2026-2029 (Mayor and Cabinet report)',
                    year: '2026-2029',
                    url: 'https://lewisham.moderngov.co.uk/documents/s123458/Main%20Grants%20Programme%20Allocations%202026-2029%20REPORT.pdf',
                    summary: `<p>Lewisham's Main Grants Programme - the council's core funding route for the voluntary and community sector - drops from £2.46m a year under the 2022-25 cycle to a total of £2.11m across the whole 2026-29 cycle, a cut the council links to a £30m borough-wide budget shortfall in 2025/26. Rather than spreading the reduced pot thinly, the new model commissions advice services directly instead of through grants, and channels £900,000 into neighbourhood-focused infrastructure across four areas of the borough - funding local coordination, signposting, and capacity-building alongside the NHS's Integrated Neighbourhood Teams - with a further stream for Black-led organisations, digital inclusion, and equalities groups.</p>`
                },
                {
                    title: 'Perspectives from global community research',
                    summary: `<p>WHO's Commission on Social Connection has declared loneliness a global public health priority: worldwide, it's linked to roughly 871,000 deaths a year, with poor social connection raising mortality risk by around a quarter to a third. Sociologist Eric Klinenberg's research into Chicago's 1995 heat wave found why: neighbourhoods with near-identical poverty had very different death tolls depending on their "social infrastructure" - libraries, shops, parks and community spaces that gave isolated residents somewhere to go and someone nearby to notice if they went missing. Shared public spaces aren't just amenities, they're protective infrastructure - without them, isolated residents have no safety net, no matter how caring their neighbours might otherwise be.</p>`,
                    sources: [
                        { name: 'From Loneliness to Social Connection - WHO Commission on Social Connection', url: 'https://www.who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death' },
                        { name: 'Loneliness and Social Isolation as Risk Factors for Mortality - Holt-Lunstad et al., 2015', url: 'https://journals.sagepub.com/doi/full/10.1177/1745691614568352' },
                        { name: 'Safety and Community: A Tale of Two Neighborhoods (Klinenberg\'s Chicago research) - Congress for the New Urbanism', url: 'https://www.cnu.org/publicsquare/safety-and-community-tale-two-neighborhoods' }
                    ]
                }
            ];
        }

        // Equality dimension council context - 2 documents: the Lewisham Poverty
        // Commission's report covers low pay and pay inequality locally (its own remit
        // and recommendations); the Mayor of London's Workforce Integration Network
        // covers the structural drivers behind the gender and ethnicity pay gaps
        // citywide, since no Lewisham-specific strategy exists for either. Wealth
        // concentration has no dedicated strategy document at either level - noted as a
        // gap rather than forcing a weak third citation.
        if (dimensionName === 'equality') {
            return [
                {
                    title: 'Working together to tackle poverty in Lewisham (Lewisham Poverty Commission)',
                    year: '2017',
                    url: 'https://lewisham.gov.uk/-/media/archive/files/imported/lewishampovertycommissionreportfinal.pdf?sc_lang=en',
                    summary: `<p>Lewisham's cross-sector Poverty Commission, launched in 2017, made 52 recommendations after finding that low pay - not just worklessness - was trapping working households in poverty, with the borough's pay inequality one symptom of a labour market split between well-paid professional jobs and a large, insecure, low-paid service sector. Its central response was accreditation as a Living Wage borough: the council became one of the first UK local authorities to gain Living Wage Employer status, used business-rate incentives to grow the number of accredited local employers, and proposed the "Lewisham Deal" - a partnership between the council, health, and education employers to expand local apprenticeships and Living Wage jobs. The Commission also pushed for improved in-work progression support, on the basis that raising the pay floor alone does not close a gap driven mainly by who reaches the top of it.</p>`
                },
                {
                    title: "Workforce Integration Network (WIN) — Bridging the Gap",
                    year: '2018-present',
                    url: 'https://www.london.gov.uk/programmes-strategies/communities-and-social-justice/workforce-integration-network-win/bridging-gap',
                    summary: `<p>WIN is the Mayor of London's response to London having the widest ethnicity pay gap of any English region - GLA Economics estimates closing ethnic minority employment and progression gaps could unlock £17.4 billion in economic benefit for London. It targets the groups facing the largest combined barriers, including Black men and Pakistani, Bangladeshi, and Black women specifically, on the basis that gender and ethnicity disadvantage compound rather than operate separately - directly relevant to both the gender and ethnicity pay gap figures shown here. Rather than setting a citywide pay-gap target, WIN works employer-by-employer through "Design Labs" that analyse where a given organisation's recruitment, retention, and promotion practices are excluding underrepresented groups, then build a tailored action plan. No dedicated strategy document exists addressing wealth concentration specifically, at either Lewisham or London level.</p>`
                },
                {
                    title: 'Perspectives from global equality research',
                    summary: `<p>Wealth is far more unequally shared than income almost everywhere researchers have looked, and one of the clearest findings on why is about housing specifically, not investments or business ownership: economist Matthew Rognlie found that nearly all of the long-term growth in wealth compared to earnings in Britain and similar countries comes down to how much homes are worth, not other kinds of wealth. In practice, that means who owns property, and how fast house prices rise compared to wages, is doing most of the work in pulling wealth away from people who don't own a home and towards those who do.</p><p>That housing-driven wealth gap connects to a much larger one across ethnic groups, though the drivers turn out to be broader than housing alone: UK research finds under a third of Black African adults own their own home, against around 70% of White British and Indian adults, but Resolution Foundation research points to inheritance and savings as the bigger factors overall - White British households inherit roughly 50% more on average than Indian households, and at least half of Black African, Bangladeshi and Black Caribbean households have under £1,000 in savings. Homeownership alone doesn't tell the whole story either: Pakistani households have high homeownership rates but still end up with less wealth than Indian households. However it breaks down, the result is stark - Black African and Bangladeshi households hold roughly a tenth of the wealth of the average White British household.</p><p>On gender pay gaps specifically, the most consistent finding across countries with very different labour laws is the "child penalty": pay gaps between men and women are close to zero before a first child and open up sharply afterward, driven by mothers reducing hours or stepping back from careers in ways fathers largely don't.</p>`,
                    sources: [
                        { name: "Das House Kapital: The Evolution of Housing Wealth - Rognlie's finding, summarised by CEPR", url: 'https://cepr.org/voxeu/columns/das-house-kapital-evolution-housing-wealth' },
                        { name: "A gap that won't close - Resolution Foundation", url: 'https://www.resolutionfoundation.org/app/uploads/2020/12/A-gap-that-wont-close.pdf' },
                        { name: 'The Colour of Money - Runnymede Trust', url: 'https://www.runnymedetrust.org/publications/the-colour-of-money' },
                        { name: 'The Child Penalty Atlas - Kleven et al., NBER', url: 'https://www.nber.org/papers/w31649' }
                    ]
                }
            ];
        }

        // Political voice dimension council context - 2 documents: the Local Democracy
        // Review covers the borough's general democratic-participation and
        // felt-influence agenda (transparency, decision-making access); the Strategic
        // Review of Engagement covers civic participation infrastructure specifically,
        // commissioned after the council's ward-based Assembly Programme - previously
        // the main structured route for residents to influence local decisions - was
        // cut as a budget saving. Neither document sets out a dedicated turnout
        // strategy; no such document was found at Lewisham or GLA level, and this is
        // noted directly in that indicator's "what this measures" text above rather
        // than forced into a third citation here.
        if (dimensionName === 'political_voice') {
            return [
                {
                    title: "Lewisham Democracy Review — \"A democratic and open Lewisham\"",
                    year: '2018-2020',
                    url: 'https://lewisham.gov.uk/mayorandcouncil/local-democracy-review',
                    summary: `<p>Lewisham set up a cross-party Local Democracy Review in July 2018 to make the council more democratic, open and transparent, consulting residents and businesses before agreeing 57 recommendations with the Mayor and all councillors in spring 2019. An eight-councillor working group then oversaw delivery through 2019/20, covering ground directly relevant to how much influence residents feel they have locally:</p>
                    <ul>
                        <li><strong>Opening up decision-making</strong> - publishing council data in open formats and exploring a residents' "people's panel" to give the public a more direct route into decisions, rather than relying solely on the ballot box and formal consultations.</li>
                        <li><strong>More accessible scrutiny</strong> - a more flexible committee and policy-development system intended to let residents follow and influence council business more easily than the previous structure allowed.</li>
                        <li><strong>Better digital access</strong> - an accessibility-focused website rebuild and new communications approach, on the basis that residents who can't easily find or follow council information can't meaningfully engage with it.</li>
                    </ul>
                    <p>The review's own framing was that formal democratic structures - not just election turnout - shape whether residents feel they have a voice, which is the same gap the "personally influence local decisions" indicator on this page is measuring nationally.</p>`
                },
                {
                    title: 'Strategic Review of Engagement',
                    year: '2024-',
                    url: 'https://lewisham.moderngov.co.uk/mgConvert2PDF.aspx?ID=117853',
                    summary: `<p>For many years Lewisham ran a ward-based Assembly Programme - one assembly per ward, each supported by a council coordinator - as its main structured channel for residents to help shape local decisions and access community engagement and development support. When Mayor and Cabinet cut its funding as part of the council's wider budget savings, ending council-funded assembly activity entirely, the Mayor commissioned this Strategic Review of Engagement to work out what should replace it. The review distinguishes between engagement (involving residents in decisions the council is already making) and community development (building a community's own capacity to act independently of the council), and argues Lewisham's political leadership needs to take a more active convening role given the loss of the assemblies' standing infrastructure. It is the clearest local acknowledgement that the borough's main civic-participation structure was removed for budget reasons before a replacement was in place.</p>`
                },
                {
                    title: 'Perspectives from global political voice research',
                    summary: `<p>Political scientists have long explained why local election turnout runs lower than national turnout almost everywhere through "second-order election" theory: voters correctly see less at stake politically in local elections, since they don't determine who runs national government, which depresses participation regardless of how well local democracy is actually run - even though local government controls much of what shapes daily life directly, from bins to social care to schools. A separate body of research points to another driver: the UK has lost over 290 local newspaper titles since 2005, and their closure is consistently linked to falling local turnout in the areas affected, since residents lose the everyday coverage of council decisions and candidates that informed voting depends on, with social media not filling the gap with anything comparably reliable.</p><p>Research on political efficacy adds a second, more actionable layer to why people do or don't get involved beyond voting: willingness to participate locally depends heavily on "external efficacy" - whether people believe the system would actually respond if they did - meaning participation tends to track trust that engagement is worth it as much as it tracks interest itself.</p>`,
                    sources: [
                        { name: 'Second-order election - overview', url: 'https://en.wikipedia.org/wiki/Second-order_election' },
                        { name: 'UK local newspaper closures tracker - Press Gazette', url: 'https://pressgazette.co.uk/news/uk-local-newspaper-closures-at-least-265-local-newspaper-titles-gone-since-2005-but-pace-of-decline-has-slowed/' }
                    ]
                }
            ];
        }

        // Education dimension council context - 1 document: the council's own Standards
        // Report covers the dimension's single indicator (GCSE English & Maths attainment)
        // directly, including the year-on-year comparison and the council's own framing of
        // where progress still lags. No second document was found substantively covering
        // ground this one doesn't already address, so a 2nd/3rd citation wasn't forced.
        if (dimensionName === 'education') {
            return [{
                title: 'Validated Outcomes 2024 Standards Report — Primary and Secondary Schools',
                year: '2024',
                url: 'https://lewisham.moderngov.co.uk/mgConvert2PDF.aspx?ID=119735',
                summary: `<p>Lewisham Council's own school standards reporting shows 2023/24 as the borough's best GCSE year on record for the basics measure: 66% of pupils achieved grade 4 or above in both English and Maths, up from 59% in 2019 and continuing a recovery from the pandemic-disrupted exam years. Attainment 8 - a broader points score covering 8 subjects - moved the same direction, up 2.5 points on 2019 to 46.9. The report is more cautious about Progress 8, which measures how much progress pupils make relative to pupils with similar starting points nationally: it has historically run below the national average in Lewisham, and the council frames closing that gap - not just raising the raw attainment percentage - as the harder, ongoing task for its school improvement work.</p>`
            },
            {
                title: 'Perspectives from global education research',
                summary: `<p>International research separates two different questions about attainment gaps: how early they open, and how big they get by the end of school. The OECD's International Early Learning and Child Well-being Study finds socioeconomic gaps in foundational skills are measurable by around age 5, before most formal schooling has even started. Its PISA study, testing 15-year-olds across many countries, finds these early gaps typically persist rather than narrow by the end of compulsory schooling - though some school systems manage a much flatter socioeconomic gradient than others, showing the gap isn't inevitable. That early opening is why OECD research finds the most cost-effective lever is early: high-quality early childhood education and care closes gaps before they become entrenched. The catch is that access to good early years provision is itself unequal - children from lower-income families are both less likely to attend, and more likely to attend lower-quality provision when they do.</p>`,
                sources: [
                    { name: 'Building Strong Foundations for Life - OECD International Early Learning and Child Well-being Study', url: 'https://www.oecd.org/en/publications/building-strong-foundations-for-life_02bf8efe-en/full-report/equity-gaps-in-early-learning-and-development_326c1b3e.html' },
                    { name: 'Reducing Inequalities by Investing in Early Childhood Education and Care - OECD', url: 'https://www.oecd.org/en/publications/reducing-inequalities-by-investing-in-early-childhood-education-and-care_b78f8b25-en/full-report.html' }
                ]
            }];
        }

        // Connectivity dimension council context - 2 documents: Lewisham's own Digital
        // Infrastructure programme page covers full fibre broadband and mobile small-cell
        // rollout (the two Ofcom-sourced indicators); the Mayor of London's Digital Access
        // for All / Digital Inclusion Service covers digital exclusion, since no
        // Lewisham-specific digital-inclusion strategy document was found this session.
        if (dimensionName === 'connectivity') {
            return [
                {
                    title: 'Lewisham Digital Infrastructure',
                    year: '2026',
                    url: 'https://lewisham.gov.uk/myservices/lewisham-digital-infrastructure',
                    summary: `<p>Lewisham Council has been removing planning and highways barriers that previously slowed fibre providers from reaching residential streets, scaling up full fibre rollout to homes and businesses across the borough in partnership with network operators. More than 70,000 homes and businesses can already upgrade to full fibre - via a roughly £21m Openreach investment reaching around half of properties - though only around 30% of eligible premises had actually switched over by the council's own reporting, illustrating that availability and take-up are two different gaps. Alongside fixed broadband, the council has agreements with BT, Ontix, Freshwave and BAI Communications to install small-cell mobile equipment to improve 4G/5G signal, with installations completed in New Cross and further sites planned across the borough.</p>`
                },
                {
                    title: 'Digital Access for All (Mayor of London Digital Inclusion Service)',
                    year: '2022-',
                    url: 'https://www.london.gov.uk/talk-london/topics/communities/digital-access-all',
                    summary: `<p>The Mayor of London launched the Digital Inclusion Service in June 2022, with the London Office of Technology and Innovation (LOTI) and Good Things Foundation, after estimating around 270,000 Londoners were completely offline and a further 2 million had very low digital engagement. Rather than funding devices, connectivity and skills training as separate schemes - the pattern LOTI found across more than 100 existing London initiatives, each typically covering only part of what someone needs - the service combines a loaned device, low-cost or free mobile connectivity, and basic skills support into one coordinated offer, aiming to directly support up to 75,000 Londoners over three years.</p>`
                },
                {
                    title: 'Perspectives from global connectivity research',
                    summary: `<p>Digital-divide research distinguishes three separate levels of exclusion, and finds they compound rather than substitute for each other: a "first-level" divide in physical access to infrastructure, a "second-level" divide in the skills, confidence and devices needed to actually use it, and a "third-level" divide in whether people convert use into real educational, economic or civic benefit. The practical implication: rolling out full broadband and 5G coverage closes only the first gap. Ofcom's own research finds most people who remain offline say it's because they're not interested or don't see the need for it, though a substantial share also cite cost or a lack of skills and confidence - meaning coverage statistics alone can overstate how "connected" an area really is.</p>`,
                    sources: [
                        { name: 'The three levels of the urban digital divide - ScienceDirect', url: 'https://www.sciencedirect.com/science/article/pii/S0016718521001378' },
                        { name: 'Digital Exclusion Review 2022 - Ofcom', url: 'https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/media-literacy-research/adults/adults-media-use-and-attitudes-2022/digital-exclusion-review-2022.pdf' }
                    ]
                }
            ];
        }

        // Energy dimension council context - 2 documents: Lewisham's own public health
        // reporting covers the cost-of-living/health angle and the within-borough variation
        // fuel poverty hides; the national Fuel Poverty Strategy covers the statutory
        // efficiency-band target both indicators sit against.
        if (dimensionName === 'energy') {
            return [
                {
                    title: 'Lewisham Annual Public Health Report 2023-24 — The cost-of-living crisis and health: impact and action in Lewisham',
                    year: '2023-24',
                    url: 'https://lewisham.moderngov.co.uk/documents/s115875/Appendix%20Lewisham%20Annual%20Public%20Health%20Report%202023-24.pdf',
                    summary: `<p>The council's public health report treats fuel poverty as a direct driver of ill health, not just a household budgeting problem, given the well-established links between cold homes and respiratory illness, cardiovascular strain, and poor mental health. It identifies stark variation within Lewisham itself: some neighbourhoods have fuel poverty rates above 23%, and seven Lower-layer Super Output Areas exceed 20%, both well above the borough's own 13.8% average. Its response sits within the council's wider cost-of-living programme - welfare and debt advice, the Household Support Fund, and referral routes into energy-efficiency and warm-home schemes - rather than a standalone fuel poverty strategy of its own.</p>`
                },
                {
                    title: 'Fuel Poverty Strategy for England (CP 1497)',
                    year: '2026',
                    url: 'https://assets.publishing.service.gov.uk/media/6977461bd345446f8ce71ef1/fuel-poverty-strategy-for-england-2026-print-ready-version.pdf',
                    summary: `<p>England's fuel poverty strategy carries forward a target first set out in 2021: getting as many fuel-poor homes as reasonably practicable to an EPC Band C by 2030, on the reasoning that a more efficient home needs less energy to heat properly whatever happens to energy prices. That target sits behind schemes like ECO4 and the Warm Homes: Local Grant, both of which fund insulation and heating upgrades for low-income households, including in Lewisham. It reflects a shift in emphasis from earlier fuel poverty policy, which leaned more heavily on income support and short-term energy price interventions, towards home retrofit as the more durable fix - directly relevant to a borough where EPC coverage lags the London average.</p>`
                },
                {
                    title: 'Perspectives from global energy research',
                    summary: `<p>Fuel poverty research since Brenda Boardman's foundational 1991 work frames it as three factors interacting, not one: low income, high energy prices, and poor home energy efficiency - any two together can push a household into fuel poverty even without the third being severe, which is why efficiency upgrades alone don't always lift a household out of it. Energy-efficiency research adds an important complication to the "just insulate everything" response: studies of home retrofits consistently find a "rebound effect" - households often use some of the efficiency gain to heat their home more rather than banking the full bill saving, particularly in previously under-heated homes. That's not a reason to abandon retrofit, but it does mean efficiency upgrades and income support work best as complements, not substitutes.</p>`,
                    sources: [
                        { name: 'Brenda Boardman - Fuel Poverty: From Cold Homes to Affordable Warmth (1991)', url: 'https://en.wikipedia.org/wiki/Brenda_Boardman' },
                        { name: 'The Rebound Effect in Home Heating - a guide for policymakers and practitioners', url: 'https://www.researchgate.net/publication/347492593_The_Rebound_Effect_in_Home_Heating_A_guide_for_policymakers_and_practitioners' }
                    ]
                }
            ];
        }

        // Culture dimension council context - 2 documents: Lewisham's own cultural strategy
        // covers venue distribution and how the council targets its arts funding; the GLA's
        // Cultural Infrastructure Plan covers the London-wide policy backdrop for the
        // venue-density indicator (why the Cultural Infrastructure Map exists at all).
        if (dimensionName === 'culture') {
            return [
                {
                    title: 'We Are Lewisham — A Cultural Strategy for Lewisham 2023-2028',
                    year: '2023-2028',
                    url: 'https://lewisham.gov.uk/-/media/in-my-area/arts-and-culture/we-are-lewisham-a-cultural-strategy-for-lewisham-2023-2028.pdf',
                    summary: `<p>Lewisham's cultural strategy finds that cultural and creative spaces cluster unevenly across the borough - grouped into named cultural quarters such as Deptford Creekside, New Cross and Forest Hill, with fewer dedicated venues in the south - and that affordable creative workspace remains hard to secure for many practitioners. Its own residents' and visitors' survey found parks and open spaces (89%), outdoor events (66%) and libraries (61%) were the local cultural venues people actually attended, ahead of more traditional "cultural infrastructure" categories. The strategy sits behind the council's Arts & Culture Fund, which channels most of its budget through a single "cultural anchor" organisation (The Albany) alongside smaller grants to a handful of others - a deliberately targeted rather than broad-based funding model.</p>`
                },
                {
                    title: 'Cultural Infrastructure Plan — A Call to Action (Mayor of London)',
                    year: '2019',
                    url: 'https://www.london.gov.uk/sites/default/files/cultural_infrastructure_plan_online.pdf',
                    summary: `<p>The Mayor's Cultural Infrastructure Plan responds to what the GLA describes as a "worrying decline" in London's cultural spaces, with grassroots music venues and LGBT+ venues losing significant numbers over the preceding decade before recently stabilising. It set out a policy "toolbox" for boroughs and developers to protect and grow cultural space through planning decisions, and underpins the Cultural Infrastructure Map that catalogues venues borough by borough - including Lewisham's - to track where infrastructure is being lost or added over time. The plan treats venue density as a planning and land-use issue as much as a cultural-policy one: once a cultural space is lost to redevelopment, it rarely returns.</p>`
                },
                {
                    title: 'Perspectives from global culture research',
                    summary: `<p>Cultural policy research distinguishes two different goals that arts investment can pursue, and cautions against treating them as the same thing: "democratization of culture" - getting more people through the doors of existing institutions - versus "cultural democracy" - recognising and resourcing the culture people already make and do themselves, from community choirs to informal music nights, rather than only the venues that get counted in official statistics. Both forms of engagement carry a benefit research increasingly documents: a major evidence review commissioned by WHO's European Region, synthesising over 900 studies worldwide, found engaging with the arts has a measurable relationship with health - helping prevent mental and physical ill health and supporting recovery once someone is unwell - whether that engagement happens in a gallery or a front room.</p>`,
                    sources: [
                        { name: 'Cultural Democracy vs. the Democratization of High Culture - Americans for the Arts', url: 'https://www.americansforthearts.org/by-program/reports-and-data/legislation-policy/naappd/cultural-democracy-vs-the-democratization-of-high-culture' },
                        { name: 'What is the evidence on the role of the arts in improving health and well-being? - WHO Health Evidence Network', url: 'https://www.who.int/europe/publications/i/item/9789289054553' }
                    ]
                }
            ];
        }

        // Income dimension council context - 1 document. A genuine search effort this
        // session (30+ web-search queries before the session's search quota was exhausted,
        // plus a fully-blocked direct-fetch tool - see build_income()'s docstring) turned up
        // real titles for a Lewisham JSNA and a Local Economic Assessment, but this session
        // could not actually retrieve their content (only their titles/URLs from search result
        // listings), so no summary is written for them here rather than inventing one -
        // DIMENSION_PAGE_SPECIFICATION.md 2.2/3.2 require every claim to trace to content
        // actually checked, not just a plausible-sounding title. The London Living Wage page
        // below is the one document this session could verify real content for (accredited
        // employer/employee counts), and it covers the low-pay indicator specifically; the
        // other 5 indicators on this page have no verified council-context document this
        // session - flagged as a follow-up rather than papered over.
        if (dimensionName === 'income') {
            return [{
                title: 'Lewisham Council — London Living Wage accreditation scheme',
                year: '2026',
                url: 'https://lewisham.gov.uk/myservices/business/london-living-wage',
                summary: `<p>Lewisham Council is itself accredited as a London Living Wage employer and runs a local scheme encouraging other borough employers to accredit too, on top of the Living Wage Foundation's national accreditation programme. 95 employers in the borough are accredited, covering 7,605 employees paid at or above the London Living Wage rather than the lower statutory minimum. Accreditation is the main lever a council has some direct control over on this indicator - it can set pay for its own staff and contracts and lobby local employers, but it cannot set the statutory minimum wage or compel private employers to pay above it, which is why the borough's 13.4% low-pay rate reflects the wider London labour market as much as any single local policy.</p>`
            },
            {
                title: 'Perspectives from global income research',
                summary: `<p>Two distinct strands of labour economics explain persistent low pay in modern economies. One, most associated with David Autor's work on job polarisation, finds technology and globalisation have hollowed out the middle of the job market - mid-skill roles have shrunk fastest, while both high-skill and low-paid service jobs have grown. A separate, more recent strand looks at power rather than job type: when only a handful of employers are hiring for a given role in a local area, workers have fewer places to go, and economists find this lets employers pay less than they otherwise could - not because the work itself is low-value, but because switching employers is hard. This helps explain something that surprised economists: real-world studies keep finding that raising the minimum or living wage doesn't cost jobs the way basic supply-and-demand theory predicts, because wages in many workplaces were being held down by a lack of options for workers, not by what employers could actually afford to pay.</p><p>Separately, unemployment and economic inactivity are increasingly different problems in rich-country labour markets: unemployment counts people actively looking for work, while inactivity counts everyone else outside the labour force, including a fast-growing group out of work due to long-term sickness - a group that has grown sharply since the pandemic, faster than unemployment itself, which is why an area's unemployment rate can look unremarkable even as claims for out-of-work support rise.</p>`,
                sources: [
                    { name: 'The Growth of Low-Skill Service Jobs and the Polarization of the US Labor Market - Autor & Dorn', url: 'https://www.ddorn.net/papers/Autor-Dorn-LowSkillServices-Polarization.pdf' },
                    { name: 'Monopsony in Local Labour Markets - Alan Manning, IFS Deaton Review', url: 'https://ifs.org.uk/inequality/wp-content/uploads/2022/03/Monopsony-in-local-labour-markets-IFS-Deaton-Review-of-Inequalities.pdf' },
                    { name: 'Rising Ill-Health and Economic Inactivity Because of Long-Term Sickness, UK - ONS', url: 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/articles/risingillhealthandeconomicinactivitybecauseoflongtermsicknessuk/2019to2023' }
                ]
            }];
        }

        // Social cohesion dimension council context - 2 documents, both current and
        // cross-referenced across multiple independent official URLs (launch announcements,
        // committee/decision records, an official launch-event video for the Action Plan),
        // which is why they're used despite a constraint worth stating plainly: this
        // session's network egress policy blocked every attempt to directly fetch and read
        // either document's full text (gov.uk, moderngov.co.uk and every other external
        // domain returned connection-level rejections, confirmed via repeated direct and
        // proxied attempts). The specific facts below - dates, partner organisations,
        // priority/objective names - are corroborated by multiple independent search results
        // rather than a single source, but were not verified by reading the source PDFs
        // directly, so summaries are kept to what could be cross-confirmed rather than
        // written as if the full documents had been read. Two older Lewisham documents
        // specifically about volunteering (a 2012-2017 Volunteering Strategy titled "Valuing
        // Our Community", and a 2011/12 Community and Voluntary Sector Review) were also
        // found but are now well past their own end dates with no confirmed successor, so
        // are not used here - DIMENSION_PAGE_SPECIFICATION.md 3.1 requires verifying a
        // document is the latest version, and neither of those two is current policy.
        if (dimensionName === 'social_cohesion') {
            return [
                {
                    title: 'Lewisham Community Action Plan 2024 (Lewisham Strategic Partnership)',
                    year: '2024-2030',
                    url: 'https://lewisham.gov.uk/-/media/0-mayor-and-council/strategic-partnership/lewisham-community-action-plan-2024---print-file.pdf',
                    summary: `<p>Lewisham's Strategic Partnership - the council working alongside the NHS, the Metropolitan Police, London Fire Brigade, Goldsmiths University of London, Phoenix Community Housing and voluntary-sector partners including Lewisham Local - launched a Community Action Plan in July 2024, shaped by engagement with over 1,000 residents and building on an earlier borough-wide "Lewisham 2030" listening campaign. It sets six long-term objectives running to 2030; two speak directly to this page's indicators - improving residents' health, wellbeing and housing, and celebrating the borough's diverse communities while challenging inequality based on race, disability, sexuality, gender and other characteristics. Lewisham Local, the charity behind the borough's volunteering and community-group infrastructure (500+ groups supported, 4,000+ volunteering hours facilitated a year), is a named delivery partner, tying the plan directly to this page's volunteering indicator.</p>`
                },
                {
                    title: 'Lewisham Corporate Strategy 2022-2026',
                    year: '2022-2026',
                    url: 'https://lewisham.gov.uk/-/media/files/lewisham-council-corporate-plan-2022-2026.ashx',
                    summary: `<p>Lewisham's Corporate Strategy organises the council's work around seven priorities, including Open Lewisham, Health and Wellbeing, Safer Communities and Cleaner and Greener. Two threads running through it speak to trust and cohesion specifically: a commitment to listen to and co-design services with residents, reaching people whose voices are seldom heard, and the council's own description of Lewisham as a "Borough of Sanctuary" and London's leading borough for refugee resettlement. It also commits to what it calls the "Lewisham Way" of working - maintaining and strengthening the council's collaboration with the borough's voluntary and community sector rather than running services alone, the same sector this page's volunteering indicator tracks participation in.</p>`
                },
                {
                    title: 'Perspectives from global social cohesion research',
                    summary: `<p>Trust and cohesion research points to both a structural and an interpersonal driver. On the structural side, most cross-country research finds income inequality erodes generalised trust - people are less likely to trust strangers in more unequal places, independent of overall wealth. On the interpersonal side, social psychology's intergroup contact theory, dating to Gordon Allport's work in the 1950s and confirmed across hundreds of later studies, finds sustained, positive contact between people from different backgrounds - not just living nearby - reliably increases trust, particularly when working toward a shared goal together.</p>`,
                    sources: [
                        { name: 'Income Inequality and Generalised Trust - Social Indicators Research', url: 'https://link.springer.com/article/10.1007/s11205-014-0777-5' },
                        { name: 'A Meta-Analytic Test of Intergroup Contact Theory - Pettigrew & Tropp, 2006', url: 'https://www.researchgate.net/publication/7046266_A_Meta-Analytic_Test_of_Intergroup_Contact_Theory' }
                    ]
                }
            ];
        }

        // Peace & justice dimension council context - 1 document: the Safer Lewisham
        // Partnership Plan is the statutory Crime and Disorder Reduction Partnership plan and
        // is the single policy document that owns both this page's indicators (recorded crime
        // levels, and - since crime deprivation feeds directly into the wider Index of
        // Multiple Deprivation - the neighbourhood-level disadvantage the plan's targeting is
        // meant to respond to). As with social_cohesion above, this session's network egress
        // policy blocked direct retrieval of the PDF's full text; the priorities and remit
        // summarised below are corroborated by multiple independent search results (the
        // document itself, plus council committee agenda items referencing it) rather than a
        // single source, but were not verified by reading the source PDF directly.
        if (dimensionName === 'peace_justice') {
            return [{
                title: 'Safer Lewisham Partnership Plan 2023-2024',
                year: '2023-2024',
                url: 'https://councilmeetings.lewisham.gov.uk/documents/s107714/Safer%20Lewisham%20Partnership%20Plan%202023.pdf',
                summary: `<p>The Safer Lewisham Partnership is the borough's statutory crime and disorder reduction partnership - the council, Metropolitan Police, London Fire Brigade, probation and health services working together under a legal duty to audit crime, disorder and drug misuse locally, consult on the findings, and set a joint response. Its plan organises that response around a small number of priorities:</p>
                <ul>
                    <li><strong>Reducing youth violence and knife crime</strong> - continuing a public health approach to serious youth violence, treating it as a preventable harm shaped by wider social conditions rather than purely a policing problem.</li>
                    <li><strong>Tackling violence against women and girls</strong> - a five-strand response (prevent, protect, recover, pursue, partnership) spanning early intervention, victim support, and holding perpetrators to account.</li>
                    <li><strong>Reducing sexual exploitation and drug-related harm</strong> - partnership work targeting exploitation and the disorder associated with drug misuse across the borough.</li>
                </ul>
                <p>The partnership reports quarterly, chaired by the elected Mayor, giving elected oversight of a response that spans well beyond what the police alone can address.</p>`
            },
            {
                title: 'Perspectives from global peace & justice research',
                summary: `<p>Criminology offers two different, complementary lenses on why crime happens where it does. The structural lens - relative deprivation - finds income inequality within an area predicts violent crime more reliably than how poor the area is overall, a pattern replicated across countries with very different income levels and welfare systems. A separate, situational lens - routine activity theory - explains not who commits crime but when and where: it happens when a motivated offender, a suitable target, and the absence of anyone able to intervene converge in the same place at the same time, regardless of the wider deprivation context. The World Health Organization's INSPIRE framework for preventing violence against children reflects both lenses directly in its seven strategies: "income and economic strengthening" addresses the structural driver, while "safe environments" - better street lighting, reducing access to weapons in high-risk locations - addresses the situational one routine activity theory points to.</p>`,
                sources: [
                    { name: 'Routine Activity Theory - overview', url: 'https://www.ebsco.com/research-starters/law/routine-activity-theory' },
                    { name: 'INSPIRE: Seven Strategies for Ending Violence Against Children - WHO/PAHO', url: 'https://www.paho.org/en/topics/violence-against-children/inspire-seven-strategies-ending-violence-against-children' }
                ]
            }];
        }

        // Generic fallback
        return null;
    }

    // Function to get concrete, resident-actionable ways to get involved for each dimension,
    // each paired with a real (verified, sourced) case study for inspiration - never an
    // invented/generic scenario. Returns null for dimensions without a genuine, checkable
    // example yet - an empty/fabricated entry is worse than no section at all.
    function getWaysToGetInvolved(dimensionName) {
        if (dimensionName === 'health') {
            return [
                {
                    action: 'Show up (or volunteer) at Hilly Fields parkrun',
                    text: `Free timed 5km every Saturday 9am in Hilly Fields, near Ladywell station. Part of the UK-wide parkrun model linked to better fitness and less loneliness.`,
                    url: 'https://www.parkrun.org.uk/hillyfields/'
                },
                {
                    action: 'Train as a Lewisham Health Equity and Wellbeing Champion',
                    text: `Train to spot health needs in your community and connect neighbours to NHS checks. North Lewisham's version reached 678 residents and won a national award in 2025.`,
                    url: 'https://www.selondonics.org/lewisham-het-wins-hsj-award-2025/'
                },
                {
                    action: 'Start (or join) a Men\'s Shed',
                    text: `A volunteer-run workshop space giving people, often older residents living alone, a reason to leave the house. Hundreds exist UK-wide - none yet in Ladywell.`,
                    url: 'https://menssheds.org.uk/find-a-shed/'
                },
                {
                    action: 'Join the London Renters Union - Lewisham branch',
                    text: `A tenants' union branch helping members fight unsafe conditions and rent hikes together. Local pressure from members forced Lewisham Council to act on unsafe conditions at Eros House in 2020.`,
                    url: 'https://londonrentersunion.org/tag/lewisham/'
                },
                {
                    action: 'Volunteer at a Lewisham Warm Welcome space',
                    text: `Help host a free winter warm space - hot drinks, food, company - for residents facing cold homes and rising bills. Runs across Lewisham each winter.`,
                    url: 'https://www.lewishamlocal.com/lewisham-warm-welcomes/'
                }
            ];
        }

        if (dimensionName === 'housing') {
            return [
                {
                    action: "Join RUSS, Ladywell's community land trust",
                    text: `A 1,000+ member community land trust based at Church Grove, Ladywell - self-built 36 affordable homes and a Community Hub in 2019. Open member meetings welcome newcomers.`,
                    url: 'https://www.theruss.org/about/'
                },
                {
                    action: 'Volunteer with the 999 Club',
                    text: `South East London's year-round homelessness charity, running Lewisham's emergency night shelter and its Bridge day centre alongside NHS mental health services. Several former guests have gone on to volunteer themselves.`,
                    url: 'https://999club.org/join-the-999-club-community/'
                },
                {
                    action: 'Report an unlicensed rented home',
                    text: `Since July 2024 nearly all privately rented homes in Lewisham need a council licence, covering around 20,000 properties. Report a suspected unlicensed one by phone or email and the council must investigate.`,
                    url: 'https://lewisham.gov.uk/selectivelicensing'
                },
                {
                    action: 'Join the London Renters Union - Lewisham branch',
                    text: `A tenants' union branch helping members fight unsafe conditions and rent hikes together. Local pressure from members forced Lewisham Council to act on unsafe conditions at Eros House in 2020.`,
                    url: 'https://londonrentersunion.org/tag/lewisham/'
                }
            ];
        }

        if (dimensionName === 'food') {
            return [
                {
                    action: 'Volunteer at Lewisham Foodbank',
                    text: `Part of the Trussell Trust network, running welcome, warehouse, van and admin roles from its Bromley Road warehouse. Apply online - minimum age 16, references and induction required.`,
                    url: 'https://lewisham.foodbank.org.uk/volunteering/'
                },
                {
                    action: "Dig in at Grow Lewisham's community growing site",
                    text: `A permaculture growing space on the Oldstead Road allotments, open to volunteers every Sunday 1-4pm, March to October - the food grown goes directly to local food banks.`,
                    url: 'https://www.growlewisham.com/the-plot'
                },
                {
                    action: 'Join the waiting list at Evelyn Community Store',
                    text: `A volunteer-run social supermarket in Deptford where members pay £3.50 for £30 of FareShare groceries, started by Lewisham Homes in 2019. Volunteering currently runs via a waiting list.`,
                    url: 'https://www.lewishamhomes.org.uk/evelyn-community-store-continues-to-thrive/'
                }
            ];
        }

        if (dimensionName === 'water') {
            return [
                {
                    action: 'Join the 3 Rivers Clean Up on the Ravensbourne',
                    text: `An annual three-week volunteer campaign clearing rubbish and invasive species from the Ravensbourne, Pool and Quaggy - the river that runs straight through Ladywell Fields. 2026 dates: 27 June-17 July.`,
                    url: 'https://3riverscleanup.co.uk/'
                },
                {
                    action: 'Join Quaggy Waterways Action Group',
                    text: `A long-running South East London volunteer group restoring local rivers, including coordinating work on the Ravensbourne catchment - one Lee Green clean-up alone removed over 200 bags of rubbish and medical waste.`,
                    url: 'https://qwag.org.uk/about-us/join-qwag/'
                },
                {
                    action: 'Book a free Thames Water home visit',
                    text: `Thames Water - Lewisham's supplier, in an area classed as seriously water-stressed - fits free water-saving devices to taps, showers and toilets; high-usage households typically save around 100 litres a day.`,
                    url: 'https://www.thameswater.co.uk/help/water-saving/smarter-home-visits'
                }
            ];
        }

        if (dimensionName === 'mobility') {
            return [
                {
                    action: 'Ride or volunteer with Lewisham Cyclists',
                    text: `700+ members strong, this London Cycling Campaign group runs family-friendly rides, a Cycle Buddy scheme pairing new and experienced riders, and donation-based bike maintenance sessions across the borough.`,
                    url: 'https://lewishamcyclists.org.uk/'
                },
                {
                    action: "Join Living Streets' Lewisham Local Group",
                    text: `The local branch of the national walking charity, campaigning for better pedestrian conditions and organising Car Free Day activity in the borough. Meets bi-monthly; new members are welcome.`,
                    url: 'https://www.livingstreets.org.uk/get-involved/local-groups/lewisham-local-group/'
                },
                {
                    action: 'Apply to close your street for a Play Street',
                    text: `Lewisham Council lets residents apply, with six weeks' notice, to close their street to through-traffic so children can play outside - reclaiming space for active, car-free use.`,
                    url: 'https://lewisham.gov.uk/myservices/roads-and-transport/closing-a-road-for-a-play-street-event'
                }
            ];
        }

        if (dimensionName === 'community') {
            return [
                {
                    action: 'Volunteer with Community Connections Lewisham',
                    text: `The charity behind 'Lewisham Against Loneliness', matching isolated residents with local groups, activities and trained volunteers. It currently needs Transport and Cancer Champion volunteers, alongside general roles.`,
                    url: 'https://communityconnectionslewisham.org/volunteer/'
                },
                {
                    action: 'Join Rushey Green Time Bank',
                    text: `A multi-award-winning time bank based at PLACE/Ladywell on Lewisham High Street, where members trade an hour of help given for an hour of help received - skills for connection, not money.`,
                    url: 'https://timebanking.org/timebanks/rushey-green-time-bank/'
                }
            ];
        }

        if (dimensionName === 'equality') {
            return [
                {
                    action: 'Sign up to Lewisham Works',
                    text: `The council's free employment service for unemployed residents aged 18+, helping people into the better-paid work that narrows the borough's pay gap - it helped over 330 residents into jobs or training in its first year.`,
                    url: 'https://lewisham.gov.uk/myservices/employment-support-and-careers-advice/lewisham-works'
                }
            ];
        }

        if (dimensionName === 'political_voice') {
            return [
                {
                    action: 'Join the Ladywell Society',
                    text: `A community group running since 1984, holding regular meetings on local issues - in 2025 it formally objected to the council's proposed loading-bay changes on Ladywell Road, an example of resident voice shaping a decision.`,
                    url: 'https://ladywell-live.org/about-ladywell-society/'
                },
                {
                    action: 'Submit or back a council petition',
                    text: `Any resident, worker or student in the borough can start or sign a paper or e-petition; the council must acknowledge it within 10 working days, and a large one can trigger a full debate.`,
                    url: 'https://lewisham.gov.uk/mayorandcouncil/influence/submit-or-view-a-petition'
                },
                {
                    action: 'Question a council scrutiny meeting',
                    text: `Lewisham's Overview and Scrutiny Committee holds public meetings where residents can suggest an issue to scrutinise or ask a question directly - agendas and papers are published online in advance.`,
                    url: 'https://lewisham.gov.uk/mayorandcouncil/overview-scrutiny/about-overview-and-scrutiny'
                },
                {
                    action: 'Stand to become a local councillor',
                    text: `The council's own guide for residents considering standing for election frames it as the most direct route to decision-making power: "whatever needs changing in your neighbourhood, you could be the person to change it."`,
                    url: 'https://www.lewisham.gov.uk/mayorandcouncil/wards/how-to-become-a-councillor'
                }
            ];
        }

        if (dimensionName === 'education') {
            return [
                {
                    action: 'Become a Learning Partners reading volunteer',
                    text: `Lewisham Council's own scheme trains adult volunteers, about an hour a week, as reading and numeracy partners for local children - run out of its Hither Green office.`,
                    url: 'https://lewisham.gov.uk/organizations/learning-partners'
                },
                {
                    action: 'Become a school governor',
                    text: `Lewisham Council partners with the charity Governors for Schools to match residents with local governing boards - no special qualifications needed, just enthusiasm, to help close the borough's attainment gap.`,
                    url: 'https://governorsforschools.org.uk/'
                },
                {
                    action: 'Tutor with Action Tutoring',
                    text: `A national charity giving free one-to-one English and maths tutoring to disadvantaged pupils across South East London school programmes; Ladywell's own community news site has promoted it directly to local residents.`,
                    url: 'https://actiontutoring.org.uk/get-involved/volunteer/'
                }
            ];
        }

        if (dimensionName === 'connectivity') {
            return [
                {
                    action: 'Volunteer or drop in with Catbytes',
                    text: `A Lewisham charity running 18 free weekly digital drop-ins across the borough - nearest to Ladywell at Crofton Park Library on Tuesdays - plus a device-loan scheme and volunteer roles.`,
                    url: 'https://catbytes.community/'
                },
                {
                    action: 'Become an AbilityNet tech volunteer',
                    text: `A national charity with 450+ volunteers giving free one-to-one tech support, remote or via home visits, to older and disabled people who are digitally excluded - no confirmed Ladywell-specific group yet.`,
                    url: 'https://abilitynet.org.uk/free-tech-support-and-info/join-our-volunteers'
                }
            ];
        }

        if (dimensionName === 'energy') {
            return [
                {
                    action: 'Train as a SELCE volunteer energy advisor',
                    text: `South East London Community Energy, founded by Lewisham and Greenwich residents, trains volunteers one day a week toward a national energy qualification, giving free advice to fuel-poor households at local "energy cafe" drop-ins.`,
                    url: 'https://selce.org.uk/about-us/jobsvolunteering/'
                },
                {
                    action: 'Apply for the Warm Homes: Local Grant',
                    text: `A government grant, delivered locally via the GLA, offering up to £15,000 for insulation and glazing and another £15,000 for low-carbon heating in low-income, poorly insulated Lewisham homes.`,
                    url: 'https://www.gov.uk/apply-warm-homes-local-grant'
                }
            ];
        }

        if (dimensionName === 'culture') {
            return [
                {
                    action: 'Volunteer with Meet Me at the Albany',
                    text: `A weekly arts club for over-65s, run jointly by The Albany and Entelechy Arts in Deptford - volunteers support singing, painting, crafts and phone-support shifts, and can earn free event tickets.`,
                    url: 'https://www.thealbany.org.uk/jobs/volunteer-with-us/'
                },
                {
                    action: 'Volunteer at Irie! Dance Theatre',
                    text: `Britain's leading African and Caribbean dance-fusion theatre, based at the council-owned Moonshot Centre in New Cross since 2007 - volunteers support performances, workshops and school visits, no experience required.`,
                    url: 'https://www.iriedancetheatre.org/volunteer-with-us'
                },
                {
                    action: "Visit Deptford Foundry's Open Studios weekend",
                    text: `An annual free open-studio weekend in the Deptford/New Cross Creative Enterprise Zone, where 85 resident artists open their doors to the public to meet artists and buy work directly.`,
                    url: 'https://www.secondfloor.co.uk/open-studios'
                },
                {
                    action: "Join Heart n Soul's Taking Part sessions",
                    text: `Creative sessions - Tai Chi, arts, "Speaking Up" chats - run by and for people with learning disabilities and autistic people at The Albany, £5 a day; currently full, so joining means the waiting list.`,
                    url: 'https://www.heartnsoul.co.uk/taking-part-events'
                }
            ];
        }

        if (dimensionName === 'income') {
            return [
                {
                    action: 'Volunteer as a Citizens Advice Lewisham adviser',
                    text: `Free, confidential advice on debt, benefits, housing and employment, based at the Leemore Community Hub - currently recruiting Telephone Assessors and Advisers, with full training given.`,
                    url: 'https://citizensadvicelewisham.org.uk/volunteer-with-us/'
                },
                {
                    action: 'Join Lewisham Plus Credit Union',
                    text: `A not-for-profit financial co-operative founded in 1992, now serving 13,000+ members across Lewisham and Bromley - an ethical, member-owned alternative to high-cost credit, with branches including Lewisham and Catford.`,
                    url: 'https://pluscu.co.uk/'
                },
                {
                    action: 'Become a Grandmentors volunteer mentor',
                    text: `Adults aged 50+ are matched with young people leaving the care system for weekly mentoring over at least a year, tackling the employment and skills gaps behind local poverty.`,
                    url: 'https://volunteeringmatters.org.uk/opportunity/grandmentors-volunteer-lewisham/'
                },
                {
                    action: 'Push your employer to become Living Wage accredited',
                    text: `Lewisham Council funds accreditation fees for three years for newly-accredited local businesses. 95 employers already cover 7,605 employees at the London Living Wage rather than the lower statutory minimum.`,
                    url: 'https://lewisham.gov.uk/myservices/business/london-living-wage'
                }
            ];
        }

        if (dimensionName === 'social_cohesion') {
            return [
                {
                    action: 'Befriend a resettled refugee family',
                    text: `Volunteers give about two hours a week helping Syrian and Iraqi families resettled in Lewisham - the first UK council awarded "Borough of Sanctuary" status, in 2021 - with English practice and local life.`,
                    url: 'https://www.lewishamrefugeewelcome.org/'
                },
                {
                    action: 'Walk the Lewisham Interfaith Walk for Peace',
                    text: `An annual multi-faith walk, started in 2015 after the Charlie Hebdo attack, taking in a synagogue, church, mosque and Hindu temple, organised with the council and Met Police. Open to any faith or none.`,
                    url: 'https://www.lewishaminterfaithforum.org.uk/'
                }
            ];
        }

        if (dimensionName === 'peace_justice') {
            return [
                {
                    action: "Volunteer with Power the Fight's My Lewisham project",
                    text: `A community-led violence-prevention consortium, funded by London's Violence Reduction Unit, working across Pepys Estate, Turnham/Honor Oak and New Cross - a public-health approach to youth violence rather than policing alone.`,
                    url: 'https://www.powerthefight.org.uk/my-lewisham/'
                },
                {
                    action: "Support Refuge's Athena service in Lewisham",
                    text: `Refuge's Lewisham service for survivors of gender-based abuse of all genders offers refuge accommodation, advocates and outreach support - residents can register interest in volunteering by contacting the service directly.`,
                    url: 'https://refuge.org.uk/i-need-help-now/the-athena-gender-based-abuse-service-in-lewisham/'
                },
                {
                    action: 'Attend the Lewisham Safer Neighbourhood Board',
                    text: `An independent resident forum meeting quarterly at Lewisham Town Hall, where locals question the police, council and partners directly on crime and policing priorities across the borough.`,
                    url: 'https://snblewisham.org.uk/'
                },
                {
                    action: 'Register interest in a Youth Offender Panel',
                    text: `Lewisham's "Good"-rated Youth Justice Service uses volunteer panel members to meet young people who've offended and their victims, agreeing a reparative contract together - recruitment is paused but the council is taking names for its next intake.`,
                    url: 'https://lewisham.gov.uk/inmyarea/publicsafety/reducing-violence/our-public-health-approach-to-reducing-violence---how-you-can-get-involved/get-paid-or-voluntary-work-with-young-offenders'
                }
            ];
        }

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
            const formattedValue = typeof ind.snapshot.value === 'number'
                ? ind.snapshot.value.toLocaleString('en-GB')
                : ind.snapshot.value;
            const value = ind.snapshot.value !== null
                ? `${formattedValue}${ind.snapshot.unit ? ' ' + ind.snapshot.unit : ''}`
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
        const geoLabel = geographyLabel(firstIndicator.geography_of_data);
        html += `
            <div class="source-line">
                Source: <a href="${firstIndicator.source.url}" target="_blank">${firstIndicator.source.name}</a>${geoLabel ? ` · <span class="geography-label" title="Resolution of the underlying data - see What this measures below">${geoLabel}</span>` : ''} · last updated ${firstIndicator.source.accessed || 'recently'}
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

        // Add "Why this is happening" section for this group, where available - followed
        // immediately by this indicator's own council context and the national/global
        // research fallback, so the narrative reads what -> why -> what's being done ->
        // wider evidence, instead of council context being stranded at the dimension's end.
        const whyThisIsHappening = getWhyThisIsHappening(baseName);
        if (whyThisIsHappening) {
            html += `
                <div class="detail-section why-section">
                    <h3>Why this is happening</h3>
                    ${whyThisIsHappening.localParagraphs.map(p => `<p>${p}</p>`).join('')}
                    <div class="source-line">${whyThisIsHappening.localSources.length > 1 ? 'Sources' : 'Source'}: ${whyThisIsHappening.localSources.map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ')}</div>
                </div>
            `;

            const inlineCouncilContexts = getCouncilContext(dimension.dimension);
            if (inlineCouncilContexts && inlineCouncilContexts.length > 0) {
                html += '<div class="section-divider"></div>';
                html += '<h3 class="council-context-heading">Local & Broader Context</h3>';
                inlineCouncilContexts.forEach(ctx => {
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

            const nc = whyThisIsHappening.nationalCard;
            html += `
                <div class="council-context">
                    <h4>${nc.title}</h4>
                    ${nc.year ? `<div class="council-date">${nc.year}</div>` : ''}
                    <div class="council-summary">${nc.summary}</div>
                    <div class="source-line">Sources: ${nc.sources.map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ')}</div>
                </div>
            `;
        }

        // Add divider after each group except the last
        if (groupIndex < groupKeys.length - 1) {
            html += '<div class="section-divider"></div>';
        }
    });

    // Add council/government context section(s) for the entire dimension - up to 3 documents
    // when the dimension's indicators span genuinely distinct policy areas (see 3.2 in spec).
    // Health is excluded here because its context is rendered inline under the specific
    // indicator it explains (see getWhyThisIsHappening above) rather than dimension-wide.
    const councilContexts = dimension.dimension === 'health' ? [] : getCouncilContext(dimension.dimension);
    if (councilContexts && councilContexts.length > 0) {
        html += '<div class="section-divider"></div>';
        html += '<h3 class="council-context-heading">Local & Broader Context</h3>';
        councilContexts.forEach(ctx => {
            const sourceLine = ctx.sources
                ? `<div class="source-line">${ctx.sources.length > 1 ? 'Sources' : 'Source'}: ${ctx.sources.map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ')}</div>`
                : (ctx.url ? `<div class="source-line">Source: <a href="${ctx.url}" target="_blank">${ctx.title}</a></div>` : '');
            html += `
                <div class="council-context">
                    <h4>${ctx.title}</h4>
                    ${ctx.year ? `<div class="council-date">${ctx.year}</div>` : ''}
                    <div class="council-summary">${ctx.summary}</div>
                    ${sourceLine}
                </div>
            `;
        });
    }

    // Add "How might we" section for the entire dimension: real, sourced ideas ordinary
    // residents can act on, plus a CTA for residents to contribute their own - submitted
    // ideas would join these same cards in the scroller, not a separate list.
    const waysToGetInvolved = getWaysToGetInvolved(dimension.dimension);
    if (waysToGetInvolved && waysToGetInvolved.length > 0) {
        html += '<div class="section-divider"></div>';
        html += `
            <div class="hmw-prompt">
                <h3 class="hmw-eyebrow">Get Involved</h3>
            </div>
        `;

        html += `
            <div class="involve-scroll">
                ${waysToGetInvolved.map(w => `
                    <a class="involve-card" href="${w.url}" target="_blank">
                        <h4>${w.action}</h4>
                        <p>${w.text}</p>
                    </a>
                `).join('')}
            </div>
        `;

        html += '<button class="add-take-btn">Share your ideas</button>';
    }

    container.innerHTML = html;
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

        // Ward pill acts as a back button to the homepage
        const goHome = () => { window.location.href = 'index.html'; };
        document.getElementById('ward-pill-home').addEventListener('click', goHome);
        document.getElementById('ward-pill-home-overlay').addEventListener('click', goHome);
    }
});
