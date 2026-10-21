---
name: translations
description: Keep translations/en.md and the other language files in step with the site, line for line. Use near the end of a session, when the owner says the session is ending, after a long pause, or when asked to update the translation files.
---

# Translation files

`translations/en.md` holds every piece of visible text, section by section. Each other language file (for example `te.md`, `hi.md`, `es.md`) matches it line for line.

- **Not after every change.** Keep a running list of changed text during the session; update the files near the end. Ask the owner first after a long pause or when they say the session is ending.
- **Update `en.md` first:** `## Page`, then `### Box`, one bullet per line of UI. Use placeholders like `{n}` and `{name}` for values.
- **Then each language, line for line,** keeping product names and numbers as they are, in plain words for the audience in `CLAUDE.md`.
- **Check:** `bash .claude/skills/translations/scripts/check.sh` must print "aligned" for every language.
- **Tell the owner** which sections changed.
