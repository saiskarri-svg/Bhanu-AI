---
name: idea-batches
description: Present ideas, advice or a to-do list for Sai as a table of batches ordered by impact with token estimates, and let Sai choose. Use whenever Sai asks for ideas, suggestions, improvements, "what else could we add", or advice on next steps.
---

# Ideas as batches

Sai decides what to build, and watches their Claude usage limits. So ideas are never a loose list and never built without a choice.

## Format

1. One short sentence of framing, if needed.
2. A table, **ordered from most to least impact**:

| Batch | Ideas (numbered) | Why it matters | Est. tokens |
|---|---|---|---|
| **A (highest impact)** | 1 · 4 · 7 | One line | ~40k |

   - Give each idea a number that stays fixed, so Sai can say "do 3 and 7".
   - Put 2 to 4 ideas in each batch, grouped so a batch can be built and checked in one go.
   - **Estimate tokens** from experience: about 10k for a small box or text change, 15k to 25k for a new interactive panel with a chart, 30k to 60k for a new tab or a feature that saves shared data. Add about 5k per batch for screenshots and publishing. Say the estimates are rough.
   - Mark anything that needs input from Sai first (a brand, a list of schools, approval of a design).
3. One line recommending a batch, and why.
4. **Stop and wait** for Sai's choice. Do not start building.

## While building

- Work one batch at a time. After each batch, stop with a short report, screenshots (desktop and phone) and the artifact link, so Sai can check their limits before the next batch.
- If Sai says "run all batches", go from top to bottom, still reporting between batches.
