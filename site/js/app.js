// Neighbourhood Doughnut Portrait - Main App

let wardData = null;
let currentChart = null;
let currentView = 'local'; // 'local' or 'global'

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
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 600px;">
                <!-- Y axis -->
                <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>
                <!-- X axis -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#999" stroke-width="1"/>

                <!-- Target line (only show if threshold exists) -->
                ${dimension.threshold && dimension.threshold.value !== null ? `
                    <line x1="${margin.left}" y1="${yScale(dimension.threshold.value)}"
                          x2="${width - margin.right}" y2="${yScale(dimension.threshold.value)}"
                          stroke="#4B3F8F" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>
                    <text x="${width - margin.right + 5}" y="${yScale(dimension.threshold.value) + 4}"
                          font-size="10px" fill="#4B3F8F">Target: ${dimension.threshold.value}</text>
                ` : ''}
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
            svg += `
                <circle cx="${x}" cy="${y}" r="4" fill="${color}" style="cursor: pointer;">
                    <title>${ind.indicator}: ${point.value} (${point.period})</title>
                </circle>
            `;
        });

        // Legend
        const legendY = margin.top + indIndex * 20;
        svg += `
            <line x1="${width - margin.right + 10}" y1="${legendY}" x2="${width - margin.right + 30}" y2="${legendY}" stroke="${color}" stroke-width="2"/>
            <text x="${width - margin.right + 35}" y="${legendY + 4}" font-size="11px" fill="#333">${ind.indicator.replace('Healthy life expectancy at birth ', '')}</text>
        `;
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
        'health': "Healthy life expectancy in Lewisham sits below London's average of 62.9 years and has fallen from 65 years a decade ago, with a sharp drop during the pandemic. This gap suggests health inequalities are affecting how long residents live without serious illness or disability."
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

        // Generic fallback
        return null;
    }

    // Function to get council/government context for each dimension
    function getCouncilContext(dimensionName) {
        // Health dimension council context
        if (dimensionName === 'health') {
            return {
                title: 'Lewisham Health & Wellbeing Strategy — Going further with prevention',
                year: '2025-2030',
                url: 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/strategies/health-and-wellbeing-strategy-2025-2030.pdf',
                summary: 'The strategy responds to stark health inequalities in Lewisham, where there\'s a 6.6-year gap in male life expectancy between the most and least deprived areas (2020-21), with cancer and cardiovascular disease as the leading causes of death. Rather than focusing solely on healthcare services, the council is targeting three root causes of poor health: poverty, housing, and education — particularly where these intersect with health and care. The approach emphasizes prevention at the community level, aiming to tackle the fundamental drivers of health inequality before they manifest as serious illness, shifting resources upstream from reactive treatment to proactive intervention.'
            };
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

        // Show target line if exists
        if (firstIndicator.threshold && firstIndicator.threshold.value !== null) {
            html += `
                <div class="target-line">Target: ${firstIndicator.threshold.value}${firstIndicator.threshold.unit ? ' ' + firstIndicator.threshold.unit : ''} (${firstIndicator.threshold.description || 'target'})</div>
            `;
        }

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

    // Add council/government context section for the entire dimension
    const councilContext = getCouncilContext(dimension.dimension);
    if (councilContext) {
        html += '<div class="section-divider"></div>';
        html += `
            <h3 class="council-context-heading">Council & Government Context</h3>
            <div class="council-context">
                <h4>${councilContext.title}</h4>
                <div class="council-date">${councilContext.year}</div>
                <div class="council-summary">${councilContext.summary}</div>
            </div>
        `;
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
