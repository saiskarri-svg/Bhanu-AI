// GridSight model: building classes, demand range, load profile, drivers,
// growth and sizing. Every number here is a rough guide; the sources are in
// sources.ts and each parameter says where its range comes from.

export type Cls = 'res' | 'com' | 'health' | 'school' | 'other';
export const CLASSES: Cls[] = ['res', 'com', 'health', 'school', 'other'];
export const CLS_LABEL: Record<Cls, string> = {
  res: 'Residential', com: 'Commercial', health: 'Health facility', school: 'School', other: 'Other',
};

export interface Place { name: string | null; cat: string | null; conf: number; lat: number; lon: number }
export interface Plant { cls: string; name: string | null; d_km: number; source?: string | null; output?: string | null; lat: number; lon: number }
// [lat, lon, area_m2, ob_conf, osm_class, poi_cat, poi_conf, d_road_m, d_main_road_m, n_within_50m, elongation, compactness, d_market_m]
export type RawBuilding = [number, number, number, number, string | null, string | null, number | null, number | null, number | null, number, number | null, number | null, number | null];

export interface SiteData {
  name: string; country: string; region: string; lat: number; lon: number; radius_m: number; note?: string; fetched: string;
  sources: { open_buildings: string; overture: string; overture_building_sources: Record<string, number> };
  grid: { dist_km: number | null; nearest: string | null; searched_km: number; note: string; plants?: Plant[] };
  viirs: number | null;
  buildings: RawBuilding[];
  places: Place[];
  roads: { c: string; p: [number, number][] }[];
  power_lines: { c: string; p: [number, number][] }[];
}

export interface Building {
  lat: number; lon: number; area: number; obConf: number;
  cls: Cls; conf: number; probs: Record<Cls, number>; why: string; tagged: boolean;
  dRoad: number | null; dMain: number | null; near: number; elong: number | null;
}

// ---------- Classification ----------
const has = (s: string | null | undefined, words: string[]) => !!s && words.some(w => s.toLowerCase().includes(w));
const HEALTH = ['hospital', 'clinic', 'medical', 'health', 'doctor', 'dentist', 'maternity', 'dispensary'];
const SCHOOL = ['school', 'college', 'university', 'kindergarten', 'education'];
const COM = ['commercial', 'retail', 'shop', 'store', 'kiosk', 'office', 'industrial', 'warehouse', 'market', 'restaurant', 'bar', 'hotel', 'lodg', 'bank', 'salon', 'beauty', 'repair', 'fuel', 'gas_station', 'pharmacy', 'mobile', 'service', 'food', 'cafe', 'mill', 'workshop', 'butcher', 'bakery', 'supermarket', 'business', 'agricultur'];
const RES = ['residential', 'house', 'hut', 'detached', 'apartments', 'bungalow', 'terrace', 'dormitory'];
const OTHER = ['religious', 'church', 'mosque', 'worship', 'civic', 'government', 'public', 'community', 'shed', 'garage', 'toilet', 'barn', 'farm', 'cemetery', 'police'];

const tagClass = (t: string | null): Cls | null =>
  has(t, HEALTH) ? 'health' : has(t, SCHOOL) ? 'school' : has(t, COM) ? 'com' : has(t, RES) ? 'res' : has(t, OTHER) ? 'other' : null;

const one = (c: Cls, p: number): Record<Cls, number> => {
  const rest = (1 - p) / 4;
  return { res: rest, com: rest, health: rest, school: rest, other: rest, [c]: p } as Record<Cls, number>;
};

export function classify(b: RawBuilding): Building {
  const [lat, lon, area, obConf, osm, poi, poiConf, dRoad, dMain, near, elong] = b;
  const base = { lat, lon, area, obConf, dRoad, dMain, near, elong };
  const tc = tagClass(osm);
  if (tc) {
    const p = 0.93;
    return { ...base, cls: tc, conf: p, probs: one(tc, p), why: `OpenStreetMap tag "${osm}"`, tagged: true };
  }
  const pc = tagClass(poi);
  if (pc) {
    const p = Math.min(0.9, 0.55 + 0.4 * (poiConf ?? 0.5));
    return { ...base, cls: pc, conf: p, probs: one(pc, p), why: `Mapped place "${poi}" within 20 m`, tagged: true };
  }
  // Untagged: transparent score per class, then softmax
  // Starting scores are priors: in a rural village most roofs are homes; about
  // 1 in 20 is a shop and only a handful of roofs are a clinic or school.
  const s: Record<Cls, number> = { res: 1.6, com: -1.3, health: -5, school: -4.5, other: -0.6 };
  const why: string[] = [];
  if (area < 15) { s.other += 2.4; why.push('very small (likely kitchen, store or latrine)'); }
  else if (area < 25) { s.other += 1.0; why.push('small'); }
  if (area >= 25 && area <= 160) { s.res += 0.6; }
  if (near >= 2 && near <= 25) s.res += 0.3;
  if (dMain != null && dMain < 25) { s.com += 1.4; why.push('fronts a main road'); }
  else if (dRoad != null && dRoad < 12) { s.com += 0.5; why.push('beside a road'); }
  if (elong != null && elong > 2.3 && area > 30) { s.com += 0.6; s.school += 0.4; why.push('long narrow block (row of shops or classrooms)'); }
  if (near >= 25 && area >= 30) { s.com += 0.5; why.push('in the dense centre'); }
  if (b[12] != null && b[12] < 150) { s.com += 0.7; why.push('near a market'); }
  if (area > 250) { s.other += 0.7; s.com += 0.6; s.school += 1.6; s.health += 1.2; s.res -= 0.8; why.push('large footprint'); }
  if (area > 120 && area < 700 && elong != null && elong > 2.5 && near < 6) { s.school += 1.5; why.push('long block standing apart (school-like)'); }
  const ex = CLASSES.map(c => Math.exp(s[c]));
  const tot = ex.reduce((a, x) => a + x, 0);
  const probs = Object.fromEntries(CLASSES.map((c, i) => [c, ex[i] / tot])) as Record<Cls, number>;
  // Untagged buildings never claim more than 85% confidence
  let cls: Cls = 'res';
  for (const c of CLASSES) if (probs[c] > probs[cls]) cls = c;
  const conf = Math.min(0.85, probs[cls]);
  return { ...base, cls, conf, probs, why: why.length ? `Estimate from shape and place: ${why.join(', ')}` : 'Estimate: typical house size, no tags', tagged: false };
}

export interface ClassSummary { count: Record<Cls, number>; expected: Record<Cls, number>; variance: Record<Cls, number>; area: Record<Cls, number>; tagged: number }
export function summarise(bs: Building[]): ClassSummary {
  const z = () => ({ res: 0, com: 0, health: 0, school: 0, other: 0 });
  const count = z(), expected = z(), variance = z(), area = z();
  let tagged = 0;
  for (const b of bs) {
    count[b.cls]++; area[b.cls] += b.area;
    if (b.tagged) tagged++;
    for (const c of CLASSES) { expected[c] += b.probs[c]; variance[c] += b.probs[c] * (1 - b.probs[c]); }
  }
  return { count, expected, variance, area, tagged };
}

// ---------- Parameters ----------
// Each is a triangular range [low, likely, high]. Low and high are roughly the
// 5th and 95th percentile of what we expect across sites in the region.
export interface Param { key: string; label: string; unit: string; lo: number; mode: number; hi: number; plain: string; src: string }
export const PARAMS: Param[] = [
  { key: 'hhPerRes', label: 'Households per residential building', unit: '', lo: 0.45, mode: 0.65, hi: 0.9,
    plain: 'Satellite footprints count every roof, and a family compound often has a separate kitchen or store, so one house is not one customer.', src: 'own estimate; check with a site walk' },
  { key: 'conn', label: 'Households that connect in year 1', unit: '%', lo: 0.45, mode: 0.65, hi: 0.85,
    plain: 'Not every household signs up at once; connection fees and trust hold some back.', src: 'ESMAP 2022' },
  { key: 'kwhHH', label: 'Use per connected household', unit: 'kWh/month', lo: 4, mode: 7, hi: 20,
    plain: 'New customers start with lights, phone charging, radio and sometimes a TV or fan.', src: 'ESMAP 2022 (5 to 35 kWh per customer); MTF tiers 2 to 3' },
  { key: 'econ', label: 'Local spending power', unit: 'x', lo: 0.75, mode: 1, hi: 1.3,
    plain: 'Richer, busier villages use more. Without night light or survey data this stays wide.', src: 'own estimate; narrows with VIIRS night light or MTF survey' },
  { key: 'comConn', label: 'Businesses that connect', unit: '%', lo: 0.6, mode: 0.8, hi: 0.95,
    plain: 'Shops and bars connect early because power earns them money.', src: 'own estimate' },
  { key: 'kwhCom', label: 'Use per shop or small business', unit: 'kWh/month', lo: 10, mode: 28, hi: 90,
    plain: 'A kiosk with lights and phone charging uses little; a bar with a fridge and music uses much more.', src: 'ESMAP 2022; AMDA benchmarking' },
  { key: 'pueShare', label: 'Businesses with a machine (mill, welder, freezer)', unit: '%', lo: 0.02, mode: 0.07, hi: 0.15,
    plain: 'A few heavy daytime users decide the load factor and the cost of power.', src: 'ESMAP 2022 productive use; own estimate' },
  { key: 'kwhPue', label: 'Use per machine business', unit: 'kWh/month', lo: 100, mode: 280, hi: 700,
    plain: 'A grain mill or welder running a few hours a day.', src: 'ESMAP 2022 productive use' },
  { key: 'kwhHealth', label: 'Use per health facility', unit: 'kWh/month', lo: 80, mode: 250, hi: 700,
    plain: 'A health post with lights, a vaccine fridge and a sterilizer; a health centre uses more.', src: 'WHO and World Bank, Energizing Health 2023' },
  { key: 'kwhSchool', label: 'Use per school', unit: 'kWh/month', lo: 30, mode: 110, hi: 350,
    plain: 'Lights, fans and a few computers in daytime.', src: 'own estimate from school audits' },
  { key: 'kwhOther', label: 'Use per other building', unit: 'kWh/month', lo: 0, mode: 1, hi: 4,
    plain: 'Stores, kitchens and places of worship; most never connect.', src: 'own estimate' },
];
export type P = Record<string, number>;
// The middle value of each range (its median), used as the most likely case
export const modeParams = (): P => Object.fromEntries(PARAMS.map(p => [p.key, triQ(p.lo, p.mode, p.hi, 0.5)]));

// Triangular quantile
export function triQ(lo: number, m: number, hi: number, u: number) {
  if (hi <= lo) return m;
  const f = (m - lo) / (hi - lo);
  return u < f ? lo + Math.sqrt(u * (hi - lo) * (m - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - m));
}
// Seeded random numbers, so the same site always gives the same range
export const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

// ---------- Daily load shapes (share of daily energy per hour) ----------
const norm = (a: number[]) => { const s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); };
export const SHAPES: Record<'res' | 'com' | 'pue' | 'health' | 'school' | 'other', number[]> = {
  //        0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22   23
  res: norm([1.0, 0.8, 0.7, 0.7, 0.7, 0.9, 1.4, 1.3, 0.8, 0.6, 0.6, 0.6, 0.7, 0.7, 0.6, 0.6, 0.7, 1.2, 3.2, 4.4, 4.6, 3.8, 2.6, 1.6]),
  com: norm([0.4, 0.3, 0.3, 0.3, 0.3, 0.4, 0.8, 1.4, 1.9, 2.1, 2.2, 2.3, 2.3, 2.2, 2.2, 2.2, 2.2, 2.3, 2.8, 3.0, 2.7, 2.0, 1.2, 0.6]),
  pue: norm([0, 0, 0, 0, 0, 0, 0.3, 1.5, 3.5, 4.5, 4.8, 4.8, 3.5, 4.0, 4.6, 4.4, 3.5, 1.8, 0.4, 0, 0, 0, 0, 0]),
  health: norm([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.6, 2.2, 2.4, 2.4, 2.4, 2.3, 2.3, 2.3, 2.2, 2.0, 1.6, 1.5, 1.5, 1.4, 1.2, 1.1, 1.0]),
  school: norm([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 2.0, 3.6, 3.8, 3.8, 3.8, 3.4, 3.4, 3.2, 2.2, 0.6, 0.3, 0.3, 0.3, 0.2, 0.1, 0.1, 0.1]),
  other: norm([0.3, 0.3, 0.3, 0.3, 0.3, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1.5, 0.8, 0.4]),
};
export type Seg = keyof typeof SHAPES;
export const SEG_LABEL: Record<Seg, string> = { res: 'Homes', com: 'Shops and services', pue: 'Machines (mills, welders)', health: 'Health', school: 'Schools', other: 'Other' };

// ---------- One scenario ----------
export interface Counts { res: number; com: number; health: number; school: number; other: number }
export interface Scenario { monthly: number; segs: Record<Seg, number>; customers: number; peakKw: number; hourly: number[] }
const PEAK_FACTOR = 1.25; // within-hour peaks above the hourly average

export function scenario(c: Counts, p: P): Scenario {
  const hh = c.res * p.hhPerRes * p.conn;
  const com = c.com * p.comConn;
  const pue = Math.max(c.com > 3 ? 1 : 0, c.com * p.pueShare);
  const segs: Record<Seg, number> = {
    res: hh * p.kwhHH * p.econ,
    com: Math.max(0, com - pue) * p.kwhCom * p.econ,
    pue: pue * p.kwhPue,
    health: c.health * p.kwhHealth,
    school: c.school * p.kwhSchool,
    other: c.other * p.kwhOther,
  };
  const hourly = new Array(24).fill(0);
  (Object.keys(segs) as Seg[]).forEach(s => { const d = segs[s] / 30; SHAPES[s].forEach((f, h) => { hourly[h] += d * f; }); });
  const monthly = Object.values(segs).reduce((a, x) => a + x, 0);
  return { monthly, segs, customers: hh + com + c.health + c.school, peakKw: Math.max(...hourly) * PEAK_FACTOR, hourly };
}

export const pct = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };

// ---------- Monte Carlo range ----------
export interface Range { p10: number; p50: number; p90: number }
const rangeOf = (xs: number[]): Range => ({ p10: pct(xs, 0.1), p50: pct(xs, 0.5), p90: pct(xs, 0.9) });

export interface Draw { p: P; c: Counts; g: Growth }
export interface Growth { gHH: number; connMax: number; k: number; gCom: number; gPue: number }
export const GROWTH_PARAMS = {
  gHH: { lo: 0.03, mode: 0.09, hi: 0.18, label: 'Yearly growth in household use', plain: 'People buy a TV, fan, then a fridge as they trust the supply and earn from it.' },
  connMax: { lo: 0.72, mode: 0.86, hi: 0.95, label: 'Households connected after 5 years', plain: 'Late joiners sign up once neighbours have power.' },
  k: { lo: 0.25, mode: 0.5, hi: 0.8, label: 'Speed of new connections', plain: 'How fast the gap to full sign-up closes each year.' },
  gCom: { lo: 0.02, mode: 0.07, hi: 0.15, label: 'Yearly growth in business use', plain: 'Shops add fridges and longer hours.' },
  gPue: { lo: 0.0, mode: 0.12, hi: 0.35, label: 'Yearly growth in machines', plain: 'Appliance finance and productive use programmes add mills, welders and freezers.' },
};

export function draws(sum: ClassSummary, n = 1500, seed = 7): Draw[] {
  const r = rng(seed);
  const out: Draw[] = [];
  for (let i = 0; i < n; i++) {
    const p: P = {};
    for (const q of PARAMS) p[q.key] = triQ(q.lo, q.mode, q.hi, r());
    const c = {} as Counts;
    for (const k of CLASSES) c[k] = Math.max(0, sum.expected[k] + gauss(r) * Math.sqrt(sum.variance[k]));
    const g = {} as Growth;
    for (const [k, v] of Object.entries(GROWTH_PARAMS)) (g as any)[k] = triQ(v.lo, v.mode, v.hi, r());
    out.push({ p, c, g });
  }
  return out;
}

export interface Estimate {
  monthly: Range; peakKw: Range; customers: Range; perCustomer: Range; loadFactor: Range;
  mid: Scenario; hourlyP10: number[]; hourlyP90: number[]; samples: Scenario[];
}
export function estimate(sum: ClassSummary, ds: Draw[]): Estimate {
  const sc = ds.map(d => scenario(d.c, d.p));
  const lf = sc.map(s => s.monthly / 30 / 24 / s.peakKw);
  const mid = scenario(sum.expected, modeParams());
  const hourlyP10 = Array.from({ length: 24 }, (_, h) => pct(sc.map(s => s.hourly[h]), 0.1));
  const hourlyP90 = Array.from({ length: 24 }, (_, h) => pct(sc.map(s => s.hourly[h]), 0.9));
  return {
    monthly: rangeOf(sc.map(s => s.monthly)), peakKw: rangeOf(sc.map(s => s.peakKw)), customers: rangeOf(sc.map(s => s.customers)),
    perCustomer: rangeOf(sc.map(s => s.monthly / Math.max(1, s.customers))), loadFactor: rangeOf(lf),
    mid, hourlyP10, hourlyP90, samples: sc,
  };
}

// ---------- Drivers (one at a time swings) ----------
export interface Driver { key: string; label: string; low: number; high: number; swing: number; plain: string }
export function drivers(sum: ClassSummary): Driver[] {
  const base = modeParams();
  const out: Driver[] = [];
  for (const q of PARAMS) {
    const lo = scenario(sum.expected, { ...base, [q.key]: triQ(q.lo, q.mode, q.hi, 0.1) }).monthly;
    const hi = scenario(sum.expected, { ...base, [q.key]: triQ(q.lo, q.mode, q.hi, 0.9) }).monthly;
    out.push({ key: q.key, label: q.label, low: lo, high: hi, swing: Math.abs(hi - lo), plain: q.plain });
  }
  // Building class uncertainty
  const shift = (z: number) => {
    const c = { ...sum.expected } as Counts;
    // Move probability mass between homes and businesses, the split that matters most
    const sd = Math.sqrt(sum.variance.com);
    c.com = Math.max(0, c.com + z * sd); c.res = Math.max(0, c.res - z * sd);
    return scenario(c, base).monthly;
  };
  const lo = shift(-1.28), hi = shift(1.28);
  out.push({ key: 'classes', label: 'Which buildings are shops, not homes', low: lo, high: hi, swing: Math.abs(hi - lo),
    plain: 'Most buildings have no map tag, so we estimate shops from shape and road frontage. Tagging the village centre on OpenStreetMap narrows this.' });
  return out.sort((a, b) => b.swing - a.swing);
}

// ---------- Growth, years 1 to 5 ----------
export function yearScenario(d: Draw, year: number): Scenario {
  const t = year - 1;
  const conn = d.g.connMax - (d.g.connMax - Math.min(d.p.conn, d.g.connMax)) * Math.exp(-d.g.k * t);
  const p: P = { ...d.p, conn, kwhHH: d.p.kwhHH * Math.pow(1 + d.g.gHH, t), kwhCom: d.p.kwhCom * Math.pow(1 + d.g.gCom, t),
    pueShare: d.p.pueShare * Math.pow(1 + d.g.gPue, t), kwhHealth: d.p.kwhHealth * Math.pow(1.04, t), kwhSchool: d.p.kwhSchool * Math.pow(1.04, t) };
  return scenario(d.c, p);
}
export interface YearRange extends Range { year: number; peak: Range }
export function growth(ds: Draw[], years = 5): YearRange[] {
  return Array.from({ length: years }, (_, i) => {
    const sc = ds.map(d => yearScenario(d, i + 1));
    return { year: i + 1, ...rangeOf(sc.map(s => s.monthly)), peak: rangeOf(sc.map(s => s.peakKw)) };
  });
}

// ---------- Sizing and money (rough guides) ----------
export const COSTS = {
  pvPerKwp: 900,      // USD per kWp installed, incl. mounting and charge control
  battPerKwh: 400,    // USD per kWh nominal, lithium, incl. battery inverter share
  invPerKw: 250,      // USD per kW of inverter
  perConnection: 350, // USD per customer, distribution and meter
  softShare: 0.18,    // development, logistics, design
  omShare: 0.03,      // yearly O&M as share of capex
  life: 15, rate: 0.10,
  pr: 0.72,           // performance ratio
  dod: 0.8, battEff: 0.9,
};
export const crf = (r: number, n: number) => (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

export interface Sizing { pvKwp: number; battKwh: number; invKw: number; capex: number; annual: number; capacityKwhMonth: number; customers: number }
export function size(dailyKwh: number, hourly: number[], peakKw: number, customers: number, psh: number): Sizing {
  const pvKwp = dailyKwh / (psh * COSTS.pr) * 1.1;
  const night = hourly.reduce((a, x, h) => a + (h >= 18 || h < 7 ? x : 0), 0) / Math.max(1e-6, hourly.reduce((a, x) => a + x, 0));
  const battKwh = (dailyKwh * night) / (COSTS.dod * COSTS.battEff) * 1.15;
  const invKw = peakKw * 1.2;
  const hw = pvKwp * COSTS.pvPerKwp + battKwh * COSTS.battPerKwh + invKw * COSTS.invPerKw + customers * COSTS.perConnection;
  const capex = hw * (1 + COSTS.softShare);
  const annual = capex * crf(COSTS.rate, COSTS.life) + capex * COSTS.omShare;
  return { pvKwp, battKwh, invKw, capex, annual, capacityKwhMonth: dailyKwh * 30 * 1.1, customers };
}

export interface Risk { brownout: number; oversized: number; tariff: Range; tariffAt: (m: number) => number }
// Share of futures (year 3) where the system is too small or much too big,
// and the tariff needed to repay it at each point of the range.
export function sizingRisk(sz: Sizing, ds: Draw[], year = 3): Risk {
  const m = ds.map(d => yearScenario(d, year).monthly);
  const tariffAt = (mm: number) => sz.annual / (12 * Math.min(mm, sz.capacityKwhMonth));
  return {
    brownout: m.filter(x => x > sz.capacityKwhMonth).length / m.length,
    oversized: m.filter(x => x < 0.6 * sz.capacityKwhMonth).length / m.length,
    tariff: { p10: tariffAt(pct(m, 0.9)), p50: tariffAt(pct(m, 0.5)), p90: tariffAt(pct(m, 0.1)) },
    tariffAt,
  };
}

export const PSH: Record<string, number> = { NG: 4.6, KE: 5.4, UG: 5.0, TZ: 5.3, SL: 4.8, GH: 4.8, ET: 5.6, MW: 5.4 };
