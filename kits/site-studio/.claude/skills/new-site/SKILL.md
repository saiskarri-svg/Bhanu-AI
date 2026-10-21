---
name: new-site
description: Start a new website project from the Site Studio kit - copy the template, the agents, skills and hook, fill in CLAUDE.md from the plan, and get a first version running and published. Use when the owner picks an idea and wants to start building it.
---

# New site

## Before you start

You need a plan (from `site-planner`) or, at least: the site name, who it is for, the tabs or pages, the one main action on each, the house rules (claims never to make), and where it will be published. Ask for anything missing.

## Steps

1. **Make the project:** copy `kits/site-studio/template/` to the new folder (or new repository), and copy `kits/site-studio/.claude/` into it. Copy `CLAUDE.template.md` to `CLAUDE.md`, `CHANGELOG.template.md` to `CHANGELOG.md`, and `ideas-log.template.md` to `.claude/ideas-log.md`.
2. **Name it:** set `name` in `package.json`, the `<title>` and theme colour in `index.html`, and the name in `App.tsx`.
3. **Fill in `CLAUDE.md`** from the plan: owner, audience, design and colour meanings, house rules, data collections, artifact link (after the first publish).
4. **Install and run:** `npm install`, then `npx vite --port 3002` in the background.
5. **Build batch A of the plan** only: real tabs, the main action, and sample data clearly labelled as sample.
6. **Screenshots** (the `screenshots` skill) on desktop and phone; fix anything wrong.
7. **First publish** (the `publish` skill): this creates the artifact; put its link in `CLAUDE.md`.
8. **Commit and push,** then report to the owner with the link and screenshots, and the batch table for what comes next.

## Keep from the first project

- One accent-coloured main action per screen; colours carry meaning.
- Facts carry sources; prices and estimates are rough guides.
- Sample data is always labelled, and never sent to real people as if it were real.
- Work in batches and stop after each with a short report, screenshots and the link.
