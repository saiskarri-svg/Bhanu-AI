import React from 'react';
import { Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, StatusDot, More } from './ui';
import type { Engine } from './engine';
import { Cite } from './refs';
import { n0, n1 } from './format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fereshteh's clear-sky curves, scaled by each month's measured weather, with
// the engine's hourly demand laid over them: what the battery must carry.
export const DayCurves: React.FC<{ eng: Engine }> = ({ eng }) => {
  const p = eng.pvday;
  if (!p) return null;
  const ymax = Math.ceil(Math.max(...p.months.flatMap(m => [...m.clear, ...m.demand])) * 1.08);
  const worst = p.months.reduce((a, m) => (m.battery_need_kwh > a.battery_need_kwh ? m : a), p.months[0]);
  const [all, setAll] = React.useState(false);
  // Default: the worst month for the battery plus the other three seasons
  const pick = [...new Set([worst.month, 1, 4, 7, 10].map(m => m))].slice(0, 4).sort((a, b) => a - b);
  const shown = all ? p.months : p.months.filter(m => pick.includes(m.month));
  return (
    <Box>
      <BoxHeader title={all ? "A typical day in each month" : "A typical day, four months"} meta={`P50 system: ${n0(p.pv_kwp)} kWp, battery ${n0(p.battery_kwh)} kWh (${n0(p.battery_usable_kwh)} usable); year-5 demand; local time (${p.tz})`} />
      <div className="px-5 pb-2">
        <p className="text-sm text-muted max-w-prose">Midday sun beyond what people use charges the battery; everything under the demand line outside the yellow is carried by the battery, mostly in the evening. The battery is busiest in {MONTHS[worst.month - 1]}: {n0(worst.battery_need_kwh)} kWh of {n0(p.battery_usable_kwh)} usable.</p>
      </div>
      <div className="px-3 pb-2 grid grid-cols-2 xl:grid-cols-4 gap-x-2 gap-y-3">
        {shown.map(m => {
          const data = m.solar.map((s, h) => ({ h, s, c: m.clear[h], d: m.demand[h] }));
          return (
            <figure key={m.month} className="min-w-0">
              <figcaption className="px-2 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-fg">{MONTHS[m.month - 1]}</span>
                <StatusDot tone={m.battery_ok ? 'ok' : 'bad'}><span className="text-muted tabular-nums">battery {n0(m.battery_need_kwh)} kWh</span></StatusDot>
              </figcaption>
              <div className="h-[120px]">
                <ResponsiveChart summary={`${MONTHS[m.month - 1]}: solar ${n0(m.solar_kwh)} kWh a day, demand ${n0(m.demand_kwh)} kWh, ${n0(m.battery_need_kwh)} kWh from the battery.`}>
                  <ComposedChart data={data} margin={{ top: 6, right: 6, left: -4, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="h" {...axisProps} ticks={[0, 6, 12, 18]} tickFormatter={v => `${v}h`} fontSize={10} />
                    <YAxis {...axisProps} domain={[0, ymax]} fontSize={10} width={28} tickCount={3} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <TooltipCard title={`${MONTHS[m.month - 1]}, ${label}:00`} rows={[
                        { label: 'Solar, typical', value: `${n1(Number(payload[0].payload.s))} kW`, color: 'var(--sun)' },
                        { label: 'Solar, clear sky', value: `${n1(Number(payload[0].payload.c))} kW` },
                        { label: 'Demand, year 5', value: `${n1(Number(payload[0].payload.d))} kW`, color: 'var(--fg)' },
                      ]} />) : null} />
                    <Area dataKey="s" stroke="var(--sun)" strokeWidth={1.5} fill="var(--sun)" fillOpacity={0.3} isAnimationActive={false} />
                    <Line dataKey="c" stroke={CHART.axis} strokeDasharray="3 3" strokeWidth={1} dot={false} isAnimationActive={false} />
                    <Line dataKey="d" stroke="var(--fg)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveChart>
              </div>
              <p className="px-2 text-[11px] text-muted tabular-nums">Solar {n0(m.solar_kwh)} · use {n0(m.demand_kwh)} kWh a day</p>
            </figure>
          );
        })}
      </div>
      <div className="px-5 pb-5 pt-2 space-y-2">
        <button onClick={() => setAll(v => !v)} aria-expanded={all} className="text-xs text-muted hover:text-fg underline underline-offset-2 decoration-line">{all ? 'Show 4 months' : 'Show all 12 months'}</button>
        <Legend items={[{ label: 'Solar, typical weather', color: 'var(--sun)' }, { label: 'Solar, clear sky', color: 'var(--muted)' }, { label: 'Demand, year 5 (most likely)', color: 'var(--fg)' }]} />
        <More label="How the curves are made"><p className="text-xs text-muted">Solar from Fereshteh's clear-sky model (Ineichen-Perez, Perez transposition, cell temperature, 14% system losses) at {n0(p.altitude_m)} m altitude (Copernicus 30 m elevation), tilt {p.tilt} degrees facing the equator, scaled each month by measured sunlight against clear sky (NASA POWER 2015 to 2024) and by dust on the panels. Demand: the engine's hourly profile. Rough guide; use the 8760 files in HOMER or REopt for detailed design.</p></More>
        <Cite k={['clearsky', 'nasapower', 'copdem', 'engine']} />
      </div>
    </Box>
  );
};
