import React from 'react';
import { Box, BoxHeader, More, StatusDot } from './ui';
import type { Engine } from './engine';
import type { SiteData } from './model';
import { derive, type Settings } from './settings';
import { MV_PER_KM } from './wires';
import { Cite } from './refs';
import { n0, n1, usd } from './format';

interface Settlement { n: number; x: number; y: number; d_km: number; lat: number; lon: number }
interface Cluster { radius_km: number; home: Settlement | null; settlements: Settlement[] }
const files = import.meta.glob('../data/cluster/*.json', { eager: true, import: 'default' }) as Record<string, Cluster>;
const CLUSTER: Record<string, Cluster> = Object.fromEntries(Object.entries(files).map(([p, d]) => [p.split('/').pop()!.replace('.json', ''), d]));

// ESMAP / World Bank mini-grid cost analysis: per-customer cost about $68 lower for every 100 more customers;
// a portfolio of 5 or more grids about $100 per kW cheaper. Floor at half the village's own cost (assumption).
export const PER_100 = 68, PORTFOLIO_KW = 100, FLOOR = 0.5;

const tree = (pts: { x: number; y: number }[]) => { // Prim, metres -> km
  if (pts.length < 2) return 0;
  const best = pts.map((p, i) => (i ? Math.hypot(p.x - pts[0].x, p.y - pts[0].y) : 0)), used = pts.map((_, i) => i === 0);
  let km = 0;
  for (let k = 1; k < pts.length; k++) {
    let u = -1; for (let i = 0; i < pts.length; i++) if (!used[i] && (u < 0 || best[i] < best[u])) u = i;
    used[u] = true; km += best[u] / 1000;
    for (let i = 0; i < pts.length; i++) if (!used[i]) best[i] = Math.min(best[i], Math.hypot(pts[i].x - pts[u].x, pts[i].y - pts[u].y));
  }
  return km;
};

export const sharedPlant = (site: SiteData, eng: Engine, s: Settings, km: number) => {
  const c = CLUSTER[eng.site]; const d = derive(eng, s);
  if (!c || !d.full || !d.CU) return null;
  const roofs = site.buildings.length;
  const custV = d.CU[4].p50, perCust = d.full.capex_usd / custV, kwpPerCust = d.full.pv_kwp / custV;
  const near = c.settlements.filter(x => x.d_km <= km);
  const villages = [{ name: site.name, n: roofs, x: 0, y: 0, cust: custV }, ...near.map((x, i) => ({ name: `Settlement ${i + 1}`, n: x.n, x: x.x, y: x.y, cust: custV * x.n / roofs }))];
  const costAt = (cust: number) => Math.max(FLOOR * perCust, perCust - PER_100 * (cust - custV) / 100) * cust;
  const separateEach = villages.map(v => costAt(v.cust));
  const portfolio = villages.length >= 5 ? PORTFOLIO_KW * kwpPerCust * villages.reduce((a, v) => a + v.cust, 0) : 0;
  const separate = separateEach.reduce((a, v) => a + v, 0) - portfolio;
  const totCust = villages.reduce((a, v) => a + v.cust, 0);
  const lineKm = tree(villages);
  const shared = { plant: costAt(totCust), line: { lo: lineKm * MV_PER_KM.lo, mid: lineKm * MV_PER_KM.mid, hi: lineKm * MV_PER_KM.hi } };
  const sharedMid = shared.plant + shared.line.mid;
  return { c, villages, totCust, separate, portfolio, shared, sharedMid, lineKm, saving: separate - sharedMid, perCust };
};

export const SharedPlant: React.FC<{ site: SiteData; eng: Engine; s: Settings }> = ({ site, eng, s }) => {
  const [km, setKm] = React.useState(3);
  const d = derive(eng, s);
  const r = sharedPlant(site, eng, s, km);
  const c = CLUSTER[eng.site];
  return (
    <Box>
      <BoxHeader title="Share one plant with nearby villages?" meta={`Settlements of 50+ roofs within ${c?.radius_km ?? 10} km, Google Open Buildings`} />
      <div className="px-5 pb-5 space-y-4">
        {d.reuse && <p className="text-sm max-w-prose"><StatusDot hang tone="ok">Building on the existing {n0(d.reuse.kwp)} kWp plant saves about {usd(d.reuse.saved)} of new panels</StatusDot> <span className="text-muted">(set in the settings bar; assumes it works and its owner agrees).</span></p>}
        {!c ? <p className="text-sm text-muted">No settlement data for this location yet: run pipeline/cluster.py.</p> : !r ? null : (<>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Join villages within</span>
            <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Distance">
              {[2, 3, 5, 10].map(k => (
                <button key={k} role="radio" aria-checked={km === k} onClick={() => setKm(k)}
                  className={`h-8 px-3 text-xs tabular-nums ${km === k ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{k} km <span className="text-muted">({c.settlements.filter(x => x.d_km <= k).length})</span></button>
              ))}
            </div>
          </div>
          {r.villages.length < 2 ? <p className="text-sm text-muted">No other settlement of 50+ roofs within {km} km; try a wider distance.</p> : (<>
            <dl className="grid gap-px bg-line border border-line rounded-ctl overflow-hidden grid-cols-2 lg:grid-cols-4">
              {[
                { k: 'Villages joined', v: `${r.villages.length}`, sub: `${n0(r.totCust)} customers by year 5` },
                { k: 'Separate mini-grids', v: usd(r.separate), sub: r.portfolio ? `incl. ${usd(r.portfolio)} portfolio saving` : 'one per village' },
                { k: 'One shared plant', v: usd(r.sharedMid), sub: `plant ${usd(r.shared.plant)} + ${n1(r.lineKm)} km of line ${usd(r.shared.line.mid)}` },
                { k: r.saving >= 0 ? 'Sharing saves' : 'Sharing costs more', v: usd(Math.abs(r.saving)), sub: `line at $${n0(MV_PER_KM.lo / 1000)}k to $${n0(MV_PER_KM.hi / 1000)}k a km: ${usd(r.separate - r.shared.plant - r.shared.line.hi)} to ${usd(r.separate - r.shared.plant - r.shared.line.lo)}`, cls: r.saving >= 0 ? 'text-ok' : 'text-bad' },
              ].map(x => (
                <div key={x.k} className="bg-surface-2 px-3 py-2 min-w-0"><dt className="text-[11px] text-muted">{x.k}</dt><dd className={`font-display text-lg tabular-nums ${x.cls ?? ''}`}>{x.v}</dd><dd className="text-[11px] text-muted">{x.sub}</dd></div>
              ))}
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums min-w-[520px]">
                <thead><tr className="text-xs text-muted border-b border-line"><th className="py-2 pr-3 font-normal text-left">Settlement</th><th className="py-2 pr-3 font-normal text-right">Roofs</th><th className="py-2 pr-3 font-normal text-right">Distance</th><th className="py-2 pr-3 font-normal text-right">Customers, yr 5</th><th className="py-2 font-normal text-right">Own mini-grid</th></tr></thead>
                <tbody>{r.villages.slice(0, 12).map((v, i) => (
                  <tr key={i} className="border-b border-line"><td className="py-1.5 pr-3">{v.name}</td><td className="py-1.5 pr-3 text-right">{n0(v.n)}</td><td className="py-1.5 pr-3 text-right">{i ? `${n1(Math.hypot(v.x, v.y) / 1000)} km` : '-'}</td><td className="py-1.5 pr-3 text-right">{n0(v.cust)}</td><td className="py-1.5 text-right">{usd(Math.max(FLOOR * r.perCust, r.perCust - PER_100 * (v.cust - r.villages[0].cust) / 100) * v.cust)}</td></tr>
                ))}</tbody>
              </table>
              {r.villages.length > 12 && <p className="text-[11px] text-muted mt-1">and {r.villages.length - 12} more</p>}
            </div>
          </>)}
          <More label="How this is worked out">
            <p className="text-xs text-muted max-w-prose">Each settlement's demand and customers scale with its roof count from this village's forecast. Build cost per customer falls about ${PER_100} for every 100 more customers a grid serves, and a portfolio of five or more separate grids saves about ${PORTFOLIO_KW} a kW (ESMAP / World Bank mini-grid cost analysis), never below half this village's own cost per customer (assumption). The shared plant adds a medium-voltage line along the shortest route joining the settlements, at ${n0(MV_PER_KM.mid)} a km (range ${n0(MV_PER_KM.lo)} to ${n0(MV_PER_KM.hi)}). Not counted: shared batteries (villages peak at slightly different times, which would help sharing), transformers at each village, line losses, and who runs and is paid by each village. Rough guide.</p>
          </More>
        </>)}
        <Cite k={['esmapcost', 'esmapgrid', 'onsset2026', 'wbgrid', 'openbuildings', 'assumption']} />
      </div>
    </Box>
  );
};
