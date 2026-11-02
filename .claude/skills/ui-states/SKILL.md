---
name: ui-states
description: Sai's rules for every UI build in every project - the ten core UI states (empty, loading, error, offline, slow network, zero results, permission denied, session expiry, form validation, success) and smooth mobile touch interaction (drag down, pull to refresh, swipe-to-close sheets). Use whenever building, changing or reviewing any screen, form, list or data view, and as a checklist before publishing.
---

# Core UI states and mobile interaction

Sai's rule for all projects: every screen that shows data or takes input handles all ten states, and the phone version feels smooth to touch. Plan these states when you design a feature, not after.

## The ten states

| # | State | Rule | How to build it |
|---|---|---|---|
| 1 | **Empty** | Guide the user before data exists. | Say what will appear here, why it is useful, and the one action that fills it ("No months added yet. Start with last month's bill."). Never a bare "No data". |
| 2 | **Loading** | Perceived speed matters; keep the wait active. | Skeleton rows or shimmer shaped like the real content, not a blank box. Keep the page layout stable so nothing jumps when data lands. Show cached data first if there is any. |
| 3 | **Error** | Clear cause plus an actionable recovery. | Say what failed in plain words, what was kept, and give a button: Try again, Edit, or a fallback ("Could not save. Your entry is kept on this device. Try again."). Never a raw error code alone. |
| 4 | **Offline** | Inform the state; prevent blank views. | Detect `navigator.onLine` and the `online`/`offline` events. Show a small banner, keep the last data on screen, queue writes and say they will sync. |
| 5 | **Slow network** | Show incremental progress; avoid frozen spinners. | After about 2 seconds, change the message ("Still loading, 3 of 12 sites…"), show counts or a progress bar, render parts as they arrive, and offer Cancel or Retry after about 10 seconds. |
| 6 | **Zero search results** | Suggest alternatives; avoid dead ends. | Echo the query, suggest a fix (spelling, wider filter, nearby place), show popular items or a "Clear filters" button. |
| 7 | **Permission denied** | Explain the reason and the recovery route. | Say why the permission or access is needed, what still works without it, and exactly how to grant it ("Ask the page owner for edit access" or "Allow location in your browser settings"). |
| 8 | **Session expiry** | Persist draft state before the auth teardown. | Autosave form drafts (localStorage in try/catch, or the shared store) as the user types; after sign-in, restore them and say so ("We kept your draft."). |
| 9 | **Form validation** | Inline errors at the exact field. | Message directly under the field, linked with `aria-describedby`, `aria-invalid` on the input, shown on blur or submit (not on every keystroke while typing), focus moves to the first bad field, and the message says how to fix it. |
| 10 | **Success** | Acknowledge completion; give a clear next step. | A visible confirmation (tick, toast or row highlight) that names what happened, plus the next action ("Saved. Add the next month" or "Sent. View the log"). |

## Smooth mobile interaction

- **Drag down feels native:** momentum scrolling everywhere; no scroll traps. Use `overscroll-behavior: contain` on inner scroll areas so they do not drag the whole page.
- **Pull to refresh** on data views that can change (logs, readings, dashboards): a short pull shows a spinner and reloads, with the result announced. Do not fight the browser's own pull to refresh at the top of the page.
- **Sheets and pop-ups** open from the bottom on phones and close with a swipe down, a tap outside, or a Close button. Animate with transform only (no layout properties) at about 200 to 300 ms, and follow the finger while dragging.
- **Touch targets** at least 44 by 44 px, with space between them. Sticky main action within thumb reach on long pages.
- **No jank:** animate `transform` and `opacity` only, use `passive` scroll listeners, avoid layout shifts while content loads.
- **Respect reduced motion:** every animation has a still fallback.
- **Keyboard on phones:** the right `inputMode` (tel, numeric, email), inputs not hidden behind the keyboard, Enter submits.

## Before publishing

Walk each changed screen through all ten states and the phone gestures. Screenshot the empty, loading, error and success states on a phone, not just the happy path. In reports, list any state that is not handled yet as a known gap.
