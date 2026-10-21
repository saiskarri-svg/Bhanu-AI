---
name: screenshots
description: Take desktop and phone screenshots of the site's tabs or sections, check for page errors and sideways scrolling, and send them to the owner. Use after any visual change, before publishing, or when the owner asks to see something.
---

# Screenshots

The owner reviews designs by seeing them. Every visual change gets a desktop and a phone shot.

1. **Dev server:** start it if needed (`npx vite --port 3002` in the background, long timeout) and check it answers with curl.
2. **Shoot:**
   ```bash
   NODE_PATH=$(npm root -g) node .claude/skills/screenshots/scripts/shoot.mjs --tabs "Home,About" --out <scratchpad>/shots
   ```
   - `--tabs`: tab names as shown (buttons with role="tab"). For a site without tabs, pass any name and it shoots the page.
   - `--section "Heading"`: crop to the box with this exact heading.
   - `--click "Button"`: click buttons first. `--url`: change the address. `--wait`: ms to wait for animations.
   It saves `<tab>-desktop.png` (1440×900) and `<tab>-phone.png` (390×844), scrolls the page once so scroll animations finish, and prints page errors and sideways scroll.
3. **Look at every image yourself** before sending: no sideways scroll, nothing cut off, no errors, design rules followed.
4. **Fix, reshoot, then send** with SendUserFile (`display: "render"`) and a one-line caption saying which is desktop and which is phone.

A sticky header can appear mid-page in full-page shots; that is the capture, not a bug.
