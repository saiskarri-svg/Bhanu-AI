# GridSight

Mini-grid demand from public data, for the Global Energy Hackathon 2026, Brief 03 ("Predict mini-grid demand before building").

Live prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

## What is here

| Path | What it is |
|---|---|
| `app/` | The dashboard (React, Vite, Tailwind). `npm install`, then `npx vite` |
| `forecast/` | Demand engine by Fereshteh: `demand_forecast.py`, `assumptions.yaml`, tests, Benichab example (see its README) |
| `pipeline/run_engine.py` | Runs the engine on every village into `app/data/engine/` |
| `app/components/model.ts` | Building-level model (second opinion): classes, range, drivers |
| `app/data/*.json` | Six sample villages, real buildings within 1 km |
| `app/data/holdout/` | OSM-tagged buildings from other villages, for the Validation tab |
| `pipeline/gridsight_fetch.py` | Fetch any site: `--lat --lon --radius` to a site file the dashboard can load |
| `pipeline/fetch_samples.sh` | Rebuild the five sample villages |
| `pipeline/holdout_tags.py` | Build the held-out test set |
| `pipeline/weather.py` | 10 years of daily NASA POWER weather and five CMIP6 models per village; solar output with cloud, heat and dust losses |
| `pipeline/satellite.py` | Latest cloud-free Sentinel-2 picture for each village (open data, no login) |
| `pipeline/measured_sites.csv` | Published metered sites used to calibrate villages within 1,000 miles |
| `publish.sh` | Build and write `app/dist/page.html` for publishing |
| `GridSight.html` | The whole dashboard in one file: open it in any browser, works offline, safe to email |
| `PITCH.md`, `IMPACT.md` | 3-minute pitch and one-page impact estimate |
| `REPORT.md`, `CHANGELOG.md` | Build notes and decisions |

## Fetch a new site on a laptop

```
pip install pyarrow shapely s2sphere numpy
cd pipeline
python gridsight_fetch.py --name "My village" --country NG --lat 9.0765 --lon 7.3986 --radius 1000 --out my-village.json
```

Then copy the file into `app/data/`, run `python run_engine.py`, and rebuild; or load it from the Site tab (map and building model only). No logins are needed: Google Open Buildings and Overture Maps are public buckets. Optional: pass `--viirs file.tif` with a VIIRS annual nighttime lights GeoTIFF (free login at eogdata.mines.edu).

## Data and licences

- Google Open Buildings v3, CC BY 4.0
- Overture Maps release 2026-10-21.0, including OpenStreetMap data (ODbL)
- Copernicus Sentinel-2 L2A (free and open; "Contains modified Copernicus Sentinel data 2026")
- Ranges and benchmarks: ESMAP / World Bank (2022), MTF, WHO et al. (2023), AMDA. All energy and money figures are rough guides.
