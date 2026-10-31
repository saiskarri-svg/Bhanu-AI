"""
Tests for village_landuse.py on a synthetic village with a known answer.

The synthetic data is shaped exactly like the real downloads (Overture GeoParquet
with nested columns, osmnx output, a Google Open Buildings CSV), and is fed
through the same code path by replacing only the two download functions.

Run:  python test_synthetic.py      (or: pytest test_synthetic.py)
"""
import json
import shutil
import tempfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import Point, box

import village_landuse as vl

LAT, LON = 9.4034, -0.8424          # synthetic village, northern Ghana
UTM = 32630                          # what estimate_utm_crs() picks here
_c = gpd.GeoSeries([Point(LON, LAT)], crs=4326).to_crs(UTM).iloc[0]
CX, CY = _c.x, _c.y


def rect(dx, dy, w, h):
    """w x h metre rectangle centred dx, dy metres from the village centre."""
    return box(CX + dx - w / 2, CY + dy - h / 2, CX + dx + w / 2, CY + dy + h / 2)


def pt(dx, dy):
    return Point(CX + dx, CY + dy)


GOOGLE = [{"dataset": "Google Open Buildings", "confidence": 0.8}]
MSFT = [{"dataset": "Microsoft ML Buildings"}]
OSM = [{"dataset": "OpenStreetMap", "record_id": "w1@1"}]


def make_world():
    """Return raw Overture buildings, Overture places and OSM features + expected answer."""
    B, PL, O = [], [], []

    def bld(geom, cls=None, sub=None, src=GOOGLE):
        B.append({"geometry": geom, "class": cls, "subtype": sub, "sources": src, "names": None})

    # 200 houses (8 x 10 m) on a jittered grid, avoiding the special areas
    rng = np.random.default_rng(7)
    houses = []
    grid = [(gx, gy) for gx in range(-300, 301, 30) for gy in range(-300, 301, 30)]
    for gi in rng.permutation(len(grid)):           # random picks so houses cover the whole village
        if len(houses) == 200:
            break
        if True:
            gx, gy = grid[gi]
            dx, dy = gx + rng.uniform(-4, 4), gy + rng.uniform(-4, 4)
            # keep houses clear of the special buildings / compounds (x, y, radius)
            keep_out = [(150, 150, 62), (-150, -150, 42), (250, -50, 45), (-120, 80, 25),
                        (-100, 110, 20), (0, 0, 30), (60, -200, 25), (-40, 200, 30)]
            if np.hypot(dx, dy) > 300 or any(np.hypot(dx - x, dy - y) < r + 8 for x, y, r in keep_out):
                continue
            houses.append((dx, dy))
    assert len(houses) == 200
    for i, (dx, dy) in enumerate(houses):
        if i < 20:
            bld(rect(dx, dy, 8, 10), cls="house", sub="residential", src=OSM)
        elif i < 40:
            bld(rect(dx, dy, 8, 10), src=MSFT)
        else:
            bld(rect(dx, dy, 8, 10))

    # shops: Overture places inside 6 Google houses (new taxonomy schema)
    for dx, dy in houses[40:46]:
        PL.append({"geometry": pt(dx, dy), "confidence": 0.8, "names": {"primary": "Shop"},
                   "taxonomy": {"primary": "grocery_store",
                                "hierarchy": ["shopping", "food_and_beverage_store", "grocery_store"],
                                "alternates": []},
                   "basic_category": "grocery_store", "categories": None})
    # one shop with the legacy 'categories' schema only
    dx, dy = houses[46]
    PL.append({"geometry": pt(dx, dy), "confidence": 0.9, "names": {"primary": "Phones"},
               "taxonomy": None, "basic_category": None,
               "categories": {"primary": "mobile_phone_store", "alternate": ["electronics"]}})
    # low-confidence place -> ignored, house stays residential
    dx, dy = houses[47]
    PL.append({"geometry": pt(dx, dy), "confidence": 0.3, "names": {"primary": "Ghost"},
               "taxonomy": {"primary": "restaurant", "hierarchy": ["food_and_drink", "restaurant"]},
               "basic_category": "casual_eatery", "categories": None})
    # restaurant via basic_category + hierarchy (primary label is unhelpful)
    dx, dy = houses[48]
    PL.append({"geometry": pt(dx, dy), "confidence": 0.7, "names": None,
               "taxonomy": {"primary": "gas_station_sushi",
                            "hierarchy": ["food_and_drink", "restaurant", "casual_eatery", "gas_station_sushi"]},
               "basic_category": "casual_eatery", "categories": None})
    # OSM-tagged house with a shop POI inside -> store (mixed use)
    dx, dy = houses[0]
    O.append({"element": "node", "id": 1, "shop": "kiosk", "name": "Mama Kiosk", "geometry": pt(dx, dy)})
    # OSM-tagged house with a restaurant POI 6 m away -> stays residential (own tag wins over snap)
    # (6 m keeps it nearer to this house than to any jittered neighbour)
    dx, dy = houses[1]
    O.append({"element": "node", "id": 2, "amenity": "restaurant", "geometry": pt(dx + 4 + 6, dy)})
    # untagged house with a restaurant POI 6 m away -> restaurant by snapping
    dx, dy = houses[49]
    O.append({"element": "node", "id": 3, "amenity": "restaurant", "name": "Chop bar",
              "geometry": pt(dx + 4 + 6, dy)})
    # carpenter workshop node inside an untagged house -> industrial
    dx, dy = houses[50]
    O.append({"element": "node", "id": 4, "craft": "carpenter", "geometry": pt(dx, dy)})

    # school compound (OSM area) with 2 untagged classroom blocks, + an Overture school place
    O.append({"element": "way", "id": 10, "amenity": "school", "name": "D/A Primary",
              "geometry": rect(150, 150, 80, 60)})
    bld(rect(140, 160, 30, 8)); bld(rect(160, 138, 30, 8))
    PL.append({"geometry": pt(140, 160), "confidence": 0.9, "names": {"primary": "D/A Primary"},
               "taxonomy": {"primary": "elementary_school", "hierarchy": ["education", "school", "elementary_school"]},
               "basic_category": "school", "categories": None})
    # clinic: building with subtype=medical (no class)
    bld(rect(-120, 80, 20, 12), sub="medical", src=OSM)
    # health post: untagged building with an OSM clinic node inside
    bld(rect(-100, 110, 10, 10))
    O.append({"element": "node", "id": 5, "amenity": "clinic", "geometry": pt(-100, 110)})
    # open-air market (OSM area, 50 x 40 m) with 5 small untagged kiosks
    O.append({"element": "way", "id": 11, "amenity": "marketplace", "geometry": rect(-150, -150, 50, 40)})
    for k in range(5):
        bld(rect(-170 + 10 * k, -150, 4, 3))
    # grain mill: class=industrial
    bld(rect(60, -200, 15, 10), cls="industrial", sub="industrial", src=OSM)
    # church
    bld(rect(-40, 200, 25, 15), cls="church", sub="religious", src=OSM)
    # big untagged building (600 m2) -> unverified_large
    bld(rect(0, 0, 30, 20))
    # industrial land-use zone with 2 untagged 100 m2 sheds
    O.append({"element": "way", "id": 12, "landuse": "industrial", "geometry": rect(250, -50, 60, 40)})
    bld(rect(240, -50, 10, 10)); bld(rect(260, -50, 10, 10))
    # irrelevant OSM features and a POI far from any building
    O.append({"element": "node", "id": 6, "amenity": "water_point", "geometry": pt(5, 40)})
    O.append({"element": "node", "id": 7, "amenity": "fuel", "geometry": pt(-280, 280)})
    # separate hamlet 700 m east: 10 houses -> outside the settlement, inside the 1 km circle
    for k in range(10):
        bld(rect(700 + 15 * (k % 5), 15 * (k // 5), 8, 10))

    to_ll = lambda rows: gpd.GeoDataFrame(rows, geometry="geometry", crs=UTM).to_crs(4326)
    buildings, places, osm = to_ll(B), to_ll(PL), to_ll(O)

    # Round-trip Overture frames through GeoParquet: nested columns come back
    # as dicts / numpy arrays, the same way overturemaps' Arrow reader delivers them.
    tmp = Path(tempfile.mkdtemp())
    buildings.to_parquet(tmp / "b.parquet"); places.to_parquet(tmp / "p.parquet")
    buildings, places = gpd.read_parquet(tmp / "b.parquet"), gpd.read_parquet(tmp / "p.parquet")

    expected = {  # settlement extent (hamlet excluded)
        "residential": (200 - 6 - 1 - 1 - 1 - 1 - 1 + 0, None),  # minus 6 shops, phone, resto, kiosk-house, snapped, carpenter
        "store": (6 + 1 + 1, 8 * 80),
        "restaurant": (2, 2 * 80),
        "industrial": (1 + 1 + 2, 80 + 150 + 200),
        "education": (2, 480),
        "health": (2, 240 + 100),
        "market_mall": (5, 60),
        "other_nonres": (1, 375),
        "unverified_large": (1, 600),
    }
    expected["residential"] = (expected["residential"][0], expected["residential"][0] * 80)
    return buildings, places, osm, expected


def _patched(monkey_world):
    buildings, places, osm, _ = monkey_world

    def fake_overture(t, bbox, release=None):
        return buildings.copy() if t == "building" else places.copy()

    def fake_osm(lat, lon, dist, tags):
        if "building" in tags:
            return gpd.GeoDataFrame(geometry=gpd.GeoSeries([], crs=4326))
        return osm.copy()
    return fake_overture, fake_osm


# --------------------------------------------------------------------------
def test_label_rules():
    c = vl.classify_place_labels
    assert c(["grocery_store", None, "shopping"]) == "store"
    assert c(["health_food_store"]) == "store"
    assert c(["coffee_shop"]) == "restaurant"
    assert c(["farmers_market"]) == "market_mall"
    assert c(["shopping_center"]) == "market_mall"
    assert c(["supermarket"]) == "store"
    assert c(["barber"]) == "store" and c(["bar"]) == "restaurant"
    assert c(["casual_eatery", "gas_station_sushi"]) == "restaurant"   # basic_category is checked first
    assert c(["maternity_clinic"]) == "health"
    assert c(["elementary_school"]) == "education"
    assert c(["rice_mill"]) == "industrial"
    assert c(["mosque"]) == "other_nonres"
    assert c(["park"]) is None
    t = vl.classify_osm_tags
    assert t({"building": "house", "shop": "kiosk"}) == "store"
    assert t({"building": "yes", "amenity": "school"}) == "education"
    assert t({"amenity": "water_point"}) is None
    assert t({"healthcare": "pharmacy"}) == "store"
    assert t({"landuse": "industrial"}) == "industrial"
    assert t({"craft": "tailor"}) == "industrial"


def test_parse_location():
    p = vl.parse_location
    assert p("9.4034, -0.8424")[:2] == (9.4034, -0.8424)
    assert p("9.4034 -0.8424")[:2] == (9.4034, -0.8424)
    assert p("https://www.google.com/maps/@-1.8873,30.6372,17z")[:2] == (-1.8873, 30.6372)
    assert p("https://maps.google.com/?q=12.65,-8.0")[:2] == (12.65, -8.0)
    try:
        p("95.0, 10.0")
        raise AssertionError("should reject latitude 95")
    except ValueError:
        pass


def test_full_pipeline_settlement(tmp_path=None):
    world = make_world()
    exp = world[3]
    fo, fs = _patched(world)
    orig = vl.fetch_overture, vl.fetch_osm
    vl.fetch_overture, vl.fetch_osm = fo, fs
    try:
        out = Path(tmp_path or tempfile.mkdtemp())
        shutil.rmtree(out / "cache", ignore_errors=True)   # never test against a stale cache
        cfg = vl.Config(radius_m=1000, extent="settlement")
        r = vl.run(f"{LAT}, {LON}", cfg, out_dir=out)
    finally:
        vl.fetch_overture, vl.fetch_osm = orig

    s = r.summary.set_index("category")
    for cat, (n, area) in exp.items():
        assert s.loc[cat, "buildings"] == n, (cat, s.loc[cat, "buildings"], n)
        assert abs(s.loc[cat, "footprint_m2"] - area) / area < 0.005, (cat, s.loc[cat, "footprint_m2"], area)
    total = sum(a for _, a in exp.values())
    assert abs(r.headline["built_area_m2"] - total) / total < 0.005
    assert abs(s["pct_of_built_area"].sum() - 100) < 0.05
    # open-air market and school compound show up as site area
    assert abs(s.loc["market_mall", "site_area_m2"] - 2000) < 20
    assert abs(s.loc["education", "site_area_m2"] - 4800) < 50
    # the rule used is recorded and specific cases land where they should
    b = r.buildings
    assert set(b["method"]) >= {"own tag", "POI inside building", "POI within 20 m",
                                "inside mapped compound", "inside land-use zone", "size rule", "default"}
    assert r.headline["footprint_sources_pct"]["Google Open Buildings"] > 50
    # hamlet 700 m away is not part of the settlement
    assert r.headline["n_buildings"] == sum(n for n, _ in exp.values())
    gj = gpd.read_file(next(out.glob("*_buildings.geojson")))
    assert len(gj) == r.headline["n_buildings"] and {"category", "method", "evidence"} <= set(gj.columns)
    j = json.loads(next(out.glob("*_summary.json")).read_text())
    assert j["headline"]["n_buildings"] == r.headline["n_buildings"]
    assert next(out.glob("*_map.png")).stat().st_size > 20_000
    assert next(out.glob("*_map.html")).stat().st_size > 20_000

    # second run uses the cache (downloads disabled)
    vl.fetch_overture = vl.fetch_osm = lambda *a, **k: (_ for _ in ()).throw(AssertionError("no download"))
    try:
        r2 = vl.run(f"{LAT}, {LON}", cfg, out_dir=out, png=False, html=False)
    finally:
        vl.fetch_overture, vl.fetch_osm = orig
    assert r2.headline["n_buildings"] == r.headline["n_buildings"]
    return r, out


def test_circle_includes_hamlet():
    world = make_world()
    exp = world[3]
    fo, fs = _patched(world)
    orig = vl.fetch_overture, vl.fetch_osm
    vl.fetch_overture, vl.fetch_osm = fo, fs
    try:
        cfg = vl.Config(radius_m=1000, extent="circle")
        b, p, s = vl.gather_data(LAT, LON, cfg)
        r = vl.analyze(b, p, s, LAT, LON, cfg)
    finally:
        vl.fetch_overture, vl.fetch_osm = orig
    assert r.headline["n_buildings"] == sum(n for n, _ in exp.values()) + 10
    assert abs(r.headline["extent_area_m2"] - np.pi * 1000 ** 2) / (np.pi * 1e6) < 0.002


def test_google_open_buildings_csv():
    buildings = make_world()[0]
    g = buildings[buildings["sources"].map(lambda v: v[0]["dataset"] == "Google Open Buildings")]
    pts = g.geometry.representative_point()
    df = pd.DataFrame({"latitude": pts.y, "longitude": pts.x,
                       "area_in_meters": g.to_crs(UTM).area.round(2),
                       "confidence": np.where(np.arange(len(g)) % 10 == 0, 0.6, 0.85),
                       "geometry": g.geometry.to_wkt(), "full_plus_code": "6CQQ+XX"})
    f = Path(tempfile.mkdtemp()) / "tile_buildings.csv.gz"
    df.to_csv(f, index=False)
    bbox = vl.bbox_around(LAT, LON, 1000)
    raw = vl.load_buildings_file(f, bbox, min_conf=0.7)
    std = vl.std_file_buildings(raw)
    assert len(std) == (np.arange(len(g)) % 10 != 0).sum()
    assert set(std["source"]) == {"Google Open Buildings"}
    assert std["tag_category"].isna().all()


def test_overture_certificate_fallbacks():
    """Expired/untrusted certificate on the catalog server -> certifi retry -> S3 fallback.

    Uses the real overturemaps code; only the network call (urlopen) is faked."""
    import io
    import ssl
    import urllib.error
    import pyarrow.fs as pafs
    from overturemaps import core

    catalog = json.dumps({"latest": "2026-10-22.0", "links": [
        {"rel": "child", "href": "./2026-10-22.0/catalog.json"}]}).encode()
    expired = urllib.error.URLError(ssl.SSLCertVerificationError(
        1, "[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: certificate has expired"))

    def local_store_outdated(url, *a, context=None, **k):    # works only with certifi's bundle
        if context is None:
            raise expired
        assert isinstance(context, ssl.SSLContext)
        return io.BytesIO(catalog)

    def server_cert_expired(url, *a, **k):                    # fails whatever we trust
        raise expired

    def healthy(url, *a, **k):
        return io.BytesIO(catalog)

    calls = []
    saved = core.urlopen, core.record_batch_reader, vl.latest_release_from_s3
    core.record_batch_reader = lambda t, bbox=None, release=None, stac=False, **k: calls.append((release, stac))
    vl.latest_release_from_s3 = lambda: "2026-10-22.0"
    try:
        for fake, want_stac, want_wrapped in [(healthy, True, False),
                                              (local_store_outdated, True, True),
                                              (server_cert_expired, False, False)]:
            core.urlopen, core._cached_stac_catalog = fake, None
            vl._overture_state.clear()
            calls.clear()
            g = vl.fetch_overture("building", (0, 0, 1, 1))
            assert g is not None and g.empty, fake.__name__
            assert calls == [("2026-10-22.0", want_stac)], (fake.__name__, calls)
            assert getattr(core.urlopen, "_certifi", False) == want_wrapped, fake.__name__
            vl.fetch_overture("place", (0, 0, 1, 1))          # resolved once, reused
            assert calls[-1] == ("2026-10-22.0", want_stac)
    finally:
        core.urlopen, core.record_batch_reader, vl.latest_release_from_s3 = saved
        core._cached_stac_catalog = None
        vl._overture_state.clear()

    # picking the newest release from an S3 listing
    class FakeS3:
        def get_file_info(self, selector):
            base = selector.base_dir
            D, F = pafs.FileType.Directory, pafs.FileType.File
            return [pafs.FileInfo(f"{base}/{n}", type=t) for n, t in
                    [("2026-09-24.0", D), ("2026-10-22.2", D), ("2026-10-22.10", D),
                     ("2023-04-02-alpha", D), ("2027-01-01.0.tmp", D), ("2026-12-01.0", F)]]
    assert vl.latest_release_from_s3(FakeS3()) == "2026-10-22.10"


if __name__ == "__main__":
    test_overture_certificate_fallbacks(); print("Overture certificate fallbacks ok")
    test_label_rules(); print("label rules ok")
    test_parse_location(); print("location parsing ok")
    test_google_open_buildings_csv(); print("Google Open Buildings CSV ok")
    test_circle_includes_hamlet(); print("circle extent ok")
    r, out = test_full_pipeline_settlement(Path("example_output"))
    print("full pipeline ok ->", out)
