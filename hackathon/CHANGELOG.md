# GridSight change log

Newest first. One line per change. Artifact: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

## Site at a glance

- **App:** `app/` (React, Vite, Tailwind; copy of the Site Studio starter). Tabs: Site, Demand, Method. Light/Dark toggle (follows system, remembered).
- **Data:** `app/data/*.json`, one per sample village (Gbamu Gbamu NG, Kychom SL, Talek KE, Kitobo UG, Bulongwa TZ), 1 km radius, made by `pipeline/gridsight_fetch.py` (`pipeline/fetch_samples.sh` rebuilds all).
- **Model:** `app/components/model.ts` (classification, parameters, Monte Carlo range, drivers, growth, sizing). Sources in `app/components/sources.ts`.
- **Publish:** `./publish.sh`, then publish `app/dist/page.html` with the files in `app/dist/assets/`.

## 2026-10-31

- **Batch A+B:** data access check (Open Buildings via GCS and Overture Maps via S3 work; Overpass, OSM tiles, VIIRS, GridFinder, HDX blocked from the cloud box), fetch pipeline, five real villages, Site tab (map, class counts with ranges, building table, data sources), Demand tab (P10/P50/P90 energy, peak, use per customer, load factor, daily profile, who uses the power, drivers), Method tab (steps, input ranges, sources), first publish.
