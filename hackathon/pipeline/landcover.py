#!/usr/bin/env python3
"""Land cover around each village from ESA WorldCover 2021 (10 m, v200,
CC BY 4.0), public AWS bucket s3://esa-worldcover. Shares within 1 km
(the village) and 5 km (its farmland and surroundings). Cropland nearby
signals milling, irrigation and cold-storage demand (productive use).
Writes app/data/landcover/<site>.json."""
import json, math, os, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import from_bounds

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / 'app' / 'data'
OUT = DATA / 'landcover'
CLASSES = {10: 'Trees', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland', 50: 'Built-up', 60: 'Bare or sparse',
           70: 'Snow and ice', 80: 'Water', 90: 'Wetland', 95: 'Mangroves', 100: 'Moss and lichen'}


def tile(lat, lon):
    la, lo = math.floor(lat / 3) * 3, math.floor(lon / 3) * 3
    t = f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"
    return f'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{t}_Map.tif'


def shares(src, lat, lon, r):
    dy, dx = r / 110574, r / (111320 * math.cos(math.radians(lat)))
    a = src.read(1, window=from_bounds(lon - dx, lat - dy, lon + dx, lat + dy, src.transform))
    ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    cy, cx = (a.shape[0] - 1) / 2, (a.shape[1] - 1) / 2
    m = ((ys - cy) / (a.shape[0] / 2)) ** 2 + ((xs - cx) / (a.shape[1] / 2)) ** 2 <= 1
    v, n = np.unique(a[m], return_counts=True)
    tot = n.sum()
    return {CLASSES.get(int(k), str(k)): round(float(c / tot), 4) for k, c in zip(v, n) if k}


if __name__ == '__main__':
    p = (os.environ.get('HTTPS_PROXY') or '').replace('http://', '')
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', **({'GDAL_HTTP_PROXY': p} if p else {}))
    if os.path.exists('/root/.ccr/ca-bundle.crt'):
        env['CURL_CA_BUNDLE'] = '/root/.ccr/ca-bundle.crt'
    with rasterio.Env(**env):
        for sid in (sys.argv[1:] or [q.stem for q in sorted(DATA.glob('*.json'))]):
            d = json.loads((DATA / f'{sid}.json').read_text())
            with rasterio.open('/vsicurl/' + tile(d['lat'], d['lon'])) as src:
                out = dict(site=sid, source='ESA WorldCover 2021 v200, 10 m (CC BY 4.0), AWS open data s3://esa-worldcover',
                           within_1km=shares(src, d['lat'], d['lon'], 1000), within_5km=shares(src, d['lat'], d['lon'], 5000))
            OUT.mkdir(parents=True, exist_ok=True)
            (OUT / f'{sid}.json').write_text(json.dumps(out, indent=1))
            c5 = out['within_5km']
            print(sid, 'cropland 5 km', c5.get('Cropland', 0), 'built 1 km', out['within_1km'].get('Built-up', 0), 'trees 5 km', c5.get('Trees', 0), file=sys.stderr)
