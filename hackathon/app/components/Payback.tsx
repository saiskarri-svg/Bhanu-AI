import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, More } from './ui';
import type { Engine } from './engine';
import type { Settings } from './settings';
import { derive } from './settings';
import { lifetime, DEMAND_AFTER_5 } from './lifetime';
import { Cite } from './refs';
import { n1, usd } from './format';

const yrs = (v: number | null) => v === null ? 'over 20 yrs' : `${n1(v)} yrs`;
const money = (v: number) => `${v < 0 ? '-' : ''}${usd(Math.abs(v))}`;

export const Payback: React.FC<{ eng: Engine; s: Settings }> = ({ eng, s }) => {
  const cust = derive(eng, s).CU?.[4].p50 ?? 0;
  const L = lifetime(eng, s, s.grant * cust);
  if (!L) return null;
  const tone = (v: number | null) => v === null ? 'text-bad' : v <= 7 ? 'text-ok' : v <= 12 ? 'text-warn' : 'text-bad';
  const data = L.rows.map(r => ({ ...r }));
  return (
    <Box>
      <BoxHeader title="Payback over 20 years" meta={`$${s.tar.toFixed(2)} a kWh · $${s.grant} grant a connection · ${L.T.label.toLowerCase()} loan · rough guide`} />
      <div className="px-5 pb-5 space-y-4">
        <dl className="grid gap-px bg-line border border-line rounded-ctl overflow-hidden grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Owner's money back", v: yrs(L.ownerPayback), sub: `${usd(L.equity)} put in${L.eq3 ? ', part in year 3' : ''}, after loan payments`, cls: tone(L.ownerPayback) },
            { k: 'Whole project back', v: yrs(L.projectPayback), sub: 'build cost after the grant, no loan', cls: tone(L.projectPayback) },
            { k: "Owner's cash over 20 years", v: money(L.ownerTotal), sub: 'after money put in', cls: L.ownerTotal >= 0 ? 'text-ok' : 'text-bad' },
            { k: 'Battery and inverter renewal', v: usd(L.rows.reduce((a, r) => a + r.repl, 0)), sub: 'around year 11' },
          ].map(x => (
            <div key={x.k} className="bg-surface-2 px-3 py-2 min-w-0">
              <dt className="text-[11px] text-muted">{x.k}</dt>
              <dd className={`font-display text-lg tabular-nums ${x.cls ?? ''}`}>{x.v}</dd>
              <dd className="text-[11px] text-muted">{x.sub}</dd>
            </div>
          ))}
        </dl>
        <div className="h-[240px]">
          <ResponsiveChart summary={`Owner's running total starts at ${money(-L.eq0)} and ends at ${money(L.ownerTotal)} after 20 years; it turns positive ${L.ownerPayback === null ? 'never within 20 years' : `after about ${n1(L.ownerPayback)} years`}.`}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="y" {...axisProps} ticks={[1, 5, 10, 15, 20]} tickFormatter={v => `Yr ${v}`} />
              <YAxis {...axisProps} width={56} tickFormatter={v => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v) / 1000)}k`} />
              <ReferenceLine y={0} stroke="var(--muted)" />
              <Tooltip content={({ active, payload }) => active && payload?.length ? (
                <TooltipCard title={`Year ${payload[0].payload.y}`} rows={[
                  { label: 'Money in from bills', value: usd(payload[0].payload.revenue), color: 'var(--ok)' },
                  { label: 'Running costs', value: usd(payload[0].payload.om) },
                  { label: 'Loan payments', value: usd(payload[0].payload.debt) },
                  ...(payload[0].payload.repl ? [{ label: 'Battery and inverter renewal', value: usd(payload[0].payload.repl) }] : []),
                  ...(payload[0].payload.capex ? [{ label: 'Stage 2 build', value: usd(payload[0].payload.capex) }] : []),
                  { label: "Owner's running total", value: money(payload[0].payload.ownerCum), color: 'var(--sun)' },
                ]} />) : null} />
              <Bar dataKey="owner" fill="var(--ok)" opacity={0.35} isAnimationActive={false} />
              <Line dataKey="ownerCum" stroke="var(--sun)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="projectCum" stroke="var(--info)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveChart>
        </div>
        <Legend items={[{ label: "Owner's cash each year", color: 'color-mix(in srgb, var(--ok) 35%, transparent)' }, { label: "Owner's running total", color: 'var(--sun)' }, { label: 'Whole project, no loan', color: 'var(--info)' }]} />
        <More label="What this assumes">
          <p className="text-xs text-muted max-w-prose">Expected sales across the demand range to year 5 (shortfalls lost, spare capacity unpaid), then {Math.round(DEMAND_AFTER_5 * 100)}% more a year (assumption), capped by what the system makes. {Math.round(L.T.collection * 100)}% of bills collected. Running costs, a 10-year battery and inverter life and a 0.9 replacement factor from the engine's cost file. Staged builds add the rest in year 3 on the same loan terms, with no grant. No tax, inflation or tariff rises; panels kept for 20 years. Rough guides only.</p>
        </More>
        <Cite k={['omorate', 'irena2024', 'amda2024', 'assumption']} />
      </div>
    </Box>
  );
};
