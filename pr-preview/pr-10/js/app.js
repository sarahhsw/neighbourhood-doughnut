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

    // Split each indicator's trend into series. A trend point may carry an optional
    // `series` label (e.g. "England", "Lewisham") when one indicator's chart mixes
    // geographies or survey versions - each label gets its own line, colour and legend
    // entry, so a change of geography or method is never drawn as one continuous line.
    // Points without a label form a single series per indicator, as before.
    const chartTitle = indicatorsWithTrend[0].indicator.replace(/\s*\((Male|Female|Reception|Year 6|Owner-occupied|Private rented|Social rented)\)$/, '');
    const seriesList = [];
    indicatorsWithTrend.forEach(ind => {
        const labels = [...new Set(ind.trend.map(t => t.series || ''))];
        labels.forEach(label => {
            const fallbackLabel = ind.indicator.replace(chartTitle, '').trim().replace(/^\(|\)$/g, '') || ind.indicator;
            seriesList.push({
                ind,
                label: label || fallbackLabel,
                points: ind.trend.filter(t => (t.series || '') === label)
            });
        });
    });
    const showLegend = seriesList.length > 1;

    // Chart dimensions - widen the right margin when legend labels are long
    const width = 600;
    const height = 280;
    const longestLabel = showLegend ? Math.max(...seriesList.map(s => s.label.length)) : 0;
    const margin = { top: 20, right: Math.max(120, Math.ceil(40 + longestLabel * 6.2)), bottom: 35, left: 50 };
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
    const xScale = (index) => margin.left + (allPeriods.length > 1 ? (index / (allPeriods.length - 1)) * chartWidth : chartWidth / 2);
    const yScale = (value) => margin.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

    // Colors for different series
    const colors = ['#E8542D', '#4B3F8F', '#3F8F5B', '#E8A23A'];

    let svg = `
        <div class="detail-section">
            <h3>${chartTitle}</h3>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 600px;" id="trend-chart-${dimension.dimension}">
                <!-- Y axis -->
                <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>
                <!-- X axis -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>
    `;

    // Draw a line for each series
    // Named series keep the same colour on every chart, so "Lewisham" always reads as the
    // local line and "England" as the national one.
    const namedColors = { 'England': '#E8542D', 'England, new survey': '#E8A23A', 'Lewisham': '#4B3F8F', 'Inner London East': '#4B3F8F', 'London': '#7A7A7A', 'Ladywell': '#3F8F5B', 'Ladywell area (est.)': '#3F8F5B' };
    seriesList.forEach((series, seriesIndex) => {
        const color = namedColors[series.label] || colors[seriesIndex % colors.length];
        const ind = series.ind;
        const points = series.points.map(point => {
            const x = xScale(allPeriods.indexOf(point.period));
            const y = yScale(point.value);
            return `${x},${y}`;
        }).join(' ');

        svg += `
            <!-- Line for ${ind.indicator} - ${series.label} -->
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>

            <!-- Data points -->
        `;

        series.points.forEach((point, i) => {
            const x = xScale(allPeriods.indexOf(point.period));
            const y = yScale(point.value);
            const unit = ind.snapshot.unit || '';
            const periodLabel = point.series ? `${point.period} · ${point.series}` : point.period;
            const dataPointId = `datapoint-${dimension.dimension}-${seriesIndex}-${i}`;
            svg += `
                <!-- Larger invisible hit area -->
                <circle cx="${x}" cy="${y}" r="12" fill="transparent" style="cursor: pointer;"
                    data-period="${periodLabel}" data-value="${point.value}" data-unit="${unit}" class="chart-hit-area"></circle>
                <!-- Visible data point -->
                <circle id="${dataPointId}" cx="${x}" cy="${y}" r="4" fill="${color}" style="pointer-events: none;"></circle>
            `;
        });

        // Legend (only needed to distinguish multiple lines - the chart title
        // already names the indicator when there's just one). Labels come from the
        // series label, or the same suffix extraction as the headline value-readout
        // labels, not the full indicator name - otherwise a long base name (e.g. "% of
        // children with obesity (Reception)") gets clipped instead of just reading "Reception".
        if (showLegend) {
            const legendY = margin.top + seriesIndex * 20;
            svg += `
                <line x1="${width - margin.right + 10}" y1="${legendY}" x2="${width - margin.right + 30}" y2="${legendY}" stroke="${color}" stroke-width="2"/>
                <circle cx="${width - margin.right + 20}" cy="${legendY}" r="3" fill="${color}"/>
                <text x="${width - margin.right + 35}" y="${legendY + 4}" font-size="11px" fill="#333">${series.label}</text>
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
                  text-anchor="end" font-size="10px" fill="#666">${maxValue >= 10000 ? Math.round(value / 1000).toLocaleString('en-GB') + 'k' : value.toFixed(1)}</text>
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

    // Group indicators by their base name (without gender/age-group suffix)
    const indicatorGroups = {};
    allIndicators.forEach(ind => {
        const baseName = ind.indicator.replace(/\s*\((Male|Female|Reception|Year 6|Owner-occupied|Private rented|Social rented)\)$/, '');
        if (!indicatorGroups[baseName]) {
            indicatorGroups[baseName] = [];
        }
        indicatorGroups[baseName].push(ind);
    });

    // Custom descriptions for specific dimensions
    const dimensionDescriptions = {
        'health': "Healthy life expectancy in Lewisham sits below London's average of 62.9 years and has fallen from 65 years just over a decade ago, with a particularly sharp drop during the pandemic. The gap is deprivation-linked: as of 2022-24, men in Lewisham's least deprived areas lived 8.8 years longer than men in the most deprived areas. These health inequalities shape how long residents can expect to live without serious illness or disability.",
        'housing': "The private rented sector now houses 27% of Lewisham residents, up from 24% in 2011. Lewisham's Housing Strategy found rents grew 50% against incomes up just 12% in the years to 2018 - and names ending of a private tenancy as the single biggest cause of local homelessness, behind roughly half of cases as of 2020. Rough sleeping is up nearly a third over four years, to 345 people in 2025/26, while temporary accommodation has eased from a 2024 peak but stayed persistently high. The same stretched, low-income renters are also more likely to live in a non-decent home: 16% of private rented homes are non-decent in 2024, against a 12.9% average for all tenures.",
        'food': "Lewisham's diet-related health is mixed. Dental decay in five-year-olds runs below both the London and England averages, and diagnosed diabetes stays well below England's rate too (though now almost identical to London's). Demand on local foodbanks tells a starker story: Trussell network parcels distributed in Lewisham tripled between 2018 and 2025. Child obesity near-doubles between Reception and Year 6 - a pattern repeated every year since measurement began in 2006/07, and slightly worse than London's Year 6 average.",
        'water': "Lewisham sits in Thames Water's supply area, classified as seriously water-stressed in both 2013 and 2021. Two of the company's three levers for closing that gap are moving at different speeds: per-person water use has fallen modestly since 2019/20, though unevenly, with a pandemic-era spike and a recent uptick; leakage - after falling from close to a third of supply in the mid-2000s to around a fifth by 2019/20 - has barely moved since. Both remain well short of what's needed: the Environment Act's 2038 demand-reduction target and the water industry's 2018 commitment to halve leakage by 2050 both require considerably faster progress than either metric is currently making.",
        'mobility': "Public transport access in Ladywell is best near the station: planning assessments rate it excellent (PTAL 6) right by Ladywell station and good (PTAL 4) a few streets away. Across Lewisham, 71.6% of residents' trips are made on foot, by bike or by public transport, well below the 82.1% Inner London average and short of the Mayor's target of 80% by 2041.",
        'equality': "Lewisham's highest-paid fifth earn 2.43 times more per hour than the lowest-paid fifth, a wider gap than England's 1.52 average - the only indicator here with a genuine borough figure. The other three describe London as a whole, because no equivalent breakdown exists for Lewisham specifically: the bottom half of the city's households hold just 4% of its wealth, and gender and ethnicity pay gaps (14% and over 22% respectively) both run well above the national picture. None of these numbers are new arrivals - each reflects a long-standing, slow-moving pattern rather than a recent shift - but taken together they describe income, wealth, gender and ethnicity inequalities that compound rather than cancel out.",
        'community': "Most adults around Lewisham have someone to turn to, but fewer feel they belong where they live. Across inner-east London, the sub-region that includes Lewisham, 95% agreed people would be there for them if they needed help in 2025/26. Neighbourhood belonging is the lowest-scoring of the three: 54% of Lewisham adults feel they belong to their immediate neighbourhood, below England's 61% and not significantly different from London's 58%. Severe loneliness affects 8% of the borough's adults, within the survey's margin of error of England's rate, and nationally runs four times higher among disabled than non-disabled adults, and three times higher in the most deprived areas than the least.",
        'political_voice': "Turnout in Lewisham's mayoral election rose in May 2026, the year the Green Party won control of the council and the mayoralty, but it remains well below general-election turnout. Between elections, residents are unusually active: Lewisham has one of the highest civic participation rates of any council in England - contacting a councillor or MP, signing a petition, attending a public meeting - running about ten points above the national average. Feeling heard is less distinctive: the share who believe they can personally influence local decisions sits above England's but level with London's.",
        'culture': "Lewisham's dedicated arts grants have been cut by almost 40%, part of a wider squeeze on council arts budgets across England. Cultural spaces are unevenly spread: Ladywell has only five open venues, around 60% of the borough's density, with Lewisham's clustered in Deptford and Brockley. Participation is high locally: 88.5% of Lewisham residents engaged with the arts in 2025/26, above both the London and England averages.",
        'education': "GCSE attainment measures the share of pupils leaving compulsory schooling with at least a standard pass (grade 4) in both English and Maths - the government's baseline for further study, apprenticeships and most jobs. In Lewisham, 66% of pupils met it in 2023/24, up from 61% the year before and 59% in 2019, fully reversing the pandemic-era dip. That leaves the borough five points below London's 71% for the same year - London being the strongest-performing region in England - so roughly one in three Lewisham pupils still leaves school without this baseline qualification, a marker closely tied to what comes next in education or work.",
        'connectivity': "Ladywell's physical connectivity is strong: full fibre broadband and 5G coverage both sit close to or above typical levels. Ladywell's Digital Exclusion Risk Index score, 2.5 out of 10, sits below the national median, consistent with London's younger, well-connected population. But that score is an average, and it can hide pockets of risk: a third of Ladywell's children live in income-deprived households and 15% of residents are disabled, both groups that London research identifies as more vulnerable to digital exclusion.",
        'energy': "Ladywell's homes are among the least energy-efficient in Lewisham. Around 38% of local homes with a recent Energy Performance Certificate (EPC) reach Band C or above, against 56% across the borough. Its housing is older: more than half of Ladywell's homes were built before 1930, and only about a quarter of Lewisham's pre-1929 homes reach Band C. Fuel poverty tells a better story. About one in ten Ladywell households were fuel poor in 2024, level with Lewisham and England. The two are linked: the official measure only counts low-income households living in homes rated Band D or below, and the national 2030 target is framed around lifting fuel-poor homes to Band C.",
        'social_cohesion': "Lewisham pairs low trust with strong cohesion. Fewer than a third of residents think many of their neighbours can be trusted - well below England, though level with London - yet more than four in five say people from different backgrounds get on well locally, above the national figure. In 2025/26 residents were also slightly more likely than average to volunteer, while pride in the local area sits in line with England and London. Nationally, trust and cross-background cohesion both fell in 2025/26, as volunteering and pride edged up.",
        'income': "In Lewisham, most people in poverty are in working families, and most people on out-of-work benefits are not job-seekers. More than a quarter of residents live in poverty after housing costs, close to the London average, and around two-thirds of them are in a family where someone works. Out-of-work benefits reach 17.7% of working-age residents, above London's 15.2%, while the claimant count of job-seekers equals only about two in five of that total. Low pay fell in 2025 to below London's rate. Deprivation is patchy within Ladywell: one of its seven neighbourhoods is among England's most deprived tenth for income and employment, while the other six fall between the third and sixth tenths.",
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

                // Lewisham male total life expectancy at birth, 2021-23: 78.3 years
                // (A Picture of Lewisham 2025 - Lewisham Council Public Health)
                const estimatedTotalLE = 78.3;
                const hlePercentage = ((latestValue / estimatedTotalLE) * 100).toFixed(0);

                return `Healthy life expectancy measures the average number of years a person can expect to live in good health from birth. At ${latestValue} years in Lewisham (approximately ${hlePercentage}% of total life expectancy), this sits below London's average of 62.9 years. The indicator has declined by ${decline.toFixed(1)} years from ${oldestValue} years just over a decade ago, with a particularly sharp drop during the pandemic years. This gap points to health inequalities affecting how long residents live without serious illness or disability.`;
            }
        }

        // Housing-specific explanations
        if (baseName === 'Median rent as % of median pay') {
            return `This indicator compares mean rent for a one-bed property to median gross pay - a standard measure of housing affordability. At 43.6% in Lewisham (2025 Q4), it sits below London's own 52% average for the same measure, but well above both the 42% England-wide average and the 30%-of-income rule of thumb widely used to judge whether housing costs are sustainable. The ratio has held in the low-to-mid 40s since 2015 rather than easing or worsening steadily, suggesting a persistently strained affordability band rather than a temporary spike - one that's typical for London, not exceptional to Lewisham. A ratio this high leaves little room for a rent rise or income shock before a household is at risk.`;
        }

        if (baseName === 'Households in temporary accommodation') {
            return `Temporary accommodation is emergency housing the council must provide to households legally assessed as homeless and in priority need - nightly-paid hotels (the most expensive and often least suitable), council-owned properties, and privately leased units. Nightly-paid hotel stays for families are capped at six weeks by law, but stays overall commonly run for years: as of early 2025, London's average stay was 3 years 11 months, almost three times the 1 year 4 months average outside London. Its use here has been driven by rising rents pricing people out of the market and evictions outpacing the supply of settled homes. It functions as both a safety net keeping people off the street and a warning sign of how much strain the housing system is under.`;
        }

        if (baseName === '% non-decent homes') {
            return `A home is "non-decent" if it fails to meet basic standards for safety, repair, facilities or thermal comfort - the government's Decent Homes Standard. Private rented homes are typically the least decent of Lewisham's three tenures, and Ladywell is one of five wards the council placed under selective licensing specifically because of poor private-rented conditions, after a 2021 stock survey found serious safety hazards in 22.7% of local PRS homes.`;
        }

        if (baseName === 'Rough sleepers') {
            return `Rough sleeping counts people seen sleeping on streets, in doorways, parks, or other outdoor locations by outreach workers over the year - the most visible, and most dangerous, form of homelessness. Lewisham was one of nine London boroughs to achieve a temporary reduction in 2024/25, but the rise since suggests those gains were fragile rather than structural: without sustained investment in prevention and move-on accommodation, people cycle back onto the street as fast as they're helped off it. Each person counted here faces acute health risks, vulnerability to violence, and barriers to support, making rough sleeping both a symptom of the borough's housing crisis and one of its most severe consequences.`;
        }

        // Food-specific explanations
        if (baseName === 'Emergency food parcels distributed (Trussell network)') {
            return `Lewisham's Trussell-network foodbanks distributed 22,476 emergency parcels in 2025 (7 locations), used here as a proxy for the local food insecurity trend. That's nearly tripled since 2018's 7,311, tracking the national rise Trussell attributes to the cost-of-living crisis. It peaked in 2023 at 25,659 and has eased by over 12% since, as inflation has cooled - though it remains far above pre-pandemic levels.`;
        }

        if (baseName === '% of children with obesity') {
            return `This comes from the National Child Measurement Programme, which weighs and measures children in Reception and Year 6 each year. The near-doubling between the two ages has held in Lewisham every year since measurement began in 2006/07; weight tends to persist or worsen between the two ages in the same children. Lewisham's Year 6 rate has run consistently above the London average. The borough's Whole Systems Approach to Obesity works toward the government's 2018 ambition to halve childhood obesity by 2030 - but Lewisham's Year 6 rate has barely moved since then, leaving that goal looking increasingly out of reach with about three years left.`;
        }

        if (baseName === '% of children with dental decay') {
            return `Tooth decay in children is tracked through separate national surveys: a biennial one for 5-year-olds (Reception age) and a single one-off survey of Year 6 children in 2022/23, the first and only time that age group has been surveyed nationally. Lewisham's most recent Reception figure (18.9%, 2023/24) and Year 6 figure (9.9%, 2022/23) both sit below the London and England averages - one of London's six lowest Reception rates that round. The Reception trend has been volatile rather than steadily improving, dropping to 12.4% in 2021/22 before rising again, consistent with reduced dental access across the borough during and after the pandemic.`;
        }

        if (baseName === '% of people over 17 years old with type 2 diabetes') {
            return `This tracks the share of Lewisham residents aged 17+ with diabetes recorded on their GP's disease register (both type 1 and type 2, though type 2 accounts for roughly 90% of diagnosed cases). At 7.2% in 2024/25, up steadily from 5.7% in 2012/13, Lewisham has stayed significantly below the England average (7.9%) throughout, and is now almost level with London's (7.2%). The rise mirrors a national trend in an ageing, increasingly overweight population; Lewisham's Whole Systems Approach to Obesity explicitly frames type 2 diabetes prevention as one of the direct health benefits of its weight-management work, alongside cardiovascular risk and joint disease.`;
        }

        // Water-specific explanations
        if (baseName === 'Per capita water consumption (litres/day)') {
            return `Per capita consumption measures the average litres of water each person uses per day across Thames Water's supply area, which includes Lewisham. Use spiked during the pandemic, then eased back before ticking up again in the latest year, leaving little net progress since the 2019/20 baseline. The Environment Act 2021 target - 122 litres by 2038, 110 by 2050 - responds to a growing supply-demand gap from climate change, population growth, and unsustainable abstraction from rivers and aquifers. Demand reduction is the fastest, cheapest of the three levers used, alongside leakage and new supply, and Thames Water's approved resource plan commits to meeting the same 110-litre target.`;
        }

        if (baseName === 'Areas of water stress') {
            return `This records a one-off regulatory classification, not a measurement that moves year to year: whether a water company's area has enough water resource, relative to expected demand, to avoid regular restrictions during a drought. Thames Water - which supplies Lewisham - was designated "seriously water stressed" when the Environment Agency first ran this assessment in 2013, and remained so when it repeated the exercise in 2021. The designation underpins Thames Water's ability to introduce compulsory water metering and its 2024 Water Resources Management Plan, which forecasts a supply deficit in parts of its area by 2050 without further leakage reduction, demand reduction, and new supply projects including a reservoir and a water recycling scheme.`;
        }

        if (baseName === 'Water leakage (% of total supply)') {
            return `Leakage is the share of water Thames Water puts into its network that's lost to bursts and background leaks before reaching a customer's tap. It sat close to a third of supply in the mid-2000s and has fallen fairly steadily since, to just over a fifth more recently. The water industry committed in 2018 to halve total leakage by volume from 2017/18 levels by 2050, a target folded into the Environment Agency's National Framework for Water Resources - the same framework behind the per capita consumption target above.`;
        }

        // Mobility-specific explanations
        if (baseName === 'Public Transport Accessibility Level (TfL 0-6b scale)') {
            return `PTAL scores how easy it is to reach public transport from a given point, combining walk time to the nearest stops with how frequently services run there - it's calculated location by location, not as a single ward or borough figure. Real Lewisham Council planning assessments within Ladywell show that variation directly: sites right by Ladywell station score PTAL 6 ("excellent"), while sites a few streets away score PTAL 4 ("good") - both comfortably above the London-wide low end of the 0-6b scale, but a reminder that "Ladywell's PTAL" depends heavily on which part of the ward you mean.`;
        }

        if (baseName === '% of trips by sustainable modes') {
            return `This tracks the share of Lewisham residents' trips made by walking, cycling or public transport, drawn from TfL's London Travel Demand Survey - a household survey rather than a full count of journeys, so borough figures can move around with sample size. At 71.6% in the 2026 Healthy Streets Scorecard, Lewisham is the second-lowest in Inner London, well below the 82.1% Inner London average. The Mayor's Transport Strategy sets a London-wide goal of 80% by 2041, up from a 63% baseline in 2015.`;
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
            return `Lewisham's rate of severe loneliness - feeling lonely often or always - was 8% in 2025/26. Local estimates have existed since 2023/24, when DCMS began boosting its survey sample to report by council, and none of the year-on-year changes since are statistically significant: Lewisham has moved from just below England's rate to just above it, all within the survey's margin of error. Loneliness is far from evenly spread: nationally it runs several times higher among disabled adults and residents of England's most deprived areas than among their counterparts, and highest among younger adults, LGB+ people, and some minority ethnic groups.`;
        }

        if (baseName === '% adults felt strongly belonged to their neighbourhood') {
            return `This measures the share of adults who say they belong very or fairly strongly to their immediate neighbourhood. Lewisham's 54% in 2025/26 sits below England's 61%, and close to London's 58%. The borough's own estimates, available since 2023/24, have edged down, though not by a statistically significant amount given the survey's sample size. Nationally, belonging peaked in 2020/21 and has since eased back.`;
        }

        if (baseName === '% adults agreed that if they needed help, there would be people there for them') {
            return `This asks adults how strongly they agree that people would be there for them if they needed help - one of the survey's core measures of support networks, alongside loneliness and neighbourhood belonging above. It isn't published for Lewisham or any council; the most local figure covers inner-east London, the sub-region Lewisham sits within, where 95% agreed in 2025/26, in line with England's 96%. Agreement is near-universal and has barely moved nationally since 2018/19, making it the most stable of the three community measures.`;
        }

        // Political voice-specific explanations
        if (baseName === '% turnout in local election') {
            return `This is turnout in the borough-wide election for Mayor of Lewisham, held alongside the council elections. It rose in May 2026, the election in which the Green Party won both the mayoralty and a council majority for the first time, ending Labour's long hold on both. Even so, local turnout stays well below general-election levels: at the July 2024 general election, Lewisham's three constituencies recorded between 56% and 67%.`;
        }

        if (baseName === '% adults that have engaged in civic participation') {
            return `This counts adults who, in the past year, contacted a councillor or MP, signed a petition, or attended a public meeting, rally or protest, in person or online - voting is excluded. Lewisham's rate is one of the highest of any council in England and well above London's, though its own small year-on-year changes since local estimates began in 2023/24 are within the survey's margin of error. Nationally, participation rose in 2025/26, with petition-signing showing the biggest increase, from 25% to 30% of adults.`;
        }

        if (baseName === '% adults agreed they can personally influence decisions affecting local area') {
            return `This asks adults whether they agree, definitely or tending to, that they personally can influence decisions affecting their local area. Lewisham sits clearly above England on this measure but level with London as a whole, and its estimates since 2023/24 show no statistically significant change. Nationally, agreement dipped in 2023/24 and 2024/25 to its lowest level since at least 2017/18, before recovering in 2025/26. Even in Lewisham, fewer than a third of adults feel they can influence local decisions - below the share who take part in civic activity.`;
        }

        // Culture-specific explanations
        if (baseName === '# of cultural venue per 1,000 population') {
            return `This counts open cultural spaces in Ladywell - theatres, music venues, galleries, libraries, artist workspaces, rehearsal studios and similar - from the GLA's 2026 Cultural Infrastructure audit, relative to the ward's population. Ladywell has five: a music venue (The Fox and Firkin), a commercial gallery, a dance rehearsal studio, a prop-making workshop and a jewellery workshop. That works out at 0.32 per 1,000 residents, around 60% of both Lewisham's and London's density (0.52 and 0.53), with the borough's venues clustered instead in Deptford and Brockley. Three other Ladywell spaces in the audit are now closed, including the V22 Ladywell Bridge artist studios and the Taco Queer music venue. With numbers this small, a single opening or closure moves the rate noticeably.`;
        }

        if (baseName === '£ local authority funding in art & culture') {
            return `This tracks Lewisham Council's dedicated grants to arts organisations, separate from money they raise themselves or receive from Arts Council England. For 2026-29 the council ended its separate Arts & Culture Fund and moved arts grants into its general voluntary-sector programme: arts organisations receive £235,000 a year, down from £386,000 a year in 2022-25. The Albany remains the anchor organisation, but its grant falls from £150,000 to £80,000, with smaller grants to groups including Lewisham Youth Theatre, Irie! and Heart n Soul. It excludes the council's wider culture spending. Across England, councils now spend £6.47 per person a year on the arts, down from £18.67 in 2010-11 in real terms.`;
        }

        if (baseName === '% of people aged 16+ who engaged with the arts in the last 12 months') {
            return `This measures the share of residents aged 16 and over who engaged with the arts - attending, watching or taking part, in person or online - at least once in the past year. Lewisham's 88.5% in 2025/26 sits above both London (83.2%) and England (84.4%), the first year this combined in-person-or-online measure has been published by borough. England's earlier trend comes from the Participation Survey it replaced. The sharp national drop in 2025/26 coincides with that switch, and DCMS says it may reflect methodological differences such as question placement rather than a true fall, so it's shown as a separate line. It's a distinct measure from council arts funding above: one counts money councils spend, the other what people actually do.`;
        }

        // Education-specific explanations
        if (baseName === 'GCSE attainment (grades 9-4 in English & Maths)') {
            return `This tracks the government's standard pass benchmark - grade 4 or above in both English and Maths GCSE - the threshold used to judge whether a pupil leaves compulsory education equipped for further study or work; anyone missing it is generally required to keep resitting English and/or Maths post-16. Lewisham's 66% in 2023/24 sits five points below London's 71% for the same year, though the borough has closed the gap that opened during the pandemic: results dipped through the disrupted 2020-2022 exam years before recovering past pre-pandemic levels to a new recent high. Attainment 8, a broader points score across 8 subjects, tells a similar story - up 2.5 points on 2019. The remaining shortfall matters because English and Maths passes gate entry to most level 3 courses and apprenticeships.`;
        }

        // Connectivity-specific explanations
        if (baseName === 'Full fibre broadband coverage (% of premises)') {
            return `Full fibre broadband means the fibre-optic cable runs all the way to the building rather than switching to old copper wiring for the last stretch, giving faster and more reliable speeds than earlier "superfast" broadband. UK coverage has grown from just 10% of premises in 2019 to 82% by January 2026 - one of the fastest infrastructure build-outs in the country's history, driven by competing commercial rollouts (Openreach, Virgin Media O2, and dozens of smaller "altnet" builders) rather than a single programme. Lewisham's own figure sits close to that national trajectory: 81% of premises have full fibre access, per an independent aggregator built on Ofcom's own postcode-level coverage data - gigabit-capable coverage (a broader measure that also includes cable) runs higher still, at 90% in Ofcom's January 2026 data.`;
        }

        if (baseName === '5G mobile coverage (% of landmass, at least one operator)') {
            return `This measures how much of Lewisham's geographic area - not premises or population - has outdoor 5G signal from at least one mobile operator, at Ofcom's "high confidence" reporting threshold. Lewisham reaches 100%, per Ofcom data for January 2026 published through ONS's local-authority "Explore local statistics" service, against 87.6% for England as a whole, because the national figure is dragged down by rural not-spots that a small, fully built-up borough like Lewisham doesn't have. Outdoor 4G coverage is also 100% here. No ward-level figure exists; borough is the most granular level available, as with the full-fibre broadband indicator above.`;
        }

        if (baseName === 'Digital exclusion risk score (0-10 scale)') {
            return `<p>Ladywell scores 2.5 out of 10 on the Digital Exclusion Risk Index (DERI), a composite of 11 indicators - age, disability, qualifications, social grade, broadband access - normalised for comparison across Great Britain. That score is low, consistent with London's younger, well-connected population, though it masks real variation: scores for Ladywell's 7 neighbourhoods range from 2.1 to 3.2. The London Office of Technology and Innovation (LOTI) names the groups most likely to sit on the wrong side of that range - older people, low-income families, ethnic communities (especially Bangladeshi families in low-income households), unemployed people, disabled residents, and small or micro businesses. Applying that framework to Ladywell's own data shows how large each group actually is here.</p>
                <div class="loti-snapshot">
                    <div class="loti-stat"><span class="loti-value">33.6%</span><span class="loti-label">of Ladywell children (aged 0-15) live in income-deprived households</span></div>
                    <div class="loti-stat"><span class="loti-value">10.4%</span><span class="loti-label">of Ladywell's household residents are from ethnic communities and live where someone is out of work: unemployed / long-term sick / disabled</span></div>
                    <div class="loti-stat"><span class="loti-value">15.0%</span><span class="loti-label">of Ladywell residents are disabled under the Equality Act</span></div>
                    <div class="loti-stat"><span class="loti-value">10.0%</span><span class="loti-label">of Ladywell residents are aged 65 and over</span></div>
                    <div class="loti-stat"><span class="loti-value">7.4%</span><span class="loti-label">of economically active Ladywell residents are unemployed</span></div>
                    <div class="loti-stat"><span class="loti-value">93.9%</span><span class="loti-label">of Lewisham businesses are micro-businesses (fewer than 10 employees) in 2026 - no ward figure is published</span></div>
                </div>
                <div class="source-line">Sources: <a href="https://loti.london/wp-content/uploads/2021/07/Mapping-Digital-Exclusion-in-London-LOTI-Toolkit.pdf" target="_blank">Mapping Digital Exclusion in London - LOTI Toolkit (key groups framework)</a> · <a href="https://www.nomisweb.co.uk/sources/census_2021_bulk" target="_blank">ONS Census 2021 - Age, Ethnic group, Disability, Economic activity and Household deprivation by ward</a> · <a href="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025" target="_blank">English Indices of Deprivation 2025, File 7 (IDACI)</a> · <a href="https://www.nomisweb.co.uk/sources/ukbc" target="_blank">UK Business Counts - ONS</a></div>`;
        }

        // Energy-specific explanations
        if (baseName === '% properties with EPC Band C or above') {
            return `EPC ratings run from A (most efficient) to G (least), based on a home's insulation, heating and construction, not its actual bills. Band C is the national benchmark: the 2030 fuel poverty target uses it, and private rented homes must reach it by October 2030. Ladywell's figure is estimated from the two ONS neighbourhood areas covering most of the ward, both in the least efficient third of Lewisham's 37; they include some older streets outside the ward, so the true figure may be a few points higher. The ward's housing is old: 55% of its homes were built before 1930, against 43% across Lewisham, and only 27% of the borough's pre-1929 homes reach Band C. The figures may miss upgrades, since most don't need a new certificate.`;
        }

        if (baseName === '% households in fuel poverty') {
            return `A household counts as fuel poor if its income, after housing costs and energy needs, is below the poverty line and its home is rated Band D or below. Ladywell's figure adds up government estimates for the ward's seven small areas: about 500 of its 5,100 households were fuel poor in 2024, level with Lewisham and England. These are modelled estimates, so the government advises against reading year-to-year changes for an area this small.`;
        }

        // Social cohesion-specific explanations
        if (baseName === '% adults agreed that people in neighbourhood can be trusted') {
            return `This asks whether many of the people in your neighbourhood can be trusted - a widely used measure of neighbourhood trust. Lewisham sits well below England but level with London, and its estimates since 2023/24 show no statistically significant change. Nationally, trust fell in 2025/26 after several steady years. It is very unevenly spread: across England, 26% of 16-34-year-olds say many neighbours can be trusted, against 56% of people aged 75 and over - and 17% in the most deprived tenth of areas, against 58% in the least deprived tenth.`;
        }

        if (baseName === '% adults agreed people from different backgrounds get along well together') {
            return `This asks whether your local area is a place where people from different backgrounds get on well together. Lewisham sits above England and in line with London, with no statistically significant change since local estimates began in 2023/24. Nationally, agreement has eased since 2021/22, with a further significant fall in 2025/26. Younger adults are the least likely to agree: across England, 75-77% of under-50s do, against 87% of people aged 75 and over.`;
        }

        if (baseName === '% proud to live in their local area') {
            return `This asks whether you are proud to live in your local area, a question first asked in this survey in 2023/24. Lewisham's figure is in line with both London and England, and its year-to-year movement is within the survey's margin of error. Among people across England who are proud of their area, the most common reasons are that it feels safe (70%), has green and natural spaces (64%), and has respectful, friendly people (59%).`;
        }

        if (baseName === '% adults that have participated in formal/informal volunteering') {
            return `This combines formal volunteering through a group, club or organisation with informal unpaid help for people who aren't relatives, such as checking on a neighbour. Around three in five Lewisham adults did at least one in the past year, above the England average, with no statistically significant change since local estimates began in 2023/24. Nationally, volunteering fell after 2020/21 and has stayed lower, with a small rise in 2025/26.`;
        }

        // Income-specific explanations
        if (baseName === 'Overall poverty rate (after housing costs)') {
            return `Poverty here means household income below 60% of the median, after housing costs. Each figure pools five years of survey data, because a single year's sample is too small for one borough, and carries a wide margin of error. On that basis Lewisham is close to London but well above England's 21%. Around two-thirds of Lewisham residents in poverty live in a family where someone works. The Index of Multiple Deprivation 2025, which ranks every small neighbourhood in England on income, jobs, health, education, crime, housing and environment, shows the pressure is uneven: one of Ladywell's seven neighbourhoods is in England's most deprived tenth for income and employment, while Lewisham ranks 46th most deprived of 296 council areas on average neighbourhood rank.`;
        }

        if (baseName === '% paid below London Living Wage') {
            return `The London Living Wage is a voluntary hourly rate, independently calculated from what it costs to live in London and higher than the legal minimum. This measure counts the share of Lewisham residents' jobs, wherever they are based, paid below it. For most of the past decade Lewisham tracked close to the London average; in 2025 it fell clearly below. The figure is estimated from a sample survey, so a one-year drop needs the next release to confirm it.`;
        }

        if (baseName === 'Claimant count (% of residents aged 16-64)') {
            return `The claimant count covers people on Jobseeker's Allowance or on Universal Credit who are required to look for work: the closest local measure of active job-hunting, published monthly down to ward level. Ladywell's rate sits a little below Lewisham's and above London's. Lewisham's rate has stayed above London's every September since 2016 and remains well above its pre-pandemic level. It is not the same as the survey-based unemployment rate, which counts everyone out of work and looking, whether or not they claim, but carries a margin of error of nearly two points either way for Lewisham.`;
        }

        if (baseName === '% on out-of-work benefits') {
            return `This counts working-age residents on any main out-of-work benefit: job-seekers, but also people on sickness-related benefits and on Universal Credit who are not required to look for work. Lewisham had the eighth-highest rate of London's 33 local authorities in November 2025. The claimant count of job-seekers equals only about two in five of that total: 14,545 against 38,193 recipients. While the claimant count has fallen well below its pandemic peak, the wider total is now higher than in November 2020, so the growth has come among people not expected to job-hunt.`;
        }

        // Shared with the peace_justice dimension's IMD indicator (the income-dimension IMD
        // indicator was removed in November 2026) - left unchanged.
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
                    `Lewisham's leading causes of death are cancer (30.4%), circulatory disease (28.6%), and respiratory illness (10.8%) (2024/25), with premature death rates worse than England's - 6th-highest in London. The gap is deprivation-linked and widening: men in Lewisham's least deprived areas now live 8.8 years longer than men in the most deprived areas (2022-24), up from 7.3 years in 2019-21.`
                ],
                localSources: [
                    { name: 'A Picture of Lewisham 2025 - Lewisham Council Public Health', url: 'https://www.observatory.lewisham.gov.uk/wp-content/uploads/2025/09/Picture_of_Lewisham_2025_updated_September_2025.pdf' },
                    { name: 'OHID Fingertips - Public Health Outcomes Framework (Inequality in life expectancy at birth, indicator A02a)', url: 'https://fingertips.phe.org.uk/profile/public-health-outcomes-framework' }
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
                        <li><strong>Housing</strong> - training health and social care staff to spot and report damp and mould in people's homes, and strengthening joint working between health and housing services so people leaving hospital aren't discharged back into unsafe housing.</li>
                        <li><strong>Education</strong> - embedding prevention within schools for children and young people.</li>
                        <li><strong>Prevention</strong> - targeting the borough's two leading causes of death: increasing cancer screening coverage, and new Neighbourhood Health Equity Teams focused on cardiovascular disease prevention.</li>
                    </ul>
                    <p>Health and wellbeing partners say they're committed to maintaining, and where possible increasing, investment in prevention despite a challenging financial context.</p>`
            }];
        }

        // Housing dimension council context - 2 documents (capped per current guidance):
        // Housing Strategy covers rent affordability, supply, housing conditions/non-decent
        // homes, AND (via its homelessness priority) temporary accommodation + rough
        // sleeping context. The dedicated Lewisham Homelessness and Rough Sleeping Strategy
        // card was removed 2026-10-31 after fact-checking found a fabricated quote ("no
        // individual should be forced to sleep on the streets" does not appear in the
        // document) and a stale/mischaracterized figure (3,723 households *approaching* the
        // council in 2021/22, presented as "assisted... in the past year") - see git history
        // if a corrected version of this card is wanted back. A dedicated enforcement/
        // licensing document exists (Policies to Support the Regulation and Enforcement of
        // the Private Rented Housing Sector, 2021) but was judged less interesting to
        // surface here - see git history if it's wanted back.
        if (dimensionName === 'housing') {
            return [
                {
                    title: "Lewisham's Housing Strategy 2020-26",
                    year: '2020-2026',
                    url: 'https://lewisham.moderngov.co.uk/documents/s75863/Housing%20Strategy%202020-26.pdf',
                    summary: `<p>Lewisham's housing strategy names the ending of a private rented tenancy as the single biggest cause of homelessness here, linked to private rents growing 50% between 2011 and 2017 against incomes up 12% between 2010 and 2018. It estimates a quarter of private rented homes are non-decent. Its response spans five priorities:</p>
                    <ul>
                        <li><strong>Delivering the homes Lewisham needs</strong> - more council-owned social rent homes and privately rented homes with secure tenancies.</li>
                        <li><strong>Preventing homelessness</strong> - stronger housing advice and less reliance on costly nightly-paid B&amp;Bs, needed because social lettings to waiting-list households have fallen 45% since 2011.</li>
                        <li><strong>Improving housing quality and safety</strong> - wider private rented licensing and investment in fire and building safety.</li>
                        <li><strong>Supporting independent living</strong> - disabled facilities grants for a disabled population growing nearly 30% by 2033.</li>
                        <li><strong>Strengthening communities</strong> - a residents' charter and backing a private renters' union.</li>
                    </ul>
                    <p>Its stated vision: "everyone has a safe, stable and genuinely affordable home" - against a nine-year wait to house the 9,800+ households currently on the register.</p>`
                },
                {
                    title: 'Community-Led Housing and Registered Providers Housing Delivery Strategy',
                    sources: [
                        { name: 'Lewisham launches strategy to boost community-led housing - LocalGov', url: 'https://www.localgov.co.uk/Lewisham-launches-strategy-to-boost-community-led-housing/65069' },
                        { name: 'Lewisham community-led housing plan considers free land - Planning Geek', url: 'https://www.planninggeek.co.uk/2026/lewisham-community-led-housing/' }
                    ],
                    summary: `<p>On 7 October 2026, Mayor and Cabinet noted the development of a new strategy to grow community-led and co-operative housing, building on the 2020-26 Housing Strategy's affordable-homes priority above. Officers say they're prepared to consider discounted or nil-value transfers of council-owned land for schemes delivering at least 50% social rent, backed by a new partnership forum bringing together community groups, co-operatives, smaller housing associations, council officers and funders.</p>
                    <p>It names existing Lewisham schemes as the model to build on - RUSS's 36 self-build homes at Church Grove (completed 2024) and the nil-cost land transfer behind Brasted Close's Citizens House (11 homes, 2023). But nothing has been approved yet: no site, funding or land transfer has been agreed, and a further report is due around March 2027.</p>`
                },
                {
                    title: 'Perspectives from global housing research',
                    summary: `<p><strong>Homelessness:</strong> Finland is the clearest global example of what works against chronic homelessness - a national "Housing First" programme that gives people permanent housing immediately, without requiring sobriety or treatment first, then wraps support around them. Around 82% remain stably housed two years in. But Housing First alone hasn't ended US unsheltered homelessness even as it expanded nationally - researchers trace this to an "inflow" problem: keeping people housed doesn't stop new people becoming homeless, and that inflow is tied to the affordability pressures below.</p>
                    <p><strong>Affordability:</strong> Constrained supply is one driver - loosening land-use rules modestly increases housing supply, though the effect is too small to fix affordability for low- and middle-income renters alone. Housing bought as an investment rather than a home is another: roughly one in five UK homes is now owned by a landlord rather than an owner-occupier, a shift researchers link to easier buy-to-let mortgage credit that has helped drive real UK house prices up fivefold.</p>
                    <p><strong>Housing quality:</strong> The World Health Organization has documented direct health harms from poor housing - damp and mould linked to asthma, cold homes to cardiovascular illness - making substandard housing a measurable population health risk, not just a comfort issue.</p>`,
                    sources: [
                        { name: 'Finnish Housing First Policy - United Nations DESA', url: 'https://www.un.org/development/desa/dspd/wp-content/uploads/sites/22/2019/05/Taina-Finnish-Housing-First-Policy.pdf' },
                        { name: 'Y-Foundation Annual Report 2024', url: 'https://ysaatio.fi/wp-content/uploads/2025/06/Y-Saatio_Annual-Report_2024.pdf' },
                        { name: 'Housing Supply and the Drivers of Homelessness - Bipartisan Policy Center', url: 'https://bipartisanpolicy.org/report/housing-supply-and-homelessness/' },
                        { name: 'Land Use Reforms and Housing Costs - Urban Institute', url: 'https://www.urban.org/research/publication/land-use-reforms-and-housing-costs' },
                        { name: 'The Demand for Housing as an Investment - Josh Ryan-Collins, UCL Bartlett', url: 'https://www.ucl.ac.uk/bartlett/sites/bartlett/files/2025-05/The%20Demand%20for%20Housing%20as%20an%20Investment_0.pdf' },
                        { name: 'WHO Housing and Health Guidelines (2018)', url: 'https://www.who.int/publications/i/item/9789289041683' }
                    ]
                }
            ];
        }

        // Food dimension council context - 3 cards total (at the cap): Food Justice Action
        // Plan covers food insecurity/foodbank demand; Whole Systems Approach to Obesity
        // covers obesity (and touches diabetes, framed as a prevention benefit) - both tied
        // to the dimension's pressing, worsening indicators. A dedicated NHS dental
        // commissioning document existed here too (covering dental decay) but was dropped
        // 2026-10-31 to stay within the 3-card cap: dental decay is this dimension's one
        // genuinely positive-trending indicator (Lewisham runs below London/England, 4th-
        // lowest in London), so it lost out to the two documents addressing indicators that
        // are actually under strain - see DIMENSION_PAGE_SPECIFICATION.md 3.2's "pressing
        // problem" prioritisation rule. Re-add from git history if a 4-indicator version of
        // this dimension's context section is wanted back (would need the cap itself revisited).
        if (dimensionName === 'food') {
            return [
                {
                    title: 'Lewisham Food Justice Action Plan - Update Report (Health & Wellbeing Board)',
                    year: '2023-2027',
                    sources: [
                        { name: 'Lewisham Food Justice Action Plan - Update Report (Health & Wellbeing Board)', url: 'https://lewisham.moderngov.co.uk/documents/s123350/6%20Food%20Justice%20action%20plan%20update%20REPORT.pdf' },
                        { name: 'Lewisham Health & Wellbeing Strategy 2025-2030', url: 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/strategies/health-and-wellbeing-strategy-2025-2030.pdf' }
                    ],
                    summary: `<p>Lewisham launched its Food Justice Action Plan in April 2023 as food bank demand rose sharply after the pandemic and into the cost-of-living crisis, and has since become a Sustainable Food Places Silver Award borough and passed a motion to become a "Right to Food" borough. Its Community Food Justice Grants funded 19 local organisations reaching over 20,000 people between April 2023 and March 2025, with a further funding round in November 2025 bringing the total to 31 organisations; the programme - now funded to April 2027 - sits formally under the council's Whole Systems Approach to Obesity as part of the wider food environment.</p>`
                },
                {
                    title: 'Lewisham Whole Systems Approach to Obesity and weight management medication',
                    year: '2026',
                    url: 'https://lewisham.moderngov.co.uk/documents/s123840/06b.%20Systems%20Approach%20to%20Obesity%20and%20weight%20management%20medication.pdf',
                    summary: `<p>Lewisham's Whole Systems Approach to Obesity (WSAO), running since 2016, is the council's system-wide response to a borough where 21.8% of Reception children and 39% of Year 6 children carry excess weight, and where obesity-related hospital admissions run three times the national rate (62 vs 20 per 100,000, 2019-20). Its most recent focus is integrating new weight-loss medications (Wegovy, Mounjaro) into wider prevention work rather than a standalone fix - both are limited to patients with a BMI over 35 and a weight-related condition, referred through specialist NHS services, since unsupported use tends to see weight regained within two years of stopping. The council frames type 2 diabetes prevention as a direct benefit of this work.</p>`
                },
                {
                    title: 'Perspectives from global food research',
                    summary: `<p>On food insecurity, research from bodies like the UN Food and Agriculture Organization finds that in high-income countries, insecurity is overwhelmingly an income/access problem rather than a food-availability one - food banks treat the symptom, while income support treats the cause. On diet quality, an emerging body of nutrition research, built around the NOVA classification system developed at the University of São Paulo and already written into Brazil's and Uruguay's national dietary guidelines, links ultra-processed food consumption to poor health outcomes independent of a food's individual nutrient content - though critics argue NOVA's categories are too broad and the mostly observational evidence can't yet prove processing itself, rather than a food's fat, sugar or salt content, is what causes harm. Packaged, industrially formulated products still make up more than half of UK dietary energy intake. Both strands point toward food-system fixes over individual willpower: the World Cancer Research Fund's "NOURISHING" framework proposes fiscal tools like sugar taxes, marketing restrictions, reformulation targets and food labelling.</p>`,
                    sources: [
                        { name: 'The State of Food Security and Nutrition in the World - UN FAO', url: 'https://openknowledge.fao.org/server/api/core/bitstreams/5277b379-0acb-4d97-a6a3-602774104629/content' },
                        { name: 'Ultra-processed foods and calorie intake in the UK - Medical Research Council Epidemiology Unit, Cambridge', url: 'https://www.mrc-epid.cam.ac.uk/blog/2024/07/17/upf-two-thirds-calorie-intake-uk-adolescents/' },
                        { name: 'NOURISHING policy framework - World Cancer Research Fund International', url: 'https://www.wcrf.org/research-policy/policy/nutrition-policy/nourishing-framework/' },
                        { name: 'A critical review of the NOVA classification system - Proceedings of the Nutrition Society', url: 'https://www.cambridge.org/core/journals/proceedings-of-the-nutrition-society/article/are-all-ultraprocessed-foods-bad-a-critical-review-of-the-nova-classification-system/16D07B81A1587340B3EE847F3C662E60' }
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
                        <li><strong>Cutting leakage</strong> - continuing to drive down losses from the distribution network, building on the reduction already achieved since the mid-2000s.</li>
                        <li><strong>Reducing demand</strong> - bringing average consumption down to 110 litres per person per day by 2050, matching the government's national target.</li>
                        <li><strong>New supply</strong> - a new reservoir for the South East and a water recycling project in West London, to close the gap leakage and demand reduction alone can't cover.</li>
                    </ul>
                    <p>Leakage and demand reduction together account for roughly four-fifths of the plan's contribution to closing the supply-demand gap.</p>`
                },
                {
                    title: "The London Plan — Policy SI5 (Water infrastructure)",
                    year: '2021',
                    url: 'https://www.london.gov.uk/programmes-strategies/planning/london-plan/the-london-plan-2021-online/chapter-9-sustainable-infrastructure',
                    summary: `<p>Because Thames Water's area is seriously water-stressed, the Mayor of London's London Plan requires new homes to be built water-efficient rather than relying on the water company alone to close the gap: Policy SI5 sets a maximum of 105 litres of mains water per person per day for new residential development (110 including a small allowance), and requires major non-residential schemes to meet the BREEAM "excellent" standard for water use. As the local planning authority, Lewisham Council applies this standard - alongside smart metering, water-saving fittings, and retrofit measures - to development it approves, while the Mayor separately holds water companies to account on leakage and demand reduction through the London Environment Strategy.</p>`
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
                    year: '2018-2021',
                    sources: [
                        { name: 'Lewisham Democracy Review - consultation page', url: 'https://consultation.lewisham.gov.uk/corporate-policy-and-governance/local-democracy-review' },
                        { name: 'Local Democracy Review - Report of the Working Group (Spring 2021)', url: 'https://councilmeetings.lewisham.gov.uk/mgConvert2PDF.aspx?ID=80809' }
                    ],
                    summary: `<p>Lewisham set up a cross-party Local Democracy Review in July 2018 to make the council more democratic, open and transparent, consulting residents and businesses before agreeing 57 recommendations with the Mayor and all councillors in spring 2019. An eight-councillor working group then oversaw delivery through to 2021, covering ground directly relevant to how much influence residents feel they have locally:</p>
                    <ul>
                        <li><strong>Opening up decision-making</strong> - publishing council data in open formats and exploring a residents' "people's panel" to give the public a more direct route into decisions, rather than relying solely on the ballot box and formal consultations.</li>
                        <li><strong>More accessible scrutiny</strong> - a more flexible committee and policy-development system intended to let residents follow and influence council business more easily than the previous structure allowed.</li>
                        <li><strong>Better digital access</strong> - an accessibility-focused website rebuild and new communications approach, on the basis that residents who can't easily find or follow council information can't meaningfully engage with it.</li>
                    </ul>
                    <p>The review set out to widen public involvement in council decisions, and heard that some residents saw formal consultation as tokenistic - the sense of not being heard that the "personally influence local decisions" indicator on this page measures.</p>`
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
                    summary: `<p>Lewisham Council has been removing planning and highways barriers that previously slowed fibre providers from reaching residential streets, scaling up full fibre rollout to homes and businesses across the borough in partnership with network operators. More than 70,000 homes and businesses can already upgrade to Openreach full fibre, though Openreach reports only around 30% of them had actually switched over, illustrating that availability and take-up are two different gaps. Alongside fixed broadband, the council has agreements with BT, Ontix, Freshwave and BAI Communications to install small-cell mobile equipment to improve 4G/5G signal, with installations completed in New Cross and further sites planned across the borough.</p>`
                },
                {
                    title: 'Digital Access for All (Mayor of London Digital Inclusion Service)',
                    year: '2022-',
                    url: 'https://www.london.gov.uk/talk-london/topics/communities/digital-access-all',
                    summary: `<p>The Mayor of London launched the Digital Inclusion Service in June 2022, with the London Office of Technology and Innovation (LOTI) and Good Things Foundation, after estimating around 270,000 Londoners were completely offline and a further 2 million had very low digital engagement. Rather than funding devices, connectivity and skills training as separate schemes - the pattern LOTI found across more than 100 existing London initiatives, each typically covering only part of what someone needs - the service combines a loaned device, low-cost or free mobile connectivity, and basic skills support into one coordinated offer.</p>`
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

        // Energy dimension council context - 2 documents plus the research card: Lewisham's
        // Housing Retrofit Strategy (March 2025) covers what the council is doing about the
        // borough's EPC gap; the national Fuel Poverty Strategy (January 2026) covers the
        // statutory Band C target behind both indicators. The Annual Public Health Report
        // 2023-24 card was retired in November 2026: the 2024-25 report (commercial determinants
        // of health) doesn't cover fuel poverty, and the 2023-24 card's figures were stale.
        if (dimensionName === 'energy') {
            return [
                {
                    title: 'Lewisham Housing Retrofit Strategy',
                    year: '2025',
                    url: 'https://councilmeetings.lewisham.gov.uk/documents/s119552/Housing%20Retrofit%20Strategy%20Report.pdf',
                    summary: `<p>Approved in March 2025, the strategy puts the cost of fully decarbonising every Lewisham home at £3.2bn, £470m of it for council homes. Most homes have solid brick walls, common in pre-1930s terraces, which need costly internal or external insulation. The council makes no commitment to fund full decarbonisation: of 38 projects, only 10 core ones are firm, including:</p><ul><li><strong>Council homes</strong> - retrofitting 250 council homes with government grant funding by September 2025.</li><li><strong>Private owners</strong> - helping low-income and vulnerable residents in privately owned homes reach retrofit grants.</li><li><strong>Private renters</strong> - rolling out landlord licensing across the private rented sector.</li></ul><p>The rest, such as insulating council homes towards Band C and enforcing minimum energy standards for private lets, depend on new funding. Alongside it, the council's energy advice service has helped over 3,500 vulnerable households cut their bills over four years.</p>`,
                    sources: [
                        { name: 'Housing Retrofit Strategy - report to Mayor and Cabinet, 12 March 2025', url: 'https://councilmeetings.lewisham.gov.uk/documents/s119552/Housing%20Retrofit%20Strategy%20Report.pdf' },
                        { name: 'Housing Retrofit Strategy - summary (wall types)', url: 'https://councilmeetings.lewisham.gov.uk/documents/s119553/Housing%20Retrofit%20Strategy%20Summary%20FINAL.pdf' }
                    ]
                },
                {
                    title: 'Fuel Poverty Strategy for England (CP 1497)',
                    year: '2026',
                    url: 'https://assets.publishing.service.gov.uk/media/6977461bd345446f8ce71ef1/fuel-poverty-strategy-for-england-2026-print-ready-version.pdf',
                    summary: `<p>The strategy keeps the statutory target set in 2014: as many fuel-poor homes as reasonably practicable should reach EPC Band C by 2030. It aims to lift a million more households out of fuel poverty by then, while admitting around 1.8 million could still be fuel poor. It works on two fronts:</p><ul><li><strong>Better homes</strong> - private landlords must bring rented homes up to Band C by October 2030, spending up to £10,000 per property, and £5 billion of the £15 billion Warm Homes Plan is set aside for low-income households.</li><li><strong>Lower bills</strong> - the £150 Warm Home Discount is now open to nearly 6 million households and is planned to continue to at least winter 2030/31.</li></ul><p>It puts more weight on bill support than the 2021 strategy did, after the 2022 energy price spike made energy less affordable for millions regardless of how efficient their home is.</p>`
                },
                {
                    title: 'Perspectives from global energy research',
                    summary: `<p>Research on home retrofits finds that efficiency upgrades rarely save as much energy as predicted. One reason is the rebound effect: when a home becomes cheaper to heat, people use some of the gain to keep warmer rather than banking the full saving. Ray Galvin's guide for policymakers argues the effect is largest among households with the greatest need for heat. So for fuel-poor households, an upgrade may show up more as warmth than as a lower bill. The national strategy also pairs home upgrades with direct bill support rather than relying on either alone.</p>`,
                    sources: [
                        { name: 'Hamilton (2016), review of Galvin, The Rebound Effect in Home Heating - Building Research & Information', url: 'https://discovery.ucl.ac.uk/1530717/1/Hamilton%20-%20BRI%20Book%20Review%20-%20v06%20Final.pdf' }
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

        // Income dimension council context - 2 local documents plus the global research card
        // (spec 3.1/3.2 cap of 3). Chosen November 2026 to cover the three questions the user
        // asked: decent pay (Inclusive Economy Lewisham targets), support into work (same
        // strategy's employment/inactivity targets; Lewisham Works), and health-related
        // worklessness (WorkWell Mayor and Cabinet report, approved 9 September 2026, which also
        // describes Connect to Work). Both read in full from the councilmeetings.lewisham.gov.uk
        // mirror. Inclusive Economy Lewisham is the council's current economic development
        // strategy (adopted December 2024, five-year targets); its first progress report (Overview and Scrutiny, 16 Dec 2025)
        // was read for currency but is not cited, to stay within the document cap.
        if (dimensionName === 'income') {
            return [{
                title: 'Inclusive Economy Lewisham - our Economic Development Strategy',
                year: '2024',
                url: 'https://councilmeetings.lewisham.gov.uk/mgConvert2PDF.aspx?ID=123110',
                summary: `<p>Lewisham's economic development strategy, adopted in December 2024, is delivered with partners such as health and education bodies through the Lewisham Strategic Partnership. It sets ten five-year measures of success, several aimed squarely at this page:</p>
                <ul>
                    <li><strong>Decent pay</strong> - raise the share of residents earning at least the London Living Wage from 85% by five percentage points, and narrow the 9.7% gap in full-time median earnings between Lewisham residents and Inner London by five points.</li>
                    <li><strong>More people in work</strong> - lift the employment rate from 75.5% by three points and cut economic inactivity from 20.8% by five points.</li>
                    <li><strong>Better jobs</strong> - its action plan proposes that partners buy from suppliers offering secure jobs paid at least the London Living Wage, pay apprentices the same, and strengthen in-work progression and local hiring.</li>
                </ul>
                <p>Its evidence base notes that the borough's growing hospitality and recreation sectors tend to offer low-paid, insecure work.</p>`
            },
            {
                title: 'WorkWell - Expanding the health and employment integrated system in Lewisham (Mayor and Cabinet)',
                year: 'September 2026',
                url: 'https://councilmeetings.lewisham.gov.uk/documents/s152636/WorkWell%20Expanding%20the%20health%20and%20employment%20integrated%20system%20in%20Lewisham%20-%20Report.pdf',
                summary: `<p>Support for residents whose health stands between them and work runs through Lewisham Works, the council's own employment service, as part of the government's Get Britain Working programme:</p>
                <ul>
                    <li><strong>Connect to Work</strong> - since September 2025, intensive, voluntary support mostly for out-of-work residents with disabilities or health conditions. Mental ill health is the condition participants report most.</li>
                    <li><strong>WorkWell</strong> - approved in September 2026, lighter early help for 1,431 residents over three years, mainly people in work or off sick, before they fall out of work. Coaches will work alongside local health services, take referrals from GPs (including when a fit note is issued), fund occupational health and counselling, and advise employers on workplace adjustments.</li>
                </ul>
                <p>Only the first year's funding, £193,173 of up to £1.23 million, is confirmed. The service starts at Waldron Health Centre and Downham Leisure Centre, and reaches all four of the borough's health neighbourhoods only if later funding arrives.</p>`
            },
            {
                title: 'Perspectives from research on low pay and health-related worklessness',
                summary: `<p>On pay, the Low Pay Commission's review of UK evidence up to 2020 found little sign that the National Living Wage reduced employment overall, though some groups, such as women working part-time, may have lost out. It is now funding research into whether employers' power over local wages changes how minimum-wage rises play out.</p><p>On worklessness, ONS found that economic inactivity because of long-term sickness kept rising after 2022 even as overall inactivity fell, passing 2.5 million people in 2023 - over 400,000 more than before the pandemic. The share of working-age people reporting a long-term health condition rose from 31% in 2019 to 36% in 2023, and over half of those inactive through long-term sickness reported depression, bad nerves or anxiety, often alongside other conditions.</p>`,
                sources: [
                    { name: 'National Minimum Wage: Low Pay Commission Report 2025', url: 'https://www.gov.uk/government/publications/low-pay-commission-report-2025/low-pay-commission-report-2025-html' },
                    { name: 'Rising ill-health and economic inactivity because of long-term sickness, UK: 2019 to 2023 - Office for National Statistics', url: 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/articles/risingillhealthandeconomicinactivitybecauseoflongtermsicknessuk/2019to2023' }
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
                    text: `A volunteer-run workshop space giving people, often older residents living alone, a reason to leave the house. Over 1,000 exist UK-wide - none yet in Ladywell.`,
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
                    text: `A 1,000+ member community land trust based at Church Grove, Ladywell - its Community Hub opened in 2019, followed by 36 self-built affordable homes completed in 2024. Open member meetings welcome newcomers.`,
                    url: 'https://www.theruss.org/about/'
                },
                {
                    action: 'Volunteer with the 999 Club',
                    text: `South East London's year-round homelessness charity - its Gateway day centre and Bridge evening crisis service (run with NHS mental health support) help people off the street and into support. At least one former guest has gone on to sit on its Client Committee as a volunteer.`,
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
                    action: 'Join Evelyn Community Store in Deptford',
                    text: `A volunteer-run social supermarket in Deptford, one of eight now across Lewisham, where members pay £3.50 for a mix of groceries. Join by collecting a paper form on-site, Tuesdays 2-4:30pm.`,
                    url: 'https://www.goodfoodlewisham.org/post/lewisham-s-growing-community-store-movement'
                }
            ];
        }

        if (dimensionName === 'water') {
            return [
                {
                    action: 'Join the 3 Rivers Clean Up on the Ravensbourne',
                    text: `An annual three-week volunteer campaign clearing rubbish and invasive species from the Ravensbourne, Pool and Quaggy - the river that runs straight through Ladywell Fields. Check the website for this year's dates.`,
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
                    text: `Creative sessions - Tai Chi, arts, "Speaking Up" chats - run by and for people with learning disabilities and autistic people at The Albany, £5 a day.`,
                    url: 'https://www.heartnsoul.co.uk/taking-part-events'
                }
            ];
        }

        if (dimensionName === 'income') {
            return [
                {
                    action: 'Volunteer as a Citizens Advice Lewisham adviser',
                    text: `Free, confidential advice on debt, benefits, housing and employment from the Leemore Centre in central Lewisham. Volunteer advisers and telephone assessors get full training.`,
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
                    text: `Accredited employers pay at least the London Living Wage. Lewisham's count grew from around 40 in 2021 to over 120 in 2025, lifting pay for an estimated 7,600 employees.`,
                    url: 'https://www.livingwage.org.uk/accreditation'
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

        // Show snapshot values for all indicators in this group, unless the group is
        // listed here - then show just one sub-type's headline figure (whichever carries
        // the more meaningful story), whatever position this group happens to render in.
        // The trend chart below still plots every sub-type regardless of this filter.
        const singleHeadlineFilter = {
            'Healthy life expectancy at birth': 'Male',
            '% of children with obesity': 'Year 6',
            '% non-decent homes': 'Private rented'
        };
        const indicatorsToShow = (indicators.length > 1 && singleHeadlineFilter[baseName])
            ? indicators.filter(ind => ind.indicator.includes(singleHeadlineFilter[baseName]))
            : indicators;

        indicatorsToShow.forEach((ind, idx) => {
            const formattedValue = typeof ind.snapshot.value === 'number'
                ? ind.snapshot.value.toLocaleString('en-GB')
                : ind.snapshot.value;
            const value = ind.snapshot.value !== null
                ? `${formattedValue}${ind.snapshot.unit ? (ind.snapshot.unit.startsWith('%') ? '' : ' ') + ind.snapshot.unit : ''}`
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
                    ${whatThisMeasures.trim().startsWith('<') ? whatThisMeasures : `<p>${whatThisMeasures}</p>`}
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
                    ${whyThisIsHappening.localParagraphs.map(p => p.trim().startsWith('<') ? p : `<p>${p}</p>`).join('')}
                    <div class="source-line">${whyThisIsHappening.localSources.length > 1 ? 'Sources' : 'Source'}: ${whyThisIsHappening.localSources.map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ')}</div>
                </div>
            `;

            const inlineCouncilContexts = getCouncilContext(dimension.dimension);
            if (inlineCouncilContexts && inlineCouncilContexts.length > 0) {
                html += '<div class="section-divider"></div>';
                html += '<h3 class="council-context-heading">Local & Broader Context</h3>';
                inlineCouncilContexts.forEach(ctx => {
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

            const nc = whyThisIsHappening.nationalCard;
            if (nc) {
                html += `
                    <div class="council-context">
                        <h4>${nc.title}</h4>
                        ${nc.year ? `<div class="council-date">${nc.year}</div>` : ''}
                        <div class="council-summary">${nc.summary}</div>
                        <div class="source-line">Sources: ${nc.sources.map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ')}</div>
                    </div>
                `;
            }
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
    // Connectivity briefly had a "why this is happening" entry too (LOTI framework addition,
    // October 2026) but that content was folded into "what this measures" instead - so
    // connectivity's council-context cards (e.g. the Digital Inclusion Service card) need the
    // normal dimension-wide renderer below, not this inline-only path.
    const inlineRenderedDimensions = ['health'];
    const councilContexts = inlineRenderedDimensions.includes(dimension.dimension) ? [] : getCouncilContext(dimension.dimension);
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

        // Hidden for now: html += '<button class="add-take-btn">Share your ideas</button>';
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
    const displayNames = window.DIMENSION_DISPLAY_NAMES || {};
    if (displayNames[name]) return displayNames[name];
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
