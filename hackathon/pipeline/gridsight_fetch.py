#!/usr/bin/env python3
"""Kesho site fetcher.

Pulls public data for one site (a point plus a radius) and writes a compact
JSON file the Kesho dashboard reads:

  * Google Open Buildings v3 (points: centroid lat/lon, area_in_meters,
    confidence), from the public bucket gs://open-buildings-data (no login).
  * Overture Maps (release on s3://overturemaps-us-west-2, no login), which
    bundles OpenStreetMap and other open sources:
      - buildings: OSM building tags (class) and footprint shape
      - places: points of interest (clinics, schools, shops, markets ...)
      - transportation: roads, for distance to road
      - base/infrastructure: mapped power lines, for distance to the grid
  * Optional: a VIIRS nighttime lights GeoTIFF you downloaded yourself
    (--viirs path.tif), sampled at the site. NOAA/EOG needs a free login,
    so it is not fetched automatically.

Classification and the demand model run in the dashboard, so the rules stay
in one place and can be explained there. This script only gathers features.

Usage (laptop):
    pip install pyarrow shapely s2sphere
    python gridsight_fetch.py --name "Gbamu Gbamu" --country NG \
        --lat 6.8451 --lon 4.2149 --radius 1000 --out ../app/data/gbamu.json

Runs in a few minutes on a laptop; downloads one Open Buildings file
(10 to 120 MB) per site and reads only the needed parts of Overture.
"""
import argparse, gzip, json, math, os, subprocess, sys, time, urllib.request

import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pafs
import s2sphere
from shapely import wkb
from shapely.geometry import Point, box
from shapely.strtree import STRtree
from shapely import transform as _tf

def transform(f, g):
    return _tf(g, lambda c: __import__('numpy').array([f(x, y) for x, y in c]).reshape(-1, 2))

OVERTURE = 'overturemaps-us-west-2/release/2026-10-21.0/'
OB_URL = 'https://storage.googleapis.com/open-buildings-data/v3/points_s2_level_6_gzip_no_header/{}_buildings.csv.gz'
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')


def s3():
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
    kw = dict(anonymous=True, region='us-west-2')
    if proxy:
        kw['proxy_options'] = proxy
    return pafs.S3FileSystem(**kw)


def bbox_deg(lat, lon, r_m):
    dlat = r_m / 111_320
    dlon = r_m / (111_320 * math.cos(math.radians(lat)))
    return lon - dlon, lat - dlat, lon + dlon, lat + dlat


def projector(lat0, lon0):
    """Local flat projection in metres around the site (good to ~0.1% over a few km)."""
    kx = 111_320 * math.cos(math.radians(lat0))
    ky = 110_574
    return lambda x, y, z=None: ((x - lon0) * kx, (y - lat0) * ky)


def bbox_filter(b):
    xmin, ymin, xmax, ymax = b
    return ((pc.field('bbox', 'xmax') >= xmin) & (pc.field('bbox', 'xmin') <= xmax) &
            (pc.field('bbox', 'ymax') >= ymin) & (pc.field('bbox', 'ymin') <= ymax))


def overture(fs, path, b, columns, extra=None):
    d = ds.dataset(OVERTURE + path, filesystem=fs, format='parquet')
    f = bbox_filter(b)
    if extra is not None:
        f = f & extra
    return d.to_table(columns=columns, filter=f).to_pylist()


def open_buildings(lat, lon, b):
    token = s2sphere.CellId.from_lat_lng(s2sphere.LatLng.from_degrees(lat, lon)).parent(6).to_token()
    os.makedirs(CACHE, exist_ok=True)
    local = os.path.join(CACHE, f'{token}_buildings.csv.gz')
    if not os.path.exists(local):
        print(f'  downloading Open Buildings cell {token} ...', file=sys.stderr)
        try:
            subprocess.run(['gsutil', '-q', 'cp', f'gs://open-buildings-data/v3/points_s2_level_6_gzip_no_header/{token}_buildings.csv.gz', local], check=True)
        except Exception:
            urllib.request.urlretrieve(OB_URL.format(token), local)
    xmin, ymin, xmax, ymax = b
    out = []
    with gzip.open(local, 'rt') as f:
        for line in f:
            p = line.split(',')
            la, lo = float(p[0]), float(p[1])
            if ymin <= la <= ymax and xmin <= lo <= xmax:
                out.append((la, lo, float(p[2]), float(p[3])))
    return out, token


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', required=True)
    ap.add_argument('--country', required=True, help='ISO code, e.g. NG')
    ap.add_argument('--region', default='')
    ap.add_argument('--lat', type=float, required=True)
    ap.add_argument('--lon', type=float, required=True)
    ap.add_argument('--radius', type=float, default=1000, help='metres')
    ap.add_argument('--min-conf', type=float, default=0.70, help='Open Buildings confidence cut-off')
    ap.add_argument('--grid-search-km', type=float, default=40)
    ap.add_argument('--viirs', help='optional VIIRS annual radiance GeoTIFF (nW/cm2/sr)')
    ap.add_argument('--note', default='')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    t0 = time.time()
    fs = s3()
    proj = projector(a.lat, a.lon)
    b = bbox_deg(a.lat, a.lon, a.radius)
    b_wide = bbox_deg(a.lat, a.lon, a.radius + 600)
    centre = Point(0, 0)

    print('Open Buildings ...', file=sys.stderr)
    ob, token = open_buildings(a.lat, a.lon, b)
    ob = [r for r in ob if r[3] >= a.min_conf]
    pts = []
    for la, lo, area, conf in ob:
        x, y = proj(lo, la)
        if math.hypot(x, y) <= a.radius:
            pts.append((la, lo, area, conf, x, y))
    print(f'  {len(pts)} buildings within {a.radius:.0f} m (confidence >= {a.min_conf})', file=sys.stderr)

    print('Overture buildings ...', file=sys.stderr)
    obld = overture(fs, 'theme=buildings/type=building/', b, ['id', 'geometry', 'subtype', 'class', 'names', 'sources', 'num_floors'])
    polys, pmeta = [], []
    for r in obld:
        g = transform(proj, wkb.loads(r['geometry']))
        if g.is_empty or not g.is_valid:
            g = g.buffer(0)
        if g.is_empty:
            continue
        srcs = sorted({s['dataset'] for s in (r['sources'] or []) if s.get('dataset')})
        s0 = (r['sources'] or [{}])[0]
        polys.append(g)
        pmeta.append(dict(subtype=r['subtype'], cls=r['class'], name=(r['names'] or {}).get('primary'), src=srcs,
                          src0=s0.get('dataset'), year=int(s0['update_time'][:4]) if s0.get('update_time') else None,
                          conf=s0.get('confidence')))
    tree = STRtree(polys) if polys else None

    # One building list from all footprint sources: Overture's merged set
    # (Google, Microsoft, OpenStreetMap, duplicates removed), plus Open
    # Buildings points that no Overture footprint covers. Google alone misses
    # buildings where its imagery is old or missing.
    SRC = {'Google Open Buildings': 'G', 'Microsoft ML Buildings': 'M', 'OpenStreetMap': 'O'}
    merged = []  # (lat, lon, area, conf, x, y, poly_index, src, year)
    for i, (g, m) in enumerate(zip(polys, pmeta)):
        c = g.centroid
        if math.hypot(c.x, c.y) > a.radius:
            continue
        lo_, la_ = c.x / (111320 * math.cos(math.radians(a.lat))) + a.lon, c.y / 110574 + a.lat
        merged.append((la_, lo_, g.area, m['conf'], c.x, c.y, i, SRC.get(m['src0'], 'X'), m['year']))
    extra = 0
    for la, lo, area, conf, x, y in pts:
        pt = Point(x, y)
        # Same house drawn a few metres off by another source counts once
        if tree is not None and any(polys[i].distance(pt) <= 6 for i in tree.query(pt.buffer(6))):
            continue
        merged.append((la, lo, area, conf, x, y, None, 'G', 2023))
        extra += 1
    print(f'  {len(merged)} buildings from all sources ({extra} Google-only points added)', file=sys.stderr)
    google_alone = len(pts)
    pts = merged

    print('Overture places ...', file=sys.stderr)
    places = []
    for r in overture(fs, 'theme=places/type=place/', b_wide, ['id', 'geometry', 'confidence', 'names', 'basic_category', 'taxonomy']):
        g = wkb.loads(r['geometry'])
        x, y = proj(g.x, g.y)
        places.append(dict(name=(r['names'] or {}).get('primary'), cat=r['basic_category'] or (r['taxonomy'] or {}).get('primary'),
                           conf=round(r['confidence'] or 0, 2), lat=round(g.y, 6), lon=round(g.x, 6), x=x, y=y))
    ptree = STRtree([Point(p['x'], p['y']) for p in places]) if places else None

    print('Overture roads ...', file=sys.stderr)
    roads, rgeoms = [], []
    for r in overture(fs, 'theme=transportation/type=segment/', b_wide, ['geometry', 'subtype', 'class'], pc.field('subtype') == 'road'):
        g = wkb.loads(r['geometry'])
        rgeoms.append((transform(proj, g), r['class']))
        if g.geom_type == 'LineString':
            roads.append(dict(c=r['class'], p=[[round(y, 6), round(x, 6)] for x, y in g.coords]))
    MAIN = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary'}
    rtree = STRtree([g for g, _ in rgeoms]) if rgeoms else None
    mains = [g for g, c in rgeoms if c in MAIN]
    mtree = STRtree(mains) if mains else None

    print('Overture power lines ...', file=sys.stderr)
    bg = bbox_deg(a.lat, a.lon, a.grid_search_km * 1000)
    grid = overture(fs, 'theme=base/type=infrastructure/', bg, ['geometry', 'subtype', 'class', 'names', 'source_tags'],
                    (pc.field('subtype') == 'power') & pc.field('class').isin(['power_line', 'minor_line', 'cable', 'substation', 'transformer', 'plant', 'generator']))
    grid_d, grid_cls = None, None
    gl, plants = [], []
    for r in grid:
        g0 = wkb.loads(r['geometry'])
        g = transform(proj, g0)
        d = g.distance(centre)
        if r['class'] in ('plant', 'generator'):
            if d < 5000:
                tags = dict(r['source_tags'] or {})
                plants.append(dict(cls=r['class'], name=(r['names'] or {}).get('primary'), d_km=round(d / 1000, 2),
                                   source=tags.get('plant:source') or tags.get('generator:source'),
                                   output=tags.get('plant:output:electricity') or tags.get('generator:output:electricity'),
                                   lat=round(g0.centroid.y, 6), lon=round(g0.centroid.x, 6)))
            continue
        if grid_d is None or d < grid_d:
            grid_d, grid_cls = d, r['class']
        if r['class'] in ('power_line', 'minor_line') and d < a.radius * 4 and g0.geom_type == 'LineString':
            gl.append(dict(c=r['class'], p=[[round(y, 6), round(x, 6)] for x, y in g0.coords]))

    viirs = None
    if a.viirs:
        try:
            import rasterio
            with rasterio.open(a.viirs) as src:
                viirs = float(next(src.sample([(a.lon, a.lat)]))[0])
        except Exception as e:
            print('  VIIRS read failed:', e, file=sys.stderr)

    # Per building features
    allpts = STRtree([Point(p[4], p[5]) for p in pts]) if pts else None
    markets = [p for p in places if p['cat'] and any(k in p['cat'] for k in ('market', 'shopping'))]
    out_b = []
    outlines = []
    for la, lo, area, conf, x, y, pidx, src, year in pts:
        if pidx is not None:
            g = polys[pidx]
            g = max(g.geoms, key=lambda q: q.area) if g.geom_type == 'MultiPolygon' else g
            ring = g.simplify(0.5).exterior.coords[:-1]
            outlines.append([v for cx_, cy_ in ring[:24] for v in (round((cx_ - x) * 10), round((cy_ - y) * 10))])
        else:
            outlines.append(None)
    for la, lo, area, conf, x, y, pidx, src, year in pts:
        pt = Point(x, y)
        osm, shape = None, None
        if tree is not None:
            for i in ([pidx] if pidx is not None else tree.query(pt)):
                if pidx is not None or polys[i].contains(pt):
                    m = pmeta[i]
                    if m['cls'] or m['subtype']:
                        osm = m['cls'] or m['subtype']
                    g = polys[i]
                    rr = g.minimum_rotated_rectangle
                    xs = list(rr.exterior.coords)
                    s1 = math.dist(xs[0], xs[1]); s2 = math.dist(xs[1], xs[2])
                    elong = max(s1, s2) / max(0.1, min(s1, s2))
                    compact = 4 * math.pi * g.area / max(1e-6, g.length ** 2)
                    shape = (round(elong, 2), round(compact, 2))
                    break
        poi = None
        if ptree is not None:
            for j in ptree.query(pt.buffer(20)):
                p = places[j]
                d = math.hypot(p['x'] - x, p['y'] - y)
                if d <= 20 and (poi is None or d < poi[2]):
                    poi = (p['cat'], p['conf'], round(d, 1), p['name'])
        d_road = round(rgeoms[rtree.nearest(pt)][0].distance(pt), 1) if rtree is not None else None
        d_main = round(mains[mtree.nearest(pt)].distance(pt), 1) if mtree is not None else None
        near = len(allpts.query(pt.buffer(50))) - 1
        d_mkt = round(min(math.hypot(m['x'] - x, m['y'] - y) for m in markets), 0) if markets else None
        out_b.append([round(la, 6), round(lo, 6), round(area, 1), round(conf, 3) if conf is not None else None, osm, poi[0] if poi else None,
                      poi[1] if poi else None, d_road, d_main, near, shape[0] if shape else None, shape[1] if shape else None, d_mkt, src, year])

    src_count = {}
    for m in pmeta:
        for s in m['src']:
            src_count[s] = src_count.get(s, 0) + 1

    site = dict(
        name=a.name, country=a.country, region=a.region, lat=a.lat, lon=a.lon, radius_m=a.radius, note=a.note,
        fetched=time.strftime('%Y-%m-%d'),
        sources=dict(open_buildings=f'Google Open Buildings v3, S2 cell {token}, confidence >= {a.min_conf}',
                     overture='Overture Maps release 2026-10-21.0 (buildings, places, transportation, base)',
                     overture_building_sources=src_count),
        grid=dict(dist_km=round(grid_d / 1000, 2) if grid_d is not None else None, nearest=grid_cls,
                  searched_km=a.grid_search_km, plants=plants, note='Distance to nearest power line, cable, substation or transformer mapped in OpenStreetMap (via Overture). Unmapped lines are missed.'),
        viirs=viirs,
        coverage=dict(google_alone=google_alone, merged=len(out_b)),
        fields=['lat', 'lon', 'area_m2', 'ob_conf', 'osm_class', 'poi_cat', 'poi_conf', 'd_road_m', 'd_main_road_m', 'n_within_50m', 'elongation', 'compactness', 'd_market_m', 'source', 'source_year'],
        footprint_note='source: G Google Open Buildings, M Microsoft ML Buildings, O OpenStreetMap; source_year: date of that source record (Google dataset release, OSM last edit), not the photo date',
        buildings=out_b,
        outlines=outlines,
        outline_note='outline: x, y pairs in decimetres east and north of the building centre, simplified to 0.5 m; null where only a Google point exists',
        places=[{k: v for k, v in p.items() if k not in ('x', 'y')} for p in places if math.hypot(p['x'], p['y']) <= a.radius + 300],
        roads=roads,
        power_lines=gl,
    )
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w') as f:
        json.dump(site, f, separators=(',', ':'))
    print(f'Wrote {a.out}: {len(out_b)} buildings, {len(site["places"])} places, {len(roads)} road segments, '
          f'grid {site["grid"]["dist_km"]} km, {time.time() - t0:.0f}s', file=sys.stderr)


if __name__ == '__main__':
    main()
