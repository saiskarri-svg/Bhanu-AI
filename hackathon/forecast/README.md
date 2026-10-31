# Mini-grid demand before building (GEH Brief 03)

Two tools that run on a laptop with open data:

1. **`village_landuse.py`** maps a village. It reads building footprints (Google Open Buildings, Microsoft and OpenStreetMap, via Overture Maps) and works out what each building is used for: homes, shops, schools, clinics, markets, restaurants, workshops.
2. **`demand_forecast.py`** turns that map into a **five-year electricity demand forecast with ranges**. It also gives the hourly load profile, the peak, what drives the uncertainty, and how likely different system sizes are to brown out, sit idle, or fail to cover their costs.

## Quick start

```bash
pip install -r requirements.txt

# 1. map the village (needs internet), then forecast
python village_landuse.py "19.47116, -15.42852"
python demand_forecast.py --landuse results/19_47116_15_42852_summary.json --country Mauritania

# or both in one step
python demand_forecast.py --location "19.47116, -15.42852" --country Mauritania

# no map? give a household count or population (e.g. from WorldPop or a census)
python demand_forecast.py --households 180 --tariff 0.6
```

4,000 simulations take a few seconds. Results go to `forecast/` (change with `--out`).

## How it answers Brief 03

| Brief asks for | Where it is |
|---|---|
| Demand estimate with a range, for any location | `--location` or `--landuse`; P10 / P50 / P90 for years 1-5 |
| Demand growth curve after connection | `*_forecast_summary.csv`, dashboard panel 1 |
| Plain-language drivers a lender can review | `*_lender_summary.md`, `*_drivers.csv` |
| Peak and daily profile (power systems) | `*_average_day_kw.csv`, `*_hourly_8760.csv` (import into HOMER or REopt) |
| How wrong can the estimate be before the finances break | `*_sizing_designs.csv`, `*_sizing_risk_by_year.csv`, `*_tariff_scenarios.csv` |
| What people buy first after connection | appliance ladder in `assumptions.yaml` (early and late adopters) |
| Validation against held-out metered sites | `python demand_forecast.py validate sites.csv` (leave-one-out calibration) |
| Proposal for sharing meter data safely | [below](#sharing-meter-data-safely) |

## How the forecast works

It is bottom-up and probabilistic. Every input in `assumptions.yaml` is a range `[low, most likely, high]` with its source, and the model runs thousands of times, drawing each input from its range.

1. **Households.** Residential buildings divided by buildings per household, growing with population. Alternatively, a household count or population you supply.
2. **Connections.** A share of households connects by year 5, following the ramp measured at the Faza mini-grid in Kenya (28 / 36 / 18 / 12 / 6 % of connections in years 1-5).
3. **Appliances.** Two groups, as in Faza: early adopters (29 %) and late adopters. Ownership of lights, phones, radio, TV, fan, fridge, iron and cooking moves from year-1 to year-5 levels along an S-curve. Buying speed is correlated across appliances. Phones are owned before connection (90 % in Mauritania).
4. **Calibration.** Household use is calibrated to *measured* sites (Rwanda 8.1 and Malawi 7-8 kWh/month), not surveys, because surveys overstate use (8x in Malawi).
5. **Businesses and institutions.** Counts come from the map. Where few buildings carry use information, regional priors per 100 households fill the gap, so a thin map does not mean zero shops.
6. **Productive use.** New mills and workshops appear over time as whole units (lumpy). Optional anchor loads, such as a water pump or telecom tower, can be added in `assumptions.yaml`.
7. **Tariff.** Use scales with price elasticity (-0.1 to -0.8). In Sierra Leone, a 41 % tariff cut raised use by about 50 % net.
8. **Hourly load and peak.** Each appliance has usage windows and seasonality (fans in the hot season, schools in term). The design peak is the hourly load exceeded on only 1 % of days in the hottest month, from a coincidence model.
9. **Sizing risk.** PV, battery and inverter are sized for the P25 / P50 / P75 / P90 forecast, and each design is tested against all simulated futures. The outputs are the chance of brownouts, the chance of low use, the cost per kWh, and whether revenue covers cost at the tariff.

## Outputs

| File | Contents |
|---|---|
| `*_forecast.png` | dashboard: growth fan chart, use vs measured sites, average day, who uses the energy, drivers, sizing risk |
| `*_lender_summary.md` | plain-language summary: bottom line, inputs, drivers, sizing and tariff tables, limits |
| `*_forecast_summary.csv` | P10 / P50 / P90 per year: households, customers, kWh/day, MWh/year, peak kW, load factor, kWh per household and per customer, bills |
| `*_sectors_p50.csv` | energy by households / businesses / institutions / productive use |
| `*_drivers.csv` | share of forecast uncertainty from each input (years 1 and 5) |
| `*_hourly_8760.csv` | hourly kW for each year at P10 / P50 / P90 |
| `*_sizing_designs.csv`, `*_sizing_risk_by_year.csv` | PV kWp, battery kWh, capex, and risks per year for each design |
| `*_tariff_scenarios.csv` | demand, bills and cost recovery at several tariffs |
| `*_forecast.json` | everything above plus the site and settings, for an app or API |

## Changing the assumptions

Edit `assumptions.yaml`. Every number is there with its source. The most useful edits:

- **Your country:** add an entry under `country_overrides` with household size and population growth, from DHS StatCompiler or a census.
- **Your climate:** set `seasonality.monthly_mean_temp_c` (12 values, e.g. NASA POWER T2M), and `sizing.peak_sun_hours` for the site.
- **A known anchor load:** see the commented water-pump example under `anchor_loads`.
- **Costs:** the defaults are 2021 contract prices from the Omorate mini-grid (Ethiopia), generation only, plus a 40 % share for distribution and soft costs. Replace them with current quotes.

## Validation and calibration

Fill in `examples/metered_sites_template.csv` (or a copy), then:

```bash
python demand_forecast.py validate my_metered_sites.csv
```

There is one row per site and year since commissioning. The columns are `site_id`, `year`, `observed_kwh_per_customer_month`, plus either `landuse_json` or `households`, and optionally the counts `store, restaurant, education, health, other_nonres`, `tariff_usd_per_kwh`, `country`, and `metric` (`customer` or `household`).

The command reports:
- **Coverage:** how often the observed value falls inside the P10-P90 range (target 80 %).
- **Median absolute % error** of the P50.
- **Pinball loss.**

It reports each metric before and after a **leave-one-out calibration**: one usage multiplier learned from the other sites and applied to the held-out site. In the tests, sites whose real use is 1.4x the model's are recovered (median error 27 % → 3 %).

## Sharing meter data safely

Operators don't need to share customer-level data. The template above asks only for **site-level monthly aggregates by customer class**, which is all the model needs to be scored and calibrated:

- **What to share:** for each site, customer class and month since commissioning, the number of active customers, total kWh, and the tariff. Add the site size (household count or land-use summary).
- **What stays private:** no names, meter IDs or customer rows. Locations are rounded to about 10 km, and any row with fewer than 10 customers is dropped.
- **How:** operators run a small export script on their own systems. A neutral host, such as an industry association or a university, pools the aggregates and publishes only model parameters and error statistics.
- **What operators get back:** calibrated forecasts for their own pipeline sites, benchmarks against peers, and evidence for lenders. That's the incentive to take part.

## Limits

- **Not yet validated on real metered sites.** The ranges come from published studies (Faza Kenya, Rwanda, Malawi, Myanmar, Sierra Leone, ESMAP, CLASP). Run `validate` as soon as partner data is available.
- **Business counts come from priors where the map is thin.** Check them on site.
- **The peak is a statistical estimate.** Use the 8760 files in HOMER or REopt for detailed design.
- **The tariff affects how much people use, not which appliances they buy.**
- **The land-use step has been tested on a synthetic village and on one live run (Benichab, Mauritania).** Compare its HTML map with satellite imagery for new sites.

## Tests

```bash
python test_synthetic.py   # land-use model
python test_forecast.py    # demand forecast (11 tests: calibration, tariff, priors, 8760, sizing, validation, CLI)
```
