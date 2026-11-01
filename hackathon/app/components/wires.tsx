import React from 'react';
import { Box, BoxHeader, More, StatusDot } from './ui';
import type { Engine } from './engine';
import type { SiteData } from './model';
import { derive, type Settings } from './settings';
import { Cite } from './refs';
import { n0, n1, usd } from './format';

// Published cost per km, rough guides (low, central, high)
export const LV_PER_KM = { lo: 4250, mid: 14980, hi: 15475 };  // OnSSET West Africa 2026 · ESMAP tables · RMI 2018
export const MV_PER_KM = { lo: 7000, mid: 25000, hi: 50000 };  // OnSSET West Africa 2026 · ESMAP · World Bank 2019 upper
export const GEN_SHARE = 0.6;     // engine: generation is 60% of build cost, the rest is wires, meters and soft costs
const MAX_SPAN_M = 500;           // a house further than this from the network is left off it

// Low-voltage network length: shortest tree joining every roof (Prim), without spans over 500 m
const cache = new Map<string, { km: number; reached: number; total: number }>();
export const lvNetwork = (site: SiteData) => {
  const key = site.name + site.lat;
  const hit = cache.get(key); if (hit) return hit;
  const pts = site.buildings as unknown as number[][];
  const n = pts.length;
  const kx = 111320 * Math.cos((site.lat * Math.PI) / 180), ky = 110540;
  const x = pts.map(p => p[1] * kx), y = pts.map(p => p[0] * ky);
  const best = new Float64Array(n).fill(Infinity), used = new Uint8Array(n);
  best[0] = 0; let total = 0, reached = 1;
  for (let it = 0; it < n; it++) {
    let u = -1, bu = Infinity;
    for (let i = 0; i < n; i++) if (!used[i] && best[i] < bu) { bu = best[i]; u = i; }
    if (u < 0) break;
    used[u] = 1;
    if (it > 0) { if (bu <= MAX_SPAN_M) { total += bu; reached++; } }
    for (let i = 0; i < n; i++) if (!used[i]) { const d = Math.hypot(x[i] - x[u], y[i] - y[u]); if (d < best[i]) best[i] = d; }
  }
  const r = { km: total / 1000, reached, total: n };
  cache.set(key, r);
  return r;
};

// Grid extension against the mini-grid's own generation (both need the village wires)
export const gridVsMini = (site: SiteData, eng: Engine, s: Settings) => {
  const d = derive(eng, s);
  const des = eng.designs[d.dsel];
  const gen = des.capex_usd * GEN_SHARE * (d.des ? d.des.pv_kwp / des.pv_kwp : 1);
  const km = site.grid.dist_km ?? site.grid.searched_km;
  const known = site.grid.dist_km != null;
  const grid = { lo: km * MV_PER_KM.lo, mid: km * MV_PER_KM.mid, hi: km * MV_PER_KM.hi };
  const breakEven = gen / MV_PER_KM.mid;
  const verdict = grid.hi < gen ? 'grid' : grid.lo > gen ? 'mini' : grid.mid < gen ? 'lean-grid' : 'lean-mini';
  return { gen, km, known, grid, breakEven, verdict };
};

export const VERDICT: Record<string, string> = { grid: 'Grid extension is cheaper', 'lean-grid': 'Grid extension likely cheaper', 'lean-mini': 'Mini-grid likely cheaper', mini: 'Mini-grid is cheaper' };

export const WiresBox: React.FC<{ site: SiteData; eng: Engine; s: Settings }> = ({ site, eng, s }) => {
  const lv = lvNetwork(site);
  const d = derive(eng, s);
  const lvCost = { lo: lv.km * LV_PER_KM.lo, mid: lv.km * LV_PER_KM.mid, hi: lv.km * LV_PER_KM.hi };
  const allowance = (d.des?.capex_usd ?? 0) * (1 - GEN_SHARE);
  const cust = d.CU?.[4].p50 ?? 1;
  const g = gridVsMini(site, eng, s);
  const tone = g.verdict === 'grid' || g.verdict === 'lean-grid' ? 'info' : 'ok';
  return (
    <Box>
      <BoxHeader title="Wires and the grid" meta="Rough guide, from the roofs on the map and published costs per km" />
      <div className="px-5 pb-5 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 min-w-0">
          <p className="text-xs text-muted">Village network (low voltage)</p>
          <dl className="grid grid-cols-3 gap-px bg-line border border-line rounded-ctl overflow-hidden">
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Line to reach the roofs</dt><dd className="font-display text-lg tabular-nums">{n1(lv.km)} km</dd><dd className="text-[11px] text-muted">{n0(lv.reached)} of {n0(lv.total)} roofs</dd></div>
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Cost of that line</dt><dd className="font-display text-lg tabular-nums">{usd(lvCost.mid)}</dd><dd className="text-[11px] text-muted">{usd(lvCost.lo)} to {usd(lvCost.hi)}</dd></div>
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Per customer, year 5</dt><dd className="font-display text-lg tabular-nums">${n0(lvCost.mid / Math.max(1, cust))}</dd><dd className="text-[11px] text-muted">central cost per km</dd></div>
          </dl>
          <p className="text-sm text-muted">The build cost already allows <span className="text-fg tabular-nums">{usd(allowance)}</span> (40%) for wires, meters, transport and project costs; the line alone takes about <span className="text-fg tabular-nums">{Math.round((lvCost.mid / Math.max(1, allowance)) * 100)}%</span> of that.</p>
        </section>
        <section className="space-y-3 min-w-0">
          <p className="text-xs text-muted">Bring the grid instead? (medium-voltage line)</p>
          <dl className="grid grid-cols-3 gap-px bg-line border border-line rounded-ctl overflow-hidden">
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Nearest mapped line</dt><dd className="font-display text-lg tabular-nums">{g.known ? `${n1(g.km)} km` : `${n0(g.km)}+ km`}</dd><dd className="text-[11px] text-muted">{g.known ? site.grid.nearest?.replace('_', ' ') : 'none mapped nearby'}</dd></div>
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Line to the grid</dt><dd className="font-display text-lg tabular-nums">{g.known ? '' : 'over '}{usd(g.grid.mid)}</dd><dd className="text-[11px] text-muted">{usd(g.grid.lo)} to {usd(g.grid.hi)}</dd></div>
            <div className="bg-surface-2 px-3 py-2"><dt className="text-[11px] text-muted">Solar and battery instead</dt><dd className="font-display text-lg tabular-nums">{usd(g.gen)}</dd><dd className="text-[11px] text-muted">{['P25', 'P50', 'P75', 'P90'][d.dsel]}, 2021 prices</dd></div>
          </dl>
          <p className="text-sm"><StatusDot hang tone={tone}>{VERDICT[g.verdict]}</StatusDot> <span className="text-muted">Break-even: about <span className="text-fg tabular-nums">{n1(g.breakEven)} km</span> of line at the central cost.</span></p>
        </section>
        <div className="lg:col-span-2 space-y-2">
          <More label="What this leaves out">
            <p className="text-xs text-muted max-w-prose">The network is the shortest set of lines joining every roof, leaving off houses more than 500 m from the rest; real lines follow roads and need poles, so expect more. The grid side counts the line only: not the transformer, the utility's power supply or how reliable it is, and the nearest mapped line may be high voltage, which costs more to tap. Both options need the village network, so it is left out of the comparison. Mini-grid side: solar, battery and inverter at the engine's 2021 prices. All rough guides.</p>
          </More>
          <Cite k={['esmapgrid', 'onsset2026', 'wbgrid', 'rmi2018', 'overture']} />
        </div>
      </div>
    </Box>
  );
};
