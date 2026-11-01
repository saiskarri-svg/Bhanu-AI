#!/usr/bin/env python3
"""
pv_vs_demand.py
===============

Lay the forecast's hourly demand over clear-sky PV output, month by month, and
work out how much of the load the battery has to carry.

Inputs
  --demand   *_hourly_8760.csv from demand_forecast.py (columns yearN_pXX_kw)
  --pv       *_clearsky_<freq>.csv from clearsky_pv.py (column p_ac_kw, local time)
  --sizing   *_sizing_designs.csv from demand_forecast.py (optional, found next to --demand)

For each month's average day (hour by hour):
  direct PV use      = sum of min(demand, PV)
  from battery       = sum of max(demand - PV, 0)     evening, night, early morning
  PV surplus         = sum of max(PV - demand, 0)     charges the battery, the rest is spilled
  recharge check     = surplus x round-trip efficiency >= energy drawn from the battery
  usable capacity    = largest drop in stored energy over the daily cycle
For the whole year, hour by hour, with a battery size (the forecast's design by
default): unmet demand, spilled PV, battery cycles and lowest state of charge.

Clear sky is the best case. Dusty or cloudy days need more battery or more PV.

Example
  python pv_vs_demand.py --demand examples/benichab_forecast/benichab_mauritania_hourly_8760.csv \\
      --pv examples/benichab_clearsky/benichab_mauritania_clearsky_15min.csv --year 5 --name Benichab
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = np.array([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])


# =============================================================================
# Loading
# =============================================================================
def load_demand(path, year=5) -> pd.DataFrame:
    """8760 rows: month, hour and demand kW for the P10 / P50 / P90 scenarios of one forecast year."""
    d = pd.read_csv(path)
    cols = {q: f"year{year}_{q}_kw" for q in ("p10", "p50", "p90")}
    missing = [c for c in cols.values() if c not in d.columns]
    if missing:
        raise ValueError(f"{path}: columns {missing} not found (is this a *_hourly_8760.csv from demand_forecast.py?)")
    if len(d) != 8760:
        raise ValueError(f"{path}: expected 8760 hourly rows, found {len(d)}")
    return pd.DataFrame({"month": d["month"].values, "hour": d["hour"].values,
                         **{q: d[c].values for q, c in cols.items()}})


def load_pv(path) -> tuple[pd.DataFrame, dict]:
    """Clear-sky AC power averaged to hours (8760 rows). Also returns the run's settings if saved."""
    p = pd.read_csv(path, index_col=0)
    idx = pd.to_datetime(p.index, utc=True)
    meta = {}
    mpath = Path(path).with_name(re.sub(r"_clearsky_[^_]+\.csv$", "_clearsky_meta.json", Path(path).name))
    if mpath.exists():
        meta = json.loads(mpath.read_text())
    tz = (meta.get("site") or {}).get("tz")
    if tz:
        idx = idx.tz_convert(tz)
    s = pd.Series(p["p_ac_kw"].values, index=idx).resample("1h").mean()
    s = s[~((s.index.month == 2) & (s.index.day == 29))]          # leap years -> 8760
    if len(s) != 8760:
        raise ValueError(f"{path}: expected one year of data, found {len(s)} hours")
    return pd.DataFrame({"month": s.index.month, "hour": s.index.hour, "pv_kw": s.values}), meta


def load_design(path, quantile=0.5) -> dict | None:
    if not path or not Path(path).exists():
        return None
    d = pd.read_csv(path)
    row = d.iloc[(d["design_quantile"] - quantile).abs().argmin()]
    return {"name": row["design"], "pv_kwp": float(row["pv_kwp"]), "battery_kwh": float(row["battery_kwh"]),
            "inverter_kw": float(row["inverter_kw"])}


# =============================================================================
# Energy balance
# =============================================================================
def average_day(values, month, hour) -> np.ndarray:
    """12 x 24 matrix of the average kW in each hour of each month."""
    df = pd.DataFrame({"v": values, "m": month, "h": hour})
    return df.pivot_table(index="m", columns="h", values="v", aggfunc="mean").reindex(
        index=range(1, 13), columns=range(24)).fillna(0).values


def daily_balance(demand24, pv24, roundtrip=0.9) -> dict:
    """Energy flows of one average day (kWh). Battery charge/discharge efficiency = sqrt(round trip)."""
    d, p = np.asarray(demand24, float), np.asarray(pv24, float)
    eta = np.sqrt(roundtrip)
    direct = np.minimum(d, p)
    deficit = np.clip(d - p, 0, None)
    surplus = np.clip(p - d, 0, None)
    # stored energy over the day, charging with every surplus kWh; the largest drop from the
    # day's high point (wrapping past midnight) is the usable capacity the night needs.
    flow = surplus * eta - deficit / eta
    k = int(np.argmax(np.cumsum(flow)))
    c = np.cumsum(np.roll(flow, -(k + 1)))
    drawdown = float(np.max(np.maximum.accumulate(np.concatenate([[0.0], c]))[1:] - c).clip(min=0))
    need_charge = deficit.sum() / roundtrip
    return {"demand_kwh": d.sum(), "pv_kwh": p.sum(), "direct_pv_kwh": direct.sum(),
            "from_battery_kwh": deficit.sum(), "battery_share": deficit.sum() / d.sum() if d.sum() else 0.0,
            "pv_surplus_kwh": surplus.sum(), "spilled_after_recharge_kwh": max(surplus.sum() - need_charge, 0.0),
            "recharge_ok": bool(surplus.sum() >= need_charge - 1e-9),
            "pv_shortfall_kwh": max(need_charge - surplus.sum(), 0.0),
            "usable_capacity_needed_kwh": drawdown,
            "max_battery_power_kw": deficit.max(), "battery_hours": int((deficit > 1e-9).sum())}


@dataclass
class Battery:
    nominal_kwh: float
    dod: float = 0.8
    roundtrip: float = 0.9
    inverter_kw: float | None = None     # limits discharge power (None = no limit)

    @property
    def usable_kwh(self):
        return self.nominal_kwh * self.dod


def simulate_year(demand, pv, bat: Battery, soc0=1.0) -> pd.DataFrame:
    """Hour-by-hour dispatch: PV serves load first, surplus charges the battery, the battery covers deficits."""
    eta = np.sqrt(bat.roundtrip)
    cap = bat.usable_kwh
    n = len(demand)
    out = {k: np.zeros(n) for k in ("pv_direct", "charge", "discharge", "unmet", "spilled", "soc_kwh")}
    soc = soc0 * cap
    for i in range(n):
        d, p = demand[i], pv[i]
        direct = min(d, p)
        if p > d:
            room = (cap - soc) / eta                          # PV kWh the battery can still take
            ch = min(p - d, room)
            soc += ch * eta
            out["charge"][i], out["spilled"][i] = ch, p - d - ch
        else:
            need = d - p
            lim = need if bat.inverter_kw is None else min(need, bat.inverter_kw)
            dis = min(lim, soc * eta)
            soc -= dis / eta
            out["discharge"][i], out["unmet"][i] = dis, need - dis
        out["pv_direct"][i], out["soc_kwh"][i] = direct, soc
    df = pd.DataFrame(out)
    df["demand"], df["pv"] = demand, pv
    df["soc_pct"] = 100 * df["soc_kwh"] / cap if cap > 0 else 0.0
    return df


def monthly_table(dem: pd.DataFrame, pv: pd.DataFrame, roundtrip, sim: pd.DataFrame | None, bat: Battery | None):
    P = average_day(pv["pv_kw"], pv["month"], pv["hour"])
    rows = []
    for q in ("p10", "p50", "p90"):
        D = average_day(dem[q], dem["month"], dem["hour"])
        for m in range(12):
            b = daily_balance(D[m], P[m], roundtrip)
            rows.append({"month": MONTHS[m], "scenario": q, **b})
    t = pd.DataFrame(rows)
    wide = t[t.scenario == "p50"].drop(columns="scenario").reset_index(drop=True)
    for q in ("p10", "p90"):
        sub = t[t.scenario == q].reset_index(drop=True)
        for c in ("demand_kwh", "from_battery_kwh", "usable_capacity_needed_kwh"):
            wide[f"{c}_{q}"] = sub[c]
    if sim is not None:
        sim = sim.assign(month=dem["month"].values)
        g = sim.groupby("month")
        wide["year_sim_demand_kwh"] = g["demand"].sum().values
        wide["year_sim_unmet_kwh"] = g["unmet"].sum().values
        wide["year_sim_unmet_pct"] = 100 * wide["year_sim_unmet_kwh"] / wide["year_sim_demand_kwh"]
        wide["year_sim_spilled_pv_kwh"] = g["spilled"].sum().values
        wide["year_sim_battery_out_kwh"] = g["discharge"].sum().values
        wide["year_sim_min_soc_pct"] = g["soc_pct"].min().values
        wide["year_sim_cycles"] = wide["year_sim_battery_out_kwh"] / (bat.usable_kwh * np.sqrt(bat.roundtrip))
    return wide, P


# =============================================================================
# Charts
# =============================================================================
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, INK2, MUTED, GRID, BASE, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7", "#fcfcfb"
BLUE_WASH, ORANGE_WASH, BLUE_LIGHT = "#cde2fb", "#fbd9c9", "#9ec5f4"


def _style(ax):
    ax.set_facecolor(SURFACE)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(BASE)
    ax.spines["bottom"].set_color(BASE)
    ax.tick_params(colors=MUTED, labelsize=8.5, length=0)
    ax.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)


def _header(fig, title, sub, note=None, y=(0.965, 0.928, 0.9)):
    fig.text(0.04, y[0], title, fontsize=16, fontweight="bold", color=INK, va="top")
    fig.text(0.04, y[1], sub, fontsize=10.5, color=INK2, va="top")
    if note:
        fig.text(0.04, y[2], note, fontsize=9.5, color=MUTED, va="top")


def _x(n=24):
    return np.arange(n) + 0.5            # hourly averages plotted at the middle of each hour


def plot_months(D, P, table, ctx, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch
    fig, axes = plt.subplots(3, 4, figsize=(16, 10.8), sharex=True, sharey=True, facecolor=SURFACE)
    fig.subplots_adjust(left=0.06, right=0.985, top=0.82, bottom=0.075, wspace=0.08, hspace=0.34)
    ymax = max(D.max(), P.max()) * 1.25
    x = _x()
    # repeat the first point at 24 h so the day closes
    xx = np.append(x, 24.5)
    for m, ax in enumerate(axes.flat):
        _style(ax)
        d, p = np.append(D[m], D[m][0]), np.append(P[m], P[m][0])
        ax.fill_between(xx, p, d, where=d > p, interpolate=True, color=BLUE_WASH, linewidth=0)
        ax.fill_between(xx, d, p, where=p > d, interpolate=True, color=ORANGE_WASH, linewidth=0)
        ax.plot(xx, p, color=ORANGE, lw=2)
        ax.plot(xx, d, color=BLUE, lw=2)
        r = table.iloc[m]
        ax.set_title(MONTHS[m], loc="left", fontsize=11, fontweight="bold", color=INK, pad=4)
        ax.text(0.03, 0.96, f"Battery {r.from_battery_kwh:,.0f} kWh ({r.battery_share:.0%} of demand)\n"
                f"PV surplus {r.pv_surplus_kwh:,.0f} kWh", transform=ax.transAxes, fontsize=8.5,
                color=INK2, va="top", linespacing=1.4)
        if not r.recharge_ok:
            ax.text(0.97, 0.96, "PV can't refill\nthe battery", transform=ax.transAxes, fontsize=8.5,
                    color=INK, ha="right", va="top", fontweight="bold")
        ax.set_xlim(0, 24)
        ax.set_xticks([0, 6, 12, 18, 24])
        ax.set_ylim(0, ymax)
    for ax in axes[:, 0]:
        ax.set_ylabel("kW (hourly average)", fontsize=9.5, color=INK2)
    for ax in axes[-1, :]:
        ax.set_xlabel(f"Hour of day, local time ({ctx['tz']})", fontsize=9, color=INK2)
    _header(fig, f"Demand vs clear-sky PV, average day of each month: {ctx['name']}",
            f"Year-{ctx['year']} demand forecast ({ctx['q'].upper()}), {ctx['demand_kwh_day']:,.0f} kWh/day on average; "
            f"clear-sky PV {ctx['pv_kwp']:.1f} kWp ({ctx['pv_note']}).",
            "Blue area: load the battery must carry (demand above PV). Orange area: PV surplus that recharges "
            "the battery; what is left is spilled. Clear sky is the best case.")
    fig.legend(handles=[Line2D([], [], color=BLUE, lw=2, label=f"Demand (year {ctx['year']}, {ctx['q'].upper()})"),
                        Line2D([], [], color=ORANGE, lw=2, label="Clear-sky PV (AC)"),
                        Patch(color=BLUE_WASH, label="From the battery"),
                        Patch(color=ORANGE_WASH, label="PV surplus")],
               loc="upper left", bbox_to_anchor=(0.04, 0.885), ncol=4, frameon=False, fontsize=9.5,
               labelcolor=INK2)
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


def plot_summary(table, ctx, bat: Battery | None, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 6.4), facecolor=SURFACE)
    fig.subplots_adjust(left=0.05, right=0.985, top=0.72, bottom=0.1, wspace=0.16)
    x = np.arange(12)
    for ax in (a1, a2):
        _style(ax)
        ax.grid(False, axis="x")
        ax.set_xticks(x, MONTHS)
    # how the average day's demand is met
    a1.bar(x, table["direct_pv_kwh"], width=0.6, color=ORANGE, edgecolor=SURFACE, linewidth=1.5,
           label="Straight from PV")
    a1.bar(x, table["from_battery_kwh"], bottom=table["direct_pv_kwh"], width=0.6, color=BLUE,
           edgecolor=SURFACE, linewidth=1.5, label="From the battery")
    for xi, tot, share in zip(x, table["demand_kwh"], table["battery_share"]):
        a1.text(xi, tot * 1.02, f"{share:.0%}", ha="center", va="bottom", fontsize=8.5, color=INK)
    a1.set_ylim(0, table["demand_kwh"].max() * 1.2)
    a1.set_ylabel("kWh per day", fontsize=9.5, color=INK2)
    a1.set_title("How the average day's demand is met (label: share from battery)", loc="left",
                 fontsize=11.5, fontweight="bold", color=INK)
    a1.legend(loc="upper left", frameon=False, fontsize=9, labelcolor=INK2, ncol=2)
    # usable battery capacity needed per night vs installed
    lo, mid, hi = (table["usable_capacity_needed_kwh_p10"], table["usable_capacity_needed_kwh"],
                   table["usable_capacity_needed_kwh_p90"])
    a2.vlines(x, np.minimum(lo, hi), np.maximum(lo, hi), color=BLUE_LIGHT, lw=6)
    a2.scatter(x, mid, s=46, color=BLUE, edgecolor=SURFACE, linewidth=2, zorder=3)
    top = float(np.maximum(lo, hi).max())
    from matplotlib.lines import Line2D
    handles = [Line2D([], [], marker="o", color=BLUE, lw=0, markersize=7, label="P50 demand"),
               Line2D([], [], color=BLUE_LIGHT, lw=6, label="P10-P90 demand")]
    if bat is not None:
        a2.axhline(bat.usable_kwh, color=INK2, lw=1)
        handles.append(Line2D([], [], color=INK2, lw=1, label=f"Design battery: {bat.usable_kwh:,.0f} kWh usable "
                              f"({bat.nominal_kwh:,.0f} kWh x DoD {bat.dod:g})"))
        top = max(top, bat.usable_kwh)
    a2.legend(handles=handles, loc="upper left", ncol=3, frameon=False, fontsize=8.8, labelcolor=INK2)
    a2.set_ylim(0, top * 1.3)
    a2.set_ylabel("kWh usable", fontsize=9.5, color=INK2)
    a2.set_title("Usable battery capacity one night needs (dot P50, bar P10-P90 demand)", loc="left",
                 fontsize=11.5, fontweight="bold", color=INK)
    sim = ""
    if "year_sim_unmet_kwh" in table:
        un = table["year_sim_unmet_kwh"].sum() / table["year_sim_demand_kwh"].sum()
        sp = table["year_sim_spilled_pv_kwh"].sum()
        sim = (f"Hour-by-hour year with the design battery (clear sky): {un:.1%} of demand unserved, "
               f"{sp / 1000:,.1f} MWh of PV spilled, {table['year_sim_cycles'].sum():,.0f} full cycles, "
               f"lowest charge {table['year_sim_min_soc_pct'].min():.0f}%.")
    _header(fig, f"What the battery has to carry: {ctx['name']}",
            f"Year-{ctx['year']} demand ({ctx['q'].upper()}) vs clear-sky PV {ctx['pv_kwp']:.1f} kWp. "
            f"On an average day {table['battery_share'].mean():.0%} of demand comes from the battery, "
            f"mostly between sunset and midnight.", sim, y=(0.96, 0.895, 0.845))
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


def plot_week(sim, dem_month, ctx, bat: Battery, month, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    i0 = int(np.argmax(dem_month == month)) + 7 * 24          # second week of the month
    w = sim.iloc[i0:i0 + 7 * 24]
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(16, 7.6), sharex=True, facecolor=SURFACE,
                                 gridspec_kw={"height_ratios": [2, 1]})
    fig.subplots_adjust(left=0.06, right=0.985, top=0.8, bottom=0.09, hspace=0.18)
    t = np.arange(len(w)) / 24
    for ax in (a1, a2):
        _style(ax)
    a1.fill_between(t, w["pv"], w["demand"], where=w["demand"] > w["pv"], step="post", color=BLUE_WASH, lw=0)
    a1.fill_between(t, w["demand"], w["pv"], where=w["pv"] > w["demand"], step="post", color=ORANGE_WASH, lw=0)
    a1.step(t, w["pv"], where="post", color=ORANGE, lw=2, label="Clear-sky PV (AC)")
    a1.step(t, w["demand"], where="post", color=BLUE, lw=2, label="Demand")
    a1.set_ylabel("kW", fontsize=9.5, color=INK2)
    a1.legend(loc="upper left", bbox_to_anchor=(0, 1.16), ncol=2, frameon=False, fontsize=9.5, labelcolor=INK2)
    a2.plot(t, w["soc_pct"], color=BLUE, lw=2)
    a2.set_ylim(0, 105)
    a2.set_ylabel("Battery charge (% of usable)", fontsize=9.5, color=INK2)
    first_day = 8
    a2.set_xticks(range(8), [f"{MONTHS[month - 1]} {first_day + i}" for i in range(8)])
    _header(fig, f"One week in {MONTHS[month - 1]}, hour by hour: {ctx['name']}",
            f"Design battery {bat.nominal_kwh:,.0f} kWh ({bat.usable_kwh:,.0f} kWh usable), round trip "
            f"{bat.roundtrip:.0%}; battery inverter "
            f"{'unlimited' if bat.inverter_kw is None else f'{bat.inverter_kw:.1f} kW'}. "
            "Charge falls every evening and refills by early afternoon.", y=(0.965, 0.915, 0.88))
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


# =============================================================================
# CLI
# =============================================================================
def slugify(text):
    s = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return (s or "site")[:48]


def run(demand_path, pv_path, year=5, q="p50", sizing_path="auto", design_quantile=0.5,
        battery_kwh=None, dod=0.8, roundtrip=0.9, inverter_kw=None, scale_pv="auto", name=None,
        out_dir="pv_vs_demand", plots=True) -> dict:
    dem = load_demand(demand_path, year)
    pv, meta = load_pv(pv_path)
    if sizing_path == "auto":
        cand = Path(demand_path).with_name(Path(demand_path).name.replace("_hourly_8760.csv",
                                                                           "_sizing_designs.csv"))
        sizing_path = cand if cand.exists() else None
    design = load_design(sizing_path, design_quantile)

    sim_kwp = (meta.get("array") or {}).get("kwp")
    pv_note = "as simulated"
    if isinstance(scale_pv, (int, float)) and not isinstance(scale_pv, bool):
        pv["pv_kw"] *= scale_pv
        pv_note = f"scaled x{scale_pv:g}"
        kwp = (sim_kwp or 1.0) * scale_pv
    elif scale_pv == "auto" and design and sim_kwp:
        f = design["pv_kwp"] / sim_kwp
        pv["pv_kw"] *= f
        kwp = design["pv_kwp"]
        pv_note = f"scaled from the {sim_kwp:g} kWp clear-sky run to the {design['name']} design"
    else:
        kwp = sim_kwp or float("nan")

    bat = None
    if battery_kwh is not None:
        bat = Battery(battery_kwh, dod, roundtrip, inverter_kw)
    elif design:
        bat = Battery(design["battery_kwh"], dod, roundtrip,
                      inverter_kw if inverter_kw is not None else design["inverter_kw"])
    sim = simulate_year(dem[q].values, pv["pv_kw"].values, bat) if bat else None
    table, P = monthly_table(dem, pv, roundtrip, sim, bat)
    D = average_day(dem[q], dem["month"], dem["hour"])

    tz = (meta.get("site") or {}).get("tz", "local time")
    label = name or (meta.get("site") or {}).get("name") or Path(demand_path).stem.replace("_hourly_8760", "")
    ctx = {"name": label, "year": year, "q": q, "pv_kwp": kwp, "pv_note": pv_note, "tz": tz,
           "demand_kwh_day": float(dem[q].sum() / 365)}
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    slug = slugify(label)
    files = {"monthly": out / f"{slug}_pv_vs_demand_monthly.csv"}
    table.round(3).to_csv(files["monthly"], index=False)
    if sim is not None:
        files["hourly"] = out / f"{slug}_battery_dispatch_8760.csv"
        sim.assign(month=dem["month"].values, hour=dem["hour"].values).round(4).to_csv(files["hourly"],
                                                                                         index_label="hour_of_year")
    if plots:
        files["months_png"] = out / f"{slug}_pv_vs_demand_by_month.png"
        plot_months(D, P, table, ctx, files["months_png"])
        files["summary_png"] = out / f"{slug}_battery_needs.png"
        plot_summary(table, ctx, bat, files["summary_png"])
        if sim is not None:
            worst = int(np.argmax(table["usable_capacity_needed_kwh"].values)) + 1
            files["week_png"] = out / f"{slug}_battery_week.png"
            plot_week(sim, dem["month"].values, ctx, bat, worst, files["week_png"])

    print(f"\n{label}: year-{year} demand ({q.upper()}) vs clear-sky PV {kwp:.1f} kWp ({pv_note})")
    if bat:
        print(f"Battery: {bat.nominal_kwh:.1f} kWh nominal, {bat.usable_kwh:.1f} kWh usable"
              + (f" (from {design['name']})" if design and battery_kwh is None else ""))
    cols = ["month", "demand_kwh", "pv_kwh", "direct_pv_kwh", "from_battery_kwh", "battery_share",
            "pv_surplus_kwh", "usable_capacity_needed_kwh", "usable_capacity_needed_kwh_p90", "recharge_ok"]
    if sim is not None:
        cols += ["year_sim_unmet_pct", "year_sim_min_soc_pct"]
    print(table[cols].round(2).to_string(index=False))
    print("\nSaved:\n" + "\n".join(f"  {p}" for p in files.values()))
    return {"table": table, "sim": sim, "battery": bat, "design": design, "files": files}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Overlay forecast demand on clear-sky PV and size the battery's job.",
                                 formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    ap.add_argument("--demand", required=True, help="*_hourly_8760.csv from demand_forecast.py")
    ap.add_argument("--pv", required=True, help="*_clearsky_<freq>.csv from clearsky_pv.py")
    ap.add_argument("--year", type=int, default=5, help="forecast year (1-5)")
    ap.add_argument("--scenario", choices=["p10", "p50", "p90"], default="p50")
    ap.add_argument("--sizing", default="auto", help="*_sizing_designs.csv ('auto' = next to --demand, 'none')")
    ap.add_argument("--design", type=float, default=0.5, help="which design to test (forecast quantile)")
    ap.add_argument("--battery-kwh", type=float, help="nominal battery size (overrides the design)")
    ap.add_argument("--dod", type=float, default=0.8, help="usable depth of discharge")
    ap.add_argument("--roundtrip", type=float, default=0.9, help="battery round-trip efficiency")
    ap.add_argument("--inverter-kw", type=float, help="battery inverter power limit (default: design value)")
    ap.add_argument("--pv-scale", default="auto",
                    help="'auto' = scale PV to the design's kWp, 'none', or a number")
    ap.add_argument("--name")
    ap.add_argument("--out", default="pv_vs_demand")
    ap.add_argument("--no-plots", action="store_true")
    a = ap.parse_args(argv)
    scale = a.pv_scale if a.pv_scale in ("auto", "none") else float(a.pv_scale)
    try:
        run(a.demand, a.pv, a.year, a.scenario, None if a.sizing == "none" else a.sizing, a.design,
            a.battery_kwh, a.dod, a.roundtrip, a.inverter_kw, scale, a.name, a.out, plots=not a.no_plots)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
