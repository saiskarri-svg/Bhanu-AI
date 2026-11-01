# Kesho AI: one-page impact estimate

**What it is.** An open tool that turns satellite building footprints, ten years of weather and published meter data into a five-year mini-grid demand forecast with ranges (P10, P50, P90), the drivers a lender can review, and the brownout, idle-capacity and tariff risk of each system size, checked against real weather. Map, data pipeline and dashboard by Sai; demand engine and clear-sky solar model by Fereshteh. Prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

All figures are rough guides. Sources: [1] ESMAP / World Bank, *Mini Grids for Half a Billion People* (2022), as cited in the brief; [2] Peters, Sievert and Toman, *Energy Policy* (2019); [3] Antonanzas-Torres et al., *Energies* (2021), 2020 data; data sources and engine inputs are listed on the Method tab and in `forecast/assumptions.yaml`. *Assumption* marks our own estimates.

## The problem

- About 217,000 mini-grids for 490 million people, costing about $127 billion, are needed for universal access by 2030; at the current pace only about 44,800 get built [1].
- Measured demand runs 5 to 35 kWh per customer a month [1], and projections are often overstated, especially for productive use [2]. Errors either way break the economics.

## Six villages in six countries

| Village | Roofs (Google sees) | Year 1, kWh/day | Year 5, kWh/day | Sun, kWh per kWp a day | P50 system (year 5) | Demand missed in 10 real weather years | Covers cost at $0.85/kWh |
|---|---|---|---|---|---|---|---|
| Gbamu Gbamu, Nigeria | 1,346 (91%) | 124 (83 to 184) | 595 (411 to 879) | 3.5 | 230 kWp, 403 kWh | 4.4% | 73% |
| Bulongwa, Tanzania | 833 (69%) | 64 (45 to 94) | 282 (194 to 419) | 4.1 | 88 kWp, 186 kWh | 3.1% | 87% |
| Talek, Kenya | 799 (51%) | 79 (53 to 114) | 290 (202 to 418) | 4.7 | 74 kWp, 191 kWh | 3.3% | 94% |
| Kychom, Sierra Leone | 582 (81%) | 58 (40 to 83) | 240 (171 to 350) | 3.8 | 83 kWp, 163 kWh | 5.0% | 82% |
| Kitobo, Uganda | 430 (90%) | 29 (19 to 44) | 136 (92 to 209) | 4.0 | 42 kWp, 117 kWh | 4.4% | 76% |
| Benichab, Mauritania | 340 (57%) | 33 (22 to 50) | 154 (104 to 228) | 4.5 | 49 kWp, 105 kWh | 2.3% | 86% |

How the numbers are built: roofs from Google, Microsoft and OpenStreetMap merged by Overture, with homes built since added at household growth; demand pulled toward published metered sites within 1,000 miles where there are any; solar output from 10 years of NASA POWER weather (clouds, heat, dust on panels) and Fereshteh's clear-sky model at each village's altitude; climate models (five CMIP6, SSP2-4.5) change solar output by only about -2% to +2% for 2027 to 2036.

## What holds everywhere

- **Build in stages.** A system sized for median year-5 demand has about a 30% chance of brownouts by year 5 yet a 94 to 96% chance of being under 60% used in year 2. At Gbamu Gbamu, year-2 demand needs about 84 kWp; the plant actually built there is 85 kWp.
- **Count households first.** "Buildings per household" explains 30 to 40% of the uncertainty everywhere, and two open sources disagree: roof counts give 1.7 to 4.2 times the households of Meta's population map at five of six villages (Kychom goes the other way). One day of counting on the ground settles it.
- **Weather is a sizing input, not a footnote.** Gbamu Gbamu has 90 cloudy, 131 rainy and 143 dusty or hazy days a year; Benichab loses 10% to heat and 6% to dust. Sizing on the yearly average instead of the dull season saves 2 to 13% of the build cost but misses up to 18% of demand in the worst month.
- **Tariff decides survival.** At $0.45/kWh no village covers its 2021-price costs; at $0.85, which matches Sierra Leone's 90-grid programme [3], they do in 73 to 94% of futures, for a household bill of about $5 to $8 a month, inside the $5 to $20 families spend today on kerosene, candles and batteries [1].

## Impact estimate (illustrative, to be validated)

- **Less idle capital.** Building the first stage for year-2 to year-3 demand instead of year 5 roughly halves the early generation build (at Gbamu Gbamu about 84 to 132 kWp against 230 kWp) (*assumption*: later expansion costs about the same per kWp).
- **Fewer failed sites.** Brownout and idle odds before building, checked against real weather, let lenders price risk on evidence and show funders the tariff gap or grant each site needs.
- **At scale.** If staging and better sizing saved even 10% of generation capital on 10% of the $127 billion pipeline [1], that is on the order of $1 billion for more connections (*assumption-driven; order of magnitude only*).
- **Cost to run.** Minutes per site on a laptop with open data, against field surveys that take days (*assumption*).

## Against the judging criteria

- **Impact (25%):** the engine's validate command scores P50 error, P10 to P90 coverage and pinball loss on held-out metered sites with leave-one-out calibration. Public checks today: building classes on 2,225 tagged buildings in 84 held-out villages (weak on shops, schools and clinics, shown that way); a real 85 kWp plant at Gbamu Gbamu matches year-2 demand; forecasts pulled toward metered sites within 1,000 miles.
- **Innovation (25%):** footprints from three sources plus recent Sentinel-2 pictures; measured connection and appliance curves; tariff feedback; lumpy productive use; ten real weather years and climate-model outlooks driving sizing; a second, independent household count; hourly solar against hourly demand for each month.
- **Sustainability (25%):** open data only (Open Buildings, OpenStreetMap, Sentinel-2, NASA POWER, CMIP6, Meta HRSL, ESA WorldCover, Copernicus elevation), open code, every input in one editable file with its source, retrainable from shared meter data; staged builds mean less idle hardware.
- **Feasibility (15%):** public inputs only, no logins; a village runs in a few minutes on a laptop.
- **Scalability (10%):** six villages in six countries already; every dataset covers all of Africa.

## What we need next

1. Metered monthly totals from 50 to 200 sites through a data trust; first step, the open Kenya and Nigeria smart-meter dataset (24 mini-grids, 11,942 customers, Zenodo record 22149102).
2. A household count and a short business walk-through in two villages, to settle the biggest driver.
3. Current equipment quotes to replace the 2021 Omorate costs, and a cleaning log to replace the dust-on-panel assumption.
