import React from 'react';
import { Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, More, StatusDot } from './ui';
import type { Engine } from './engine';
import { ENGINE } from './engine';
import { SITES, FLAG } from './sites';
import { derive, type Settings } from './settings';
import { plan, SHORT_MAX, UNDER, type YearRisk } from './rightsize';
import { Cite } from './refs';
import { n0, n1 } from './format';
import { lifetime } from './lifetime';
import { risks } from './rightsize';

const pc = (v: number) => `${Math.round(v * 100)}%`;
const worst = (r: YearRisk[]) => Math.max(...r.map(x => x.short));
const idleAvg = (r: YearRisk[]) => r.reduce((a, x) => a + x.idle, 0) / r.length;
const toneS = (v: number) => (v > 0.3 ? 'bad' : v > SHORT_MAX + 0.001 ? 'warn' : 'ok') as 'ok' | 'warn' | 'bad';
const toneI = (v: number) => (v > 0.5 ? 'bad' : v > 0.25 ? 'warn' : 'ok') as 'ok' | 'warn' | 'bad';

// Plan for any village with the chosen households; single build = engine's P50 design
const planFor = (eng: Engine, s: Settings) => {
  const d = derive(eng, { ...s, stage: false, di: 1 });
  if (!d.E || !d.full) return null;
  return { d, P: plan(d.E, d.full.capacity_kwh_day, d.full, s.stages ?? 3) };
};

export const RightSize: React.FC<{ eng: Engine; s: Settings; set: (p: Partial<Settings>) => void; siteId: string; onPick: (id: string) => void }> = ({ eng, s, set, siteId, onPick }) => {
  const x = planFor(eng, s);
  if (!x) return null;
  const { d, P } = x;
  const data = d.E!.map((q, i) => ({ y: i + 1, band: [q.p10, q.p90], p50: q.p50, staged: P.capOf(i + 1), one: P.single }));
  const cust = d.CU?.[4].p50 ?? 0;
  const opts = [
    { t: `Staged plan (${s.stages ?? 3} stages)`, ss: { ...s, stage: true }, short: worst(P.staged), idle: idleAvg(P.staged) },
    { t: 'One P50 build', ss: { ...s, stage: false, di: 1 }, short: worst(P.one), idle: idleAvg(P.one) },
    ...[0, 3].map(i => { const c = eng.designs[i].capacity_kwh_day; const rr = risks(d.E!, () => c); return { t: `One ${eng.designs[i].design.split(' ')[0]} build`, ss: { ...s, stage: false, di: i }, short: worst(rr), idle: idleAvg(rr) }; }),
  ].map(o => ({ ...o, pb: lifetime(eng, o.ss, o.ss.grant * cust)?.ownerPayback ?? null, capex: derive(eng, o.ss).full?.capex_usd ?? 0 }));
  const all = SITES.flatMap(v => { const e = ENGINE[v.id]; const r = e && planFor(e, s); return r ? [{ id: v.id, name: v.data.name, cc: v.data.country, P: r.P }] : []; });
  return (
    <Box>
      <BoxHeader title="Right size: not too big, not too small" meta={`Each stage keeps brownout odds under ${pc(SHORT_MAX)} with as little idle kit as possible`} />
      <div className="px-5 pb-5 space-y-4">
        <div className="grid gap-px bg-line border border-line rounded-ctl overflow-hidden grid-cols-2 lg:grid-cols-4">
          {[
            { k: 'Stage 1, build now', v: `${n0(P.c1 * P.kwpPerCap)} kWp`, sub: `${n0(P.c1 * P.kwhPerCap)} kWh battery · ${n0(P.c1)} kWh a day` },
            { k: `Then add (${P.caps.length - 1} more stage${P.caps.length > 2 ? 's' : ''})`, v: P.caps.slice(1).map((c, i) => `+${n0((c - P.caps[i]) * P.kwpPerCap)}`).join(', ') + ' kWp', sub: `in year ${P.groups.slice(1).map(g => g[0]).join(', ')}, to ${n0(P.c2 * P.kwpPerCap)} kWp in all` },
            { k: 'One P50 build instead', v: `${n0(P.single * P.kwpPerCap)} kWp`, sub: `worst-year brownouts ${pc(worst(P.one))}, idle ${pc(idleAvg(P.one))} on average` },
            { k: 'Staged plan', v: <StatusDot tone={toneS(worst(P.staged))}>{pc(worst(P.staged))} brownouts</StatusDot>, sub: `worst year; idle ${pc(idleAvg(P.staged))} on average` },
          ].map(c => (
            <div key={c.k} className="bg-surface-2 px-3 py-2 min-w-0"><p className="text-[11px] text-muted">{c.k}</p><div className="font-display text-lg tabular-nums">{c.v}</div><p className="text-[11px] text-muted">{c.sub}</p></div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="h-[230px]">
              <ResponsiveChart summary={`Demand grows from ${n0(d.E![0].p50)} to ${n0(d.E![4].p50)} kWh a day. Staged capacity ${n0(P.c1)} then ${n0(P.c2)}; one P50 build ${n0(P.single)}.`}>
                <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="y" {...axisProps} tickFormatter={v => `Yr ${v}`} />
                  <YAxis {...axisProps} width={44} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? (
                    <TooltipCard title={`Year ${payload[0].payload.y}, kWh a day`} rows={[
                      { label: 'Demand, most likely', value: n0(payload[0].payload.p50), color: 'var(--sun)' },
                      { label: 'Demand, P10 to P90', value: `${n0(payload[0].payload.band[0])} to ${n0(payload[0].payload.band[1])}` },
                      { label: 'Staged plan makes', value: n0(payload[0].payload.staged), color: 'var(--ok)' },
                      { label: 'One P50 build makes', value: n0(payload[0].payload.one), color: 'var(--muted)' },
                    ]} />) : null} />
                  <Area dataKey="band" stroke="none" fill="var(--sun)" fillOpacity={0.15} isAnimationActive={false} />
                  <Line dataKey="p50" stroke="var(--sun)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="staged" type="stepAfter" stroke="var(--ok)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="one" stroke="var(--muted)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveChart>
            </div>
            <Legend items={[{ label: 'Demand, most likely', color: 'var(--sun)' }, { label: 'P10 to P90', color: 'color-mix(in srgb, var(--sun) 25%, transparent)' }, { label: 'Staged plan', color: 'var(--ok)' }, { label: 'One P50 build', color: 'var(--muted)' }]} />
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-xs text-muted border-b border-line"><th className="py-2 pr-2 font-normal text-left">Year</th><th className="py-2 pr-2 font-normal text-right">Staged: short</th><th className="py-2 pr-2 font-normal text-right">idle</th><th className="py-2 pr-2 font-normal text-right">One build: short</th><th className="py-2 font-normal text-right">idle</th></tr></thead>
              <tbody>{P.staged.map((r, i) => (
                <tr key={r.y} className="border-b border-line">
                  <td className="py-1.5 pr-2">{r.y}</td>
                  <td className="py-1.5 pr-2 text-right"><StatusDot tone={toneS(r.short)}>{pc(r.short)}</StatusDot></td>
                  <td className="py-1.5 pr-2 text-right"><StatusDot tone={toneI(r.idle)}>{pc(r.idle)}</StatusDot></td>
                  <td className="py-1.5 pr-2 text-right"><StatusDot tone={toneS(P.one[i].short)}>{pc(P.one[i].short)}</StatusDot></td>
                  <td className="py-1.5 text-right"><StatusDot tone={toneI(P.one[i].idle)}>{pc(P.one[i].idle)}</StatusDot></td>
                </tr>))}</tbody>
            </table>
            <p className="text-[11px] text-muted mt-2">Short: chance demand is above what the system makes on a dull-season day. Idle: chance it uses under {pc(UNDER)} of it.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Number of stages">
            {[2, 3, 5].map(n => (
              <button key={n} role="radio" aria-checked={(s.stages ?? 3) === n} onClick={() => set({ stages: n })}
                className={`h-9 px-3 text-xs ${(s.stages ?? 3) === n ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{n === 5 ? 'Every year' : `${n} stages`}</button>
            ))}
          </div>
          <button onClick={() => set({ stage: true })} disabled={s.stage} className="h-9 px-4 rounded-ctl bg-accent text-[#131316] text-sm font-medium hover:brightness-105 disabled:opacity-50 disabled:cursor-default">{s.stage ? 'Using the staged plan' : 'Use the staged plan'}</button>
          <p className="text-sm text-muted max-w-prose">Expand when the meters say so, not on the calendar: add the next stage once monthly sales stay above 80% of what is installed (<span className="text-fg tabular-nums">{n0(0.8 * P.c1 * 30)} kWh</span> for stage 1) for two months running, or evening brownouts start.</p>
        </div>
        <div className="overflow-x-auto">
          <p className="text-xs text-muted mb-1">Service against money, this village (your grant, cost basis, loan and tariff)</p>
          <table className="w-full text-sm tabular-nums min-w-[560px]">
            <thead><tr className="text-xs text-muted border-b border-line"><th className="py-2 pr-3 font-normal text-left">Option</th><th className="py-2 pr-3 font-normal text-right">Worst-year brownouts</th><th className="py-2 pr-3 font-normal text-right">Idle, average</th><th className="py-2 pr-3 font-normal text-right">Full build cost</th><th className="py-2 font-normal text-right">Owner payback</th></tr></thead>
            <tbody>{opts.map(o => (
              <tr key={o.t} className={`border-b border-line ${o.t.startsWith('Staged') ? 'text-fg' : ''}`}>
                <td className="py-1.5 pr-3">{o.t}</td>
                <td className="py-1.5 pr-3 text-right"><StatusDot tone={toneS(o.short)}>{pc(o.short)}</StatusDot></td>
                <td className="py-1.5 pr-3 text-right"><StatusDot tone={toneI(o.idle)}>{pc(o.idle)}</StatusDot></td>
                <td className="py-1.5 pr-3 text-right">${n0(o.capex / 1000)}k</td>
                <td className="py-1.5 text-right">{o.pb === null ? '20+ yrs' : `${n1(o.pb)} yrs`}</td>
              </tr>))}</tbody>
          </table>
          <p className="text-[11px] text-muted mt-1">A small build pays back fastest because it runs short later: customers lose power and future sales. The staged plan holds brownouts at {pc(SHORT_MAX)} or less for a little more money.</p>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <p className="text-xs text-muted mb-1">All villages, same settings</p>
          <table className="w-full text-sm tabular-nums min-w-[720px]">
            <thead><tr className="text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-normal text-left">Village</th><th className="py-2 pr-3 font-normal text-right">Stage 1</th><th className="py-2 pr-3 font-normal text-right">Final total</th>
              <th className="py-2 pr-3 font-normal text-right">Staged: worst short</th><th className="py-2 pr-3 font-normal text-right">idle</th><th className="py-2 pr-3 font-normal text-right">One P50: worst short</th><th className="py-2 font-normal text-right">idle</th>
            </tr></thead>
            <tbody>{all.map(v => (
              <tr key={v.id} onClick={() => onPick(v.id)} className={`border-b border-line cursor-pointer ${v.id === siteId ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                <td className="py-1.5 pr-3 whitespace-nowrap">{v.name} <span className="text-xs text-muted">{FLAG[v.cc] ?? v.cc}</span></td>
                <td className="py-1.5 pr-3 text-right">{n0(v.P.c1 * v.P.kwpPerCap)} kWp</td>
                <td className="py-1.5 pr-3 text-right">{n0(v.P.c2 * v.P.kwpPerCap)} kWp</td>
                <td className="py-1.5 pr-3 text-right"><StatusDot tone={toneS(worst(v.P.staged))}>{pc(worst(v.P.staged))}</StatusDot></td>
                <td className="py-1.5 pr-3 text-right"><StatusDot tone={toneI(idleAvg(v.P.staged))}>{pc(idleAvg(v.P.staged))}</StatusDot></td>
                <td className="py-1.5 pr-3 text-right"><StatusDot tone={toneS(worst(v.P.one))}>{pc(worst(v.P.one))}</StatusDot></td>
                <td className="py-1.5 text-right"><StatusDot tone={toneI(idleAvg(v.P.one))}>{pc(idleAvg(v.P.one))}</StatusDot></td>
              </tr>))}</tbody>
          </table>
        </div>
        <More label="How this works">
          <p className="text-xs text-muted max-w-prose">Each year's demand is spread as a smooth curve fitted to the engine's P10, P50 and P90 (4,000 futures). More stages mean less idle kit but more site visits and contracts (each one costs time and money not counted here); three stages is a practical middle. For each stage the tool tries every size and keeps the smallest that holds brownout odds under {pc(SHORT_MAX)} in every year it serves while keeping idle odds low; panels and battery scale with what the stage must make on a dull-season day. A single build cannot do both while demand grows several-fold, which is why one P50 build shows high idle odds early and brownouts later. Odds here use this simpler method; the Growth tab's table comes straight from the engine's runs.</p>
        </More>
        <Cite k={['engine', 'esmap', 'assumption']} />
      </div>
    </Box>
  );
};
