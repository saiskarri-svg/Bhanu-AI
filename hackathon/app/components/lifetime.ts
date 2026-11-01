import type { Engine } from './engine';
import { derive, IRENA, type Settings } from './settings';
import { termsFor } from './CashFlow';
import { expSold, scaleQ } from './rightsize';

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
  const st1 = d.des as { pv_kwp: number; battery_kwh: number; inverter_kw?: number; capacity_kwh_day: number; capex_usd: number };
  const inv1 = st1.inverter_kw ?? 0;
  const battPrice = s.cost === 'irena' ? IRENA.batt * IRENA.premium : 361, invPrice = 315;
  const base = eng.summary.energy_kwh_per_day[4].p50;
  const f = d.meta || !d.tsel ? 1 : d.tsel.year5_kwh_per_day_p50 / base;
  const adds = d.adds ?? [];
  // Money in at the start
  const g0 = Math.min(st1.capex_usd, grant * d.grantShare0);
  const capex0 = st1.capex_usd, toFin0 = capex0 - g0;
  const loan0 = toFin0 * T.debtShare, eq0 = toFin0 - loan0;
  const L0 = pay(loan0, T.rate, T.years, T.grace);
  // Each later stage: no grant, same loan terms, no grace
  const later = adds.map(a => { const g = Math.min(a.capex_usd, grant * a.grantShare); const loan = (a.capex_usd - g) * T.debtShare; return { ...a, g, loan, eq: a.capex_usd - g - loan, L: pay(loan, T.rate, T.years, 0) }; });
  const kitAt = (y: number) => { let k = { pv: st1.pv_kwp, b: st1.battery_kwh, i: inv1, cap: st1.capacity_kwh_day }; later.forEach(a => { if (y >= a.year) k = { pv: a.kit.pv_kwp, b: a.kit.battery_kwh, i: a.kit.inverter_kw, cap: a.kit.capacity_kwh_day }; }); return k; };
  const rows: Year[] = [];
  let oc = -eq0, pc = -(capex0 - g0);
  for (let y = 1; y <= LIFE; y++) {
    const kit = kitAt(y);
    const q = scaleQ(y <= 5 ? d.E[y - 1] : scaleQ(d.E[4], Math.pow(1 + DEMAND_AFTER_5, y - 5)), f);
    const kwh = expSold(q, kit.cap) * 365;
    const revenue = kwh * s.tar * T.collection;
    const om = kit.pv * OM.pv + kit.i * OM.inv + kit.b * OM.batt;
    // Batteries and inverters replaced 10 years after each stage goes in
    let repl = y === BATT_LIFE + 1 ? REPL * (st1.battery_kwh * battPrice + inv1 * invPrice) : 0;
    later.forEach(a => { if (y === a.year + BATT_LIFE) repl += REPL * ((a.kit.battery_kwh - a.prev.battery_kwh) * battPrice + (a.kit.inverter_kw - a.prev.inverter_kw) * invPrice); });
    let debt = y >= L0.from && y <= L0.to ? L0.pmt : 0;
    later.forEach(a => { if (y >= a.year && y < a.year + T.years) debt += a.L.pmt; });
    const capex = later.filter(a => a.year === y).reduce((t, a) => t + a.capex_usd - a.g, 0);
    const eqY = later.filter(a => a.year === y).reduce((t, a) => t + a.eq, 0);
    const owner = revenue - om - repl - debt - eqY;
    const project = revenue - om - repl - capex;
    oc += owner; pc += project;
    rows.push({ y, kwh, revenue, om, repl, debt, capex, owner, ownerCum: oc, project, projectCum: pc });
  }
  const eq3 = later.reduce((t, a) => t + a.eq, 0), capex3 = later.reduce((t, a) => t + a.capex_usd, 0);
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
  return { rows, ownerPayback: pb('ownerCum', 'owner', -eq0), projectPayback: pb('projectCum', 'project', -(capex0 - g0)), equity: eq0 + eq3, eq0, eq3, capex0, capex3, grant, loan0, T, ownerTotal: oc, projectTotal: pc };
};
