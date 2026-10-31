import React from 'react';
import { Box, BoxHeader } from './ui';
import type { Engine } from './engine';
import type { SiteData } from './model';
import { Cite } from './refs';
import { n0, n1, usd } from './format';

// The two household counts side by side, each carried through the same engine
export const TwoCounts: React.FC<{ eng: Engine; site: SiteData }> = ({ eng, site }) => {
  const b = eng.by_population;
  if (!b) return null;
  const S = eng.summary;
  const p50 = eng.designs.find(d => d.design.startsWith('P50'))!;
  const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant' && p.output);
  const plantKw = plant?.output ? parseFloat(plant.output) * (plant.output.toLowerCase().includes('mw') ? 1000 : 1) : null;
  const hhR = S.households[0].p50, hhM = b.households[0].p50;
  const ratio = hhR / Math.max(1, hhM);
  const r = (q: { p10: number; p50: number; p90: number }, f = n0) => <><span className="text-fg">{f(q.p50)}</span> <span className="text-muted text-xs">({f(q.p10)} to {f(q.p90)})</span></>;
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['Starting point', <>{n0(eng.landuse.residential_buildings)} homes and outbuildings</>, <>{n0(b.population)} people</>],
    ['Households, year 1', r(S.households[0]), r(b.households[0])],
    ['Customers, year 5', r(S.customers[4]), r(b.customers[4])],
    ['Energy, year 1 (kWh a day)', r(S.energy_kwh_per_day[0]), r(b.energy_kwh_per_day[0])],
    ['Energy, year 5 (kWh a day)', r(S.energy_kwh_per_day[4]), r(b.energy_kwh_per_day[4])],
    ['Evening peak, year 5 (kW)', r(S.peak_kw[4], n1), r(b.peak_kw[4], n1)],
    ['P50 system for year 5', <>{n0(p50.pv_kwp)} kWp, {n0(p50.battery_kwh)} kWh, {usd(p50.capex_usd)}</>, <>{n0(b.p50_design.pv_kwp)} kWp, {n0(b.p50_design.battery_kwh)} kWh, {usd(b.p50_design.capex_usd)}</>],
  ];
  return (
    <Box>
      <BoxHeader title="Two ways to count households" meta="Same engine, same assumptions; only the household count differs" />
      <div className="px-5 pb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums min-w-[560px]">
            <thead><tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-normal w-[30%]"></th>
              <th className="py-2 pr-3 font-normal">From roofs <span className="text-muted">(used across GridSight)</span></th>
              <th className="py-2 font-normal">From Meta's population map</th>
            </tr></thead>
            <tbody>
              {rows.map(([k, a, c]) => (
                <tr key={k} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-3 text-muted">{k}</td><td className="py-2 pr-3">{a}</td><td className="py-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
          <p className="text-muted"><span className="text-fg font-medium">Why they differ.</span> Roofs count every building, divided by 1 to 2.5 buildings per home; recent pictures catch new houses. Meta's map spreads census counts over detected buildings, and censuses can be years old, so fast-growing villages come out low. Here the roof count gives {ratio >= 1 ? `${n1(ratio)} times as many` : `${n1(1 / ratio)} times fewer`} households.</p>
          <p className="text-muted"><span className="text-fg font-medium">How to settle it.</span> One day counting households on the ground decides between them; it is also the input that moves the forecast most. {plantKw ? `At ${site.name} the built ${n0(plantKw)} kWp plant sits ${plantKw > Math.min(p50.pv_kwp, b.p50_design.pv_kwp) && plantKw < Math.max(p50.pv_kwp, b.p50_design.pv_kwp) ? 'between' : 'outside'} the two year-5 sizes.` : 'Until then, a staged build that starts near the lower answer limits the risk either way.'}</p>
        </div>
        <Cite className="mt-3" k={['openbuildings', 'overture', 'metahrsl', 'engine']} />
      </div>
    </Box>
  );
};
