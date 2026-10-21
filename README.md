<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15xeQxQKBt6Kxs7lX2TtvIc2CKl2-DeMI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Design notes

The UI follows a clean dark style (see `index.css` for the colour tokens and `tailwind.config.js` for how they map to Tailwind classes).

- Four greys only: page, box, inner surface, outline. Boxes have 8px corners, buttons and inputs 6px.
- Solar yellow is used for the logo and the one main action per screen: "Export report", or "Get advice" on the AI Advisor tab.
- System font for text. Saira only for the big numbers.
- Stats sit in one strip split by thin lines. Status is shown as a small coloured dot plus text.
- Shared pieces live in `components/ui.tsx`.
- Tailwind is now built locally (PostCSS) instead of loaded from the CDN, and `index.html` loads `index.tsx` directly, so `npm run dev` works as is.
- Colour carries meaning: sun amber for solar output, blue for monsoon months, green for profit and savings, red for money still owed or panels that need cleaning. Stat labels have small tinted icons.
- `components/SolarSky.tsx` is a WebGL shader behind the top of the page. Its glow sits where the sun is at the viewer's local time (cool blue at night), and it stays still when reduced motion is on.
- The Learn tab (`components/LearnTab.tsx`) has three lessons: how solar works (a clickable energy-flow diagram using this site's numbers), the system's components, and safety (shutdown order, do and don't, warning signs, emergency numbers and a 5-question quiz). The best quiz score is remembered per device.
- The Components lesson opens with an illustrated school (inline SVG). Each of the 10 parts is numbered and highlighted; hover or tap shows a card, and the list below is linked to the drawing.
- `components/SchoolScene.tsx` draws the school (named from the site settings) with lights, fans, a computer lab, a switchboard and a live "Solar now" display. It reacts to time, weather, dust, shade and wind.
- The Simulator lesson (`components/Simulator.tsx`, model in `components/solarModel.ts`) uses a sun-angle model, the Haurwitz clear-sky model, Kasten and Czeplak cloud loss, soiling, partial shade and panel temperature (NOCT with wind cooling) to show live output, school load and grid flow.
- How it works also covers voltage, current and power (`components/Electricity.tsx`): a live I-V and P-V curve for a 540 W panel with sunlight and temperature sliders, and a series / parallel / two-string wiring lab with I²R cable loss, a check against a typical 5 kW inverter, and a shaded-panel switch.
- Learn → Size it (`components/Sizing.tsx`): a school energy audit (saved per device) and a sizing calculator for kWp, panels, string layout, inverter, roof area, cost after subsidy and payback, with a button that applies the size to the site settings.
- Learn → Safety opens with Spot the hazard (`components/HazardGame.tsx`): a rooftop scene with 8 hazards and 2 decoys, hints and explanations.
- Every Learn lesson ends with a short quiz (`components/Quiz.tsx`); best scores are kept per device.
- Safety adds a protective gear guide and a shutdown order drill (`components/SafetyExtras.tsx`). A Careers lesson (`components/Careers.tsx`) covers solar jobs and training routes.
- Size it adds a roof planner and a battery comparison (`components/SizingExtras.tsx`). Returns adds a bill check with subsidy breakdown (`components/BillCheck.tsx`). The Simulator has four challenges.
- Soiling has a shared maintenance log (`components/MaintenanceLog.tsx`). On claude.ai it uses the artifact's `db` capability (collection `log`) so everyone sees the same entries and who did them; elsewhere it saves on the device.
- Learn adds Data detective (`components/DataDetective.tsx`), a Certificate lesson with progress tracking (`components/Certificate.tsx`, progress in `components/runtime.ts`) and a Teacher guide with downloadable worksheets and answer keys (`components/TeacherGuide.tsx`). Safety adds Rules and standards (`components/Standards.tsx`).
- The Impact tab (`components/ImpactPage.tsx`) is a plain page for parents and the village. Adding `#impact` to the link opens it on its own.

## Returns, Soiling and AI Advisor depth (batches A to E)

- Returns: Ways to pay for it (upfront, bank loan, CSR grant, pay-per-unit), 20 year cash flow, one page funder PDF, savings tracker (shared `bills` collection), bill check, What if? sliders, Where the savings go.
- Soiling: Cleaning planner with the best interval and rupees lost to dust, dust vs efficiency, maintenance, maintenance log, Did cleaning work? before/after chart, panel health map (sample readings), two week dust risk by region and month, WhatsApp alerts.
- AI Advisor: chat about the school's own data, photo diagnosis, weekly report for the principal, lesson builder for teachers. Every answer ends with "Based on" and "Confidence", and can be written in English, Telugu or Hindi. Uses the `sample` capability; outside claude.ai it shows a note instead.
- Soiling: Repair log for technician visits (what was fixed, technician, organisation or "N/A (local trained technician)", cost, Fixed / Needs follow-up), shared `repairs` collection, CSV download.
- Mission: interactive. One roof, three jobs (tap tiles, jump to a tab), Who it helps (switch Children / Community / Companies and the world), problem cards with "See the fix", a 1 to 1 lakh schools slider with counting numbers (students ~250 and 2 technicians per school, rough), and next-step buttons.
- Backend: site settings (`settings/site`), maintenance log (`log`), savings tracker (`bills`), repair log (`repairs`), WhatsApp send count (`whatsapp`) and inverter readings (`readings`, one document per date) live in the claude.ai page's shared storage, with device storage as the fallback. The AI Advisor runs on the viewer's own Claude account; no API key is needed.
- Real data: Overview, "Real data from the inverter". Students type the daily kWh from the inverter display, or anyone uploads a CSV exported from the monitoring portal (any brand; date and daily energy columns are guessed and can be changed, Wh or kWh, hourly rows are added up). Until readings exist, the top bar says "Sample data".
