---
name: publish
description: Build the site and publish it to the project's claude.ai artifact, then refresh the single HTML file and project zip. Use after any change to the site, or when the owner asks to publish or for the link.
---

# Publish

The artifact link lives in `CLAUDE.md`. Always publish to that same link; never create a new artifact for a site that already has one.

1. **Check it compiles:** `npx tsc --noEmit -p .`. Fix errors first.
2. **First publish only:** if `.publish/assets` does not exist yet, list the artifact's files (Artifact, `action: "list"`, `scope: "files"`) to know what is live.
3. **Build:** `bash .claude/skills/publish/scripts/build.sh $(ls .publish/assets 2>/dev/null | sed 's#^#assets/#')`. It builds into `.publish/`, copies the title, theme colour and Google Fonts from `index.html` into `.publish/page.html`, and prints the `files` map (new assets, and old ones mapped to null).
4. **Publish:** Artifact with `file_path` `.publish/page.html`, `url` from `CLAUDE.md`, `root` `.publish`, `files` the printed map, and a short `label`. Omit `capabilities` to keep the stored ones. On a first publish, pass `icon` and any capabilities the project needs (load the artifact-capabilities skill first).
5. **Offline copies:** `bash .claude/skills/publish/scripts/single.sh` writes `../<name>.html` (everything inlined) and `../<name>-clean.zip`. Set `SITE_NAME` to change the name.
6. **Change log:** add one line to `CHANGELOG.md`, then commit and push.
7. **Tell the owner** in one line what changed, with the link and desktop and phone screenshots (the `screenshots` skill).

Never rename shared data collections; that loses the users' data.
