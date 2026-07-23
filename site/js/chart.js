/**
 * Doughnut Chart Renderer
 * Matches official Doughnut Economics visualization style
 *
 * Structure:
 * - Center circle = "Safe and Just Space"
 * - Inner boundary ring = Social Foundation (floor)
 * - Outer boundary ring = Ecological Ceiling (ceiling)
 * - Bars extend FROM the safe space:
 *   - INWARD (toward center) = Social shortfall
 *   - OUTWARD (beyond ceiling) = Ecological overshoot
 */

const COLORS = {
    // Design spec status colors
    met: '#3F8F5B',              // Green - met/within boundary
    shortfall: '#E8A23A',        // Yellow/orange - social shortfall
    overshoot: '#C22E4A',        // Red - ecological overshoot
    descriptive: '#8C8478',      // Grey - no target/descriptive only

    // Rings and zones
    paper: '#F2E7D2',            // Background
    safeSpace: '#E8F5E9',        // Light green - the safe space
    socialRing: '#4B3F8F',       // ringB - social foundation boundary band
    ecologicalRing: '#E8542D'    // ringA - ecological ceiling boundary band
};

class DoughnutChart {
    constructor(containerId, data, viewMode = 'local') {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.viewMode = viewMode;
        this.width = 600;
        this.height = 600;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        // Radii definitions
        this.centerHoleRadius = 40;           // Empty center
        this.socialFoundationRadius = 120;    // Inner boundary (social foundation floor)
        this.ecologicalCeilingRadius = 173;   // Outer boundary (ecological ceiling)
        this.maxOvershootRadius = 220;        // Maximum extent for overshoot bars
        this.ringBandWidth = 13;              // Thickness of the boundary bands
        this.wedgeFillFraction = 0.82;        // Portion of each dimension's sector filled by its wedge

        // Tight viewBox around the drawn content (max radius + label/stroke buffer),
        // so the rendered chart isn't surrounded by large blank margins at big sizes.
        this.contentRadius = this.maxOvershootRadius + 15;
    }

    groupDimensions(dimensions) {
        // Group indicators by dimension name
        const grouped = {};
        dimensions.forEach(dim => {
            if (!grouped[dim.dimension]) {
                grouped[dim.dimension] = [];
            }
            grouped[dim.dimension].push(dim);
        });
        return grouped;
    }

    blendDimension(indicators) {
        // Blend multiple indicators into a single dimension assessment

        // 1. Determine overall status (worst status wins)
        let status = 'met';
        if (indicators.some(ind => ind.status === 'shortfall' || ind.status === 'overshoot')) {
            status = indicators[0].lens === 'local_social' ? 'shortfall' : 'overshoot';
        } else if (indicators.some(ind => ind.status === 'descriptive_only')) {
            status = 'descriptive_only';
        }

        // 2. Calculate average shortfall/overshoot extent
        const indicatorsWithTargets = indicators.filter(ind =>
            ind.threshold && ind.threshold.value !== null &&
            ind.snapshot && ind.snapshot.value !== null
        );

        let avgExtent = 0.5; // Default 50% if no targets

        if (indicatorsWithTargets.length > 0) {
            const deviations = indicatorsWithTargets.map(ind => {
                const target = ind.threshold.value;
                const actual = ind.snapshot.value;

                // Calculate % deviation from target
                // Positive = shortfall/overshoot, Negative = better than target
                const deviation = (actual - target) / target;

                return Math.abs(deviation); // Use absolute for extent
            });

            // Average of absolute deviations
            avgExtent = deviations.reduce((a, b) => a + b, 0) / deviations.length;

            // Normalize to 0-1 range (cap at 100% deviation)
            avgExtent = Math.min(avgExtent, 1.0);
        }

        return {
            dimension: indicators[0].dimension,
            status: status,
            extent: avgExtent,
            indicatorCount: indicators.length,
            // Keep first indicator's metadata for display
            snapshot: indicators[0].snapshot,
            threshold: indicators[0].threshold
        };
    }

    render() {
        this.container.innerHTML = '';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgEl = svg;
        const boxSize = this.contentRadius * 2;
        const boxOrigin = this.centerX - this.contentRadius;
        svg.setAttribute('width', boxSize);
        svg.setAttribute('height', boxSize);
        svg.setAttribute('viewBox', `${boxOrigin} ${boxOrigin} ${boxSize} ${boxSize}`);

        // Get dimensions based on view mode
        const socialIndicators = this.viewMode === 'local'
            ? this.data.local_social
            : this.data.global_social;
        const ecologicalIndicators = this.viewMode === 'local'
            ? this.data.local_ecological
            : this.data.global_ecological;

        // Group indicators by dimension and blend
        const socialGrouped = this.groupDimensions(socialIndicators);
        const ecologicalGrouped = this.groupDimensions(ecologicalIndicators);

        const socialDimensions = Object.keys(socialGrouped).map(dimName =>
            this.blendDimension(socialGrouped[dimName])
        );
        const ecologicalDimensions = Object.keys(ecologicalGrouped).map(dimName =>
            this.blendDimension(ecologicalGrouped[dimName])
        );

        const totalDimensions = socialDimensions.length + ecologicalDimensions.length;

        if (totalDimensions === 0) {
            this.drawEmptyState(svg);
            return;
        }

        // Draw zones (background)
        this.drawZones(svg);

        // Draw boundary rings
        this.drawBoundaryRings(svg);

        // Draw center text
        this.drawCenterText(svg);

        // Draw dimension bars
        this.drawDimensionBars(svg, socialDimensions, ecologicalDimensions);

        this.container.appendChild(svg);
    }

    drawZones(svg) {
        // Safe and just space (between social foundation and ecological ceiling)
        const safeSpace = this.createRing(
            this.centerX, this.centerY,
            this.socialFoundationRadius,
            this.ecologicalCeilingRadius,
            COLORS.safeSpace
        );
        svg.appendChild(safeSpace);

        // Inner zone (social shortfall zone - white)
        const innerZone = this.createCircle(
            this.centerX, this.centerY,
            this.socialFoundationRadius,
            '#FFFFFF'
        );
        svg.appendChild(innerZone);
    }

    drawBoundaryRings(svg) {
        const half = this.ringBandWidth / 2;

        // Ecological ceiling band (outer boundary) - solid ringA band with curved label
        const ecoBand = this.createRing(
            this.centerX, this.centerY,
            this.ecologicalCeilingRadius - half,
            this.ecologicalCeilingRadius + half,
            COLORS.ecologicalRing
        );
        svg.appendChild(ecoBand);

        // Social foundation band (inner boundary) - solid ringB band with curved label
        const socialBand = this.createRing(
            this.centerX, this.centerY,
            this.socialFoundationRadius - half,
            this.socialFoundationRadius + half,
            COLORS.socialRing
        );
        svg.appendChild(socialBand);

        // Curved ring labels, set directly on the bands (top arc, reading left-to-right)
        this.addCurvedRingLabel(svg, 'ecoRingPath', 'ECOLOGICAL CEILING', this.ecologicalCeilingRadius);
        this.addCurvedRingLabel(svg, 'socialRingPath', 'SOCIAL FOUNDATION', this.socialFoundationRadius);
    }

    addCurvedRingLabel(svg, pathId, text, radius) {
        // Invisible arc (top half, left-to-right) for the label to follow
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', pathId);
        path.setAttribute(
            'd',
            `M ${this.centerX - radius} ${this.centerY} A ${radius} ${radius} 0 0 1 ${this.centerX + radius} ${this.centerY}`
        );
        path.setAttribute('fill', 'none');
        defs.appendChild(path);
        svg.appendChild(defs);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('font-size', '10px');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', '#FFFFFF');
        label.setAttribute('letter-spacing', '2px');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dy', '3.5'); // Vertically centers the text on the band

        const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        textPath.setAttribute('href', `#${pathId}`);
        textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${pathId}`);
        textPath.setAttribute('startOffset', '50%');
        textPath.textContent = text;

        label.appendChild(textPath);
        svg.appendChild(label);
    }

    drawCenterText(svg) {
        // Center text removed per user request
    }

    drawDimensionBars(svg, socialDimensions, ecologicalDimensions) {
        const totalDimensions = socialDimensions.length + ecologicalDimensions.length;
        const angleStep = (2 * Math.PI) / totalDimensions;
        const halfWidthRad = (angleStep * this.wedgeFillFraction) / 2;
        let currentAngle = -Math.PI / 2; // Start at top

        // Draw social dimensions (bars extending inward for shortfalls)
        socialDimensions.forEach(dim => {
            this.drawSocialBar(svg, dim, currentAngle, halfWidthRad);
            currentAngle += angleStep;
        });

        // Draw ecological dimensions (bars extending outward for overshoots)
        ecologicalDimensions.forEach(dim => {
            this.drawEcologicalBar(svg, dim, currentAngle, halfWidthRad);
            currentAngle += angleStep;
        });
    }

    drawSocialBar(svg, dimension, angle, halfWidthRad) {
        // Determine bar length based on blended status and extent
        let barEndRadius;
        let barColor;

        if (dimension.status === 'met') {
            // Met - no bar needed
            barEndRadius = this.socialFoundationRadius;
            barColor = COLORS.met;
        } else if (dimension.status === 'shortfall') {
            // Shortfall - bar extends inward based on blended extent
            const shortfallExtent = dimension.extent; // Already calculated in blendDimension

            barEndRadius = this.socialFoundationRadius - (this.socialFoundationRadius - this.centerHoleRadius) * shortfallExtent;
            barColor = COLORS.shortfall;
        } else {
            // Descriptive only - short indicator bar
            barEndRadius = this.socialFoundationRadius - 13;
            barColor = COLORS.descriptive;
        }

        // Draw bar from foundation inward to barEndRadius
        if (dimension.status !== 'met') {
            const bar = this.createBar(
                this.centerX, this.centerY,
                barEndRadius,
                this.socialFoundationRadius - this.ringBandWidth / 2,
                angle,
                halfWidthRad,
                barColor
            );
            svg.appendChild(bar);
        }

        // Add dimension label (close to the bars, just outside the foundation)
        const labelRadius = this.socialFoundationRadius + 17;
        this.addDimensionLabel(svg, dimension.dimension, angle, labelRadius, 'social');
    }

    drawEcologicalBar(svg, dimension, angle, halfWidthRad) {
        // Determine bar length based on blended status and extent
        let barEndRadius;
        let barColor;

        if (dimension.status === 'met' || dimension.status === 'within') {
            // Within boundary - no bar needed
            barEndRadius = this.ecologicalCeilingRadius;
            barColor = COLORS.met;
        } else if (dimension.status === 'overshoot') {
            // Overshoot - bar extends outward based on blended extent
            const overshootExtent = dimension.extent; // Already calculated in blendDimension

            barEndRadius = this.ecologicalCeilingRadius + (this.maxOvershootRadius - this.ecologicalCeilingRadius) * overshootExtent;
            barColor = COLORS.overshoot;
        } else {
            // Unknown - short indicator bar
            barEndRadius = this.ecologicalCeilingRadius + 10;
            barColor = COLORS.descriptive;
        }

        // Draw bar from ceiling outward to barEndRadius
        if (dimension.status !== 'met' && dimension.status !== 'within') {
            const bar = this.createBar(
                this.centerX, this.centerY,
                this.ecologicalCeilingRadius + this.ringBandWidth / 2,
                barEndRadius,
                angle,
                halfWidthRad,
                barColor
            );
            svg.appendChild(bar);
        }

        // Add dimension label (close to the bars, just outside the ceiling)
        const labelRadius = this.ecologicalCeilingRadius + 17;
        this.addDimensionLabel(svg, dimension.dimension, angle, labelRadius, 'ecological');
    }

    createBar(cx, cy, innerR, outerR, angle, halfWidthRad, color) {
        // Calculate bar corners
        const startAngle = angle - halfWidthRad;
        const endAngle = angle + halfWidthRad;

        const x1 = cx + innerR * Math.cos(startAngle);
        const y1 = cy + innerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(startAngle);
        const y2 = cy + outerR * Math.sin(startAngle);
        const x3 = cx + outerR * Math.cos(endAngle);
        const y3 = cy + outerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(endAngle);
        const y4 = cy + innerR * Math.sin(endAngle);

        const path = `
            M ${x1} ${y1}
            L ${x2} ${y2}
            L ${x3} ${y3}
            L ${x4} ${y4}
            Z
        `;

        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bar.setAttribute('d', path);
        bar.setAttribute('fill', color);
        bar.setAttribute('stroke', 'white');
        bar.setAttribute('stroke-width', '1');

        return bar;
    }

    addDimensionLabel(svg, dimensionName, angle, radius, type) {
        const x = this.centerX + radius * Math.cos(angle);
        const y = this.centerY + radius * Math.sin(angle);

        // Format name
        const label = dimensionName
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '11px');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', '#333');

        // Rotate text to be readable
        const rotation = (angle * 180 / Math.PI);
        const adjustedRotation = (rotation > 90 && rotation < 270) ? rotation + 180 : rotation;
        text.setAttribute('transform', `rotate(${adjustedRotation}, ${x}, ${y})`);

        text.textContent = label;
        svg.appendChild(text);
    }

    drawEmptyState(svg) {
        const text = this.createText(
            this.centerX,
            this.centerY,
            'No dimension data available',
            '16px',
            'normal',
            '#999'
        );
        svg.appendChild(text);
    }

    createRing(cx, cy, innerR, outerR, fill) {
        const path = `
            M ${cx - outerR} ${cy}
            A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}
            A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}
            M ${cx - innerR} ${cy}
            A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}
            A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}
        `;

        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        ring.setAttribute('d', path);
        ring.setAttribute('fill', fill);
        ring.setAttribute('fill-rule', 'evenodd');
        return ring;
    }

    createCircle(cx, cy, r, fill, stroke = 'none', strokeWidth = 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', stroke);
        circle.setAttribute('stroke-width', strokeWidth);
        return circle;
    }

    createText(x, y, content, fontSize, fontWeight, fill) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', fontWeight);
        text.setAttribute('fill', fill);
        text.textContent = content;
        return text;
    }
}

// Export for use in app.js
window.DoughnutChart = DoughnutChart;
