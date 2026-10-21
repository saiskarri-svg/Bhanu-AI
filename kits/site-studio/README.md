# Site Studio kit

The agents, skills, hook and starter project behind Bhanu AI, made general so they can build websites for any market segment.

## What is inside

**Agents** (`.claude/agents/`)

| Agent | What it does | When |
|---|---|---|
| `segment-scout` | Finds website business ideas across market segments, ranked by demand, build size and kit fit | Looking for the next idea |
| `market-researcher` | Researches one segment in depth: customers, problems, competitors, prices, rules | After picking an idea |
| `site-planner` | Turns the research into tabs, main actions, data, batches and a filled-in `CLAUDE.md` | Before building |
| `ui-improver` | Screenshots every page and suggests improvements in batches | Halfway through each session (hook), or on request |
| `fact-checker` | Checks every real-world claim against sources, JSON report | After adding facts |
| `content-reviewer` | Checks changes against the house rules before publishing | Before each publish |
| `issue-triage` | Sorts faults or complaints into High, Medium, Low and drafts messages for High only | When issues come in |
| `new-client` | Sets up a working site for another client or branch | Growing a site |

**Skills** (`.claude/skills/`): `publish` (build, publish to a claude.ai artifact, offline file and zip), `screenshots` (desktop and phone, error and overflow checks), `translations` (line-aligned language files), `idea-batches` (ideas as an impact-ordered table with token costs), `pitch-pack` (one-pager, email and talking points), `new-site` (start a project from this kit).

**Hook** (`.claude/hooks/ideas-midpoint.sh`, wired in `.claude/settings.json`): at the 6th prompt of a session it asks for the `ui-improver` agent. Change the number with `IDEAS_AT_PROMPT`.

**Starter project** (`template/`): Vite, React, TypeScript and Tailwind, with the dark design tokens, shared UI pieces (`components/ui.tsx`: boxes, stat strips, charts that draw in when seen, count-up numbers, saved ticks, edge fades, Back to top) and a tabbed shell.

**Templates:** `CLAUDE.template.md`, `CHANGELOG.template.md`, `ideas-log.template.md`.

## How to use it

1. **Find an idea:** ask Claude to run `segment-scout` (optionally naming segments, a country or a budget). Pick a batch.
2. **Research and plan:** run `market-researcher` on the chosen idea, then `site-planner`.
3. **Start the site:** use the `new-site` skill. It copies `template/` and `.claude/` into a new folder or repository and fills in `CLAUDE.md`.
4. **Build in batches,** publish after each, and let the midpoint hook bring fresh ideas every session.

To use the kit in a new repository, copy this folder's `.claude/` and `template/` contents to the new repository's root. The agents read each project's own `CLAUDE.md`, so nothing here is tied to Bhanu AI.
