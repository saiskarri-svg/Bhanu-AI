# GridSight: 3-minute pitch

Live prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS
Team: Sai (map, data pipeline, dashboard) and Fereshteh (demand engine, Benichab field test).
Timings are a guide (about 130 words a minute). The step strip at the top of the page follows the same order.

---

**0:00 to 0:25. The problem** (screen: Site tab, the Amina line under the headline)

Amina builds mini-grids. Her last site was too big: the tariff to repay it priced out half the village. The one before was too small and browned out every evening. Her lender wants a demand forecast, and all she has is an old census and a survey where people guess at using electricity they have never had. Measured use runs from 5 to 35 kWh per customer a month across Africa, a sevenfold spread. Researchers warn that forecasts are often overstated and should come from someone with no reason to inflate them.

**0:25 to 0:55. Step 1: count the roofs** (screen: Gbamu Gbamu map)

GridSight starts from space. Pick a village, or any latitude and longitude. Satellite pictures can be old or missing, so we merge three footprint sources: Google, Microsoft and OpenStreetMap. At Talek in Kenya, Google alone sees only half the roofs. Gbamu Gbamu in Nigeria: about 1,350 roofs. Almost nothing is tagged, so where the map is thin we fall back on regional averages for shops, schools and clinics, and say so.

**0:55 to 1:35. Step 2: forecast demand** (screen: Demand tab, the answer sentence, then "Why this number")

The demand engine runs 4,000 futures. Households connect at the pace measured at a real Kenyan mini-grid, buy appliances along early and late adopter curves, and use what metered sites in Rwanda and Malawi actually use, not what surveys claim. Then it checks itself against measured load at mini-grids within 1,000 miles: near Talek, metered sites use less than the published ranges suggest, so the forecast moves down about a fifth. Gbamu Gbamu: about 125 kWh a day in year 1, growing to about 620 by year 5, with the range shown. And for the lender, "Why this number": 39% of the doubt is how many roofs make one household. One day counting households on the ground narrows it most.

**1:35 to 2:15. Step 3: size and tariff** (screen: Growth and money, the "How wrong can we be?" table)

Now the money question. Build for the median year-5 forecast and there is a 30% chance of brownouts by year 5, yet a 96% chance it sits more than 40% idle in year 2. So we recommend building in stages. And the tariff: at 45 cents the system never covers its costs; at 85 cents it does in 83% of futures, for a household bill of about $8.70 a month, inside the $5 to $20 families already spend on kerosene and batteries.

**2:15 to 2:45. Step 4: check it** (screen: Validation)

No meter data from these six villages yet, so we tested what we can. A real 85 kWp solar plant is mapped at Gbamu Gbamu; from roofs alone, GridSight says demand in years 2 to 3 needs 76 to 118 kWp. We scored our building classifier on 2,225 volunteer-tagged buildings in 84 villages it had never seen, and we show where it falls short. The engine's validate command is ready for metered sites.

**2:45 to 3:00. Step 5: share meter data** (screen: Data sharing)

Six villages, six countries, open data, on a laptop. The missing piece is meter data, so we propose a data trust: operators share monthly site totals, never customer rows, and get a better model back. Fewer oversized grids, fewer brownouts, faster finance. That is GridSight.
