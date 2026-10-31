# GridSight change log

Newest first. One line per change. Artifact: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

## Site at a glance

- **App:** `app/` (React, Vite, Tailwind; copy of the Site Studio starter). Tabs: Site, Demand, Growth and money, Validation, Data sharing, Method. Light/Dark toggle (follows system, remembered).
- **Data:** `app/data/*.json`, one per sample village (Gbamu Gbamu NG, Kychom SL, Talek KE, Kitobo UG, Bulongwa TZ), 1 km radius, made by `pipeline/gridsight_fetch.py` (`pipeline/fetch_samples.sh` rebuilds all).
- **Model:** `app/components/model.ts` (classification, parameters, Monte Carlo range, drivers, growth, sizing). Sources in `app/components/sources.ts`.
- **Held-out test:** `pipeline/holdout_tags.py` writes `app/data/holdout/tags.json` (OSM-tagged buildings from other villages) for the Validation tab.
- **Pitch kit:** `PITCH.md` (3-minute script), `IMPACT.md` (one-page impact estimate).
- **Publish:** `./publish.sh`, then publish `app/dist/page.html` with the files in `app/dist/assets/`.

## 2026-10-31

- **Batch C, D and E (first pass):** Growth and money tab (5-year growth band, appliance path, sizing for P50/P70/P90 in year 1/3/5, brownout and oversize risk, tariff at each point, tariff against demand curve); Validation tab (scoring plan, held-out class check, Gbamu Gbamu 85 kWp plant inside our 72 to 140 kWp range); Data sharing tab (data trust proposal and monthly site schema); PITCH.md and IMPACT.md. Model: medians as most likely case, peakier evening home load (homes-only load factor about 20%), fewer machines.

- **Batch A+B:** data access check (Open Buildings via GCS and Overture Maps via S3 work; Overpass, OSM tiles, VIIRS, GridFinder, HDX blocked from the cloud box), fetch pipeline, five real villages, Site tab (map, class counts with ranges, building table, data sources), Demand tab (P10/P50/P90 energy, peak, use per customer, load factor, daily profile, who uses the power, drivers), Method tab (steps, input ranges, sources), first publish.
