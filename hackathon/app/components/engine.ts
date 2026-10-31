// Results from the demand engine (forecast/demand_forecast.py, by Fereshteh),
// precomputed for each village by pipeline/run_engine.py.

export interface Q { year: number; p10: number; p50: number; p90: number }
export interface EngineDriver { year: number; input: string; label: string; rank_correlation: number; share_of_uncertainty: number; effect: string }
export interface Design { design: string; design_quantile: number; design_kwh_day: number; capacity_kwh_day: number; pv_kwp: number; battery_kwh: number; inverter_kw: number; capex_usd: number; capex_per_customer_usd: number; annual_cost_usd: number; breakeven_utilisation_at_tariff: number }
export interface RiskRow { design: string; year: number; p_brownouts: number; p_underused: number; median_utilisation: number; cost_per_kwh_p50: number; p_revenue_below_cost: number }
export interface TariffRow { tariff_usd_per_kwh: number; year5_kwh_per_day_p50: number; year5_kwh_per_household_month_p50: number; year5_household_bill_usd_month_p50: number; p50_design_capex_usd: number; breakeven_utilisation: number; p_revenue_covers_cost_year5: number }
export interface Engine {
  site: string; engine: string; tariff: number; peak_sun_hours: number;
  landuse: { residential_buildings: number; mapped: Record<string, number>; evidence_pct: number };
  notes: string[];
  business: Record<string, { label: string; mapped: number; p10: number; p50: number; p90: number }>;
  summary: Record<string, Q[]>;
  sectors: { year: number; Households: number; Businesses: number; Institutions: number; 'Productive use': number }[];
  drivers1: EngineDriver[]; drivers5: EngineDriver[];
  designs: Design[]; risk: RiskRow[]; tariffs: TariffRow[];
  profile: Record<string, { p10: number[]; p50: number[]; p90: number[] }>;
}

const files = import.meta.glob('../data/engine/*.json', { eager: true, import: 'default' }) as Record<string, Engine>;
export const ENGINE: Record<string, Engine> = Object.fromEntries(Object.entries(files).map(([p, d]) => [p.split('/').pop()!.replace('.json', ''), d]));

export const PR = 0.75;       // performance ratio used by the engine
export const HEADROOM = 0.1;  // capacity = 1.1 x design demand
export const kwpFor = (kwhDay: number, psh: number) => (kwhDay * (1 + HEADROOM)) / (psh * PR);

// Published measurements quoted by the engine's assumptions (kWh per household per month)
export const MEASURED = [
  { label: 'Rwanda, rural grid', v: 8.1 },
  { label: 'Malawi, Sitolo mini-grid', v: 7.5 },
];
