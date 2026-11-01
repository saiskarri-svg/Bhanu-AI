import type { Engine } from './engine';
import { derive, IRENA, type Settings } from './settings';
import { termsFor } from './CashFlow';

// 20-year cash for the chosen settings: the payback test lenders and owners ask for.
// Engine cost file (forecast/assumptions.yaml): running costs, 10-year battery and inverter life, 0.9 replacement factor.
const OM = { pv: 13.5, inv: 4.3, batt: 22.3 };
const LIFE = 20, BATT_LIFE = 10, REPL = 0.9;
export const DEMAND_AFTER_5 = 0.02; // growth a year after year 5 (assumption: slow, as homes add appliances)

export interface Year { y: number; kwh: number; revenue: number; om: number; repl: number; debt: number; capex: number; owner: number; ownerCum: number; project: number; projectCum: number }

const pay = (loan: number, rate: number, years: number, grace: number) => {
  // annual payments: interest added during the grace year(s), then equal payments
  const g = grace / 12, r = rate, n = years - g;
  const bal = loan * Math.pow(1 + r, g);
  return { pmt: loan > 0 ? bal * r / (1 - Math.pow(1 + r, -n)) : 0, from: g + 1, to: years };
};

export const lifetime = (eng: Engine, s: Settings, grant: number) => {
  const d = derive(eng, s);
  if (!d.des || !d.E || !d.full) return null;
  const T = termsFor(s);
  const st1 = d.des, full = d.full;
  const inv1 = (st1 as { inverter_kw?: number }).inverter_kw ?? 0, invF = (full as { inverter_kw?: number }).inverter_kw ?? inv1;
  const battPrice = s.cost === 'irena' ? IRENA.batt * IRENA.premium : 361, invPrice = 315;
  const base = eng.summary.energy_kwh_per_day[4].p50;
  const f = d.meta || !d.tsel ? 1 : d.tsel.year5_kwh_per_day_p50 / base;
  const staged = !!d.stage2;
  // Money in at the start
  const capex0 = st1.capex_usd, toFin0 = Math.max(0, capex0 - grant);
  const loan0 = toFin0 * T.debtShare, eq0 = toFin0 - loan0;
  const L0 = pay(loan0, T.rate, T.years, T.grace);
  // Expansion at the start of year 3 (no grant): same loan terms, no grace
  const capex3 = staged ? d.stage2!.capex_usd : 0;
  const loan3 = capex3 * T.debtShare, eq3 = capex3 - loan3;
  const L3 = pay(loan3, T.rate, T.years, 0);
  const rows: Year[] = [];
  let oc = -eq0, pc = -(capex0 - grant);
  for (let y = 1; y <= LIFE; y++) {
    const kit = staged && y < 3 ? { pv: st1.pv_kwp, b: st1.battery_kwh, i: inv1, cap: st1.capacity_kwh_day } : { pv: full.pv_kwp, b: full.battery_kwh, i: invF, cap: full.capacity_kwh_day };
    const day = (y <= 5 ? d.E[y - 1].p50 : d.E[4].p50 * Math.pow(1 + DEMAND_AFTER_5, y - 5)) * f;
    const kwh = Math.min(day, kit.cap) * 365;
    const revenue = kwh * s.tar * T.collection;
    const om = kit.pv * OM.pv + kit.i * OM.inv + kit.b * OM.batt;
    // Batteries and inverters replaced after 10 years (stage 1 kit in year 11, expansion kit in year 13)
    const b1 = staged ? st1.battery_kwh : full.battery_kwh, i1 = staged ? inv1 : invF;
    const repl = (y === BATT_LIFE + 1 ? REPL * (b1 * battPrice + i1 * invPrice) : 0)
      + (staged && y === BATT_LIFE + 3 ? REPL * ((full.battery_kwh - b1) * battPrice + (invF - i1) * invPrice) : 0);
    const debt = (y >= L0.from && y <= L0.to ? L0.pmt : 0) + (staged && y >= 3 && y < 3 + T.years ? L3.pmt : 0);
    const capex = staged && y === 3 ? capex3 : 0;
    const owner = revenue - om - repl - debt - (staged && y === 3 ? eq3 : 0);
    const project = revenue - om - repl - capex;
    oc += owner; pc += project;
    rows.push({ y, kwh, revenue, om, repl, debt, capex, owner, ownerCum: oc, project, projectCum: pc });
  }
  // Payback: first year the running total turns positive, with the fraction of that year
  const pb = (key: 'ownerCum' | 'projectCum', key2: 'owner' | 'project', start: number) => {
    // the point after which the running total stays positive (later money put in counts too)
    let last = -1;
    rows.forEach((r, i) => { if (r[key] < 0) last = i; });
    if (last === rows.length - 1) return null;
    if (last < 0) return start < 0 ? Math.min(1, -start / Math.max(1e-9, rows[0][key2])) : 0;
    const prev = rows[last][key];
    return last + 1 + Math.min(1, Math.max(0, -prev / Math.max(1e-9, rows[last + 1][key2])));
  };
  return { rows, ownerPayback: pb('ownerCum', 'owner', -eq0), projectPayback: pb('projectCum', 'project', -(capex0 - grant)), equity: eq0 + eq3, eq0, eq3, capex0, capex3, grant, loan0, loan3, T, ownerTotal: oc, projectTotal: pc };
};
