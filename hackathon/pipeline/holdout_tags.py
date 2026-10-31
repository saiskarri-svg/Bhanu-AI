#!/usr/bin/env python3
"""Held-out test set for the building classifier.

Samples villages across the focus countries, keeps every building that
OpenStreetMap volunteers tagged (house, hut, shop, school, clinic ...), and
writes the same features the dashboard uses, with the tag kept apart as the
answer. The dashboard then classifies these buildings with the tag hidden and
reports how often it agrees with the volunteers.

Footprints here come from Overture (OSM polygons), so area and shape are
measured from the polygon itself. Usage:
    python holdout_tags.py --villages 60 --out ../app/data/holdout/tags.json
"""
import argparse, json, math, os, pickle, random, sys, time

import pyarrow.compute as pc
import pyarrow.dataset as ds
from shapely import wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gridsight_fetch import OVERTURE, s3, bbox_deg, projector, transform  # noqa: E402

COUNTRIES = ['NG', 'KE', 'TZ', 'SL', 'UG']
MAIN = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary'}


def localities(fs):
    d = ds.dataset(OVERTURE + 'theme=divisions/type=division/', filesystem=fs, format='parquet')
    t = d.to_table(columns=['names', 'country', 'class', 'bbox'],
                   filter=pc.field('country').isin(COUNTRIES) & (pc.field('subtype') == 'locality') & (pc.field('class') == 'village'))
    return t.to_pylist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--villages', type=int, default=60)
    ap.add_argument('--radius', type=float, default=1500)
    ap.add_argument('--seed', type=int, default=3)
    ap.add_argument('--countries', default=','.join(COUNTRIES))
    ap.add_argument('--max-homes', type=int, default=60, help='cap on house-like tags kept per village, so one heavily mapped village does not dominate')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    fs = s3()
    locs = localities(fs)
    random.seed(a.seed)
    cs = a.countries.split(',')
    per = max(1, a.villages // len(cs))
    pick = []
    for c in cs:
        pool = [l for l in locs if l['country'] == c]
        pick += random.sample(pool, min(per, len(pool)))
    bld = ds.dataset(OVERTURE + 'theme=buildings/type=building/', filesystem=fs, format='parquet')
    seg = ds.dataset(OVERTURE + 'theme=transportation/type=segment/', filesystem=fs, format='parquet')
    out, used = [], []
    for l in pick:
        bb = l['bbox']; lat = (bb['ymin'] + bb['ymax']) / 2; lon = (bb['xmin'] + bb['xmax']) / 2
        b = bbox_deg(lat, lon, a.radius)
        f = ((pc.field('bbox', 'xmax') >= b[0]) & (pc.field('bbox', 'xmin') <= b[2]) & (pc.field('bbox', 'ymax') >= b[1]) & (pc.field('bbox', 'ymin') <= b[3]))
        t0 = time.time()
        rows = bld.to_table(columns=['geometry', 'class', 'subtype'], filter=f).to_pylist()
        tagged = [r for r in rows if r['class'] or r['subtype']]
        name = (l['names'] or {}).get('primary')
        print(f'{l["country"]} {name}: {len(rows)} buildings, {len(tagged)} tagged ({time.time() - t0:.0f}s)', file=sys.stderr)
        if len(tagged) < 3:
            continue
        proj = projector(lat, lon)
        geoms = [transform(proj, wkb.loads(r['geometry'])) for r in rows]
        cents = [g.centroid for g in geoms]
        ctree = STRtree(cents)
        roads = seg.to_table(columns=['geometry', 'class'], filter=f & (pc.field('subtype') == 'road')).to_pylist()
        rg = [(transform(proj, wkb.loads(r['geometry'])), r['class']) for r in roads]
        rtree = STRtree([g for g, _ in rg]) if rg else None
        mains = [g for g, c in rg if c in MAIN]
        mtree = STRtree(mains) if mains else None
        used.append(dict(name=name, country=l['country'], lat=round(lat, 4), lon=round(lon, 4), buildings=len(rows), tagged=len(tagged)))
        homes = 0
        for r, g, c in zip(rows, geoms, cents):
            tag = r['class'] or r['subtype']
            if not tag:
                continue
            if tag in ('house', 'hut', 'residential', 'detached', 'apartments', 'semidetached_house', 'terrace', 'bungalow'):
                homes += 1
                if homes > a.max_homes:
                    continue
            rr = g.minimum_rotated_rectangle
            xs = list(rr.exterior.coords) if rr.geom_type == 'Polygon' else [(0, 0), (1, 0), (1, 1)]
            s1 = math.dist(xs[0], xs[1]); s2 = math.dist(xs[1], xs[2])
            elong = max(s1, s2) / max(0.1, min(s1, s2))
            compact = 4 * math.pi * g.area / max(1e-6, g.length ** 2)
            near = len(ctree.query(c.buffer(50))) - 1
            d_road = round(rg[rtree.nearest(c)][0].distance(c), 1) if rtree is not None else None
            d_main = round(mains[mtree.nearest(c)].distance(c), 1) if mtree is not None else None
            out.append(dict(c=l['country'], v=len(used) - 1, truth=tag, f=[0, 0, round(g.area, 1), 1, None, None, None, d_road, d_main, near, round(elong, 2), round(compact, 2), None]))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(dict(made=time.strftime('%Y-%m-%d'), radius_m=a.radius, villages=used, buildings=out), open(a.out, 'w'), separators=(',', ':'))
    print(f'Wrote {a.out}: {len(out)} tagged buildings from {len(used)} villages', file=sys.stderr)


if __name__ == '__main__':
    main()
