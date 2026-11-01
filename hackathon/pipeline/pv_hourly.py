#!/usr/bin/env python3
"""Hourly solar curves for each village, from the team's clear-sky model.

For each village:
  1. altitude from the Copernicus 30 m elevation model (AWS open data)
  2. clearsky_pv.py (Ineichen-Perez clear sky, Perez transposition, Faiman
     cell temperature, PVWatts) for 1 kWp at tilt = |latitude| (10 deg minimum),
     facing the equator, with the village's own monthly temperatures from NASA
     POWER (minimum estimated as 2 x mean - maximum)
  3. a weather factor per month = measured sunlight / clear-sky sunlight
     (NASA POWER 2015 to 2024 against Ineichen, both on flat ground), and the
     dust-on-panel loss from weather.py, turning the clear-sky curve into a
     typical day

Writes app/data/pvday/<site>.json with, for each month, the average-day curve
(24 local hours) per kWp at clear sky and in typical weather. run_engine.py
lays the hourly demand over these curves.
"""
import json, math, os, sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA = ROOT / 'app' / 'data'
OUT = DATA / 'pvday'
sys.path.insert(0, str(ROOT / 'forecast'))
import clearsky_pv as cs  # noqa: E402


def altitude(lat, lon):
    import rasterio
    p = (os.environ.get('HTTPS_PROXY') or '').replace('http://', '')
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR')
    if p:
        env['GDAL_HTTP_PROXY'] = p
    if os.path.exists('/root/.ccr/ca-bundle.crt'):
        env['CURL_CA_BUNDLE'] = '/root/.ccr/ca-bundle.crt'
    ns, ew = ('N' if lat >= 0 else 'S'), ('E' if lon >= 0 else 'W')
    name = f"Copernicus_DSM_COG_10_{ns}{abs(math.floor(lat)):02d}_00_{ew}{abs(math.floor(lon)):03d}_00_DEM"
    with rasterio.Env(**env), rasterio.open(f'/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif') as s:
        return float(next(s.sample([(lon, lat)]))[0])


def run(sid):
    w = json.loads((DATA / 'weather' / f'{sid}.json').read_text())
    lat, lon = w['lat'], w['lon']
    alt = max(0.0, altitude(lat, lon))
    tmax = np.array(w['monthly']['tmax'])
    tmin = 2 * np.array(w['monthly']['t']) - tmax
    site = cs.Site(lat, lon, alt, sid)
    arr = cs.Array(kwp=1.0)
    opt = cs.Options(freq='1h', tmin=list(tmin), tmax=list(tmax))
    df, a = cs.simulate(site, arr, opt)
    summ = cs.monthly_summary(df, opt.freq, a)
    ghi_clear = summ['ghi_kwh_m2_day'].values
    ghi_meas = np.array(w['monthly']['ghi'])
    k = np.clip(ghi_meas / ghi_clear, 0.2, 1.05)
    dust = w['annual']['loss_share']['dust_on_panels']
    hours = df.index.hour
    clear, typical = [], []
    for m in range(1, 13):
        sub = df[df.index.month == m]
        prof = sub.groupby(sub.index.hour)['p_ac_kw'].mean().reindex(range(24), fill_value=0).values
        clear.append([round(float(v), 4) for v in prof])
        typical.append([round(float(v * k[m - 1] * (1 - dust)), 4) for v in prof])
    out = dict(site=sid, altitude_m=round(alt), tz=site.tz, tilt=a.tilt, azimuth=a.azimuth, kwp=1,
               model='clearsky_pv.py (Kesho): Ineichen-Perez clear sky, Perez transposition, Faiman cell temperature, PVWatts, 14% system losses, DC/AC 1.2',
               weather='typical = clear sky x (NASA POWER measured sunlight / Ineichen clear-sky sunlight, by month) x (1 - dust on panels)',
               clear_kwh_kwp_day=[round(float(v), 3) for v in summ['pv_ac_kwh_per_kwp_day'].values],
               typical_kwh_kwp_day=[round(float(sum(t)), 3) for t in typical],
               weather_factor=[round(float(v), 3) for v in k], linke=[round(float(v), 2) for v in summ['linke_turbidity'].values],
               max_cell_temp_c=[round(float(v), 1) for v in summ['max_cell_temp_c'].values],
               clear=clear, typical=typical, tmin=[round(float(v), 1) for v in tmin], tmax=[round(float(v), 1) for v in tmax])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{sid}.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'{sid}: altitude {round(alt)} m, {site.tz}, tilt {a.tilt}, clear {np.mean(out["clear_kwh_kwp_day"]):.2f} kWh/kWp/day, '
          f'typical {np.mean(out["typical_kwh_kwp_day"]):.2f} (weather.py says {w["annual"]["yield_kwh_kwp_day"]})', file=sys.stderr)


if __name__ == '__main__':
    for sid in (sys.argv[1:] or [p.stem for p in sorted((DATA / 'weather').glob('*.json'))]):
        run(sid)
