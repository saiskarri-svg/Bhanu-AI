# GridSight: one-page impact estimate

**What it is.** An open tool that turns satellite building footprints and map data into a mini-grid demand range (P10, P50, P90), a five-year growth curve, a system size and the tariff risk on either side, with the drivers explained for lenders. Prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS

All figures below are rough guides. Sources: [1] ESMAP / World Bank, *Mini Grids for Half a Billion People* (2022), as cited in the hackathon brief. Anything marked *assumption* is ours and should be tested.

## The size of the problem

- About 217,000 mini-grids serving 490 million people, costing about $127 billion, are needed for universal access by 2030 [1].
- Measured demand runs 5 to 35 kWh per customer a month across surveyed sites [1], a sevenfold spread that today's survey-based forecasts cannot narrow.
- At the current pace only about 44,800 mini-grids will be built by 2030 [1]. Faster, cheaper, more trusted site assessment is part of closing the gap.

## What GridSight changes

| | Today | With GridSight |
|---|---|---|
| Inputs | Old census, short household survey | Every roof from space, map tags, roads, grid lines; survey optional |
| Output | One number | P10 / P50 / P90, growth to year 5, drivers ranked |
| Spread on monthly demand | Up to 7x (5 to 35 kWh per customer) [1] | About 2x P10 to P90 on the sample sites, year 1 (coverage still to be tested on metered sites; it may prove too narrow) |
| Time per site | Days to weeks in the field (*assumption*) | Minutes on a laptop, free data |
| Cost of software and data | Licences or consultants | Open source, open data |

## Impact estimate (illustrative, to be validated)

- **Less over-building.** If a developer can size to P50 or P70 of a 2x range instead of adding a large safety margin to a 7x guess, generation and storage can be about 15 to 25% smaller on sites that would have been oversized (*assumption*). Generation and storage are roughly half of capex (*assumption*), so about 8 to 12% less capital on those sites.
- **Per site.** For Gbamu Gbamu (1,229 buildings), GridSight suggests about 120 kWp of solar and 330 kWh of battery at P50 for year 3, about $570k all in with poles, wires and meters for about 650 customers (rough guide). 10% less capital is about $57k, which lowers the break-even tariff by a similar share.
- **Fewer brownouts.** The sizing panel shows the chance of running short before building. Developers can stage batteries for the upper part of the range instead of discovering it from customer complaints.
- **At scale.** Applied across even 10% of the $127 billion pipeline [1], 8 to 12% less capital on oversized sites is on the order of $1 billion that could connect more villages (*assumption-driven; order of magnitude only*).
- **Productive use.** The tool shows how daytime business load lifts the load factor; moving from about 22% to 40% cut the cost of power by about 25% in ESMAP's analysis [1]. That points developers and funders at appliance finance where it changes the tariff most.

## Against the judging criteria

- **Impact (25%):** validation plan scores P50 error and P10 to P90 coverage on held-out metered sites. Public checks today: building classes on held-out tagged villages; a real 85 kWp plant at Gbamu Gbamu sits inside our 67 to 131 kWp roof-only range.
- **Innovation (25%):** demand from footprints with explicit class doubt, Monte Carlo ranges, growth curves with widening bands, and a lender-facing drivers panel.
- **Sustainability (25%):** open data (Open Buildings CC BY 4.0, OpenStreetMap ODbL), open code, ranges retrainable from shared meter data; fewer oversized systems means less wasted hardware.
- **Feasibility (15%):** public inputs only; a laptop script fetches any site in about a minute with no logins.
- **Scalability (10%):** already running in Nigeria, Sierra Leone, Kenya, Uganda and Tanzania; Open Buildings covers Africa, so any latitude and longitude works.

## What we need next

1. Metered data from 50 to 200 sites through a data trust (see the Data sharing tab), to fit the ranges and score real error.
2. Night light (VIIRS) and household survey (MTF) inputs to narrow the spending power range.
3. A field check of building classes in two villages.
