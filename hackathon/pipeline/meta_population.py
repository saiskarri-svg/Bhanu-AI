#!/usr/bin/env python3
"""Population within each village radius from Meta's High Resolution
Settlement Layer (HRSL, 30 m; Data for Good at Meta and CIESIN, CC BY 4.0),
read from the public AWS bucket s3://dataforgood-fb-data (no login).
Writes app/data/population/<site>.json. Used as a second household count."""
import json, math, os, sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import from_bounds

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / 'app' / 'data'
OUT = DATA / 'population'
URL = 'https://dataforgood-fb-data.s3.amazonaws.com/hrsl-cogs/hrsl_general/hrsl_general-latest.vrt'


def env():
    p = (os.environ.get('HTTPS_PROXY') or '').replace('http://', '')
    e = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR')
    if p:
        e['GDAL_HTTP_PROXY'] = p
    if os.path.exists('/root/.ccr/ca-bundle.crt'):
        e['CURL_CA_BUNDLE'] = '/root/.ccr/ca-bundle.crt'
    return e


def run(sid, src):
    d = json.loads((DATA / f'{sid}.json').read_text())
    lat, lon, r = d['lat'], d['lon'], d['radius_m']
    dy, dx = r / 110574, r / (111320 * math.cos(math.radians(lat)))
    a = src.read(1, window=from_bounds(lon - dx, lat - dy, lon + dx, lat + dy, src.transform)).astype(float)
    a = np.nan_to_num(np.where(a < 0, 0, a))
    ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    cy, cx = (a.shape[0] - 1) / 2, (a.shape[1] - 1) / 2
    inside = ((ys - cy) * src.res[1] * 110574) ** 2 + ((xs - cx) * src.res[0] * 111320 * math.cos(math.radians(lat))) ** 2 <= r ** 2
    pop = float(a[inside].sum())
    out = dict(site=sid, population=round(pop), radius_m=r, cells_with_people=int((a[inside] > 0).sum()),
               source='Meta High Resolution Settlement Layer (HRSL), general population, 30 m, latest version on s3://dataforgood-fb-data (CC BY 4.0)',
               note='Modelled from census counts and building detection; the census year differs by country, so fast-growing villages can be undercounted.')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{sid}.json').write_text(json.dumps(out, indent=1))
    print(f'{sid}: {round(pop)} people within {r} m', file=sys.stderr)


if __name__ == '__main__':
    with rasterio.Env(**env()), rasterio.open('/vsicurl/' + URL) as src:
        for sid in (sys.argv[1:] or [p.stem for p in sorted(DATA.glob('*.json'))]):
            run(sid, src)
