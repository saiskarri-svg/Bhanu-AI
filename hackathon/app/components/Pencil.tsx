import React from 'react';
import { Box, BoxHeader, More, StatusDot } from './ui';
import type { Engine } from './engine';
import { derive, type Settings } from './settings';
import { cashFlow, minGrant, LOANS, DSCR_MIN } from './CashFlow';
import { lifetime } from './lifetime';
import { Cite } from './refs';
import { n0, usd } from './format';

// Ways to make the numbers work, added one at a time, and the grant each still needs
const LADDER: { t: string; d: string; p: Partial<Settings> }[] = [
  { t: 'As set now', d: 'Your current size, cost basis and loan', p: {} },
  { t: '+ Build in stages', d: 'First stage for year-2 demand; the rest added in year 3', p: { stage: true } },
  { t: '+ 2024 equipment prices', d: 'IRENA 2024 panel and battery prices, 1.5x for a remote small site', p: { stage: true, cost: 'irena' } },
  { t: '+ Concessional loan', d: '6% over 12 years with a 12-month grace period (development-bank style)', p: { stage: true, cost: 'irena', loan: 'concessional' } },
];
const TARIFFS = [0.45, 0.65, 0.85];

export const Pencil: React.FC<{ eng: Engine; s: Settings; set: (p: Partial<Settings>) => void }> = ({ eng, s, set }) => {
  const d = derive(eng, s);
  const cust = d.CU?.[4].p50 ?? 0;
  const now = cashFlow(eng, s, s.grant * cust);
  const [target, setTarget] = React.useState(10);
  const grid = LADDER.map(l => TARIFFS.map(t => {
    const ss = { ...s, ...l.p, tar: t };
    const g = minGrant(eng, ss, total => { const L = lifetime(eng, ss, total); return !!L && L.ownerPayback !== null && L.ownerPayback <= target; });
    const pb = g === null ? null : lifetime(eng, ss, g * cust)?.ownerPayback ?? null;
    return { ss, g, pb };
  }));
  // Cheapest working option at the current tariff, and the best overall
  const atTar = grid.map(row => row.find(c => c.ss.tar === s.tar) ?? row[row.length - 1]);
  const pick = grid.flat().filter(c => c.g !== null).sort((a, b) => a.g! - b.g!)[0];
  const ref = 433;
  return (
    <Box>
      <BoxHeader title="Make it pencil out" meta={`Works = year-2 bills cover running costs and ${DSCR_MIN}x the loan payment, and the owner's money is back within ${target} years`} />
      <div className="px-5 pb-5 space-y-4">
        <p className="text-sm max-w-prose">
          {now?.ok
            ? <StatusDot hang tone="ok">It works as set: year-2 bills cover running costs and {now.dscr ? `${now.dscr.toFixed(2)}x` : 'there is no'} loan payment.</StatusDot>
            : <StatusDot hang tone="bad">Not yet: as set, year-2 bills {now?.dscr !== undefined ? `cover the loan payment only ${now.dscr.toFixed(2)}x` : 'do not cover running costs'}.</StatusDot>}
          {' '}<span className="text-muted">Each row adds one lever; each cell is the smallest grant per connection that makes it work at that tariff. Tap a cell to use it.</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Owner's money back within</span>
          <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Payback target">
            {[5, 7, 10, 15].map(t => (
              <button key={t} role="radio" aria-checked={target === t} onClick={() => setTarget(t)}
                className={`h-8 px-3 text-xs tabular-nums ${target === t ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{t} years</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm tabular-nums min-w-[560px]">
            <thead><tr className="text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-normal text-left">Levers</th>
              {TARIFFS.map(t => <th key={t} className={`py-2 pr-3 font-normal text-right ${t === s.tar ? 'text-fg' : ''}`}>Grant needed at ${t.toFixed(2)}</th>)}
            </tr></thead>
            <tbody>
              {LADDER.map((l, i) => (
                <tr key={l.t} className="border-b border-line align-top">
                  <td className="py-2 pr-3"><span className="text-fg">{l.t}</span><span className="block text-xs text-muted">{l.d}</span></td>
                  {grid[i].map(c => {
                    const on = c === pick;
                    return (
                      <td key={c.ss.tar} className="py-1.5 pr-1 text-right">
                        {c.g === null ? <span className="text-muted text-xs">not within {target} yrs</span> : (
                          <button onClick={() => set({ ...l.p, stage: !!l.p.stage, cost: l.p.cost ?? s.cost, loan: l.p.loan ?? s.loan, tar: c.ss.tar, grant: c.g! })}
                            className={`h-8 px-2 rounded-ctl tabular-nums hover:bg-surface-2 ${on ? 'ring-1 ring-ok text-ok font-medium' : c.g === 0 ? 'text-ok' : c.g <= ref ? 'text-fg' : 'text-warn'}`}>
                            {c.g === 0 ? 'no grant' : `$${n0(c.g)}`}<span className="block text-[10px] text-muted font-normal">{c.g ? usd(c.g * cust) : 'works alone'}{c.pb !== null ? ` · back in ${c.pb.toFixed(1)} yrs` : ''}</span>
                          </button>)}
                      </td>);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pick && <p className="text-sm text-muted max-w-prose">Lowest grant: <span className="text-fg">{LADDER[grid.findIndex(r => r.includes(pick))].t.replace('+ ', '')}</span> at ${pick.ss.tar.toFixed(2)} a kWh needs <span className="text-ok tabular-nums">{pick.g ? `$${n0(pick.g)} a connection (${usd(pick.g * cust)})` : 'no grant'}</span>. Green is below the $433 a connection the Universal Energy Facility has paid; amber is above it.</p>}
        <More label="Other levers not modelled yet">
          <ul className="text-xs text-muted space-y-1 max-w-prose list-disc pl-4">
            <li>Productive-use customers (mills, cold rooms, welding) that buy daytime power and raise use without more battery.</li>
            <li>An anchor customer such as a telecom tower, clinic or school with a fixed monthly payment.</li>
            <li>Carbon credits or results payments per kWh delivered.</li>
            <li>Collecting more bills (90% assumed) with prepaid meters.</li>
            <li>Import duty and VAT exemptions on solar equipment where the country offers them.</li>
          </ul>
        </More>
        <p className="text-[11px] text-muted">At this tariff the {LADDER.length} steps need {atTar.map(c => c.g === null ? 'n/a' : c.g === 0 ? '$0' : `$${n0(c.g)}`).join(', ')} a connection. Loan terms are rough guides: commercial {Math.round(LOANS.commercial.rate * 100)}% over {LOANS.commercial.years} years; concessional {Math.round(LOANS.concessional.rate * 100)}% over {LOANS.concessional.years} years with {LOANS.concessional.grace} months' grace (assumptions). Payback counts the year-3 expansion, battery and inverter renewal around year 11, and slow growth after year 5 (see Payback over 20 years).</p>
        <Cite k={['irena2024', 'amda2024', 'omorate', 'assumption']} />
      </div>
    </Box>
  );
};
