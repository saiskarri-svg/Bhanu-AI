# GridSight

Mini-grid demand from public data, for the Global Energy Hackathon 2026, Brief 03 ("Predict mini-grid demand before building").

Live prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

## What is here

| Path | What it is |
|---|---|
| `app/` | The dashboard (React, Vite, Tailwind). `npm install`, then `npx vite` |
| `app/components/model.ts` | Building classes, demand range, load profile, drivers, growth, sizing |
| `app/data/*.json` | Five sample villages, real buildings within 1 km |
| `app/data/holdout/` | OSM-tagged buildings from other villages, for the Validation tab |
| `pipeline/gridsight_fetch.py` | Fetch any site: `--lat --lon --radius` to a site file the dashboard can load |
| `pipeline/fetch_samples.sh` | Rebuild the five sample villages |
| `pipeline/holdout_tags.py` | Build the held-out test set |
| `publish.sh` | Build and write `app/dist/page.html` for publishing |
| `PITCH.md`, `IMPACT.md` | 3-minute pitch and one-page impact estimate |
| `REPORT.md`, `CHANGELOG.md` | Build notes and decisions |

## Fetch a new site on a laptop

```
pip install pyarrow shapely s2sphere numpy
cd pipeline
python gridsight_fetch.py --name "My village" --country NG --lat 9.0765 --lon 7.3986 --radius 1000 --out my-village.json
```

Then open the dashboard, Site tab, Load site file. No logins are needed: Google Open Buildings and Overture Maps are public buckets. Optional: pass `--viirs file.tif` with a VIIRS annual nighttime lights GeoTIFF (free login at eogdata.mines.edu).

## Data and licences

- Google Open Buildings v3, CC BY 4.0
- Overture Maps release 2026-10-21.0, including OpenStreetMap data (ODbL)
- Ranges and benchmarks: ESMAP / World Bank (2022), MTF, WHO et al. (2023), AMDA. All energy and money figures are rough guides.
