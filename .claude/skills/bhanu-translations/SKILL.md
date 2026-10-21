---
name: bhanu-translations
description: Keep the Bhanu AI text files translations/en.md, te.md and hi.md in step with the site. Use near the end of a session, when Sai says the session is ending, after a long pause, or when Sai asks to update the .md or translation files.
---

# Translation files

`translations/en.md`, `te.md` and `hi.md` hold every piece of text on the site, section by section, in English, Telugu and Hindi. They are the base for the future language switcher, which is on hold until Sai approves the design.

## When

- **Not after every change.** During a session, keep a running list of text that changed (new boxes, renamed buttons, corrected facts).
- Update the files **near the end of the session**. Ask Sai first when there is a long pause between prompts, or when Sai says the session is ending. Do it straight away if Sai asks.

## How

1. **Find the text that changed:** read the components named in your running list.
2. **Update `en.md` first.** Keep the existing structure: `## Tab`, then `### Box`, then one bullet per line of UI. Join short related labels with ` · `. Use `{n}`, `{amount}`, `{school}` and similar placeholders for values.
3. **Write `te.md` and `hi.md` line for line.** Every line in `en.md` has exactly one matching line in each translation, with the same headings and bullet structure. Keep product names (Bhanu AI, WhatsApp, MC4, DISCOM in its local spelling) and numbers as they are. Use plain words a class 8 student understands.
4. **Check the alignment:**
   ```bash
   bash .claude/skills/bhanu-translations/scripts/check.sh
   ```
   It must print `aligned` for both files.
5. **Copy and rezip.** Copy the three files into `Bhanu-AI-main/translations/` if you edited a copy elsewhere, then rezip the project (the `bhanu-publish` skill's `single.sh` does the zip).
6. **Tell Sai** which sections changed.

## Facts

- When text carries a citation number on the site, add `[n]` after the matching line in all three files, and keep the `## Sources` section at the end in step with the Sources tab.
