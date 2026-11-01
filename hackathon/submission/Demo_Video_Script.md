# Kesho AI: demo video script (live website, 5:00)

Screen-record the live site at full screen: https://claude.ai/artifact/PZNH8ccqmgMXbZZmybJqXS
Before recording: open the Map tab, pick Gbamu Gbamu, leave the settings at their defaults (Year 5, P50, Roofs, 2021, $0.85). About 130 words a minute; pause on each screen.

---

**0:00 to 0:20 · Intro** (Map tab, whole screen)
"This is Kesho AI, built during this hackathon for Brief 03: predict mini-grid demand before building. Everything you'll see runs on open data. I'll walk through one village from roofs to a financeable plan."

**0:20 to 0:55 · The map** (Map tab)
- Point at the buildings: "This is Gbamu Gbamu in Nigeria: 1,346 roofs within 1 km on a Sentinel-2 satellite picture from this year. Each roof is coloured by its likely use: homes, shops, clinics, schools."
- Point at the labels: "The labels show demand by type. This solar plant, 85 kWp, is real; it's mapped on OpenStreetMap."
- Click **Flat**, then **3D**.
- Point at the right panel: "Site settings live here: village, year, system size, households, build cost and tariff. Every number on every tab follows them."
- Click **Talek**, then back to **Gbamu Gbamu**: "Six villages in six countries are loaded."

**0:55 to 1:25 · Step 1: count the roofs** (Site tab)
- "Footprints come from Google, Microsoft and OpenStreetMap, merged with duplicates removed. Google alone sees 91% of roofs here; in other villages only about half."
- Scroll to **Footprint sources and dates**: "Pictures can be years old, so homes built since are added at household growth."

**1:25 to 2:15 · Step 2: forecast demand** (Demand tab)
- Top answer: "The demand engine runs 4,000 possible futures. About 124 kWh a day in year 1, growing to 595 by year 5, with a range of 411 to 879. P50 is the middle forecast; P90 a high case only 1 in 10 futures exceed."
- Scroll to **Two ways to count households**: "Roofs give 867 households; Meta's population map gives 223. We show both, and the settings bar switches between them."
- Scroll to **Why this number**: "The biggest uncertainty is buildings per household, about 38%. So one day counting households on the ground is the most valuable check."
- Scroll to **Measured load within 1,000 miles**: "Published meter data from nearby mini-grids pulls the forecast toward real use."

**2:15 to 3:10 · Step 3: right-size it** (Money tab, Size and tariff)
- **Right size** box: "Build one P50 system for year 5 and there's a 37% chance of brownouts by year 5, while it sits mostly idle early on. Our staged plan sizes each stage so brownout odds stay at 15% or less: 60 kWp now, more in years 2 and 4."
- Click **Use the staged plan**: "Expand when the meters pass 80% of what's installed, not on the calendar."
- Scroll to **Wires and the grid**: "The village network is measured from the roofs, about 16 km of line. The grid is 13.9 km away; the line would cost about $349k against $666k of solar and battery."
- Scroll to **Share one plant with nearby villages?**: "Sharing one plant with three nearby settlements within 3 km saves about $198k."

**3:10 to 4:05 · Step 4: who pays** (Money tab, Funding)
- Top: "Funding routes for Nigeria and across Africa, such as REA DARES and SEforALL's Universal Energy Facility, which pay developers for each home connected."
- Scroll through **What a grant per connection would cover**, **First 24 months of cash** and **Payback over 20 years**: "Grant against build cost, month-by-month cash, and a 20-year payback including battery renewal."
- Scroll to **Make it pencil out**: "Each row adds a lever: build in stages, 2024 equipment prices, a concessional loan. Each figure is the smallest grant per connection that makes it pay back within 10 years. With all three, no grant is needed."
- Scroll to **What funders ask for**, click **Download concept note (PDF)**: "And a two-page concept note for a funder, built from these numbers."

**4:05 to 4:35 · Step 5: real weather and the battery** (Sun and weather tab)
- "Ten years of NASA weather: cloudy, rainy and dusty days, and climate-model outlooks to 2036."
- Scroll to **What the battery has to carry**: "About half of Gbamu Gbamu's demand comes from the battery, after sunset. Hour by hour over a year, 2.5% goes unserved, and here is a week in the hardest month."

**4:35 to 4:50 · Step 6: check it** (Trust tab)
- "We tested building classes on 2,225 tagged buildings in 84 villages the model never saw. And the 85 kWp plant actually built here matches our year-2 demand of about 84 kWp."

**4:50 to 5:00 · Close** (back to Map tab)
"Kesho AI: see a village's power needs before you build. Code and models are on GitHub. Thank you."
