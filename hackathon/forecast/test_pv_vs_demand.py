"""
Tests for pv_vs_demand.py.   Run:  python test_pv_vs_demand.py   (or pytest test_pv_vs_demand.py)
"""
import json
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

import pv_vs_demand as pvd

HERE = Path(__file__).resolve().parent
DEMAND = HERE / "examples" / "benichab_forecast" / "benichab_mauritania_hourly_8760.csv"
PV = HERE / "examples" / "benichab_clearsky" / "benichab_mauritania_clearsky_15min.csv"


def test_daily_balance_simple_cases():
    d = np.ones(24)
    b = pvd.daily_balance(d, np.zeros(24), 0.9)                    # no PV at all
    assert b["from_battery_kwh"] == 24 and not b["recharge_ok"] and abs(b["pv_shortfall_kwh"] - 24 / 0.9) < 1e-9
    b = pvd.daily_balance(d, d, 0.9)                               # PV exactly matches demand
    assert b["from_battery_kwh"] == 0 and b["pv_surplus_kwh"] == 0 and b["usable_capacity_needed_kwh"] == 0
    pv = np.where((np.arange(24) >= 6) & (np.arange(24) < 18), 3.0, 0.0)   # 12 h of 3 kW
    b = pvd.daily_balance(d, pv, 0.81)
    assert b["from_battery_kwh"] == 12 and b["pv_surplus_kwh"] == 24 and b["recharge_ok"]
    assert abs(b["usable_capacity_needed_kwh"] - 12 / 0.9) < 1e-9          # night / discharge efficiency
    assert abs(b["spilled_after_recharge_kwh"] - (24 - 12 / 0.81)) < 1e-9
    assert b["battery_hours"] == 12 and abs(b["battery_share"] - 0.5) < 1e-12


def test_dispatch_conserves_energy_and_respects_limits():
    rng = np.random.default_rng(1)
    h = np.arange(8760) % 24
    demand = 2 + rng.random(8760) * 3
    pv = np.clip(np.sin(np.pi * (h - 6) / 12), 0, None) * 12 * rng.uniform(0.3, 1.0, 8760)
    bat = pvd.Battery(40, 0.8, 0.9, inverter_kw=4.0)
    s = pvd.simulate_year(demand, pv, bat)
    assert np.allclose(s.pv_direct + s.discharge + s.unmet, s.demand)
    assert np.allclose(s.pv_direct + s.charge + s.spilled, s.pv)
    assert s.soc_kwh.min() >= -1e-9 and s.soc_kwh.max() <= bat.usable_kwh + 1e-9
    assert s.discharge.max() <= 4.0 + 1e-9
    assert (s[["charge", "discharge", "unmet", "spilled"]] >= -1e-12).all().all()
    # energy stored = charge*eta - discharge/eta
    eta = np.sqrt(0.9)
    assert abs((s.charge * eta - s.discharge / eta).sum() - (s.soc_kwh.iloc[-1] - bat.usable_kwh)) < 1e-6
    # no battery -> everything not covered by PV is unmet
    s0 = pvd.simulate_year(demand, pv, pvd.Battery(0.0))
    assert np.allclose(s0.unmet, np.clip(demand - pv, 0, None))
    # big battery and plenty of PV -> nothing unmet
    big = pvd.simulate_year(np.ones(8760), np.where((h >= 6) & (h < 18), 4.0, 0.0), pvd.Battery(1000))
    assert big.unmet.sum() == 0


def test_benichab_end_to_end():
    out = Path(tempfile.mkdtemp())
    r = pvd.run(DEMAND, PV, year=5, out_dir=out)
    t, bat, des = r["table"], r["battery"], r["design"]
    assert len(t) == 12 and des is not None and abs(bat.nominal_kwh - des["battery_kwh"]) < 1e-9
    assert t["battery_share"].between(0.3, 0.6).all()
    assert t["recharge_ok"].all()
    # P90 demand needs more battery than P50, P10 less
    assert (t["usable_capacity_needed_kwh_p90"] > t["usable_capacity_needed_kwh"]).all()
    # PV scaled to the design kWp: annual clear-sky PV x (design kWp / 31 kWp run)
    meta = json.loads((PV.parent / "benichab_mauritania_clearsky_meta.json").read_text())
    raw, _ = pvd.load_pv(PV)
    assert abs(r["sim"].pv.sum() / raw.pv_kw.sum() - des["pv_kwp"] / meta["array"]["kwp"]) < 1e-9
    for k in ("monthly", "hourly", "months_png", "summary_png", "week_png"):
        assert r["files"][k].exists(), k
    # a 4x larger battery leaves less demand unserved
    r2 = pvd.run(DEMAND, PV, year=5, battery_kwh=4 * bat.nominal_kwh, inverter_kw=100, out_dir=out / "big",
                 plots=False)
    assert r2["sim"].unmet.sum() < r["sim"].unmet.sum()


def test_cli_and_errors():
    out = Path(tempfile.mkdtemp())
    assert pvd.main(["--demand", str(DEMAND), "--pv", str(PV), "--year", "1", "--scenario", "p90",
                     "--sizing", "none", "--pv-scale", "none", "--no-plots", "--out", str(out)]) == 0
    m = pd.read_csv(next(out.glob("*_pv_vs_demand_monthly.csv")))
    assert "year_sim_unmet_kwh" not in m.columns                   # no battery given -> no dispatch
    assert pvd.main(["--demand", str(PV), "--pv", str(PV), "--out", str(out)]) == 1   # wrong file


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"{name}: ok")
