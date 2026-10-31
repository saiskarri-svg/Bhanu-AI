#!/usr/bin/env python3
"""Run the demand engine (forecast/demand_forecast.py, by Fereshteh) on every
GridSight site file and write one compact JSON per site for the dashboard.

GridSight site file (buildings with map tags and nearby places)
  -> land-use counts in the engine's format (residential, shops, schools ...)
  -> engine: 4,000 simulated futures, years 1 to 5
  -> app/data/engine/<site>.json

Usage:  python run_engine.py            (all sites in app/data)
        python run_engine.py talek      (one site)
"""
import copy, csv, json, math, statistics, sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / 'forecast'))
import demand_forecast as dfc  # noqa: E402

DATA = ROOT / 'app' / 'data'
OUT = DATA / 'engine'

# Peak sun hours, rough guide by country (same values as the dashboard).
PSH = {'NG': 4.6, 'KE': 5.4, 'UG': 5.0, 'TZ': 5.3, 'SL': 4.8, 'MR': 6.0}
COUNTRY_NAME = {'MR': 'Mauritania'}  # countries with overrides in assumptions.yaml
LARGE_M2 = 300  # same cut-off as village_landuse.py
THIS_YEAR = 2026
NEARBY_KM = 1609  # 1,000 miles
QUALITY = {'high': 1.0, 'medium': 0.6, 'low': 0.2}
PRECISION = {'site': 1.0, 'district': 1.0, 'region': 0.7, 'country': 0.5}
PRIOR_WEIGHT = 1.0  # the published ranges count as much as one good nearby site
MEASURED = HERE / 'measured_sites.csv'


def km(a_lat, a_lon, b_lat, b_lon):
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b_lon - a_lon) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def nearby(site, summ):
    """Measured sites within 1,000 miles pull this village's forecast toward
    what was actually metered nearby. Each site's weight falls with distance,
    data quality and how exactly it is located; with little nearby data the
    forecast barely moves (shrinkage toward the published ranges)."""
    rows = list(csv.DictReader(open(MEASURED))) if MEASURED.exists() else []
    pred = {m: {r['year']: r['p50'] for r in summ[summ.metric == m].to_dict('records')}
            for m in ('kwh_per_customer_month', 'kwh_per_household_month')}
    used = []
    for r in rows:
        d = km(site['lat'], site['lon'], float(r['lat']), float(r['lon']))
        if d > NEARBY_KM:
            continue
        yr = min(5, max(1, int(r['years_since_connection'])))
        p = pred['kwh_per_customer_month' if r['metric'] == 'customer' else 'kwh_per_household_month'][yr]
        obs = float(r['kwh_per_month'])
        w = QUALITY[r['quality']] * PRECISION[r['location_precision']] / (1 + d / 400)
        used.append(dict(site_id=r['site_id'], name=r['name'], country=r['country'], d_km=round(d), metric=r['metric'], year=yr,
                         observed=obs, predicted=round(p, 2), ratio=round(obs / p, 2), weight=round(w, 3),
                         quality=r['quality'], precision=r['location_precision'], source=r['source'], url=r['url'], note=r['note']))
    W = sum(u['weight'] for u in used)
    if not used:
        return dict(radius_km=NEARBY_KM, sites=[], factor=1.0, factor_lo=1.0, factor_hi=1.0, weight=0.0)
    logs = [math.log(u['ratio']) for u in used]
    mean = sum(u['weight'] * l for u, l in zip(used, logs)) / (W + PRIOR_WEIGHT)
    spread = math.sqrt(sum(u['weight'] * (l - mean) ** 2 for u, l in zip(used, logs)) / W) if len(used) > 1 else abs(logs[0])
    se = spread * W / (W + PRIOR_WEIGHT)
    return dict(radius_km=NEARBY_KM, sites=sorted(used, key=lambda u: u['d_km']), weight=round(W, 3),
                factor=round(math.exp(mean), 3), factor_lo=round(math.exp(mean - 1.28 * se), 3), factor_hi=round(math.exp(mean + 1.28 * se), 3))


CATS = [  # (engine category, keywords) checked in order
    ('health', ['hospital', 'clinic', 'medical', 'health', 'doctor', 'dentist', 'maternity', 'dispensary', 'pharmacy']),
    ('education', ['school', 'college', 'university', 'kindergarten', 'education']),
    ('market_mall', ['market', 'mall', 'supermarket']),
    ('restaurant', ['restaurant', 'food', 'cafe', 'bar', 'eat', 'bakery', 'butcher']),
    ('industrial', ['industrial', 'workshop', 'mill', 'factory', 'warehouse']),
    ('store', ['commercial', 'retail', 'shop', 'store', 'kiosk', 'office', 'hotel', 'lodg', 'bank', 'salon', 'beauty',
               'repair', 'fuel', 'gas_station', 'mobile', 'service', 'business', 'agricultur', 'resort']),
    ('other_nonres', ['religious', 'church', 'mosque', 'worship', 'civic', 'government', 'public', 'community', 'police']),
]
RES = ['residential', 'house', 'hut', 'detached', 'apartments', 'bungalow', 'terrace', 'dormitory']


def category(tag):
    t = (tag or '').lower()
    if not t:
        return None
    for c, words in CATS:
        if any(w in t for w in words):
            return c
    if any(w in t for w in RES):
        return 'residential'
    return None


def landuse(site):
    counts = {c: 0 for c, _ in CATS}
    counts['unverified_large'] = 0
    res = evidence = 0
    for b in site['buildings']:
        area, osm, poi = b[2], b[4], b[5]
        c = category(osm) or category(poi)
        if c:
            evidence += 1
        if c and c != 'residential':
            counts[c] += 1
        elif not c and area >= LARGE_M2:
            counts['unverified_large'] += 1
        else:
            res += 1
    n = max(1, len(site['buildings']))
    years = [b[14] for b in site['buildings'] if len(b) > 14 and b[14]]
    data_year = int(statistics.median(years)) if years else None
    cov = site.get('coverage') or {}
    if cov.get('merged') and cov.get('google_alone', 0) / cov['merged'] >= 0.8:
        data_year = 2023  # Google's 2023 data already sees most roofs here
    growth = 0.031 if site['country'] == 'MR' else 0.03
    age = max(0, min(8, THIS_YEAR - data_year)) if data_year else 0
    grown = round(res * ((1 + growth) ** age))
    srcs = {}
    for b in site['buildings']:
        k = b[13] if len(b) > 13 else 'G'
        srcs[k] = srcs.get(k, 0) + 1
    site['_age'] = dict(data_year=data_year, years=age, growth=growth, residential_seen=res, residential_now=grown, sources=srcs)
    res = grown
    return dfc.Site(label=f"{site['name']}, {site['region']}", lat=site['lat'], lon=site['lon'],
                    residential_buildings=float(res), counts={k: float(v) for k, v in counts.items()},
                    evidence_pct=round(100 * evidence / n, 1), source='GridSight site file'), counts, res


def records(df, digits=3):
    return [{k: (round(v, digits) if isinstance(v, float) else v) for k, v in r.items()} for r in df.to_dict('records')]


def run(path):
    site = json.loads(path.read_text())
    s, counts, res = landuse(site)
    A = dfc.load_assumptions(country=COUNTRY_NAME.get(site['country']))
    A = copy.deepcopy(A)
    A['sizing']['peak_sun_hours'] = PSH.get(site['country'], 5.0)
    # First pass with the published ranges alone, to compare with nearby meters
    base = dfc.run_forecast(s, A, n_draws=4000, seed=42).summary()
    nb = nearby(site, base)
    if nb['sites']:
        A['calibration'] = {'usage_multiplier': [nb['factor_lo'], nb['factor'], nb['factor_hi']]}
    fc = dfc.run_forecast(s, A, n_draws=4000, seed=42)
    summ = fc.summary()
    d1, d5 = dfc.drivers(fc, 1), dfc.drivers(fc, 5)
    designs, risk = dfc.sizing_risk(fc)
    tar = dfc.tariff_scenarios(fc.site, fc.A, [0.25, 0.45, 0.65, 0.85], 2000, 42)
    prof = {f'y{yr}': {f'p{int(q * 100)}': [round(float(x), 3) for x in np.quantile(fc.avg_profile[:, j, :], q, axis=0)]
                       for q in dfc.QUANTILES} for j, yr in enumerate(dfc.YEARS)}
    sect = fc.sector_table()
    out = dict(
        site=path.stem, engine='demand_forecast.py (Fereshteh), 4,000 draws, seed 42',
        tariff=fc.tariff, peak_sun_hours=A['sizing']['peak_sun_hours'],
        landuse=dict(residential_buildings=res, mapped=counts, evidence_pct=s.evidence_pct),
        notes=fc.notes, business=fc.business_estimate,
        summary={m: [dict(year=int(r['year']), p10=round(r['p10'], 3), p50=round(r['p50'], 3), p90=round(r['p90'], 3))
                     for r in summ[summ.metric == m].to_dict('records')] for m in summ.metric.unique()},
        sectors=records(sect), drivers1=records(d1.head(8)), drivers5=records(d5.head(8)),
        designs=records(designs), risk=records(risk), tariffs=records(tar), profile=prof,
        age=site.get('_age'), nearby=nb,
        uncalibrated={m: [dict(year=int(r['year']), p10=round(r['p10'], 3), p50=round(r['p50'], 3), p90=round(r['p90'], 3))
                          for r in base[base.metric == m].to_dict('records')] for m in ('energy_kwh_per_day', 'kwh_per_household_month', 'peak_kw')},
    )
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{path.stem}.json').write_text(json.dumps(out, separators=(',', ':'), default=float))
    y = out['summary']['energy_kwh_per_day']
    print(f"{path.stem}: {res} residential, evidence {s.evidence_pct}%, kWh/day y1 {y[0]['p50']:.0f} ({y[0]['p10']:.0f}-{y[0]['p90']:.0f}), "
          f"y5 {y[4]['p50']:.0f} ({y[4]['p10']:.0f}-{y[4]['p90']:.0f})")


if __name__ == '__main__':
    names = sys.argv[1:]
    for p in sorted(DATA.glob('*.json')):
        if not names or p.stem in names:
            run(p)
