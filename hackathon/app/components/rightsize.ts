import type { Q } from './engine';

// Right-sizing: pick each stage's capacity so the chance of running short (brownouts)
// and the chance of sitting mostly idle (under 60% used) are balanced over the years it serves.
// Demand each year is treated as lognormal, fitted to the engine's P10, P50 and P90.
const Z90 = 1.2816;
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x: number) { // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const sigma = (q: Q) => Math.max(0.05, Math.log(q.p90 / Math.max(1e-6, q.p10)) / (2 * Z90));
export const pAbove = (q: Q, x: number) => 1 - phi(Math.log(x / q.p50) / sigma(q));   // P(demand > x)
export const pBelow = (q: Q, x: number) => phi(Math.log(x / q.p50) / sigma(q));       // P(demand < x)

// Expected sales when demand is spread around its range and the system can make at most `cap`:
// E[min(D, cap)] for lognormal D (so running short loses sales and spare capacity earns nothing)
export const expSold = (q: Q, cap: number) => {
  const sg = sigma(q), mu = Math.log(q.p50), lc = Math.log(Math.max(1e-9, cap));
  return Math.exp(mu + sg * sg / 2) * phi((lc - mu - sg * sg) / sg) + cap * (1 - phi((lc - mu) / sg));
};
export const scaleQ = (q: Q, k: number): Q => ({ ...q, p10: q.p10 * k, p50: q.p50 * k, p90: q.p90 * k });
export const lerpQ = (a: Q, b: Q, t: number): Q => ({ ...a, p10: a.p10 + (b.p10 - a.p10) * t, p50: a.p50 + (b.p50 - a.p50) * t, p90: a.p90 + (b.p90 - a.p90) * t });

export const UNDER = 0.6;     // "mostly idle": using under 60% of what the system makes (as on the Growth tab)
export const SHORT_MAX = 0.15; // target ceiling for brownout odds in any year (rough guide)

export interface YearRisk { y: number; cap: number; short: number; idle: number }
export const risks = (E: Q[], cap: (y: number) => number) =>
  E.map((q, i) => { const c = cap(i + 1); return { y: i + 1, cap: c, short: pAbove(q, c), idle: pBelow(q, UNDER * c) }; });

// Smallest capacity that keeps brownout odds under the ceiling in every year it serves,
// then nudged to where shortage and idleness are most balanced without breaking the ceiling.
export const bestCap = (E: Q[], years: number[]) => {
  const qs = years.map(y => E[y - 1]);
  const lo = Math.min(...qs.map(q => q.p10)) * 0.8, hi = Math.max(...qs.map(q => q.p90)) * 1.5;
  let best = hi, bestScore = Infinity;
  for (let i = 0; i <= 400; i++) {
    const c = lo + (hi - lo) * i / 400;
    const short = Math.max(...qs.map(q => pAbove(q, c)));
    if (short > SHORT_MAX) continue;
    const idle = qs.reduce((a, q) => a + pBelow(q, UNDER * c), 0) / qs.length;
    const score = idle + short; // both count: idle money and unhappy customers
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return best;
};

export const GROUPS: Record<number, number[][]> = { 2: [[1, 2], [3, 4, 5]], 3: [[1], [2, 3], [4, 5]], 5: [[1], [2], [3], [4], [5]] };

export interface Plan { caps: number[]; groups: number[][]; capOf: (y: number) => number; c1: number; c2: number; single: number; staged: YearRisk[]; one: YearRisk[]; kwpPerCap: number; kwhPerCap: number }

// Staged plan (each group of years gets its own size, never smaller than the last) against one P50 build
export const plan = (E: Q[], singleCap: number, ref: { pv_kwp: number; battery_kwh: number; capacity_kwh_day: number }, n = 3): Plan => {
  const groups = GROUPS[n] ?? GROUPS[3];
  const caps: number[] = [];
  groups.forEach((g, i) => caps.push(Math.max(i ? caps[i - 1] : 0, bestCap(E, g))));
  const capOf = (y: number) => caps[Math.max(0, groups.findIndex(g => g.includes(Math.min(5, y))))];
  return {
    caps, groups, capOf, c1: caps[0], c2: caps[caps.length - 1], single: singleCap,
    staged: risks(E, capOf),
    one: risks(E, () => singleCap),
    kwpPerCap: ref.pv_kwp / ref.capacity_kwh_day, kwhPerCap: ref.battery_kwh / ref.capacity_kwh_day,
  };
};
