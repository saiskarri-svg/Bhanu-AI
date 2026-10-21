---
name: funder-pack
description: Make a funding pitch pack for one school from the Bhanu AI numbers, with a one-page summary, a short email to a CSR team or bank, and talking points. Use when Sai or a school asks to approach a funder, write to a company's CSR team, or prepare for a funding meeting.
---

# Funder pack

## Inputs (ask for any that are missing)

- **School:** name, village, state.
- **System:** size in kWp (or monthly units used, to size it with the Learn tab's sizing rules).
- **Tariff:** the price per unit the school pays.
- **Funder:** company or bank name, if known.

## Numbers

Use the same rules as the site so the numbers match what the funder will see:

- **Yearly generation:** size × the state yield in `constants.tsx` (`STATE_YIELDS`).
- **Savings:** generation × tariff.
- **CO₂:** generation × the grid emission factor in `constants.tsx`.
- **Subsidy:** check `constants.tsx` and the Sources tab for the current rule. Schools do not get the central rooftop subsidy that homes get, so say "subsidy: none unless a state scheme or grant applies" unless a source says otherwise.
- **Payback:** cost after any grant ÷ yearly savings.

Every number with a source on the site keeps its source. List the sources at the end of the pack using the links in `components/sourceList.ts`.

## Output

1. **One-page summary.** Point Sai to the Returns tab, Funder summary, Download summary (PDF) for the formatted version, or write the same content as a document if asked.
2. **Email, under 150 words.**
   - Subject line names the school and the ask.
   - What the money buys, and the total amount.
   - Three numbers: yearly savings, CO₂ avoided, and students reached.
   - One line on the learning programme.
   - A clear ask, and the artifact link if Sai wants it shared. Remind Sai the link is private until shared.
3. **Five talking points** for a meeting, each one sentence.

## Rules

- **Plain words**, no em dashes.
- **No claim that solar keeps power on in a cut** unless a battery is in the budget.
- **Label prices, pay and subsidies as rough guides.**
- **Use the funding routes on the Returns tab** ("Ways to pay for it"): CSR grant, bank loan, installer owns it (pay per unit). For a company, lead with CSR.
