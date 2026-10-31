"""
forecast_report.py: dashboard image and plain-language lender summary for a
demand_forecast.Forecast. Called by demand_forecast.save_outputs().
"""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from demand_forecast import QUANTILES, SECTORS, YEARS

# Validated palette (adjacent-pair colour-blind safe); text always in ink tokens.
BLUE, ORANGE, AQUA, YELLOW = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
SECTOR_COLORS = dict(zip(SECTORS, (BLUE, ORANGE, AQUA, YELLOW)))
INK, INK2, MUTED, GRID, BASE, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7", "#fcfcfb"
BAND = "#cde2fb"
BAND2 = "#9ec5f4"


def _style(ax, title, ylabel=None, xlabel=None, pad=10):
    ax.set_facecolor(SURFACE)
    ax.set_title(title, loc="left", fontsize=11.5, color=INK, fontweight="bold", pad=pad)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(BASE)
    ax.spines["bottom"].set_color(BASE)
    ax.tick_params(colors=MUTED, labelsize=9, length=0)
    ax.grid(True, axis="y", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    if ylabel:
        ax.set_ylabel(ylabel, color=INK2, fontsize=9.5)
    if xlabel:
        ax.set_xlabel(xlabel, color=INK2, fontsize=9.5)


def _q(arr, qs=(0.1, 0.25, 0.5, 0.75, 0.9)):
    return {q: np.nanquantile(arr, q, axis=0) for q in qs}


def _fmt(x):
    return f"{x:,.0f}" if x >= 10 else f"{x:.1f}"


def dashboard(fc, path, designs: pd.DataFrame, risk: pd.DataFrame, drv5: pd.DataFrame):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    fig = plt.figure(figsize=(17, 11), facecolor=SURFACE)
    gs = fig.add_gridspec(2, 3, left=0.05, right=0.985, top=0.86, bottom=0.08, wspace=0.55, hspace=0.45)
    yrs = YEARS

    # ---- 1. fan chart ---------------------------------------------------------------
    ax = fig.add_subplot(gs[0, 0])
    q = _q(fc.energy)
    ax.fill_between(yrs, q[0.1], q[0.9], color=BAND, linewidth=0, label="80% range (P10-P90)")
    ax.fill_between(yrs, q[0.25], q[0.75], color=BAND2, linewidth=0, label="50% range")
    ax.plot(yrs, q[0.5], color=BLUE, lw=2, solid_capstyle="round", label="Median (P50)")
    ax.scatter(yrs, q[0.5], s=42, color=BLUE, edgecolor=SURFACE, linewidth=2, zorder=3)
    for k, txt in ((0.9, "P90"), (0.5, "P50"), (0.1, "P10")):
        ax.annotate(f"{txt} {_fmt(q[k][-1])}", (5, q[k][-1]), xytext=(8, 0), textcoords="offset points",
                    va="center", fontsize=9, color=INK if k == 0.5 else INK2)
    ax.annotate(f"P50 {_fmt(q[0.5][0])}", (1, q[0.5][0]), xytext=(-6, 10), textcoords="offset points",
                ha="right", fontsize=9, color=INK)
    _style(ax, "Daily energy demand", "kWh per day", "Year after commissioning")
    ax.set_xticks(yrs)
    ax.set_xlim(0.6, 5.9)
    ax.set_ylim(0, q[0.9].max() * 1.12)
    ax.legend(loc="upper left", frameon=False, fontsize=8.5, labelcolor=INK2)

    # ---- 2. per household vs benchmarks ----------------------------------------------
    ax = fig.add_subplot(gs[0, 1])
    lo_r, hi_r = fc.A.get("esmap_range_kwh_per_customer_month", [5, 35])
    ax.axhspan(lo_r, hi_r, color="#f0efec", linewidth=0, zorder=0)
    ax.text(5.85, hi_r + 0.4, f"ESMAP survey range: {lo_r}-{hi_r} kWh per customer per month",
            fontsize=8.5, color=MUTED, va="bottom", ha="right")
    qh = _q(fc.kwh_per_hh_month)
    ax.fill_between(yrs, qh[0.1], qh[0.9], color=BAND, linewidth=0)
    ax.plot(yrs, qh[0.5], color=BLUE, lw=2, label="This forecast (P50, band = P10-P90)")
    ax.scatter(yrs, qh[0.5], s=42, color=BLUE, edgecolor=SURFACE, linewidth=2, zorder=3)
    ax.annotate(f"{qh[0.5][-1]:.1f}", (5, qh[0.5][-1]), xytext=(8, 0), textcoords="offset points",
                va="center", fontsize=9, color=INK)
    for b in fc.A.get("benchmarks", []):
        ax.scatter([b["year"]], [b["kwh_month"]], s=40, marker="D", color=INK2, edgecolor=SURFACE,
                   linewidth=1.5, zorder=4)
        ax.annotate(b["name"], (b["year"], b["kwh_month"]), xytext=(7, 4), textcoords="offset points",
                    fontsize=8, color=INK2)
    _style(ax, "Use per household vs. measured sites", "kWh per household per month",
           "Year after commissioning")
    ax.set_xticks(yrs)
    ax.set_xlim(0.6, 5.9)
    ax.set_ylim(0, max(hi_r + 4, qh[0.9].max() * 1.1))
    ax.legend(handles=[plt.Line2D([], [], color=BLUE, lw=2, label="This forecast (P50, band P10-P90)"),
                       plt.Line2D([], [], marker="D", color=INK2, lw=0, label="Published measurements")],
              loc="upper left", bbox_to_anchor=(0, 0.9), frameon=False, fontsize=8.5, labelcolor=INK2)

    # ---- 3. average day --------------------------------------------------------------
    ax = fig.add_subplot(gs[0, 2])
    h = np.arange(24)
    p1 = np.median(fc.avg_profile[:, 0, :], axis=0)
    p5 = np.median(fc.avg_profile[:, -1, :], axis=0)
    ax.plot(h, p1, color=ORANGE, lw=2, label="Year 1 (P50)")
    ax.plot(h, p5, color=BLUE, lw=2, label="Year 5 (P50)")
    pk5 = float(np.median(fc.peak_kw[:, -1]))
    ax.axhline(pk5, color=MUTED, lw=1)
    ax.text(0.2, pk5 * 1.01, f"Year-5 design peak {pk5:.1f} kW (P50)\ncovers 99% of hottest-month days",
            fontsize=8.5, color=INK2, va="bottom")
    _style(ax, "Average day: load by hour", "kW", "Hour of day")
    ax.set_xticks(range(0, 24, 3))
    ax.set_xlim(0, 23)
    ax.set_ylim(0, pk5 * 1.3)
    ax.legend(loc="upper left", bbox_to_anchor=(0, 0.72), frameon=False, fontsize=8.5, labelcolor=INK2)

    # ---- 4. sectors ------------------------------------------------------------------
    ax = fig.add_subplot(gs[1, 0])
    st = fc.sector_table()
    bottom = np.zeros(len(st))
    for s in SECTORS:
        vals = st[s].values
        if vals.max() <= 0:
            continue
        ax.bar(st["year"], vals, bottom=bottom, width=0.5, color=SECTOR_COLORS[s], edgecolor=SURFACE,
               linewidth=1.6, label=s)
        bottom += vals
    for x, tot in zip(st["year"], bottom):
        ax.text(x, tot * 1.02, _fmt(tot), ha="center", va="bottom", fontsize=9, color=INK)
    _style(ax, "Who uses the energy (P50)", "kWh per day", "Year after commissioning")
    ax.set_xticks(yrs)
    ax.set_ylim(0, bottom.max() * 1.18)
    ax.legend(loc="upper left", frameon=False, fontsize=8.5, labelcolor=INK2, ncol=2)

    # ---- 5. drivers ------------------------------------------------------------------
    ax = fig.add_subplot(gs[1, 1])
    d = drv5.head(7).iloc[::-1]
    ax.barh(range(len(d)), d["share_of_uncertainty"] * 100, height=0.55, color=BLUE)
    for i, (_, r) in enumerate(d.iterrows()):
        ax.text(r.share_of_uncertainty * 100 + 0.8, i, f"{r.share_of_uncertainty * 100:.0f}%",
                va="center", fontsize=9, color=INK)
    ax.set_yticks(range(len(d)),
                  [f"{r.label}\n{'more' if r.rank_correlation > 0 else 'less'} demand when higher"
                   for _, r in d.iterrows()], fontsize=8.5, color=INK)
    _style(ax, "What drives the year-5 range", xlabel="Share of forecast uncertainty (%)")
    ax.grid(True, axis="x", color=GRID, linewidth=0.6)
    ax.grid(False, axis="y")
    ax.set_xlim(0, d["share_of_uncertainty"].max() * 100 * 1.25)
    ax.tick_params(axis="y", colors=INK)

    # ---- 6. sizing risk --------------------------------------------------------------
    ax = fig.add_subplot(gs[1, 2])
    yd = int(fc.A["sizing"]["design_year"])
    r5 = risk[risk.year == 5].set_index("design")
    r2 = risk[risk.year == 2].set_index("design")
    ylab, y = [], np.arange(len(designs))[::-1]
    for i, (_, row) in enumerate(designs.iterrows()):
        b = r5.loc[row.design, "p_brownouts"] * 100
        u = r2.loc[row.design, "p_underused"] * 100
        yy = y[i]
        ax.barh(yy + 0.17, b, height=0.3, color=ORANGE)
        ax.barh(yy - 0.17, u, height=0.3, color=BLUE)
        ax.text(b + 1.5, yy + 0.17, f"{b:.0f}%", va="center", fontsize=8.5, color=INK)
        ax.text(u + 1.5, yy - 0.17, f"{u:.0f}%", va="center", fontsize=8.5, color=INK)
        ylab.append(f"Build for P{int(row.design_quantile * 100)}\n{row.pv_kwp:.0f} kWp · {row.battery_kwh:.0f} kWh"
                    f" · ${row.capex_usd / 1000:,.0f}k")
    ax.set_yticks(y, ylab, fontsize=8.5, color=INK)
    _style(ax, f"Sizing for year-{yd} demand: what can go wrong", xlabel="Chance (%)", pad=44)
    ax.grid(True, axis="x", color=GRID, linewidth=0.6)
    ax.grid(False, axis="y")
    ax.set_xlim(0, 115)
    ax.legend(handles=[Patch(color=ORANGE, label="Brownouts in year 5 (>10% of demand unserved)"),
                       Patch(color=BLUE, label="Under 60% used in year 2 (cost per kWh up 1.7x+)")],
              loc="lower left", bbox_to_anchor=(0, 1.0), frameon=False, fontsize=8.5, labelcolor=INK2)
    ax.tick_params(axis="y", colors=INK)

    # ---- titles ------------------------------------------------------------------------
    qe = _q(fc.energy, QUANTILES)
    fig.text(0.05, 0.955, f"Five-year demand forecast: {fc.site.label}", fontsize=17, color=INK,
             fontweight="bold")
    fig.text(0.05, 0.925,
             f"Year 1: {_fmt(qe[0.5][0])} kWh/day (80% range {_fmt(qe[0.1][0])}-{_fmt(qe[0.9][0])})  ->  "
             f"Year 5: {_fmt(qe[0.5][-1])} kWh/day ({_fmt(qe[0.1][-1])}-{_fmt(qe[0.9][-1])}).   "
             f"{fc.site.describe()}; tariff ${fc.tariff:.2f}/kWh; {fc.n_draws:,} simulations.",
             fontsize=11, color=INK2)
    if fc.notes:
        fig.text(0.05, 0.897, "Note: " + " ".join(fc.notes), fontsize=9.5, color=MUTED)
    fig.text(0.05, 0.02, "Inputs: assumptions.yaml (Faza connection & adoption data, DHS, ESMAP, CLASP, "
             "Sierra Leone tariff trial). Costs: Omorate 2021 contract data, indicative only. "
             "Hourly 8760 files for HOMER/REopt in the output folder.", fontsize=8.5, color=MUTED)
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


# =============================================================================
# Plain-language summary for a lender
# =============================================================================
def lender_summary(fc, designs, risk, drv1, drv5, tariffs=None) -> str:
    s = fc.summary().set_index(["metric", "year"])

    def g(m, y, q="p50"):
        return float(s.loc[(m, y), q])

    e1, e2, e5 = g("energy_kwh_per_day", 1), g("energy_kwh_per_day", 2), g("energy_kwh_per_day", 5)
    lo_r, hi_r = fc.A.get("esmap_range_kwh_per_customer_month", [5, 35])
    c5 = g("kwh_per_customer_month", 5)
    where = "inside" if lo_r <= c5 <= hi_r else ("below" if c5 < lo_r else "above")
    spend_lo, spend_hi = fc.A["tariff"]["current_energy_spend_usd_month"]
    bill1, bill5 = g("household_bill_usd_month", 1), g("household_bill_usd_month", 5)
    L = []
    L.append(f"# Demand forecast: {fc.site.label}\n")
    L.append(f"*Generated {date.today().isoformat()} with demand_forecast.py · {fc.n_draws:,} simulations · "
             f"tariff ${fc.tariff:.2f}/kWh · seed {fc.seed}. Ranges are 80% intervals (P10-P90).*\n")
    L.append("## Bottom line\n")
    L.append(f"- **Year 1:** about **{e1:,.0f} kWh/day** (range {g('energy_kwh_per_day', 1, 'p10'):,.0f}-"
             f"{g('energy_kwh_per_day', 1, 'p90'):,.0f}), from about {g('customers', 1):,.0f} customers.")
    L.append(f"- **Year 5:** about **{e5:,.0f} kWh/day** (range {g('energy_kwh_per_day', 5, 'p10'):,.0f}-"
             f"{g('energy_kwh_per_day', 5, 'p90'):,.0f}), or {e5 * 365 / 1000:,.0f} MWh a year, from about "
             f"{g('customers', 5):,.0f} customers.")
    L.append(f"- **Growth:** demand rises {e2 / e1:.1f}x from year 1 to year 2 (mostly new connections) and "
             f"{e5 / e1:.1f}x by year 5 (connections plus appliance purchases).")
    L.append(f"- **Per household:** {g('kwh_per_household_month', 1):.1f} kWh/month in year 1, "
             f"{g('kwh_per_household_month', 5):.1f} in year 5 (range {g('kwh_per_household_month', 5, 'p10'):.1f}-"
             f"{g('kwh_per_household_month', 5, 'p90'):.1f}). Per customer in year 5: {c5:.1f} kWh/month, "
             f"{where} the {lo_r}-{hi_r} kWh range ESMAP found across surveyed mini-grids.")
    L.append(f"- **Evening peak (year 5):** about **{g('peak_kw', 5):.0f} kW** (range {g('peak_kw', 5, 'p10'):.0f}-"
             f"{g('peak_kw', 5, 'p90'):.0f}); load factor {g('load_factor', 5):.0%}.")
    st = fc.sector_table().set_index("year")
    sh1, sh5 = st.loc[1] / st.loc[1].sum(), st.loc[5] / st.loc[5].sum()
    L.append(f"- **Who uses it (year 5):** households {sh5['Households']:.0%}, shops and food "
             f"{sh5['Businesses']:.0%}, schools/clinics/worship {sh5['Institutions']:.0%}, mills and workshops "
             f"{sh5['Productive use']:.0%}. In year 1 households are only {sh1['Households']:.0%} because few "
             f"have connected yet ({g('connected_households', 1):.0f} of {g('households', 1):.0f}).")
    L.append(f"- **Bills:** a typical household pays about ${bill1:.1f}/month in year 1 and ${bill5:.1f} in year 5, "
             f"against ${spend_lo}-{spend_hi}/month spent today on candles, kerosene, batteries and diesel.\n")

    L.append("## What the forecast is built on\n")
    L.append(f"- **Site:** {fc.site.describe()}"
             + (f" (source: {fc.site.source})" if fc.site.source else "") + ".")
    L.append(f"- **Households:** {g('households', 1):,.0f} (range {g('households', 1, 'p10'):,.0f}-"
             f"{g('households', 1, 'p90'):,.0f}); population about {g('population', 1):,.0f}.")
    rows = [v for v in fc.business_estimate.values() if v["p90"] > 0]
    if rows:
        L.append("- **Businesses and institutions** (mapped vs. used in the model):\n")
        L.append("  | Type | Mapped | Used (P10-P50-P90) |\n  |---|---|---|")
        for v in rows:
            L.append(f"  | {v['label']} | {v['mapped']:.0f} | {v['p10']:.1f} - {v['p50']:.1f} - {v['p90']:.1f} |")
        L.append("")
    for n in fc.notes:
        L.append(f"- {n}")
    L.append("- Connection ramp and appliance adoption follow measured data from the Faza mini-grid in Kenya "
             "(Tomas Fillol et al. 2025): early and late adopters, S-shaped appliance buying.")
    L.append("- Household use is calibrated to measured sites (Rwanda 8.1, Malawi 7-8 kWh/month), not to surveys, "
             "because surveys overstate use (in Malawi, by about 8x).\n")

    L.append("## Which assumptions matter most\n")
    L.append("Share of the year-5 uncertainty explained by each input (rank correlation):\n")
    for i, (_, r) in enumerate(drv5.head(6).iterrows(), 1):
        L.append(f"{i}. **{r.label}**: {r.share_of_uncertainty:.0%} ({r.effect})")
    top1 = drv1.iloc[0]
    L.append(f"\nIn year 1 the biggest single driver is **{top1.label}** ({top1.share_of_uncertainty:.0%}). "
             "Checking the top items on site (a household count, a short appliance and business walk-through) "
             "narrows the range most per hour of fieldwork.\n")

    L.append(f"## Sizing: how wrong can the forecast be?\n")
    yd = int(fc.A["sizing"]["design_year"])
    L.append(f"Systems sized for different points of the year-{yd} forecast, each tested against all "
             f"{fc.n_draws:,} simulated futures. Costs are indicative (Omorate 2021 contract data).\n")
    L.append("| Build for | PV kWp | Battery kWh | Capex | Brownouts in year 5 | Under 60% used in year 2 "
             "| Cost per kWh served, year 5 (P50) | Revenue covers cost in year 5 |")
    L.append("|---|---|---|---|---|---|---|---|")
    r5 = risk[risk.year == 5].set_index("design")
    r2 = risk[risk.year == 2].set_index("design")
    for _, d in designs.iterrows():
        a5, a2 = r5.loc[d.design], r2.loc[d.design]
        L.append(f"| P{int(d.design_quantile * 100)} ({d.design_kwh_day:,.0f} kWh/day) | {d.pv_kwp:,.0f} | "
                 f"{d.battery_kwh:,.0f} | ${d.capex_usd:,.0f} | {a5.p_brownouts:.0%} | {a2.p_underused:.0%} | "
                 f"${a5.cost_per_kwh_p50:.2f} | {1 - a5.p_revenue_below_cost:.0%} |")
    mid = designs.iloc[(designs["design_quantile"] - 0.5).abs().argmin()]
    be = mid.breakeven_utilisation_at_tariff
    L.append("")
    L.append("- Costs are mostly fixed, so **every 10% shortfall in demand raises the cost per kWh by about 11%**.")
    if be <= 1:
        L.append(f"- At ${fc.tariff:.2f}/kWh, the P50 design covers its annual cost once it is at least "
                 f"**{be:.0%} used**. Below that, the tariff must rise or a subsidy is needed.")
    else:
        need = fc.tariff * be
        L.append(f"- At ${fc.tariff:.2f}/kWh, the P50 design does **not** cover its annual cost even fully used: "
                 f"the cost-recovery tariff is about **${need:.2f}/kWh** with these indicative costs. "
                 "The gap must come from capital subsidy, results-based grants or lower equipment prices.")
    L.append("- Building for a high percentile avoids brownouts but leaves capacity idle in the early years; "
             "a staged build (size for year 2-3, add PV and batteries as demand shows up) limits both risks.\n")

    if tariffs is not None and len(tariffs):
        yd = int(fc.A["sizing"]["design_year"])
        L.append("## Tariff: demand, bills and cost recovery\n")
        L.append(f"Same village at different tariffs (system built for the P50 year-{yd} forecast at each tariff). "
                 "A higher tariff lowers use but raises revenue per kWh.\n")
        L.append(f"| Tariff | Year-{yd} demand (P50) | Household use | Household bill | Capex | "
                 f"Utilisation needed to break even | Revenue covers cost in year {yd} |")
        L.append("|---|---|---|---|---|---|---|")
        for _, t in tariffs.iterrows():
            be = t.breakeven_utilisation
            L.append(f"| ${t.tariff_usd_per_kwh:.2f}/kWh | {t[f'year{yd}_kwh_per_day_p50']:,.0f} kWh/day | "
                     f"{t[f'year{yd}_kwh_per_household_month_p50']:.1f} kWh/month | "
                     f"${t[f'year{yd}_household_bill_usd_month_p50']:.1f}/month | ${t.p50_design_capex_usd:,.0f} | "
                     f"{'not reachable' if be > 1 else f'{be:.0%}'} | {t[f'p_revenue_covers_cost_year{yd}']:.0%} |")
        L.append(f"\nToday's spending on candles, kerosene, batteries and diesel: "
                 f"${spend_lo}-{spend_hi}/month per household.\n")

    L.append("## Limits\n")
    L.append("- No meter data from this site yet. All inputs come from published studies and are listed with "
             "sources in assumptions.yaml. Run `demand_forecast.py validate` on held-out metered sites to "
             "score and calibrate the ranges.")
    L.append("- The peak uses a statistical coincidence model (the hourly load exceeded on only 1% of days in the hottest month). "
             "Use the 8760 hourly files in HOMER or REopt for detailed design.")
    L.append("- Costs exclude financing terms and are 2021 Ethiopian prices; replace them with current quotes.")
    return "\n".join(L) + "\n"
