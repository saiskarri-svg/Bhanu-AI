// Results from the demand engine (forecast/demand_forecast.py),
// precomputed for each village by pipeline/run_engine.py.

export interface Q { year: number; p10: number; p50: number; p90: number }
export interface EngineDriver { year: number; input: string; label: string; rank_correlation: number; share_of_uncertainty: number; effect: string }
export interface Design { design: string; design_quantile: number; design_kwh_day: number; capacity_kwh_day: number; pv_kwp: number; battery_kwh: number; inverter_kw: number; capex_usd: number; capex_per_customer_usd: number; annual_cost_usd: number; breakeven_utilisation_at_tariff: number }
export interface RiskRow { design: string; year: number; p_brownouts: number; p_underused: number; median_utilisation: number; cost_per_kwh_p50: number; p_revenue_below_cost: number }
export interface TariffRow { tariff_usd_per_kwh: number; year5_kwh_per_day_p50: number; year5_kwh_per_household_month_p50: number; year5_household_bill_usd_month_p50: number; p50_design_capex_usd: number; breakeven_utilisation: number; p_revenue_covers_cost_year5: number }
export interface BatteryMonth { direct: number; battery: number; share: number; surplus: number; recharge_ok: boolean; need: number; need_p10: number; need_p90: number }
export interface BatteryMode { months: BatteryMonth[]; unmet_pct: number; spilled_mwh: number; cycles: number; min_soc: number; week: { month: number; pv: number[]; demand: number[]; soc: number[] } }
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
  age?: { data_year: number | null; years: number; growth: number; residential_seen: number; residential_now: number; sources: Record<string, number> };
  nearby?: { radius_km: number; weight: number; factor: number; factor_lo: number; factor_hi: number;
    sites: { site_id: string; name: string; country: string; d_km: number; metric: string; year: number; observed: number; predicted: number; ratio: number; weight: number; quality: string; precision: string; source: string; url: string; note: string }[] };
  uncalibrated?: Record<string, Q[]>;
  sizing_basis?: { used: string; dull_season: { peak_sun_hours: number; pv_kwp: number; battery_kwh: number; capex_usd: number; engine_brownout_y5: number; weather_unmet_share: number; weather_short_days: number; worst_month_unmet: number }; yearly_average: { peak_sun_hours: number; pv_kwp: number; battery_kwh: number; capex_usd: number; engine_brownout_y5: number; weather_unmet_share: number; weather_short_days: number; worst_month_unmet: number } };
  landcover?: { source: string; within_1km: Record<string, number>; within_5km: Record<string, number> };
  by_population?: { population: number; source: string; note: string; households: Q[]; customers: Q[]; energy_kwh_per_day: Q[]; peak_kw: Q[];
    p50_design: { pv_kwp: number; battery_kwh: number; capex_usd: number } };
  battery?: { design: string; pv_kwp: number; battery_kwh: number; usable_kwh: number; inverter_kw: number; roundtrip: number; dod: number; model: string;
    clear: BatteryMode; typical: BatteryMode };
  pvday?: { design: string; pv_kwp: number; battery_kwh: number; battery_usable_kwh: number; altitude_m: number; tz: string; tilt: number; model: string; weather: string;
    clear_kwh_kwp_day: number[]; typical_kwh_kwp_day: number[];
    months: { month: number; solar: number[]; clear: number[]; demand: number[]; demand_y1: number[]; solar_kwh: number; demand_kwh: number; direct_kwh: number; battery_need_kwh: number; spare_kwh: number; battery_ok: boolean }[] };
  weather_inputs?: { monthly_mean_temp_c: number[]; peak_sun_hours: number; performance_ratio: number; daily_pv_variability: number; autonomy_days: number } | null;
  weather_sim?: { year: number; outlook_factor: number;
    designs: { design: string; unmet_share: number; worst_year_unmet_share: number; shortfall_days_per_year: number; worst_year_shortfall_days: number; monthly_unmet_share: number[] }[];
    designs_outlook: { design: string; unmet_share: number; worst_year_unmet_share: number; shortfall_days_per_year: number; worst_year_shortfall_days: number; monthly_unmet_share: number[] }[];
    monthly: { demand: number[]; gen_p10: number[]; gen_p50: number[]; gen_p90: number[]; gen_outlook: number[] } };
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
