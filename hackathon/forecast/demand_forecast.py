#!/usr/bin/env python3
"""
demand_forecast.py
==================

Five-year electricity demand forecast, with uncertainty ranges, for a village
that has no electricity yet (GEH Brief 03: predict mini-grid demand before
building).

How it works
------------
Bottom-up and probabilistic. Every input in assumptions.yaml is a range, and
the model is run thousands of times (Monte Carlo), drawing each input from its
range. The spread of results is the forecast interval (P10 / P50 / P90).

  buildings (village_landuse.py)  ->  households  ->  connections per year
      (Faza ramp)  ->  appliance ownership per year since connection
      (early / late adopters, S-curves)  ->  kWh per appliance
  + shops, schools, clinics, worship from the land-use map (or regional
    priors where the map has no use information)
  + productive-use enterprises and anchor loads that appear over time
  x tariff effect (price elasticity)
  =  daily energy, hourly profile, coincident peak, per year 1..5

It also explains which inputs drive the range, writes hourly 8760 load files
for HOMER/REopt, and tests sizing choices: how likely is a system built for a
given forecast to brown out, sit underused, or fail to cover its costs.

Usage
-----
  python demand_forecast.py --landuse results/<site>_summary.json --country Mauritania
  python demand_forecast.py --location "19.47116, -15.42852" --country Mauritania
  python demand_forecast.py --households 180 --tariff 0.6
  python demand_forecast.py validate metered_sites.csv      # held-out metered sites
"""
from __future__ import annotations

import argparse
import copy
import json
import logging
import math
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

log = logging.getLogger("demand_forecast")

YEARS = np.arange(1, 6)
NY = len(YEARS)
DAYS_IN_MONTH = np.array([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
DAYS_PER_MONTH_AVG = 365 / 12
QUANTILES = (0.1, 0.5, 0.9)
Z_PEAK = 2.33             # design peak = 99th percentile of the hourly load (hottest month)
HERE = Path(__file__).resolve().parent
DEFAULT_ASSUMPTIONS = HERE / "assumptions.yaml"

SECTORS = ("Households", "Businesses", "Institutions", "Productive use")
NONRES_SECTOR = {"store": "Businesses", "restaurant": "Businesses", "market_mall": "Businesses",
                 "unverified_large": "Businesses", "health": "Institutions",
                 "education": "Institutions", "other_nonres": "Institutions",
                 "industrial": "Productive use"}
PRIOR_KEYS = {"store": ("store_per_100_households", "hh"),
              "restaurant": ("restaurant_per_100_households", "hh"),
              "education": ("education_per_1000_people", "people"),
              "health": ("health_per_1000_people", "people"),
              "other_nonres": ("other_nonres_per_1000_people", "people")}


# =============================================================================
# Small helpers
# =============================================================================
def spec3(spec):
    """[low, mode, high] (or a scalar, or [low, high]) -> (low, mode, high)."""
    if isinstance(spec, (int, float)):
        return float(spec), float(spec), float(spec)
    s = [float(x) for x in spec]
    if len(s) == 1:
        return s[0], s[0], s[0]
    if len(s) == 2:
        return s[0], (s[0] + s[1]) / 2, s[1]
    lo, mo, hi = s
    if not lo <= mo <= hi:
        raise ValueError(f"range must be [low, most likely, high], got {spec}")
    return lo, mo, hi


def tri_ppf(u, spec):
    """Inverse CDF of the triangular distribution (vectorised)."""
    a, c, b = spec3(spec)
    u = np.asarray(u, dtype=float)
    if b - a < 1e-12:
        return np.full(u.shape, a)
    fc = (c - a) / (b - a)
    left = a + np.sqrt(u * (b - a) * (c - a))
    right = b - np.sqrt((1 - u) * (b - a) * (b - c))
    return np.where(u < fc, left, right)


def norm_cdf(z):
    from scipy.special import ndtr
    return ndtr(z)


NAMED_PROFILES = {"flat": [[0, 24, 1]], "daytime": [[8, 17, 1]], "evening": [[18, 23, 1]]}


def window_shape(spec) -> np.ndarray:
    """[[start, end, weight], ...] -> 24 fractions of daily energy (sum 1). Windows may wrap midnight."""
    if isinstance(spec, str):
        spec = NAMED_PROFILES[spec]
    w = np.zeros(24)
    for start, end, weight in spec:
        start, end = int(start) % 24, int(end)
        n_h = (end - start) % 24 or 24
        w[(start + np.arange(n_h)) % 24] += float(weight) / n_h
    if w.sum() <= 0:
        raise ValueError(f"empty profile {spec}")
    return w / w.sum()


def cooling_factors(sea) -> np.ndarray:
    t = sea.get("monthly_mean_temp_c")
    if t:
        return np.clip((np.asarray(t, float) - 20.0) / 12.0, 0.15, 1.0)
    return np.asarray(sea["cooling_factor_by_month"], float)


def month_factors(kind, sea) -> np.ndarray:
    """Monthly multiplier on a load's daily energy (average over each month)."""
    if kind in (None, "none"):
        return np.ones(12)
    cool = cooling_factors(sea)
    if kind == "cooling":
        return cool
    if kind == "cooling_partial":
        return 0.7 + 0.3 * cool / cool.max()
    if kind == "school":
        term = np.isin(np.arange(1, 13), sea["school_term_months"]).astype(float)
        return term * len(sea["school_weekdays"]) / 7
    raise ValueError(f"unknown seasonal kind '{kind}'")


def s_curve(midpoint, steepness, normalise="interp"):
    """Logistic over years since connection 1..5, per draw. 'interp': 0 at year 1, 1 at year 5;
    'cdf': share of an event that has happened by each year (1 at year 5)."""
    tau = YEARS[None, :].astype(float)
    L = 1.0 / (1.0 + np.exp(-steepness * (tau - midpoint[:, None])))
    if normalise == "interp":
        return (L - L[:, :1]) / (L[:, -1:] - L[:, :1])
    return L / L[:, -1:]


def slugify(text):
    import re
    s = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return (s or "site")[:48]


# =============================================================================
# Inputs
# =============================================================================
def load_assumptions(path=None, country=None) -> dict:
    import yaml
    A = yaml.safe_load(Path(path or DEFAULT_ASSUMPTIONS).read_text(encoding="utf-8"))
    A["_country"] = None
    if country:
        ov = (A.get("country_overrides") or {}).get(country)
        if ov is None:
            known = ", ".join(A.get("country_overrides") or {}) or "none"
            log.warning("No overrides for country '%s' in assumptions (known: %s); using generic values.",
                        country, known)
        else:
            A["households"].update(ov)
            A["_country"] = country
    return A


@dataclass
class Site:
    label: str
    lat: float | None = None
    lon: float | None = None
    residential_buildings: float | None = None
    households: float | None = None          # direct count (overrides buildings)
    population: float | None = None          # direct count (overrides buildings)
    counts: dict = field(default_factory=dict)   # mapped non-residential buildings by category
    evidence_pct: float | None = None        # % of buildings with use information (land-use model)
    source: str = ""

    def describe(self):
        if self.households:
            return f"{self.households:.0f} households (given)"
        if self.population:
            return f"population {self.population:.0f} (given)"
        return f"{self.residential_buildings:.0f} residential buildings mapped"


def site_from_landuse(path) -> Site:
    """Read the *_summary.json written by village_landuse.py."""
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    h = d["headline"]
    cats = {c["category"]: c for c in d["categories"]}
    counts = {k: float(v["buildings"]) for k, v in cats.items() if k != "residential"}
    return Site(label=h.get("location") or Path(path).stem, lat=h.get("lat"), lon=h.get("lon"),
                residential_buildings=float(cats["residential"]["buildings"]), counts=counts,
                evidence_pct=h.get("pct_buildings_with_use_evidence"), source=str(path))


# =============================================================================
# The model
# =============================================================================
@dataclass
class Load:
    key: str
    label: str
    sector: str
    shape: np.ndarray        # 24 fractions
    seasonal: str | None
    n: np.ndarray            # [draws, years] number of units (owning households, buildings, enterprises)
    e: np.ndarray            # [draws, years] kWh/day per unit on a month with factor 1
    p: np.ndarray            # [draws, years] kW per unit when running


class Sampler:
    """Draws inputs and remembers the uncertain ones for the driver analysis."""

    def __init__(self, n, rng):
        self.n, self.rng, self.record, self.labels = n, rng, {}, {}

    def tri(self, key, spec, label=None, u=None, record=True):
        u = self.rng.random(self.n) if u is None else u
        x = tri_ppf(u, spec)
        lo, _, hi = spec3(spec)
        if record and hi > lo:
            self.record[key] = x
            self.labels[key] = label or key
        return x


@dataclass
class Forecast:
    site: Site
    A: dict
    tariff: float
    n_draws: int
    seed: int
    loads: list
    households: np.ndarray       # [d, y]
    connected_hh: np.ndarray     # [d, y]
    customers: np.ndarray        # [d, y]
    population: np.ndarray       # [d, y]
    energy_by_load: np.ndarray   # [d, y, L] kWh/day (annual average)
    avg_profile: np.ndarray      # [d, y, 24] kW (annual average day)
    peak_kw: np.ndarray          # [d, y]
    month_energy: np.ndarray     # [d, y, 12] kWh/day
    inputs: pd.DataFrame         # sampled uncertain inputs
    input_labels: dict
    notes: list
    business_estimate: dict

    # ---- derived ---------------------------------------------------------------
    @property
    def energy(self):            # [d, y] kWh/day
        return self.energy_by_load.sum(axis=2)

    def sector_energy(self, sector):
        idx = [i for i, l in enumerate(self.loads) if l.sector == sector]
        return self.energy_by_load[:, :, idx].sum(axis=2) if idx else np.zeros(self.energy.shape)

    @property
    def kwh_per_hh_month(self):
        with np.errstate(invalid="ignore", divide="ignore"):
            return np.where(self.connected_hh > 0,
                            self.sector_energy("Households") * DAYS_PER_MONTH_AVG / self.connected_hh, 0.0)

    @property
    def kwh_per_customer_month(self):
        with np.errstate(invalid="ignore", divide="ignore"):
            return np.where(self.customers > 0, self.energy * DAYS_PER_MONTH_AVG / self.customers, 0.0)

    @property
    def load_factor(self):
        return (self.energy / 24) / self.peak_kw

    def metrics(self) -> dict:
        e = self.energy
        return {
            "households": self.households,
            "population": self.population,
            "connected_households": self.connected_hh,
            "customers": self.customers,
            "energy_kwh_per_day": e,
            "energy_mwh_per_year": e * 365 / 1000,
            "peak_kw": self.peak_kw,
            "load_factor": self.load_factor,
            "kwh_per_household_month": self.kwh_per_hh_month,
            "kwh_per_customer_month": self.kwh_per_customer_month,
            "business_and_productive_share": 1 - self.sector_energy("Households") / e,
            "household_bill_usd_month": self.kwh_per_hh_month * self.tariff,
        }

    def summary(self) -> pd.DataFrame:
        rows = []
        for name, arr in self.metrics().items():
            for j, yr in enumerate(YEARS):
                q = np.nanquantile(arr[:, j], QUANTILES)
                rows.append({"metric": name, "year": int(yr), "p10": q[0], "p50": q[1], "p90": q[2]})
        return pd.DataFrame(rows)

    def sector_table(self) -> pd.DataFrame:
        """Average sector energy among draws near the median total (adds up to ~P50)."""
        rows = []
        for j, yr in enumerate(YEARS):
            e = self.energy[:, j]
            lo, hi = np.quantile(e, [0.4, 0.6])
            sel = (e >= lo) & (e <= hi)
            row = {"year": int(yr)}
            for s in SECTORS:
                row[s] = float(self.sector_energy(s)[sel, j].mean())
            rows.append(row)
        return pd.DataFrame(rows)

    def representative_draw(self, year, q):
        e = self.energy[:, year - 1]
        return int(np.argmin(np.abs(e - np.quantile(e, q))))


def run_forecast(site: Site, A: dict, n_draws=4000, seed=42, tariff=None) -> Forecast:
    rng = np.random.default_rng(seed)
    S = Sampler(n_draws, rng)
    notes = []
    H, C, AD, sea = A["households"], A["connections"], A["adoption"], A["seasonality"]
    T = float(tariff if tariff is not None else A["tariff"]["site_usd_per_kwh"])
    T_ref = float(A["tariff"]["reference_usd_per_kwh"])

    # ---- households and population -------------------------------------------
    hh_size = S.tri("household_size", H["household_size"], record=False)
    growth = S.tri("population_growth", H["population_growth"], "Population growth")
    if site.households:
        hh0 = np.full(n_draws, float(site.households))
    elif site.population:
        hh0 = site.population / hh_size
    elif site.residential_buildings:
        bph = S.tri("buildings_per_household", H["buildings_per_household"],
                    "Buildings per household")
        hh0 = site.residential_buildings / bph
    else:
        raise ValueError("Site needs residential buildings, households or population.")
    households = hh0[:, None] * (1 + growth[:, None]) ** (YEARS[None, :] - 1)
    population = households * hh_size[:, None]

    # ---- connections (Faza ramp, with uncertainty) -------------------------------
    share5 = S.tri("connection_share", C["share_connected_by_year5"], "Share of households that connect")
    cohorts = rng.dirichlet(np.asarray(C["cohort_shares"], float) * float(C["cohort_certainty"]), n_draws)
    S.record["connection_speed"] = cohorts[:, :2].sum(axis=1)
    S.labels["connection_speed"] = "Speed of connection roll-out"
    connected = share5[:, None] * np.cumsum(cohorts, axis=1) * households
    new_conn = np.diff(np.concatenate([np.zeros((n_draws, 1)), connected], axis=1), axis=1).clip(min=0)

    # ---- adoption curves -----------------------------------------------------------
    early = S.tri("early_adopter_share", AD["early_adopter_share"], "Share of early-adopter households")
    mid = S.tri("adoption_midpoint", AD["s_curve_midpoint_year"], "Timing of appliance buying")
    curve = s_curve(mid, float(AD["s_curve_steepness"]), "interp")        # [d, tau]
    arrival = s_curve(mid, float(AD["s_curve_steepness"]), "cdf")
    rho = float(AD["appliance_correlation"])
    z_global = rng.standard_normal(n_draws)
    S.record["appliance_appetite"] = z_global
    S.labels["appliance_appetite"] = "Overall appetite for appliances"

    def cohort_average(own_tau):
        """Ownership per MG year, averaged over connection cohorts. own_tau: [d, tau]."""
        out = np.zeros((n_draws, NY))
        for t in range(NY):
            tot = np.zeros(n_draws)
            for c in range(t + 1):
                tot += new_conn[:, c] * own_tau[:, t - c]
            out[:, t] = np.divide(tot, connected[:, t], out=np.zeros(n_draws), where=connected[:, t] > 0)
        return out

    # ---- tariff ----------------------------------------------------------------------
    elast = S.tri("elasticity", A["tariff"]["elasticity"], "Price sensitivity of use", record=(T != T_ref))
    m_tar = (T / T_ref) ** elast
    if T != T_ref:
        notes.append(f"Tariff ${T:.2f}/kWh vs reference ${T_ref:.2f}: usage scaled by "
                     f"{np.median(m_tar):.2f} (median).")

    loads: list[Load] = []
    years_grid = np.ones((n_draws, NY))

    # ---- household appliances -------------------------------------------------------
    for ap in A["household_appliances"]:
        name, label = ap["name"], ap.get("label", ap["name"])
        u = norm_cdf(rho * z_global + math.sqrt(1 - rho ** 2) * rng.standard_normal(n_draws))
        own = {}
        for grp, key in (("late", "owned_by_late_adopters"), ("early", "owned_by_early_adopters")):
            y1 = tri_ppf(u, ap[key]["year1"])
            y5 = np.maximum(tri_ppf(u, ap[key]["year5"]), y1)
            own[grp] = cohort_average(y1[:, None] + (y5 - y1)[:, None] * curve)
        varies = any(spec3(ap[k][y])[2] > spec3(ap[k][y])[0]
                     for k in ("owned_by_late_adopters", "owned_by_early_adopters") for y in ("year1", "year5"))
        if varies:
            S.record[f"own_{name}"] = u
            S.labels[f"own_{name}"] = f"{label}: ownership"
        owners = connected * (early[:, None] * own["early"] + (1 - early[:, None]) * own["late"])
        if "daily_wh" in ap:
            e = S.tri(f"use_{name}", ap["daily_wh"], f"{label}: kWh per day") / 1000
            p = S.tri(f"w_{name}", ap["watts"], record=False) / 1000
        else:
            units = S.tri(f"units_{name}", ap.get("units", 1), record=False)
            w = S.tri(f"w_{name}", ap["watts"], record=False)
            hrs = S.tri(f"h_{name}", ap["hours"], record=False)
            e = units * w * hrs / 1000
            p = units * w / 1000
            if np.ptp(e) > 0:
                S.record[f"use_{name}"] = e
                S.labels[f"use_{name}"] = f"{label}: kWh per day"
        loads.append(Load(name, label, "Households", window_shape(ap["profile"]), ap.get("seasonal"),
                          owners, (e * m_tar)[:, None] * years_grid, p[:, None] * years_grid))
    connected_hh = connected

    # ---- businesses and institutions --------------------------------------------------
    BI = A["businesses_and_institutions"]
    pri = A.get("unmapped_business_priors") or {}
    low_evidence = site.evidence_pct is not None and site.evidence_pct < pri.get("apply_if_evidence_below_pct", 0)
    no_map = site.residential_buildings is None or (site.evidence_pct is None and not site.counts)
    use_priors = low_evidence or no_map
    business_estimate = {}
    customers = connected.copy()
    for cat, cfg in BI.items():
        label = cfg.get("label", cat)
        mapped = float(site.counts.get(cat, 0.0))
        count = np.full(n_draws, mapped)
        if use_priors and cat in PRIOR_KEYS:
            key, base = PRIOR_KEYS[cat]
            rate = S.tri(f"prior_{cat}", pri[key], f"{label}: number (not mapped)")
            prior = rate * (hh0 / 100 if base == "hh" else hh0 * hh_size / 1000)
            count = np.maximum(count, prior)
        if cat == "industrial":
            count = count * S.tri("p_electric_industrial", cfg["probability_electric"],
                                  "Mapped workshops that run machines", record=mapped > 0)
        if cat == "unverified_large":
            count = count * S.tri("p_nonres_unverified", cfg["probability_non_residential"],
                                  "Large untagged buildings that are businesses", record=mapped > 0)
        business_estimate[cat] = {"label": label, "mapped": mapped,
                                  "p10": float(np.quantile(count, 0.1)), "p50": float(np.median(count)),
                                  "p90": float(np.quantile(count, 0.9))}
        if count.max() <= 0:
            continue
        c1 = S.tri(f"c1_{cat}", cfg["connect_year1"], record=False)
        c5 = np.maximum(S.tri(f"c5_{cat}", cfg["connect_year5"], record=False), c1)
        share = c1[:, None] + (c5 - c1)[:, None] * curve
        e1 = S.tri(f"use_{cat}", cfg["kwh_day_year1"], f"{label}: kWh per day each", record=count.max() > 0.5)
        g5 = S.tri(f"growth_{cat}", cfg["growth_by_year5"], record=False)
        e = (e1[:, None] * (1 + (g5 - 1)[:, None] * curve)) * m_tar[:, None]
        if "kw" in cfg:
            p = S.tri(f"kw_{cat}", cfg["kw"], record=False)[:, None] * years_grid
        else:
            p = e / S.tri(f"hours_{cat}", cfg["active_hours"], record=False)[:, None]
        n = count[:, None] * share
        customers = customers + n
        loads.append(Load(cat, label, NONRES_SECTOR[cat], window_shape(cfg["profile"]),
                          cfg.get("seasonal"), n, e, p))
    if use_priors:
        why = "no land-use map" if no_map else f"only {site.evidence_pct:.0f}% of buildings have use information"
        notes.append(f"Business and institution counts include regional priors ({why}); "
                     "mapped counts are used where higher.")

    # ---- productive-use enterprises (lumpy: whole mills and workshops) -----------------
    PU = A.get("productive_use")
    if PU:
        rate = S.tri("productive_rate", PU["new_enterprises_per_100_households_by_year5"],
                     "Number of new mills / workshops")
        lam = rate * hh0 / 100
        n5 = rng.poisson(lam)
        kmax = max(int(n5.max()), 1)
        arr_u = rng.random((n_draws, kmax))
        alive = np.arange(kmax)[None, :] < n5[:, None]
        active = np.stack([((arr_u <= arrival[:, [t]]) & alive).sum(axis=1) for t in range(NY)], axis=1)
        e = S.tri("productive_size", PU["kwh_day_each"], "Size of each mill / workshop")
        p = S.tri("productive_kw", PU["kw_each"], record=False)
        customers = customers + active
        loads.append(Load("productive", PU.get("label", "Productive use"), "Productive use",
                          window_shape(PU["profile"]), PU.get("seasonal"), active.astype(float),
                          (e * m_tar)[:, None] * years_grid, p[:, None] * years_grid))

    for an in A.get("anchor_loads") or []:
        present = rng.random(n_draws) < float(an.get("probability", 1.0))
        S.record[f"anchor_{an['name']}"] = present.astype(float)
        S.labels[f"anchor_{an['name']}"] = f"{an.get('label', an['name'])} connects"
        on = present[:, None] & (YEARS[None, :] >= int(an.get("start_year", 1)))
        e = S.tri(f"anchor_e_{an['name']}", an["kwh_day"], f"{an.get('label', an['name'])}: kWh per day")
        p = S.tri(f"anchor_kw_{an['name']}", an["kw"], record=False)
        customers = customers + on
        loads.append(Load(an["name"], an.get("label", an["name"]), "Productive use",
                          window_shape(an["profile"]), an.get("seasonal"), on.astype(float),
                          (e * m_tar)[:, None] * years_grid, p[:, None] * years_grid))

    # ---- energy, hourly profile and coincident peak -----------------------------------
    shapes = np.stack([l.shape for l in loads])                                  # [L, 24]
    mf = np.stack([month_factors(l.seasonal, sea) for l in loads])               # [L, 12]
    fbar = (mf * DAYS_IN_MONTH).sum(axis=1) / 365                                # [L]
    N = np.stack([l.n for l in loads], axis=2)                                   # [d, y, L]
    E = np.stack([l.e for l in loads], axis=2)
    P = np.stack([l.p for l in loads], axis=2)
    energy_by_load = N * E * fbar                                                # kWh/day, annual avg
    mu = np.einsum("dyl,lm,lh->dymh", N * E, mf, shapes)                         # kW by month & hour
    # Each unit is on (at power P) or off; hourly variance across units -> coincident peak.
    var = np.einsum("dyl,lm,lh->dymh", N * E * P, mf, shapes) \
        - np.einsum("dyl,lm,lh->dymh", N * E ** 2, mf ** 2, shapes ** 2)
    dd = float(sea.get("day_to_day_variability", 0.0))
    sigma = np.sqrt(np.clip(var, 0, None) + (dd * mu) ** 2)
    peak = (mu + Z_PEAK * sigma).max(axis=(2, 3))
    avg_profile = np.einsum("dymh,m->dyh", mu, DAYS_IN_MONTH / 365)
    month_energy = mu.sum(axis=3)

    inputs = pd.DataFrame(S.record)
    return Forecast(site, A, T, n_draws, seed, loads, households, connected_hh, customers, population,
                    energy_by_load, avg_profile, peak, month_energy, inputs, S.labels, notes,
                    business_estimate)


# =============================================================================
# Drivers: which inputs move the forecast
# =============================================================================
def drivers(fc: Forecast, year=5, top=None) -> pd.DataFrame:
    target = pd.Series(fc.energy[:, year - 1]).rank()
    rows = []
    for k in fc.inputs.columns:
        x = fc.inputs[k]
        if x.nunique() < 2:
            continue
        r = float(np.corrcoef(x.rank(), target)[0, 1])
        if np.isfinite(r):
            rows.append({"input": k, "label": fc.input_labels.get(k, k), "rank_correlation": r})
    d = pd.DataFrame(rows)
    d["share_of_uncertainty"] = d["rank_correlation"] ** 2 / (d["rank_correlation"] ** 2).sum()
    d["effect"] = np.where(d["rank_correlation"] > 0, "higher -> more demand", "higher -> less demand")
    d = d.sort_values("share_of_uncertainty", ascending=False).reset_index(drop=True)
    d.insert(0, "year", year)
    return d.head(top) if top else d


# =============================================================================
# Hourly 8760 profiles for HOMER / REopt
# =============================================================================
def hourly_8760(fc: Forecast, year: int, draw: int, seed=0, start=date(2027, 1, 1)) -> np.ndarray:
    sea = fc.A["seasonality"]
    rng = np.random.default_rng(seed)
    days = [start + timedelta(days=i) for i in range(365)]
    month = np.array([d.month - 1 for d in days])
    weekday = np.array([d.weekday() for d in days])
    noise = rng.lognormal(-0.5 * sea["day_to_day_variability"] ** 2, sea["day_to_day_variability"], 365)
    out = np.zeros((365, 24))
    for i, l in enumerate(fc.loads):
        daily = l.n[draw, year - 1] * l.e[draw, year - 1]
        if daily <= 0:
            continue
        if l.seasonal == "school":
            term = np.isin(month + 1, sea["school_term_months"])
            f = (term & np.isin(weekday, sea["school_weekdays"])).astype(float)
        else:
            f = month_factors(l.seasonal, sea)[month]
        out += (daily * f)[:, None] * l.shape[None, :]
    out *= noise[:, None]
    target = fc.energy[draw, year - 1] * 365
    out *= target / out.sum()
    return out.ravel()


def hourly_table(fc: Forecast) -> pd.DataFrame:
    df = pd.DataFrame({"hour_of_year": np.arange(8760),
                       "month": np.repeat([(date(2027, 1, 1) + timedelta(days=i)).month for i in range(365)], 24),
                       "hour": np.tile(np.arange(24), 365)})
    for yr in YEARS:
        for q in QUANTILES:
            d = fc.representative_draw(int(yr), q)
            df[f"year{yr}_p{int(q * 100)}_kw"] = hourly_8760(fc, int(yr), d, seed=int(yr) * 100 + int(q * 100))
    return df


# =============================================================================
# Sizing and "how wrong can the forecast be"
# =============================================================================
def pv_shape(sunrise=6.5, sunset=18.5):
    c = np.arange(24) + 0.5
    s = np.where((c > sunrise) & (c < sunset), np.sin(np.pi * (c - sunrise) / (sunset - sunrise)), 0.0)
    return s / s.sum()


def size_system(design_kwh_day, load_shape, design_peak_kw, Z):
    """First-cut PV + battery size for a daily energy (kWh/day) with a given daily shape."""
    cap = design_kwh_day * (1 + Z["headroom"])
    psh, pr, rt = Z["peak_sun_hours"], Z["performance_ratio"], Z["battery_roundtrip_efficiency"]
    load = cap * load_shape
    pvs = pv_shape()
    kwp = cap / (psh * pr)
    for _ in range(50):
        direct = np.minimum(load, kwp * psh * pr * pvs).sum()
        new = (direct + (cap - direct) / rt) / (psh * pr)
        if abs(new - kwp) < 1e-9:
            break
        kwp = new
    from_battery = cap - direct
    batt_nominal = from_battery * Z["autonomy_days"] / Z["battery_depth_of_discharge"]
    return {"capacity_kwh_day": cap, "pv_kwp": kwp, "battery_kwh": batt_nominal,
            "inverter_kw": design_peak_kw * Z["inverter_margin"], "night_share": from_battery / cap}


def annual_cost(sz, Z):
    c = Z["costs"]
    r, life = c["discount_rate"], c["project_life_years"]
    crf = r * (1 + r) ** life / ((1 + r) ** life - 1)
    gen = sz["pv_kwp"] * c["pv_usd_per_kw"] + sz["battery_kwh"] * c["battery_usd_per_kwh"] \
        + sz["inverter_kw"] * c["inverter_usd_per_kw"]
    capex = gen / (1 - c["non_generation_share_of_capex"])
    repl = c["replacement_cost_factor"] * (
        sz["battery_kwh"] * c["battery_usd_per_kwh"] / (1 + r) ** c["battery_life_years"]
        + sz["inverter_kw"] * c["inverter_usd_per_kw"] / (1 + r) ** c["inverter_life_years"])
    om = sz["pv_kwp"] * c["om_pv_usd_per_kw_year"] + sz["inverter_kw"] * c["om_inverter_usd_per_kw_year"] \
        + sz["battery_kwh"] * c["om_battery_usd_per_kwh_year"]
    return capex, capex * crf + repl * crf + om


def expected_shortfall(mu, cap, s_demand, s_supply):
    """E[max(0, D - C)] for D ~ N(mu, (s_demand mu)^2), C ~ N(cap, (s_supply cap)^2)."""
    from scipy.stats import norm
    s = np.sqrt((s_demand * mu) ** 2 + (s_supply * cap) ** 2) + 1e-12
    k = (mu - cap) / s
    return (mu - cap) * norm.cdf(k) + s * norm.pdf(k)


def sizing_risk(fc: Forecast) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Size a system for several forecast quantiles and test each against all simulated futures."""
    Z = fc.A["sizing"]
    yd = int(Z["design_year"])
    e_design = fc.energy[:, yd - 1]
    shape = np.median(fc.avg_profile[:, yd - 1, :], axis=0)
    shape = shape / shape.sum()
    dd = fc.A["seasonality"]["day_to_day_variability"]
    rows, per_year = [], []
    cust5 = float(np.median(fc.customers[:, -1]))
    for q in Z["design_quantiles"]:
        E = float(np.quantile(e_design, q))
        pk = float(np.quantile(fc.peak_kw[:, yd - 1], q))
        sz = size_system(E, shape, pk, Z)
        capex, ann = annual_cost(sz, Z)
        row = {"design": f"P{int(q * 100)} of year-{yd} demand", "design_quantile": q, "design_kwh_day": E,
               **{k: v for k, v in sz.items()}, "capex_usd": capex, "capex_per_customer_usd": capex / cust5,
               "annual_cost_usd": ann,
               "breakeven_utilisation_at_tariff": ann / (fc.tariff * sz["capacity_kwh_day"] * 365)}
        for j, yr in enumerate(YEARS):
            mu = fc.energy[:, j]
            short = expected_shortfall(mu, sz["capacity_kwh_day"], dd, Z["daily_pv_variability"])
            served = mu - short
            unmet = short / mu
            util = served / sz["capacity_kwh_day"]
            cost_kwh = ann / (served * 365)
            per_year.append({"design": row["design"], "year": int(yr),
                             "p_brownouts": float((unmet > Z["brownout_unmet_threshold"]).mean()),
                             "p_evening_peak_over_inverter": float((fc.peak_kw[:, j] > sz["inverter_kw"]).mean()),
                             "p_underused": float((util < Z["low_utilisation_threshold"]).mean()),
                             "median_utilisation": float(np.median(util)),
                             "median_unmet_share": float(np.median(unmet)),
                             "cost_per_kwh_p50": float(np.median(cost_kwh)),
                             "cost_per_kwh_p90": float(np.quantile(cost_kwh, 0.9)),
                             "p_revenue_below_cost": float((served * 365 * fc.tariff < ann).mean())})
        rows.append(row)
    return pd.DataFrame(rows), pd.DataFrame(per_year)


def tariff_scenarios(site: Site, A: dict, tariffs, n_draws=2000, seed=42) -> pd.DataFrame:
    """Same site at several tariffs: demand, bills and whether the P50 design recovers its cost."""
    yd = int(A["sizing"]["design_year"])
    rows = []
    for T in sorted(set(round(float(t), 4) for t in tariffs)):
        fc = run_forecast(site, A, n_draws, seed, T)
        designs, risk = sizing_risk(fc)
        mid = designs.iloc[(designs["design_quantile"] - 0.5).abs().argmin()]
        r = risk[(risk.design == mid.design) & (risk.year == yd)].iloc[0]
        rows.append({"tariff_usd_per_kwh": T,
                     f"year{yd}_kwh_per_day_p50": float(np.median(fc.energy[:, yd - 1])),
                     f"year{yd}_kwh_per_household_month_p50": float(np.median(fc.kwh_per_hh_month[:, yd - 1])),
                     f"year{yd}_household_bill_usd_month_p50": float(np.median(fc.kwh_per_hh_month[:, yd - 1])) * T,
                     "p50_design_capex_usd": float(mid.capex_usd),
                     "breakeven_utilisation": float(mid.breakeven_utilisation_at_tariff),
                     f"p_revenue_covers_cost_year{yd}": 1 - float(r.p_revenue_below_cost)})
    return pd.DataFrame(rows)


# =============================================================================
# Validation against metered sites (held out)
# =============================================================================
def validate(csv_path, A, n_draws=1500, seed=7, out_dir=None) -> tuple[pd.DataFrame, dict]:
    """Columns: site_id, year (since commissioning, 1-5), observed_kwh_per_customer_month, and either
    landuse_json or households [+ store, restaurant, education, health, other_nonres counts];
    optional: tariff_usd_per_kwh, country, metric ('customer' or 'household')."""
    df = pd.read_csv(csv_path)
    need = {"site_id", "year", "observed_kwh_per_customer_month"}
    if df.empty or not need <= set(df.columns):
        raise ValueError(f"{csv_path}: add one row per metered site and year with at least the columns "
                         f"{sorted(need)} plus landuse_json or households (see README, 'Validation').")
    rows = []
    for _, r in df.iterrows():
        if isinstance(r.get("landuse_json"), str) and r["landuse_json"]:
            p = Path(r["landuse_json"])
            site = site_from_landuse(p if p.is_absolute() else Path(csv_path).parent / p)
        else:
            counts = {k: float(r[k]) for k in NONRES_SECTOR if k in r and pd.notna(r[k])}
            site = Site(label=str(r["site_id"]), households=float(r["households"]), counts=counts,
                        evidence_pct=100.0 if counts else None)
        A_site = load_assumptions(A.get("_path"), r["country"]) if "country" in r and pd.notna(r.get("country")) else A
        tariff = float(r["tariff_usd_per_kwh"]) if "tariff_usd_per_kwh" in r and pd.notna(r.get("tariff_usd_per_kwh")) else None
        fc = run_forecast(site, A_site, n_draws, seed, tariff)
        metric = r.get("metric", "customer") if pd.notna(r.get("metric", "customer")) else "customer"
        pred = (fc.kwh_per_customer_month if metric == "customer" else fc.kwh_per_hh_month)[:, int(r["year"]) - 1]
        obs = float(r["observed_kwh_per_customer_month"])
        rows.append({"site_id": r["site_id"], "year": int(r["year"]), "metric": metric, "observed": obs,
                     "p10": np.quantile(pred, 0.1), "p50": np.quantile(pred, 0.5), "p90": np.quantile(pred, 0.9),
                     "pit": float((pred < obs).mean())})
    res = pd.DataFrame(rows)
    # Leave-one-out calibration: one usage multiplier learned from the other sites.
    log_err = np.log(res["observed"] / res["p50"])
    n = len(res)
    res["loo_factor"] = [float(np.exp(np.median(np.delete(log_err.values, i)))) if n > 1 else 1.0
                         for i in range(n)]
    for q in ("p10", "p50", "p90"):
        res[f"{q}_calibrated"] = res[q] * res["loo_factor"]

    def scores(sfx=""):
        inside = (res["observed"] >= res[f"p10{sfx}"]) & (res["observed"] <= res[f"p90{sfx}"])
        ape = (res[f"p50{sfx}"] - res["observed"]).abs() / res["observed"]
        pin = np.mean([np.mean(np.maximum(q * (res["observed"] - res[f"p{int(q*100)}{sfx}"]),
                                          (q - 1) * (res["observed"] - res[f"p{int(q*100)}{sfx}"])))
                       for q in QUANTILES])
        return {"coverage_80pct_interval": float(inside.mean()), "median_abs_pct_error_p50": float(ape.median()),
                "mean_pinball_loss": float(pin)}

    summary = {"n_sites": n, "uncalibrated": scores(""), "leave_one_out_calibrated": scores("_calibrated"),
               "target_coverage": 0.8}
    if out_dir:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        res.to_csv(out / "validation_results.csv", index=False)
        (out / "validation_summary.json").write_text(json.dumps(summary, indent=2))
    return res, summary


# =============================================================================
# Outputs
# =============================================================================
def save_outputs(fc: Forecast, out_dir, report=True, tariffs=(0.25, 0.45, 0.65, 0.85)) -> dict:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    slug = slugify(fc.site.label)
    files = {}
    summ = fc.summary()
    files["summary"] = out / f"{slug}_forecast_summary.csv"
    summ.to_csv(files["summary"], index=False)
    files["sectors"] = out / f"{slug}_sectors_p50.csv"
    fc.sector_table().to_csv(files["sectors"], index=False)
    d1, d5 = drivers(fc, 1), drivers(fc, 5)
    files["drivers"] = out / f"{slug}_drivers.csv"
    pd.concat([d1, d5]).to_csv(files["drivers"], index=False)
    designs, risk = sizing_risk(fc)
    files["sizing"] = out / f"{slug}_sizing_designs.csv"
    designs.to_csv(files["sizing"], index=False)
    files["risk"] = out / f"{slug}_sizing_risk_by_year.csv"
    risk.to_csv(files["risk"], index=False)
    files["hourly"] = out / f"{slug}_hourly_8760.csv"
    hourly_table(fc).round(4).to_csv(files["hourly"], index=False)
    prof = pd.DataFrame({"hour": np.arange(24)})
    for j, yr in enumerate(YEARS):
        for q in QUANTILES:
            prof[f"year{yr}_p{int(q*100)}_kw"] = np.quantile(fc.avg_profile[:, j, :], q, axis=0)
    tar = tariff_scenarios(fc.site, fc.A, list(tariffs) + [fc.tariff], min(fc.n_draws, 2000), fc.seed)
    files["tariffs"] = out / f"{slug}_tariff_scenarios.csv"
    tar.to_csv(files["tariffs"], index=False)
    files["daily_profile"] = out / f"{slug}_average_day_kw.csv"
    prof.round(4).to_csv(files["daily_profile"], index=False)
    files["json"] = out / f"{slug}_forecast.json"
    files["json"].write_text(json.dumps({
        "site": {k: v for k, v in fc.site.__dict__.items()},
        "tariff_usd_per_kwh": fc.tariff, "country_overrides": fc.A.get("_country"),
        "draws": fc.n_draws, "seed": fc.seed, "notes": fc.notes,
        "business_and_institution_counts": fc.business_estimate,
        "summary": summ.to_dict("records"), "drivers_year5": d5.head(10).to_dict("records"),
        "sizing": designs.to_dict("records")}, indent=2, default=float))
    if report:
        import forecast_report
        files["dashboard"] = out / f"{slug}_forecast.png"
        forecast_report.dashboard(fc, files["dashboard"], designs, risk, d5)
        files["lender_summary"] = out / f"{slug}_lender_summary.md"
        files["lender_summary"].write_text(forecast_report.lender_summary(fc, designs, risk, d1, d5, tar),
                                           encoding="utf-8")
    return files


def print_headline(fc: Forecast):
    s = fc.summary().set_index(["metric", "year"])
    print(f"\nDemand forecast: {fc.site.label}   ({fc.site.describe()}, tariff ${fc.tariff:.2f}/kWh)")
    for n in fc.notes:
        print(f"  note: {n}")
    print(f"\n{'Year':<6}{'kWh/day (P10-P50-P90)':<28}{'Peak kW (P50)':>14}{'kWh/household/month':>22}"
          f"{'Customers':>11}")
    for yr in YEARS:
        e = s.loc[("energy_kwh_per_day", yr)]
        pk = s.loc[("peak_kw", yr)]
        hh = s.loc[("kwh_per_household_month", yr)]
        cu = s.loc[("customers", yr)]
        print(f"{yr:<6}{e.p10:>7.0f} - {e.p50:>5.0f} - {e.p90:<9.0f}{pk.p50:>14.1f}"
              f"{hh.p10:>11.1f} -{hh.p50:>5.1f} -{hh.p90:>5.1f}{cu.p50:>11.0f}")
    d = drivers(fc, 5, top=5)
    print("\nWhat drives the year-5 range most:")
    for _, r in d.iterrows():
        print(f"  {r.share_of_uncertainty * 100:5.1f}%  {r.label}  ({r.effect})")


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if argv and argv[0] == "validate":
        ap = argparse.ArgumentParser(prog="demand_forecast.py validate",
                                     description="Score the forecast against held-out metered sites.")
        ap.add_argument("csv")
        ap.add_argument("--assumptions", default=str(DEFAULT_ASSUMPTIONS))
        ap.add_argument("--draws", type=int, default=1500)
        ap.add_argument("--out", default="validation")
        a = ap.parse_args(argv[1:])
        A = load_assumptions(a.assumptions)
        A["_path"] = a.assumptions
        try:
            res, summary = validate(a.csv, A, a.draws, out_dir=a.out)
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1
        print(res.round(2).to_string(index=False))
        print(json.dumps(summary, indent=2))
        return 0

    ap = argparse.ArgumentParser(description="Five-year mini-grid demand forecast with uncertainty ranges.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--landuse", help="*_summary.json from village_landuse.py")
    src.add_argument("--location", help="run village_landuse.py first for this location (needs internet)")
    src.add_argument("--households", type=float, help="number of households, if no map is available")
    src.add_argument("--population", type=float, help="population (e.g. from WorldPop or a census)")
    ap.add_argument("--label", help="site name for outputs")
    ap.add_argument("--country", help="apply country overrides from the assumptions file, e.g. Mauritania")
    ap.add_argument("--tariff", type=float, help="planned tariff in USD/kWh")
    ap.add_argument("--assumptions", default=str(DEFAULT_ASSUMPTIONS))
    ap.add_argument("--draws", type=int, default=4000, help="Monte Carlo draws")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--radius", type=float, default=1000, help="with --location: search radius (m)")
    ap.add_argument("--out", default="forecast", help="output folder")
    ap.add_argument("--tariff-scenarios", default="0.25,0.45,0.65,0.85",
                    help="comma-separated tariffs (USD/kWh) to compare in the outputs")
    ap.add_argument("--no-report", action="store_true", help="skip the PNG dashboard and lender summary")
    a = ap.parse_args(argv)

    A = load_assumptions(a.assumptions, a.country)
    if a.landuse:
        site = site_from_landuse(a.landuse)
    elif a.location:
        import village_landuse as vl
        r = vl.run(a.location, vl.Config(radius_m=a.radius), out_dir="results")
        site = site_from_landuse(Path("results") / f"{vl.slugify(r.label)}_summary.json")
    elif a.households:
        site = Site(label=a.label or f"{a.households:.0f} households", households=a.households)
    else:
        site = Site(label=a.label or f"population {a.population:.0f}", population=a.population)
    if a.label:
        site.label = a.label

    fc = run_forecast(site, A, a.draws, a.seed, a.tariff)
    print_headline(fc)
    tariffs = [float(t) for t in a.tariff_scenarios.split(",") if t.strip()]
    files = save_outputs(fc, a.out, report=not a.no_report, tariffs=tariffs)
    print("\nSaved:\n" + "\n".join(f"  {p}" for p in files.values()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
