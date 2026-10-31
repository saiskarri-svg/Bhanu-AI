# GridSight: one-page impact estimate

**What it is.** An open tool that turns satellite building footprints and map data into a five-year mini-grid demand forecast with ranges (P10, P50, P90), the drivers a lender can review, and the brownout, idle-capacity and tariff risk of each system size. Map, data pipeline and dashboard by Sai; demand engine by Fereshteh. Prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

All figures are rough guides. Sources: [1] ESMAP / World Bank, *Mini Grids for Half a Billion People* (2022), as cited in the brief; [2] Peters, Sievert and Toman, *Energy Policy* (2019); [3] Antonanzas-Torres et al., *Energies* (2021), 2020 data; engine inputs and their sources in `forecast/assumptions.yaml`. *Assumption* marks our own estimates.

## The problem

- About 217,000 mini-grids for 490 million people, costing about $127 billion, are needed for universal access by 2030; at the current pace only about 44,800 get built [1].
- Measured demand runs 5 to 35 kWh per customer a month [1], and projections are often overstated, especially for productive use [2]. Errors either way break the economics.

## What GridSight shows, six villages in six countries

| Village | Roofs (all sources) | Google alone sees | Year 1, kWh/day | Year 5, kWh/day | Nearby meters | P50 design (year 5) | Brownouts, year 5 | Covers cost at $0.85 |
|---|---|---|---|---|---|---|---|---|
| Gbamu Gbamu, Nigeria | 1,346 | 91% | 126 (84 to 187) | 617 (427 to 906) | x1.14 (1 weak site) | 208 kWp, 420 kWh | 30% | 83% |
| Bulongwa, Tanzania | 833 | 69% | 64 (44 to 94) | 294 (202 to 435) | x0.74 (3 sites) | 86 kWp, 196 kWh | 31% | 90% |
| Talek, Kenya | 799 | 51% | 79 (53 to 114) | 301 (210 to 431) | x0.78 (3 sites) | 86 kWp, 201 kWh | 29% | 92% |
| Kychom, Sierra Leone | 582 | 81% | 58 (40 to 83) | 245 (174 to 356) | none within 1,000 miles | 79 kWp, 167 kWh | 30% | 86% |
| Kitobo, Uganda | 430 | 90% | 28 (18 to 44) | 140 (94 to 213) | x0.81 (3 sites) | 43 kWp, 96 kWh | 31% | 85% |
| Benichab, Mauritania | 340 | 57% | 33 (22 to 50) | 156 (105 to 231) | none within 1,000 miles | 40 kWp, 107 kWh | 32% | 94% |

Roofs come from Google, Microsoft and OpenStreetMap merged by Overture Maps, with homes built since each record's date added at the local household growth rate. Benichab's 340 roofs match Fereshteh's independent settlement map (325). "Nearby meters" is the adjustment from published metered sites within 1,000 miles (Sitolo in Malawi, two PowerGen mini-grids in Tanzania, Rwanda's rural grid, and a weak North Central Nigeria study), weighted by distance and data quality.

Across all six, the same three findings hold:
- **Build in stages.** A system sized for the median year-5 forecast has about a 30% chance of brownouts by year 5, and a 94 to 96% chance of being under 60% used in year 2. Size for years 2 to 3 and add panels and batteries as metered demand shows up.
- **Tariff decides survival.** At $0.45/kWh no village covers its costs with 2021 Omorate equipment prices. At $0.85, which matches Sierra Leone's 90-grid programme [3], it does in 83 to 94% of futures. The household bill is then about $5.60 to $8.70 a month, inside the $5 to $20 families spend today [1].
- **The cheapest field check is a household count.** "Buildings per household" explains 31 to 40% of the uncertainty everywhere.

## Impact estimate (illustrative, to be validated)

- **Less idle capital.** Staging the first build at year-2 to year-3 demand instead of year 5 cuts the up-front generation build. At Gbamu Gbamu that is about 76 to 118 kWp against 208 kWp, roughly half the capital tied up early (*assumption*: expansion later costs about the same per kWp). The built plant there is 85 kWp, inside that staged range.
- **Fewer failed sites.** Showing the brownout and idle odds before building lets lenders price risk on evidence, and points funders at the tariff gap or grant each site needs.
- **At scale.** If staging and better-targeted sizing saved even 10% of generation capital on 10% of the $127 billion pipeline [1], that is on the order of $1 billion for more connections (*assumption-driven; order of magnitude only*).
- **Cost to run.** Minutes per site on a laptop with open data, against field surveys that take days (*assumption*).

## Against the judging criteria

- **Impact (25%):** the engine's validate command scores P50 error, P10 to P90 coverage and pinball loss on held-out metered sites, with leave-one-out calibration. Public checks today: building classes on 2,225 tagged buildings in 84 held-out villages (weak on shops, schools and clinics, and shown that way); a real 85 kWp plant at Gbamu Gbamu sits inside the year 2 and 3 ranges; forecasts are pulled toward metered sites within 1,000 miles.
- **Innovation (25%):** footprints to five-year growth with measured connection and appliance curves, tariff feedback, lumpy productive use, and sizing risk per design; hourly 8760 files for HOMER and REopt.
- **Sustainability (25%):** open data (Open Buildings CC BY 4.0, OpenStreetMap ODbL), open code, every input in one editable file with its source, retrainable from shared meter data; staged builds mean less idle hardware.
- **Feasibility (15%):** public inputs only; no logins; runs in seconds to minutes.
- **Scalability (10%):** six countries already; Open Buildings covers Africa, so any latitude and longitude works.

## What we need next

1. Metered monthly totals from 50 to 200 sites through a data trust, to score and calibrate the ranges. First step: the open Kenya and Nigeria smart-meter dataset (24 mini-grids, 11,942 customers, Zenodo record 22149102) as nearby sites.
2. Current equipment quotes, to replace the 2021 Omorate costs.
3. A household count and a short business walk-through in two villages, to check the biggest driver.
