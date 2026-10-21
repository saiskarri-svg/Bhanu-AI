# Bhanu AI change log

Read this first at the start of a session instead of exploring the code. Newest first. One line per change; add an entry after every change, in the same commit.

## Site at a glance

- **Tabs:** Overview, Returns, Maintenance (was Soiling), AI Advisor, Learn, Mission, Impact, Sources.
- **Learn lessons:** How it works (energy flow, voltage/current/power, I-V curves, wiring lab), Components (illustrated school, 10 parts), Simulator, Size it (audit + sizing calculator), Safety (Spot the hazard, shutdown order, quiz), Careers, Teacher guide, Certificate. Each lesson ends with a quiz.
- **Shared data (artifact db):** `log` maintenance, `bills` savings (id YYYY-MM), `repairs`, `readings` inverter (id YYYY-MM-DD), `settings/site`, `whatsapp` alert limits.
- **Key files:** `App.tsx` (tabs), `components/ui.tsx` (shared pieces, CHART/TINT colours), `index.css` (tokens), `components/risk.ts` (risk + WhatsApp rules), `components/sourceList.ts` (citations), `components/solarModel.ts` (simulator model), `components/runtime.ts` (artifact runtime), `components/useSharedSettings.ts`.
- **On hold:** language switcher (14), live data hookup (18, needs inverter brand), multi-school view (19, needs school list).

## 2026-10-21

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
