#!/usr/bin/env python3
"""
clearsky_pv.py
==============

Clear-sky irradiance (Ineichen-Perez model) and PV output for a full year at
any site, with the daily curves drawn for each month.

Chain (each step is a function below):
  1. Solar position: NREL SPA, apparent zenith with refraction at site pressure.
  2. Air mass: Kasten & Young (1989), pressure-corrected for altitude.
  3. Linke turbidity: monthly climatology shipped with pvlib (Remund et al. 2003,
     SoDa), interpolated to daily values, or your own values.
  4. Clear-sky GHI, DNI, DHI: Ineichen & Perez (2002). Equations written out in
     ineichen_perez(); tested against pvlib.clearsky.ineichen.
  5. Plane of array: beam + Perez (1990) sky diffuse (isotropic, circumsolar and
     horizon parts) + ground-reflected (albedo).
  6. Reflection losses: physical IAM for beam and circumsolar; Marion
     integration for sky, horizon and ground diffuse.
  7. Cell temperature: Faiman model; ambient follows a daily cycle built from
     monthly mean minimum and maximum temperatures (min at solar 06:00, max at 15:00).
  8. DC power: PVWatts (nominal kWp, temperature coefficient), minus system losses.
  9. AC power: PVWatts inverter with the DC/AC ratio (clipping included).

Clear sky is the upper bound: real output is lower on cloudy, hazy or dusty days.

Example
-------
  python clearsky_pv.py --lat 19.47116 --lon -15.42852 --altitude 50 --kwp 31 \\
      --tilt 20 --azimuth 180 --name "Benichab, Mauritania" \\
      --tmax 28.3,31.1,34.4,37.8,40.6,42.8,41.1,40,40,37.8,33.3,29.4 \\
      --tmin 13.3,15,17.2,20,23.3,26.7,26.1,26.7,26.7,23.9,18.9,15

Azimuth convention: degrees clockwise from north (90 = east, 180 = south, 270 = west).
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

log = logging.getLogger("clearsky_pv")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# =============================================================================
# Inputs
# =============================================================================
@dataclass
class Site:
    latitude: float
    longitude: float
    altitude: float                      # m above sea level
    name: str = ""
    tz: str | None = None                # IANA time zone, e.g. Africa/Nouakchott


@dataclass
class Array:
    kwp: float = 1.0                     # nominal DC power at STC
    tilt: float | None = None            # degrees from horizontal (default: |latitude|, at least 10)
    azimuth: float | None = None         # degrees clockwise from north (default: facing the equator)
    gamma_pdc: float = -0.0037           # power temperature coefficient, 1/degC
    losses_pct: float = 14.0             # soiling, wiring, mismatch, LID, availability... (PVWatts default)
    dc_ac_ratio: float = 1.2
    inverter_eff: float = 0.96
    albedo: float = 0.25                 # sand ~0.3-0.4, grass ~0.2

    def resolve(self, site: Site) -> "Array":
        a = Array(**asdict(self))
        if a.tilt is None:
            a.tilt = float(max(10, round(abs(site.latitude))))
        if a.azimuth is None:
            a.azimuth = 180.0 if site.latitude >= 0 else 0.0
        return a

    @property
    def ac_kw(self):
        return self.kwp / self.dc_ac_ratio


@dataclass
class Options:
    year: int = 2026
    freq: str = "15min"
    linke: list | None = None            # None = climatology; 1 value = constant; 12 = by month
    tmin: list | None = None             # monthly mean daily minimum, degC (1 or 12 values)
    tmax: list | None = None             # monthly mean daily maximum, degC (1 or 12 values)
    wind_speed: float = 2.0              # m/s
    diffuse_model: str = "perez"         # "perez" or "isotropic"
    perez_enhancement: bool = False      # Ineichen option, see pvlib issue #435


def monthly(values, default, name):
    if values is None:
        values = default
    v = np.atleast_1d(np.asarray(values, float))
    if v.size == 1:
        v = np.repeat(v, 12)
    if v.size != 12:
        raise ValueError(f"{name}: give 1 or 12 values, got {v.size}")
    return v


def default_timezone(lat, lon):
    try:
        from timezonefinder import TimezoneFinder
        tz = TimezoneFinder().timezone_at(lat=lat, lng=lon)
        if tz:
            return tz
    except ImportError:
        pass
    log.warning("Could not determine the time zone (pip install timezonefinder); using UTC. Pass --tz.")
    return "UTC"


# =============================================================================
# Physics
# =============================================================================
def ineichen_perez(apparent_zenith, airmass_absolute, linke_turbidity, altitude, dni_extra,
                   perez_enhancement=False):
    """Ineichen & Perez (2002) clear-sky model.

    GHI = cg1 * I0 * cos(Z) * exp(-cg2 * AM * (fh1 + fh2 * (TL - 1)))   [* exp(0.01 * AM^1.8)]
    DNI = min( b * I0 * exp(-0.09 * AM * (TL - 1)),
               GHI * (1 - (0.1 - 0.2 * exp(-TL)) / (0.1 + 0.882 / fh1)) / cos(Z) )
    DHI = GHI - DNI * cos(Z)
    with fh1 = exp(-h/8000), fh2 = exp(-h/1250), cg1 = 5.09e-5 h + 0.868,
         cg2 = 3.92e-5 h + 0.0387, b = 0.664 + 0.163 / fh1, h = altitude (m),
         AM = absolute (pressure-corrected) air mass, I0 = extraterrestrial normal irradiance.
    Matches pvlib.clearsky.ineichen (same coefficients and night/NaN handling).
    """
    cos_z = np.maximum(np.cos(np.radians(apparent_zenith)), 0)
    tl, am, h = linke_turbidity, airmass_absolute, altitude
    fh1, fh2 = np.exp(-h / 8000.0), np.exp(-h / 1250.0)
    cg1, cg2 = 5.09e-05 * h + 0.868, 3.92e-05 * h + 0.0387
    g = np.exp(-cg2 * am * (fh1 + fh2 * (tl - 1)))
    if perez_enhancement:
        g = g * np.exp(0.01 * am ** 1.8)
    ghi = cg1 * dni_extra * cos_z * tl / tl * np.fmax(g, 0)      # airmass NaN at night -> 0
    b = 0.664 + 0.163 / fh1
    bnci = dni_extra * np.fmax(b * np.exp(-0.09 * am * (tl - 1)), 0)
    with np.errstate(divide="ignore", invalid="ignore"):
        corr = (1 - (0.1 - 0.2 * np.exp(-tl)) / (0.1 + 0.882 / fh1)) / cos_z
    bnci2 = ghi * np.fmin(np.fmax(corr, 0), 1e20)
    dni = np.minimum(bnci, bnci2)
    dhi = ghi - dni * cos_z
    return ghi, dni, dhi


def solar_hour(times, longitude):
    """Local apparent solar time in hours (12 = solar noon)."""
    eot = pvlib.solarposition.equation_of_time_spencer71(times.dayofyear)
    ha = pvlib.solarposition.hour_angle(times, longitude, eot)
    return (12 + np.asarray(ha) / 15.0) % 24


def diurnal_temperature(solar_h, month_idx, tmin12, tmax12, h_min=6.0, h_max=15.0):
    """Ambient temperature: cosine rise from Tmin (solar 06:00) to Tmax (15:00), cosine fall overnight."""
    lo, hi = tmin12[month_idx], tmax12[month_idx]
    rising = (solar_h >= h_min) & (solar_h <= h_max)
    f = np.where(rising, 0.5 * (1 - np.cos(np.pi * (solar_h - h_min) / (h_max - h_min))),
                 0.5 * (1 + np.cos(np.pi * ((solar_h - h_max) % 24) / (24 - (h_max - h_min)))))
    return lo + (hi - lo) * f


def simulate(site: Site, array: Array, opt: Options) -> tuple[pd.DataFrame, Array]:
    """Year of clear-sky irradiance and PV output. Values are interval averages, labelled by interval start."""
    arr = array.resolve(site)
    tz = site.tz or default_timezone(site.latitude, site.longitude)
    site.tz = tz
    start = pd.Timestamp(f"{opt.year}-01-01", tz=tz)
    idx = pd.date_range(start, start + pd.DateOffset(years=1), freq=opt.freq, inclusive="left")
    step = pd.Timedelta(opt.freq)
    mid = idx + step / 2

    tmin12 = monthly(opt.tmin, 20.0, "tmin")
    tmax12 = monthly(opt.tmax, 32.0, "tmax")
    m = mid.month.values - 1
    temp_air = diurnal_temperature(solar_hour(mid, site.longitude), m, tmin12, tmax12)

    pressure = pvlib.atmosphere.alt2pres(site.altitude)
    sp = pvlib.solarposition.get_solarposition(mid, site.latitude, site.longitude, site.altitude,
                                               pressure=pressure, temperature=float(np.mean(temp_air)))
    zen_app, azi = sp["apparent_zenith"].values, sp["azimuth"].values
    am_rel = pvlib.atmosphere.get_relative_airmass(zen_app, model="kastenyoung1989")
    am_abs = pvlib.atmosphere.get_absolute_airmass(am_rel, pressure)
    dni_extra = pvlib.irradiance.get_extra_radiation(mid).values

    if opt.linke is None:
        tl = pvlib.clearsky.lookup_linke_turbidity(mid, site.latitude, site.longitude).values
    else:
        tl = monthly(opt.linke, None, "linke")[m]
    ghi, dni, dhi = ineichen_perez(zen_app, am_abs, tl, site.altitude, dni_extra, opt.perez_enhancement)

    # ---- plane of array --------------------------------------------------------
    aoi = pvlib.irradiance.aoi(arr.tilt, arr.azimuth, zen_app, azi)
    beam = dni * np.maximum(np.cos(np.radians(aoi)), 0)
    if opt.diffuse_model == "perez":
        c = pvlib.irradiance.perez(arr.tilt, arr.azimuth, dhi, dni, dni_extra, zen_app, azi, am_rel,
                                   return_components=True)
        iso, circ, hor = (np.nan_to_num(np.asarray(c[k], float))
                          for k in ("poa_isotropic", "poa_circumsolar", "poa_horizon"))
    elif opt.diffuse_model == "isotropic":
        iso = pvlib.irradiance.isotropic(arr.tilt, dhi)
        circ = hor = np.zeros_like(iso)
    else:
        raise ValueError("diffuse_model must be 'perez' or 'isotropic'")
    ground = pvlib.irradiance.get_ground_diffuse(arr.tilt, ghi, albedo=arr.albedo)
    poa = beam + iso + circ + hor + ground

    iam_beam = pvlib.iam.physical(aoi)
    iam_d = pvlib.iam.marion_diffuse("physical", arr.tilt)
    effective = (beam + circ) * iam_beam + iso * iam_d["sky"] + hor * iam_d["horizon"] + ground * iam_d["ground"]

    # ---- temperature and power ------------------------------------------------------
    t_cell = pvlib.temperature.faiman(poa, temp_air, opt.wind_speed)
    p_dc = pvlib.pvsystem.pvwatts_dc(effective, t_cell, arr.kwp * 1000, arr.gamma_pdc) / 1000
    p_dc = np.clip(np.nan_to_num(p_dc), 0, None) * (1 - arr.losses_pct / 100)
    p_ac = pvlib.inverter.pvwatts(p_dc * 1000, arr.ac_kw * 1000 / arr.inverter_eff, arr.inverter_eff) / 1000
    p_ac = np.clip(np.nan_to_num(p_ac), 0, None)

    df = pd.DataFrame({
        "solar_zenith_apparent": zen_app, "solar_azimuth": azi, "airmass_absolute": am_abs,
        "linke_turbidity": tl, "ghi": ghi, "dni": dni, "dhi": dhi,
        "poa_global": poa, "poa_beam": beam, "poa_sky_diffuse": iso + circ + hor, "poa_ground": ground,
        "effective_irradiance": effective, "temp_air": temp_air, "temp_cell": t_cell,
        "p_dc_kw": p_dc, "p_ac_kw": p_ac}, index=idx)
    for col in ("airmass_absolute",):
        df[col] = df[col].where(df["solar_zenith_apparent"] < 90)
    df.index.name = f"time_start_{tz.replace('/', '_')}"
    return df, arr


def monthly_summary(df: pd.DataFrame, freq: str, arr: Array) -> pd.DataFrame:
    dt = pd.Timedelta(freq) / pd.Timedelta("1h")
    day = df.groupby(df.index.date)
    daily = pd.DataFrame({
        "month": day.apply(lambda g: g.index[0].month),
        "ghi_kwh_m2": day["ghi"].sum() * dt / 1000, "dni_kwh_m2": day["dni"].sum() * dt / 1000,
        "dhi_kwh_m2": day["dhi"].sum() * dt / 1000, "poa_kwh_m2": day["poa_global"].sum() * dt / 1000,
        "ac_kwh": day["p_ac_kw"].sum() * dt, "dc_kwh": day["p_dc_kw"].sum() * dt,
        "peak_ac_kw": day["p_ac_kw"].max(), "linke": day["linke_turbidity"].mean(),
        "tcell_max": day["temp_cell"].max()})
    g = daily.groupby("month")
    out = pd.DataFrame({
        "month": MONTHS,
        "linke_turbidity": g["linke"].mean().values,
        "ghi_kwh_m2_day": g["ghi_kwh_m2"].mean().values,
        "dni_kwh_m2_day": g["dni_kwh_m2"].mean().values,
        "dhi_kwh_m2_day": g["dhi_kwh_m2"].mean().values,
        "poa_kwh_m2_day": g["poa_kwh_m2"].mean().values,
        "pv_ac_kwh_day": g["ac_kwh"].mean().values,
        "pv_ac_kwh_per_kwp_day": g["ac_kwh"].mean().values / arr.kwp,
        "pv_ac_kwh_month": g["ac_kwh"].sum().values,
        "peak_ac_kw": g["peak_ac_kw"].max().values,
        "max_cell_temp_c": g["tcell_max"].max().values,
        "clipped_kwh_month": (g["dc_kwh"].sum() * arr.inverter_eff - g["ac_kwh"].sum()).clip(lower=0).values,
    })
    out["performance_ratio"] = out["pv_ac_kwh_per_kwp_day"] / out["poa_kwh_m2_day"]
    return out


# =============================================================================
# Charts
# =============================================================================
BLUE, ORANGE, AQUA, YELLOW = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
INK, INK2, MUTED, GRID, BASE, SURFACE, CONTEXT = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7", \
    "#fcfcfb", "#cfcdc6"


def _ax_style(ax):
    ax.set_facecolor(SURFACE)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(BASE)
    ax.spines["bottom"].set_color(BASE)
    ax.tick_params(colors=MUTED, labelsize=8.5, length=0)
    ax.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)


def _hours(index, freq):
    return index.hour + index.minute / 60 + pd.Timedelta(freq) / pd.Timedelta("1h") / 2


def _utc_label(tz, year):
    off = pd.Timestamp(f"{year}-01-15", tz=tz).utcoffset()
    hrs = off.total_seconds() / 3600
    return f"{tz}, UTC{'+' if hrs >= 0 else '-'}{abs(hrs):g}"


def _title(fig, title, sub, note=None, y=(0.965, 0.925, 0.897)):
    fig.text(0.04, y[0], title, fontsize=16, fontweight="bold", color=INK, va="top")
    fig.text(0.04, y[1], sub, fontsize=10.5, color=INK2, va="top")
    if note:
        fig.text(0.04, y[2], note, fontsize=9.5, color=MUTED, va="top")


def describe(site, arr, opt):
    tl = "monthly Linke turbidity climatology" if opt.linke is None else "your Linke turbidity values"
    return (f"{arr.kwp:g} kWp, tilt {arr.tilt:g}°, azimuth {arr.azimuth:g}° "
            f"({'south' if arr.azimuth == 180 else 'north' if arr.azimuth == 0 else 'custom'}-facing), "
            f"DC/AC {arr.dc_ac_ratio:g}, losses {arr.losses_pct:g}%.  Site {site.latitude:.4f}, "
            f"{site.longitude:.4f}, {site.altitude:g} m.  Ineichen-Perez clear sky with {tl}; "
            f"{opt.diffuse_model.capitalize()} transposition; albedo {arr.albedo:g}.")


def plot_pv_by_month(df, site, arr, opt, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(3, 4, figsize=(16, 10.5), sharex=True, sharey=True, facecolor=SURFACE)
    fig.subplots_adjust(left=0.06, right=0.985, top=0.84, bottom=0.08, wspace=0.08, hspace=0.32)
    ymax = max(df["p_ac_kw"].max(), arr.ac_kw) * 1.3
    dt = pd.Timedelta(opt.freq) / pd.Timedelta("1h")
    for mth, ax in enumerate(axes.flat, start=1):
        _ax_style(ax)
        sub = df[df.index.month == mth]
        for d, g in sub.groupby(sub.index.day):
            if d != 15:
                ax.plot(_hours(g.index, opt.freq), g["p_ac_kw"], color=CONTEXT, lw=0.6, alpha=0.7)
        g = sub[sub.index.day == 15]
        ax.plot(_hours(g.index, opt.freq), g["p_ac_kw"], color=BLUE, lw=2, solid_capstyle="round")
        e15, pk = g["p_ac_kw"].sum() * dt, g["p_ac_kw"].max()
        ax.set_title(MONTHS[mth - 1], loc="left", fontsize=11, fontweight="bold", color=INK, pad=4)
        ax.text(0.03, 0.95, f"15th: {e15:,.0f} kWh · peak {pk:.1f} kW", transform=ax.transAxes,
                fontsize=8.5, color=INK2, va="top")
        ax.axhline(arr.ac_kw, color=MUTED, lw=0.8)
        if mth == 1:
            ax.text(21.8, arr.ac_kw, f"inverter limit {arr.ac_kw:.1f} kW", fontsize=8, color=MUTED,
                    ha="right", va="bottom")
        ax.set_xlim(4, 22) if abs(site.latitude) < 50 else ax.set_xlim(0, 24)
        ax.set_xticks([6, 9, 12, 15, 18, 21])
        ax.set_ylim(0, ymax)
    for ax in axes[:, 0]:
        ax.set_ylabel("AC power (kW)", fontsize=9.5, color=INK2)
    for ax in axes[-1, :]:
        ax.set_xlabel(f"Local time ({_utc_label(site.tz, opt.year)})", fontsize=9, color=INK2)
    _title(fig, f"Clear-sky PV output by month: {site.name or 'site'}",
           describe(site, arr, opt),
           "Blue: the 15th of each month. Grey: every other day of the month. "
           "Clear sky is the upper bound: clouds, haze and dust lower real output.")
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


def plot_irradiance_by_month(df, site, arr, opt, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    fig, axes = plt.subplots(3, 4, figsize=(16, 10.5), sharex=True, sharey=True, facecolor=SURFACE)
    fig.subplots_adjust(left=0.06, right=0.985, top=0.83, bottom=0.08, wspace=0.08, hspace=0.32)
    series = [("poa_global", f"Plane of array ({arr.tilt:g}° / {arr.azimuth:g}°)", BLUE),
              ("ghi", "Global horizontal (GHI)", ORANGE), ("dni", "Direct normal (DNI)", AQUA),
              ("dhi", "Diffuse horizontal (DHI)", YELLOW)]
    ymax = max(df["dni"].max(), df["poa_global"].max()) * 1.12
    for mth, ax in enumerate(axes.flat, start=1):
        _ax_style(ax)
        g = df[(df.index.month == mth) & (df.index.day == 15)]
        x = _hours(g.index, opt.freq)
        for col, _, colr in series:
            ax.plot(x, g[col], color=colr, lw=2)
        ax.set_title(MONTHS[mth - 1], loc="left", fontsize=11, fontweight="bold", color=INK, pad=4)
        ax.text(0.03, 0.95, f"Linke turbidity {g['linke_turbidity'].mean():.1f}", transform=ax.transAxes,
                fontsize=8.5, color=INK2, va="top")
        ax.set_xlim(4, 22) if abs(site.latitude) < 50 else ax.set_xlim(0, 24)
        ax.set_xticks([6, 9, 12, 15, 18, 21])
        ax.set_ylim(0, ymax)
    for ax in axes[:, 0]:
        ax.set_ylabel("W/m²", fontsize=9.5, color=INK2)
    for ax in axes[-1, :]:
        ax.set_xlabel(f"Local time ({_utc_label(site.tz, opt.year)})", fontsize=9, color=INK2)
    _title(fig, f"Clear-sky irradiance on the 15th of each month: {site.name or 'site'}",
           f"Ineichen-Perez model; altitude {site.altitude:g} m; "
           f"{'monthly Linke turbidity climatology (pvlib / SoDa)' if opt.linke is None else 'your Linke turbidity'}.")
    fig.legend(handles=[Line2D([], [], color=c, lw=2, label=l) for _, l, c in series], loc="upper left",
               bbox_to_anchor=(0.04, 0.905), ncol=4, frameon=False, fontsize=9.5, labelcolor=INK2)
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


def plot_monthly_summary(summ, site, arr, opt, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.6), facecolor=SURFACE,
                                 gridspec_kw={"width_ratios": [1.6, 1]})
    fig.subplots_adjust(left=0.055, right=0.985, top=0.72, bottom=0.12, wspace=0.18)
    x = np.arange(12)
    for ax in (a1, a2):
        _ax_style(ax)
        ax.grid(False, axis="x")
    b = a1.bar(x, summ["pv_ac_kwh_day"], width=0.6, color=BLUE)
    for xi, v, s in zip(x, summ["pv_ac_kwh_day"], summ["pv_ac_kwh_per_kwp_day"]):
        a1.text(xi, v * 1.01, f"{v:,.0f}\n({s:.1f}/kWp)", ha="center", va="bottom", fontsize=8.3, color=INK)
    a1.set_xticks(x, MONTHS)
    a1.set_ylim(0, summ["pv_ac_kwh_day"].max() * 1.22)
    a1.set_ylabel("kWh per day (AC)", fontsize=9.5, color=INK2)
    a1.set_title("Clear-sky PV energy, average day of each month", loc="left", fontsize=11.5,
                 fontweight="bold", color=INK)
    a2.plot(x, summ["linke_turbidity"], color=BLUE, lw=2)
    a2.scatter(x, summ["linke_turbidity"], s=42, color=BLUE, edgecolor=SURFACE, linewidth=2, zorder=3)
    for xi, v in zip(x, summ["linke_turbidity"]):
        a2.text(xi, v + 0.15, f"{v:.1f}", ha="center", fontsize=8.3, color=INK)
    a2.set_xticks(x, [m[0] for m in MONTHS])
    a2.set_ylim(0, summ["linke_turbidity"].max() * 1.25)
    a2.set_title("Linke turbidity (higher = hazier, less direct sun)", loc="left", fontsize=11.5,
                 fontweight="bold", color=INK)
    tot = summ["pv_ac_kwh_month"].sum()
    _title(fig, f"Clear-sky year: {site.name or 'site'}",
           f"{tot / 1000:,.1f} MWh AC per year at clear sky ({tot / arr.kwp:,.0f} kWh/kWp); "
           f"clear-sky GHI {(summ['ghi_kwh_m2_day'] * [31,28,31,30,31,30,31,31,30,31,30,31]).sum():,.0f} kWh/m² "
           f"per year.  Upper bound: real years are lower.", y=(0.95, 0.865, 0.8))
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)


# =============================================================================
# CLI
# =============================================================================
def slugify(text):
    s = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return (s or "site")[:48]


def floats(s):
    return None if s is None else [float(x) for x in str(s).replace(";", ",").split(",") if x.strip()]


def run(site: Site, array: Array, opt: Options, out_dir="clearsky", plots=True) -> dict:
    df, arr = simulate(site, array, opt)
    summ = monthly_summary(df, opt.freq, arr)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    slug = slugify(site.name or f"{site.latitude:.3f}_{site.longitude:.3f}")
    files = {"timeseries": out / f"{slug}_clearsky_{opt.freq}.csv",
             "monthly": out / f"{slug}_clearsky_monthly.csv"}
    df.round(3).to_csv(files["timeseries"])
    summ.round(3).to_csv(files["monthly"], index=False)
    files["meta"] = out / f"{slug}_clearsky_meta.json"
    import json
    files["meta"].write_text(json.dumps({"site": asdict(site), "array": asdict(arr), "options": asdict(opt),
                                         "ac_kw": arr.ac_kw, "timeseries": files["timeseries"].name}, indent=2))
    if plots:
        files["pv_png"] = out / f"{slug}_pv_power_by_month.png"
        plot_pv_by_month(df, site, arr, opt, files["pv_png"])
        files["irr_png"] = out / f"{slug}_irradiance_by_month.png"
        plot_irradiance_by_month(df, site, arr, opt, files["irr_png"])
        files["summary_png"] = out / f"{slug}_clearsky_year.png"
        plot_monthly_summary(summ, site, arr, opt, files["summary_png"])
    print(f"\nClear-sky year {opt.year}: {site.name or ''} ({site.latitude}, {site.longitude}, {site.altitude:g} m, "
          f"{site.tz})\nArray: {arr.kwp:g} kWp, tilt {arr.tilt:g}°, azimuth {arr.azimuth:g}°, "
          f"DC/AC {arr.dc_ac_ratio:g} ({arr.ac_kw:.1f} kW AC)\n")
    show = summ[["month", "linke_turbidity", "ghi_kwh_m2_day", "dni_kwh_m2_day", "poa_kwh_m2_day",
                 "pv_ac_kwh_day", "pv_ac_kwh_per_kwp_day", "peak_ac_kw", "max_cell_temp_c"]]
    print(show.round(2).to_string(index=False))
    print(f"\nYear: {summ.pv_ac_kwh_month.sum() / 1000:,.2f} MWh AC "
          f"({summ.pv_ac_kwh_month.sum() / arr.kwp:,.0f} kWh/kWp) at clear sky")
    print("\nSaved:\n" + "\n".join(f"  {p}" for p in files.values()))
    return {"df": df, "summary": summ, "array": arr, "files": files}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Clear-sky (Ineichen-Perez) irradiance and PV output for a year.",
                                 formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    ap.add_argument("--lat", type=float, required=True, help="latitude, degrees (north +)")
    ap.add_argument("--lon", type=float, required=True, help="longitude, degrees (east +)")
    ap.add_argument("--altitude", type=float, required=True, help="site altitude, m above sea level")
    ap.add_argument("--name", default="", help="site name for titles and file names")
    ap.add_argument("--tz", help="IANA time zone, e.g. Africa/Nouakchott (default: from coordinates)")
    ap.add_argument("--kwp", type=float, default=1.0, help="nominal PV power (kWp, STC)")
    ap.add_argument("--tilt", type=float, help="tilt from horizontal, degrees (default |lat|, min 10)")
    ap.add_argument("--azimuth", type=float, help="degrees clockwise from north; 180 = south "
                                                  "(default: facing the equator)")
    ap.add_argument("--gamma", type=float, default=-0.0037, help="power temperature coefficient, 1/°C")
    ap.add_argument("--losses", type=float, default=14.0, help="system losses, %% (soiling, wiring, ...)")
    ap.add_argument("--dc-ac", type=float, default=1.2, help="DC/AC ratio (sets the inverter limit)")
    ap.add_argument("--inverter-eff", type=float, default=0.96)
    ap.add_argument("--albedo", type=float, default=0.25, help="ground reflectance (sand 0.3-0.4)")
    ap.add_argument("--linke", help="Linke turbidity: 1 value or 12 monthly values (default: climatology)")
    ap.add_argument("--tmin", help="monthly mean daily minimum temperature, °C (1 or 12 values)")
    ap.add_argument("--tmax", help="monthly mean daily maximum temperature, °C (1 or 12 values)")
    ap.add_argument("--wind", type=float, default=2.0, help="wind speed for cell temperature, m/s")
    ap.add_argument("--diffuse-model", choices=["perez", "isotropic"], default="perez")
    ap.add_argument("--perez-enhancement", action="store_true", help="Ineichen 'Perez enhancement' option")
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--freq", default="15min", help="time step, e.g. 1min, 5min, 15min, 1h")
    ap.add_argument("--out", default="clearsky")
    ap.add_argument("--no-plots", action="store_true")
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if a.tmin is None or a.tmax is None:
        log.warning("No --tmin/--tmax given: using 20 / 32 °C all year. Give monthly normals for your site "
                    "(e.g. NASA POWER T2M_MIN / T2M_MAX).")
    site = Site(a.lat, a.lon, a.altitude, a.name, a.tz)
    array = Array(a.kwp, a.tilt, a.azimuth, a.gamma, a.losses, a.dc_ac, a.inverter_eff, a.albedo)
    opt = Options(a.year, a.freq, floats(a.linke), floats(a.tmin), floats(a.tmax), a.wind, a.diffuse_model,
                  a.perez_enhancement)
    try:
        run(site, array, opt, a.out, plots=not a.no_plots)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
