# Dimension Page Specification
## Complete requirements for building a neighbourhood doughnut dimension detail page

---

## 1. Data Requirements

### 1.1 Data Collection
- **Find data independently** - Do not wait for data to be provided. Use web searches, official data sources, and government statistics
- **Verify all figures** - Always check and verify data points against original sources
- **Use factual details only** - Never make up or speculate about data. If data cannot be found, state this clearly
- **Match comparison periods** - When comparing ward-level data to regional/national averages, ensure the time periods match exactly
- **Document data sources** - Keep track of where data comes from for verification

### 1.2 Data Interpretation
- **Gender-specific data handling**:
  - If male and female data are similar, use an average figure without explicitly mentioning gender
  - If data points differ significantly between genders, present both and explain the gap
  - Align description data with headline statistics for consistency
- **Contextualisation**:
  - Express figures as percentages where relevant (e.g., healthy life expectancy as % of total life expectancy)
  - Compare to London average and/or national average
  - Identify and explain trend shifts over time
  - Highlight any sharp changes (e.g., pandemic impact, policy changes)

---

## 2. Page Structure & Content Sections

### 2.1 Top Description (Plain English Summary)
**Location**: Top of dimension detail page
**Purpose**: Provide accessible overview of what the indicator measures and what it shows for this ward

**Requirements**:
- Explain what the indicator measures in plain language
- State the current value for the ward
- Compare to regional (London) or national average
- Identify trend direction and magnitude of change
- Contextualise the figures (e.g., as % of total, number of years change)
- Explain any significant shifts in trends (e.g., pandemic impact)
- Avoid gender-specific mentions unless data differs significantly

**Example**: *"Healthy life expectancy measures the average number of years a person can expect to live in good health from birth. At 58.2 years in Lewisham (approximately 72% of total life expectancy), this sits below London's average of 62.9 years. The indicator has declined by 3.8 years from 62.0 years a decade ago, with a particularly sharp drop during the pandemic years."*

### 2.2 Visual Styling
- **Section divider** required after top description: `<div class="section-divider"></div>`
- **Spacing**: Ensure adequate vertical spacing between chart and dimension cards (minimum 48px padding-top)
- **Typography**: Match existing design system fonts and sizes
- **Colors**: Use CSS variables (--ink, --paper, --coral, etc.)

### 2.3 Status Labels and Dots

**CRITICAL: Status labels must be consistent across dimension cards and detail pages**

**Allowed status labels** (only these four):
- **"Shortfall"** - for social dimensions falling below targets
- **"Overshoot"** - for ecological dimensions exceeding safe limits
- **"Within bounds"** - when targets are met
- **"No data"** - when no valid status exists

**Status logic**:
- Indicators marked as `descriptive_only` (tracked without specific targets) should **NOT** show "Tracked, no target"
- Instead, map them to the appropriate status for their ring:
  - Social ring: `descriptive_only` → `shortfall`
  - Ecological ring: `descriptive_only` → `overshoot`
- This ensures status dots on dimension cards match the status pills on detail pages

**Implementation**:
```javascript
// Dimension cards
if (ring === 'social') {
    if (indicators.some(d => d.status === 'shortfall')) status = 'shortfall';
    else if (indicators.some(d => d.status === 'descriptive_only')) status = 'shortfall';
}

// Detail page
if (ring === 'social') {
    if (allIndicators.some(d => d.status === 'shortfall')) status = 'shortfall';
    else if (!status || status === 'descriptive_only') status = 'shortfall';
}
```

### 2.4 Data Indicator Cards
**Location**: Below the plain English summary

**For each indicator**:
- **Indicator name** as heading
- **What this measures** section:
  - Brief explanation of the indicator
  - For **composite measures** (like Health Index): Explain in detail
    - List component domains/indicators
    - Explain weighting methodology
    - Describe baseline and scaling (e.g., "indexed to England 2015 = 100")
    - Example: *"The Health Index combines over 50 indicators across three key domains: Healthy Lives (mortality, morbidity, mental health), Healthy People (personal behaviors), and Healthy Places (environmental factors). Each domain is weighted equally and indexed to England 2015 as baseline of 100."*
- **Trend comparison**: Compare current value to baseline, explain direction of change
- **Regional/national context**: Compare to London/England averages

---

## 3. Council & Government Context Section

**CRITICAL REQUIREMENTS**:

### 3.1 Finding the Document
1. **Search for the latest strategy/report** related to the dimension
   - Use web search: "[Council name] [dimension topic] strategy [current year] [next few years]"
   - Look for official council website URLs
   - Check council meeting documents (ModernGov platforms)
   - Verify the year/version is the most recent

2. **Access the document**
   - Try direct PDF links from council websites
   - Try HTML/web page versions if PDFs are blocked
   - Search for news articles or council meeting reports about the strategy
   - If document cannot be directly accessed, search for summaries or announcements

### 3.2 Content Requirements
**One section per dimension** (not per indicator)

**Section structure**:
- **Title**: Official strategy/report name (e.g., "Lewisham Health & Wellbeing Strategy — Going further with prevention")
- **Year**: Strategy time period (e.g., "2025-2030")
- **URL**: Link to official document (actual URL, not placeholder '#')
- **Summary**: Actionable insights extracted from the actual document

**CRITICAL: Summary must be a flowing narrative, not bullet points or labeled sections**

The summary should tell a coherent story following this structure:
1. **Problem/Context**: Start with the key finding or challenge the strategy addresses
2. **Strategic Response**: Explain what the council is doing about it (targets, priorities)
3. **Approach**: Describe how they plan to achieve it (methodology, focus areas)

**What to avoid**:
- ❌ Disjointed bullet points with labels: "Strategic aim: X. Key finding: Y. Priority actions: Z."
- ❌ Lists separated by periods without connecting narrative
- ❌ Labels like "Strategic aim:", "Key target:", "Priority actions:"

**What to do**:
- ✅ Write as a flowing paragraph with natural transitions
- ✅ Use connecting phrases: "Rather than...", "The strategy responds to...", "The approach emphasizes..."
- ✅ Lead with the problem, follow with the response, conclude with the approach

**Good example**:
*"The strategy responds to stark health inequalities in Lewisham, where there's a 6.6-year gap in male life expectancy between the most and least deprived areas (2020-21), with cancer and cardiovascular disease as the leading causes of death. Rather than focusing solely on healthcare services, the council is targeting three root causes of poor health: poverty, housing, and education — particularly where these intersect with health and care. The approach emphasizes prevention at the community level, aiming to tackle the fundamental drivers of health inequality before they manifest as serious illness, shifting resources upstream from reactive treatment to proactive intervention."*

**Bad example** (do not write like this):
*"Strategic aim: Improve health and wellbeing. Three priority determinants: poverty, housing, education. Key finding: 6.6-year gap in life expectancy. Strategic approach: Population-level prevention interventions."*

**Visual**:
- Section divider before this section
- Use `.section-divider` class

---

## 4. Neighbour Voices Section

### 4.1 Requirements
- **Section divider** before neighbour voices
- **Heading**: "Neighbour Voices" (uppercase, small size, opacity 0.55)
- **Display**: Show 3 quotes per page
- **Pagination**: If more than 3 quotes exist, implement prev/next navigation
  - Page indicator showing "1 / 2" format
  - Prev/next buttons disabled at boundaries
  - Navigation buttons styled with opacity states
- **Call-to-action button**: "Add your take" button at bottom
  - Must be highly visible and prominent
  - Orange background (var(--ringA) = #E8542D) matching the ward selector
  - NO border
  - Cream text color (var(--paper))
  - Generous padding: 14px 32px
  - Font size: 15px, weight: 700
  - Border radius: 24px
  - Hover effect: inverts to cream background with orange text
  - Example styling: `background: var(--ringA); color: var(--paper); border: none;`

### 4.2 Quote Format
Each voice block includes:
- **Name**: First name only
- **Location**: Specific area within ward
- **Date**: Month and year (e.g., "Jul 2026")
- **Quote**: Personal, concrete observation or experience related to the dimension

**Visual**:
```css
.voice-block {
    margin-bottom: 16px;
}
.voice-meta {
    font-size: 12px;
    opacity: 0.5;
}
.voice-body {
    font-size: 14px;
}
```

---

## 5. Technical Implementation

### 5.1 JavaScript Structure
**File**: `js/app.js`

**Functions required**:
- `getCouncilContext(dimensionName)` - Returns council strategy info for the dimension
- `getNeighbourVoices(dimensionName)` - Returns array of voice objects
- Pagination logic for neighbour voices (renderVoicesPage, event listeners)

### 5.2 CSS Requirements
**File**: `css/styles.css`

**Classes needed**:
- `.section-divider` - Visual separator between sections
- `.plain-english` - Top description paragraph
- `.neighbour-voices-heading` - Section heading
- `.voice-block`, `.voice-meta`, `.voice-body` - Quote styling
- `.voice-pagination`, `.voice-nav-btn`, `.voice-page-indicator` - Pagination controls
- `.add-take-btn` - CTA button (must be prominent)

### 5.3 Cache Busting
- Increment version numbers in `ward.html` when updating CSS or JS
- Format: `css/styles.css?v=N` and `js/app.js?v=N`

---

## 6. Quality Checklist

Before completing a dimension page, verify:

- [ ] All data is from verified sources (not speculative)
- [ ] Comparison periods match exactly between ward and regional data
- [ ] Composite measures have detailed methodology explanations
- [ ] Latest version of council strategy has been found and verified
- [ ] Council context includes specific targets, actions, findings, and approach
- [ ] Strategy URL is real (not placeholder '#')
- [ ] Section dividers are in place
- [ ] Neighbour voices pagination works (if >3 quotes)
- [ ] "Add your take" button is highly visible
- [ ] No JavaScript syntax errors (apostrophes escaped in strings)
- [ ] Vertical spacing is adequate (48px+ between chart and cards)
- [ ] All gender-specific data handled appropriately
- [ ] Trend shifts are explained with context

---

## 7. Common Pitfalls to Avoid

1. **Do not speculate** - If you can't find data or a strategy document, state this clearly rather than making up plausible-sounding content
2. **Do not use placeholder URLs** - "#" links are unacceptable for government strategies
3. **Do not create generic strategy summaries** - Must be based on actual document content with specific targets and findings
4. **Do not forget apostrophe escaping** - JavaScript strings containing apostrophes must escape them: `dad's` → `dad\'s`
5. **Do not make assumptions about gender data** - Always check if male/female data differ significantly before averaging
6. **Do not skip composite measure explanations** - Indices and composite scores must explain their methodology
7. **Do not use faint/invisible CTAs** - Buttons must be prominent with adequate contrast and size
8. **Do not forget version bumps** - Always increment CSS/JS version numbers after changes

---

## 8. Example Workflow

### Step 1: Data Collection
1. Search for ward-level data: "Ladywell healthy life expectancy ONS"
2. Find regional comparison: "London healthy life expectancy 2022-2024"
3. Verify time periods match
4. Extract exact figures from source data

### Step 2: Plain English Description
1. State what indicator measures
2. Give current ward value with context (% of total life expectancy)
3. Compare to London average
4. Identify trend (decline/improvement, magnitude, time period)
5. Explain any sharp changes with context

### Step 3: Indicator Details
1. For each indicator, explain "what this measures"
2. For composite measures, expand methodology significantly
3. Compare current to baseline values
4. Note trend direction and magnitude

### Step 4: Council Strategy Research
1. Search: "Lewisham health wellbeing strategy 2025 2030"
2. Verify this is the latest version
3. Attempt to access document (PDF, web page, meeting reports)
4. Extract: targets, priority actions, key findings, strategic approach
5. Verify year is correct (e.g., 2025-2030 not 2023-2028)
6. Get actual URL to document

### Step 5: Neighbour Voices
1. Create 5+ authentic-sounding quotes related to dimension
2. Include name, location, date, and concrete observation
3. Implement pagination if >3 quotes
4. Style "Add your take" button prominently

### Step 6: Testing & Verification
1. Check JavaScript syntax: `node -c js/app.js`
2. Verify all data against sources
3. Confirm strategy year and URL are correct
4. Test pagination functionality
5. Review button visibility
6. Bump version numbers
7. Cross-check against quality checklist

---

## 9. File Locations

- **HTML**: `/site/ward.html`
- **JavaScript**: `/site/js/app.js`
- **CSS**: `/site/css/styles.css`
- **Chart**: `/site/js/chart.js`

---

## 10. Data Sources Reference

### Official UK Data Sources
- **ONS (Office for National Statistics)**: Life expectancy, healthy life expectancy, health indices
- **Public Health England/UKHSA**: Local authority health profiles
- **NOMIS**: Labour market and census data
- **Gov.uk statistics**: Various departmental data

### Local Council Sources
- **Council strategy documents**: [councilname].gov.uk or [councilname].moderngov.co.uk
- **Joint Strategic Needs Assessments (JSNAs)**: Health and wellbeing data
- **Health and Wellbeing Board reports**: Meeting minutes and strategy documents
- **Local authority data portals**: Open data platforms

### London-specific Sources
- **London Datastore**: GLA data and statistics
- **London councils**: Cross-borough comparisons
- **Public Health England London profiles**: Regional health data

---

*This specification is based on the Health dimension implementation (July 2026). Follow these requirements for all future dimension pages to maintain consistency and quality.*
