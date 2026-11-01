# Kesho AI: 3-minute pitch

Live prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS
Team: Sai (map, data pipeline, dashboard) and Fereshteh (demand engine, clear-sky solar model, Benichab field test).
Timings are a guide (about 130 words a minute). The step strip at the top of the page follows the same order; open on the Map view.

---

**0:00 to 0:25. The problem** (screen: Map view, Gbamu Gbamu in 3D)

Amina builds mini-grids. Her last site was too big: the tariff to repay it priced out half the village. The one before was too small and browned out every evening. Her lender wants a demand forecast, and all she has is an old census and a survey where people guess at using electricity they have never had. Measured use runs from 5 to 35 kWh per customer a month across Africa, and forecasts are often overstated.

**0:25 to 0:55. Step 1: count the roofs** (screen: Site tab, footprint sources and the satellite picture)

Kesho AI starts from space. We merge three footprint sources, because pictures can be old or missing: at Talek in Kenya, Google alone sees only half the roofs. A satellite picture from this month shows what is there now. Gbamu Gbamu in Nigeria: about 1,350 roofs. And we check the count against a second open source, Meta's population map. They disagree up to four-fold, and we show both.

**0:55 to 1:30. Step 2: forecast demand** (screen: Demand tab, the answer, then "Why this number")

Fereshteh's engine runs 4,000 futures: households connect at the pace measured at a real Kenyan mini-grid, buy appliances along early and late adopter curves, and use what metered sites actually use. Then it checks itself against measured load at mini-grids within 1,000 miles. Gbamu Gbamu: about 125 kWh a day in year 1, growing to about 600 by year 5, with the range. For the lender, "Why this number": nearly 40% of the doubt is how many roofs make one household. One day of counting settles it.

**1:30 to 2:05. Step 3: sun and weather** (screen: Sun and weather, the typical day in each month)

Ten years of real weather: Gbamu Gbamu has 90 cloudy, 131 rainy and 143 dusty days a year; Benichab in Mauritania loses 10% to heat and 6% to dust. Fereshteh's clear-sky model, scaled by that weather, gives the solar curve for every month, and the demand on top shows what the battery must carry each evening. Climate models change it by only about 2% this decade.

**2:05 to 2:35. Step 4: size and tariff** (screen: Money tab, "How wrong can we be?", then Funding: grant, 24-month cash and the concept note)

Build for the median year-5 forecast and there is about a 30% chance of brownouts by year 5, yet a 96% chance it sits more than 40% idle in year 2. So build in stages, sized so brownout odds stay at 15% or less each year with the least idle kit, and expand when the meters pass 80% of what is installed. With a staged build, 2024 equipment prices and a concessional loan, the owner's money comes back in about four to six years at every village at $0.85 a kWh, with no grant (rough guide). At Gbamu Gbamu, year-2 demand needs about 84 kWp; the plant actually built there is 85. At 85 cents a kWh, costs are covered in seven to nine futures out of ten, for a household bill of $5 to $8 a month, inside what families already spend on kerosene and batteries.

**2:35 to 3:00. Step 5: check it and share data** (screen: Trust tab: Checks, then Data sharing)

We scored our building classes on 2,225 volunteer-tagged buildings in 84 villages it had never seen, and we show where it falls short. Six villages, six countries, open data only, on a laptop. The missing piece is meter data, so we propose a data trust: operators share monthly site totals, never customer rows, and get a better model back. Fewer oversized grids, fewer brownouts, faster finance. That is Kesho.
