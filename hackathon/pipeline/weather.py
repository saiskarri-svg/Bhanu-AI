#!/usr/bin/env python3
"""Weather, solar output and climate outlook for each village.

History (daily, last 10 full years) from NASA POWER, public on AWS
(s3://nasa-power, no login):
  syn1deg  ALLSKY_SFC_SW_DWN  sunlight on the ground (kWh/m2/day)
           CLRSKY_SFC_SW_DWN  sunlight if there were no clouds
           CLOUD_AMT_DAY      daytime cloud cover (%)
           AOD_55             dust and haze in the air (aerosol optical depth)
  merra2   PRECTOTCORR        rain (mm/day)
           T2M, T2M_MAX       air temperature (C)

Solar output per kWp per day (rough guide, every factor below is printed
in the output so it can be checked):
  yield = sunlight x system losses x heat loss x dust on panels
  - system losses 0.86 (inverter, wiring, mismatch)
  - heat loss 0.4% per C of cell temperature above 25 C
  - dust on panels builds up faster on dusty days and is washed off by
    rain of 5 mm or more, or by cleaning every 30 days (assumption)

Outlook (2027 to 2036 against 2015 to 2024) from five CMIP6 climate models,
scenario SSP2-4.5, monthly sunlight on the ground (rsds) and temperature
(tas), public on Google Cloud (gs://cmip6). The change from each model is
applied to the measured history.

Writes app/data/weather/<site>.json. Run: python weather.py [site ...]
"""
import json, math, os, sys
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / 'app' / 'data'
OUT = DATA / 'weather'
YEARS = (2015, 2024)
FUTURE = (2027, 2036)
MODELS = ['MRI-ESM2-0', 'MPI-ESM1-2-LR', 'IPSL-CM6A-LR', 'ACCESS-CM2', 'MIROC6']

SYSTEM = 0.86          # inverter, wiring, mismatch
TEMP_COEF = 0.004      # per C above 25 C cell temperature
SOIL_BASE = 0.0015     # daily soiling on a clean, calm day
SOIL_DUST = 0.006      # extra daily soiling per unit of aerosol optical depth
SOIL_MAX = 0.25
RAIN_WASH_MM = 5.0
CLEAN_DAYS = 30

CLOUDY = 0.6           # sunlight below 60% of the clear-sky value
RAINY_MM = 5.0
DUSTY_AOD = 0.6


def s3():
    import s3fs
    p = os.environ.get('HTTPS_PROXY')
    kw = {'config_kwargs': {'proxies': {'https': p, 'http': p}}} if p else {}
    return s3fs.S3FileSystem(anon=True, client_kwargs={'region_name': 'us-west-2'}, **kw)


def power(fs, lat, lon, sid):
    import s3fs
    cache = HERE / '.cache' / f'power_{sid}.pkl'
    if cache.exists():
        return pd.read_pickle(cache)
    out = {}
    for store, names in [('syn1deg/temporal/power_syn1deg_daily_temporal_lst.zarr', ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 'CLOUD_AMT_DAY', 'AOD_55']),
                         ('merra2/temporal/power_merra2_daily_temporal_lst.zarr', ['PRECTOTCORR', 'T2M', 'T2M_MAX', 'WS2M'])]:
        ds = xr.open_zarr(s3fs.S3Map('nasa-power/' + store, s3=fs), consolidated=True)
        pt = ds[names].sel(lat=lat, lon=lon, method='nearest').sel(time=slice(f'{YEARS[0]}-01-01', f'{YEARS[1]}-12-31')).load()
        for n in names:
            out[n] = pt[n].to_series()
    df = pd.DataFrame(out)
    cache.parent.mkdir(exist_ok=True)
    df.to_pickle(cache)
    return df


def pv_yield(df):
    g = df['ALLSKY_SFC_SW_DWN']
    gw = g * 1000 / 11  # mean daytime irradiance, W/m2 (about 11 sun-up hours)
    tcell = df['T2M_MAX'] - 2 + 0.028 * gw
    heat = (1 - TEMP_COEF * (tcell - 25).clip(lower=0))
    soil, s, since = [], 0.0, 0
    for aod, rain in zip(df['AOD_55'].values, df['PRECTOTCORR'].values):
        if rain >= RAIN_WASH_MM or since >= CLEAN_DAYS:
            s, since = 0.0, 0
        s = min(SOIL_MAX, s + SOIL_BASE + SOIL_DUST * max(0.0, aod))
        since += 1
        soil.append(s)
    soil = pd.Series(soil, index=df.index)
    y = g * SYSTEM * heat * (1 - soil)
    return y, heat, soil


def cmip_delta(lat, lon):
    import gcsfs
    cat = pd.read_csv('https://storage.googleapis.com/cmip6/cmip6-zarr-consolidated-stores.csv')
    fs = gcsfs.GCSFileSystem(token='anon')
    res = []
    for m in MODELS:
        try:
            dv = {}
            for v in ('rsds', 'tas'):
                row = cat[(cat.source_id == m) & (cat.experiment_id == 'ssp245') & (cat.table_id == 'Amon') & (cat.variable_id == v) & (cat.member_id == 'r1i1p1f1')].iloc[-1]
                ds = xr.open_zarr(fs.get_mapper(row.zstore), consolidated=True)
                x = ds[v].sel(lat=lat, lon=lon % 360, method='nearest')
                yr = x['time.year']
                base = x.where((yr >= YEARS[0]) & (yr <= YEARS[1]), drop=True).groupby('time.month').mean().load().values
                fut = x.where((yr >= FUTURE[0]) & (yr <= FUTURE[1]), drop=True).groupby('time.month').mean().load().values
                dv[v] = (fut / base - 1) if v == 'rsds' else (fut - base)
            res.append(dict(model=m, rsds_pct=[round(float(a) * 100, 2) for a in dv['rsds']], tas_c=[round(float(a), 2) for a in dv['tas']]))
            print(f'   {m}: sunlight {np.mean(dv["rsds"]) * 100:+.1f}%, temperature {np.mean(dv["tas"]):+.2f} C', file=sys.stderr)
        except Exception as e:
            print(f'   {m}: skipped ({e})', file=sys.stderr)
    return res


def runs_below(mask):
    best = cur = 0
    for v in mask:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def site(sid, fs):
    d = json.loads((DATA / f'{sid}.json').read_text())
    lat, lon = d['lat'], d['lon']
    df = power(fs, lat, lon, sid)
    df = df.where(df > -900)  # NASA POWER fill value is -999
    print('   missing share', df.isna().mean().round(3).to_dict(), file=sys.stderr)
    df = df.interpolate(limit=7).bfill().ffill()
    for c in ('ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN'):
        df[c] = df[c] * 0.024  # stored as daily mean W/m2; to kWh/m2/day
    y, heat, soil = pv_yield(df)
    df['yield'] = y
    cloudy = df['ALLSKY_SFC_SW_DWN'] < CLOUDY * df['CLRSKY_SFC_SW_DWN']
    rainy = df['PRECTOTCORR'] >= RAINY_MM
    dusty = df['AOD_55'] >= DUSTY_AOD
    normal = ~(cloudy | rainy | dusty)
    month = df.index.month
    yearly = df['yield'].groupby(df.index.year).mean()
    mon = df.groupby(month).agg(ghi=('ALLSKY_SFC_SW_DWN', 'mean'), clr=('CLRSKY_SFC_SW_DWN', 'mean'), cloud=('CLOUD_AMT_DAY', 'mean'),
                                aod=('AOD_55', 'mean'), rain=('PRECTOTCORR', 'sum'), t=('T2M', 'mean'), tmax=('T2M_MAX', 'mean'), y=('yield', 'mean'))
    mon['rain'] = mon['rain'] / (YEARS[1] - YEARS[0] + 1)
    mon_q = df['yield'].groupby([df.index.year, month]).mean().unstack()
    days = lambda m: [round(float(m[month == k].mean() * pd.Series(df.index[month == k]).dt.days_in_month.mean()), 1) for k in range(1, 13)]
    # Low-output spells: days below 60% of that month's average
    low = df['yield'] < 0.6 * df.groupby(month)['yield'].transform('mean')
    spells = [runs_below(low[df.index.year == yr].values) for yr in sorted(set(df.index.year))]
    # How much each effect costs over a year (kWh per kWp)
    clear_y = (df['CLRSKY_SFC_SW_DWN'] * SYSTEM).sum()
    lost_cloud = ((df['CLRSKY_SFC_SW_DWN'] - df['ALLSKY_SFC_SW_DWN']) * SYSTEM).sum()
    lost_heat = (df['ALLSKY_SFC_SW_DWN'] * SYSTEM * (1 - heat)).sum()
    lost_soil = (df['ALLSKY_SFC_SW_DWN'] * SYSTEM * heat * soil).sum()
    nyr = YEARS[1] - YEARS[0] + 1
    two_day = df['yield'].rolling(2).mean().dropna()
    out = dict(
        site=sid, lat=lat, lon=lon, years=list(YEARS),
        source='NASA POWER (CERES SYN1deg radiation and aerosol, MERRA-2 rain and temperature), daily, AWS open data s3://nasa-power',
        assumptions=dict(system=SYSTEM, temp_coef_per_c=TEMP_COEF, soiling_base_per_day=SOIL_BASE, soiling_per_aod_per_day=SOIL_DUST,
                         rain_wash_mm=RAIN_WASH_MM, cleaning_every_days=CLEAN_DAYS, cloudy_below_clear_sky=CLOUDY, rainy_mm=RAINY_MM, dusty_aod=DUSTY_AOD),
        annual=dict(ghi=round(float(df['ALLSKY_SFC_SW_DWN'].mean()), 2), yield_kwh_kwp_day=round(float(y.mean()), 3),
                    yield_by_year=[round(float(v), 3) for v in yearly.values], performance_ratio=round(float(y.mean() / df['ALLSKY_SFC_SW_DWN'].mean()), 3),
                    daily_cv=round(float(y.std() / y.mean()), 3), two_day_cv=round(float(two_day.std() / two_day.mean()), 3),
                    loss_share=dict(cloud=round(float(lost_cloud / clear_y), 3), heat=round(float(lost_heat / clear_y), 3), dust_on_panels=round(float(lost_soil / clear_y), 3)),
                    days=dict(cloudy=round(float(cloudy.sum() / nyr)), rainy=round(float(rainy.sum() / nyr)), dusty=round(float(dusty.sum() / nyr))),
                    yield_on=dict(normal=round(float(y[normal].mean()), 2), cloudy=round(float(y[cloudy].mean()), 2) if cloudy.any() else None,
                                  rainy=round(float(y[rainy].mean()), 2) if rainy.any() else None, dusty=round(float(y[dusty].mean()), 2) if dusty.any() else None),
                    longest_low_spell_days=dict(median=int(np.median(spells)), worst=int(max(spells)))),
        monthly=dict(ghi=[round(float(v), 2) for v in mon['ghi']], clear=[round(float(v), 2) for v in mon['clr']], cloud=[round(float(v), 1) for v in mon['cloud']],
                     aod=[round(float(v), 2) for v in mon['aod']], rain_mm=[round(float(v)) for v in mon['rain']], t=[round(float(v), 1) for v in mon['t']],
                     tmax=[round(float(v), 1) for v in mon['tmax']], yield_p50=[round(float(v), 3) for v in mon['y']],
                     yield_p10=[round(float(np.nanpercentile(mon_q[k], 10)), 3) for k in range(1, 13)], yield_p90=[round(float(np.nanpercentile(mon_q[k], 90)), 3) for k in range(1, 13)],
                     cloudy_days=days(cloudy), rainy_days=days(rainy), dusty_days=days(dusty)),
        daily_yield=[round(float(v), 2) for v in y.values], start=str(df.index[0].date()),
    )
    print(f'{sid}: {out["annual"]["yield_kwh_kwp_day"]} kWh/kWp/day, PR {out["annual"]["performance_ratio"]}, '
          f'cloudy {out["annual"]["days"]["cloudy"]}, rainy {out["annual"]["days"]["rainy"]}, dusty {out["annual"]["days"]["dusty"]} days a year', file=sys.stderr)
    out['outlook'] = dict(models=cmip_delta(lat, lon), scenario='SSP2-4.5', baseline=list(YEARS), future=list(FUTURE),
                          source='CMIP6 monthly rsds and tas, r1i1p1f1, Google Cloud public data gs://cmip6')
    ms = out['outlook']['models']
    if ms:
        base = np.array(out['monthly']['yield_p50'])
        ch = []
        for m in ms:
            fut = base * (1 + np.array(m['rsds_pct']) / 100) * (1 - TEMP_COEF * np.array(m['tas_c']))
            ch.append(float(fut.mean() / base.mean() - 1))
        out['outlook']['yield_change'] = dict(models=[round(c, 4) for c in ch], low=round(min(ch), 4), mid=round(float(np.median(ch)), 4), high=round(max(ch), 4))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{sid}.json').write_text(json.dumps(out, separators=(',', ':')))


if __name__ == '__main__':
    fs = s3()
    for sid in (sys.argv[1:] or [p.stem for p in sorted(DATA.glob('*.json'))]):
        site(sid, fs)
