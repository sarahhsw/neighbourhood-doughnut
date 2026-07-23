/**
 * Homepage hero: ward search + decorative half-doughnut chart.
 * Ported from the Claude Design prototype "Homepage Concepts" (2a desktop / 2d mobile).
 * The doughnut uses placeholder dimension data — it's a decorative "any neighbourhood"
 * visual, not tied to the currently searched ward.
 */

const HERO_COLORS = {
    met: '#3F8F5B',
    shortfall: '#E8A23A',
    overshoot: '#C22E4A',
    descriptive: '#8C8478',
    ink: '#241226',
    card: '#FBF3E2',
    paper: '#F2E7D2',
    ringA: '#E8542D',
    ringB: '#4B3F8F'
};

const PLACEHOLDER_DIMS = [
    { id: 'health', ring: 'social', name: 'Health', status: 'shortfall', extent: 0.42 },
    { id: 'housing', ring: 'social', name: 'Housing', status: 'shortfall', extent: 0.6 },
    { id: 'income', ring: 'social', name: 'Income', status: 'met', extent: 0 },
    { id: 'education', ring: 'social', name: 'Education', status: 'shortfall', extent: 0.3 },
    { id: 'community', ring: 'social', name: 'Community', status: 'descriptive', extent: 0.22 },
    { id: 'energy', ring: 'social', name: 'Energy', status: 'descriptive', extent: 0.22 },
    { id: 'climate', ring: 'ecological', name: 'Climate', status: 'overshoot', extent: 0.75 },
    { id: 'materials', ring: 'ecological', name: 'Materials', status: 'overshoot', extent: 0.2 },
    { id: 'ecofootprint', ring: 'ecological', name: 'Eco. footprint', status: 'met', extent: 0 }
];

const WARDS = [
    { id: 'ladywell', name: 'Ladywell', borough: 'Lewisham', available: true },
    { id: 'telegraph-hill', name: 'Telegraph Hill', borough: 'Lewisham', available: false },
    { id: 'perry-vale', name: 'Perry Vale', borough: 'Lewisham', available: false },
    { id: 'brockley', name: 'Brockley', borough: 'Lewisham', available: false },
    { id: 'hither-green', name: 'Hither Green', borough: 'Lewisham', available: false },
    { id: 'forest-hill', name: 'Forest Hill', borough: 'Lewisham', available: false },
    { id: 'sydenham', name: 'Sydenham', borough: 'Lewisham', available: false },
    { id: 'crofton-park', name: 'Crofton Park', borough: 'Lewisham', available: false },
    { id: 'blackheath', name: 'Blackheath', borough: 'Lewisham', available: false },
    { id: 'new-cross', name: 'New Cross', borough: 'Lewisham', available: false },
    { id: 'deptford', name: 'Deptford', borough: 'Lewisham', available: false },
    { id: 'catford-south', name: 'Catford South', borough: 'Lewisham', available: false },
    { id: 'evelyn', name: 'Evelyn', borough: 'Lewisham', available: false }
];

function heroStatusColor(status) {
    return HERO_COLORS[status] || HERO_COLORS.descriptive;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    return node;
}

/**
 * Builds a half-doughnut SVG. `orientation` is 'up' (dome, bottom-cropped — desktop)
 * or 'right' (bulges left, right-cropped — mobile). `size` is only a viewBox coordinate
 * scale; actual rendered size is controlled by CSS on the container.
 */
function buildHeroDoughnut(size, orientation) {
    const side = orientation === 'right';
    const cx = side ? size * 0.58 * 0.9655 : size / 2;
    const cy = side ? size / 2 : size * 0.56;
    const holeR = size * 0.135;
    const socialR = size * 0.335;
    const ecoR = size * 0.445;
    const maxR = size * 0.5;

    const all = PLACEHOLDER_DIMS.filter(d => d.ring === 'social')
        .concat(PLACEHOLDER_DIMS.filter(d => d.ring === 'ecological'));
    const angleStep = Math.PI / all.length;
    const startAngle = side ? Math.PI / 2 : -Math.PI;

    const svg = svgEl('svg', {});
    svg.style.animation = 'doughnutIn .7s cubic-bezier(.2,.8,.2,1)';

    svg.appendChild(svgEl('circle', { cx, cy, r: maxR, fill: '#EADFC8' }));
    svg.appendChild(svgEl('circle', { cx, cy, r: ecoR, fill: HERO_COLORS.card }));
    svg.appendChild(svgEl('circle', { cx, cy, r: socialR, fill: HERO_COLORS.card }));
    svg.appendChild(svgEl('circle', { cx, cy, r: ecoR, fill: 'none', stroke: HERO_COLORS.ringB, 'stroke-width': 1.5, 'stroke-dasharray': '2 4', opacity: 0.6 }));
    svg.appendChild(svgEl('circle', { cx, cy, r: socialR, fill: 'none', stroke: HERO_COLORS.ringA, 'stroke-width': 1.5, 'stroke-dasharray': '2 4', opacity: 0.6 }));
    svg.appendChild(svgEl('circle', { cx, cy, r: holeR, fill: HERO_COLORS.paper, stroke: 'rgba(0,0,0,0.14)', 'stroke-width': 1 }));

    all.forEach((dim, i) => {
        const angle = startAngle + angleStep * (i + 0.5);
        const isSocial = dim.ring === 'social';
        const extent = Math.max(dim.extent, dim.status === 'met' ? 0.03 : 0.14);
        let barInner, barOuter;
        if (isSocial) {
            barOuter = socialR;
            barInner = socialR - (socialR - holeR) * extent;
        } else {
            barInner = ecoR;
            barOuter = ecoR + (maxR - ecoR) * extent;
        }
        const halfW = angleStep * 0.36;
        const a1 = angle - halfW, a2 = angle + halfW;
        const x1 = cx + barInner * Math.cos(a1), y1 = cy + barInner * Math.sin(a1);
        const x2 = cx + barOuter * Math.cos(a1), y2 = cy + barOuter * Math.sin(a1);
        const x3 = cx + barOuter * Math.cos(a2), y3 = cy + barOuter * Math.sin(a2);
        const x4 = cx + barInner * Math.cos(a2), y4 = cy + barInner * Math.sin(a2);

        const labelR = isSocial ? socialR + 15 : ecoR + (maxR - ecoR) + 16;
        const lx = cx + labelR * Math.cos(angle), ly = cy + labelR * Math.sin(angle);
        const label = svgEl('text', {
            x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-size': size * 0.03, 'font-family': 'Inter, sans-serif', 'font-weight': 500,
            fill: HERO_COLORS.ink + '99'
        });
        label.textContent = dim.name;

        const bar = svgEl('path', {
            d: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`,
            fill: heroStatusColor(dim.status), stroke: HERO_COLORS.card, 'stroke-width': 1
        });
        bar.style.transformBox = 'fill-box';
        bar.style.transformOrigin = 'center';
        bar.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
        bar.style.cursor = 'pointer';
        bar.addEventListener('mouseenter', () => {
            bar.style.transform = 'scale(1.12)';
            label.setAttribute('font-weight', '700');
            label.setAttribute('fill', HERO_COLORS.ink);
        });
        bar.addEventListener('mouseleave', () => {
            bar.style.transform = 'scale(1)';
            label.setAttribute('font-weight', '500');
            label.setAttribute('fill', HERO_COLORS.ink + '99');
        });

        svg.appendChild(bar);
        svg.appendChild(label);
    });

    let viewBox;
    if (side) {
        const padH = size * 0.16, padV = size * 0.1, acrossBase = size * 0.58;
        viewBox = `${-padH} ${-padV} ${acrossBase + padH + size * 0.05} ${size + padV * 2}`;
        // Fill the box (cover-crop): keep the left bulge and the bottom edge, crop the right/top.
        svg.setAttribute('preserveAspectRatio', 'xMinYMax slice');
    } else {
        // The desktop hero box is short and very wide, so cover-crop (slice) always ends up
        // cutting into either the side labels or the top labels - there's no pad that avoids
        // both. Contain-fit (meet) never crops; padX is tightened to the minimum that still
        // fully contains the longest label ("Eco. footprint") to maximize the render size.
        const padX = size * 0.125, vbH = size * 0.58;
        viewBox = `${-padX} 0 ${size + padX * 2} ${vbH}`;
        svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    }
    svg.setAttribute('viewBox', viewBox);

    return svg;
}

class WardSearch {
    constructor(root) {
        this.input = root.querySelector('[data-search-input]');
        this.resultsEl = root.querySelector('[data-search-results]');
        this.pickedEl = root.querySelector('[data-search-picked]');
        this.query = '';
        this.picked = null;

        this.input.addEventListener('input', (e) => {
            this.query = e.target.value;
            this.picked = null;
            this.render();
        });
        this.input.addEventListener('focus', () => {
            if (this.query.trim() && !this.picked) this.render();
        });
        this.input.addEventListener('blur', () => {
            setTimeout(() => this.resultsEl.classList.add('hidden'), 150);
        });
    }

    matches() {
        const q = this.query.trim().toLowerCase();
        if (!q) return [];
        return WARDS.filter(w => w.name.toLowerCase().includes(q)).slice(0, 5);
    }

    pick(ward) {
        const msg = ward.available
            ? `Opening ${ward.name}’s doughnut →`
            : `${ward.name} isn’t drawn yet — we’re hand-loading wards one at a time.`;
        this.picked = { name: ward.name, msg, available: ward.available };
        this.query = ward.name;
        this.input.value = ward.name;
        this.render();
        if (ward.available) {
            setTimeout(() => { window.location.href = 'ward.html'; }, 500);
        }
    }

    render() {
        const results = this.matches();
        const showResults = this.query.trim().length > 0 && !this.picked;
        this.resultsEl.classList.toggle('hidden', !showResults);
        this.resultsEl.innerHTML = '';

        if (showResults) {
            if (results.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'search-empty';
                empty.textContent = `No ward matches "${this.query}" yet.`;
                this.resultsEl.appendChild(empty);
            } else {
                results.forEach(w => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'search-result';

                    const name = document.createElement('span');
                    name.textContent = w.name;

                    const tag = document.createElement('span');
                    tag.className = 'search-tag ' + (w.available ? 'live' : 'soon');
                    tag.textContent = w.available ? 'Live' : 'Coming soon';

                    btn.appendChild(name);
                    btn.appendChild(tag);
                    btn.addEventListener('mousedown', (e) => e.preventDefault());
                    btn.addEventListener('click', () => this.pick(w));
                    this.resultsEl.appendChild(btn);
                });
            }
        }

        this.pickedEl.classList.toggle('hidden', !this.picked);
        if (this.picked) {
            this.pickedEl.textContent = this.picked.msg;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WardSearch(document.getElementById('hero-desktop'));
    new WardSearch(document.getElementById('hero-mobile'));

    document.getElementById('doughnut-desktop').appendChild(buildHeroDoughnut(1400, 'up'));
    document.getElementById('doughnut-mobile').appendChild(buildHeroDoughnut(560, 'right'));
});
