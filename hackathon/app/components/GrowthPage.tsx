import React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, StatStrip, StatusDot } from './ui';
import type { Draw, SiteData } from './model';
import { growth, pct, PSH, size, sizingRisk, yearScenario, COSTS } from './model';
import { n0, n1, pc, round2, usd } from './format';

const STORY = [
  { y: 'Year 1', t: 'Lights, phone charging, radio. Some TVs. Shops add a fridge or a sound system.' },
  { y: 'Year 2', t: 'More TVs and fans as trust in the supply grows. Late joiners connect once neighbours have power.' },
  { y: 'Year 3', t: 'Fridges in bars and shops, barber clippers, phone repair. A grain mill or welder if finance is offered.' },
  { y: 'Years 4 to 5', t: 'Freezers for fish or drinks, irrigation pumps, a second mill. This is where daytime use, and the load factor, can rise most.' },
];

export const GrowthPage: React.FC<{ site: SiteData; ds: Draw[] }> = ({ site, ds }) => {
  const g = React.useMemo(() => growth(ds), [ds]);
  const [design, setDesign] = React.useState<0.5 | 0.7 | 0.9>(0.5);
  const [year, setYear] = React.useState(3);
  const psh = PSH[site.country] ?? 5;

  const y = React.useMemo(() => ds.map(d => yearScenario(d, year)), [ds, year]);
  const sz = React.useMemo(() => {
    const m = pct(y.map(s => s.monthly), design);
    // the scenario nearest the design point gives the shape of the day and customer count
    const ref = y.reduce((a, s) => (Math.abs(s.monthly - m) < Math.abs(a.monthly - m) ? s : a), y[0]);
    const peak = pct(y.map(s => s.peakKw), design);
    return size(m / 30, ref.hourly, peak, ref.customers, psh);
  }, [y, design, psh]);
  const risk = React.useMemo(() => sizingRisk(sz, ds, year), [sz, ds, year]);
  const hhUse = pct(y.map(s => s.segs.res / Math.max(1, s.hh)), 0.5);
  const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant' && p.output);
  const plantKw = plant?.output ? parseFloat(plant.output) * (plant.output.toLowerCase().includes('mw') ? 1000 : 1) : null;

  const data = g.map(r => ({ year: `Year ${r.year}`, base: r.p10, band: r.p90 - r.p10, p50: r.p50, p10: r.p10, p90: r.p90 }));
  // Tariff needed against actual demand, for the system chosen above
  const curve = Array.from({ length: 21 }, (_, i) => {
    const m = sz.capacityKwhMonth * (0.3 + i * 0.05);
    return { m: Math.round(m), t: risk.tariffAt(m) };
  });
  const p10y = pct(y.map(s => s.monthly), 0.1), p50y = pct(y.map(s => s.monthly), 0.5), p90y = pct(y.map(s => s.monthly), 0.9);
  const tone = (x: number) => (x > 0.3 ? 'bad' : x > 0.15 ? 'warn' : 'ok') as 'bad' | 'warn' | 'ok';
  const bill = risk.tariff.p50 * hhUse;

  return (
    <>
      <Box>
        <BoxHeader title="Demand growth after connection" meta="kWh a month, P10 to P90 band and most likely line" />
        <div className="px-3 pb-2 h-[300px]">
          <ResponsiveChart summary={`Most likely demand grows from ${n0(round2(g[0].p50))} kWh a month in year 1 to ${n0(round2(g[4].p50))} in year 5, with the range widening to ${n0(round2(g[4].p10))} to ${n0(round2(g[4].p90))}.`}>
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} width={56} tickFormatter={v => n0(v)} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipCard title={String(label)} rows={[
                  { label: 'P90', value: `${n0(round2(Number(payload[0].payload.p90)))} kWh` },
                  { label: 'Most likely', value: `${n0(round2(Number(payload[0].payload.p50)))} kWh`, color: 'var(--sun)' },
                  { label: 'P10', value: `${n0(round2(Number(payload[0].payload.p10)))} kWh` },
                ]} />) : null} />
              <Area dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area dataKey="band" stackId="b" stroke="none" fill="var(--sun)" fillOpacity={0.2} />
              <Line dataKey="p50" stroke="var(--sun)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--sun)' }} />
              {plantKw && <ReferenceLine y={plantKw * psh * COSTS.pr * 30} stroke={CHART.axis} strokeDasharray="4 4" label={{ value: `What the existing ${plantKw} kWp plant can make`, position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 11 }} />}
            </ComposedChart>
          </ResponsiveChart>
        </div>
        <div className="px-5 pb-4 flex flex-wrap items-center justify-between gap-2">
          <Legend items={[{ label: 'Most likely', color: 'var(--sun)' }, { label: 'P10 to P90', color: 'color-mix(in srgb, var(--sun) 30%, transparent)' }]} />
          <p className="text-xs text-muted">Year 5 is {n1(g[4].p50 / g[0].p50)} times year 1 (most likely). The band widens because growth itself is uncertain.</p>
        </div>
      </Box>

      <Box>
        <BoxHeader title="What people buy first" meta="Typical appliance path, from ESMAP 2022 and MTF tiers" />
        <ol className="px-5 pb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STORY.map(s => (
            <li key={s.y} className="min-w-0 border-t-2 border-line pt-3">
              <p className="text-sm font-medium">{s.y}</p>
              <p className="text-xs text-muted leading-relaxed mt-1">{s.t}</p>
            </li>
          ))}
        </ol>
      </Box>

      <Box>
        <BoxHeader title="Size the mini-grid" meta="Rough guide: solar plus battery, costs from ESMAP 2022 benchmarks" />
        <div className="px-5 pb-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="text-muted">Size for</span>
            <div role="radiogroup" aria-label="Design point" className="inline-flex rounded-ctl border border-line overflow-hidden">
              {([[0.5, 'Most likely (P50)'], [0.7, 'Cautious (P70)'], [0.9, 'High (P90)']] as const).map(([v, l]) => (
                <button key={v} role="radio" aria-checked={design === v} onClick={() => setDesign(v)}
                  className={`h-9 px-3 text-sm ${design === v ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{l}</button>
              ))}
            </div>
            <span className="text-muted">demand in</span>
            <div role="radiogroup" aria-label="Design year" className="inline-flex rounded-ctl border border-line overflow-hidden">
              {[1, 3, 5].map(v => (
                <button key={v} role="radio" aria-checked={year === v} onClick={() => setYear(v)}
                  className={`h-9 px-3 text-sm ${year === v ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>Year {v}</button>
              ))}
            </div>
          </div>
        </div>
      </Box>
      <StatStrip cols={4} stats={[
        { label: 'Solar', value: n0(sz.pvKwp), unit: 'kWp', tint: 'var(--sun)', note: `${psh} sun hours a day (rough), 72% performance ratio${plantKw ? `. Existing plant: ${plantKw} kWp` : ''}` },
        { label: 'Battery', value: n0(sz.battKwh), unit: 'kWh', tint: 'var(--info)', note: `Covers evening and night use at 80% depth of discharge. Inverter ${n0(sz.invKw)} kW` },
        { label: 'Build cost', value: usd(sz.capex), unit: 'rough guide', note: `${usd(sz.capex / Math.max(1, sz.customers))} per customer, ${n0(sz.customers)} customers` },
        { label: 'Tariff to break even', value: `$${risk.tariff.p50.toFixed(2)}`, unit: 'per kWh', tint: 'var(--ok)', note: `If demand is P50. 15 years, 10% cost of money, no subsidy` },
      ]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Box>
          <BoxHeader title="What happens if the forecast is wrong" meta={`Year ${year} demand against this system`} />
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div><StatusDot tone={tone(risk.brownout)}><span className="text-sm text-fg">Too small: brownouts</span></StatusDot>
                <p className="text-xs text-muted mt-1">Futures where demand is above what the system makes.</p></div>
              <span className="font-display text-2xl tabular-nums">{pc(risk.brownout)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div><StatusDot tone={tone(risk.oversized)}><span className="text-sm text-fg">Too big: tariff too high</span></StatusDot>
                <p className="text-xs text-muted mt-1">Futures where demand is under 60% of capacity, so each kWh carries more cost.</p></div>
              <span className="font-display text-2xl tabular-nums">{pc(risk.oversized)}</span>
            </div>
            <div className="border-t border-line pt-4 grid grid-cols-3 gap-2 text-center">
              {[['Demand low (P10)', risk.tariff.p90, p10y], ['Most likely', risk.tariff.p50, p50y], ['Demand high (P90)', risk.tariff.p10, p90y]].map(([l, t, m]) => (
                <div key={l as string} className="min-w-0">
                  <p className="text-[11px] text-muted">{l as string}</p>
                  <p className="font-display text-xl tabular-nums mt-0.5">${(t as number).toFixed(2)}</p>
                  <p className="text-[11px] text-muted tabular-nums">{n0(round2(m as number))} kWh/mo</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Tariff needed per kWh to repay the system. A typical home using {n1(hhUse)} kWh a month would pay about ${bill.toFixed(2)} a month at the most likely tariff, against $5 to $20 now spent on kerosene, candles, batteries and diesel (ESMAP 2022). Rough guide.
            </p>
          </div>
        </Box>
        <Box>
          <BoxHeader title="Tariff needed against actual demand" meta="$ per kWh, for the system above" />
          <div className="px-3 pb-2 h-[260px]">
            <ResponsiveChart summary="Tariff needed falls steeply as demand rises toward capacity, then stays flat once the system is full.">
              <ComposedChart data={curve} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="m" type="number" domain={['dataMin', 'dataMax']} {...axisProps} tickFormatter={v => n0(v)} />
                <YAxis {...axisProps} width={44} tickFormatter={v => `$${Number(v).toFixed(2)}`} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <TooltipCard title={`${n0(Number(payload[0].payload.m))} kWh a month`} rows={[{ label: 'Tariff needed', value: `$${Number(payload[0].payload.t).toFixed(2)}`, color: 'var(--ok)' }]} />) : null} />
                <ReferenceLine x={p10y} stroke={CHART.axis} strokeDasharray="3 3" label={{ value: 'P10', fill: 'var(--muted)', fontSize: 11, position: 'top' }} />
                <ReferenceLine x={p50y} stroke="var(--sun)" strokeDasharray="3 3" label={{ value: 'P50', fill: 'var(--muted)', fontSize: 11, position: 'top' }} />
                <ReferenceLine x={p90y} stroke={CHART.axis} strokeDasharray="3 3" label={{ value: 'P90', fill: 'var(--muted)', fontSize: 11, position: 'top' }} />
                <ReferenceLine x={sz.capacityKwhMonth} stroke="var(--bad)" label={{ value: 'Capacity', fill: 'var(--bad)', fontSize: 11, position: 'insideTopRight' }} />
                <Line dataKey="t" stroke="var(--ok)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <p className="px-5 pb-4 text-xs text-muted leading-relaxed">
            Left of capacity, every kWh not sold pushes the tariff up: this is Amina's oversized site. Right of it, the tariff stays flat but customers face brownouts. A narrower forecast lets her build closer to the line.
          </p>
        </Box>
      </div>
      <p className="text-xs text-muted">
        Cost inputs (rough guides): solar ${COSTS.pvPerKwp}/kWp, battery ${COSTS.battPerKwh}/kWh, inverter ${COSTS.invPerKw}/kW, ${COSTS.perConnection} per connection for poles, wire and meter, plus {Math.round(COSTS.softShare * 100)}% for development and logistics, and {Math.round(COSTS.omShare * 100)}% a year for running costs. Diesel backup, subsidies and grants are not included.
      </p>
    </>
  );
};
