---
name: bhanu-publish
description: Build the Bhanu AI site and publish it to Sai's artifact, then refresh the single HTML file and the project zip. Use after any change to the site, or when Sai asks to publish, update the link, or "give me the URL".
---

# Publish Bhanu AI

Sai's site always lives at one artifact: **https://claude.ai/artifact/VpVawmYFnpyzbMrM5D4kVT**. Never create a new artifact for it.

## Steps

1. **Check the code compiles.** From the project root: `npx tsc --noEmit -p .`. Fix errors before going on.

2. **Find what is published now.** Call the Artifact tool with `action: "list"`, `scope: "files"`, `url` set to the artifact above. Note every path under `assets/`.

3. **Build.** Run the build script, passing the published asset paths from step 2 so stale ones get removed:
   ```bash
   bash .claude/skills/bhanu-publish/scripts/build.sh assets/index-OLD.js assets/index-OLD.css ...
   ```
   It builds into `.publish/`, writes `.publish/page.html` and prints a JSON `files` map: new assets mapped to themselves, old ones mapped to `null`.

4. **Publish.** Call the Artifact tool:
   - `file_path`: `<project>/.publish/page.html`
   - `url`: the artifact above
   - `root`: `<project>/.publish`
   - `files`: the JSON map printed in step 3
   - `label`: a few words about the change
   - Omit `capabilities` to keep the stored ones. If you must restate them, use exactly: `{"db": {}, "user": {"scopes": ["profile"]}, "downloads": true, "sample": {"images": true}}`.

5. **Refresh the offline copies.** `bash .claude/skills/bhanu-publish/scripts/single.sh`. It rebuilds `../Bhanu-AI.html` as one file with everything inlined (dynamic imports inlined too), checks it opens with no errors, and rezips `../Bhanu-AI-clean.zip` without `node_modules`, `dist` or `.publish`.

6. **Tell Sai** in a short line what changed, then give the link. Pair it with screenshots (use the `bhanu-screenshots` skill).

## Rules

- Shared data collections in use: `log` (maintenance log), `bills` (savings tracker), `repairs` (repair log), `whatsapp` (WhatsApp send limit). Never rename them; that would lose the school's data.
- Do not touch the translation files here. They are updated near the end of a session (see `bhanu-translations`).
