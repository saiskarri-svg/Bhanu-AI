# Kesho AI: disclosure statement

**Before the event (prior work)**
- Bhanu AI, an earlier solar-for-schools website by a team member (Feb to Oct 2026). Its starter kit (React, Vite and Tailwind app shell, shared UI pieces such as boxes, chart styling and the light/dark theme) was reused as Kesho AI's shell. No Bhanu AI content or models are used.

**Built during the sprint (Oct 30 to Nov 1, 2026; about 35 commits under `hackathon/` from Oct 31)**
- Our teammate's mini-grid demand and solar models (`forecast/`: village_landuse.py, demand_forecast.py, clearsky_pv.py, pv_vs_demand.py), created during the hackathon.
- Data pipeline (`pipeline/`): building footprints merged from three sources, building classes, roads, power lines, Sentinel-2 pictures, 10 years of weather and climate outlooks, hourly solar curves, Meta population counts, land cover, nearby settlements, held-out test set.
- Engine runs for 6 villages in 6 countries, with calibration to metered sites within 1,000 miles and the battery analysis.
- The Kesho AI web app: map with 3D buildings, demand forecast and its drivers, right-sized staged plan, wires and grid-extension costs, shared-plant check, funding routes, 24-month cash flow, 20-year payback, grant solver, concept-note PDF, village comparison, weather and battery checks, validation, data-sharing design, and sources.
- Pitch deck, one-page summary and demo video.

**AI tools**
- Claude (Anthropic), through Claude Code: wrote most of the app and pipeline code, ran the data processing, researched sources and finance programmes, and drafted the documents. The team chose the features, checked the results and supplied the demand toolkit and uploaded material.
- Google Gemini: used for research.

**Open-source code**
- React, Vite, Tailwind CSS, Recharts, three.js, jsPDF; pvlib, NumPy, pandas, PyArrow, rasterio, s2sphere, xarray; Playwright and FFmpeg (demo recording).

**Datasets (all open)**
- Google Open Buildings v3; Overture Maps (including OpenStreetMap and Microsoft ML Buildings); Copernicus Sentinel-2 L2A; Copernicus DEM GLO-30; ESA WorldCover 2021; Meta High Resolution Settlement Layer; NASA POWER; CMIP6 (five models, SSP2-4.5).
- Published figures: ESMAP 2022 and the ESMAP / World Bank mini-grid cost analysis; AMDA Benchmarking Africa's Minigrids 2024; IRENA Renewable Power Generation Costs in 2024; published mini-grid meter studies; OnSSET West Africa 2026; World Bank and RMI line costs; official funding-programme pages. All money figures are labelled rough guides.
