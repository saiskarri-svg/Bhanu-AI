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
import copy, json, math, sys
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
