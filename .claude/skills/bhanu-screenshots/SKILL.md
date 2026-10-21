---
name: bhanu-screenshots
description: Take desktop and phone screenshots of Bhanu AI tabs or sections, check for page errors and sideways scrolling, and send them to Sai. Use after any visual change, before publishing, or when Sai asks to see something.
---

# Screenshot review

Sai reviews designs by seeing them, not by reading descriptions. Every visual change gets a desktop **and** a phone screenshot.

## Steps

1. **Start the dev server** if it is not running: `npx vite --port 3002` in the background (long timeout). Check with `curl -s -o /dev/null -w "%{http_code}" localhost:3002`.

2. **Shoot.** Run from the project root:
   ```bash
   node .claude/skills/bhanu-screenshots/scripts/shoot.mjs --tabs "Learn,Mission" --out <scratchpad>/shots
   ```
   Options:
   - `--tabs`: tab names as shown in the top bar (Overview, Returns, Soiling, AI Advisor, Learn, Mission, Impact, Sources).
   - `--section "Heading text"`: crop to the box or section that has this exact heading, instead of the whole page.
   - `--click "Button text"`: click a button first (repeatable, comma separated), for example to open a panel.
   - `--url http://localhost:3002`: change the address.

   It saves `<tab>-desktop.png` and `<tab>-phone.png` (1440×900 and 390×844), and prints any page errors and how far the page scrolls sideways.

3. **Look at every image yourself** with the Read tool before sending. Check:
   - **Overflow:** sideways scroll must be 0, and no text should be cut off.
   - **Errors:** no page errors.
   - **Style:** follows the clean-dark-ui skill. One yellow main action, small corners, no em dashes.
   - **Facts:** no claim that solar keeps power on in a cut unless a battery is mentioned.

4. **Fix anything wrong, then reshoot.** Only send images that pass.

5. **Send them** with SendUserFile (`display: "render"`), with a one-line caption saying which is desktop and which is phone.

## Notes

- A sticky top bar can appear in the middle of full-page screenshots. That is how the screenshot is captured, not a bug.
- Charts animate. The script waits 1.5 s after each tab change; raise `--wait` if a chart looks half drawn.
