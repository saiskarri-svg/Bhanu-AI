# Bhanu AI change log

Read this first at the start of a session instead of exploring the code. Newest first. One line per change; add an entry after every change, in the same commit.

## Site at a glance

- **Tabs:** Overview, Returns, Soiling, AI Advisor, Learn, Mission, Impact, Sources.
- **Learn lessons:** How it works (energy flow, voltage/current/power, I-V curves, wiring lab), Components (illustrated school, 10 parts), Simulator, Size it (audit + sizing calculator), Safety (Spot the hazard, shutdown order, quiz), Careers, Teacher guide, Certificate. Each lesson ends with a quiz.
- **Shared data (artifact db):** `log` maintenance, `bills` savings (id YYYY-MM), `repairs`, `readings` inverter (id YYYY-MM-DD), `settings/site`, `whatsapp` alert limits.
- **Key files:** `App.tsx` (tabs), `components/ui.tsx` (shared pieces, CHART/TINT colours), `index.css` (tokens), `components/risk.ts` (risk + WhatsApp rules), `components/sourceList.ts` (citations), `components/solarModel.ts` (simulator model), `components/runtime.ts` (artifact runtime), `components/useSharedSettings.ts`.
- **On hold:** language switcher (14), live data hookup (18, needs inverter brand), multi-school view (19, needs school list).

## 2026-10-21

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
