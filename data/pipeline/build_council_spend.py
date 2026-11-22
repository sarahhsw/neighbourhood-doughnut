"""
Build Lewisham council service spending, 2015-16 to 2024-25, for the "Council spending"
page (site/spending.html).

Run from the repo root:

    python3 data/pipeline/build_council_spend.py

What it does
1. For each financial year, asks the gov.uk content API for the MHCLG "Local authority
   revenue expenditure and financing England: <year> individual local authority data -
   outturn" page and downloads its RSX file ("Revenue outturn service expenditure
   summary"). Files are cached in data/raw/council_spend/ (git-ignored).
2. Finds Lewisham's row by its ONS code (E09000023), never by name, and reads the
   "Net Current Expenditure (C7)" column for each service. RSX lists the services in a
   fixed order; the script reads them by that order and checks every column header that
   names its service, so a header with a missing service name (2021-22 Environmental)
   cannot shift the columns.
3. Converts each year to 2024-25 prices with the HM Treasury GDP deflator (financial
   years), from the gov.uk "GDP deflators at market prices, and money GDP" release named
   in DEFLATOR_PAGE. Update DEFLATOR_PAGE when a newer release comes out.
4. Adds the service-to-dimension tags from data/lookups/budget_dimension_tags.json and
   writes site/data/council/lewisham_service_spend.json.

Net current expenditure = gross spending minus fees, charges and other income. It
excludes the Housing Revenue Account (council-home rents and repairs) and capital
spending. Figures are borough-wide: none of this is spending located in Ladywell.

To add a year: append it to YEARS (the gov.uk page slug must follow the same pattern)
and move PRICE_BASE to the newest year once the deflator release covers it.
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
OUT = os.path.join(ROOT, 'site', 'data', 'council', 'lewisham_service_spend.json')

ONS_CODE = 'E09000023'  # Lewisham
YEARS = list(range(2015, 2025))  # 2015 = financial year 2015-16
PRICE_BASE = 2024
CONTENT_API = 'https://www.gov.uk/api/content/government/statistics/'
RSX_PAGE = ('local-authority-revenue-expenditure-and-financing-england-'
            '{y}-to-{n}-individual-local-authority-data-outturn')
DEFLATOR_PAGE = 'gdp-deflators-at-market-prices-and-money-gdp-october-2026-budget'

# RSX service blocks in the order they appear, with the words each block's header must
# contain when it names a service. Police, fire and other services are zero for
# London boroughs and are read only to keep the order honest.
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
SHORT_NAMES = {
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
UA = {'User-Agent': 'neighbourhood-doughnut-pipeline'}


def fy(y):
    return f'{y}-{str(y + 1)[2:]}'


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def attachment(page, match):
    meta = json.loads(get(CONTENT_API + page))
    for a in meta['details'].get('attachments', []):
        if match(a.get('title', '')):
            return a['title'], a['url']
    raise RuntimeError(f'No matching attachment on {page}')


def cached(url):
    os.makedirs(RAW, exist_ok=True)
    path = os.path.join(RAW, url.rsplit('/', 1)[-1])
    if not os.path.exists(path):
        with open(path, 'wb') as fh:
            fh.write(get(url))
    return path


def ods_sheets(path):
    """Yield each sheet of an .ods file as a list of rows (lists of strings)."""
    ns = {'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
          'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
          'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'}
    T, X, O = ('{%s}' % ns[k] for k in ('table', 'text', 'office'))
    rows = []
    with zipfile.ZipFile(path) as z, z.open('content.xml') as f:
        for ev, el in ET.iterparse(f, events=('start', 'end')):
            if ev == 'start' and el.tag == T + 'table':
                rows = []
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
                yield rows
                el.clear()


def sheets(path):
    if path.endswith('.ods'):
        yield from ods_sheets(path)
    else:
        for df in pd.read_excel(path, sheet_name=None, header=None, dtype=str).values():
            yield df.fillna('').values.tolist()


def lewisham_net_current(path):
    """Return {service_id: £ thousand} from one RSX file."""
    for rows in sheets(path):
        hit = [i for i, r in enumerate(rows) if ONS_CODE in [str(c).strip() for c in r]]
        if not hit:
            continue
        i = hit[0]
        label_rows = [k for k in range(i)
                      if sum('net current' in str(v).lower() for v in rows[k]) >= 10]
        if not label_rows:
            continue
        labels = rows[label_rows[-1]]
        # Service names sit either in the label itself (newer files) or in a row above
        # with one name per block (older files); forward-fill that row.
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
            cell = str(rows[i][c]).strip() if c < len(rows[i]) else ''
            out[sid] = float(cell) if cell else 0.0
        return out
    raise RuntimeError(f'{path}: Lewisham ({ONS_CODE}) row not found')


def deflators():
    title, url = attachment(DEFLATOR_PAGE, lambda t: 'GDP deflators' in t)
    df = pd.read_excel(cached(url), header=None)
    vals = {}
    for row in df.values.tolist():
        for c, v in enumerate(row):
            if isinstance(v, str) and re.fullmatch(r'\d{4}-\d{2}', v.strip()):
                y = int(v[:4])
                if y in YEARS and y not in vals:
                    vals[y] = float(row[c + 1])
                break
    missing = [y for y in YEARS if y not in vals]
    if missing:
        raise RuntimeError(f'Deflator missing for {missing}')
    return title, url, vals


def main():
    tags = json.load(open(TAGS))['services']
    sources, nominal = {}, {}
    for y in YEARS:
        page = RSX_PAGE.format(y=y, n=y + 1)
        title, url = attachment(page, lambda t: '(RSX)' in t or 'service expenditure summary' in t.lower())
        sources[fy(y)] = {'title': title, 'url': url, 'page': 'https://www.gov.uk/government/statistics/' + page}
        nominal[y] = lewisham_net_current(cached(url))
        print(fy(y), f"total £{nominal[y]['total'] / 1000:.1f}m", file=sys.stderr)

    d_title, d_url, defl = deflators()
    base = defl[PRICE_BASE]
    services = []
    for sid, rsx_name, _ in RSX_ORDER:
        if sid not in SHORT_NAMES:
            continue
        nom = [nominal[y][sid] for y in YEARS]
        real = [round(nominal[y][sid] / 1000 * base / defl[y], 1) for y in YEARS]
        services.append({
            'id': sid,
            'name': SHORT_NAMES[sid],
            'rsx_name': rsx_name,
            'tags': tags[sid]['tags'],
            'rationale': tags[sid]['rationale'],
            'nominal_thousands': nom,
            'real_millions': real,
            'real_change_pct': round(100 * (real[-1] / real[0] - 1), 1),
        })
    services.sort(key=lambda s: -s['real_millions'][-1])
    total = [round(nominal[y]['total'] / 1000 * base / defl[y], 1) for y in YEARS]

    out = {
        'authority': 'Lewisham',
        'ons_code': ONS_CODE,
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'years': [fy(y) for y in YEARS],
        'measure': 'Net current expenditure (gross expenditure minus fees, charges and other income)',
        'price_base': fy(PRICE_BASE),
        'excludes': 'Housing Revenue Account and capital spending',
        'total_real_millions': total,
        'services': services,
        'sources': {
            'rsx': sources,
            'deflator': {'title': d_title, 'url': d_url,
                         'page': 'https://www.gov.uk/government/statistics/' + DEFLATOR_PAGE,
                         'values': {fy(y): defl[y] for y in YEARS}},
            'tags': 'data/lookups/budget_dimension_tags.json',
        },
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'Wrote {os.path.relpath(OUT, ROOT)}', file=sys.stderr)


if __name__ == '__main__':
    main()
