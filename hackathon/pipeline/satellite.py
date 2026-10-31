#!/usr/bin/env python3
"""Recent open satellite picture for each village.

Source: Copernicus Sentinel-2 Level-2A, 10 m true colour (TCI), from the
public AWS open data bucket s3://sentinel-cogs (no login). For each village
it walks back month by month from today, checks the scene classification
layer (SCL) inside the village box for cloud and shadow, and keeps the most
recent picture that is at least 98% clear. The picture is cut to the village
box, reprojected to latitude/longitude and saved as a JPEG with its date.

Licence: Copernicus Sentinel data, free and open; credit
"Contains modified Copernicus Sentinel data <year>".

Usage: python satellite.py            (all villages in app/data)
       python satellite.py talek
"""
import json, math, os, sys, re, urllib.request
from datetime import date
from pathlib import Path

import mgrs
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_bounds
from rasterio.windows import from_bounds as win_from_bounds
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / 'app' / 'data'
OUT = DATA / 'imagery'
BUCKET = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com'
PREFIX = 'sentinel-s2-l2a-cogs'
PX = 960               # output size of the longer side (about 2.4 m per pixel; detail is still 10 m)
KEEP = 3               # median of up to this many clear pictures, to cut noise and haze
MARGIN = 1.15          # picture covers the village radius x this
CLOUD = {3, 8, 9, 10}  # SCL: cloud shadow, cloud medium, cloud high, thin cirrus
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
GDAL_ENV = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', AWS_NO_SIGN_REQUEST='YES',
                GDAL_HTTP_MULTIRANGE='YES', GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES')
if proxy:
    GDAL_ENV['GDAL_HTTP_PROXY'] = proxy.replace('http://', '')
ca = '/root/.ccr/ca-bundle.crt'
if os.path.exists(ca):
    GDAL_ENV['CURL_CA_BUNDLE'] = ca


def listing(prefix):
    url = f'{BUCKET}/?list-type=2&delimiter=/&prefix={prefix}'
    with urllib.request.urlopen(url, timeout=30) as r:
        xml = r.read().decode()
    return re.findall(r'<Prefix>([^<]+)</Prefix>', xml)[1:]


def bbox(lat, lon, r):
    dlat = r / 110574
    dlon = r / (111320 * math.cos(math.radians(lat)))
    return lon - dlon, lat - dlat, lon + dlon, lat + dlat


def clear_share(scene, b):
    with rasterio.open(f'/vsicurl/{BUCKET}/{scene}SCL.tif') as src:
        bb = transform_bounds('EPSG:4326', src.crs, *b)
        if bb[0] < src.bounds.left or bb[2] > src.bounds.right or bb[1] < src.bounds.bottom or bb[3] > src.bounds.top:
            return None  # village not fully inside this tile
        a = src.read(1, window=win_from_bounds(*bb, transform=src.transform))
    if a.size == 0 or (a == 0).mean() > 0.02:
        return None  # no data over the village
    return 1 - np.isin(a, list(CLOUD)).mean()


def picture(site_id):
    d = json.loads((DATA / f'{site_id}.json').read_text())
    lat, lon, r = d['lat'], d['lon'], d['radius_m'] * MARGIN
    b = bbox(lat, lon, r)
    tile = mgrs.MGRS().toMGRS(lat, lon, MGRSPrecision=0)
    zone, band, sq = tile[:-3], tile[-3], tile[-2:]
    today = date.today()
    best = None
    clear = []
    for k in range(0, 18):  # walk back up to 18 months
        y, m = today.year, today.month - k
        while m <= 0:
            y, m = y - 1, m + 12
        scenes = sorted(listing(f'{PREFIX}/{zone}/{band}/{sq}/{y}/{m}/'), reverse=True)
        for sc in scenes:
            try:
                c = clear_share(sc, b)
            except Exception as e:
                print('   skip', sc.split('/')[-2], e, file=sys.stderr)
                continue
            if c is None:
                continue
            name = sc.rstrip('/').split('/')[-1]
            if best is None or c > best[1]:
                best = (sc, c, name)
            if c >= 0.99:
                clear.append((sc, c, name))
            if len(clear) >= KEEP:
                break
        if len(clear) >= KEEP:
            break
    if not best:
        print(f'{site_id}: no usable scene', file=sys.stderr)
        return
    use = clear or [best]
    sc, c, name = use[0]
    when = re.search(r'_(\d{8})_', name).group(1)
    W = PX
    H = round(PX * (b[3] - b[1]) / ((b[2] - b[0]) * math.cos(math.radians(lat))))
    if H > W:
        W, H = round(PX * W / H), PX
    # Read red, green and blue reflectance at 10 m for each clear picture, on the output grid
    stack = []
    for scn, _, _ in use:
        bands = []
        for band in ('B04', 'B03', 'B02'):
            dst = np.zeros((H, W), np.float32)
            with rasterio.open(f'/vsicurl/{BUCKET}/{scn}{band}.tif') as src:
                bb = transform_bounds('EPSG:4326', src.crs, *b)
                win = win_from_bounds(*bb, transform=src.transform).round_offsets().round_lengths()
                win = win.__class__(win.col_off - 3, win.row_off - 3, win.width + 6, win.height + 6)
                arr = src.read(1, window=win).astype(np.float32)
                reproject(arr, dst, src_transform=src.window_transform(win), src_crs=src.crs,
                          dst_transform=from_bounds(*b, W, H), dst_crs='EPSG:4326', resampling=Resampling.cubic)
            bands.append(dst)
        stack.append(np.stack(bands))
    rgb = np.median(np.stack(stack), axis=0)  # 3 x H x W, median of the clear pictures
    # Haze correction and contrast: subtract each band's dark floor, stretch to the bright end, gentle gamma
    lo = min(np.percentile(rgb[i], 0.5) for i in range(3))  # one haze floor for all colours keeps the balance natural
    out = rgb - lo
    hi = np.percentile(out, 99.6)
    out = np.clip(out / hi, 0, 1) ** 0.78
    lum = out.mean(axis=0, keepdims=True)
    out = np.clip(lum + (out - lum) * 0.95, 0, 1)  # natural colour (the haze correction already adds some)
    img = Image.fromarray((np.moveaxis(out, 0, -1) * 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=45, threshold=3))
    dates = sorted(re.search(r'_(\d{8})_', n).group(1) for _, _, n in use)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{site_id}.jpg', quality=86, optimize=True)
    when = dates[-1]
    meta = dict(site=site_id, date=f'{when[:4]}-{when[4:6]}-{when[6:]}', dates=[f'{d[:4]}-{d[4:6]}-{d[6:]}' for d in dates], scene=name, clear=round(c, 3), pictures=len(use),
                bounds=dict(west=b[0], south=b[1], east=b[2], north=b[3]), resolution_m=10,
                source='Copernicus Sentinel-2 L2A bands 4, 3, 2 at 10 m, median of the clearest recent pictures, haze-corrected and contrast-stretched; AWS open data s3://sentinel-cogs',
                credit=f'Contains modified Copernicus Sentinel data {when[:4]}')
    (OUT / f'{site_id}.json').write_text(json.dumps(meta, indent=1))
    print(f'{site_id}: {meta["dates"]}, {len(use)} pictures, {W}x{H}', file=sys.stderr)


if __name__ == '__main__':
    names = sys.argv[1:] or [p.stem for p in sorted(DATA.glob('*.json'))]
    with rasterio.Env(**GDAL_ENV):
        for n in names:
            picture(n)
