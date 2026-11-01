# Improvement ideas log

Written by the `ui-improver` agent so ideas are not repeated. The main session updates Status to "built" or "skipped" after Sai chooses.

| No. | Date | Tab | Idea | Status |
|---|---|---|---|---|
| 20 | 2026-10-21 | Overview, Returns, Maintenance | Charts draw in when scrolled into view, not before | built |
| 21 | 2026-10-21 | Overview, Impact, Returns | Big numbers count up the first time they are seen | built |
| 22 | 2026-10-21 | Logs, savings, readings | Saved rows slide in with a green tick; removed rows fade out | built |
| 23 | 2026-10-21 | Learn quizzes | Right answer pops green, wrong one shakes gently, score fills | built |
| 24 | 2026-10-21 | Learn | Steps bar fills smoothly; finished step chip gets a tick | built |
| 25 | 2026-10-21 | Overview | Live energy flow line: panels to school to grid, sized by power now | built |
| 26 | 2026-10-21 | Returns | Payback chart marker travels to the payback year | built |
| 27 | 2026-10-21 | Maintenance | High risk items get a soft red pulse on their dot | built |
| 28 | 2026-10-21 | All tabs | Shimmer placeholders while shared data loads | built |

## 2026-10-21 (round 2: clarity, phone, trust)

| No. | Date | Tab | Idea | Status |
|---|---|---|---|---|
| 29 | 2026-10-21 | Maintenance, Alerts | Mark sample faults as "Sample" and block or tag the WhatsApp send until real readings exist (nav badge 5 also comes from sample faults) | built |
| 30 | 2026-10-21 | Impact | Reword "classrooms with steady lights and fans" (reads as power through cuts) and label rupee and books figures as rough guides | built |
| 31 | 2026-10-21 | Overview | Replace the "Grants ₹0" stat with "Saved a year" (green); show grants in the payback caption only when set | built |
| 32 | 2026-10-21 | Maintenance | "Today" strip at the top: next cleaning, high risk count, checks due, with jump links (phone page is about 6,800px tall) | built |
| 33 | 2026-10-21 | Maintenance | Move Alerts and its WhatsApp button up beside the open items list; the one yellow action is now the last box | built |
| 34 | 2026-10-21 | Returns, Learn (phone) | Ways to pay table (and Size it and Electricity tables) become stacked cards on phone instead of sideways scroll | built |
| 35 | 2026-10-21 | All tabs (phone) | Tab strip is cut off ("AI Advis") with no hint: add edge fades and arrows, or a bottom bar for the main tabs | built |
| 36 | 2026-10-21 | AI Advisor | Outside claude.ai: one notice with an Open in claude.ai button, plus a sample answer under each card, instead of the same note four times | built |
| 37 | 2026-10-21 | Impact | Funder next step at the bottom: Download funder summary and Copy share link (replaces "add #impact to the link") | built |
| 38 | 2026-10-21 | Top bar, Overview | Make the "Sample data" badge a link to the inverter readings box, with a one-line "add your first reading" prompt | built |
| 39 | 2026-10-21 | All charts | Text summaries for screen readers on every chart (highest, lowest, payback year); phone monthly chart shows all 12 month letters | built |
| 40 | 2026-10-21 | Overview, Maintenance (desktop) | Inner scroll boxes (site sidebar, Maintenance list) cut text mid-line: add a bottom fade and "x more" hint | built |

## 2026-10-21 (segments)

New website ideas by market segment from the `segment-scout` agent. Full research in `research/segments-2026-10-21.md`. Batches: A 41, 52, 42 · B 47, 48, 46 · C 43, 44, 45 · D 49, 50, 58 · E 53, 54, 55 · F 56, 57, 51.

| No. | Date | Segment | Idea | Status |
|---|---|---|---|---|
| 41 | 2026-10-21 | Energy | Rooftop solar installer site with quote, subsidy and payback, then home solar care (cleaning log, readings, WhatsApp) for PM Surya Ghar vendors | suggested |
| 42 | 2026-10-21 | Energy, abroad | Bhanu AI made general for solar schools abroad (Africa NGOs, UK school energy programmes) | suggested |
| 43 | 2026-10-21 | Agriculture (AP) | Shrimp and fish pond log: water readings, feed, risk alerts | suggested |
| 44 | 2026-10-21 | Agriculture | FPO dashboard: members, inputs, produce, prices, board report PDF | suggested |
| 45 | 2026-10-21 | Agriculture | Village dairy collection centre: fat and SNF entries, rate chart, payout slips | suggested |
| 46 | 2026-10-21 | Health | Small clinic site with appointment requests, day list and WhatsApp reminders | suggested |
| 47 | 2026-10-21 | Education | Coaching centre manager: batches, attendance, fees, marks, parent messages, quizzes | suggested |
| 48 | 2026-10-21 | Education | Budget private school website with admissions enquiry, notices and fee reminders | suggested |
| 49 | 2026-10-21 | Local government | Gram panchayat works and funds board with grievance triage | suggested |
| 50 | 2026-10-21 | Finance literacy | SHG books plus Telugu scam safety lessons and quizzes | suggested |
| 51 | 2026-10-21 | Trades | Local trades booking and job log for electricians, plumbers, AC and solar technicians | suggested |
| 52 | 2026-10-21 | NGOs, abroad | NGO and CSR impact site: public impact page, activity log, funder report PDF | suggested |
| 53 | 2026-10-21 | Tourism | Village homestay and tribal tourism site (Araku, Lambasingi) with availability and enquiries | suggested |
| 54 | 2026-10-21 | Events | Function hall booking: calendar with muhurtham dates, advances and balances | suggested |
| 55 | 2026-10-21 | Real estate | Plot layout sales site: layout map with plot status and approval numbers | suggested |
| 56 | 2026-10-21 | Services, abroad | NRI property care: inspections with photos, rent, repairs, yearly PDF | suggested |
| 57 | 2026-10-21 | Education, abroad | Telugu lessons for diaspora kids with quizzes, progress and certificates | suggested |
| 58 | 2026-10-21 | Climate | Heat-safe schools: daily heat level, action checklist, incident log, red-day alerts | suggested |

## GridSight

### 2026-10-31 (website and UI ideas for the hackathon dashboard, `hackathon/app`)

Batches: A 59, 60, 61, 62 · B 63, 66, 69 · C 64, 65, 72 · D 67, 71 · E 68, 70. Feature batches already offered (weather, place search, transmission lines, similar villages, finance, current load proxy) are not repeated here.

| No. | Date | Tab | Idea | Status |
|---|---|---|---|---|
| 59 | 2026-10-31 | Site (top) | One-line headline plus "Roofs > Demand > Size and tariff" step strip; introduce Amina, who is named on Growth and Validation but never introduced | suggested |
| 60 | 2026-10-31 | Site, Demand, Growth, Validation | Shrink the repeated "Pick a site" box to one compact village bar after the Site tab; hide the lat/lon fetch tools behind "Any location" (takes the whole first screen now, about 1,170px on phone) | suggested |
| 61 | 2026-10-31 | Demand, Growth, Validation | Yellow "Next" button at the end of each tab (Size the mini-grid, See how we test it) so the demo walks itself; Demand has no next step now | suggested |
| 62 | 2026-10-31 | Demand | Answer sentence at the top (needs about 8,400 kWh a month, 38 kW peak after dark, about 121 kWp); fix "Most likely: 8,100" in Why this number, which clashes with the 8,400 headline | suggested |
| 63 | 2026-10-31 | Validation | Scorecard strip at the top (3 checks with pass, partial, waiting chips); shade confusion matrix cells by count, show 0 in empty cells and a per-row hit rate; 2,225 on screen vs 2,256 in the changelog | suggested |
| 64 | 2026-10-31 | Site map | Bigger, outlined dots for clinics, schools and shops (lost under 1,000 blue homes); "1 km" ring label; "only non-homes" toggle; drop the power line legend item or add an off-map arrow when the nearest line is 13.9 km away; click a table row to find it on the map | suggested |
| 65 | 2026-10-31 | Growth | Round tariff chart x ticks (3,621, 7,121 now); mark the chosen sizing year and P level on the growth chart; move the "existing 85 kWp plant" label off the band | suggested |
| 66 | 2026-10-31 | Growth, Site | Count-ups and draw-on-scroll show "0 kWp, $0k, $0.00", "0 buildings" and blank charts until scrolled into view: show final values in print, full-page shots and when opened by tab link | suggested |
| 67 | 2026-10-31 | All tabs (phone) | Sticky header is about 100px with Data sharing and Method off screen: shorter tab names or two-row wrap, compact header on scroll; chips and segmented controls 36px tall, raise to 44px; "Size for" label sits alone | suggested |
| 68 | 2026-10-31 | Method | Turn "How GridSight works" into a 6-step flow filled with this village's numbers (1,229 roofs > 486 customers > 8,400 kWh > 121 kWp > $0.70 a kWh); right half of the box is empty now | suggested |
| 69 | 2026-10-31 | Header, footer | Trust line: data date, 5 villages in 5 countries, 1,500 futures, open pipeline link; "Rough guide" badge next to every money figure | suggested |
| 70 | 2026-10-31 | All tabs | Demo mode: number keys and arrow keys move between tabs, small step dots, picker hidden, for the 3-minute pitch | suggested |
| 71 | 2026-10-31 | Data sharing | Example row is cut off on the right: show it as a field list with plain meanings (or wrap), and give "Who gets what" small meaning-colour markers | suggested |
| 72 | 2026-10-31 | Site | Buildings table: fold behind "Show all buildings" for judges; keep the "Why" column on phone as a second line; larger sort controls | suggested |

## To do later for Bhanu AI (saved 2026-11-01, from the GridSight "less scrolling" batches)
- Put long explanations behind a small "Why?" toggle, keeping a one-line takeaway per box.
- Turn inline "Source: ..." lines into small citation chips (tap or hover to see the source).
- Cut remaining text by about 40%.
- Phone: fold sections into accordions and show a bottom bar with the 3 key numbers.
