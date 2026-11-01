"""
Tests for clearsky_pv.py.   Run:  python test_clearsky.py   (or pytest test_clearsky.py)
"""
import logging
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

import clearsky_pv as cs

logging.disable(logging.WARNING)
BENICHAB = dict(latitude=19.47116, longitude=-15.42852, altitude=50, name="Benichab", tz="Africa/Nouakchott")


def test_ineichen_equations_match_pvlib():
    rng = np.random.default_rng(0)
    n = 20000
    zen = rng.uniform(0, 100, n)                      # includes night (> 90)
    am = pvlib.atmosphere.get_absolute_airmass(pvlib.atmosphere.get_relative_airmass(zen), 95000)
    tl = rng.uniform(2, 7, n)
    alt = rng.uniform(0, 3000, n)
    i0 = rng.uniform(1320, 1415, n)
    for enh in (False, True):
        mine = cs.ineichen_perez(zen, am, tl, alt, i0, enh)
        ref = pvlib.clearsky.ineichen(zen, am, tl, alt, i0, perez_enhancement=enh)
        for m, k in zip(mine, ("ghi", "dni", "dhi")):
            assert np.allclose(m, ref[k], atol=1e-9, equal_nan=True), k
    night = zen > 90.5
    assert np.all(mine[0][night] == 0)


def test_full_chain_matches_pvlib_location():
    """Same solar position -> GHI/DNI/DHI identical to pvlib.location.Location.get_clearsky."""
    site = cs.Site(**BENICHAB)
    df, _ = cs.simulate(site, cs.Array(1.0), cs.Options(freq="1h"))
    mid = df.index + pd.Timedelta("30min")
    loc = pvlib.location.Location(site.latitude, site.longitude, site.tz, site.altitude)
    sp = loc.get_solarposition(mid, temperature=float(df["temp_air"].mean()))
    ref = loc.get_clearsky(mid, solar_position=sp)
    for k in ("ghi", "dni", "dhi"):
        assert np.allclose(df[k].values, ref[k].values, atol=1e-6), k


def test_flat_panel_sees_ghi():
    site = cs.Site(**BENICHAB)
    for model in ("perez", "isotropic"):
        df, _ = cs.simulate(site, cs.Array(1.0, tilt=0, azimuth=180), cs.Options(freq="1h", diffuse_model=model))
        # Perez caps the circumsolar geometry at zenith 85 deg, so compare above that (< 10 W/m2 differs)
        sun = df["solar_zenith_apparent"] < 85
        assert np.allclose(df.loc[sun, "poa_global"], df.loc[sun, "ghi"], atol=1e-6), model
        assert (df["poa_global"] - df["ghi"]).abs().max() < 1.0


def test_east_west_symmetry():
    """With no temperature effect, east- and west-facing arrays collect the same energy over a year."""
    site = cs.Site(**BENICHAB)
    opt = cs.Options(freq="5min", tmin=[25], tmax=[25])
    e = {az: cs.simulate(site, cs.Array(1.0, tilt=30, azimuth=az, gamma_pdc=0.0), opt)[0]["p_ac_kw"].sum()
         for az in (90, 270)}
    assert abs(e[90] / e[270] - 1) < 0.005, e


def test_seasons_and_geometry():
    site = cs.Site(**BENICHAB)
    df, arr = cs.simulate(site, cs.Array(31, tilt=20, azimuth=180), cs.Options())
    s = cs.monthly_summary(df, "15min", arr).set_index("month")
    assert s.loc["Jan", "poa_kwh_m2_day"] > s.loc["Jan", "ghi_kwh_m2_day"]      # tilt helps in winter
    assert s.loc["Jun", "poa_kwh_m2_day"] < s.loc["Jun", "ghi_kwh_m2_day"]      # sun north of zenith in June
    assert 950 < df.loc[df.index.month == 6, "ghi"].max() < 1100
    assert 2000 < (s["ghi_kwh_m2_day"] * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]).sum() < 2700
    assert s["pv_ac_kwh_per_kwp_day"].between(4.0, 6.5).all()
    assert s["performance_ratio"].between(0.6, 0.85).all()
    assert (df["p_ac_kw"] <= arr.ac_kw + 1e-9).all()
    night = df["solar_zenith_apparent"] > 91
    assert (df.loc[night, ["ghi", "dni", "dhi", "p_ac_kw"]] == 0).all().all()
    # solar noon at ~13:00 local in Mauritania (UTC+0 at 15.4 W)
    jun15 = df[(df.index.month == 6) & (df.index.day == 15)]
    t_peak = jun15["ghi"].idxmax()
    assert 12.6 < t_peak.hour + t_peak.minute / 60 < 13.4


def test_altitude_turbidity_clipping_and_defaults():
    hi = cs.simulate(cs.Site(**{**BENICHAB, "altitude": 2000}), cs.Array(1.0), cs.Options(freq="1h"))[0]
    lo = cs.simulate(cs.Site(**BENICHAB), cs.Array(1.0), cs.Options(freq="1h"))[0]
    assert hi["ghi"].sum() > lo["ghi"].sum()
    clear = cs.simulate(cs.Site(**BENICHAB), cs.Array(1.0), cs.Options(freq="1h", linke=[2.5]))[0]
    hazy = cs.simulate(cs.Site(**BENICHAB), cs.Array(1.0), cs.Options(freq="1h", linke=[6.0]))[0]
    assert clear["dni"].sum() > 1.3 * hazy["dni"].sum() and hazy["dhi"].sum() > clear["dhi"].sum()
    df, arr = cs.simulate(cs.Site(**BENICHAB), cs.Array(10, dc_ac_ratio=1.6), cs.Options(freq="15min"))
    assert abs(df["p_ac_kw"].max() - arr.ac_kw) < 1e-6                         # clipping at 6.25 kW
    south = cs.Array().resolve(cs.Site(-25.0, 30.0, 1200))
    assert south.azimuth == 0 and south.tilt == 25
    north = cs.Array().resolve(cs.Site(5.0, 1.0, 10))
    assert north.azimuth == 180 and north.tilt == 10
    try:
        cs.monthly([1, 2, 3], None, "x")
        raise AssertionError("3 values accepted")
    except ValueError:
        pass


def test_cli_writes_outputs():
    out = Path(tempfile.mkdtemp())
    assert cs.main(["--lat", "12.65", "--lon", "-8.0", "--altitude", "350", "--kwp", "20", "--name", "Test site",
                    "--tmin", "22", "--tmax", "35", "--freq", "30min", "--out", str(out)]) == 0
    names = sorted(p.name for p in out.iterdir())
    assert names == ["test_site_clearsky_30min.csv", "test_site_clearsky_meta.json",
                     "test_site_clearsky_monthly.csv", "test_site_clearsky_year.png",
                     "test_site_irradiance_by_month.png", "test_site_pv_power_by_month.png"]
    import json
    meta = json.loads((out / "test_site_clearsky_meta.json").read_text())
    assert meta["array"]["kwp"] == 20 and meta["site"]["altitude"] == 350
    m = pd.read_csv(out / "test_site_clearsky_monthly.csv")
    assert len(m) == 12 and (m["pv_ac_kwh_day"] > 0).all()
    ts = pd.read_csv(out / "test_site_clearsky_30min.csv")
    assert len(ts) == 365 * 48


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"{name}: ok")
