# Bhanu AI: site text (English)

Source text for translation. Each section matches a tab or lesson on the site. Numbers in braces, like {school}, are filled in by the app.

## Top bar

- Bhanu AI
- Tabs: Overview · Returns · Maintenance · AI Advisor · Learn · Mission · Impact · Sources
- Sample data · Add readings · Real data · {date}
- Export report
- Bhanu AI, go to Overview (read by screen readers) · Back to top · Saved · Loading

## Site settings (Overview only)

- Site
- State
- Village or area
- School
- School address · For technician visits · Street, village, mandal, PIN
- Map link, optional · Paste a Google Maps share link
- System size
- Finance
- Install cost (₹ per kWp)
- Tariff (₹ per kWh)
- DISCOM default
- Grants secured (₹) · CSR or state scheme
- Yearly degradation
- Tariffs [14], install costs [13] and yields per kWp [29] are rough guides for each state; use the rate on the school's own bill and a local quote. Schools get no central rooftop subsidy, so enter any CSR or state grant above [8].
- Settings are saved for everyone who opens this page. · You can view these settings. Changes you make stay on this device. · Settings are saved on this device.

## Overview

- Annual generation · kWh / yr
- Carbon offset · t CO₂ / yr
- Payback · years
- Saved a year (rough)
- Typical day · kW by hour · Now
- Monthly generation · Dry season · Monsoon
- What it means for {school}
- Yearly, based on this site's generation and tariff.
- Grid loss avoided: About 17% of India's power is lost on the grid [4]. Power made on the roof is used right there.
- Classrooms powered: Daytime power for lights and fans, made on the school's own roof.
- Computer lab time: Daytime solar runs the lab. Add a UPS to ride through cuts and voltage dips.
- Library budget: Bill savings that can go to library materials instead.

### Where the power goes now

- Where the power goes now · Estimate for {time}
- Panels · School · Grid · solar · to grid · from grid · none
- The sun is down, so solar makes nothing. The school takes about {kw} from the grid.
- Solar makes about {kw}. The school uses about {kw}, so about {kw} goes to the grid and earns credit.
- Solar makes about {kw}. The school needs about {kw}, so the grid adds about {kw}.
- Based on a typical day and school hours, not a live meter.

### Real data from the inverter

- Real data from the inverter · Showing sample data · {n} days · last {date}
- The dashboard is showing sample data. Add real readings and every chart, alert and AI answer switches to them. · The charts, faults, alerts and AI Advisor now use the school's real readings. Add each day's reading to keep them current.
- Readings are shared with everyone who opens this page. · Readings are saved on this device only.
- 1. Every day: read the inverter display
- After sunset, a student and teacher read "E-Today", "Today yield" or "Daily energy" (kWh) on the inverter screen. Look only; do not open the inverter.
- Date · Energy today (kWh) · about {n} · Save reading · Saved {n} kWh for {date}.
- 2. Or upload history from the monitoring app
- Many monitoring portals have a Reports or Export option. For example, Huawei FusionSolar exports plant and inverter yield reports from its Reports menu [44]. Choose a daily report, export it as CSV (or open the Excel file and save it as CSV), then upload it here. Some portals, such as some Growatt web portals, only export pictures of graphs [45]. If yours has no data export, use the daily reading, or ask the installer for a daily energy file.
- Choose CSV file · {file}: {n} rows. Check the columns: · Date column · Energy column · Unit
- {n} days, {date} to {date}, about {n} kWh a day (expected about {n}). · Import {n} days · Saving {n} of {n} · Saved {n} days of readings. · Cancel
- No dates and numbers found in those columns. Try another column. · That is far from what a {size} kWp system makes. Check the energy column and the unit, or that it is a daily (not total) figure.
- Please choose a CSV file. In Excel or Google Sheets, use File, Download or Save as, then CSV. · That file has no table we can read. · Could not save. You may only have view access to this page.
- Latest readings · {n}% of expected · Remove · Download as spreadsheet (CSV)
- Below 85% of expected on a sunny day usually means dust or shade; below 60%, or several low days in a row, needs a check. Cloudy days are lower too, so look at the weather before cleaning.
- Inverter may be off: almost no power made. Check the inverter display for a fault code.

## Returns

### Ways to pay for it

- The same system can be paid for in four ways. Compare what the school pays upfront, what it gains each month, and over 20 years.
- {size} kWp · {cost} after grants
- Loan interest · Loan length · Share a CSR grant covers · Price per unit to the installer
- Option · School pays upfront · Each month, year 1 · 20 year gain · Owns the system
- Pay upfront: Simplest and the biggest long-term saving, if the school has the money. Owner: School, from day one
- Bank loan, {n} years: About {amount} a month to the bank at {rate}% interest, 20% paid upfront. Owner: School, after the loan
- Company CSR grant: A company pays {pct}% under its CSR budget for education and the environment. Owner: School
- Installer owns it (pay per unit): No upfront cost. The school buys the solar units at ₹{price} instead of ₹{tariff}. Owner: Installer, often handed over after the contract
- Nothing
- Biggest 20 year gain: {option} ({amount}).
- If the school has no money to spare, {option} gives the most without a large upfront payment.
- Rough guide. Loan terms, CSR rules and pay-per-unit contracts vary; get written quotes before deciding.

### Funding for schools in {state}

- Funding for schools in {state} · Rough guide · check before applying
- Schools do not get the household rooftop subsidy, but there are other ways to pay. Start with the state agency, then the national routes. Change the state in the site settings on Overview to see another state.
- In {state} · State solar agency · Visit the agency's website
- Running · Past scheme · Check if still open · Ask: · Amount: · Source: {publisher}
- No school solar scheme was found for {state}. Ask {agency} about rooftop solar for government buildings.
- Net metering: {text} · Source
- Across India · Show {n} more ways · Show fewer
- Gathered in {month} from official pages and news reports. Schemes, amounts and rules change, so open the source and confirm with the office before applying. Once money is promised, enter it as "Grants secured" in the site settings.
- Scheme names and details come from components/fundingData.ts and stay in English for now.

### 20 year cash flow

- 20 year cash flow
- {cost} after grants · breaks even in year {n} · {amount} ahead by year 20
- Still paying off · In profit · Yearly savings
- Paid back, year {n}

### Funder summary

- Funder summary · One page PDF
- A one page summary for a company's CSR team, a bank or the district office: the system, costs, subsidy, savings, CO₂ and what it means for children. Send it to fund this school or the next one.
- Download summary (PDF) · Making the PDF…
- In the PDF: BHANU AI · SCHOOL SOLAR PROGRAMME
- {school} runs on sunshine
- {village}, {state} · {size} kWp rooftop solar system
- Clean power a year · Bill savings a year · CO2 avoided a year · Trees equivalent
- System cost · Grants secured · Funding needed · Pays for itself in · {n} years
- Power through the year (kWh)
- For children: Lights, fans and computer labs run on the sun in the daytime, and the bill goes down. Students learn science from their own roof: data, safety and maintenance. A path to skilled solar jobs, starting in class 6.
- For the community and funders: Bill savings of about {amount} a year stay in the school for books and materials. Local jobs cleaning, inspecting and repairing systems. Each school avoids tonnes of CO2 a year and trains the workforce India needs for its 500 GW non-fossil power target for 2030.
- Estimates for a typical year from the system size and local sunshine. Prepared with Bhanu AI on {date}.

### Savings tracker

- Savings tracker · Shared with everyone who opens this page · Saved on this device only
- Each month, add the solar units from the inverter display and the DISCOM bill. See what solar really saved, and whether it is keeping up with the estimate.
- Saved so far · Paid back · Solar made vs estimate · Months logged
- Month · Solar made (kWh) · Units on bill · Bill amount (₹) · Add month · Remove
- No months added yet. Start with last month's bill.
- Savings are the solar units times what the school pays per unit on that bill. A month under 90% of the estimate is worth checking: dirty panels, shade or a fault.
- Download as spreadsheet (CSV)

### Check a real bill

- Type in the units and amount from one of the school's DISCOM bills. See what it would have been with solar.
- Bill month · Units used (kWh) · Bill amount (₹)
- You pay per unit: Bill amount ÷ units, including fixed charges
- Solar in {month}
- Bill with solar
- Saved this month
- Cost and grants for this system: System cost · Central rooftop subsidy: None for schools [8, 9] · Grants secured (set in site settings) · School pays
- How net metering works: The meter counts units in both directions. In sunny months the school can send more than it uses. Units sent out first cancel units the school buys. Any surplus left at the year end is usually paid at about ₹3 a unit, less than the tariff [11, 12].
- PM Surya Ghar's subsidy is for homes. Government schools can get rooftop solar through its government buildings programme, usually run by a RESCO or the DISCOM with little or no upfront cost [10], or through state schemes and CSR. Check with your DISCOM.

### What if?

- What if? · Test the numbers
- The simple estimate assumes nothing changes for 20 years. Real life adds rising tariffs, upkeep and an inverter replacement. Move the sliders to see an honest range.
- Tariff rise each year · Panels wear out each year · Inverter replaced in year · Upkeep each year
- Breaks even in year {n} (simple estimate: year {n}) · {amount} ahead by year 20
- Your scenario · Simple estimate

### Where the savings go

- Where the savings go · {amount} a year
- Decide how the school spends what solar saves, and see what it buys each year. Children notice books and tablets more than a smaller bill.
- Library books: {n} books, at about ₹250 each
- Lab equipment: {n} tablets, at about ₹12,000 each
- System upkeep fund: {n} cleanings, at about ₹200 each · covers monthly cleaning and the yearly service
- School fund: {amount}, for anything else

## Maintenance

### Today

- High risk items · Next cleaning · Checks due · Now · In {n} days
- Sample faults for practice · Fix within a day · Nothing urgent · Cleaning is due · Due or never done · All up to date
- See alerts · Cleaning planner · Maintenance log

### Cleaning planner

- Cleaning planner · Set the last cleaning date
- Dirt builds up a little every dry day. Cleaning too often wastes effort, too rarely wastes power. This finds the best gap between cleanings for this school.
- Next cleaning: in {n} days · {n} days overdue · clean every {n} days
- Lost to dust since cleaning: {n} kWh over {n} days
- Losing today: {n}% of output
- Last cleaned: {n} days ago
- Last cleaned on · Cost of one cleaning (water, helper's time)
- Money lost each day as dirt builds up · Lost per day · Best day to clean · Today · Clean at day {n}
- Day {n} after cleaning · Lost that day
- Next three cleanings: {dates}
- Each cleaning stops about {amount} a day of combined loss. Mark cleanings in the maintenance log below to keep this up to date.
- Monsoon rain cleans the panels for free. Skip a cleaning if it rained hard in the last few days.

### Dust vs efficiency

- Dust vs efficiency · Healthy · Losing output · Needs cleaning · Expected
- Horizontal: dust on panels. Vertical: efficiency. From the last 120 days of sensor data.
- Soiling loss now · Power blocked
- Maintenance · {n} open · All clear · Needs work · Resolved · Resolve · Closed {date}
- No issues. Every panel is healthy.

### Maintenance log

- Tick off each check when it is done.
- Daily: Check the inverter display shows no fault
- Weekly: Look at the panels from the ground for dust, droppings or shade
- Monthly: Clean the panels with plain water and a soft brush, early morning
- Monthly: Write down both net meter readings
- Monthly: Check the fire extinguisher gauge is in the green
- Every 3 months: Inspect cables, MC4 connectors and the combiner box
- Yearly: Test the earth pit and lightning arrester
- Yearly: Service the inverter and AC board
- Who: Students with a teacher · Teacher · Technician
- Not done yet · Due in {n} days · Due today · Overdue by {n} days
- Mark done · Note, optional: what did you see? · Save · Cancel
- Recent activity
- Download as spreadsheet (CSV)

### Repair log

- Repair log · Shared with everyone who opens this page · Saved on this device only
- Every repair a technician does on the system: what was fixed, who did it and which organisation they work for. Keep it for warranty claims and to spot parts that keep failing.
- Repairs logged · Need follow-up · Spent on repairs
- Log a repair · Close · All · Needs follow-up · Fixed · Download as spreadsheet (CSV)
- Date of repair · Part repaired · What was done · Technician's name · Organisation · Cost in ₹, optional · Status
- Parts: Panels · Inverter · Wiring and connectors · Combiner box · Earthing and lightning arrester · Net meter · Mounting structure · Other
- For example: replaced a burnt MC4 connector on string 2 and retightened the rest
- Full name · Installer, DISCOM or company name
- Local trained technician (no organisation) · N/A (local trained technician)
- Save repair · Add what was done, the technician and their organisation.
- By {name} · {organisation} · Mark fixed · Reopen
- No repairs logged yet. Press "Log a repair" after a technician visit. · No repairs with this status.
- Could not save. You may only have view access to this page.

### Did cleaning work?

- Did cleaning work? · Example · Cleaning on {date}
- Energy made each day for a week before and after the last cleaning. A clear jump proves the cleaning paid off: a ready made science project for students.
- Output went up {n}% after cleaning · Before · After · Cleaned
- This is an example. Mark a cleaning in the maintenance log to see your own.
- Daily energy in kWh, from the dust model until the sensors report each day.
- Check back tomorrow for the first day after cleaning.

### Panel health map

- Panel health map · {n} panels · sample readings
- Each square is one panel, seen from above. One weak panel can hide inside a normal-looking total, so this compares each panel with its neighbours.
- South edge of the roof is at the bottom. Percent of a clean, new panel's output.
- {n} panels need a look. · All panels look even.
- Tap a panel for details. All panels show dirt at {n}% after {n} days.
- What to do:
- Working normally.
- Low in the morning only: likely shade from the east side.
- Low all day while its neighbours are fine: a hot spot, cracked cell or loose connector.
- Sample readings to show how this works. Real per-panel numbers need panel-level sensors or optimisers.

### Dust risk, next 2 weeks

- Dust risk, next 2 weeks · {state} · typical pattern
- {n} of the next 14 days have high dust risk.
- Best time to clean: around {date}, when the dusty spell eases.
- Low · Some · High · Very high
- Based on the usual seasons for this region, not a live weather forecast.
- North India by month: Winter haze and smog · Dry, hazy days · Dry spring winds · Dust storms begin · Peak dust storms · Storms before the monsoon · Monsoon rain washes panels · Monsoon rain washes panels · Rain eases off · Crop stubble burning · Smoke and smog · Winter haze
- West India by month: Dry winter · Dry winter · Dry, hot winds · Desert dust · Desert dust storms · Dust storms before the rain · Monsoon rain · Monsoon rain washes panels · Rain eases off · Dry after the rain · Dry, dusty fields · Dry winter
- South India by month: Dry winter · Dry season begins · Hot and dry · Hottest, driest weeks · Dry winds before the rain · Monsoon arrives · Monsoon rain washes panels · Monsoon rain washes panels · Rain eases off · Northeast monsoon showers · Northeast monsoon showers · Last northeast monsoon showers
- East India by month: Dry winter · Dry spells · Pre-monsoon storms · Pre-monsoon storms · Early rain · Monsoon rain · Monsoon rain · Monsoon rain · Monsoon rain · Rain eases off · Dry winter begins · Dry winter

### Alerts

- Alerts · {n} high · {n} medium · {n} low · All clear
- Every item gets a risk level. When something is high risk, one WhatsApp message goes to the technician or teacher in charge with the site address and the full list of things to fix, so everything is done in one visit and nobody gets spammed.
- Site address · Open in Maps
- Add the full school address in the site settings (Overview tab) so the technician can find it.
- Technician or teacher's WhatsApp number, with country code
- Country code first, for example 91 98765 43210. · Number looks right. · Add the country code at the start: 91 for India. · This does not look like a WhatsApp number. Use the country code, then the mobile number.
- {n} of 3 messages sent to this number about this site in the last 24 hours · WhatsApp (no number set)
- The limit is per phone number and per site: a different number or site has its own count. The same list is not sent again within 24 hours. · Counted for everyone using this page. · Counted on this device.
- High risk: Safety or fire risk, or the system may stop. Check and repair within a day.
- Medium risk: Losing power or money, but safe. Check this week.
- Low risk: Good to know or a routine reminder. Check at the next visit.
- No cleaning logged yet: Log the last panel cleaning in the maintenance log. · Cleaning overdue ({n} days): Clean the panels with plain water and a soft brush, early morning. · Panels due for cleaning ({n} days): Clean with plain water and a soft brush, early morning, with a teacher. · Very dusty season: Check the panels from the ground each week.
- Preview the message · Send list on WhatsApp ({n} items) · Copy message · Copied
- Message: Bhanu AI: solar work needed at {school} · Address: {address} · Map: {link} · To fix on this visit ({n}): · 1. [HIGH] {item}. {action}
- Message end: High risk items need a technician within a day. Do not let students touch the panels, cables or inverter until they are checked. · Please reply when the visit is booked, and log each repair in the Bhanu AI repair log.
- Message start on sample data: PRACTICE ONLY: these are sample faults from the Bhanu AI demo, not real problems. No visit is needed.
- No high risk items, so nothing is sent. The list stays here. · This list was already sent. It can be sent again in {n} hours, or straight away if a new high risk item appears. · Limit of 3 messages to this number for this site reached. Next send in {n} hours.
- Enter a valid WhatsApp number above to send this list. · Sample (tag on sample faults)
- Nothing needs attention right now.
- Someone taps to send. Fully automatic messages need a WhatsApp or SMS service connected to the school's account.
- Maintenance list: High risk · Medium risk · Low risk · Resolved
- Maintenance list: Sample · {n} open · All clear · These are sample faults for practice. Real faults show here once inverter readings are added on the Overview tab.

## AI Advisor

- Answers in every part: Answer in English · తెలుగు · हिन्दी
- Every answer ends with: Based on: (the data it used) · Confidence: high, medium or low
- AI answers need the claude.ai page · Open in claude.ai · Available on the claude.ai page.
- This copy of the site works offline, so it cannot ask the AI. Open the same page on claude.ai to ask questions, diagnose faults, write the weekly report and build lessons.
- Answers use your own Claude account. The first question asks for your permission.
- Stop

### Ask the advisor

- Ask the advisor · Uses this school's own data
- Ask anything about this school's system: why output changed, what to do next, or how something works. Answers show what data they used and how sure the advisor is.
- Why was output low on the worst day this week? · Should we clean the panels this week? · Explain MPPT for a class 8 student. · What should the technician check first?
- No questions yet. Pick one above or type your own.
- You · Advisor · Thinking…
- Your question: Type a question, for example: how much did dust cost us this month?
- Ask · Clear chat

### Diagnose a problem

- Diagnose a problem · Describe it, add a photo
- Describe what you see, such as a fault code on the inverter or a brown mark on a panel. The advisor says the likely cause, how urgent it is and who should act. Never touch anything to take a photo.
- What do you see? For example: the inverter screen shows E023 and a red light since this morning.
- Photo, optional · Remove
- Diagnose · Looking into it…
- Answer headings: Most likely cause · How urgent (Act now · This week · Can wait) · Who should act · Safe next steps

### Weekly report

- Weekly report · Week of {date}
- A short summary for the principal, written from the last seven days of data, with three actions and who should do them.
- Write this week's report · Write it again · Writing the report… · Download report
- Report headings: This week in numbers · What went well · Problems to fix · Three actions for next week

### Lesson builder

- Lesson builder · For teachers
- Make a fresh lesson using this week's real numbers from the school's own system.
- Class (6 to 12) · Minutes (20, 40, 60) · Topic
- Default topic: Why our solar output changed this week
- Make the lesson · Writing the lesson… · Download lesson
- Lesson headings: Goal · Timing · Questions to ask · Activity · Safety note

## Learn

- Learn solar
- Short lessons for students and staff, using this school's own system.
- {n} of {n} steps to the certificate
- Lessons: How it works · Components · Size it · Simulator · Safety · Data detective · Careers · Certificate · Teacher guide

### 1. How it works

**Follow the energy.** Tap a step to learn what happens there.

- Sunlight brings the energy: Light travels as tiny packets of energy called photons. Brighter sun and a clear sky mean more photons reach the panels. Dust, shade and clouds all block some of them.
- Panels turn light into DC power: Each panel has silicon cells. When photons hit a cell, they knock electrons loose and push them along a wire. This is the photovoltaic effect. The power comes out as direct current (DC), which flows one way only.
- The inverter makes AC power: School lights, fans and computers use alternating current (AC) at 230 V and 50 Hz. The inverter switches the DC from the panels into matching AC. If the grid goes down, it stops sending power out so line workers stay safe.
- The school uses it first: AC power goes to the distribution board and on to every room. Whatever the school needs right now is taken from the panels first, so less is bought from the DISCOM.
- Extra power goes to the grid: On holidays and weekends the school uses little, so spare power flows out to the grid. A net meter counts units in both directions, and the school pays only for the difference.

**Voltage, current and power.** Think of electricity like water in a pipe.

- Voltage (volts): The push, like water pressure. Panels in series add their voltage.
- Current (amps): The flow, like litres per second. Panels in parallel add their current.
- Power = V × I (watts): Push times flow. 400 V × 13 A = 5,200 W, the same as 40 V × 130 A.
- More sun, more current. Current rises almost in step with sunlight.
- More heat, less voltage. Each degree above 25 °C takes away about 0.3% of the voltage.
- The inverter finds the peak. Its MPPT keeps hunting for the top of the power curve.

**Series or parallel.**

- Series: The + of one panel joins the − of the next, like batteries in a torch. Voltages add up and the current stays the same as one panel. High voltage, low current, thin cables.
- Parallel: Every + joins every +, and every − joins every −. Currents add up and the voltage stays the same. The current is huge, so cables get hot and waste energy.
- Two strings: Two shorter series strings, each going to its own inverter input.
- Shade: Bypass diodes let the current skip a shaded panel, so the string loses only that panel.
- Cable loss is current × current × resistance. Doubling the current makes four times the heat.

**Three ideas to remember.**

- kW is speed, kWh is distance. A 1 kW fan running for 1 hour uses 1 kWh, also called 1 unit.
- DC and AC. Panels make DC, the school runs on AC.
- Heat and dust cost power. Panels lose about 0.4% of output for every degree above 25 °C [23]. Two months of dust without rain can cut output by 15 to 25% [24], which is why cleaning matters.

### 2. Components

Find the parts at the school. Hover or tap a numbered part to learn what it does.

1. Solar panels: Silicon cells in a glass and aluminium frame. They turn sunlight into DC power and last 25 years or more. Students can check: dust, bird droppings, cracks or shade, from the ground only.
2. Mounting structure: Galvanised steel frame that holds the panels at the right tilt, facing south. Students can check: rust spots and loose bolts, from a safe spot.
3. DC cables and MC4 connectors: UV proof cables link the panels into strings. MC4 connectors snap them together with a watertight lock. Students can check: cables hanging loose or lying in water. Never touch or pull them.
4. DC combiner box: Joins the strings and holds fuses, a surge protector and the DC isolator switch. Students can check: box door closed and labels readable.
5. Inverter: Changes DC to 230 V AC and shuts off if the grid fails. Students can check: live kW, today's kWh and any fault code.
6. AC distribution board: Holds the AC breaker and surge protector. Students can check: any tripped switch. Report it, don't reset it.
7. Net meter: A two-way meter fitted by the DISCOM. Students can check: both readings each month.
8. Earthing and lightning arrester: Copper rods in earth pits carry fault current and lightning safely into the ground.
9. Battery bank (optional): Stores energy for evening use or outages.
10. Bhanu AI sensors: Measure dust, temperature and output every day and send them to this dashboard.

### 3. Size it

- Step 1: How much energy does the school use? Walk around the school and count every appliance. Check the watts on its label and estimate how many hours a day it runs.
- Appliances: LED tube lights · Ceiling fans · Computers · Projector · Water pump (1 HP) · Drinking water purifier · Wi-Fi router · Outdoor lights (night)
- Watts each · How many · Hours a day · kWh a day · Share
- Energy a school day · School days a year · Energy a year · Everything on at once
- Biggest users and how to save. Example: BLDC fans use about 30 W instead of 70 to 75 W for an old fan, which would more than halve this [30].
- Step 2: What size system does it need? Share of the school's energy to cover · Shadow free roof area · Recommended system · Inverter · Wiring · Roof needed · Cost after grants · Saved each year · Use {size} kWp for this site
- Step 3: Plan the roof. Panels keep 1 m back from every edge, stay out of the shadow of the stair room and tank, and leave a gap between rows so one row never shades the next.
- Step 4: Battery or no battery? A grid tied system switches off when the grid fails. A battery keeps important loads running, but costs a lot and needs replacing.
- Grid tied, no battery · Hybrid with backup battery · Off grid

### 4. Simulator

- Live solar simulator: Change the weather, the season and the school's loads, and watch the power change.
- Play day · Pause · Time of day · Month
- Weather: Clear · Hazy · Partly cloudy · Overcast · Monsoon rain · Dust storm
- Cloud cover · Dust and smoke in the air · Days since panels were cleaned · Shade from the tree · Air temperature · Wind
- School loads: Classroom lights · Ceiling fans · Computer lab
- Solar power now · Sunlight on panels · Panel temperature · School is using · Sending to grid · Buying from grid · Made today so far
- What is cutting output: Clouds · Dust in the air · Rain · Dirty panels · Shade · Hot panels

**Challenges**

- Rainy day lunch: It is pouring at noon. Keep the school off the grid between 11:30 and 12:30 by switching off what is not needed.
- Find the peak: Move the time to the moment the panels make the most power today.
- Beat the heat: A hot, still, dusty noon. Get the panels to their best possible output without changing the sky or the time.
- Pay nothing on a cloudy day: Make the day's solar cover a 7 hour school day without changing the weather.

### 5. Safety

**The golden rule.** Panels make electricity whenever there is light, and switching off the inverter does not stop them. Students learn by watching and reading the data. Only a trained, licensed technician opens boxes or touches wiring.

**Spot the hazard.** Cracked panel glass · Loose MC4 connector · Cable lying in water · Combiner box left open · Burn marks on the inverter · Broken earth wire · Gap in the roof wall · Soap and a hard brush.

**Protective gear.** Insulated gloves · Safety shoes · Safety helmet · Harness and lifeline · Safety glasses · Insulated tools · Multimeter or clamp meter · Lock and tag · Soft brush and plain water · First aid kit.

**Shutdown order (technicians only).**

1. Switch off the AC breaker
2. Switch off the inverter
3. Open the DC isolator
4. Wait at least 5 minutes
5. Lock, tag and test

To start up again, go in reverse.

**Do.** Watch from the ground or a safe railing · Clean with plain water and a soft brush · Clean in the early morning or evening · Wear rubber soled shoes · Report anything odd to a teacher.

**Don't.** Climb on the roof alone · Stand, sit or lean on panels · Touch cables, connectors or open boxes · Use soap or pressure washers · Go near the system in rain or lightning.

**Warning signs.** Burning smell or smoke · Sparks, crackling or buzzing · Melted or brown connectors · Cracked glass or a hot panel · Fault code on the inverter.

**Emergency** 112 · **Fire** 101

### 6. Data detective

Each case is one day of data. Compare the measured power with a healthy system, then name the problem: Shade in the morning · Dirty panels · Passing clouds · Inverter or grid trip · One string disconnected · Inverter too small (clipping).

### 7. Careers

Solar PV installer · O&M technician · Electrician (ITI) · Solar site engineer · Energy data analyst. Start after class 10 with ITI, then a Suryamitra course at 18, or after class 12 with a diploma or B.Tech.

### 8. Certificate

Your progress · Name on the certificate · Download certificate · Certificate of Completion · This certifies that {name} has completed the Bhanu AI solar course.

## Learn: full detail

### Quizzes

Each lesson ends with a quiz. The correct answer is marked ✓ and followed by its explanation.

**Check: how solar works**

1. What kind of electricity do solar panels make? a) DC, direct current ✓ b) AC, alternating current c) Both at once. Panels make DC. The inverter turns it into AC for the school.
2. What does the inverter do? a) Stores energy for the night b) Turns DC into AC ✓ c) Measures dust on the panels. It changes DC into 230 V AC that matches the grid.
3. 10 panels of 41.6 V each are wired in series. What is the voltage? a) 41.6 V b) 416 V ✓ c) 4,160 V. In series the voltages add up: 10 × 41.6 = 416 V.
4. Why do solar systems use high voltage and low current? a) Less energy is lost as heat in the cables ✓ b) The panels last longer c) It makes cleaning easier. Cable heat is current × current × resistance, so lower current wastes much less.
5. When panels get hotter, their voltage… a) goes up b) goes down ✓ c) stays the same. About 0.3% less voltage for every degree above 25 °C.

**Check: components**

1. Which part counts units sent to and bought from the grid? a) Inverter b) Net meter ✓ c) Combiner box. The two-way net meter is fitted by the DISCOM.
2. Where does the lightning arrester send a lightning strike? a) Into the earth pit ✓ b) Into the inverter c) Into the water tank. The down conductor carries it safely into the earth pit.
3. Which part is optional in a grid-tied school system? a) Earthing b) Inverter c) Battery bank ✓. With net metering the grid acts like a battery, so many schools skip one.
4. What are MC4 connectors for? a) Joining panel cables ✓ b) Measuring dust c) Switching the fans. They snap DC cables together with a watertight lock.

**Check: sizing**

1. A school uses 20 kWh a day for 230 school days. How much a year? a) 460 kWh b) 4,600 kWh ✓ c) 46,000 kWh. 20 × 230 = 4,600 kWh.
2. Each kWp makes 1,500 kWh a year. What size covers 4,500 kWh? a) 1.5 kWp b) 3 kWp ✓ c) 4.5 kWp. 4,500 ÷ 1,500 = 3 kWp.
3. At about 10 m² per kWp, how much roof does 5 kWp need? a) 5 m² b) 50 m² ✓ c) 500 m². 5 × 10 = 50 m² of shadow free roof.
4. What is the cheapest way to need a smaller system? a) Use efficient appliances like BLDC fans ✓ b) Run the pump at night c) Add more lights. Every unit you do not use is a unit you do not need to make.

**Check: what changes output**

1. Around what time do panels usually make the most power? a) 8 am b) Around noon ✓ c) 5 pm. The sun is highest at noon, so its light passes through the least air.
2. How does wind help a solar system? a) It cools the panels ✓ b) It turns the panels to face the sun c) It charges the battery. Cooler panels have higher voltage, so they make more power.
3. How do monsoon clouds cut output? a) They make the panels wet b) They block sunlight ✓ c) They cool the inverter. Thick cloud can block three quarters of the sunlight.
4. Panels left uncleaned for 60 days lose about… a) 2% b) 15 to 25% ✓ c) 90%. In dry weather dust can take 0.3 to 0.6% a day. Regular cleaning pays off.

**Check: safety**

1. The inverter is switched off. Are the panels safe to touch? a) Yes, everything is off b) No, panels make voltage whenever there is light ✓ c) Only at night they are live. Panels produce DC voltage in any daylight, even with the inverter off.
2. A technician is shutting the system down. What comes first? a) Unplug the MC4 connectors b) Switch off the AC breaker ✓ c) Spray the panels with water. AC side first, then the inverter, then the DC isolator. Pulling connectors under load can cause an arc.
3. When is the best time to clean the panels? a) Early morning or evening ✓ b) At noon, when they are brightest c) During a thunderstorm. Panels are cool and making little power. Cold water on hot glass can crack it.
4. What should be used on an electrical fire? a) A bucket of water b) A CO₂ or dry powder extinguisher ✓ c) A wet cloth. Water conducts electricity. Use CO₂ or dry powder, and call 101.
5. You smell burning near the inverter. What do you do? a) Open the cover to look b) Keep away and tell a teacher straight away ✓ c) Switch it off and on again. Move away, keep others away and let the teacher call the technician.

### Size it: details

**Saving tips for the biggest users**

- LED tube lights: Already LED. Switch them off in empty rooms and use daylight near windows.
- Ceiling fans: BLDC fans use about 30 W instead of 70 to 75 W for an old fan, which would more than halve this.
- Computers: Set computers to sleep after 10 minutes and switch monitors off at lunch.
- Projector: Switch the projector off between lessons. It uses a lot while idle.
- Water pump: Run the pump around noon, when the panels make the most power.
- Water purifier: Fine as it is. Keep the filters clean so it does not run longer than needed.
- Outdoor lights: Night lights run on grid power. A motion sensor or timer would cut this.
- Anything else: Check that it is switched off when not needed.

**Sizing notes**

- Each kW of panels in {state} makes about {yield} kWh a year. With net metering, power made on holidays and weekends is credited too.
- The exact need is {kwp} kWp, rounded up to whole panels.
- The current {size} kWp system covers about {percent}% of this school's use.
- The roof is too small for full coverage. Lower the share to cover, or add panels over a car park or walkway.
- Larger systems, often above 5 to 10 kW depending on the DISCOM, need a three phase connection and approval for a larger net meter [31].
- Export credit is taken as ₹3 per extra unit; the real rate depends on the DISCOM [11]. Roof area uses about 10 m² per kWp [28].

**Roof planner**

- Roof length, east to west · Roof depth, north to south · Stair room on the roof · Water tank on the roof
- South: panels face this way
- Panels that fit · Most the roof can hold · Your plan needs · Gap between rows
- Fits. The filled panels are your plan, the dashed ones show spare room.
- Only {fits} of {needed} panels fit. Use a bigger roof area, a walkway canopy, or cover less of the school's use.

**Battery or no battery**

- Power cuts in school hours · Loads to keep on in a cut · Battery type: Lithium (LFP) · Lead acid
- Option · Battery · Extra cost · Battery wear a year · In a power cut · Net metering
- Grid tied, no battery: Switches off during a power cut, for line workers' safety.
- Hybrid with backup battery: Keeps {kw} kW of chosen loads running for {hours} h.
- Off grid: No grid at all. Runs everything, until a few cloudy days in a row drain it.
- Best fit for this school
- Lithium (LFP) batteries use 90% of their capacity and last about 10 years. Lead acid batteries use 50% and last about 4 years. Prices are rough guides. Battery wear is the battery cost spread over its life.

### Simulator: tips

- The sun is down, so the panels make nothing. The school runs on grid power until morning.
- Cleaning the panels would add about {kw} kW right now.
- Trimming the tree that shades the panels would add about {kw} kW.
- The panels are hot. A stronger breeze would cool them and add about {kw} kW.
- Clouds are the biggest loss right now. Nothing to fix, the panels will recover when the sky clears.
- Dust in the air is blocking sunlight. It usually clears after rain.
- Conditions are good. This is close to the best this system can do at this hour.
- Tip: click the switchboard next to the door to turn lights, fans and computers on or off.
- Challenge status: Goal reached · In progress · Start · Restart · Play again

### Safety: details

**Spot the hazard**

This school roof has 8 problems that make it unsafe. Tap everything that looks wrong. Some things are there on purpose, so look carefully.

1. Cracked panel glass. Why: Rain gets inside and live parts can be exposed. A cracked panel can give a shock or start a fire. What to do: Do not touch it. Tell a teacher so a technician can replace the panel.
2. Loose MC4 connector. Why: DC power can jump across a small gap as an arc, which is hot enough to start a fire. What to do: Keep away. A technician shuts the system down before reconnecting it. Never pull connectors apart.
3. Cable lying in water. Why: Water and damaged insulation can cause shocks and earth faults. What to do: Report it. Cables should be clipped in trays, off the roof floor.
4. Combiner box left open. Why: The terminals inside carry DC at up to 500 V, enough to kill. What to do: Do not close it yourself. Tell a teacher. A technician checks it and locks it.
5. Burn marks on the inverter. Why: Scorch marks mean overheating or an arc inside. It could catch fire. What to do: Move away and tell a teacher straight away. A technician shuts it down, AC side first.
6. Broken earth wire. Why: Without earthing, the metal frames can become live during a fault or lightning strike. What to do: Report it. A technician reconnects the wire and tests the earth pit.
7. Gap in the roof wall. Why: Falls are the most common serious injury on rooftops. What to do: Stay well back from edges. The school needs a railing, and anyone working near the edge wears a harness.
8. Soap and a hard brush. Why: Soap and stiff bristles scratch the glass coating and cut output. Cold water on hot panels can crack them. What to do: Clean with plain water and a soft brush, in the early morning or evening.

Not hazards: Fire extinguisher (a CO₂ extinguisher next to the inverter is exactly right; check its gauge each month) · DC danger sign (warning signs tell people the equipment is live; keep them clean and readable).

Buttons and messages: Give me a hint · Show the rest · Start again · Looks fine · All 8 hazards found. Great spotting. Remember: you find it, you report it, a trained technician fixes it.

**Protective gear**

Pick a job to see what to wear and carry for it. Students only help with cleaning and inspection, always with a teacher. Jobs: All · Cleaning panels · Inspection · Electrical work · Near roof edges.

- Insulated gloves. Protects from electric shock through the hands. Class 0 rubber gloves, rated 1,000 V. Check for holes before every use.
- Safety shoes. Protects from shocks, slips and dropped tools. Rubber soled, electrical hazard rated, with toe protection.
- Safety helmet. Protects from head injuries from falls and low frames. Hard hat with a chin strap for roof work.
- Harness and lifeline. Protects from falls from the roof. Full body harness clipped to a fixed anchor, or a guard rail, for anyone working near an unguarded roof edge [40].
- Safety glasses. Protects from glare, flying dust and sparks. UV protective, shatter resistant lenses.
- Insulated tools. Protects from shock while tightening or cutting. Screwdrivers, pliers and MC4 spanners rated 1,000 V.
- Multimeter or clamp meter. Protects from touching something you thought was off. CAT III, 1,000 V DC rated. Test before you touch.
- Lock and tag. Protects from someone switching power back on. A padlock and a "Do not switch on" tag on each isolator during work.
- Soft brush and plain water. Protects from scratching the panel glass. Soft bristles, a long handle and no soap or pressure washer.
- First aid kit. For treating cuts and burns quickly. Kept by the stairs, checked each month. Know where it is.

**Shutdown drill**

Before anyone works on the system it must be shut down in the right order. Tap the steps from first to last.

1. Switch off the AC breaker. In the AC distribution board, so no power flows to the school or grid. Stop the load first, so nothing is disconnected while current flows.
2. Switch off the inverter. Using its own switch or display. The inverter stops drawing from the panels before the DC side is opened.
3. Open the DC isolator. This cuts panel power to the inverter. The panels themselves stay live. Opening DC under full load can arc, so it comes after the inverter is off.
4. Wait at least 5 minutes. Capacitors inside the inverter keep a charge after shutdown. The inverter needs time to discharge before anyone opens it.
5. Lock, tag and test. Padlock the isolators, hang a tag, then check with a meter that there is no voltage. Only a meter proves it is safe. Never trust a switch alone.

To start up again, go in reverse: remove locks, close the DC isolator, switch on the inverter, then the AC breaker. Messages: Not yet, this step comes later. What has to happen first? · Perfect, no mistakes · Done with {n} mistakes · Shuffle and try again.

**Rules and standards**

Every part of a safe system follows a standard. Installers and DISCOM inspectors check these. Students do not need to learn the numbers, only what they mean.

- Panel design and performance (IS 14286 / IEC 61215): The panel has passed heat, hail, damp and UV tests. Look for it on the label.
- Panel safety (IS/IEC 61730): The panel will not shock or catch fire under normal faults.
- DC connectors, MC4 (IEC 62852): Use matching connectors from one maker. Mixing brands can overheat.
- Solar DC cable (IEC 62930): UV and heat resistant cable made for rooftops, not ordinary house wire.
- Approved list of models and makers (ALMM, MNRE): Government-backed and net metered projects must use panels from this list [37].
- Inverter safety (IS 16221 / IEC 62109): The inverter is safe to touch from outside and protects against faults inside.
- Anti-islanding test (IS 16169 / IEC 62116): The inverter switches off when the grid fails, so line workers are safe.
- Connecting rooftop solar to the grid (CEA Connectivity Regulations, 2013, amended 2019): Sets the protection, metering and approvals the DISCOM checks before connection.
- Safety and electric supply (CEA Safety Regulations, 2023): Only licensed people work on live installations. Isolation, earthing and signage are required.
- Earthing (IS 3043): How earth pits are built and tested. Test them every year.
- Lightning protection (IS/IEC 62305): Rooftop arrays need an arrester and a down conductor to an earth pit.

Standards are revised from time to time. Check the latest versions with BIS, MNRE and the CEA before relying on them.

### Data detective: cases

Each case is one day of real-looking data from a {size} kWp system. Compare the measured power with what a healthy system should make, then name the problem.

1. Monday. A dry, clear day, but the morning looks wrong. Answer: Shade in the morning. Evidence: Output is low only before about 10 am, then jumps back to normal. Something is shading the panels while the sun is low in the east. What to do: Look east of the panels at sunrise. A tree branch or a new water tank is the usual cause.
2. Thursday. Clear sky all day, no rain for six weeks. Answer: Dirty panels. Evidence: The curve has the right shape but is about a quarter lower all day. A steady loss like this is dust on the glass. What to do: Clean the panels early in the morning with water and a soft brush.
3. Saturday in July. The monsoon is starting. Answer: Passing clouds. Evidence: The power jumps up and down quickly through the day. Each dip is a cloud passing in front of the sun. What to do: Nothing to fix. The system recovers as soon as the sky clears.
4. Tuesday. Clear sky, but someone says the lab computers went off after lunch. Answer: Inverter or grid trip. Evidence: Output drops straight to zero at midday and comes back 90 minutes later. Clouds never cut it to zero, so the inverter stopped. It does this when the grid fails, for line workers' safety, or when it has a fault. What to do: Check the inverter display for a fault code and ask the DISCOM about a power cut. Report repeated trips to the technician.
5. Friday. Clear sky, every panel looks clean. Answer: One string disconnected. Evidence: Exactly half the expected power, all day. With two strings, that means one string is not reaching the inverter, often a loose MC4 connector or a blown fuse. What to do: Do not touch anything. Tell the technician, who will shut down and check the string with a meter.
6. A new school with lots of panels on a cool, clear day. Answer: Inverter too small. Evidence: The curve is normal in the morning and evening but flat across the middle of the day. The inverter has reached its limit and cannot pass on more power. This is called clipping. What to do: A little clipping is normal. A long flat top means the inverter is undersized for the panels.

Labels: Measured · Healthy system · Solved · Not quite. It was: {answer} · The evidence · What to do · Next case · Previous · All cases done: {n} of 6 solved.

### Careers: details

India is adding solar faster than almost any country [7], and every system needs people to build, run and repair it.

- Solar PV installer (₹12,000 to ₹20,000 a month to start). What they do: Fixes mounting frames, lays panels, runs DC cables and connects MC4 plugs on rooftops. How to start: After class 10 and an ITI (Electrician, Wireman) or a diploma, aged 18 or over. The free Suryamitra course from NISE (about 3 months) is the common start. Practise it here: Components · Series or parallel · Safety.
- O&M technician (₹15,000 to ₹25,000 a month). What they do: Cleans and inspects systems, reads inverter faults, tests earthing and fixes small problems. How to start: Suryamitra or an SCGJ solar technician certificate, plus site experience. Practise it here: Spot the hazard · Shutdown drill · Soiling data.
- Electrician, ITI (₹15,000 to ₹30,000 a month). What they do: Wires inverters, AC boards and net meters, and holds the licence needed for grid connection. How to start: ITI Electrician (2 years) after class 10, then a state wireman or supervisor licence. Practise it here: Voltage and current · Safety.
- Solar site engineer (₹25,000 to ₹60,000 a month). What they do: Sizes systems, plans roof layouts, checks string design and manages installation teams. How to start: Diploma or B.Tech in Electrical (EEE) engineering. Practise it here: Size it · Roof planner · Returns.
- Energy data analyst (₹25,000 a month and up). What they do: Watches monitoring dashboards like this one, spots drops in output and plans cleaning and repairs. How to start: Class 12 with maths, then a diploma or degree in computers, data or engineering. Practise it here: Simulator · Soiling data · AI Advisor.

Your path from here:

1. Now, in school: Finish every lesson here, help your teacher with monthly inspections, and keep a log of the school system.
2. After class 10: Join ITI Electrician or Wireman. Then, at 18, a Suryamitra or SCGJ solar technician course [41, 42].
3. After class 12: A diploma or B.Tech in electrical engineering leads to design and engineering roles.
4. First job: Start on installation or maintenance teams. Site experience matters more than anything else.

Pay is a rough guide and varies by state and employer. Check course dates with NISE (Suryamitra) and the Skill Council for Green Jobs.

### Certificate: steps

Progress is saved on this device. Quizzes need 80% to count.

1. Quiz: how solar works (4 of 5)
2. Quiz: components (4 of 4)
3. Size the school system and apply it
4. Quiz: sizing (4 of 4)
5. Finish 2 simulator challenges
6. Quiz: what changes output (4 of 4)
7. Find all 8 rooftop hazards
8. Complete the shutdown drill
9. Quiz: safety (4 of 5)
10. Solve the data detective cases

Certificate text: Bhanu AI Solar School · Certificate of Completion · This certifies that {name} has completed the Bhanu AI solar course: how solar works, components, system sizing, the live simulator, rooftop safety and data detective. · {school}, {village}, {state} · Teacher · Date.

### Teacher guide

A plan for each lesson, questions to discuss, and a worksheet to download and print. Answer keys are hidden until you open them. One 40 minute period per lesson.

**How it works.** Goal: Students can trace energy from the sun to the classroom and explain voltage, current and power.

- 5 min: Ask: where does the power for our fans come from? Write answers on the board.
- 10 min: Follow the energy together, tapping each step on the projector.
- 15 min: Pairs try the series and parallel lab: wire 10 panels each way and compare current and cable loss.
- 10 min: Quiz, then discuss the answers they missed.
- Discuss: Why does the school run on AC if the panels make DC? Why would an electrician choose series over parallel?
- Activity: Read the inverter display at lunch and at 4 pm. Write both kW numbers. Which is higher and why?

**Components.** Goal: Students can name the 10 parts of the school system and what each does.

- 5 min: Show the school drawing. Ask who has seen any of these parts.
- 15 min: Walk outside and find the real inverter, net meter and earth pit, from a safe distance.
- 10 min: Back in class, match each number on the drawing to a part.
- 10 min: Quiz.
- Discuss: Which part would you check first if the dashboard shows zero power? Why is the battery optional here?
- Activity: Draw your own school roof and mark where each part is.

**Size it.** Goal: Students can estimate the school's energy use and size a system for it.

- 15 min: Groups count lights, fans and computers in two rooms and read their watt labels.
- 10 min: Enter the counts in the audit and compare with the sample school.
- 10 min: Use the sizing step, then plan the roof using real measurements.
- 5 min: Quiz.
- Discuss: Which change would cut our energy use the most? Is a battery worth it for our power cuts?
- Activity: Measure the roof with a tape (with a teacher). Enter the size in the roof planner.

**Simulator.** Goal: Students can explain how weather, dust, heat and shade change solar output.

- 5 min: Predict: will panels make more on a hot day or a cool day?
- 15 min: Pairs try the four challenges and note what they changed.
- 10 min: Share: which challenge was hardest and why?
- 10 min: Quiz.
- Discuss: Why does a cool, windy day help the panels? What can the school control, and what can it not?
- Activity: Note the weather each day for a week and compare with the real Soiling tab readings.

**Safety.** Goal: Students know the golden rule, spot hazards and know what to do when they see one.

- 5 min: Golden rule: panels are always live in daylight. Students repeat it.
- 10 min: Spot the hazard as a class on the projector.
- 10 min: Protective gear and shutdown drill in pairs.
- 5 min: Rules and standards: which ones apply to our school?
- 10 min: Quiz. All students must pass before helping with cleaning.
- Discuss: What would you do if you saw a cable lying in water? Why must the AC side be switched off first?
- Activity: Make a safety poster for the stairs to the roof.

**Data detective.** Goal: Students can read a power curve and diagnose common problems.

- 5 min: Draw an ideal day curve on the board together.
- 20 min: Pairs solve the cases and write down their evidence.
- 15 min: Compare with the real Overview and Soiling charts.
- Discuss: What does a flat top on the curve mean? How can you tell clouds from dust?
- Activity: Check the dashboard each morning for a week. Report anything unusual.

Buttons: Download worksheet · Download answer key · Show answers · Hide answers. Worksheet header: Name · Class · Date · Questions · Think about it · Activity.

## Mission

**Same Sun ☀ Same Chance**

**How it started**

"Sunlight already reaches every school in rural India. Knowledge should too. I'm starting with my father's village." (Sai Karri, founder)

Bhanu AI began with my dad's village in Ganaparthi: teaching students about solar energy, data management and becoming solar technicians. Bhanu AI isn't just about efficiency; it's a social framework. We use these systems as educational hubs, so students who learn to read local solar data grow into the technologists who maintain their own energy future and unlock global career paths. Ganaparthi is the first school. The goal is every school.

**The Bhanu AI mission**

Every rural school powered by the sun, and every student able to understand it.

Over 73,000 schools in India still have no electricity at all, and many rural schools that are connected face long power cuts [1]. Bhanu AI turns a school's rooftop solar system into three things at once: a power plant that runs lights, fans and computers in the daytime and cuts the bill, a classroom where students learn from real data, and a training ground for the jobs a solar powered world needs. It starts in one village and is built to work in any school, in any state, in any country with sun.

**One roof, three jobs**

- Tap each one to see what it means for the school.
- A power plant: Daytime power for lights, fans and computers, made on the school roof. Every unit made on the roof is a unit the school does not buy. Spare units go to the grid and earn a credit on the bill. Button: See today's power
- A classroom: Students learn science from real data on their own roof. Lessons on how solar works, safety, sizing and a live simulator, plus quizzes and a certificate. Button: Open the lessons
- A training ground: The first step to skilled solar jobs, starting in class 6. Students who clean, log and check the system learn the same skills installers and technicians use every day. Button: Explore careers

**Who it helps**

- Children · Community · Companies and the world · {n} of 3 · Next: {group} →
- Children: Cooler, brighter classrooms: Heat makes learning harder [3]. Daytime solar runs lights and fans and cuts the bill. With a backup battery, they stay on through power cuts too.
- Children: Computer labs that cost less: Daytime solar runs the lab. A UPS or battery keeps computers on through power cuts and voltage dips.
- Children: Science they can touch: Students read data from their own roof, test ideas in the simulator and see the results the next day.
- Children: A path to skilled work: The same skills used by solar installers, technicians, engineers and data analysts, starting in class 6.
- Community: Money that stays local: Lower electricity bills free up school funds for books, meals and materials.
- Community: Jobs close to home: Every system needs trained people nearby to clean, inspect and repair it.
- Community: A stronger village grid: Schools make power in the daytime, when feeders are most strained, and send spare units to neighbours through the grid.
- Community: Cleaner air and a model to copy: Parents and farmers see clean power working every day, and bring it to their homes and fields.
- Companies and the world: A trained workforce: India aims for 500 GW of non-fossil power capacity by 2030 [6]. Every gigawatt needs thousands of skilled people [20], and schools are where they start.
- Companies and the world: Data from hard climates: Daily readings from hot, dusty and monsoon conditions help makers and installers build panels and maintenance plans that last.
- Companies and the world: A programme anyone can fund: Simple tools and open lessons that companies, CSR programmes and NGOs can bring to any school, anywhere.
- Companies and the world: Real climate progress: Each unit from India's grid releases about 0.72 kg of CO₂ [18], so each school avoids tonnes a year. Across thousands of schools, that adds up.

**The problems we are solving**

- 73,000+ schools in India still have no electricity at all [1]. About 1 in 15 schools has no working electricity. Where schools are connected, long power cuts and heat still cut lessons short.
- With Bhanu AI: Solar power runs fans and lights in the daytime and cuts the bill. A grid-tied system switches off in a power cut, so where cuts are long, add a backup battery to keep them on [5].
- 17% of India's electricity is lost on the grid [4]. Transmission and distribution losses waste power on the way, and losses are often higher on long rural lines.
- With Bhanu AI: Power made on the school roof is used right where it is made, and schools become small energy hubs that ease the rural grid during the day.
- See the fix · Hide the fix

**One school, then a thousand**

- Slide to see what schools like this one add up to in a year.
- Schools: 1 · 10 · 100 · 1,000 · 10,000 · 1 lakh
- {n}% of India's roughly 10 lakh government schools [2]
- Clean power (GWh a year) · CO₂ avoided (tonnes a year) · Bills saved (a year) · Students learning solar · Local technicians trained · Trees equivalent
- Rough guide: about 250 students and 2 trained technicians per school, with this school's size and sunshine.

**Bring it to the next school**

- Size a system for a school, show a funder the numbers, or start teaching with the lessons.
- See the funding options · Start the lessons · Share the impact


## Impact

- {school} runs on sunshine
- {village}, {state}. A {size} kWp rooftop solar system powers our classrooms, fans and computer lab.
- kWh of clean power a year · saved on electricity bills a year (rough guide) · tonnes of CO₂ avoided a year · trees would be needed to absorb the same · classrooms whose daytime lights and fans the solar power covers · library books the savings could buy (rough guide, ₹250 a book)
- Power through the year: Less in the monsoon months, most in the dry, sunny spring.
- Students learn solar: Every class learns how the system works, how to keep it safe and how to read its data.
- Power made at school: Lights and fans run on power made on the school roof, easing the load on the village grid.
- Savings stay in school: Money not spent on electricity goes to books and learning materials.
- Help the next school go solar: Send a company's CSR team or a bank the one page summary, or share this page with parents and the village.
- Download funder summary · Making the PDF… · Copy share link · Link copied
- Figures are estimates for a typical year from the system size and local sunshine.

## Chart summaries (read by screen readers)

- Typical day: solar output starts about 6:00, peaks at about {kw} around {time}, and stops about 18:00.
- Monthly generation: highest in {month} at about {n} kWh, lowest in {month} at about {n} kWh. June to September are monsoon months with less sun.
- 20 year cash flow: starts at minus {cost} after grants, breaks even in year {n}, and ends {amount} by year 20. · does not break even within 20 years
- Dust vs efficiency: each dot is one day from the last 120 days. Efficiency falls steadily as more dust covers the panels.
- Measured output compared with a healthy system. Clue: {clue}
- One 540 W panel: the most power is about {w} W at {v} V. With no load the voltage is {v} V; shorted, the current is {a} A.
- Power through the year: most in {month} at about {n} kWh, least in {month} at about {n} kWh, during the monsoon.
- What if: with these settings the school breaks even in year {n}, against year {n} in the simple estimate, and is {amount} ahead by year 20.
- Money lost each day as dirt builds up: from nothing on cleaning day to about {amount} a day after 60 days. The best gap between cleanings is {n} days.
- Energy each day for six days before and after the last cleaning: about {n} kWh a day before and {n} kWh a day after.

## Sources

Numbers in square brackets, like [1], match the numbered sources on the site's Sources tab. Sources were checked in October 2026; titles are shortened. Figures change, so open the link before quoting a number.

### Schools, power and the grid

- [1] 67.4% of Indian schools now online, yet over 73,000 still without electricity. Education for All in India, analysing UDISE+ 2025-26 (Ministry of Education). https://educationforallinindia.com/67-4-of-indian-schools-now-online-yet-over-73000-still-without-electricity/
- [2] From classrooms to policy: analysing UDISE+ 2024-25 data. Education for All in India, analysing UDISE+ (Ministry of Education). https://educationforallinindia.com/from-classrooms-to-policy-analysing-udise-2024-25-data/
- [3] Indian schools are unprepared to deal with increasing heat waves. Scroll.in, citing UDISE+ 2021-22. https://scroll.in/article/1049763/indian-schools-are-unprepared-to-deal-with-increasing-heat-waves-are-already-disrupting-education
- [4] India's power sector loses 16.64% of energy. The Sunday Guardian, reporting Ministry of Power data for FY 2023-24. https://sundayguardianlive.com/news/indias-power-sector-bleeds-loses-1664-energy-136604/
- [5] Connectivity of distributed generation resources (regulations). Central Electricity Authority. https://cea.nic.in/regulations-category/connectivity-of-distributed-generation-resources/?lang=en
- [6] India achieves 300 GW of renewable capacity, 60% of its 500 GW target for 2030. Outlook Business, citing MNRE. https://www.outlookbusiness.com/news/india-achieves-300-gw-re-capacity-60-of-500-gw-target-by-2030
- [7] India becomes the world’s second largest solar growth market in 2025. Vision IAS, citing IRENA Renewable Capacity Statistics. https://visionias.in/current-affairs/news-today/2026-06-04/environment/india-becomes-the-worlds-second-largest-solar-growth-market-in-2025-environment-minister

### Money: subsidies, tariffs and funding

- [8] India approves financial aid for rooftop solar Phase II. TaiyangNews. https://taiyangnews.info/india-approves-financial-aid-for-rooftop-solar-ph-ii
- [9] Grid connected rooftop solar programme Phase II: operational guidelines (20 Aug 2019). MNRE (copy hosted by JBVNL). https://jbvnl.co.in/SOLAR/MNRE%20Phase%20II%20Guideline%2020.08.2019.pdf
- [10] MNRE issues guidelines for PM Surya Ghar rooftop solar implementation models. SolarQuarter, reporting MNRE. https://solarquarter.com/2025/01/16/mnre-issues-guidelines-for-pm-surya-ghar-rooftop-solar-implementation-models
- [11] KSERC upholds ₹3.26 APPC rate, rejects rooftop solar prosumers’ appeal in Kerala. SolarQuarter. https://solarquarter.com/2026/07/28/kserc-upholds-inr-3-26-appc-rate-rejects-rooftop-solar-prosumers-appeal-in-kerala/
- [12] Demystifying India’s rooftop solar policies. CEEW. https://www.ceew.in/sites/default/files/demystifying-india-rooftop-solar-policies.pdf
- [13] MNRE benchmark costs for rooftop solar. Indian Infrastructure. https://indianinfrastructure.com/?p=161858
- [14] Electricity tariff and duty, and average rates of electricity supply in India. Central Electricity Authority. https://cea.nic.in/api/dashboardReports/view-pdf/en/dd3e9b77-3057-4cfd-a5af-e29760561052
- [15] Schedule VII of the Companies Act, 2013. Companies Act 2013 text (ca2013.com). https://ca2013.com/schedule/schedule7-3/
- [16] How long do residential solar inverters last?. pv magazine. https://www.pv-magazine.com/2025/08/06/how-long-do-residential-solar-inverters-last-5/
- [17] Solar battery price in India. QuickEstimate. https://quickestimate.co/blog/solar-battery-price-india

### Climate and carbon

- [18] CO2 Baseline Database highlights India’s progress in renewable energy. SolarQuarter, reporting CEA CO2 Baseline Database Version 20.0. https://solarquarter.com/2025/01/06/co2-baseline-database-highlights-indias-progress-in-renewable-energy-and-emission-reduction-cea/
- [19] How much CO2 does a tree absorb?. One Tree Planted. https://onetreeplanted.org/blogs/stories/how-much-co2-does-tree-absorb
- [20] Doing green jobs right. NRDC, on the CEEW-NRDC-SCGJ jobs study. https://www.nrdc.org/bio/anjali-jaiswal/doing-green-job-right-0

### How panels behave

- [21] Photovoltaic degradation rates: an analytical review. NREL (Jordan and Kurtz). https://www.nrel.gov/docs/fy13osti/56690.pdf
- [22] Photovoltaic lifetime project. NREL. https://www.nrel.gov/pv/lifetime.html
- [23] Measuring the temperature coefficients of a PV module. Sinovoltaics. https://sinovoltaics.com/solar-basics/measuring-the-temperature-coefficients-of-a-pv-module
- [24] The long read: the impact of dust on solar panels matters. pv magazine India (interview with IIT Bombay researchers). https://pv-magazine-india.com/2021/07/10/the-long-read-the-impact-of-dust-on-solar-panels-matters
- [25] Soiling of PV modules: losses and the cleaning effect of rain. Solar Energy (Elsevier), Valerino et al. 2020. https://www.solideas.com/wp-content/uploads/2024/07/valerino_SE_2020_soiling.pdf
- [26] pvlib.clearsky.haurwitz. pvlib python (Sandia PV Performance Modeling Collaborative). https://pvlib-python.readthedocs.io/en/latest/reference/generated/pvlib.clearsky.haurwitz.html
- [27] Kasten and Czeplak (1980) cloud cover model, as used in CSBE paper 17057. Canadian Society for Bioengineering. https://library.csbe-scgab.ca/docs/meetings/2017/CSBE17057.pdf
- [28] FAQ for consumers: grid connected rooftop solar. MNRE (copy hosted by JBVNL). https://jbvnl.co.in/SOLAR/MNRE%20FAQ%20for%20consumer.pdf
- [29] Solar generation by state in India. Heaven Green Energy, citing MNRE solar atlas data. https://www.heavengreenenergy.com/blog/solar-generation-by-state
- [30] BLDC fans. Bajaj Electricals. https://www.bajajelectricals.com/collections/bldc-fan
- [31] Net metering and gross metering in India. Secure Meters. https://www.securemeters.com/net-metering-and-gross-metering-in-india/

### Weather and seasons

- [32] India gets a new monsoon calendar. The Week, reporting IMD. https://www.theweek.in/news/india/2020/04/15/india-gets-new-monsoon-calendar-imd-predicts-normal-rainfall-this-year.amp.html
- [33] Northeast monsoon 2024 report. IMD Regional Meteorological Centre, Chennai. https://mausam.imd.gov.in/chennai/mcdata/ne_monsoon_2024.pdf
- [34] Stubble burning season begins. Down To Earth. https://www.downtoearth.org.in/air/stubble-burning-season-begins-madhya-pradesh-ranks-first-punjab-second-and-uttar-pradesh-third

### Standards and safety

- [35] MNRE issues Solar Systems, Devices and Components Goods Order 2025. Aleph India, summarising the MNRE order. https://alephindia.in/mnre-issues-solar-systems-devices-and-components-goods-order-2025.php
- [36] Published standards: solar photovoltaic energy systems. Bureau of Indian Standards. https://www.services.bis.gov.in/php/BIS_2.0/dgdashboard/published/sub_grp_stn_list/73
- [37] What is ALMM?. CEEW Centre for Energy Finance. https://www.ceew.in/cef/quick-reads/explains/what-is-almm
- [38] CEA notifies Measures relating to Safety and Electric Supply Regulations, 2023. Power Line. https://powerline.net.in/2023/06/20/cea-notifies-cea-measures-relating-to-safety-and-electric-supply-regulations-2023/
- [39] Class 0 insulating gloves (IEC 60903). TMG Test Equipment. https://tmgtestequipment.com.au/?p=3106
- [40] Fall protection: duty to have fall protection (1926.501). OSHA (United States). https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501

### Skills and careers

- [41] Suryamitra skill development programme. Vikaspedia, with MNRE. https://en.vikaspedia.in/viewcontent/energy/policy-support/renewable-energy-1/solar-energy/suryamitra-skill-development-programme
- [42] ITI Electrician trade. Government ITI Cacora, Goa. https://iticacora.goa.gov.in/?p=460
- [43] Solar installer salary in India. QuickEstimate. https://quickestimate.co/blog/solar-installer-salary-india

### Getting real data from the inverter

- [44] SmartPVMS 24.2.0 user manual: viewing and managing reports. Huawei (FusionSolar). https://support.huawei.com/enterprise/en/doc/EDOC1100331328/90b9638d/viewing-and-managing-report
- [45] Raw access to Growatt inverter data (forum thread). Power Forum. https://powerforum.co.za/topic/11621-raw-access-to-growatt-inverter-data/
