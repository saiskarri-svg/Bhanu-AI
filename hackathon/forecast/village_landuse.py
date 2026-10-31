#!/usr/bin/env python3
"""
village_landuse.py
==================

Estimate what share of a village's built-up area is residential housing versus
businesses and services (hospitals & clinics, schools, markets & malls, stores,
restaurants, industrial sites) for any location entered as coordinates, a
Google Maps link, or a place name.

Open data only, no API key:
  * Building footprints: Overture Maps "building" layer, which merges Google
    Open Buildings, Microsoft ML footprints and OpenStreetMap. Alternatively,
    a Google Open Buildings CSV tile you downloaded yourself (--buildings-file).
  * What buildings are used for: Overture "place" points (shops, clinics,
    schools, ...) plus OpenStreetMap amenities, shops, compounds (school
    grounds, hospital compounds, marketplaces) and land-use zones.

Every footprint gets the strongest evidence available, in this order:
  1. its own non-residential tag (e.g. building=school)
  2. a point of interest inside it
  3. its own residential tag (e.g. building=house)
  4. a point of interest within --snap metres
  5. lying inside a mapped compound (school grounds, hospital, market ...)
  6. lying inside a land-use zone (landuse=industrial/commercial/retail)
  7. large footprint with no information -> "unverified large"
  8. otherwise -> residential (default)
The rule used is stored per building, so every number can be audited.

Examples
--------
  python village_landuse.py "9.4034, -0.8424"
  python village_landuse.py "https://www.google.com/maps/@-1.8873,30.6372,17z"
  python village_landuse.py "Kayonza, Rwanda" --radius 1500 --extent circle
  python village_landuse.py "12.65,-8.0" --buildings-file 0fd_buildings.csv.gz
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import math
import re
import ssl
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import Point

log = logging.getLogger("village_landuse")

# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------
CATEGORIES = {
    "residential": "Residential houses",
    "health": "Hospitals & clinics",
    "education": "Schools",
    "market_mall": "Markets & malls",
    "store": "Stores & shops",
    "restaurant": "Restaurants & food",
    "industrial": "Industrial & workshops",
    "other_nonres": "Other non-residential",
    "unverified_large": "Large untagged (unverified)",
}
BUSINESS = ("health", "education", "market_mall", "store", "restaurant", "industrial")

# When several pieces of evidence point at one building, the first listed wins.
PRIORITY = ("health", "education", "market_mall", "industrial", "restaurant",
            "store", "other_nonres", "residential")
RANK = {c: i for i, c in enumerate(PRIORITY)}

GROUP = {**{c: "business" for c in BUSINESS}, "residential": "residential",
         "other_nonres": "other", "unverified_large": "unverified"}

# Colours (validated for colour-vision deficiency as a 3-class set; the
# "unverified" class reuses the neutral and is told apart by hatching).
NEUTRAL, BLUE, ORANGE = "#a3a198", "#2a78d6", "#eb6834"
GROUP_STYLE = {
    "residential": ("Residential", NEUTRAL, None),
    "business": ("Business & services", BLUE, None),
    "other": ("Other non-residential", ORANGE, None),
    "unverified": ("Large untagged (unverified)", NEUTRAL, "////"),
}
INK, INK2, MUTED, GRIDC, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#fcfcfb"

# --------------------------------------------------------------------------
# Tag rules
# --------------------------------------------------------------------------
def _m(cat, *values):
    return dict.fromkeys(values, cat)

# OSM building=* values and Overture building "class" values
BUILDING_VALUE_MAP = {
    **_m("residential", "house", "residential", "hut", "detached", "apartments",
         "semidetached_house", "semi", "terrace", "bungalow", "dormitory",
         "dwelling_house", "cabin", "stilt_house", "ger", "farm", "allotment_house",
         "houseboat", "static_caravan", "trullo",
         # household outbuildings are counted with the homes they belong to
         "outbuilding", "shed", "garage", "garages", "carport", "toilets"),
    **_m("health", "hospital", "clinic"),
    **_m("education", "school", "kindergarten", "college", "university"),
    **_m("market_mall", "marketplace", "mall"),
    **_m("store", "retail", "kiosk", "supermarket", "commercial", "shop", "shops"),
    **_m("industrial", "industrial", "factory", "manufacture", "warehouse"),
    **_m("other_nonres", "church", "mosque", "chapel", "cathedral", "temple",
         "synagogue", "shrine", "wayside_shrine", "monastery", "presbytery",
         "religious", "public", "civic", "government", "office", "hotel",
         "post_office", "fire_station", "library", "train_station", "transportation",
         "sports_centre", "sports_hall", "stadium", "grandstand", "pavilion",
         "military", "bunker", "guardhouse", "hangar", "parking", "service",
         "transformer_tower", "agricultural", "barn", "cowshed", "stable", "sty",
         "greenhouse", "glasshouse", "farm_auxiliary", "silo", "digester",
         "storage_tank", "slurry_tank", "shelter", "roof", "bridge_structure",
         "boathouse", "beach_hut"),
}

# Overture building "subtype" (used when "class" is missing)
SUBTYPE_MAP = {
    "residential": "residential", "outbuilding": "residential",
    "medical": "health", "education": "education",
    "commercial": "store", "industrial": "industrial",
    **_m("other_nonres", "agricultural", "civic", "religious", "service",
         "transportation", "entertainment", "military"),
}

OSM_AMENITY = {
    **_m("health", "hospital", "clinic", "doctors", "dentist", "health_post",
         "nursing_home", "healthcare", "maternity"),
    **_m("education", "school", "kindergarten", "college", "university",
         "training", "language_school", "driving_school", "music_school",
         "prep_school"),
    **_m("market_mall", "marketplace"),
    **_m("restaurant", "restaurant", "cafe", "fast_food", "bar", "pub",
         "food_court", "biergarten", "ice_cream", "canteen", "nightclub"),
    **_m("store", "pharmacy", "fuel"),
    **_m("other_nonres", "place_of_worship", "townhall", "police", "post_office",
         "bank", "community_centre", "library", "fire_station", "courthouse",
         "social_facility", "prison", "bureau_de_change", "arts_centre",
         "cinema", "theatre", "public_building"),
}
OSM_LANDUSE = {"industrial": "industrial", "quarry": "industrial",
               "commercial": "store", "retail": "store"}
OSM_KEYS = ("building", "amenity", "shop", "healthcare", "craft", "office",
            "industrial", "man_made", "tourism", "landuse")


def classify_osm_tags(tags: dict) -> str | None:
    """Map a dict of OSM tags to a category (None if nothing relevant)."""
    cands = []
    b = tags.get("building")
    if b and b != "yes":
        cands.append(BUILDING_VALUE_MAP.get(b))
    a = tags.get("amenity")
    if a:
        cands.append(OSM_AMENITY.get(a))
    hc = tags.get("healthcare")
    if hc and hc not in ("no",):
        cands.append("store" if hc == "pharmacy" else "health")
    s = tags.get("shop")
    if s and s not in ("no", "vacant"):
        cands.append("market_mall" if s in ("mall", "department_store") else "store")
    if tags.get("craft") or tags.get("industrial") or tags.get("man_made") == "works":
        cands.append("industrial")
    if tags.get("office"):
        cands.append("other_nonres")
    if tags.get("tourism") in ("hotel", "guest_house", "hostel", "motel", "chalet"):
        cands.append("other_nonres")
    lu = tags.get("landuse")
    if lu:
        cands.append(OSM_LANDUSE.get(lu))
    cands = [c for c in cands if c]
    return min(cands, key=RANK.get) if cands else None


# Overture place labels (taxonomy / basic_category / legacy categories).
# Underscores are replaced by spaces before matching; first matching rule wins.
_PLACE_RULES = [
    ("restaurant", r"\b(coffee|tea|juice|bubble tea) shop\b"),
    ("store", r"(\b(store|shop)$)|\b(supermarket|hypermarket|pharmacy|drugstore|"
              r"chemist|gas station|petrol station|fuel station|convenience)\b"),
    ("market_mall", r"\b(market|marketplace|bazaar|souk|mall|shopping (center|centre))\b"),
    ("health", r"\b(hospital|clinic|health|healthcare|medical|maternity|doctor|"
               r"dentist|dental|physician|nursing|midwife)\b"),
    ("education", r"\b(school|college|university|kindergarten|preschool|education|"
                  r"academy|tutoring|training (center|centre))\b"),
    ("restaurant", r"\b(restaurant|eatery|cafe|café|coffee|food|bar|pub|diner|grill|"
                   r"canteen|fast food|takeaway|bistro|bakery|maquis|chop bar|buka)\b"),
    ("industrial", r"\b(factory|manufacturer|manufacturing|industrial|mill|miller|"
                   r"warehouse|workshop|processing|carpenter|carpentry|welding|"
                   r"welder|mechanic|auto repair|machine shop|brick|sawmill)\b"),
    ("store", r"\b(store|shop|shopping|retail|grocery|boutique|kiosk|vendor|dealer|"
              r"supplier|wholesale|salon|barber|tailor|hardware)\b"),
    ("other_nonres", r"\b(church|mosque|temple|religious|worship|government|police|"
                     r"bank|office|hotel|lodge|guest house|community|post office|"
                     r"library|atm|agency|ngo|organization|station)\b"),
]
_PLACE_RULES = [(c, re.compile(p)) for c, p in _PLACE_RULES]


def classify_place_labels(labels) -> str | None:
    """Classify a place from its labels, most specific label first."""
    for lab in labels:
        if not lab:
            continue
        text = str(lab).lower().replace("_", " ").strip()
        for cat, rx in _PLACE_RULES:
            if rx.search(text):
                return cat
    return None


# --------------------------------------------------------------------------
# Config & helpers
# --------------------------------------------------------------------------
@dataclass
class Config:
    radius_m: float = 1000.0          # search radius around the point
    extent: str = "settlement"        # "settlement" (building cluster) or "circle"
    cluster_gap_m: float = 100.0      # buildings closer than this form one settlement
    snap_m: float = 20.0              # max POI -> building distance
    large_untagged_m2: float = 300.0  # untagged footprints this large are flagged (0 = off)
    min_place_confidence: float = 0.5 # Overture place confidence cut-off
    use_overture: bool = True
    use_osm: bool = True
    buildings_file: str | None = None
    min_building_confidence: float | None = None
    overture_release: str | None = None


def _as_list(v):
    if v is None:
        return []
    if isinstance(v, float) and math.isnan(v):
        return []
    if isinstance(v, dict):
        return [v]
    if isinstance(v, (list, tuple, np.ndarray)):
        return list(v)
    return [v]


def _get(d, key):
    return d.get(key) if isinstance(d, dict) else None


def _empty_points(cols=("category", "evidence", "source")):
    return gpd.GeoDataFrame({c: pd.Series(dtype=object) for c in cols},
                            geometry=gpd.GeoSeries([], crs=4326), crs=4326)


_LATLON = re.compile(r"^\s*\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?\s*$")
_GMAPS_AT = re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)")
_GMAPS_Q = re.compile(r"[?&](?:q|query|ll)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)")


def parse_location(text: str) -> tuple[float, float, str]:
    """'lat, lon', a Google Maps URL, or a place name -> (lat, lon, label)."""
    for rx in (_LATLON, _GMAPS_AT, _GMAPS_Q):
        m = rx.search(text)
        if m:
            lat, lon = float(m.group(1)), float(m.group(2))
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError(f"Coordinates out of range: {lat}, {lon} (expected 'lat, lon')")
            return lat, lon, f"{lat:.5f}, {lon:.5f}"
    import osmnx as ox
    lat, lon = ox.geocode(text)
    return float(lat), float(lon), text.strip()


def bbox_around(lat, lon, radius_m):
    dlat = radius_m / 111_320.0
    dlon = radius_m / (111_320.0 * max(math.cos(math.radians(lat)), 1e-6))
    return (lon - dlon, lat - dlat, lon + dlon, lat + dlat)


def slugify(text):
    s = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return (s or "location")[:48]


# --------------------------------------------------------------------------
# Fetching raw data
# --------------------------------------------------------------------------
_RELEASE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})\.(\d+)")
_overture_state: dict = {}   # resolved once per run: {requested release: (release, use_stac)}


def latest_release_from_s3(filesystem=None) -> str:
    """Newest Overture release, found by listing the public S3 bucket (no catalog server needed)."""
    import pyarrow.fs as pafs
    s3 = filesystem or pafs.S3FileSystem(anonymous=True, region="us-west-2")
    infos = s3.get_file_info(pafs.FileSelector("overturemaps-us-west-2/release", recursive=False))
    found = [(m.group(1), int(m.group(2)), i.base_name) for i in infos
             if i.type == pafs.FileType.Directory and (m := _RELEASE_RE.fullmatch(i.base_name))]
    if not found:
        raise RuntimeError("no Overture releases found on S3")
    return max(found)[2]


def _use_certifi_bundle(core) -> bool:
    """Make overturemaps' HTTPS calls verify against certifi's up-to-date CA bundle.

    Fixes 'certificate has expired' / 'unable to get local issuer certificate' errors
    caused by an outdated certificate store on the local computer. Verification stays on.
    """
    try:
        import certifi
    except ImportError:
        return False
    orig = getattr(core, "urlopen", None)
    if orig is None or getattr(orig, "_certifi", False):
        return False
    ctx = ssl.create_default_context(cafile=certifi.where())

    def urlopen_certifi(url, *args, **kwargs):
        kwargs.setdefault("context", ctx)
        return orig(url, *args, **kwargs)

    urlopen_certifi._certifi = True
    urlopen_certifi._orig = orig
    core.urlopen = urlopen_certifi
    return True


def overture_release(core, release=None):
    """Return (release, use_stac). Tries, in order:
    1. Overture's catalog server as normal,
    2. the same with certifi's certificate bundle (fixes outdated local certificates),
    3. listing releases straight from Overture's S3 bucket (works even if the catalog
       server itself is down or has an expired certificate; downloads are slower)."""
    key = release or "latest"
    if key in _overture_state:
        return _overture_state[key]
    first_error = None
    for attempt in ("default", "certifi"):
        if attempt == "certifi" and not _use_certifi_bundle(core):
            break
        try:
            latest = core.get_latest_release()
            if attempt == "certifi":
                log.info("Overture catalog reached using certifi's certificate bundle "
                         "(your system's certificates look outdated).")
            _overture_state[key] = (release or latest, True)
            return _overture_state[key]
        except Exception as e:
            first_error = first_error or e
            if attempt == "certifi":
                core.urlopen = core.urlopen._orig
    log.warning("Can't reach Overture's catalog server (%s).\n  -> Reading straight from Overture's "
                "S3 bucket instead. The first download for a place can take several minutes; "
                "re-runs use the local cache.", first_error)
    _overture_state[key] = (release or latest_release_from_s3(), False)
    log.info("Using Overture release %s", _overture_state[key][0])
    return _overture_state[key]


def fetch_overture(overture_type: str, bbox, release=None):
    """Download one Overture layer for a bbox. Returns GeoDataFrame or None."""
    try:
        from overturemaps import core
    except ImportError:
        log.warning("overturemaps not installed: pip install overturemaps")
        return None
    try:
        rel, use_stac = overture_release(core, release)
    except Exception as e:
        log.warning("Overture unavailable (could not find a data release): %s", e)
        return None
    try:
        if not use_stac:
            log.info("Overture %s: scanning release %s on S3...", overture_type, rel)
        reader = core.record_batch_reader(overture_type, bbox=bbox, release=rel, stac=use_stac)
        if reader is None:
            log.info("Overture %s: no data in this area", overture_type)
            return gpd.GeoDataFrame(geometry=gpd.GeoSeries([], crs=4326))
        gdf = gpd.GeoDataFrame.from_arrow(reader)
        if gdf.crs is None:
            gdf = gdf.set_crs(4326)
        log.info("Overture %s: %d features", overture_type, len(gdf))
        return gdf
    except Exception as e:  # network, S3, schema problems
        log.warning("Overture %s download failed: %s", overture_type, e)
        return None


def fetch_osm(lat, lon, dist, tags):
    """Download OSM features around a point via osmnx. Returns GeoDataFrame or None."""
    try:
        import osmnx as ox
    except ImportError:
        log.warning("osmnx not installed: pip install osmnx")
        return None
    ox.settings.requests_timeout = 180
    try:
        gdf = ox.features_from_point((lat, lon), tags=tags, dist=dist)
    except Exception as e:
        if "InsufficientResponse" in type(e).__name__:
            log.info("OpenStreetMap: nothing mapped for %s here", list(tags))
            return gpd.GeoDataFrame(geometry=gpd.GeoSeries([], crs=4326))
        log.warning("OpenStreetMap download failed: %s", e)
        return None
    log.info("OpenStreetMap %s: %d features", list(tags)[:3], len(gdf))
    return gdf.reset_index()


def load_buildings_file(path, bbox, min_conf=None):
    """Read footprints from a file: Google Open Buildings CSV(.gz), GeoParquet, GeoJSON, GPKG..."""
    p = Path(path)
    name = p.name.lower()
    if name.endswith((".csv", ".csv.gz")):
        parts = []
        for ch in pd.read_csv(p, chunksize=500_000):
            if {"latitude", "longitude"} <= set(ch.columns):
                ch = ch[ch.longitude.between(bbox[0], bbox[2]) & ch.latitude.between(bbox[1], bbox[3])]
            parts.append(ch)
        df = pd.concat(parts, ignore_index=True)
        geom_col = "geometry" if "geometry" in df.columns else "wkt"
        gdf = gpd.GeoDataFrame(df.drop(columns=[geom_col]),
                               geometry=gpd.GeoSeries.from_wkt(df[geom_col]), crs=4326)
    elif name.endswith((".parquet", ".geoparquet")):
        try:
            gdf = gpd.read_parquet(p, bbox=bbox)
        except Exception:
            gdf = gpd.read_parquet(p)
    else:
        gdf = gpd.read_file(p, bbox=bbox)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    gdf = gdf.to_crs(4326).cx[bbox[0]:bbox[2], bbox[1]:bbox[3]]
    if min_conf is not None and "confidence" in gdf.columns:
        gdf = gdf[gdf["confidence"] >= min_conf]
    google_like = {"area_in_meters", "full_plus_code"} & set(gdf.columns)
    gdf = gdf.copy()
    gdf["_source"] = "Google Open Buildings" if google_like else p.name
    log.info("Buildings file %s: %d footprints in area", p.name, len(gdf))
    return gdf


# --------------------------------------------------------------------------
# Standardising each source to a common shape
#   buildings: geometry, tag_category, tag_value, source
#   pois:      geometry (point), category, evidence, source
#   sites:     geometry (polygon), category, evidence, source, kind ("site"|"zone")
# --------------------------------------------------------------------------
def _polygons_only(gdf):
    if gdf is None or gdf.empty:
        return gdf
    gdf = gdf[gdf.geometry.notna()].copy()
    gdf["geometry"] = gdf.geometry.make_valid()
    return gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]


def std_overture_buildings(gdf):
    gdf = _polygons_only(gdf)
    cls = gdf["class"] if "class" in gdf.columns else pd.Series(None, index=gdf.index)
    sub = gdf["subtype"] if "subtype" in gdf.columns else pd.Series(None, index=gdf.index)
    src = (gdf["sources"].map(lambda v: next((_get(s, "dataset") for s in _as_list(v)
                                               if _get(s, "dataset")), "Overture"))
           if "sources" in gdf.columns else pd.Series("Overture", index=gdf.index))
    tag_cat, tag_val = [], []
    for c, s in zip(cls, sub):
        c = c if isinstance(c, str) else None
        s = s if isinstance(s, str) else None
        if c and BUILDING_VALUE_MAP.get(c):
            tag_cat.append(BUILDING_VALUE_MAP[c]); tag_val.append(f"class={c}")
        elif s and SUBTYPE_MAP.get(s):
            tag_cat.append(SUBTYPE_MAP[s]); tag_val.append(f"subtype={s}")
        else:
            tag_cat.append(None); tag_val.append(None)
    return gpd.GeoDataFrame({"tag_category": tag_cat, "tag_value": tag_val,
                             "source": src.values}, geometry=gdf.geometry.values, crs=gdf.crs)


def std_osm_buildings(gdf):
    gdf = _polygons_only(gdf)
    cats, vals = [], []
    for _, row in gdf.iterrows():
        tags = {k: row[k] for k in OSM_KEYS if k in gdf.columns and isinstance(row[k], str)}
        c = classify_osm_tags(tags)
        cats.append(c)
        vals.append("; ".join(f"{k}={v}" for k, v in tags.items() if k != "building" or v != "yes") or None)
    return gpd.GeoDataFrame({"tag_category": cats, "tag_value": vals, "source": "OpenStreetMap"},
                            geometry=gdf.geometry.values, crs=gdf.crs)


def std_file_buildings(gdf):
    gdf = _polygons_only(gdf)
    if "building" in gdf.columns:  # e.g. an OSM extract
        b = std_osm_buildings(gdf)
        b["source"] = gdf["_source"].values
        return b
    return gpd.GeoDataFrame({"tag_category": None, "tag_value": None, "source": gdf["_source"].values},
                            geometry=gdf.geometry.values, crs=gdf.crs)


def std_overture_places(gdf, min_conf=0.5):
    if gdf is None or gdf.empty:
        return _empty_points()
    rows = []
    for _, r in gdf.iterrows():
        conf = r.get("confidence")
        if conf is not None and not (isinstance(conf, float) and math.isnan(conf)) and conf < min_conf:
            continue
        tax = r.get("taxonomy")
        legacy = r.get("categories")
        # basic_category first: it is Overture's plain label (e.g. 'casual_eatery'),
        # while taxonomy.primary can be very specific (e.g. 'gas_station_sushi').
        basic = r.get("basic_category")
        labels = [basic if isinstance(basic, str) else None, _get(tax, "primary"), _get(legacy, "primary")]
        labels += list(reversed([h for h in _as_list(_get(tax, "hierarchy")) if isinstance(h, str)]))
        cat = classify_place_labels(labels)
        if not cat:
            continue
        name = _get(r.get("names"), "primary")
        shown = next((l for l in labels if l), "?")
        ev = f"place: {shown}" + (f" '{name}'" if name else "")
        geom = r.geometry if r.geometry.geom_type == "Point" else r.geometry.representative_point()
        rows.append({"category": cat, "evidence": ev, "source": "Overture places", "geometry": geom})
    if not rows:
        return _empty_points()
    return gpd.GeoDataFrame(rows, geometry="geometry", crs=gdf.crs)


def std_osm_features(gdf):
    """OSM features -> (pois, sites)."""
    if gdf is None or gdf.empty:
        return _empty_points(), _empty_points(("category", "evidence", "source", "kind"))
    pois, sites = [], []
    for _, r in gdf.iterrows():
        tags = {k: r[k] for k in OSM_KEYS if k in gdf.columns and isinstance(r[k], str)}
        cat = classify_osm_tags(tags)
        if not cat or r.geometry is None or r.geometry.is_empty:
            continue
        name = r["name"] if "name" in gdf.columns and isinstance(r["name"], str) else None
        ev = "OSM " + "; ".join(f"{k}={v}" for k, v in tags.items()) + (f" '{name}'" if name else "")
        g = r.geometry
        if g.geom_type in ("Polygon", "MultiPolygon"):
            kind = "zone" if set(tags) <= {"landuse"} else "site"
            sites.append({"category": cat, "evidence": ev, "source": "OpenStreetMap", "kind": kind,
                          "geometry": shapely.make_valid(g)})
        else:
            pois.append({"category": cat, "evidence": ev, "source": "OpenStreetMap",
                         "geometry": g if g.geom_type == "Point" else g.representative_point()})
    P = gpd.GeoDataFrame(pois, geometry="geometry", crs=gdf.crs) if pois else _empty_points()
    S = (gpd.GeoDataFrame(sites, geometry="geometry", crs=gdf.crs) if sites
         else _empty_points(("category", "evidence", "source", "kind")))
    return P, S


def gather_data(lat, lon, cfg: Config, cache_dir: Path | None = None, refresh=False):
    """Fetch + standardise all sources. Cached as GeoParquet so re-runs work offline."""
    key = hashlib.md5(json.dumps([round(lat, 5), round(lon, 5), cfg.radius_m, cfg.use_overture,
                                  cfg.use_osm, cfg.buildings_file, cfg.min_building_confidence,
                                  cfg.min_place_confidence]).encode()).hexdigest()[:10]
    cdir = cache_dir / key if cache_dir else None
    if cdir and not refresh and (cdir / "buildings.parquet").exists():
        log.info("Using cached data in %s (use --refresh to download again)", cdir)
        return tuple(gpd.read_parquet(cdir / f"{n}.parquet") for n in ("buildings", "pois", "sites"))

    bbox = bbox_around(lat, lon, cfg.radius_m * 1.05)
    buildings = None
    pois, sites = [_empty_points()], [_empty_points(("category", "evidence", "source", "kind"))]

    if cfg.buildings_file:
        buildings = std_file_buildings(load_buildings_file(cfg.buildings_file, bbox, cfg.min_building_confidence))
    elif cfg.use_overture:
        raw = fetch_overture("building", bbox, cfg.overture_release)
        if raw is not None and not raw.empty:
            buildings = std_overture_buildings(raw)

    if cfg.use_overture:
        rawp = fetch_overture("place", bbox, cfg.overture_release)
        pois.append(std_overture_places(rawp, cfg.min_place_confidence))

    if cfg.use_osm:
        osm_tags = {"amenity": True, "shop": True, "healthcare": True, "craft": True, "office": True,
                    "industrial": True, "man_made": ["works"],
                    "tourism": ["hotel", "guest_house", "hostel", "motel"],
                    "landuse": ["industrial", "commercial", "retail", "quarry"]}
        p, s = std_osm_features(fetch_osm(lat, lon, cfg.radius_m * 1.05, osm_tags))
        pois.append(p); sites.append(s)
        if buildings is None or buildings.empty:
            log.info("No footprints from Overture/file; falling back to OpenStreetMap buildings")
            rawb = fetch_osm(lat, lon, cfg.radius_m * 1.05, {"building": True})
            if rawb is not None and not rawb.empty:
                buildings = std_osm_buildings(rawb)

    if buildings is None or buildings.empty:
        raise RuntimeError("No building footprints found for this location. Check the coordinates "
                           "(lat, lon order), your internet connection, or pass --buildings-file.")
    pois = pd.concat([x for x in pois if len(x)], ignore_index=True) if any(len(x) for x in pois) else pois[0]
    sites = pd.concat([x for x in sites if len(x)], ignore_index=True) if any(len(x) for x in sites) else sites[0]
    pois, sites = gpd.GeoDataFrame(pois, crs=4326), gpd.GeoDataFrame(sites, crs=4326)

    if cdir:
        cdir.mkdir(parents=True, exist_ok=True)
        for n, g in (("buildings", buildings), ("pois", pois), ("sites", sites)):
            g.to_parquet(cdir / f"{n}.parquet")
    return buildings, pois, sites


# --------------------------------------------------------------------------
# Analysis
# --------------------------------------------------------------------------
@dataclass
class Result:
    label: str
    lat: float
    lon: float
    config: Config
    crs: object
    extent: object                      # projected shapely geometry
    buildings: gpd.GeoDataFrame         # projected, classified
    pois: gpd.GeoDataFrame
    sites: gpd.GeoDataFrame
    summary: pd.DataFrame
    headline: dict = field(default_factory=dict)


def settlement_extent(b_proj, center, radius_m, gap_m, sites=None):
    """The settlement at (or nearest to) the point, clipped to the search circle.

    Buildings and mapped compounds (school grounds, market squares, hospital
    compounds) closer than gap_m to each other form one settlement; its outline
    lies gap_m/2 outside them. Land-use zones are left out (they can be huge).
    """
    circle = center.buffer(radius_m, quad_segs=32)
    if b_proj.empty or gap_m <= 0:
        return circle
    geoms = list(b_proj.geometry.values)
    if sites is not None and len(sites):
        geoms += list(sites.loc[sites["kind"] == "site"].geometry.values)
    blob = shapely.union_all(shapely.buffer(np.array(geoms, dtype=object), gap_m / 2, quad_segs=4))
    parts = list(getattr(blob, "geoms", [blob]))
    inside = [p for p in parts if p.contains(center)]
    part = inside[0] if inside else min(parts, key=lambda p: p.distance(center))
    ext = part.intersection(circle)
    return ext if not ext.is_empty else circle


def _best(j, index):
    if j is None or j.empty:
        e = pd.Series(index=index, dtype=object)
        return e, e.copy()
    j = j.assign(_r=j["category"].map(RANK).fillna(99)).sort_values(["bidx", "_r"])
    first = j.drop_duplicates("bidx").set_index("bidx")
    return first["category"].reindex(index), first["evidence"].reindex(index)


def classify_buildings(b, pois, sites, cfg: Config):
    b = b.reset_index(drop=True).copy()
    b["area_m2"] = b.geometry.area
    keys = gpd.GeoDataFrame({"bidx": b.index}, geometry=b.geometry.values, crs=b.crs)
    none = pd.Series(index=b.index, dtype=object)
    inside = snapped = site = zone = (none, none)

    if len(pois):
        p = pois[["category", "evidence", "geometry"]].reset_index(drop=True)
        p["pid"] = p.index
        j = gpd.sjoin(p, keys, how="inner", predicate="within")
        inside = _best(j, b.index)
        rest = p[~p["pid"].isin(j["pid"])]
        if len(rest) and cfg.snap_m > 0:
            k = gpd.sjoin_nearest(rest, keys, how="inner", max_distance=cfg.snap_m, distance_col="dist_m")
            k = k.sort_values("dist_m").drop_duplicates("pid")
            snapped = _best(k, b.index)

    if len(sites):
        rp = gpd.GeoDataFrame({"bidx": b.index}, geometry=b.geometry.representative_point().values, crs=b.crs)
        s = sites[["category", "evidence", "kind", "geometry"]].reset_index(drop=True)
        j = gpd.sjoin(rp, s, how="inner", predicate="within")
        site = _best(j[j["kind"] == "site"], b.index)
        zone = _best(j[j["kind"] == "zone"], b.index)

    cat, ev, method = none.copy(), none.copy(), none.copy()

    def take(c, e, m):
        mask = cat.isna() & c.notna()
        cat[mask] = c[mask]
        ev[mask] = e[mask]
        method[mask] = m

    tag_c, tag_e = b["tag_category"].astype(object), b["tag_value"].astype(object)
    take(tag_c.where(tag_c != "residential"), tag_e, "own tag")
    take(*inside, "POI inside building")
    take(tag_c.where(tag_c == "residential"), tag_e, "own tag")
    take(*snapped, f"POI within {cfg.snap_m:g} m")
    take(*site, "inside mapped compound")
    take(*zone, "inside land-use zone")
    if cfg.large_untagged_m2 and cfg.large_untagged_m2 > 0:
        big = pd.Series("unverified_large", index=b.index, dtype=object).where(b["area_m2"] >= cfg.large_untagged_m2)
        take(big, pd.Series(f"footprint >= {cfg.large_untagged_m2:g} m2, no use information",
                            index=b.index, dtype=object), "size rule")
    take(pd.Series("residential", index=b.index, dtype=object),
         pd.Series("no use information", index=b.index, dtype=object), "default")

    b["category"], b["method"], b["evidence"] = cat, method, ev
    b["group"] = b["category"].map(GROUP)
    return b


def analyze(buildings, pois, sites, lat, lon, cfg: Config, label=None) -> Result:
    """Classify footprints and compute area shares. All inputs in EPSG:4326."""
    center_ll = gpd.GeoSeries([Point(lon, lat)], crs=4326)
    crs = center_ll.estimate_utm_crs()
    center = center_ll.to_crs(crs).iloc[0]
    circle = center.buffer(cfg.radius_m, quad_segs=32)

    b = buildings.to_crs(crs)
    b = b[b.geometry.representative_point().within(circle)]
    if b.empty:
        raise RuntimeError(f"No buildings within {cfg.radius_m:g} m of {lat:.5f}, {lon:.5f}. "
                           "Try a larger --radius or check the lat/lon order.")
    P = pois.to_crs(crs) if len(pois) else pois
    S = sites.to_crs(crs) if len(sites) else sites
    extent = (settlement_extent(b, center, cfg.radius_m, cfg.cluster_gap_m, S)
              if cfg.extent == "settlement" else circle)
    b = b[b.geometry.representative_point().within(extent)]
    b = classify_buildings(b, P, S, cfg)

    if len(P):
        P = P[P.geometry.within(extent.buffer(cfg.snap_m))]
    if len(S):
        S = S[S.geometry.intersects(extent)].copy()

    extent_area = extent.area
    built = b["area_m2"].sum()
    rows = []
    for c, lab in CATEGORIES.items():
        sel = b["category"] == c
        fp = float(b.loc[sel, "area_m2"].sum())
        site_area = 0.0
        if len(S) and c in set(S["category"]):
            site_area = shapely.union_all(S.loc[S["category"] == c].geometry.values).intersection(extent).area
        rows.append({"category": c, "label": lab, "group": GROUP[c], "buildings": int(sel.sum()),
                     "footprint_m2": round(fp, 1),
                     "pct_of_built_area": round(100 * fp / built, 2) if built else 0.0,
                     "pct_of_extent_area": round(100 * fp / extent_area, 3),
                     "site_area_m2": round(site_area, 1),
                     "site_pct_of_extent_area": round(100 * site_area / extent_area, 3)})
    summary = pd.DataFrame(rows)

    g = summary.groupby("group")["pct_of_built_area"].sum()
    evid = ~b["method"].isin(["default", "size rule"])
    by_src = b.groupby("source")["area_m2"].sum().sort_values(ascending=False)
    res = b.loc[b["category"] == "residential", "area_m2"]
    headline = {
        "location": label or f"{lat:.5f}, {lon:.5f}",
        "lat": lat, "lon": lon, "extent_mode": cfg.extent,
        "extent_area_m2": round(extent_area, 1),
        "n_buildings": int(len(b)),
        "built_area_m2": round(float(built), 1),
        "built_density_pct": round(100 * built / extent_area, 2),
        "pct_residential": round(float(g.get("residential", 0)), 2),
        "pct_business_services": round(float(g.get("business", 0)), 2),
        "pct_other_nonres": round(float(g.get("other", 0)), 2),
        "pct_unverified_large": round(float(g.get("unverified", 0)), 2),
        "pct_buildings_with_use_evidence": round(100 * evid.mean(), 1),
        "pct_area_with_use_evidence": round(100 * b.loc[evid, "area_m2"].sum() / built, 1) if built else 0,
        "footprint_sources_pct": {k: round(100 * v / built, 1) for k, v in by_src.items()},
        "median_house_footprint_m2": round(float(res.median()), 1) if len(res) else None,
        "n_points_of_interest": int(len(P)), "n_mapped_sites": int(len(S)),
        "method_counts": b["method"].value_counts().to_dict(),
    }
    return Result(label or headline["location"], lat, lon, cfg, crs, extent, b, P, S, summary, headline)


# --------------------------------------------------------------------------
# Outputs
# --------------------------------------------------------------------------
def format_report(r: Result) -> str:
    h = r.headline
    t = r.summary.copy()
    lines = [
        f"\nLand use by building footprint: {h['location']}  ({r.lat:.5f}, {r.lon:.5f})",
        f"Area analysed ({h['extent_mode']}): {h['extent_area_m2'] / 1e6:.3f} km2 | "
        f"buildings: {h['n_buildings']} | built-up footprint: {h['built_area_m2']:,.0f} m2 "
        f"({h['built_density_pct']:.1f}% of area)\n",
        f"{'Category':<30}{'Bldgs':>7}{'Footprint m2':>14}{'% built':>9}{'% area':>8}{'Site m2':>11}",
    ]
    for _, x in t.iterrows():
        lines.append(f"{x.label:<30}{x.buildings:>7}{x.footprint_m2:>14,.0f}{x.pct_of_built_area:>9.1f}"
                     f"{x.pct_of_extent_area:>8.2f}{(f'{x.site_area_m2:,.0f}' if x.site_area_m2 else '-'):>11}")
    lines += [
        "",
        f"Residential {h['pct_residential']:.1f}% | Business & services {h['pct_business_services']:.1f}% | "
        f"Other non-residential {h['pct_other_nonres']:.1f}% | Unverified large {h['pct_unverified_large']:.1f}%",
        f"Use evidence: {h['pct_buildings_with_use_evidence']:.0f}% of buildings "
        f"({h['pct_area_with_use_evidence']:.0f}% of footprint area); the rest default to residential.",
        "Footprint sources: " + ", ".join(f"{k} {v:.0f}%" for k, v in h["footprint_sources_pct"].items()),
    ]
    if h["pct_buildings_with_use_evidence"] < 30:
        lines.append("NOTE: few buildings carry use information here, so the business share is a lower bound. "
                     "Check the HTML map against satellite imagery.")
    return "\n".join(lines)


def plot_map(r: Result, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    b, h = r.buildings, r.headline
    fig = plt.figure(figsize=(14, 7.6), facecolor=SURFACE)
    ax = fig.add_axes([0.02, 0.15, 0.56, 0.72])
    bx = fig.add_axes([0.71, 0.18, 0.26, 0.62])
    for a in (ax, bx):
        a.set_facecolor(SURFACE)

    # ---- map
    gpd.GeoSeries([r.extent], crs=r.crs).boundary.plot(ax=ax, color=MUTED, linewidth=1)
    if len(r.sites):
        r.sites.boundary.plot(ax=ax, color=INK2, linewidth=0.8, linestyle=(0, (3, 2)))
    for grp in ("residential", "business", "other", "unverified"):
        sub = b[b["group"] == grp]
        if sub.empty:
            continue
        _, color, hatch = GROUP_STYLE[grp]
        sub.plot(ax=ax, color=color, edgecolor=INK2 if grp != "residential" else color,
                 linewidth=0.3, hatch=hatch, zorder=3 if grp != "residential" else 2)
    ax.set_aspect("equal")
    ax.set_axis_off()
    x0, y0, x1, y1 = r.extent.bounds
    pad = 0.04 * max(x1 - x0, y1 - y0)
    ax.set_xlim(x0 - pad, x1 + pad); ax.set_ylim(y0 - pad, y1 + pad)
    # scale bar
    span = x1 - x0
    bar = next((s for s in (2000, 1000, 500, 250, 200, 100, 50, 20) if s <= span / 4), 10)
    sx, sy = x0, y0 - pad * 0.6
    ax.plot([sx, sx + bar], [sy, sy], color=INK, linewidth=2, solid_capstyle="butt")
    ax.text(sx + bar / 2, sy + pad * 0.25, f"{bar} m", ha="center", va="bottom", fontsize=9, color=INK2)
    pct = {"residential": h["pct_residential"], "business": h["pct_business_services"],
           "other": h["pct_other_nonres"], "unverified": h["pct_unverified_large"]}
    handles = [Patch(facecolor=c, edgecolor=INK2 if hatch else c, hatch=hatch, label=f"{n}  {pct[g]:.1f}%")
               for g, (n, c, hatch) in GROUP_STYLE.items() if (b["group"] == g).any()]
    if len(r.sites):
        handles.append(Patch(facecolor="none", edgecolor=INK2, linestyle="--", label="Mapped compound / zone"))
    ax.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, -0.01), ncol=3, frameon=False,
              fontsize=9.5, labelcolor=INK)

    # ---- bars: % of built-up footprint by category (fixed order)
    t = r.summary.iloc[::-1].reset_index(drop=True)
    for i, x in t.iterrows():
        _, color, hatch = GROUP_STYLE[x.group]
        bx.barh(i, x.pct_of_built_area, height=0.62, color=color, hatch=hatch,
                edgecolor=SURFACE if not hatch else INK2, linewidth=0.6 if hatch else 0)
        bx.text(x.pct_of_built_area + 1, i, f"{x.pct_of_built_area:.1f}%", va="center", fontsize=9, color=INK)
    bx.set_yticks(range(len(t)), [f"{l}  ({n})" for l, n in zip(t.label, t.buildings)], fontsize=9.5, color=INK)
    bx.set_xlim(0, max(100, t.pct_of_built_area.max() + 12))
    bx.xaxis.grid(True, color=GRIDC, linewidth=0.6)
    bx.set_axisbelow(True)
    bx.tick_params(axis="x", colors=MUTED, labelsize=8.5, length=0)
    bx.tick_params(axis="y", length=0)
    for s in ("top", "right", "bottom"):
        bx.spines[s].set_visible(False)
    bx.spines["left"].set_color("#c3c2b7")
    bx.set_xlabel("% of built-up footprint area   (building count)", color=INK2, fontsize=9)

    fig.text(0.02, 0.95, f"Land use by building footprint: {h['location']}", fontsize=15,
             color=INK, weight="bold", va="top")
    fig.text(0.02, 0.905,
             f"{h['n_buildings']} buildings, {h['built_area_m2']:,.0f} m² of roofs over "
             f"{h['extent_area_m2'] / 1e6:.2f} km² ({h['extent_mode']}). "
             f"Use evidence for {h['pct_buildings_with_use_evidence']:.0f}% of buildings; "
             "the rest are assumed residential.", fontsize=10, color=INK2, va="top")
    fig.text(0.02, 0.015, "Footprints: " + ", ".join(f"{k} {v:.0f}%" for k, v in h["footprint_sources_pct"].items())
             + ".  Uses: OpenStreetMap, Overture Maps places.", fontsize=8.5, color=MUTED)
    fig.savefig(path, dpi=160, facecolor=SURFACE)
    plt.close(fig)


def html_map(r: Result, path):
    import folium

    m = folium.Map(location=[r.lat, r.lon], zoom_start=16, tiles=None, control_scale=True)
    folium.TileLayer("OpenStreetMap", name="Street map").add_to(m)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Imagery © Esri, Maxar, Earthstar Geographics", name="Satellite", max_zoom=19).add_to(m)

    ext = gpd.GeoSeries([r.extent], crs=r.crs).to_crs(4326)
    folium.GeoJson(ext.__geo_interface__, name="Area analysed",
                   style_function=lambda f: {"color": MUTED, "weight": 2, "fill": False}).add_to(m)

    b = r.buildings.to_crs(4326)
    b = b.assign(use=b["category"].map(CATEGORIES), area=b["area_m2"].round(0),
                 evidence=b["evidence"].fillna(""), rule=b["method"])
    for c, lab in CATEGORIES.items():
        sub = b[b["category"] == c]
        if sub.empty:
            continue
        _, color, hatch = GROUP_STYLE[GROUP[c]]
        fg = folium.FeatureGroup(name=f"{lab} ({len(sub)})")
        folium.GeoJson(
            sub[["use", "area", "rule", "evidence", "source", "geometry"]].__geo_interface__,
            style_function=lambda f, color=color, dashed=bool(hatch): {
                "color": INK2 if dashed else color, "weight": 1.2 if dashed else 0.6,
                "dashArray": "3 3" if dashed else None, "fillColor": color, "fillOpacity": 0.75},
            tooltip=folium.GeoJsonTooltip(fields=["use", "area", "rule", "evidence", "source"],
                                          aliases=["Use", "Footprint m²", "Rule", "Evidence", "Footprint source"]),
        ).add_to(fg)
        fg.add_to(m)

    if len(r.sites):
        s = r.sites.to_crs(4326).assign(use=lambda d: d["category"].map(CATEGORIES))
        fg = folium.FeatureGroup(name=f"Mapped compounds / zones ({len(s)})")
        folium.GeoJson(s[["use", "evidence", "kind", "geometry"]].__geo_interface__,
                       style_function=lambda f: {"color": INK2, "weight": 1.5, "dashArray": "5 4", "fill": False},
                       tooltip=folium.GeoJsonTooltip(fields=["use", "evidence", "kind"])).add_to(fg)
        fg.add_to(m)
    if len(r.pois):
        p = r.pois.to_crs(4326)
        fg = folium.FeatureGroup(name=f"Points of interest ({len(p)})", show=False)
        for _, x in p.iterrows():
            folium.CircleMarker([x.geometry.y, x.geometry.x], radius=4, color=INK, weight=1, fill=True,
                                fill_color="#ffffff", fill_opacity=1,
                                tooltip=f"{CATEGORIES[x.category]}: {x.evidence} [{x.source}]").add_to(fg)
        fg.add_to(m)
    folium.LayerControl(collapsed=False).add_to(m)
    x0, y0, x1, y1 = ext.total_bounds
    m.fit_bounds([[y0, x0], [y1, x1]])

    h = r.headline
    legend = (
        '<div style="position:fixed;bottom:24px;left:12px;z-index:9999;background:#fcfcfb;color:#0b0b0b;'
        'padding:10px 12px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.25);'
        'font:13px system-ui,-apple-system,Segoe UI,sans-serif;max-width:280px">'
        f'<b>{h["location"]}</b><br>% of built-up footprint<br>'
        + "".join(f'<span style="display:inline-block;width:11px;height:11px;background:{c};'
                  f'border:1px {"dashed" if hatch else "solid"} #52514e;margin-right:6px"></span>{n}: '
                  f'<b>{v:.1f}%</b><br>'
                  for (n, c, hatch), v in zip(GROUP_STYLE.values(),
                                              (h["pct_residential"], h["pct_business_services"],
                                               h["pct_other_nonres"], h["pct_unverified_large"])))
        + f'<span style="color:#52514e">{h["n_buildings"]} buildings · use evidence for '
          f'{h["pct_buildings_with_use_evidence"]:.0f}%</span></div>')
    m.get_root().html.add_child(folium.Element(legend))
    m.save(str(path))


def save_outputs(r: Result, out_dir, png=True, html=True):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    slug = slugify(r.label)
    files = {}
    files["summary_csv"] = out / f"{slug}_summary.csv"
    r.summary.to_csv(files["summary_csv"], index=False)
    files["summary_json"] = out / f"{slug}_summary.json"
    files["summary_json"].write_text(json.dumps({"headline": r.headline, "config": asdict(r.config),
                                                 "categories": r.summary.to_dict("records")}, indent=2))
    files["buildings_geojson"] = out / f"{slug}_buildings.geojson"
    r.buildings.drop(columns=["tag_category"]).to_crs(4326).to_file(files["buildings_geojson"], driver="GeoJSON")
    if png:
        files["map_png"] = out / f"{slug}_map.png"
        plot_map(r, files["map_png"])
    if html:
        try:
            files["map_html"] = out / f"{slug}_map.html"
            html_map(r, files["map_html"])
        except ImportError:
            log.warning("folium not installed; skipping the interactive map (pip install folium)")
            files.pop("map_html")
    return files


def run(location: str, cfg: Config, out_dir="results", refresh=False, png=True, html=True) -> Result:
    lat, lon, label = parse_location(location)
    coords = f"{lat:.5f}, {lon:.5f}"
    log.info("Location: %s", coords if label == coords else f"{label} -> {coords}")
    buildings, pois, sites = gather_data(lat, lon, cfg, Path(out_dir) / "cache", refresh)
    r = analyze(buildings, pois, sites, lat, lon, cfg, label)
    print(format_report(r))
    files = save_outputs(r, out_dir, png=png, html=html)
    print("\nSaved:\n" + "\n".join(f"  {p}" for p in files.values()))
    return r


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Percentage of a village's built-up area that is residential vs. business & services.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    ap.add_argument("location", help="'lat, lon' (as copied from Google Maps), a Google Maps URL, or a place name")
    ap.add_argument("--radius", type=float, default=1000, help="search radius in metres")
    ap.add_argument("--extent", choices=["settlement", "circle"], default="settlement",
                    help="'settlement' = the building cluster at the point; 'circle' = the whole radius")
    ap.add_argument("--cluster-gap", type=float, default=100,
                    help="buildings closer than this (m) belong to the same settlement")
    ap.add_argument("--snap", type=float, default=20, help="max distance (m) from a POI to its building")
    ap.add_argument("--large-untagged", type=float, default=300,
                    help="untagged footprints >= this (m2) are reported as 'unverified' (0 = treat as residential)")
    ap.add_argument("--min-place-confidence", type=float, default=0.5, help="Overture place confidence cut-off")
    ap.add_argument("--buildings-file", help="use footprints from this file (e.g. a Google Open Buildings CSV)")
    ap.add_argument("--min-building-confidence", type=float,
                    help="drop footprints below this confidence (files with a 'confidence' column)")
    ap.add_argument("--no-overture", action="store_true", help="do not use Overture Maps")
    ap.add_argument("--no-osm", action="store_true", help="do not use OpenStreetMap")
    ap.add_argument("--release", help="Overture release, e.g. 2026-10-22.0 (default: latest)")
    ap.add_argument("--out", default="results", help="output folder")
    ap.add_argument("--refresh", action="store_true", help="ignore cached downloads")
    ap.add_argument("--no-png", action="store_true")
    ap.add_argument("--no-html", action="store_true")
    ap.add_argument("-q", "--quiet", action="store_true")
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.WARNING if a.quiet else logging.INFO, format="%(message)s")
    cfg = Config(radius_m=a.radius, extent=a.extent, cluster_gap_m=a.cluster_gap, snap_m=a.snap,
                 large_untagged_m2=a.large_untagged, min_place_confidence=a.min_place_confidence,
                 use_overture=not a.no_overture, use_osm=not a.no_osm, buildings_file=a.buildings_file,
                 min_building_confidence=a.min_building_confidence, overture_release=a.release)
    try:
        run(a.location, cfg, a.out, refresh=a.refresh, png=not a.no_png, html=not a.no_html)
    except (RuntimeError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
