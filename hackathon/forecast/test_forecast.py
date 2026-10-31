"""
Tests for demand_forecast.py.   Run:  python test_forecast.py   (or pytest test_forecast.py)
"""
import copy
import json
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

import demand_forecast as df

HERE = Path(__file__).resolve().parent
BENICHAB = HERE / "examples" / "benichab_landuse_summary.json"
N = 1500


def A(country="Mauritania"):
    return df.load_assumptions(country=country)


def benichab():
    return df.site_from_landuse(BENICHAB)


def test_helpers():
    rng = np.random.default_rng(0)
    x = df.tri_ppf(rng.random(200_000), [1, 2, 6])
    assert x.min() >= 1 and x.max() <= 6 and abs(x.mean() - 3) < 0.02
    assert np.all(df.tri_ppf(np.array([0.3]), 5) == 5)
    s = df.window_shape([[22, 2, 1.0]])               # wraps midnight
    assert abs(s.sum() - 1) < 1e-12 and s[23] > 0 and s[1] > 0 and s[2] == 0 and s[12] == 0
    c = df.s_curve(np.array([3.0]), 1.5)
    assert c[0, 0] == 0 and abs(c[0, -1] - 1) < 1e-12 and np.all(np.diff(c) > 0)
    try:
        df.spec3([3, 1, 2])
        raise AssertionError("bad range accepted")
    except ValueError:
        pass


def test_benichab_calibration_and_shape():
    fc = df.run_forecast(benichab(), A(), N)
    s = fc.summary().set_index(["metric", "year"])
    for m in ("energy_kwh_per_day", "peak_kw", "kwh_per_household_month", "customers"):
        for y in df.YEARS:
            r = s.loc[(m, y)]
            assert r.p10 <= r.p50 <= r.p90, (m, y)
    e = [s.loc[("energy_kwh_per_day", y)].p50 for y in df.YEARS]
    assert all(b > a for a, b in zip(e, e[1:])), "demand should grow every year"
    # calibrated to measured sites: single-digit kWh/household/month in year 1
    assert 4 < s.loc[("kwh_per_household_month", 1)].p50 < 12
    lo, hi = fc.A["esmap_range_kwh_per_customer_month"]
    assert lo <= s.loc[("kwh_per_customer_month", 5)].p50 <= hi
    # households = buildings / buildings-per-household
    hh = s.loc[("households", 1)]
    assert 320 / 2.5 <= hh.p10 and hh.p90 <= 320 / 1.0 and 160 < hh.p50 < 230
    lf = s.loc[("load_factor", 5)].p50
    assert 0.15 < lf < 0.45, lf
    assert np.all(fc.peak_kw > fc.energy / 24)
    # sector table adds up to roughly the median total
    st = fc.sector_table().set_index("year")
    assert abs(st.loc[5].sum() / s.loc[("energy_kwh_per_day", 5)].p50 - 1) < 0.05


def test_tariff_lowers_use():
    base = df.run_forecast(benichab(), A(), N, tariff=0.45)
    high = df.run_forecast(benichab(), A(), N, tariff=0.85)
    ratio = np.median(high.energy[:, -1]) / np.median(base.energy[:, -1])
    expected = (0.85 / 0.45) ** -0.43        # median of the elasticity range
    assert 0.65 < ratio < 0.9 and abs(ratio - expected) < 0.08, ratio
    assert "elasticity" in high.inputs and "elasticity" not in base.inputs


def test_business_priors_only_when_map_is_thin():
    thin = df.run_forecast(benichab(), A(), N)
    assert thin.business_estimate["store"]["p50"] > 3 and any("priors" in n for n in thin.notes)
    rich = benichab()
    rich.evidence_pct = 80.0
    rich.counts.update({"store": 4.0, "education": 2.0})
    fc = df.run_forecast(rich, A(), N)
    assert fc.business_estimate["store"]["p50"] == 4.0
    assert fc.business_estimate["restaurant"]["p90"] == 0.0
    assert not any("priors" in n for n in fc.notes)
    # no map at all -> priors
    fc = df.run_forecast(df.Site(label="x", households=150), A(), N)
    assert fc.business_estimate["store"]["p50"] > 2 and "buildings_per_household" not in fc.inputs


def test_anchor_load_adds_its_energy():
    a = A()
    a2 = copy.deepcopy(a)
    a2["anchor_loads"] = [{"name": "pump", "label": "Water pump", "probability": 1.0, "start_year": 3,
                           "kwh_day": [40, 40, 40], "kw": [8, 8, 8], "profile": [[9, 16, 1.0]]}]
    f1, f2 = df.run_forecast(benichab(), a, N), df.run_forecast(benichab(), a2, N)
    d = np.median(f2.energy - f1.energy, axis=0)
    assert abs(d[0]) < 1.5 and abs(d[1]) < 1.5 and 36 < d[2] < 44 and 36 < d[4] < 44, d


def test_country_override():
    g = df.run_forecast(benichab(), A(None), N)
    m = df.run_forecast(benichab(), A("Mauritania"), N)
    ratio = np.median(m.population[:, 0] / m.households[:, 0]) / np.median(g.population[:, 0] / g.households[:, 0])
    assert 1.1 < ratio < 1.3


def test_hourly_8760_matches_annual_energy():
    fc = df.run_forecast(benichab(), A(), 800)
    for yr, q in ((1, 0.5), (5, 0.9)):
        d = fc.representative_draw(yr, q)
        h = df.hourly_8760(fc, yr, d)
        assert h.shape == (8760,) and h.min() >= 0
        assert abs(h.sum() / (fc.energy[d, yr - 1] * 365) - 1) < 1e-6
        # evening busier than 3 am
        day = h.reshape(365, 24).mean(axis=0)
        assert day[20] > 3 * day[3]


def test_sizing_tradeoff_is_monotonic():
    fc = df.run_forecast(benichab(), A(), N)
    designs, risk = df.sizing_risk(fc)
    assert designs["capex_usd"].is_monotonic_increasing and designs["pv_kwp"].is_monotonic_increasing
    r5 = risk[risk.year == 5].set_index("design").loc[designs.design]
    assert r5["p_brownouts"].is_monotonic_decreasing
    assert r5["p_underused"].is_monotonic_increasing
    assert (designs["battery_kwh"] > 0).all() and (designs["night_share"].between(0.2, 0.9)).all()


def test_drivers_add_up():
    fc = df.run_forecast(benichab(), A(), N)
    d = df.drivers(fc, 5)
    assert abs(d["share_of_uncertainty"].sum() - 1) < 1e-9
    assert d.iloc[0]["input"] == "buildings_per_household"


def test_validation_scores_and_calibrates():
    """Fake metered sites whose real use is 1.4x what the model expects: calibration must find it."""
    tmp = Path(tempfile.mkdtemp())
    rng = np.random.default_rng(3)
    rows = []
    for i in range(8):
        hh = int(rng.integers(80, 400))
        yr = int(rng.integers(1, 6))
        fc = df.run_forecast(df.Site(label=f"s{i}", households=hh, counts={"store": hh / 20}, evidence_pct=100),
                             A(None), 600, seed=100 + i)
        p50 = np.median(fc.kwh_per_customer_month[:, yr - 1])
        rows.append({"site_id": f"s{i}", "households": hh, "store": hh / 20, "year": yr,
                     "observed_kwh_per_customer_month": p50 * 1.4 * rng.lognormal(0, 0.08)})
    pd.DataFrame(rows).to_csv(tmp / "sites.csv", index=False)
    a = A(None)
    res, summ = df.validate(tmp / "sites.csv", a, n_draws=600, out_dir=tmp / "out")
    assert len(res) == 8 and (tmp / "out" / "validation_summary.json").exists()
    assert 1.25 < res["loo_factor"].median() < 1.55
    u, c = summ["uncalibrated"], summ["leave_one_out_calibrated"]
    assert c["median_abs_pct_error_p50"] < u["median_abs_pct_error_p50"]
    assert c["coverage_80pct_interval"] >= u["coverage_80pct_interval"]


def test_cli_end_to_end():
    out = Path(tempfile.mkdtemp())
    assert df.main(["--landuse", str(BENICHAB), "--country", "Mauritania", "--draws", "600",
                    "--out", str(out)]) == 0
    names = {p.name for p in out.iterdir()}
    for suffix in ("_forecast_summary.csv", "_drivers.csv", "_sizing_designs.csv", "_sizing_risk_by_year.csv",
                   "_hourly_8760.csv", "_average_day_kw.csv", "_forecast.json", "_forecast.png",
                   "_lender_summary.md", "_sectors_p50.csv"):
        assert any(n.endswith(suffix) for n in names), suffix
    md = next(out.glob("*_lender_summary.md")).read_text(encoding="utf-8")
    for h in ("## Bottom line", "## Which assumptions matter most", "## Sizing: how wrong", "## Limits"):
        assert h in md
    hourly = pd.read_csv(next(out.glob("*_hourly_8760.csv")))
    assert hourly.shape == (8760, 3 + 15)
    j = json.loads(next(out.glob("*_forecast.json")).read_text())
    assert j["site"]["residential_buildings"] == 320
    assert df.main(["--households", "120", "--tariff", "0.6", "--draws", "400", "--out", str(out / "hh"),
                    "--no-report"]) == 0


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"{name}: ok")
