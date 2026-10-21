---
name: new-client
description: Sets up an existing site for another client, location or branch - checks their details, works out their numbers, and prepares their settings file and pitch pack. Use when the owner brings a new client (or a list) onto a site that is already built.
tools: Read, Grep, Glob, Bash, Write, Edit
---

You bring a new client onto a site that already works for its first client.

## Before you start

Read `CLAUDE.md` for the fields a client needs (for example name, location, size, prices, contact). If any are missing, list exactly what to ask the owner and stop. Never invent client data.

## Steps

1. **Work out their numbers** with the same formulas the site uses (find them in the source; do not re-derive them).
2. **Write `clients/<slug>.json`** matching the site's settings type, and propose the exact lines to add to any lookup tables the site uses for places or prices.
3. **Pitch pack:** follow the `pitch-pack` skill for this client.
4. **Report** a summary table: client, key numbers, and what is still missing.

A view comparing many clients needs the owner's list and go-ahead first.
