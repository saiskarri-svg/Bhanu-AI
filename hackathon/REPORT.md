# GridSight build report

Link: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

## Batch A+B (2026-10-31): data, classification, map, demand range, drivers

**Done**
- Data access: Google Open Buildings v3 (public GCS bucket) and Overture Maps (public S3, includes OpenStreetMap buildings, places, roads and power lines) both reachable. Blocked here: Overpass API, OSM tiles, VIIRS (EOG), GridFinder (Zenodo), HDX, healthsites.io. The laptop pipeline uses the same two open sources, so it needs no logins.
- `pipeline/gridsight_fetch.py`: any lat/lon + radius to a site JSON (buildings with lat, lon, area, confidence, OSM tag, nearby place, road distance, crowding, shape; roads; mapped power lines and plants). About a minute per site.
- Five real villages shipped: Gbamu Gbamu (Nigeria, 1,229 buildings), Kychom (Sierra Leone, 470), Talek (Kenya, 404), Kitobo (Uganda, 388), Bulongwa (Tanzania, 578).
- Classification: map tag or nearby place first; otherwise a transparent score (size, shape, road frontage, crowding, market distance) turned into probabilities. Counts are shown as expected values with a range.
- Demand: 1,500 simulated futures, P10/P50/P90 for kWh a month, peak kW, use per customer (against the 5 to 35 kWh benchmark), load factor (against 22% and 40%), daily profile, who uses the power, and a drivers panel for lenders.
- Found by accident: OpenStreetMap maps the Gbamu Gbamu solar plant at 0.085 MW, 330 m from the village point. A public sanity check for the Validation page.

**Decisions for Sai**
- Name "GridSight": keep or change?
- Map is drawn in SVG from coordinates (tiles cannot load inside the artifact). OK, or try a satellite image later on a laptop?
- Night lights are not loaded (EOG needs a free login). The pipeline accepts a VIIRS GeoTIFF with `--viirs`. Worth adding before judging?
- Building class rules are hand-set; with OSM tags for a few villages they could be fitted. Fine for the prototype?
