import React from 'react';
import { Area, CartesianGrid, Line, ComposedChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend } from './ui';
import type { Driver, Estimate, SiteData, Seg } from './model';
import { SHAPES, SEG_LABEL } from './model';
import { n0, n1, pc, round2 } from './format';

const SEG_COLOR: Record<Seg, string> = { res: 'var(--res)', com: 'var(--com)', pue: 'var(--pue)', health: 'var(--health)', school: 'var(--school)', other: 'var(--other)' };

// A range bar: P10 to P90 band with the P50 mark, on a shared scale
export const RangeBar: React.FC<{ lo: number; mid: number; hi: number; max: number; color?: string; marks?: { at: number; label: string }[] }> = ({ lo, mid, hi, max, color = 'var(--sun)', marks = [] }) => (
  <div className="relative h-8 mt-2" aria-hidden="true">
    <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-surface-2" />
    <div className="absolute top-2.5 h-3 rounded-full" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%`, background: `color-mix(in srgb, ${color} 35%, transparent)` }} />
    <div className="absolute top-1 h-6 w-1 rounded-full" style={{ left: `calc(${(mid / max) * 100}% - 2px)`, background: color }} />
    {marks.map(m => (
      <div key={m.label} className="absolute top-0 h-8 border-l border-dashed border-muted/60" style={{ left: `${(m.at / max) * 100}%` }}>
        <span className="absolute top-7 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap">{m.label}</span>
      </div>
    ))}
  </div>
);

const Figure: React.FC<{ label: string; p10: number; p50: number; p90: number; unit: string; fmt?: (x: number) => string; color?: string; note?: React.ReactNode; marks?: { at: number; label: string }[]; max?: number }> =
  ({ label, p10, p50, p90, unit, fmt = n0, color, note, marks, max }) => (
    <div className="bg-surface px-5 py-4 min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="font-display font-semibold text-[30px] leading-none tabular-nums">{fmt(p50)}</span>
        <span className="text-xs text-muted">{unit}, most likely</span>
      </p>
      <p className="mt-1 text-xs text-muted tabular-nums">Range {fmt(p10)} to {fmt(p90)} (P10 to P90)</p>
      <RangeBar lo={p10} mid={p50} hi={p90} max={max ?? p90 * 1.15} color={color} marks={marks} />
      {note && <p className={`${marks?.length ? 'mt-5' : 'mt-2'} text-xs text-muted leading-relaxed`}>{note}</p>}
    </div>
  );

export const DemandPage: React.FC<{ site: SiteData; est: Estimate; drv: Driver[] }> = ({ site, est, drv }) => {
  const segs = (Object.keys(SHAPES) as Seg[]).filter(s => est.mid.segs[s] > 0.5);
  const prof = Array.from({ length: 24 }, (_, h) => {
    const row: Record<string, number | string> = { h: `${String(h).padStart(2, '0')}:00`, p10: est.hourlyP10[h], p90: est.hourlyP90[h] };
    segs.forEach(s => { row[s] = (est.mid.segs[s] / 30) * SHAPES[s][h]; });
    return row;
  });
  const tot = (r: Record<string, number | string>) => segs.reduce((x, s) => x + Number(r[s]), 0);
  const peakH = prof.reduce((a, r, h) => (tot(r) > tot(prof[a]) ? h : a), 0);
  const share = segs.map(s => ({ s, v: est.mid.segs[s] / est.mid.monthly })).sort((a, b) => b.v - a.v);
  const top = drv.slice(0, 7);
  const x0 = Math.min(...top.map(d => Math.min(d.high, d.low))) * 0.97;
  const x1 = Math.max(...top.map(d => Math.max(d.high, d.low))) * 1.02;
  const X = (v: number) => `${((v - x0) / (x1 - x0)) * 100}%`;
  const base = est.mid.monthly;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        <Figure label="Energy demand, year 1" p10={est.monthly.p10} p50={est.monthly.p50} p90={est.monthly.p90} unit="kWh a month" fmt={x => n0(round2(x))}
          note={`About ${n0(round2(est.monthly.p50 / 30))} kWh a day.`} />
        <Figure label="Peak load" p10={est.peakKw.p10} p50={est.peakKw.p50} p90={est.peakKw.p90} unit="kW" fmt={n1} color="var(--bad)" note="Usually just after dark, when every home switches on lights and TV." />
        <Figure label="Use per customer" p10={est.perCustomer.p10} p50={est.perCustomer.p50} p90={est.perCustomer.p90} unit="kWh a month" fmt={n1} color="var(--res)" max={40}
          marks={[{ at: 5, label: '5' }, { at: 35, label: '35' }]} note="Dashed lines: the 5 to 35 kWh range seen across surveyed African mini-grids (ESMAP 2022)." />
        <Figure label="Load factor" p10={est.loadFactor.p10 * 100} p50={est.loadFactor.p50 * 100} p90={est.loadFactor.p90 * 100} unit="%" color="var(--ok)" max={60}
          marks={[{ at: 22, label: '22%' }, { at: 40, label: '40%' }]} note="Homes only run near 22%; daytime business use toward 40% cut the cost of power by about 25% (ESMAP 2022)." />
      </div>
      <p className="text-xs text-muted -mt-3">
        {n0(est.customers.p50)} likely customers (range {n0(est.customers.p10)} to {n0(est.customers.p90)}). P10 means 1 in 10 futures come in lower; P90 means 1 in 10 come in higher. From 1,500 simulated futures that vary building classes and every assumption at once. Rough guide.
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Box>
          <BoxHeader title="A typical day, year 1" meta="kW, most likely mix, with the P10 to P90 band" />
          <div className="px-3 pb-2 h-[300px]">
            <ResponsiveChart summary={`Most likely load peaks around ${peakH}:00 at about ${n1(est.mid.peakKw)} kW.`}>
              <ComposedChart data={prof} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="h" {...axisProps} interval={3} />
                <YAxis {...axisProps} width={44} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipCard title={String(label)} rows={[
                    ...segs.map(s => ({ label: SEG_LABEL[s], value: `${n1(Number(payload.find(p => p.dataKey === s)?.value ?? 0))} kW`, color: SEG_COLOR[s] })),
                    { label: 'Range', value: `${n1(Number(prof.find(r => r.h === label)?.p10))} to ${n1(Number(prof.find(r => r.h === label)?.p90))} kW` },
                  ]} />) : null} />
                {segs.map(s => <Area key={s} type="monotone" dataKey={s} stackId="1" stroke="none" fill={SEG_COLOR[s]} fillOpacity={0.75} isAnimationActive />)}
                <Line type="monotone" dataKey="p90" stroke={CHART.axis} strokeDasharray="4 4" dot={false} strokeWidth={1.2} />
                <Line type="monotone" dataKey="p10" stroke={CHART.axis} strokeDasharray="4 4" dot={false} strokeWidth={1.2} />
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <div className="px-5 pb-4"><Legend items={[...segs.map(s => ({ label: SEG_LABEL[s], color: SEG_COLOR[s] })), { label: 'P10 and P90 total', color: 'var(--muted)' }]} /></div>
        </Box>
        <Box>
          <BoxHeader title="Who uses the power" meta="Share of monthly kWh, most likely" />
          <div className="px-5 pb-5 space-y-3">
            {share.map(({ s, v }) => (
              <div key={s}>
                <div className="flex justify-between text-sm"><span>{SEG_LABEL[s]}</span><span className="tabular-nums">{pc(v)} <span className="text-xs text-muted">{n0(est.mid.segs[s])} kWh</span></span></div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: SEG_COLOR[s] }} /></div>
              </div>
            ))}
            <p className="text-xs text-muted leading-relaxed pt-1">Machines and shops run in daylight, when solar is cheapest. Growing them is the lever that brings the tariff down.</p>
          </div>
        </Box>
      </div>

      <Box>
        <BoxHeader title="Why this number" meta="What moves the estimate most, for a lender to review" />
        <div className="px-5 pb-5">
          <p className="text-sm text-muted max-w-prose mb-4">
            Each bar shows how far the monthly demand moves when one input goes from its low to its high end and everything else stays at its most likely value. Most likely: {n0(round2(base))} kWh a month. The longest bars are where a site visit or meter data pays off most.
          </p>
          <ol className="space-y-4">
            {top.map((d, i) => {
              const lo = Math.min(d.low, d.high), hi = Math.max(d.low, d.high);
              return (
                <li key={d.key} className="grid gap-x-6 gap-y-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="min-w-0">
                    <p className="text-sm text-fg"><span className="text-muted tabular-nums mr-2">{i + 1}</span>{d.label}</p>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">{d.plain}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="relative h-6 mt-1" aria-hidden="true">
                      <div className="absolute inset-y-0 border-l border-muted/50" style={{ left: X(base) }} />
                      <div className="absolute top-1.5 h-3 rounded-sm" style={{ left: X(lo), width: `${Math.max(0.5, ((hi - lo) / (x1 - x0)) * 100)}%`, background: 'color-mix(in srgb, var(--sun) 55%, transparent)' }} />
                    </div>
                    <p className="text-xs text-muted tabular-nums">{n0(round2(lo))} to {n0(round2(hi))} kWh a month (±{Math.round((d.swing / 2 / base) * 100)}%)</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted mt-4 leading-relaxed">
            Ranges for each input and their sources are listed on the Method tab. With metered data from nearby mini-grids, the household use and connection inputs would be learned from data instead of set by hand.
          </p>
        </div>
      </Box>
      <p className="text-xs text-muted">{site.name}: estimate from public data only. Rough guide, not a substitute for a site survey.</p>
    </>
  );
};
