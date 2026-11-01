#!/usr/bin/env python3
"""Settlements within 10 km of each sample village, for the shared solar plant check.

Google Open Buildings v3 (confidence >= 0.7) inside a 10 km radius, put on a 100 m grid;
occupied cells that touch (8 neighbours, after closing 1-cell gaps) form one settlement.
Settlements with at least 50 buildings are kept, with their centre, building count and
distance from the sample village. A shortest tree joining the sample village to every
settlement gives the medium-voltage line a shared plant would need.

Writes app/data/cluster/<site>.json.
"""
import json, math, os, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from gridsight_fetch import open_buildings, bbox_deg  # noqa: E402

DATA = HERE.parent / 'app' / 'data'
OUT = DATA / 'cluster'
R_KM, CELL, MIN_B = 10, 100, 50


def run(sid):
    site = json.loads((DATA / f'{sid}.json').read_text())
    lat0, lon0 = site['lat'], site['lon']
    b = bbox_deg(lat0, lon0, R_KM * 1000)
    pts, _ = open_buildings(lat0, lon0, b)
    kx, ky = 111_320 * math.cos(math.radians(lat0)), 110_574
    cells = {}
    for la, lo, area, conf in pts:
        if conf < 0.7:
            continue
        x, y = (lo - lon0) * kx, (la - lat0) * ky
        if x * x + y * y > (R_KM * 1000) ** 2:
            continue
        k = (int(math.floor(x / CELL)), int(math.floor(y / CELL)))
        c = cells.setdefault(k, [0, 0.0, 0.0])
        c[0] += 1; c[1] += x; c[2] += y
    # close 1-cell gaps, then connected components over 8 neighbours
    occ = set(cells)
    seen, groups = set(), []
    for k in occ:
        if k in seen:
            continue
        stack, g = [k], []
        seen.add(k)
        while stack:
            cx, cy = stack.pop(); g.append((cx, cy))
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    n = (cx + dx, cy + dy)
                    if n in occ and n not in seen:
                        seen.add(n); stack.append(n)
        groups.append(g)
    sets = []
    for g in groups:
        n = sum(cells[k][0] for k in g)
        if n < MIN_B:
            continue
        x = sum(cells[k][1] for k in g) / n
        y = sum(cells[k][2] for k in g) / n
        sets.append({'n': n, 'x': round(x), 'y': round(y), 'd_km': round(math.hypot(x, y) / 1000, 2),
                     'lat': round(lat0 + y / ky, 5), 'lon': round(lon0 + x / kx, 5)})
    sets.sort(key=lambda s: s['d_km'])
    # the sample village is the settlement nearest the centre
    home = sets[0] if sets and sets[0]['d_km'] < 1.5 else None
    others = [s for s in sets if s is not home]
    # shortest tree from the sample village through every other settlement (Prim), line km
    nodes = [(0, 0)] + [(s['x'], s['y']) for s in others]
    inside, best, parent = {0}, {}, {}
    for i in range(1, len(nodes)):
        best[i] = math.dist(nodes[0], nodes[i]); parent[i] = 0
    order = []
    while best:
        i = min(best, key=best.get)
        order.append({'to': i - 1, 'from': parent[i] - 1, 'km': round(best.pop(i) / 1000, 2)})
        inside.add(i)
        for j in list(best):
            d = math.dist(nodes[i], nodes[j])
            if d < best[j]:
                best[j] = d; parent[j] = i
    out = dict(site=sid, radius_km=R_KM, min_buildings=MIN_B, source='Google Open Buildings v3, confidence >= 0.7',
               method='100 m grid, cells within 200 m joined; settlements of 50+ buildings; shortest tree from the sample village',
               home=home, settlements=others, tree=order)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{sid}.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'{sid}: {len(others)} settlements within {R_KM} km, {sum(s["n"] for s in others)} buildings; home {home and home["n"]}', file=sys.stderr)


if __name__ == '__main__':
    for sid in (sys.argv[1:] or [p.stem for p in sorted((DATA / 'engine').glob('*.json'))]):
        run(sid)
