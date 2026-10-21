# Working with <Owner> on <Site name>

## How <Owner> likes to work

- Start each session by reading `CHANGELOG.md` instead of exploring the code. After every change, add a one-line entry there (newest first) in the same commit.
- After every update, give the link to view it: <artifact link, after the first publish> (keep publishing to this same artifact).
- Work in batches and stop after each one with a short report, desktop and phone screenshots, and the link, so <Owner> can check their Claude usage limits.
- When listing advice or ideas, show a table of batches ordered from most to least impact, with an estimated token cost for each (the `idea-batches` skill), and let <Owner> choose.
- Translation files (`translations/*.md`): keep a running list of text changes and update them near the end of the session.
- On hold: <ideas not to build or suggest yet, and what they need>.

## Who it is for

- <Main user, their device and language, how much time they have>.
- <Second user>.
- <Who pays>.

## Design

Follow the clean-dark-ui skill: four greys, small corners (8px boxes, 6px controls), one accent (<colour>) for the single main action per screen, system font for text and <display font> for big numbers, no em dashes. Colours carry meaning: <colour = meaning, for example green for money saved, red for problems>.

## House rules

- <Claims the site must never make, for example health promises or guaranteed returns>.
- Prices, pay, fees and estimates are rough guides; label them that way. Every statistic has a source.
- Sample data is labelled as sample, and never sent to real people as if real.

## Build and publish

- `npm install`, then `npm run dev`. Tailwind is built locally; `index.css` holds the colour tokens.
- Publish with the `publish` skill. Shared data collections: <name: what it holds, document id rule>. Never rename them.
- Also refresh the single HTML file and project zip after each publish.

## Skills and agents (in `.claude/`)

- Skills: `publish`, `screenshots`, `translations`, `idea-batches`, `pitch-pack`, `new-site`.
- Agents: `segment-scout`, `market-researcher`, `site-planner`, `ui-improver` (runs at the 6th prompt via the midpoint hook), `fact-checker`, `content-reviewer`, `issue-triage`, `new-client`.
