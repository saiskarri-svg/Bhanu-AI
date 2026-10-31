# Demand forecast: Benichab, Mauritania

*Generated 2026-10-31 with demand_forecast.py · 4,000 simulations · tariff $0.45/kWh · seed 42. Ranges are 80% intervals (P10-P90).*

## Bottom line

- **Year 1:** about **27 kWh/day** (range 19-40), from about 49 customers.
- **Year 5:** about **122 kWh/day** (range 82-181), or 44 MWh a year, from about 176 customers.
- **Growth:** demand rises 1.8x from year 1 to year 2 (mostly new connections) and 4.6x by year 5 (connections plus appliance purchases).
- **Per household:** 7.7 kWh/month in year 1, 11.6 in year 5 (range 9.3-14.5). Per customer in year 5: 20.5 kWh/month, inside the 5-35 kWh range ESMAP found across surveyed mini-grids.
- **Evening peak (year 5):** about **18 kW** (range 12-28); load factor 28%.
- **Who uses it (year 5):** households 52%, shops and food 18%, schools/clinics/worship 7%, mills and workshops 23%. In year 1 households are only 38% because few have connected yet (38 of 190).
- **Bills:** a typical household pays about $3.5/month in year 1 and $5.2 in year 5, against $5-20/month spent today on candles, kerosene, batteries and diesel.

## What the forecast is built on

- **Site:** 320 residential buildings mapped (source: examples/benichab_landuse_summary.json).
- **Households:** 190 (range 150-245); population about 1,166.
- **Businesses and institutions** (mapped vs. used in the model):

  | Type | Mapped | Used (P10-P50-P90) |
  |---|---|---|
  | Shops | 0 | 6.5 - 10.5 - 16.4 |
  | Restaurants & food | 0 | 1.0 - 2.4 - 4.4 |
  | Clinics & health posts | 0 | 0.2 - 0.5 - 0.9 |
  | Schools | 0 | 0.8 - 1.3 - 2.0 |
  | Worship, offices & other | 2 | 2.0 - 2.0 - 2.0 |
  | Large untagged buildings | 3 | 1.2 - 1.5 - 1.8 |

- Business and institution counts include regional priors (only 1% of buildings have use information); mapped counts are used where higher.
- Connection ramp and appliance adoption follow measured data from the Faza mini-grid in Kenya (Tomas Fillol et al. 2025): early and late adopters, S-shaped appliance buying.
- Household use is calibrated to measured sites (Rwanda 8.1, Malawi 7-8 kWh/month), not to surveys, because surveys overstate use (in Malawi, by about 8x).

## Which assumptions matter most

Share of the year-5 uncertainty explained by each input (rank correlation):

1. **Buildings per household**: 40% (higher -> less demand)
2. **Number of new mills / workshops**: 20% (higher -> more demand)
3. **Size of each mill / workshop**: 8% (higher -> more demand)
4. **Overall appetite for appliances**: 3% (higher -> more demand)
5. **Share of households that connect**: 3% (higher -> more demand)
6. **Refrigerator: ownership**: 3% (higher -> more demand)

In year 1 the biggest single driver is **Buildings per household** (40%). Checking the top items on site (a household count, a short appliance and business walk-through) narrows the range most per hour of fieldwork.

## Sizing: how wrong can the forecast be?

Systems sized for different points of the year-5 forecast, each tested against all 4,000 simulated futures. Costs are indicative (Omorate 2021 contract data).

| Build for | PV kWp | Battery kWh | Capex | Brownouts in year 5 | Under 60% used in year 2 | Cost per kWh served, year 5 (P50) | Revenue covers cost in year 5 |
|---|---|---|---|---|---|---|---|
| P25 (98 kWh/day) | 25 | 67 | $139,705 | 58% | 83% | $0.51 | 0% |
| P50 (122 kWh/day) | 31 | 84 | $173,476 | 31% | 94% | $0.57 | 0% |
| P75 (149 kWh/day) | 39 | 103 | $213,510 | 12% | 99% | $0.68 | 0% |
| P90 (181 kWh/day) | 47 | 125 | $258,988 | 4% | 100% | $0.82 | 0% |

- Costs are mostly fixed, so **every 10% shortfall in demand raises the cost per kWh by about 11%**.
- At $0.45/kWh, the P50 design does **not** cover its annual cost even fully used: the cost-recovery tariff is about **$0.50/kWh** with these indicative costs. The gap must come from capital subsidy, results-based grants or lower equipment prices.
- Building for a high percentile avoids brownouts but leaves capacity idle in the early years; a staged build (size for year 2-3, add PV and batteries as demand shows up) limits both risks.

## Tariff: demand, bills and cost recovery

Same village at different tariffs (system built for the P50 year-5 forecast at each tariff). A higher tariff lowers use but raises revenue per kWh.

| Tariff | Year-5 demand (P50) | Household use | Household bill | Capex | Utilisation needed to break even | Revenue covers cost in year 5 |
|---|---|---|---|---|---|---|
| $0.25/kWh | 159 kWh/day | 15.1 kWh/month | $3.8/month | $225,482 | not reachable | 0% |
| $0.45/kWh | 123 kWh/day | 11.8 kWh/month | $5.3/month | $175,946 | not reachable | 0% |
| $0.65/kWh | 105 kWh/day | 10.1 kWh/month | $6.5/month | $149,795 | 77% | 70% |
| $0.85/kWh | 93 kWh/day | 8.9 kWh/month | $7.6/month | $133,032 | 59% | 93% |

Today's spending on candles, kerosene, batteries and diesel: $5-20/month per household.

## Limits

- No meter data from this site yet. All inputs come from published studies and are listed with sources in assumptions.yaml. Run `demand_forecast.py validate` on held-out metered sites to score and calibrate the ranges.
- The peak uses a statistical coincidence model (the hourly load exceeded on only 1% of days in the hottest month). Use the 8760 hourly files in HOMER or REopt for detailed design.
- Costs exclude financing terms and are 2021 Ethiopian prices; replace them with current quotes.
