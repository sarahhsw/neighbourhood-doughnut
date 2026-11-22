// Council spending page: Ladywell's doughnut dimensions (rows) against Lewisham's
// service budgets (columns), with real-terms spending trends and, per dimension, the
// indicator trends from the ward data.
//
// Data: data/council/lewisham_service_spend.json (built by
// data/pipeline/build_council_spend.py) and data/wards/ladywell.json.
// A service is either tagged to a dimension or not: its full budget is shown on every
// dimension it touches and is never split.

const STATUS_COLOURS = {
    shortfall: 'var(--shortfall)',
    overshoot: 'var(--overshoot)',
    met: 'var(--met)',
    descriptive_only: 'var(--descriptive)'
};
const STATUS_LABELS = {
    shortfall: 'Shortfall',
    overshoot: 'Overshoot',
    met: 'Met',
    descriptive_only: 'No target'
};
const GEOGRAPHY_LABELS = {
    ward: 'Ladywell',
    lsoa_aggregated: 'Ladywell area',
    msoa_aggregated: 'Ladywell area',
    borough_inherited: 'Lewisham-wide',
    london_inherited: 'London-wide',
    water_company: 'Water company area',
    water_body: 'River catchment'
};

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dimensionName(id) {
    const names = window.DIMENSION_DISPLAY_NAMES || {};
    if (names[id]) return names[id];
    return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Same rule as the doughnut chart: the worst indicator status wins.
function dimensionStatus(indicators, lens) {
    if (indicators.some(i => i.status === 'shortfall' || i.status === 'overshoot')) {
        return lens === 'local_social' ? 'shortfall' : 'overshoot';
    }
    if (indicators.some(i => i.status === 'descriptive_only')) return 'descriptive_only';
    return 'met';
}

function fmtNumber(v) {
    if (typeof v !== 'number') return esc(v);
    const abs = Math.abs(v);
    const digits = abs >= 100 ? 0 : (Number.isInteger(v) ? 0 : (abs >= 10 ? 1 : 2));
    return v.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function fmtChange(pct) {
    return (pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(0) + '%';
}

function sparkline(values, w, h, { zeroBase, stroke, dot, baseline }) {
    let lo = zeroBase ? 0 : Math.min(...values);
    let hi = Math.max(...values);
    if (hi === lo) hi = lo + 1;
    if (!zeroBase) { const pad = (hi - lo) * 0.15; lo -= pad; hi += pad; }
    const pts = values.map((v, i) => [
        (2 + i * (w - 4) / Math.max(values.length - 1, 1)).toFixed(1),
        (h - 2 - (v - lo) / (hi - lo) * (h - 6)).toFixed(1)
    ]);
    const last = pts[pts.length - 1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">` +
        (baseline ? `<line x1="2" y1="${h - 1}" x2="${w - 2}" y2="${h - 1}" stroke="#c9b48c" stroke-width="1"/>` : '') +
        `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" style="stroke: ${stroke}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<circle cx="${last[0]}" cy="${last[1]}" r="2.8" style="fill: ${dot || stroke}"${dot ? ' stroke="#241226" stroke-width="1"' : ''}/>` +
        `</svg>`;
}

// One line per indicator: the most local series in its trend.
function needSeries(ind) {
    const trend = (ind.trend || []).filter(p => typeof p.value === 'number');
    if (trend.length < 2) return null;
    const names = [...new Set(trend.map(p => p.series).filter(Boolean))];
    let place = GEOGRAPHY_LABELS[ind.geography_of_data] || '';
    let points = trend;
    if (names.length) {
        const pick = names.find(n => /^Ladywell/.test(n))
            || names.find(n => n === 'Lewisham')
            || names.find(n => /Lewisham/.test(n))
            || names[0];
        points = trend.filter(p => p.series === pick);
        place = pick;
        if (points.length < 2) return null;
    }
    return { place, points };
}

function needPanel(indicators) {
    const rows = indicators.map(ind => {
        const s = needSeries(ind);
        if (!s) return '';
        const unit = ind.snapshot && ind.snapshot.unit ? ind.snapshot.unit : '';
        const u = unit === '%' ? '%' : '';
        const first = s.points[0], last = s.points[s.points.length - 1];
        return `<li class="trend-row">
            <span class="trend-label">${esc(ind.indicator)}<span class="trend-sub">${esc(s.place)}${unit && unit !== '%' ? ' · ' + esc(unit) : ''} · ${STATUS_LABELS[ind.status] || ''}</span></span>
            ${sparkline(s.points.map(p => p.value), 150, 36, { zeroBase: false, stroke: '#241226', dot: STATUS_COLOURS[ind.status] })}
            <span class="trend-values">${esc(first.period)}: ${fmtNumber(first.value)}${u}<br><strong>${esc(last.period)}: ${fmtNumber(last.value)}${u}</strong></span>
        </li>`;
    }).join('');
    return rows
        ? `<ul class="trend-list">${rows}</ul>`
        : '<p class="panel-empty">The ward data has no indicator time series for this dimension yet.</p>';
}

function spendPanel(services, years) {
    if (!services.length) {
        return '<p class="panel-empty">No council service line touches this dimension. The lever may sit with another body.</p>';
    }
    return `<ul class="trend-list">${services.map(s => {
        const r = s.real_millions;
        const colour = s.real_change_pct >= 0 ? 'var(--spend)' : 'var(--spend-down)';
        return `<li class="trend-row">
            <span class="trend-label">${esc(s.name)}<span class="trend-sub">${esc(s.rationale)}</span></span>
            ${sparkline(r, 150, 36, { zeroBase: true, stroke: colour, baseline: true })}
            <span class="trend-values">${esc(years[0])}: £${r[0].toFixed(1)}m<br><strong style="color: ${colour}">${esc(years[years.length - 1])}: £${r[r.length - 1].toFixed(1)}m (${fmtChange(s.real_change_pct)})</strong></span>
        </li>`;
    }).join('')}</ul>`;
}

function render(spend, ward) {
    const services = spend.services;
    const years = spend.years;
    const maxLatest = Math.max(...services.map(s => s.real_millions[s.real_millions.length - 1]));
    const cols = services.length + 1;

    document.getElementById('spend-head').innerHTML = `<tr>
        <th scope="col" class="dim-col"><span class="col-kicker">Dimension</span><span class="col-note">Spending ${esc(years[0])} to ${esc(years[years.length - 1])}, in ${esc(spend.price_base)} prices</span></th>
        ${services.map(s => {
            const r = s.real_millions;
            const colour = s.real_change_pct >= 0 ? 'var(--spend)' : 'var(--spend-down)';
            return `<th scope="col" class="svc-col">
                <span class="svc-name">${esc(s.name)}</span>
                <span class="svc-amt">£${r[r.length - 1].toFixed(1)}m</span>
                ${sparkline(r, 76, 30, { zeroBase: true, stroke: colour, baseline: true })}
                <span class="svc-chg" style="color: ${colour}">${fmtChange(s.real_change_pct)}</span>
            </th>`;
        }).join('')}
    </tr>`;

    const groups = [
        ['Social foundation', 'local_social'],
        ['Ecological ceiling', 'local_ecological']
    ];
    let html = '';
    groups.forEach(([label, lens]) => {
        const byDim = {};
        (ward[lens] || []).forEach(ind => { (byDim[ind.dimension] = byDim[ind.dimension] || []).push(ind); });
        html += `<tr class="group-row"><th colspan="${cols}" scope="colgroup">${label}</th></tr>`;
        Object.keys(byDim).sort().forEach(dim => {
            const inds = byDim[dim];
            const status = dimensionStatus(inds, lens);
            const tagged = services.filter(s => s.tags.includes(dim));
            const gap = tagged.length === 0 && (status === 'shortfall' || status === 'overshoot');
            const id = `detail-${dim}`;
            html += `<tr class="dim-row${gap ? ' is-gap' : ''}" data-dim="${dim}">
                <th scope="row" class="dim-col">
                    <button type="button" class="dim-toggle" aria-expanded="false" aria-controls="${id}">
                        <span class="key-dot" style="background: ${STATUS_COLOURS[status]}" title="${STATUS_LABELS[status]}"></span>
                        <span class="dim-name">${esc(dimensionName(dim))}</span>
                        <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                    </button>
                </th>
                ${services.map(s => {
                    if (!s.tags.includes(dim)) return '<td></td>';
                    const latest = s.real_millions[s.real_millions.length - 1];
                    const px = (8 + 26 * Math.sqrt(latest / maxLatest)).toFixed(1);
                    const label = `${s.name}, £${latest.toFixed(1)}m in ${years[years.length - 1]}, touches ${dimensionName(dim)}`;
                    return `<td><span class="spend-dot" style="width:${px}px;height:${px}px" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span></td>`;
                }).join('')}
            </tr>
            <tr class="detail-row" id="${id}" hidden>
                <td colspan="${cols}">
                    <div class="detail-panel">
                        <section>
                            <div class="panel-head"><h2>${esc(dimensionName(dim))}: need over time</h2><span>from the ward data</span></div>
                            ${needPanel(inds)}
                        </section>
                        <section>
                            <div class="panel-head"><h2>Council budgets that touch it</h2><span>Lewisham-wide, ${esc(spend.price_base)} prices</span></div>
                            ${spendPanel(tagged, years)}
                        </section>
                    </div>
                </td>
            </tr>`;
        });
    });
    document.getElementById('spend-body').innerHTML = html;

    document.querySelectorAll('.dim-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const detail = document.getElementById(btn.getAttribute('aria-controls'));
            const open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
            row.classList.toggle('is-open', !open);
            detail.hidden = open;
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [spend, ward] = await Promise.all([
            fetch('data/council/lewisham_service_spend.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error('spend'); return r.json(); }),
            fetch('data/wards/ladywell.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error('ward'); return r.json(); })
        ]);
        render(spend, ward);
    } catch (err) {
        console.error('Error loading spending page data:', err);
        document.getElementById('spend-body').innerHTML =
            '<tr><td class="spend-loading">Could not load the spending data.</td></tr>';
    }
});
