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

## Batch C, D and E, first pass (2026-10-31)

**Done**
- Growth and money tab: years 1 to 5 with a widening band; appliance path; sizing for P50, P70 or P90 demand in year 1, 3 or 5; brownout and oversize risk; break-even tariff at each point; household bill against the $5 to $20 now spent.
- Validation tab: how metered validation would work (held-out sites, P50 error, P10 to P90 coverage, baseline), a held-out check of building classes on OSM-tagged villages (building now), and a public sanity check: OpenStreetMap's 85 kWp Gbamu Gbamu plant sits inside GridSight's 72 to 140 kWp range from roofs alone.
- Data sharing tab: monthly site totals, small-group suppression, neutral data trust, federated learning option, give-to-get, data law.
- PITCH.md (3 minutes) and IMPACT.md (one page).
- Model calibration: homes-only load factor now about 20% (brief says about 22%); sample sites land at 17 to 22 kWh per customer per month, inside the 5 to 35 benchmark.

**Decisions for Sai**
- The P10 to P90 range is about 2x on every site. Without meter data we cannot show it covers 8 in 10 sites; IMPACT.md says so. OK to present it this way?
- Cost benchmarks (solar $900/kWp, battery $400/kWh, $350 per connection, 10% cost of money) are rough guides. Break-even tariffs come out around $0.50 to $0.60 per kWh without subsidy. Want different numbers?
