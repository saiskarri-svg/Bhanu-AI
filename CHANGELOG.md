# Bhanu AI change log

Read this first at the start of a session instead of exploring the code. Newest first. One line per change; add an entry after every change, in the same commit.

## Site at a glance

- **Tabs:** Overview, Returns, Maintenance (was Soiling), AI Advisor, Learn, Mission, Impact, Sources.
- **Learn lessons:** How it works (energy flow, voltage/current/power, I-V curves, wiring lab), Components (illustrated school, 10 parts), Simulator, Size it (audit + sizing calculator), Safety (Spot the hazard, shutdown order, quiz), Careers, Teacher guide, Certificate. Each lesson ends with a quiz.
- **Shared data (artifact db):** `log` maintenance, `bills` savings (id YYYY-MM), `repairs`, `readings` inverter (id YYYY-MM-DD), `settings/site`, `whatsapp` alert limits.
- **Key files:** `components/fundingData.ts` (funding by state), `App.tsx` (tabs), `components/ui.tsx` (shared pieces, CHART/TINT colours), `index.css` (tokens), `components/risk.ts` (risk + WhatsApp rules), `components/sourceList.ts` (citations), `components/solarModel.ts` (simulator model), `components/runtime.ts` (artifact runtime), `components/useSharedSettings.ts`.
- **On hold:** language switcher (14), live data hookup (18, needs inverter brand), multi-school view (19, needs school list).

## 2026-10-21

- **Translations:** en, te and hi brought up to date with today's text (Maintenance tab name, Today strip, Where the power goes now, funding by state, payback marker, WhatsApp number hints and practice message, AI Advisor notice, Impact wording and next steps, Saved a year, chart summaries for screen readers). Files stay line-aligned (879 lines).
- **Tooling:** new `kits/site-studio/`: general versions of the agents and skills (ui-improver, fact-checker, content-reviewer, issue-triage, new-client; publish, screenshots, translations, idea-batches, pitch-pack), new agents `segment-scout`, `market-researcher`, `site-planner`, a `new-site` skill, the midpoint hook, a starter project in `template/` and CLAUDE/CHANGELOG templates. Also fixed `single.sh` wrongly failing when a source URL contains "assets/".
- **Returns: funding by state.** New "Funding for schools in (state)" box under Ways to pay (`components/Funding.tsx`, data in `components/fundingData.ts`): the state's solar agency, state schemes with status and source links, net metering, and 8 national routes (Samagra Shiksha, PM SHRI, MPLADS, MLA fund, panchayat grants, DMF, CSR, pay per unit). Researched for all 36 states and UTs; research caveats in `research/funding-notes.md`.
- **WhatsApp:** the button no longer says "practice"; the message still starts PRACTICE ONLY on sample data.
- **Top bar:** clicking the sun or "Bhanu AI" goes back to Overview, at the top.
- **WhatsApp:** sending is back on, but only with a valid number (`checkPhone` in `risk.ts`: country code required; India 91 + 10 digits starting 6 to 9, others 11 to 15 digits), with a hint under the box. On sample data it still sends, but the button says "Send practice list" and the message starts "PRACTICE ONLY". Copy message is back. Limits unchanged.
- **Accessibility (idea 39):** every chart has a screen reader summary built from its own numbers (`ResponsiveChart summary`); the Overview and Impact monthly charts show all 12 months, as first letters on phones (`monthTick`).
- **AI Advisor (idea 36):** outside claude.ai, one notice at the top (`AdvisorNotice`) with an "Open in claude.ai" button; each card just says "Available on the claude.ai page." Sample answers left out until Sai approves their wording. `PAGE_URL` now lives in `runtime.ts`.
- **Impact (idea 37):** ends with "Help the next school go solar": Download funder summary (shared `useFunderPdf` hook from `ReturnsExtras.tsx`) and Copy share link (claude.ai address + #impact when inside claude.ai).
- **Phone layout (ideas 34, 35, 40):** the Ways to pay, battery options and wiring tables become one card per row on phones (`stack-table` class in `index.css`, `data-label` on each cell); the tab strip, the Maintenance open items list and the desktop site sidebar fade at an edge when there is more to scroll (`useEdgeFade` in `ui.tsx`).
- **Maintenance tab (ideas 32, 33):** new Today strip at the top (high risk count, next cleaning, checks due) with jump links (`TodayStrip` in `SoilingExtras.tsx`, checks count shared via `useDueChecks` in `MaintenanceLog.tsx`); the open items list and Alerts now sit side by side under it, then the cleaning planner; dust outlook moved beside the dust chart.
- **Top bar (idea 38):** the Sample data badge says "Add readings" and opens the inverter readings box on Overview (`#readings`).
- **Trust (ideas 29 to 31):** with no real readings, the Maintenance list says "Sample" and explains the faults are for practice, the tab hides its fault count, Alerts tags sample faults and will not send or copy them on WhatsApp; Impact's rooms line no longer suggests power during cuts and the savings and books figures say rough guide; Overview's "Grants" stat is now "Saved a year (rough)".
- **Motion (ideas 27, 28):** high risk items get a soft red pulsing ring on their dot (Maintenance list and Alerts; `StatusDot pulse`); shimmer placeholders (`SkeletonRows`) replace the empty message while the maintenance log, repair log and savings tracker load shared data.
- **Overview (idea 25):** new "Where the power goes now" box (`components/EnergyNow.tsx`): panels to school to grid with moving lines sized by power, estimated from the typical day curve and school hours (Mon to Sat, 9:00 to 16:30), updates each minute, labelled as not a live meter.
- **Fix:** Typical day curve peaked at 9:00 and ended at 15:00; it now runs about 6:00 to 18:00 with the peak at noon.
- **Returns (idea 26):** payback marker (dashed line, dot and "Paid back, year N") drops in after the cash flow line draws.
- **Motion (ideas 22 to 24):** new rows in the maintenance log, repair log, savings tracker and inverter readings slide in with a green wash and a fading "Saved" tick (`useFreshIds`, `SavedTick`); removed months and readings fade and fold away (`fadeOutRow`); quiz right answers pop and wrong picks shake once; Learn has a steps bar under "x of 10 steps" that fills smoothly, and a finished lesson's tick pops.
- **Motion (ideas 20, 21):** charts draw in when scrolled into view (`ResponsiveChart` in `ui.tsx` replaces `ResponsiveContainer`); big numbers count up the first time they are seen (`CountUp`, used by `StatStrip`, Impact, Maintenance, bill check).
- **Rename:** the Soiling tab is now Maintenance (label only; component files keep their names).
- **Motion:** boxes fade and rise in as they scroll into view (`revealWithin` in `ui.tsx`, tall boxes pass it to inner boxes); the tab underline slides between tabs and the active tab scrolls into view on phones; a Back to top button appears after 1.5 screens; smooth scrolling for in-page links. All off with reduced motion. Screenshot script now scrolls the page once before shooting.
- **Fix:** clicking a top tab now opens the new tab at its top, instead of keeping the scroll position from the last tab (`App.tsx` tabs use `goTab`).
- **Tooling:** added `CHANGELOG.md` (this file) and the rule to keep it current.
- **Tooling:** added the `ui-improver` agent, the `ideas-midpoint` hook (runs it at the 6th prompt of each session) and `.claude/ideas-log.md`.
- **Translations:** en, te and hi updated for inverter data box, CSV export, school address and map link, one-message-per-site WhatsApp alerts, Sample data badge, Sources tab name, sources 44 and 45.
- **Data:** real inverter readings import from CSV; they replace sample data everywhere, and the top bar says "Sample data" when there are none.
- **Data:** CSV export for the maintenance log and savings tracker.
- **Data:** site settings (school name, address, map link, system size) saved to shared storage.
- **Alerts:** risk levels High/Medium/Low; WhatsApp only for High, one message per site with address, map link and all open items, max 3 per 24 h per number and site, same set not resent within 24 h.
- **Facts:** fact-check fixes applied; Sources tab with numbered citations.
- **Cleanup:** removed unused Gemini service; AI Advisor runs on the viewer's Claude account.
- **Site:** replaced the starter with the full site: clean dark UI, Learn tab, Returns/Soiling/Advisor depth, Mission and Impact pages, maintenance and repair logs, savings tracker, funder PDF.
- **Tooling:** skills `bhanu-publish`, `bhanu-screenshots`, `bhanu-translations`, `idea-batches`, `funder-pack`; agents `fact-checker`, `content-reviewer`, `maintenance-triage`, `new-school`.

## 2026-02-01

- **Start:** Vite + React + Tailwind project from AI Studio, with Recharts.
