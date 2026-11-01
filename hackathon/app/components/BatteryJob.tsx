import React from 'react';
import { Bar, BarChart, ComposedChart, Line, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, More, StatusDot } from './ui';
import type { Engine } from './engine';
import { Cite } from './refs';
import { n0, n1 } from './format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SOLAR = 'var(--sun)', BATT = 'var(--info)', DEM = 'var(--fg)';

// What the battery has to carry (pv_vs_demand.py): the year-5 most likely demand against the P50 system
export const BatteryJob: React.FC<{ eng: Engine; site: string }> = ({ eng, site }) => {
  const b = eng.battery;
  const [mode, setMode] = React.useState<'typical' | 'clear'>('typical');
  if (!b) return null;
  const x = b[mode];
  const months = x.months.map((m, i) => ({ m: MONTHS[i], ...m, total: m.direct + m.battery, range: [Math.min(m.need_p10, m.need_p90), Math.max(m.need_p10, m.need_p90)] }));
  const share = x.months.reduce((a, m) => a + m.share, 0) / 12;
  const week = x.week.pv.map((p, i) => ({ t: i, pv: p, demand: x.week.demand[i], soc: x.week.soc[i], fromBatt: Math.max(0, x.week.demand[i] - p), surplus: Math.max(0, p - x.week.demand[i]) }));
  const short = x.months.filter(m => m.need > b.usable_kwh).length;
  return (
    <Box>
      <BoxHeader title="What the battery has to carry" meta={`${b.design.split(' ')[0]} system: ${n0(b.pv_kwp)} kWp, battery ${n0(b.battery_kwh)} kWh (${n0(b.usable_kwh)} usable); year-5 most likely demand`} />
      <div className="px-5 pb-5 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Sunshine">
            {(['typical', 'clear'] as const).map(k => (
              <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                className={`h-8 px-3 text-xs ${mode === k ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{k === 'typical' ? 'Typical weather' : 'Clear sky (best case)'}</button>
            ))}
          </div>
          <p className="text-sm text-muted">On an average day <span className="text-fg tabular-nums">{Math.round(share * 100)}%</span> of demand comes from the battery, mostly between sunset and midnight.</p>
        </div>
        <dl className="grid gap-px bg-line border border-line rounded-ctl overflow-hidden grid-cols-2 lg:grid-cols-4">
          {[
            { k: 'Demand not served, hour by hour year', v: <StatusDot tone={x.unmet_pct > 5 ? 'bad' : x.unmet_pct > 1 ? 'warn' : 'ok'}>{n1(x.unmet_pct)}%</StatusDot> },
            { k: 'Solar spilled (battery full)', v: `${n1(x.spilled_mwh)} MWh a year` },
            { k: 'Full battery cycles a year', v: n0(x.cycles) },
            { k: 'Nights needing more than the battery', v: <StatusDot tone={short ? 'warn' : 'ok'}>{short ? `${short} of 12 months` : 'none'}</StatusDot> },
          ].map(c => (
            <div key={c.k} className="bg-surface-2 px-3 py-2 min-w-0"><dt className="text-[11px] text-muted">{c.k}</dt><dd className="font-display text-lg tabular-nums">{c.v}</dd></div>
          ))}
        </dl>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="text-sm font-medium mb-1">How the average day's demand is met</p>
            <div className="h-[240px]">
              <ResponsiveChart summary={`Average-day demand split into straight from solar and from the battery by month; ${Math.round(share * 100)}% from the battery on average.`}>
                <BarChart data={months} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="m" {...axisProps} />
                  <YAxis {...axisProps} width={40} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <TooltipCard title={`${label}, average day`} rows={[
                      { label: 'Straight from solar', value: `${n0(payload[0].payload.direct)} kWh`, color: SOLAR },
                      { label: 'From the battery', value: `${n0(payload[0].payload.battery)} kWh`, color: BATT },
                      { label: 'Solar surplus', value: `${n0(payload[0].payload.surplus)} kWh` },
                    ]} />) : null} />
                  <Bar dataKey="direct" stackId="a" fill={SOLAR} isAnimationActive={false} />
                  <Bar dataKey="battery" stackId="a" fill={BATT} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="share" position="top" formatter={(v: number) => `${Math.round(v * 100)}%`} fontSize={10} fill="var(--muted)" />
                  </Bar>
                </BarChart>
              </ResponsiveChart>
            </div>
            <Legend items={[{ label: 'Straight from solar', color: SOLAR }, { label: 'From the battery (label: share)', color: BATT }]} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium mb-1">Battery one night needs, kWh usable</p>
            <div className="h-[240px]">
              <ResponsiveChart summary={`Usable battery one night needs by month, most likely up to ${n0(Math.max(...x.months.map(m => m.need)))} kWh, against ${n0(b.usable_kwh)} kWh usable in the design.`}>
                <ComposedChart data={months} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="m" {...axisProps} />
                  <YAxis {...axisProps} width={40} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <TooltipCard title={`${label}, one night`} rows={[
                      { label: 'Most likely demand', value: `${n0(payload[0].payload.need)} kWh`, color: BATT },
                      { label: 'P10 to P90 demand', value: `${n0(payload[0].payload.range[0])} to ${n0(payload[0].payload.range[1])} kWh` },
                      { label: 'Design battery, usable', value: `${n0(b.usable_kwh)} kWh` },
                    ]} />) : null} />
                  <Bar dataKey="range" fill="color-mix(in srgb, var(--info) 30%, transparent)" barSize={8} radius={2} isAnimationActive={false} />
                  <Scatter dataKey="need" fill={BATT} isAnimationActive={false} />
                  <ReferenceLine y={b.usable_kwh} stroke="var(--muted)" label={{ value: `Design battery ${n0(b.usable_kwh)} kWh usable`, position: 'insideTopRight', fill: 'var(--muted)', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveChart>
            </div>
            <Legend items={[{ label: 'Most likely demand', color: BATT }, { label: 'P10 to P90 demand', color: 'color-mix(in srgb, var(--info) 30%, transparent)' }]} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium mb-1">One week in {MONTHS[x.week.month - 1]} (the month the battery works hardest), hour by hour</p>
          <div className="h-[200px]">
            <ResponsiveChart summary={`Solar and demand for one week in ${MONTHS[x.week.month - 1]}; the battery covers the evening and refills by early afternoon.`}>
              <ComposedChart data={week} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="t" {...axisProps} ticks={[0, 24, 48, 72, 96, 120, 144]} tickFormatter={v => `Day ${Math.floor(v / 24) + 1}`} />
                <YAxis {...axisProps} width={40} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <TooltipCard title={`Day ${Math.floor(payload[0].payload.t / 24) + 1}, ${payload[0].payload.t % 24}:00`} rows={[
                    { label: 'Solar', value: `${n1(payload[0].payload.pv)} kW`, color: SOLAR },
                    { label: 'Demand', value: `${n1(payload[0].payload.demand)} kW`, color: DEM },
                    { label: 'Battery charge', value: `${n0(payload[0].payload.soc)}%`, color: BATT },
                  ]} />) : null} />
                <Area type="stepAfter" dataKey="pv" stroke={SOLAR} fill={SOLAR} fillOpacity={0.18} strokeWidth={1.5} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="demand" stroke={DEM} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <div className="h-[110px]">
            <ResponsiveChart summary="Battery charge falls every evening and refills by early afternoon.">
              <ComposedChart data={week} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="t" {...axisProps} ticks={[0, 24, 48, 72, 96, 120, 144]} tickFormatter={v => `Day ${Math.floor(v / 24) + 1}`} />
                <YAxis {...axisProps} width={40} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={v => `${v}%`} />
                <Area type="monotone" dataKey="soc" stroke={BATT} fill={BATT} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <Legend items={[{ label: 'Solar', color: SOLAR }, { label: 'Demand', color: DEM }, { label: 'Battery charge, % of usable', color: BATT }]} />
        </div>
        <More label="How this is worked out">
          <p className="text-xs text-muted max-w-prose">For each month's average day: demand met straight from solar, the rest from the battery, and the largest drop in stored energy over the day (the usable battery that night needs), for most likely, P10 and P90 demand. Then a whole year hour by hour: solar serves demand first, surplus charges the battery ({Math.round(b.roundtrip * 100)}% round trip, {Math.round(b.dod * 100)}% usable), the battery covers the rest up to the {n0(b.inverter_kw)} kW inverter. Clear sky is the best case; typical weather scales each month by measured sunlight and dust ({site}). Every day of a month uses that month's average curves, so cloudy runs are tested on the 10 real weather years above instead.</p>
        </More>
        <Cite k={['clearsky', 'nasapower', 'engine']} />
      </div>
    </Box>
  );
};
