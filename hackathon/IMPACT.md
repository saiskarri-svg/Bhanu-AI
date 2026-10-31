# GridSight: one-page impact estimate

**What it is.** An open tool that turns satellite building footprints and map data into a five-year mini-grid demand forecast with ranges (P10, P50, P90), the drivers a lender can review, and the brownout, idle-capacity and tariff risk of each system size. Map, data pipeline and dashboard by Sai; demand engine by Fereshteh. Prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

All figures are rough guides. Sources: [1] ESMAP / World Bank, *Mini Grids for Half a Billion People* (2022), as cited in the brief; [2] Peters, Sievert and Toman, *Energy Policy* (2019); [3] Antonanzas-Torres et al., *Energies* (2021), 2020 data; engine inputs and their sources in `forecast/assumptions.yaml`. *Assumption* marks our own estimates.

## The problem

- About 217,000 mini-grids for 490 million people, costing about $127 billion, are needed for universal access by 2030; at the current pace only about 44,800 get built [1].
- Measured demand runs 5 to 35 kWh per customer a month [1], and projections are often overstated, especially for productive use [2]. Errors either way break the economics.

## What GridSight shows, six villages in six countries

| Village | Homes and outbuildings | Year 1, kWh/day | Year 5, kWh/day | P50 design (year 5) | Brownouts, year 5 | Covers cost at $0.85 |
|---|---|---|---|---|---|---|
| Gbamu Gbamu, Nigeria | 1,219 | 96 (66 to 138) | 448 (317 to 651) | 151 kWp, 305 kWh | 31% | 85% |
| Bulongwa, Tanzania | 557 | 58 (41 to 80) | 230 (168 to 329) | 67 kWp, 145 kWh | 29% | 94% |
| Kychom, Sierra Leone | 459 | 43 (29 to 61) | 181 (126 to 266) | 58 kWp, 123 kWh | 31% | 86% |
| Talek, Kenya | 384 | 42 (31 to 59) | 162 (116 to 236) | 46 kWp, 108 kWh | 29% | 92% |
| Kitobo, Uganda | 387 | 28 (19 to 44) | 139 (94 to 212) | 43 kWp, 96 kWh | 32% | 86% |
| Benichab, Mauritania | 193 | 15 (10 to 23) | 70 (46 to 111) | 18 kWp, 49 kWh | 33% | 89% |

Benichab uses GridSight's 1 km Google Open Buildings map. Fereshteh's settlement map, which combines OSM, Microsoft and Google footprints, finds 320 homes and gives 27 kWh/day in year 1 and 122 by year 5.

Across all six, the same three findings hold:
- **Build in stages.** A system sized for the median year-5 forecast has about a 30% chance of brownouts by year 5, and a 92 to 96% chance of being under 60% used in year 2. Size for years 2 to 3 and add panels and batteries as metered demand shows up.
- **Tariff decides survival.** At $0.45/kWh no village covers its costs with 2021 Omorate equipment prices. At $0.85, which matches Sierra Leone's 90-grid programme [3], it does in 85 to 94% of futures. The household bill is then about $7.60 a month, inside the $5 to $20 families spend today [1].
- **The cheapest field check is a household count.** "Buildings per household" explains about 40% of the uncertainty everywhere.

## Impact estimate (illustrative, to be validated)

- **Less idle capital.** Staging the first build at year-2 to year-3 demand instead of year 5 cuts the up-front generation build. At Gbamu Gbamu that is about 87 kWp against 151 kWp, roughly 40% less capital tied up early (*assumption*: expansion later costs about the same per kWp). The built plant there is 85 kWp, close to that staged figure.
- **Fewer failed sites.** Showing the brownout and idle odds before building lets lenders price risk on evidence, and points funders at the tariff gap or grant each site needs.
- **At scale.** If staging and better-targeted sizing saved even 10% of generation capital on 10% of the $127 billion pipeline [1], that is on the order of $1 billion for more connections (*assumption-driven; order of magnitude only*).
- **Cost to run.** Minutes per site on a laptop with open data, against field surveys that take days (*assumption*).

## Against the judging criteria

- **Impact (25%):** the engine's validate command scores P50 error, P10 to P90 coverage and pinball loss on held-out metered sites, with leave-one-out calibration. Public checks today: building classes on 2,225 tagged buildings in 84 held-out villages (weak on shops, schools and clinics, and shown that way); a real 85 kWp plant at Gbamu Gbamu sits inside the year-3 range.
- **Innovation (25%):** footprints to five-year growth with measured connection and appliance curves, tariff feedback, lumpy productive use, and sizing risk per design; hourly 8760 files for HOMER and REopt.
- **Sustainability (25%):** open data (Open Buildings CC BY 4.0, OpenStreetMap ODbL), open code, every input in one editable file with its source, retrainable from shared meter data; staged builds mean less idle hardware.
- **Feasibility (15%):** public inputs only; no logins; runs in seconds to minutes.
- **Scalability (10%):** six countries already; Open Buildings covers Africa, so any latitude and longitude works.

## What we need next

1. Metered monthly totals from 50 to 200 sites through a data trust, to score and calibrate the ranges.
2. Current equipment quotes, to replace the 2021 Omorate costs.
3. A household count and a short business walk-through in two villages, to check the biggest driver.
