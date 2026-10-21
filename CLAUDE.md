# Working with Sai on Bhanu AI

## How Sai likes to work

- After every update, give the link to view it: https://claude.ai/artifact/VpVawmYFnpyzbMrM5D4kVT (keep publishing to this same artifact).
- Translation files (`translations/en.md`, `te.md`, `hi.md`): do NOT update them after each change. Keep a running list of text changes and update the files only near the end of the session. Ask Sai before updating when there is a long pause between prompts, or when Sai says the session is nearing its end.
- Work in batches and stop after each one with a short report and the link, so Sai can check their Claude usage limits before continuing.
- When listing advice or ideas, show a table of batches ordered from most to least impact, with an estimated token cost for each batch, and let Sai choose which batch to run.
- Sai reviews designs by seeing them: send screenshots (desktop and phone) rather than describing changes.
- Language switcher (idea 14) is on hold until Sai is happy with the design. The Telugu sample of the Mission tab was shown for approval.
- Live data hookup (18) needs the inverter or monitoring brand; multi-school view (19) needs the list of schools. Ask before building them.

## Design

Follow the clean-dark-ui skill: four greys, small corners (8px boxes, 6px controls), one accent (solar yellow) for the single main action per screen, system font for text and Saira for big numbers, no em dashes. Colours carry meaning: sun amber for solar output, blue for monsoon/AC, green for profit and healthy, red for problems.

## Facts to keep straight

- A grid-tied system without a battery switches off during a power cut (anti-islanding). Never claim solar keeps lights on during load shedding unless a battery is mentioned.
- Prices, pay ranges, subsidy amounts, export rates and standards are rough guides; label them that way.

## Build and publish

- `npm install`, then `npm run dev` (port 3000). Tailwind is built locally (PostCSS); `index.css` holds the colour tokens.
- To publish: `vite build`, then publish a page that links the built CSS and JS as files to the artifact above. The artifact declares the `db`, `user` (profile scope), `downloads` and `sample` (with images) capabilities. The maintenance log uses the `log` collection and the savings tracker uses `bills` (one doc per month, id YYYY-MM), the repair log uses `repairs` (date, part, work, tech, org, cost, status), site settings live in the `settings/site` document, and inverter readings in `readings` (doc id = YYYY-MM-DD, {date, kwh, source}). Real readings replace the sample sensor data everywhere; with none, the top bar says "Sample data". The AI Advisor uses `sample`, so answers run on the viewer's own Claude account. jspdf is loaded on demand for the funder PDF; for the single HTML file, build with `inlineDynamicImports`.
- Also refresh the single file `Bhanu-AI.html` and the project zip after each publish.

## Skills and agents (in `.claude/`)

- Skills: `bhanu-publish` (build, publish to the artifact, single HTML and zip), `bhanu-screenshots` (desktop and phone shots with error and overflow checks), `bhanu-translations` (en/te/hi line-aligned, end of session), `idea-batches` (ideas as an impact-ordered table with token costs), `funder-pack` (pitch pack for one school).
- Agents: `fact-checker` (claims vs sources, JSON report), `content-reviewer` (house rules before publishing), `maintenance-triage` (High/Medium/Low risk, WhatsApp only for High within limits), `new-school` (set up another school; needs Sai's school details).
- Risk rules and WhatsApp limits live in `components/risk.ts` (at most 3 messages per 24 hours for each phone number and site pair, so a different number or site has its own count; one message per site with the address, a map link and every open item, sent only when something is high risk; the same set of high risk items is not resent within 24 hours; shared through the `whatsapp` collection). The school address and map link are in the site settings..
