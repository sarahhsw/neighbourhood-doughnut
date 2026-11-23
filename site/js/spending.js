// Spending page: Ladywell's doughnut dimensions (rows) against public spending columns,
// grouped by who spends the money and at what geography.
//
// Data: data/spending/lewisham_public_spending.json (built by
// data/pipeline/build_public_spending.py; method in docs/spending-methodology.md) and
// data/wards/ladywell.json.
//
// A column is either tagged to a dimension or not: its full amount is shown on every
// dimension it touches and is never split. Borough columns get a dot sized by amount.
// Region-wide columns (e.g. London-wide) are not comparable with borough figures, so they
// get a fixed-size hollow ring and their own header styling.

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

function fmtMoney(m) {
    return m >= 1000 ? `£${(m / 1000).toFixed(1)}bn` : `£${m.toFixed(1)}m`;
}

function fmtChange(pct) {
    if (pct === null || pct === undefined) return '';
    return (pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(0) + '%';
}

function changeColour(pct) {
    return pct >= 0 ? 'var(--spend)' : 'var(--spend-down)';
}

function latest(col) {
    return col.real_millions[col.real_millions.length - 1];
}

function sparkline(values, w, h, { zeroBase, stroke, dot, baseline }) {
    let lo = zeroBase ? Math.min(0, ...values) : Math.min(...values);
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

function spendRow(c) {
    const r = c.real_millions;
    const colour = changeColour(c.real_change_pct);
    const k = c.years.indexOf(c.change_from);
    const from = k >= 0 ? k : 0;
    return `<li class="trend-row">
        <span class="trend-label">${esc(c.name)}<span class="trend-sub">${esc(c.rationale)}${c.caveat ? ' ' + esc(c.caveat) : ''}</span></span>
        ${sparkline(r, 150, 36, { zeroBase: true, stroke: colour, baseline: true })}
        <span class="trend-values">${esc(c.years[from])}: ${fmtMoney(r[from])}<br><strong style="color: ${colour}">${esc(c.years[c.years.length - 1])}: ${fmtMoney(r[r.length - 1])} (${fmtChange(c.real_change_pct)})</strong></span>
    </li>`;
}

function spendPanel(tagged, spend) {
    const local = tagged.filter(c => c.geography === 'borough');
    const wide = tagged.filter(c => c.geography !== 'borough');
    let html = local.length
        ? `<ul class="trend-list">${local.map(spendRow).join('')}</ul>`
        : `<p class="panel-empty">No ${esc(spend.authority)} budget line touches this dimension.</p>`;
    if (wide.length) {
        html += `<div class="panel-subhead"><span class="wide-badge">${esc(spend.region)}-wide</span> For context only: not comparable with ${esc(spend.authority)} figures.</div>
            <ul class="trend-list is-wide">${wide.map(spendRow).join('')}</ul>`;
    }
    return html;
}

function render(spend, ward) {
    const groups = spend.groups;
    const cols = groups.flatMap(g => spend.columns.filter(c => c.group === g.id));
    const boroughMax = Math.max(...cols.filter(c => c.geography === 'borough').map(latest));
    const ncols = cols.length + 1;
    const isWide = c => c.geography !== 'borough';
    const startsGroup = i => i > 0 && cols[i].group !== cols[i - 1].group;

    const groupRow = `<tr class="group-head">
        <td class="dim-col"></td>
        ${groups.map(g => {
            const n = cols.filter(c => c.group === g.id).length;
            if (!n) return '';
            const wide = g.geography !== 'borough';
            return `<th scope="colgroup" colspan="${n}" class="group-start${wide ? ' is-wide' : ''}">
                <span class="group-label">${esc(g.label)}</span>${wide ? `<span class="wide-note">Not comparable with ${esc(spend.authority)}</span>` : ''}
            </th>`;
        }).join('')}
    </tr>`;

    const colRow = `<tr>
        <th scope="col" class="dim-col"><span class="col-kicker">Dimension</span><span class="col-note">Spending after inflation, in ${esc(spend.price_base)} prices</span></th>
        ${cols.map((c, i) => {
            const colour = changeColour(c.real_change_pct);
            return `<th scope="col" class="svc-col${isWide(c) ? ' is-wide' : ''}${startsGroup(i) ? ' group-start' : ''}">
                <span class="svc-name">${esc(c.name)}</span>
                <span class="svc-amt">${fmtMoney(latest(c))}</span>
                ${sparkline(c.real_millions, 76, 30, { zeroBase: true, stroke: colour, baseline: true })}
                <span class="svc-chg" style="color: ${colour}">${fmtChange(c.real_change_pct)}</span>
                <span class="svc-since">since ${esc(c.change_from)}</span>
            </th>`;
        }).join('')}
    </tr>`;
    document.getElementById('spend-head').innerHTML = groupRow + colRow;
    document.getElementById('spend-grid').style.minWidth = `${190 + cols.length * 80}px`;

    const lenses = [
        ['Social foundation', 'local_social'],
        ['Ecological ceiling', 'local_ecological']
    ];
    let html = '';
    lenses.forEach(([label, lens]) => {
        const byDim = {};
        (ward[lens] || []).forEach(ind => { (byDim[ind.dimension] = byDim[ind.dimension] || []).push(ind); });
        html += `<tr class="group-row"><th colspan="${ncols}" scope="colgroup">${label}</th></tr>`;
        Object.keys(byDim).sort().forEach(dim => {
            const inds = byDim[dim];
            const status = dimensionStatus(inds, lens);
            const tagged = cols.filter(c => c.tags.includes(dim));
            const gap = !tagged.some(c => !isWide(c)) && (status === 'shortfall' || status === 'overshoot');
            const id = `detail-${dim}`;
            html += `<tr class="dim-row${gap ? ' is-gap' : ''}" data-dim="${dim}">
                <th scope="row" class="dim-col">
                    <button type="button" class="dim-toggle" aria-expanded="false" aria-controls="${id}">
                        <span class="key-dot" style="background: ${STATUS_COLOURS[status]}" title="${STATUS_LABELS[status]}"></span>
                        <span class="dim-name">${esc(dimensionName(dim))}</span>
                        <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                    </button>
                </th>
                ${cols.map((c, i) => {
                    const cls = [isWide(c) ? 'is-wide' : '', startsGroup(i) ? 'group-start' : ''].filter(Boolean).join(' ');
                    const attr = cls ? ` class="${cls}"` : '';
                    if (!c.tags.includes(dim)) return `<td${attr}></td>`;
                    const label = `${c.name}, ${fmtMoney(latest(c))} in ${c.years[c.years.length - 1]}${isWide(c) ? ` (${spend.region}-wide)` : ''}, touches ${dimensionName(dim)}`;
                    if (isWide(c)) {
                        return `<td${attr}><span class="spend-ring" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span></td>`;
                    }
                    const px = (8 + 26 * Math.sqrt(Math.max(latest(c), 0) / boroughMax)).toFixed(1);
                    return `<td${attr}><span class="spend-dot" style="width:${px}px;height:${px}px" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span></td>`;
                }).join('')}
            </tr>
            <tr class="detail-row" id="${id}" hidden>
                <td colspan="${ncols}">
                    <div class="detail-panel">
                        <section>
                            <div class="panel-head"><h2>Need over time</h2><span>from the ward data</span></div>
                            ${needPanel(inds)}
                        </section>
                        <section>
                            <div class="panel-head"><h2>Public spending that touches it</h2><span>${esc(spend.price_base)} prices</span></div>
                            ${spendPanel(tagged, spend)}
                        </section>
                    </div>
                </td>
            </tr>`;
        });
    });
    document.getElementById('spend-body').innerHTML = html;

    renderMobile(spend, ward, cols, lenses);

    document.getElementById('spend-gaps-list').innerHTML = (spend.gaps || []).map(g =>
        `<li><strong>${esc(g.what)}.</strong> ${esc(g.why)}</li>`).join('');

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

// Phone layout: the grid can't show 25 columns at 390px, so each dimension becomes a row
// with a summary of the budgets that touch it, opening to the same detail as the grid.
function renderMobile(spend, ward, cols, lenses) {
    const isWide = c => c.geography !== 'borough';
    let html = '';
    lenses.forEach(([label, lens]) => {
        const byDim = {};
        (ward[lens] || []).forEach(ind => { (byDim[ind.dimension] = byDim[ind.dimension] || []).push(ind); });
        html += `<h2 class="m-group">${label}</h2><ul class="m-list">`;
        Object.keys(byDim).sort().forEach(dim => {
            const inds = byDim[dim];
            const status = dimensionStatus(inds, lens);
            const tagged = cols.filter(c => c.tags.includes(dim));
            const nLocal = tagged.filter(c => !isWide(c)).length;
            const nWide = tagged.length - nLocal;
            const gap = nLocal === 0 && (status === 'shortfall' || status === 'overshoot');
            const marks = '<span class="spend-dot m-mark"></span>'.repeat(nLocal) + '<span class="spend-ring m-mark"></span>'.repeat(nWide);
            const parts = [];
            if (nLocal) parts.push(`${nLocal} ${esc(spend.authority)}`);
            if (nWide) parts.push(`${nWide} ${esc(spend.region)}-wide`);
            const summary = gap
                ? `<span class="m-none">No ${esc(spend.authority)} budget</span>`
                : (parts.length ? parts.join(' · ') : '<span class="m-zero">No budget line</span>');
            const id = `m-detail-${dim}`;
            html += `<li class="m-item${gap ? ' is-gap' : ''}">
                <button type="button" class="m-toggle" aria-expanded="false" aria-controls="${id}">
                    <span class="key-dot" style="background: ${STATUS_COLOURS[status]}" title="${STATUS_LABELS[status]}"></span>
                    <span class="m-name">${esc(dimensionName(dim))}<span class="m-status">${STATUS_LABELS[status]}</span></span>
                    <span class="m-summary"><span class="m-marks" aria-hidden="true">${marks}</span><span class="m-count">${summary}</span></span>
                    <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </button>
                <div class="m-detail" id="${id}" hidden>
                    <section>
                        <div class="panel-head"><h3>Need over time</h3><span>from the ward data</span></div>
                        ${needPanel(inds)}
                    </section>
                    <section>
                        <div class="panel-head"><h3>Public spending that touches it</h3><span>${esc(spend.price_base)} prices</span></div>
                        ${spendPanel(tagged, spend)}
                    </section>
                </div>
            </li>`;
        });
        html += '</ul>';
    });
    const box = document.getElementById('spend-mobile');
    box.innerHTML = html;
    box.querySelectorAll('.m-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
            btn.closest('.m-item').classList.toggle('is-open', !open);
            document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
        });
    });

    document.getElementById('spend-all-list').innerHTML = spend.groups.map(g => {
        const gcols = cols.filter(c => c.group === g.id);
        if (!gcols.length) return '';
        const wide = g.geography !== 'borough';
        return `<h3 class="m-all-group">${esc(g.label)}${wide ? `<span class="m-all-note">Not comparable with ${esc(spend.authority)}</span>` : ''}</h3>
            <ul class="m-all">${gcols.map(c => {
                const colour = changeColour(c.real_change_pct);
                return `<li>
                    <span class="m-all-name">${wide ? '<span class="spend-ring m-mark"></span>' : '<span class="spend-dot m-mark"></span>'}${esc(c.name)}</span>
                    <span class="m-all-amt">${fmtMoney(latest(c))}</span>
                    ${sparkline(c.real_millions, 64, 24, { zeroBase: true, stroke: colour, baseline: true })}
                    <span class="m-all-chg" style="color: ${colour}">${fmtChange(c.real_change_pct)}<span>since ${esc(c.change_from)}</span></span>
                </li>`;
            }).join('')}</ul>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [spend, ward] = await Promise.all([
            fetch('data/spending/lewisham_public_spending.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error('spend'); return r.json(); }),
            fetch('data/wards/ladywell.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error('ward'); return r.json(); })
        ]);
        render(spend, ward);
    } catch (err) {
        console.error('Error loading spending page data:', err);
        document.getElementById('spend-body').innerHTML =
            '<tr><td class="spend-loading">Could not load the spending data.</td></tr>';
    }
});
