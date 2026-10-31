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
WEATHER = DATA / 'weather'


def weather_for(sid):
    p = WEATHER / f'{sid}.json'
    return json.loads(p.read_text()) if p.exists() else None


def apply_weather(A, w):
    """Feed the village's own weather into the engine's settings."""
    ghi = sorted(w['monthly']['ghi'])
    spell = w['annual']['longest_low_spell_days']['median']
    used = dict(
        monthly_mean_temp_c=w['monthly']['t'],
        peak_sun_hours=round(ghi[2], 2),                      # third-worst month: size for the dull season
        performance_ratio=w['annual']['performance_ratio'],  # heat and dust on panels included
        daily_pv_variability=w['annual']['two_day_cv'],      # day-to-day swing after a day of battery
        autonomy_days=round(min(2.0, max(1.0, 1 + (spell - 2) * 0.25)), 2),
    )
    A['seasonality']['monthly_mean_temp_c'] = used['monthly_mean_temp_c']
    for k in ('peak_sun_hours', 'performance_ratio', 'daily_pv_variability', 'autonomy_days'):
        A['sizing'][k] = used[k]
    return used


def simulate(design, yields, start, demand_daily, rt, dod, factor=1.0):
    """Day by day over the weather years: solar in, battery, demand out."""
    import datetime as dt
    kwp, usable, night = design['pv_kwp'], design['battery_kwh'] * dod, design['night_share']
    d0 = dt.date.fromisoformat(start)
    soc, unmet, served, short_days = usable, 0.0, 0.0, 0
    by_month_unmet, by_month_dem = [0.0] * 12, [0.0] * 12
    years = {}
    for i, y in enumerate(yields):
        day = d0 + dt.timedelta(days=i)
        dem = demand_daily[min(364, day.timetuple().tm_yday - 1)]
        pv = kwp * y * factor
        day_load, night_load = dem * (1 - night), dem * night
        direct = min(pv, day_load)
        spare = pv - direct
        miss_day = day_load - direct
        soc = min(usable, soc + spare * math.sqrt(rt))
        need = (miss_day + night_load) / math.sqrt(rt)
        take = min(soc, need)
        soc -= take
        miss = (need - take) * math.sqrt(rt)
        unmet += miss; served += dem
        by_month_unmet[day.month - 1] += miss; by_month_dem[day.month - 1] += dem
        yr = years.setdefault(day.year, [0.0, 0.0, 0])
        yr[0] += miss; yr[1] += dem
        if miss > 0.10 * dem:  # same threshold as the engine: more than 10% of the day unserved
            short_days += 1; yr[2] += 1
    n = len(years)
    shares = [v[0] / v[1] for v in years.values()]
    return dict(design=design['design'], unmet_share=round(unmet / served, 4), worst_year_unmet_share=round(max(shares), 4),
                shortfall_days_per_year=round(short_days / n, 1), worst_year_shortfall_days=max(v[2] for v in years.values()),
                monthly_unmet_share=[round(u / d, 4) if d else 0 for u, d in zip(by_month_unmet, by_month_dem)])


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
    w = weather_for(path.stem)
    w_used = apply_weather(A, w) if w else None
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
        age=site.get('_age'), nearby=nb, weather_inputs=w_used,
        uncalibrated={m: [dict(year=int(r['year']), p10=round(r['p10'], 3), p50=round(r['p50'], 3), p90=round(r['p90'], 3))
                          for r in base[base.metric == m].to_dict('records')] for m in ('energy_kwh_per_day', 'kwh_per_household_month', 'peak_kw')},
    )
    if w:
        Z = A['sizing']
        d = fc.representative_draw(5, 0.5)
        demand = dfc.hourly_8760(fc, 5, d).reshape(365, 24).sum(axis=1)
        ch = (w.get('outlook') or {}).get('yield_change') or {}
        sims = [simulate(x, w['daily_yield'], w['start'], demand, Z['battery_roundtrip_efficiency'], Z['battery_depth_of_discharge']) for x in out['designs']]
        fut = [simulate(x, w['daily_yield'], w['start'], demand, Z['battery_roundtrip_efficiency'], Z['battery_depth_of_discharge'], 1 + ch.get('mid', 0))
               for x in out['designs']]
        p50 = next(x for x in out['designs'] if x['design'].startswith('P50'))
        import datetime as dt
        mdem = [0.0] * 12; mn = [0] * 12
        for i in range(365):
            m = (dt.date(2027, 1, 1) + dt.timedelta(days=i)).month - 1
            mdem[m] += demand[i]; mn[m] += 1
        out['weather_sim'] = dict(
            year=5, demand='P50 year-5 demand, day by day, from the engine', designs=sims, designs_outlook=fut,
            outlook_factor=round(1 + ch.get('mid', 0), 4),
            monthly=dict(demand=[round(a / b, 1) for a, b in zip(mdem, mn)],
                         gen_p10=[round(p50['pv_kwp'] * v, 1) for v in w['monthly']['yield_p10']],
                         gen_p50=[round(p50['pv_kwp'] * v, 1) for v in w['monthly']['yield_p50']],
                         gen_p90=[round(p50['pv_kwp'] * v, 1) for v in w['monthly']['yield_p90']],
                         gen_outlook=[round(p50['pv_kwp'] * v * (1 + ch.get('mid', 0)), 1) for v in w['monthly']['yield_p50']]))
    # Second household count: Meta's population map, same settings otherwise
    popf = DATA / 'population' / f'{path.stem}.json'
    if popf.exists():
        pop = json.loads(popf.read_text())
        s2 = dfc.Site(label=s.label, lat=s.lat, lon=s.lon, population=float(pop['population']), counts=s.counts,
                      evidence_pct=s.evidence_pct, source='Meta HRSL population')
        fc2 = dfc.run_forecast(s2, A, n_draws=4000, seed=42)
        sm2 = fc2.summary()
        d2, _ = dfc.sizing_risk(fc2)
        pick = lambda sm, m: [dict(year=int(r['year']), p10=round(r['p10'], 2), p50=round(r['p50'], 2), p90=round(r['p90'], 2)) for r in sm[sm.metric == m].to_dict('records')]
        p50b = next(x for x in records(d2) if x['design'].startswith('P50'))
        out['by_population'] = dict(population=pop['population'], source=pop['source'], note=pop['note'],
                                    households=pick(sm2, 'households'), customers=pick(sm2, 'customers'),
                                    energy_kwh_per_day=pick(sm2, 'energy_kwh_per_day'), peak_kw=pick(sm2, 'peak_kw'),
                                    p50_design=dict(pv_kwp=p50b['pv_kwp'], battery_kwh=p50b['battery_kwh'], capex_usd=p50b['capex_usd']))
    lc = DATA / 'landcover' / f'{path.stem}.json'
    if lc.exists():
        out['landcover'] = json.loads(lc.read_text())
    # Sizing basis: dull-season month (used) against the yearly average sunlight
    if w:
        Z = fc.A['sizing']
        used_psh = Z['peak_sun_hours']
        def basis(psh):
            Z['peak_sun_hours'] = psh
            dz, rz = dfc.sizing_risk(fc)
            p = next(x for x in records(dz) if x['design'].startswith('P50'))
            r5 = next(x for x in records(rz) if x['design'] == p['design'] and x['year'] == 5)
            sim = simulate(p, w['daily_yield'], w['start'], demand, Z['battery_roundtrip_efficiency'], Z['battery_depth_of_discharge'])
            return dict(peak_sun_hours=round(psh, 2), pv_kwp=round(p['pv_kwp'], 1), battery_kwh=round(p['battery_kwh'], 1), capex_usd=round(p['capex_usd']),
                        engine_brownout_y5=round(r5['p_brownouts'], 3), weather_unmet_share=sim['unmet_share'],
                        weather_short_days=sim['shortfall_days_per_year'], worst_month_unmet=max(sim['monthly_unmet_share']))
        out['sizing_basis'] = dict(used='dull_season', dull_season=basis(used_psh), yearly_average=basis(round(w['annual']['ghi'], 2)))
        Z['peak_sun_hours'] = used_psh
    pvp = DATA / 'pvday' / f'{path.stem}.json'
    if pvp.exists():
        import datetime as dt
        pv = json.loads(pvp.read_text())
        p50 = next(x for x in out['designs'] if x['design'].startswith('P50'))
        Z = A['sizing']
        usable = p50['battery_kwh'] * Z['battery_depth_of_discharge']
        months_of_day = np.array([(dt.date(2027, 1, 1) + dt.timedelta(days=i)).month for i in range(365)])
        def avg_day(year):
            h = dfc.hourly_8760(fc, year, fc.representative_draw(year, 0.5)).reshape(365, 24)
            return [h[months_of_day == m].mean(axis=0) for m in range(1, 13)]
        d5, d1 = avg_day(5), avg_day(1)
        rows = []
        for m in range(12):
            sol = np.array(pv['typical'][m]) * p50['pv_kwp']
            clr = np.array(pv['clear'][m]) * p50['pv_kwp']
            dem = d5[m]
            direct = np.minimum(sol, dem).sum()
            short = np.clip(dem - sol, 0, None).sum()      # from the battery (or unmet)
            spare = np.clip(sol - dem, 0, None).sum()       # to charge the battery
            rows.append(dict(month=m + 1, solar=[round(float(v), 2) for v in sol], clear=[round(float(v), 2) for v in clr],
                             demand=[round(float(v), 2) for v in dem], demand_y1=[round(float(v), 2) for v in d1[m]],
                             solar_kwh=round(float(sol.sum()), 1), demand_kwh=round(float(dem.sum()), 1), direct_kwh=round(float(direct), 1),
                             battery_need_kwh=round(float(short), 1), spare_kwh=round(float(spare), 1),
                             battery_ok=bool(short <= usable * 1.0001 and spare * Z['battery_roundtrip_efficiency'] >= short)))
        out['pvday'] = dict(design=p50['design'], pv_kwp=round(p50['pv_kwp'], 1), battery_kwh=round(p50['battery_kwh'], 1), battery_usable_kwh=round(usable, 1),
                            altitude_m=pv['altitude_m'], tz=pv['tz'], tilt=pv['tilt'], model=pv['model'], weather=pv['weather'],
                            clear_kwh_kwp_day=pv['clear_kwh_kwp_day'], typical_kwh_kwp_day=pv['typical_kwh_kwp_day'], months=rows)
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
