# GridSight: 3-minute pitch

Live prototype: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS
Timings are a guide (about 130 words a minute). Show the screen named in each step.

---

**0:00 to 0:25. The problem** (screen: Site tab, Gbamu Gbamu map)

Amina builds mini-grids. Her last site was too big: the tariff to repay it priced out half the village. The one before was too small and browned out every evening. Her lender wants a demand forecast. All she has is an old census and a survey where people guess at using electricity they have never had. Across Africa, measured use runs from 5 to 35 kWh per customer a month. That sevenfold gap is the difference between a project that pays and one that fails.

**0:25 to 1:05. What GridSight does** (screen: map, then class panel)

GridSight starts from what you can see from space. Pick any village, or type a latitude and longitude. We pull every roof from Google Open Buildings, with its location and footprint area, and every tag, shop, clinic, school, road and power line from OpenStreetMap through Overture Maps. This is Gbamu Gbamu in Ogun State, Nigeria: 1,229 buildings. Where volunteers have tagged a building, we use the tag. Where they have not, which is almost everywhere, we score it from size, shape, road frontage and crowding, and we keep the doubt as a probability instead of pretending to know.

**1:05 to 1:45. A range, not a number** (screen: Demand tab)

Then we simulate 1,500 futures, varying every assumption and every building class at once. Out comes a range: P10, P50, P90 for monthly energy, peak load, use per customer and load factor, with a daily load curve. And because a lender has to trust it, "Why this number" ranks the inputs that move it most. Here it is household use, then shop use. That tells Amina exactly where a one-day site visit pays off.

**1:45 to 2:20. Growth and money** (screen: Growth and money tab)

Demand is not fixed. The growth curve shows years 1 to 5 as people buy TVs, fridges and mills, with the band widening honestly. Pick a design point and GridSight sizes the solar and battery, and shows the risk of brownouts against the risk of a tariff that is too high, using cost benchmarks labelled as rough guides.

**2:20 to 2:45. Does it work?** (screen: Validation tab)

We have no meter data yet, so we tested what we can. The building classifier is scored on tagged buildings from villages it has never seen. And for Gbamu Gbamu, where a real 85 kWp solar plant is mapped, GridSight's roof-only estimate of about 67 to 131 kWp brackets what was actually built. Our validation plan scores P50 error and range coverage on held-out metered sites.

**2:45 to 3:00. Why it scales** (screen: Data sharing tab)

Everything runs on open data, on a laptop, in five countries already. The missing piece is meter data, so we propose a data trust: operators share monthly site totals, never customer rows, and get a better model back. Fewer oversized grids, fewer brownouts, faster finance. That is GridSight.
