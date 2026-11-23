"""
Build public spending data for the spending page (site/spending.html).

Run from the repo root:

    python3 data/pipeline/build_public_spending.py

Writes site/data/spending/lewisham_public_spending.json. The full method, every source,
the caveats and the known gaps are in docs/spending-methodology.md; read that before
changing this script or adapting it to another ward.

Column groups and sources (all downloaded fresh from gov.uk; cached in
data/raw/council_spend/, which is git-ignored):

1. council_services (borough): MHCLG revenue outturn service expenditure summary (RSX),
   net current expenditure per service.
2. council_other (borough):
   - Housing Revenue Account expenditure and Housing Benefit mandatory payments, from the
     MHCLG revenue outturn summary (RS).
   - Capital expenditure by service, from the MHCLG capital expenditure time series
     (2018-19 onwards) plus the per-council capital outturn return (COR A1) for any year
     the time series doesn't cover yet.
3. london_national and 4. london_regional (London, ITL1 region): HM Treasury Country and
   Regional Analysis (CRA) database, identifiable expenditure.

Every amount is converted to PRICE_BASE prices with the HM Treasury GDP deflator.
Councils are matched by ONS code, never by name.
"""
import csv
import io
import json
import os
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = os.path.join(ROOT, 'data', 'raw', 'council_spend')
TAGS = os.path.join(ROOT, 'data', 'lookups', 'budget_dimension_tags.json')
OUT = os.path.join(ROOT, 'site', 'data', 'spending', 'lewisham_public_spending.json')

# --- What to change for another place or a new year (see docs/spending-methodology.md) ---
ONS_CODE = 'E09000023'            # Lewisham
AUTHORITY = 'Lewisham'
CRA_REGION = 'ENGLAND_London'     # ITL1 region in the CRA database
REGION_LABEL = 'London'
REVENUE_YEARS = list(range(2016, 2026))  # 2016 = 2016-17; keep to the latest 10 years
CAPITAL_FIRST_YEAR = 2018                # capital time series starts in 2018-19
PRICE_BASE = 2025
DEFLATOR_PAGE = 'gdp-deflators-at-market-prices-and-money-gdp-october-2026-budget'
CRA_PAGE = 'country-and-regional-analysis-2025'
# London-wide change is measured from here: 2020-21 and 2021-22 include pandemic spending.
CRA_CHANGE_FROM = 2022
# ------------------------------------------------------------------------------------------

CONTENT_API = 'https://www.gov.uk/api/content/government/statistics/'
STATS = 'https://www.gov.uk/government/statistics/'
REVENUE_PAGE = ('local-authority-revenue-expenditure-and-financing-england-'
                '{y}-to-{n}-individual-local-authority-data-outturn')
CAPITAL_TS_PAGE = 'local-authority-capital-expenditure-and-receipts-in-england-final-outturn-time-series'
CAPITAL_LA_PAGE = ('local-authority-capital-expenditure-and-receipts-in-england-'
                   '{y}-to-{n}-individual-local-authority-data')
UA = {'User-Agent': 'neighbourhood-doughnut-pipeline'}

# RSX service blocks, in the order they appear in the file, with a word each block's
# header contains when it names its service.
RSX_ORDER = [
    ('education', 'Education services', 'education'),
    ('highways_transport', 'Highways and transport services', 'highways'),
    ('childrens_social_care', "Children's social care", 'children'),
    ('adult_social_care', 'Adult social care', 'adult'),
    ('public_health', 'Public health', 'public health'),
    ('housing_gf', 'Housing services (General Fund only)', 'housing'),
    ('cultural_related', 'Cultural and related services', 'cultural'),
    ('environmental_regulatory', 'Environmental and regulatory services', 'environmental'),
    ('planning_development', 'Planning and development services', 'planning'),
    ('police', 'Police services', 'police'),
    ('fire', 'Fire and rescue services', 'fire'),
    ('central_services', 'Central services', 'central'),
    ('other', 'Other services', 'other'),
    ('total', 'Total service expenditure', 'total'),
]
RSX_NAMES = {
    'education': 'Education',
    'childrens_social_care': "Children's social care",
    'adult_social_care': 'Adult social care',
    'housing_gf': 'Housing (General Fund)',
    'environmental_regulatory': 'Environmental & regulatory',
    'public_health': 'Public health',
    'central_services': 'Central services',
    'planning_development': 'Planning & development',
    'cultural_related': 'Cultural & related',
    'highways_transport': 'Highways & transport',
}
# Capital: (column id, display name, time-series code, COR A1 header prefix)
CAPITAL = [
    ('capital_housing', 'Building: housing', 'houstot', 'Total Housing'),
    ('capital_transport', 'Building: roads & transport', 'transtot', 'Total Highways & Transport'),
    ('capital_schools', 'Building: schools', 'edutot', 'Total Education'),
    ('capital_culture', 'Building: culture & parks', 'cultot', 'Total Culture & Related Services'),
]
# One-off energy bill support (2022-24) is left out of the energy column so it doesn't
# swamp the ongoing programmes; the column caveat says so.
TEMPORARY_ENERGY_SUPPORT = 'ENERGY BILLS SUPPORT|ENERGY PRICE GUARANTEE|ENERGY BILLS RELIEF'
# CRA London columns: (id, group, name, filter)
CRA_COLUMNS = [
    ('nhs', 'london_national', 'NHS & health',
     lambda d: (d.sector == 'CG') & (d.fn == '7. Health')),
    ('benefits', 'london_national', 'Benefits & pensions',
     lambda d: (d.sector == 'CG') & (d.fn == '10. Social protection')
     & d.dept.isin(['Department for Work and Pensions', 'HM Revenue and Customs'])),
    ('schools_national', 'london_national', 'Academies & colleges',
     lambda d: (d.sector == 'CG') & (d.fn == '9. Education') & (d.dept == 'Department for Education')),
    ('justice', 'london_national', 'Courts, prisons & national policing',
     lambda d: (d.sector == 'CG') & (d.fn == '3. Public order and safety')),
    ('rail', 'london_national', 'Rail & national transport',
     lambda d: (d.sector == 'CG') & (d.fn == '4. of which: transport')),
    ('energy_national', 'london_national', 'Energy & net zero',
     lambda d: (d.sector == 'CG') & d.dept.isin(['Department for Energy Security and Net Zero',
                                                  'Office of Gas and Electricity Markets'])
     & ~d.segment.str.contains(TEMPORARY_ENERGY_SUPPORT, case=False, na=False)),
    ('environment_national', 'london_national', 'Environment agencies',
     lambda d: (d.sector == 'CG') & (d.fn == '5. Environment protection')
     & (d.dept == 'Department for Environment, Food and Rural Affairs')),
    ('police_fire_regional', 'london_regional', 'Police & fire',
     lambda d: (d.sector == 'LG') & (d.fn == '3. Public order and safety')),
    ('transport_regional', 'london_regional', 'Transport for London & local transport',
     lambda d: d.sector.isin(['LG', 'PC']) & (d.fn == '4. of which: transport')),
]
GROUPS = [
    {'id': 'council_services', 'label': f'{AUTHORITY} Council · day-to-day services',
     'geography': 'borough'},
    {'id': 'council_other', 'label': f'{AUTHORITY} Council · homes, building, Housing Benefit',
     'geography': 'borough'},
    {'id': 'london_national', 'label': f'{REGION_LABEL}-wide · national bodies',
     'geography': 'region'},
    {'id': 'london_regional', 'label': f'{REGION_LABEL}-wide · regional bodies',
     'geography': 'region'},
]


def fy(y):
    return f'{y}-{str(y + 1)[2:]}'


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def attachment(page, match):
    meta = json.loads(get(CONTENT_API + page))
    for a in meta['details'].get('attachments', []):
        if match(a.get('title', '')):
            return a['title'], a['url']
    raise RuntimeError(f'No matching attachment on {page}')


def cached(url):
    os.makedirs(RAW, exist_ok=True)
    path = os.path.join(RAW, url.rsplit('/', 1)[-1].split('?')[0])
    if not os.path.exists(path):
        with open(path, 'wb') as fh:
            fh.write(get(url))
    return path


def ods_sheets(path):
    """Yield (sheet name, rows) for each sheet of an .ods file."""
    ns = {'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
          'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
          'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'}
    T, X, O = ('{%s}' % ns[k] for k in ('table', 'text', 'office'))
    rows, name = [], ''
    with zipfile.ZipFile(path) as z, z.open('content.xml') as f:
        for ev, el in ET.iterparse(f, events=('start', 'end')):
            if ev == 'start' and el.tag == T + 'table':
                rows, name = [], el.get(T + 'name')
            elif ev == 'end' and el.tag == T + 'table-row':
                r = []
                for c in el:
                    if c.tag not in (T + 'table-cell', T + 'covered-table-cell'):
                        continue
                    n = int(c.get(T + 'number-columns-repeated', '1'))
                    v = c.get(O + 'value')
                    if v is None:
                        v = ' '.join(''.join(p.itertext()) for p in c.findall(X + 'p'))
                    r.extend([v] * min(n, 200))
                while r and r[-1] in ('', None):
                    r.pop()
                if r:
                    rows.append(r)
                el.clear()
            elif ev == 'end' and el.tag == T + 'table':
                yield name, rows
                el.clear()


def sheets(path):
    if path.endswith('.ods'):
        yield from ods_sheets(path)
    else:
        for name, df in pd.read_excel(path, sheet_name=None, header=None, dtype=str).items():
            yield name, df.fillna('').values.tolist()


def council_row(rows):
    hit = [i for i, r in enumerate(rows) if ONS_CODE in [str(c).strip() for c in r]]
    return hit[0] if hit else None


def headers(rows, i):
    """One header string per column: every header row above the first council's data row,
    forward-filled. Rows of other councils are never part of a header."""
    ons = re.compile(r'^E\d{8}$')
    first = next(k for k, r in enumerate(rows) if any(ons.match(str(c).strip()) for c in r))
    i = min(i, first)
    ncol = max(len(r) for r in rows[:i + 1])
    hdr = [''] * ncol
    for k in range(i):
        last = ''
        for c in range(ncol):
            v = str(rows[k][c]).strip() if c < len(rows[k]) else ''
            if v:
                last = v
            hdr[c] += ' | ' + (v or (last if k < i - 1 else ''))
    return hdr


def num(rows, i, c):
    cell = str(rows[i][c]).strip() if c < len(rows[i]) else ''
    return float(cell) if cell else 0.0


def rsx_year(path):
    """{service id: £ thousand} from one RSX file (net current expenditure)."""
    for _, rows in sheets(path):
        i = council_row(rows)
        if i is None:
            continue
        label_rows = [k for k in range(i)
                      if sum('net current' in str(v).lower() for v in rows[k]) >= 10]
        if not label_rows:
            continue
        labels = rows[label_rows[-1]]
        name_rows = [k for k in range(i) if any('education services' in str(v).lower() for v in rows[k])]
        filled = {}
        for k in name_rows:
            last = ''
            for c, v in enumerate(rows[k]):
                if str(v).strip():
                    last = str(v)
                filled[c] = filled.get(c, '') + ' ' + last
        cols = [c for c, v in enumerate(labels) if 'net current' in str(v).lower()]
        if len(cols) != len(RSX_ORDER):
            raise RuntimeError(f'{path}: expected {len(RSX_ORDER)} net current columns, found {len(cols)}')
        out = {}
        for (sid, _, word), c in zip(RSX_ORDER, cols):
            header = (str(labels[c]) + ' ' + filled.get(c, '')).lower()
            named = [w for _, _, w in RSX_ORDER if w in header]
            if named and word not in named:
                raise RuntimeError(f'{path}: column {c} header {header!r} does not match {sid}')
            out[sid] = num(rows, i, c)
        return out
    raise RuntimeError(f'{path}: {AUTHORITY} ({ONS_CODE}) row not found')


def rs_year(path):
    """HRA expenditure and Housing Benefit mandatory payments (£ thousand) from one RS file."""
    for _, rows in sheets(path):
        i = council_row(rows)
        if i is None:
            continue
        found = {}
        for c, h in enumerate(headers(rows, i)):
            hl = h.lower()
            if 'hra' in hl and 'expenditure' in hl and 'total' in hl and 'reserve' not in hl:
                found.setdefault('hra', c)
            if 'mandatory' in hl and ('rent allowances' in hl or 'non-hra rent rebates' in hl
                                      or 'rebates to hra tenants' in hl):
                key = 'hb_allow' if 'allowances' in hl else ('hb_nonhra' if 'non-hra' in hl else 'hb_hra')
                found.setdefault(key, c)
        missing = {'hra', 'hb_allow', 'hb_nonhra', 'hb_hra'} - set(found)
        if missing:
            raise RuntimeError(f'{path}: RS columns not found: {missing}')
        return {
            'council_homes_hra': num(rows, i, found['hra']),
            'housing_benefit': sum(num(rows, i, found[k]) for k in ('hb_allow', 'hb_nonhra', 'hb_hra')),
        }
    raise RuntimeError(f'{path}: {AUTHORITY} ({ONS_CODE}) row not found')


def capital_series(years):
    """{column id: {year: £ thousand}} for the CAPITAL columns."""
    _, url = attachment(CAPITAL_TS_PAGE, lambda t: 'time series data set' in t.lower())
    ts = pd.read_csv(cached(url), low_memory=False)
    ts = ts[ts['ONS_Code'] == ONS_CODE]
    out = {cid: {} for cid, *_ in CAPITAL}
    sources = {'time_series': url}
    for _, row in ts.iterrows():
        y = int(str(row['PeriodCode'])[:4]) - 1   # 202503 = 2024-25
        if y in years:
            for cid, _, code, _ in CAPITAL:
                out[cid][y] = float(row[f'EandR1_{code}_exptot'])
    for y in years:
        if all(y in out[cid] for cid, *_ in CAPITAL):
            continue
        page = CAPITAL_LA_PAGE.format(y=y, n=y + 1)
        _, url = attachment(page, lambda t: 'COR A1' in t)
        sources[fy(y)] = url
        done = False
        for _, rows in sheets(cached(url)):
            i = council_row(rows)
            if i is None:
                continue
            hdr = headers(rows, i)
            cols = {}
            for cid, _, _, prefix in CAPITAL:
                want = f'{prefix}: total capital expenditure'.lower()
                match = [c for c, h in enumerate(hdr) if h.lower().rstrip().endswith(want)
                         or (prefix.lower() in h.lower() and h.lower().strip().endswith('total capital expenditure'))]
                if match:
                    cols[cid] = match[0]
            if len(cols) == len(CAPITAL):
                for cid, c in cols.items():
                    out[cid][y] = num(rows, i, c)
                done = True
                break
        if not done:
            raise RuntimeError(f'{url}: capital totals not found for {fy(y)}')
    return out, sources


def cra_series():
    title, url = attachment(CRA_PAGE, lambda t: 'database' in t.lower())
    path = cached(url)
    sheet = [n for n in pd.ExcelFile(path).sheet_names if n.lower().endswith('database')][0]
    df = pd.read_excel(path, sheet_name=sheet)
    df = df[df['ITL Region'] == CRA_REGION]
    year_cols = [c for c in df.columns if re.fullmatch(r'\d{4}-\d{2}', str(c))]
    d = pd.DataFrame({'sector': df['CG, LG, PC, BOE, PSP'], 'fn': df['HMT Function'],
                      'dept': df['Department Name'], 'segment': df['CRA Segment Name'].astype(str)})
    out = {}
    for cid, _, _, f in CRA_COLUMNS:
        mask = f(d)
        out[cid] = {int(y[:4]): float(df.loc[mask, y].sum()) for y in year_cols}
    return title, url, out


def deflators(years):
    title, url = attachment(DEFLATOR_PAGE, lambda t: 'GDP deflators' in t)
    df = pd.read_excel(cached(url), header=None)
    vals = {}
    for row in df.values.tolist():
        for c, v in enumerate(row):
            if isinstance(v, str) and re.fullmatch(r'\d{4}-\d{2}', v.strip()):
                y = int(v[:4])
                if y in years and y not in vals:
                    vals[y] = float(row[c + 1])
                break
    missing = sorted(set(years) - set(vals))
    if missing:
        raise RuntimeError(f'Deflator missing for {missing}')
    return title, url, vals


def column(cid, group, name, geography, series_k, defl, tags, source, change_from=None):
    years = sorted(series_k)
    base = defl[PRICE_BASE]
    real = [round(series_k[y] / 1000 * base / defl[y], 1) for y in years]
    k = years.index(change_from) if change_from in years else 0
    t = tags.get(cid)
    if t is None:
        raise RuntimeError(f'No tags entry for {cid} in {TAGS}')
    return {
        'id': cid, 'group': group, 'name': name, 'geography': geography,
        'years': [fy(y) for y in years],
        'nominal_thousands': [round(series_k[y], 1) for y in years],
        'real_millions': real,
        'change_from': fy(years[k]),
        'real_change_pct': round(100 * (real[-1] / real[k] - 1), 1) if real[k] else None,
        'tags': t['tags'], 'rationale': t['rationale'], 'caveat': t.get('caveat', ''),
        'source': source,
    }


def main():
    tags = json.load(open(TAGS))['columns']
    sources = {'rsx': {}, 'rs': {}}

    rsx, rs = {}, {}
    for y in REVENUE_YEARS:
        page = REVENUE_PAGE.format(y=y, n=y + 1)
        meta = json.loads(get(CONTENT_API + page))
        for a in meta['details'].get('attachments', []):
            t = a.get('title', '')
            if '(RSX)' in t and y not in rsx:
                rsx[y] = rsx_year(cached(a['url']))
                sources['rsx'][fy(y)] = a['url']
            elif '(RS)' in t and y not in rs:
                rs[y] = rs_year(cached(a['url']))
                sources['rs'][fy(y)] = a['url']
        if y not in rsx or y not in rs:
            raise RuntimeError(f'RSX or RS missing on {page}')
        print(fy(y), f"services £{rsx[y]['total'] / 1000:.1f}m, HRA £{rs[y]['council_homes_hra'] / 1000:.1f}m",
              file=sys.stderr)

    cap_years = list(range(CAPITAL_FIRST_YEAR, REVENUE_YEARS[-1] + 1))
    capital, cap_sources = capital_series(cap_years)
    sources['capital'] = cap_sources
    cra_title, cra_url, cra = cra_series()
    sources['cra'] = {'title': cra_title, 'url': cra_url, 'page': STATS + CRA_PAGE}
    cra_years = sorted(next(iter(cra.values())))

    all_years = sorted(set(REVENUE_YEARS) | set(cap_years) | set(cra_years) | {PRICE_BASE})
    d_title, d_url, defl = deflators(all_years)
    sources['deflator'] = {'title': d_title, 'url': d_url, 'page': STATS + DEFLATOR_PAGE,
                           'values': {fy(y): defl[y] for y in all_years}}

    rev_src = {'title': 'MHCLG revenue outturn, individual local authority data',
               'page': STATS + REVENUE_PAGE.format(y=REVENUE_YEARS[-1], n=REVENUE_YEARS[-1] + 1)}
    cols = []
    for sid, _, _ in RSX_ORDER:
        if sid in RSX_NAMES:
            cols.append(column(sid, 'council_services', RSX_NAMES[sid], 'borough',
                               {y: rsx[y][sid] for y in REVENUE_YEARS}, defl, tags,
                               dict(rev_src, form='RSX net current expenditure')))
    cols.append(column('council_homes_hra', 'council_other', 'Council homes (HRA)', 'borough',
                       {y: rs[y]['council_homes_hra'] for y in REVENUE_YEARS}, defl, tags,
                       dict(rev_src, form='RS total Housing Revenue Account expenditure')))
    for cid, name, _, _ in CAPITAL:
        cols.append(column(cid, 'council_other', name, 'borough', capital[cid], defl, tags,
                           {'title': 'MHCLG capital expenditure time series and capital outturn return (COR A1)',
                            'page': STATS + CAPITAL_TS_PAGE, 'form': 'Total capital expenditure'}))
    cols.append(column('housing_benefit', 'council_other', 'Housing Benefit', 'borough',
                       {y: rs[y]['housing_benefit'] for y in REVENUE_YEARS}, defl, tags,
                       dict(rev_src, form='RS Housing Benefit mandatory payments (rent allowances and rebates)')))
    for cid, group, name, _ in CRA_COLUMNS:
        cols.append(column(cid, group, name, 'region', cra[cid], defl, tags,
                           {'title': cra_title, 'page': STATS + CRA_PAGE,
                            'form': f'Identifiable expenditure, {REGION_LABEL}'},
                           change_from=CRA_CHANGE_FROM))
    order = {g['id']: n for n, g in enumerate(GROUPS)}
    cols.sort(key=lambda c: (order[c['group']], -c['real_millions'][-1]))

    out = {
        'authority': AUTHORITY,
        'ons_code': ONS_CODE,
        'region': REGION_LABEL,
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'price_base': fy(PRICE_BASE),
        'groups': GROUPS,
        'columns': cols,
        'gaps': json.load(open(TAGS)).get('gaps', []),
        'sources': sources,
        'method': 'docs/spending-methodology.md',
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'Wrote {os.path.relpath(OUT, ROOT)}', file=sys.stderr)


if __name__ == '__main__':
    main()
