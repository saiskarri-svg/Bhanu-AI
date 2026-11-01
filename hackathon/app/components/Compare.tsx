import React from 'react';
import { Box, BoxHeader, StatusDot, More } from './ui';
import { SITES, FLAG } from './sites';
import { ENGINE } from './engine';
import { WEATHER } from './WeatherPage';
import { derive, type Settings } from './settings';
import { cashFlow } from './CashFlow';
import { lifetime } from './lifetime';
import { lvNetwork, gridVsMini } from './wires';
import { n0, n1, usd, pc } from './format';

type Col = { k: string; t: string; get: (r: Row) => number | undefined; fmt: (v: number) => React.ReactNode; best: 'hi' | 'lo' };
interface Row { id: string; name: string; cc: string; roofs: number; hh: number; dem: number; kwp: number; kwh: number; capex: number; perCust: number; sun?: number; covers?: number; bill?: number; cash24?: number; payback?: number; lvKm: number; gridKm: number; gridKnown: boolean; verdict: string }

// All sample villages side by side with the same settings, for picking sites and building a portfolio
export const Compare: React.FC<{ s: Settings; siteId: string; onPick: (id: string) => void; rate?: number }> = ({ s, siteId, onPick, rate = 433 }) => {
  const rows: Row[] = SITES.flatMap(x => {
    const eng = ENGINE[x.id]; if (!eng) return [];
    const d = derive(eng, s); if (!d.des || !d.E || !d.CU) return [];
    const cust = d.CU[4].p50;
    const cf = cashFlow(eng, s, cust * rate);
    return [{
      id: x.id, name: x.data.name, cc: x.data.country, roofs: x.data.buildings.length, hh: (d.meta ? eng.by_population!.households : eng.summary.households)[0].p50,
      dem: d.E[s.yr - 1].p50, kwp: d.des.pv_kwp, kwh: d.des.battery_kwh, capex: d.des.capex_usd, perCust: d.des.capex_usd / Math.max(1, cust),
      sun: WEATHER[x.id]?.annual.yield_kwh_kwp_day, covers: d.meta ? undefined : d.tsel?.p_revenue_covers_cost_year5, bill: d.meta ? undefined : d.tsel?.year5_household_bill_usd_month_p50, cash24: cf?.total, payback: lifetime(eng, s, cust * rate)?.ownerPayback ?? 99,
      lvKm: lvNetwork(x.data).km, ...(() => { const g = gridVsMini(x.data, eng, s); return { gridKm: g.km, gridKnown: g.known, verdict: g.verdict }; })(),
    }];
  });
  const [sort, setSort] = React.useState('perCust');
  const cols: Col[] = [
    { k: 'roofs', t: 'Roofs', get: r => r.roofs, fmt: n0, best: 'hi' },
    { k: 'dem', t: `kWh a day, yr ${s.yr}`, get: r => r.dem, fmt: n0, best: 'hi' },
    { k: 'kwp', t: 'System', get: r => r.kwp, fmt: v => `${n0(v)} kWp`, best: 'lo' },
    { k: 'capex', t: 'Build cost', get: r => r.capex, fmt: usd, best: 'lo' },
    { k: 'perCust', t: 'Per customer', get: r => r.perCust, fmt: v => `$${n0(v)}`, best: 'lo' },
    { k: 'sun', t: 'Sun, kWh/kWp', get: r => r.sun, fmt: n1, best: 'hi' },
    { k: 'covers', t: `Covers cost at $${s.tar.toFixed(2)}`, get: r => r.covers, fmt: v => <StatusDot tone={v >= 0.8 ? 'ok' : v >= 0.5 ? 'warn' : 'bad'}>{pc(v)}</StatusDot>, best: 'hi' },
    { k: 'bill', t: 'Bill a month', get: r => r.bill, fmt: v => `$${n1(v)}`, best: 'lo' },
    { k: 'lvKm', t: 'Village line', get: r => r.lvKm, fmt: v => `${n1(v)} km`, best: 'lo' },
    { k: 'gridKm', t: 'To the grid', get: r => r.gridKm, fmt: v => `${n1(v)} km`, best: 'hi' },
    { k: 'payback', t: 'Owner payback', get: r => r.payback, fmt: v => <span className={v <= 7 ? 'text-ok' : v <= 12 ? 'text-warn' : 'text-bad'}>{v >= 99 ? '20+' : n1(v)} yrs</span>, best: 'lo' },
    { k: 'cash24', t: 'Cash at 24 months', get: r => r.cash24, fmt: v => <span className={v >= 0 ? 'text-ok' : 'text-bad'}>{v < 0 ? '-' : ''}{usd(Math.abs(v))}</span>, best: 'hi' },
  ];
  const c = cols.find(x => x.k === sort)!;
  const sorted = [...rows].sort((a, b) => ((c.get(a) ?? -1e12) - (c.get(b) ?? -1e12)) * (c.best === 'hi' ? -1 : 1));
  const tot = rows.reduce((a, r) => ({ capex: a.capex + r.capex, hh: a.hh + r.hh, kwp: a.kwp + r.kwp }), { capex: 0, hh: 0, kwp: 0 });
  return (
    <Box>
      <BoxHeader title="Compare villages" meta={`Same settings for all: year ${s.yr}, ${['P25', 'P50', 'P75', 'P90'][s.di]} size, $${s.tar.toFixed(2)} a kWh, $${rate} grant a connection`} />
      <div className="px-5 pb-5 space-y-3">
        <p className="text-sm text-muted max-w-prose">All {rows.length} villages as one portfolio: <span className="text-fg tabular-nums">{n0(tot.hh)}</span> households, <span className="text-fg tabular-nums">{n0(tot.kwp)} kWp</span>, about <span className="text-fg tabular-nums">{usd(tot.capex)}</span> to build (rough). Tap a column to sort; tap a village to open it.</p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm tabular-nums min-w-[1180px]">
            <thead><tr className="text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-normal text-left">Village</th>
              {cols.map(x => (
                <th key={x.k} className="py-2 pr-3 font-normal text-right" aria-sort={sort === x.k ? (x.best === 'hi' ? 'descending' : 'ascending') : undefined}>
                  <button onClick={() => setSort(x.k)} className={`hover:text-fg ${sort === x.k ? 'text-fg font-medium' : ''}`}>{x.t}{sort === x.k ? ' ↓' : ''}</button>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} onClick={() => onPick(r.id)} className={`border-b border-line cursor-pointer ${r.id === siteId ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                  <td className="py-2 pr-3 whitespace-nowrap"><span className="text-muted mr-2">{i + 1}</span>{r.name} <span className="text-xs text-muted">{FLAG[r.cc] ?? r.cc}</span></td>
                  {cols.map(x => { const v = x.get(r); return <td key={x.k} className={`py-2 pr-3 text-right whitespace-nowrap ${sort === x.k ? 'text-fg' : ''}`}>{v === undefined ? <span className="text-muted">-</span> : x.k === 'gridKm' ? <>{r.gridKnown ? '' : 'over '}{x.fmt(v)} <span className={`text-[11px] ${r.verdict.includes('grid') ? 'text-info' : 'text-ok'}`}>{r.verdict.includes('grid') ? 'grid' : 'mini-grid'}</span></> : x.fmt(v)}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <More label="How to read this">
          <p className="text-xs text-muted max-w-prose">Each village uses its own forecast, weather and the settings above. Cost per customer and cash at 24 months (after the grant, running costs and a 70% loan) are the quickest guides to which site to fund first. Blended-finance platforms prefer several villages bundled; this is that bundle. Costs are 2021 prices: rough guides.</p>
        </More>
      </div>
    </Box>
  );
};
