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
        'housing': "The private rented sector now houses 40% of Lewisham residents, nearly double its share 20 years ago - and rents in it have grown 50% since 2011 (70% in the borough's historically cheaper streets) while incomes rose barely 12%. The council's own strategy identifies that gap as the single biggest cause of homelessness here: the ending of a private tenancy is behind roughly half of homelessness cases, more than any other reason. The same private rented sector also has a quality problem: MHCLG puts 16% of its homes as non-decent in 2024, well above the 12.9% rate for all tenures. Rough sleeping, meanwhile, has proven hard to shift - up nearly a third since 2021/22 to 345 people in 2025/26, despite a brief dip the year before.",
        'food': "Lewisham's diet-related health mostly compares favourably with London: food insecurity risk (7.8% of residents) and dental decay in five-year-olds (18.9%) both run below the London average, and diagnosed diabetes (7.2% of adults) sits well under England's rate. Child obesity is the exception. Reception-age obesity (10%) is close to average, but by Year 6 it has climbed to 24.5% - more than double - a jump repeated every year since national measurement began in 2006/07, and slightly worse than London's Year 6 average. That reception-to-Year-6 widening, rather than any single indicator in isolation, is the borough's clearest diet-related health signal.",
        'water': "Lewisham sits in Thames Water's supply area, classified as seriously water-stressed in both 2013 and 2021. Per-person use has stayed persistently high: England's 2024/25 average was around 136.5 litres a day, well above the Environment Act's 2038 target of 122 litres - a gap that's barely narrowed since 2019/20.",
        'mobility': "Ladywell's transport accessibility is hyper-local: real planning assessments show excellent PTAL 6 immediately around Ladywell station, falling to good PTAL 4 just a few streets away, since TfL scores access point by point rather than for the ward as a whole. Lewisham's sustainable mode share - trips made on foot, by bike, or by public transport - stood at 72.8% in 2024, short of the Mayor's Transport Strategy target of 80% by 2041 that Lewisham's own transport plan also adopts, and still above London's 67.6% average despite a recent decline from a high of 75.6%.",
        'equality': "Lewisham's highest-paid fifth earn 2.43 times more per hour than the lowest-paid fifth, a wider gap than England's 1.52 average - the only indicator here with a genuine borough figure. The other three describe London as a whole, because no equivalent breakdown exists for Lewisham specifically: the bottom half of the city's households hold just 4% of its wealth, and gender and ethnicity pay gaps (14% and over 22% respectively) both run well above the national picture. None of these numbers are new arrivals - each reflects a long-standing, slow-moving pattern rather than a recent shift - but taken together they describe income, wealth, gender and ethnicity inequalities that compound rather than cancel out.",
        'community': "Both indicators come from DCMS's Community Life Survey, published only at England level - no Lewisham-specific figure exists yet, despite a 2023/24 sample boost meant to enable local estimates. Nationally, loneliness has drifted up: 6.6% of adults felt lonely often or always in 2024/25, above the roughly 6% that held from 2017/18 through the pandemic, though down from a 7.1% peak the year before. Neighbourhood belonging softened too, from a pandemic-era 65% (2020/21) to 62% now. London itself reports weaker belonging than England in every year the two are compared - context for why Lewisham runs its own loneliness service, Community Connections, and directs new neighbourhood-infrastructure grants to local coordination work rather than relying on national trends alone.",
        'political_voice': "Lewisham's own local election turnout swung sharply: just 20.88% voted in 2022, before a genuinely contested three-way race lifted it to 42.14% in May 2026, when the Green Party ended decades of Labour control of the council. That volatility sits alongside a steadier national trend: the share of English adults who feel they can personally influence decisions affecting their local area has fallen to 24% in 2024/25, below every year recorded between 2013/14 and 2021/22 (25-28%). Civic participation - contacting a councillor, signing a petition, attending a public meeting - has settled at 34%, down from a pandemic-era peak near 42% but level with the pre-2023 norm of 2021/22.",
        'culture': "Lewisham's own arts funding is concentrated on a small number of organisations: its Arts & Culture Fund gave £150,000 a year to a single anchor organisation, The Albany, and split roughly £236,000 across eight others over the 2022-25 cycle. That sits within a wider English picture of squeezed council arts budgets, which have fallen 61% in real terms nationally since 2010 (from £18.67 to £6.47 per person a year). Participation itself has held up better than funding: 90.6% of adults nationally engaged with the arts in 2024/25, just below the survey's 2023/24 peak. Lewisham's own cultural venue count - spanning Creative Enterprise Zone studios in Deptford to anchors like the Horniman Museum - could not be verified this session, so no venue density figure is shown.",
        'education': "GCSE attainment measures the share of pupils leaving compulsory schooling with at least a standard pass (grade 4) in both English and Maths - the government's baseline for further study, apprenticeships and most jobs. In Lewisham, 66% of pupils met it in 2023/24, up from 61% the year before and 59% in 2019, fully reversing the pandemic-era dip. That leaves the borough five points below London's 71% for the same year - London being the strongest-performing region in England - so roughly one in three Lewisham pupils still leaves school without this baseline qualification, a marker closely tied to what comes next in education or work.",
        'connectivity': "Connectivity in Lewisham is hard to pin to the borough itself: none of the three indicators here have a confirmed Lewisham-specific figure, only national or London-wide ones. Full fibre broadband reached 82% of UK premises by January 2026, up from just 10% in 2019 - one of the fastest infrastructure rollouts in the country - while outdoor 5G coverage across England reached 81% of landmass in 2025, up from 76% the year before. The remaining gap is less about infrastructure than use: the GLA estimated around 270,000 Londoners were completely offline in 2022, with a further 2 million using the internet only rarely, numbers unlikely to have moved fast given how slowly digital skills and affordability barriers shift.",
        'energy': "Ladywell's homes run well behind London's energy-efficiency average: 43% hold an EPC of C or above, against 56% across the city as a whole, and it isn't Lewisham's most efficient ward - that's Lewisham Central at 78%. Fuel poverty compounds the gap: 13.8% of Lewisham households (17,700) were fuel poor in 2022, above England's 13.1% average that year, and Lewisham was the worst-performing inner-London borough in the count before that. The two aren't unrelated: the fuel poverty metric itself only counts a household as fuel poor if its home also rates D-G for energy efficiency.",
        'social_cohesion': "Lewisham has no ward- or borough-specific trust and cohesion data; the figures shown are England-wide from DCMS's Community Life Survey, the best available proxy. Nationally, the share who think most neighbours can be trusted fell from 48% in 2013/14 to 40% now, and agreement that people from different backgrounds get along slipped from an 84% peak in 2021/22 to 80.6%. Pride in local area, tracked only since 2023/24, has held around 60%. The sharpest shift is in volunteering: 54% of adults gave any unpaid help in 2024/25, the lowest since records began, down from 62% pre-pandemic - driven by a collapse in formal, organisation-based volunteering (28%, down from 37%) while informal neighbourly help held up better."
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
            return `This compares hourly pay at the 80th percentile (higher earners) against the 20th percentile (lower earners) among people working in Lewisham, using ONS's Annual Survey of Hours and Earnings. A ratio of 2.43 means the top-paid fifth earn nearly two and a half times more per hour than the bottom-paid fifth here - noticeably wider than England's 1.52 average, and close to London's own average of around 2.5, reflecting a labour market where well-paid professional and financial jobs sit alongside a large low-paid service sector. Trust for London's data page was refreshed in January 2026 and now reports pay inequality falling in most London boroughs since the previous release; Lewisham was not named among the small number of boroughs where it rose, which suggests some narrowing, though this page could not confirm Lewisham's precise updated figure or reconstruct the year-by-year trend behind it this session.`;
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
            return `This tracks the share of adults who say they feel lonely often or always - the most severe end of a scale used annually by DCMS's Community Life Survey, England's main survey of civic and community life. At 6.6% in 2024/25, it has eased slightly from a 7.1% high the year before but remains above the roughly 6% that held steady from 2017/18 through the pandemic years - there was no survey in 2022/23, leaving a gap in the series. The figure is published for England only; a 2023/24 sample boost was designed to eventually support local authority-level estimates, but no Lewisham-specific figure has yet been produced. Younger adults and people with a limiting long-term illness report substantially higher rates than the headline figure.`;
        }

        if (baseName === '% adults felt strongly belonged to their neighbourhood') {
            return `This measures the share of adults who say they belong very strongly or fairly strongly to their immediate neighbourhood, one of the Community Life Survey's core measures of social cohesion. At 62% in 2024/25, it has drifted down from a pandemic-era high of 65% in 2020/21, when people spent far more time in their local area, though it remains above the 61% low recorded in 2023/24. The measure is published for England only, but where the survey does break results down by region, London has reported weaker neighbourhood belonging than the England average in every year compared - a gap that predates the pandemic and has persisted since.`;
        }

        // Political voice-specific explanations
        if (baseName === '% turnout in local election') {
            return `Lewisham elects its Mayor and 54 councillors together on one ballot paper, so there's a single borough-wide turnout figure rather than separate mayoral and council numbers. It has swung sharply from election to election: 60.7% in 2010 (held the same day as a UK general election, which is not a fair comparison to other rounds), down to 37.2% in 2014, a low of 20.88% in 2022, then back up to 42.14% in May 2026 - the election where the Green Party won a council majority for the first time, ending decades of Labour control. That pattern suggests turnout here tracks how genuinely contested the race feels at least as much as any steady long-term trend. No ward-level Ladywell figure is published or reliably reconstructable from public sources, so the borough-wide figure is shown.`;
        }

        if (baseName === '% adults that have engaged in civic participation') {
            return `Civic participation covers contacting a local councillor or MP, signing a petition, or attending a public meeting or rally, in person or online, but excludes voting itself - a DCMS Community Life Survey measure published for England only, with no Lewisham or London breakdown. At 34% in 2024/25, it sits level with 2021/22 and only slightly above 33% in 2023/24, but well down from a 2020/21 peak of 42%, when lockdown-era mutual aid and local campaigning likely pushed participation unusually high. No survey was run in 2022/23, leaving a gap in the series between the pandemic peak and its settling-down since.`;
        }

        if (baseName === '% adults agreed they can personally influence decisions affecting local area') {
            return `This tracks the share of adults who agree - definitely or tending to - that they personally can influence decisions affecting their local area, from the same Community Life Survey and with the same England-only, no-2022/23-round limitations as civic participation above. At 24% in 2024/25, it has settled at its lowest recorded level: every year from 2013/14 to 2021/22 held in a narrow 25-28% band, before dropping to 23% in 2023/24. Unlike civic participation, which has recovered somewhat since its pandemic peak, this measure of felt influence has not - a gap between doing more (contacting officials, signing petitions) and feeling it changes anything.`;
        }

        // Culture-specific explanations
        if (baseName === '# of cultural venue per 1,000 population') {
            return `This is meant to measure the density of cultural venues - museums, theatres, music venues, artist workspaces and similar - relative to population, drawn from the GLA's Cultural Infrastructure Map, which tags each venue it catalogues by borough. No verified Lewisham venue count was available this session, so no rate is shown here rather than an estimated one. What's known instead is qualitative: Lewisham anchors include the Horniman Museum and Gardens, The Albany in Deptford, the Broadway Theatre in Catford, Trinity Laban Conservatoire, and Goldsmiths, University of London, and the borough was London Borough of Culture in 2022. Its Deptford/New Cross Creative Enterprise Zone - one of London's original zones, running since 2018 - has also brought hundreds of affordable artist studios into the borough, though these sit outside the Cultural Infrastructure Map's own venue categories.`;
        }

        if (baseName === '£ local authority funding in art & culture') {
            return `This tracks Lewisham Council's own spending on arts and culture, distinct from money the sector raises independently or receives from Arts Council England or the Mayor of London. The figure shown - £386,000 over the 2022-25 grant cycle - is specifically the council's Arts & Culture Fund: £150,000 a year to a single "cultural anchor" organisation, The Albany, plus roughly £236,000 split across eight further organisations including Entelechy Arts, Irie!, LEAN and Heart n Soul. It doesn't capture the council's full culture and library service budget, which is larger and wasn't obtainable this session. Nationally, council arts spending has fallen 61% in real terms since 2010 - from £18.67 to £6.47 per resident a year - a squeeze widely attributed to over a decade of reduced central government funding to local authorities generally, arts being a non-statutory service more exposed to cuts than areas like social care.`;
        }

        if (baseName === 'Active participation') {
            return `This measures the share of adults who engaged with the arts - attending, watching or taking part, in person or online - at least once in the past year, from DCMS's annual Participation Survey. It's an England-wide figure only: the survey publishes results down to broad regions, not by borough, so no Lewisham-specific number exists. At 90.6% in 2024/25, participation sits close to record levels but has eased slightly from a 91.4% peak in 2023/24. The survey began in October 2021, replacing the discontinued Taking Part survey run on different methodology, so no earlier comparable trend exists. It's a distinct measure from council arts funding above: one counts money councils choose to spend, the other counts what people actually do, and the two aren't tracked together by either source.`;
        }

        // Education-specific explanations
        if (baseName === 'GCSE attainment (grades 9-4 in English & Maths)') {
            return `This tracks the government's standard pass benchmark - grade 4 or above in both English and Maths GCSE - the threshold used to judge whether a pupil leaves compulsory education equipped for further study or work; anyone missing it is generally required to keep resitting English and/or Maths post-16. Lewisham's 66% in 2023/24 sits five points below London's 71% for the same year, though the borough has closed the gap that opened during the pandemic: results dipped through the disrupted 2020-2022 exam years before recovering past pre-pandemic levels to a new recent high. Attainment 8, a broader points score across 8 subjects, tells a similar story - up 2.5 points on 2019. The remaining shortfall matters because English and Maths passes gate entry to most level 3 courses and apprenticeships.`;
        }

        // Connectivity-specific explanations
        if (baseName === 'Full fibre (FTTP) broadband coverage (% of premises)') {
            return `Full fibre (FTTP) means the fibre-optic cable runs all the way to the building rather than switching to old copper wiring for the last stretch, giving faster and more reliable speeds than earlier "superfast" broadband. UK coverage has grown from just 10% of premises in 2019 to 82% by January 2026 - one of the fastest infrastructure build-outs in the country's history, driven by competing commercial rollouts (Openreach, Virgin Media O2, and dozens of smaller "altnet" builders) rather than a single programme. No Lewisham- or London-specific figure could be independently confirmed this session; a third-party broadband comparison site estimates 84.2% gigabit-capable coverage (a broader measure that also includes cable) across Lewisham as of 2026, roughly in line with the national trajectory, though that figure comes from a site one step removed from Ofcom's own data rather than Ofcom directly.`;
        }

        if (baseName === '5G mobile coverage (% of landmass, at least one operator)') {
            return `This measures how much of England's landmass - not premises or population - has outdoor 5G signal from at least one of the four mobile network operators, at Ofcom's "high confidence" reporting threshold. It reached 81% in 2025, up from 76% the year before, though landmass coverage understates real-world access in a place like Lewisham: dense urban areas are covered far more completely than the rural land dragging the national average down, since indoor 4G coverage alone already reaches 97-99% of premises in English urban areas versus 77-85% in rural ones. No Lewisham- or London-specific coverage percentage could be independently confirmed this session, even though Ofcom and ONS both publish exactly this kind of borough-level breakdown - their sites were unreachable under this session's network access.`;
        }

        if (baseName === 'Londoners digitally excluded or with very low digital engagement') {
            return `Digital exclusion covers people who are completely offline as well as those who technically have internet access but use it so rarely or with so little confidence that it doesn't function as real access - to job applications, banking, GP bookings, or benefits claims increasingly designed "digital by default". The GLA estimated around 270,000 Londoners were completely offline in 2022, with a further 2 million using the internet only rarely, when it launched a Digital Inclusion Service aiming to directly support up to 75,000 people over three years by combining a loaned device, low-cost connectivity, and basic skills support - support that's often offered separately and so easier for people to fall through the gaps of. No Lewisham-specific figure exists: the GLA's own borough-level digital exclusion mapping project did not include Lewisham among its five pilot boroughs, and its underlying LSOA-level dataset was inaccessible this session.`;
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
            }];
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

        // Mobility dimension neighbour voices
        if (dimensionName === 'mobility') {
            return [
                {
                    name: 'Oliver',
                    location: 'Ladywell Station',
                    date: 'Jul 2026',
                    quote: 'Trains from Ladywell are brilliant, ten minutes to London Bridge. Walk fifteen minutes the other way towards Whitefoot and it\'s a different story entirely.'
                },
                {
                    name: 'Priya',
                    location: 'Algernon Road',
                    date: 'Jun 2026',
                    quote: 'Gave up cycling to work along the South Circular. Never felt unsafe on the quieter streets, always felt unsafe crossing that one road.'
                },
                {
                    name: 'Marcus',
                    location: 'Ladywell Fields',
                    date: 'May 2026',
                    quote: 'The 171 bus used to come every eight minutes. Now I\'m regularly waiting twenty, and I\'ve started just walking to the station instead.'
                },
                {
                    name: 'Fatima',
                    location: 'Vicars Hill',
                    date: 'Apr 2026',
                    quote: 'My daughter\'s school does a School Street now, no cars at drop-off. Wish more of the roads around it felt that calm the rest of the day too.'
                },
                {
                    name: 'Ben',
                    location: 'Brockley Road',
                    date: 'Mar 2026',
                    quote: 'Sold the car last year. Between the train and the buses I don\'t miss it, but I know that only works because we\'re close to the station.'
                }
            ];
        }

        // Community dimension neighbour voices
        if (dimensionName === 'community') {
            return [
                {
                    name: 'Grace',
                    location: 'Ladywell Fields',
                    date: 'Jul 2026',
                    quote: 'Signed up as a befriender through Community Connections after my own mum went through a lonely patch. My "match" and I are up to a Tuesday phone call and a walk most fortnights now.'
                },
                {
                    name: 'Errol',
                    location: 'Adelaide Avenue',
                    date: 'Jun 2026',
                    quote: 'The community centre\'s grant got cut this year, so the Thursday lunch club is down to twice a month. For some of the regulars, that\'s the only time they leave the house.'
                },
                {
                    name: 'Mei',
                    location: 'Ladywell Village',
                    date: 'May 2026',
                    quote: 'Been here two years and still don\'t really know my neighbours beyond a nod on the stairs. Everyone seems friendly enough, just busy - it\'s on me as much as anyone, I know.'
                },
                {
                    name: 'Trevor',
                    location: 'Algernon Road',
                    date: 'Apr 2026',
                    quote: 'My GP referred me to Community Connections after my wife passed. Took some persuading to go along to the first coffee morning, but I haven\'t missed one since.'
                },
                {
                    name: 'Naomi',
                    location: 'Brookmill Road',
                    date: 'Mar 2026',
                    quote: 'Started a street WhatsApp group after a spate of shed break-ins. Didn\'t expect it to turn into people offering to walk each other\'s dogs, but that\'s mostly what it\'s for now.'
                }
            ];
        }

        // Equality dimension neighbour voices
        if (dimensionName === 'equality') {
            return [
                {
                    name: 'Adaeze',
                    location: 'Ladywell Village',
                    date: 'Jul 2026',
                    quote: 'Same job title as a colleague across the river, same experience - found out by accident he\'s on nearly £8k more. Wasn\'t even awkward for him to tell me. That said everything.'
                },
                {
                    name: 'Connor',
                    location: 'Algernon Road',
                    date: 'Jun 2026',
                    quote: 'My parents bought their flat in the eighties for what feels like pocket change now. I earn more than they ever did and still can\'t get near a deposit. Pay isn\'t the thing holding me back, it\'s never having had property behind me.'
                },
                {
                    name: 'Priya',
                    location: 'Vicars Hill',
                    date: 'May 2026',
                    quote: 'Went part-time after my second was born because the nursery fees didn\'t add up any other way. Five years on my pay\'s barely moved while my husband\'s has doubled. Nobody signs up for that, it just happens.'
                },
                {
                    name: 'Marlon',
                    location: 'Brockley Road',
                    date: 'Apr 2026',
                    quote: 'Been passed over for two promotions I was qualified for. Both times it went to someone with less experience who just seemed to "fit" the team better. Hard to prove, easy to feel.'
                },
                {
                    name: 'Grace',
                    location: 'Ladywell Fields',
                    date: 'Mar 2026',
                    quote: 'I clean offices in the City on minimum wage. The people whose desks I wipe down earn in a day what takes me a fortnight. We\'re in the same building, we might as well be in different countries.'
                }
            ];
        }

        // Political voice dimension neighbour voices
        if (dimensionName === 'political_voice') {
            return [
                {
                    name: 'Winston',
                    location: 'Ladywell Village',
                    date: 'Jul 2026',
                    quote: 'First time in years I actually queued to vote in May. Usually it\'s in and out in two minutes - this time there was a real choice on the ballot and it showed.'
                },
                {
                    name: 'Chidinma',
                    location: 'Adelaide Avenue',
                    date: 'Jun 2026',
                    quote: 'Wrote to my councillor about the potholes on our road three times last year. Got an automated reply each time and the potholes are still there.'
                },
                {
                    name: 'Pat',
                    location: 'Vicars Hill',
                    date: 'May 2026',
                    quote: 'Our ward assembly used to be where you\'d actually get a straight answer out of the council. Now it\'s just an email newsletter, and I don\'t feel like anyone\'s really listening.'
                },
                {
                    name: 'Josh',
                    location: 'Ladywell Fields',
                    date: 'Apr 2026',
                    quote: 'Signed the petition about the school crossing outside the gates one morning. Three hundred signatures in a week - whether it actually changes anything is another matter.'
                },
                {
                    name: 'Deborah',
                    location: 'Algernon Road',
                    date: 'Mar 2026',
                    quote: 'I\'ve lived here 40 years and I still don\'t feel like my vote at the local level changes much day to day. National elections feel different somehow - this one just doesn\'t.'
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
