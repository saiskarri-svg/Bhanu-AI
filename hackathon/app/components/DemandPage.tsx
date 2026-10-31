import React from 'react';
import { Area, CartesianGrid, Line, ComposedChart, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, btn } from './ui';
import type { Estimate, SiteData } from './model';
import type { Engine } from './engine';
import { Cite, DRIVER_SRC } from './refs';
import { NearbyBox } from './Nearby';
import { TwoCounts } from './TwoCounts';
import { n0, n1, pc } from './format';

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

const Figure: React.FC<{ label: string; p10: number; p50: number; p90: number; unit: string; fmt?: (x: number) => string; color?: string; note?: React.ReactNode; marks?: { at: number; label: string }[]; max?: number; cite?: string[] }> =
  ({ label, p10, p50, p90, unit, fmt = n0, color, note, marks, max, cite }) => (
    <div className="bg-surface px-5 py-4 min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="font-display font-semibold text-[30px] leading-none tabular-nums">{fmt(p50)}</span>
        <span className="text-xs text-muted">{unit}, most likely</span>
      </p>
      <p className="mt-1 text-xs text-muted tabular-nums">Range {fmt(p10)} to {fmt(p90)} (P10 to P90)</p>
      <RangeBar lo={p10} mid={p50} hi={p90} max={max ?? p90 * 1.15} color={color} marks={marks} />
      {note && <p className={`${marks?.length ? 'mt-5' : 'mt-2'} text-xs text-muted leading-relaxed`}>{note}</p>}
      {cite && <Cite k={cite} className="mt-2" />}
    </div>
  );

const SECT = [
  { k: 'Households', c: 'var(--res)' },
  { k: 'Businesses', c: 'var(--com)' },
  { k: 'Institutions', c: 'var(--school)' },
  { k: 'Productive use', c: 'var(--pue)' },
] as const;

export const DemandPage: React.FC<{ site: SiteData; eng: Engine; est: Estimate; ours5: { p10: number; p50: number; p90: number }; onNext: () => void }> = ({ site, eng, est, ours5, onNext }) => {
  const S = eng.summary;
  const e1 = S.energy_kwh_per_day[0], e5 = S.energy_kwh_per_day[4];
  const pk5 = S.peak_kw[4], lf5 = S.load_factor[4];
  const hh1 = S.kwh_per_household_month[0], hh5 = S.kwh_per_household_month[4];
  const cu1 = S.customers[0], cu5 = S.customers[4];
  const [yr, setYr] = React.useState<1 | 5>(5);
  const prof = Array.from({ length: 24 }, (_, h) => ({
    h: `${String(h).padStart(2, '0')}:00`,
    y1: eng.profile.y1.p50[h], y5: eng.profile.y5.p50[h],
    base: eng.profile.y5.p10[h], band: eng.profile.y5.p90[h] - eng.profile.y5.p10[h],
  }));
  const peakH = prof.reduce((a, r, h) => (r.y5 > prof[a].y5 ? h : a), 0);
  const drv = (yr === 1 ? eng.drivers1 : eng.drivers5).slice(0, 6);
  const maxShare = Math.max(...drv.map(d => d.share_of_uncertainty));
  const biz = (Object.entries(eng.business) as [string, Engine['business'][string]][]).filter(([, b]) => b.p90 > 0.05);
  const ours = est.monthly; // the building-level model, kWh a month in year 1

  return (
    <>
      <Box>
        <div className="px-5 py-4">
          <p className="text-xs text-muted">The answer for {site.name}</p>
          <p className="mt-1 text-lg leading-snug max-w-4xl text-balance">
            About <b className="font-semibold tabular-nums">{n0(e1.p50)} kWh a day</b> in the first year (range {n0(e1.p10)} to {n0(e1.p90)}),
            growing to <b className="font-semibold tabular-nums">{n0(e5.p50)} kWh a day</b> by year 5 ({n0(e5.p10)} to {n0(e5.p90)}) as homes connect and buy appliances.
            The evening peak reaches about <b className="font-semibold tabular-nums">{n0(pk5.p50)} kW</b>.
          </p>
          <Cite className="mt-2" label="Built from" k={['openbuildings', 'overture', 'faza', 'igc', 'frame', 'esmap', 'engine']} />
        </div>
      </Box>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        <Figure label="Energy, year 1" p10={e1.p10} p50={e1.p50} p90={e1.p90} unit="kWh a day" note={`${n0(cu1.p50)} customers in year 1 (early adopters).`} cite={['faza', 'igc', 'frame']} />
        <Figure label="Energy, year 5" p10={e5.p10} p50={e5.p50} p90={e5.p90} unit="kWh a day" note={`${n0(cu5.p50)} customers by year 5.`} cite={['faza', 'igc', 'assumption']} />
        <Figure label="Use per household, year 5" p10={hh5.p10} p50={hh5.p50} p90={hh5.p90} unit="kWh a month" fmt={n1} color="var(--res)" max={36}
          marks={[{ at: 8.1, label: 'Rwanda 8.1' }, { at: 35, label: '35' }]}
          note={`${n1(hh1.p50)} in year 1. Calibrated to measured sites (Rwanda 8.1, Malawi 7 to 8), inside ESMAP's 5 to 35 range.`} cite={['igc', 'frame', 'esmap']} />
        <Figure label="Evening peak and load factor, year 5" p10={pk5.p10} p50={pk5.p50} p90={pk5.p90} unit="kW" fmt={n1} color="var(--bad)"
          note={`Load factor ${pc(lf5.p50)}. Homes-only grids run near 22%; daytime business use toward 40% cut the cost of power by about 25% (ESMAP 2022).`} cite={['esmap', 'engine']} />
      </div>
      <p className="text-xs text-muted -mt-3">P10 means 1 in 10 simulated futures come in lower; P90 means 1 in 10 come in higher. 4,000 futures. Rough guide, not a site survey.</p>

      <TwoCounts eng={eng} site={site} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Box>
          <BoxHeader title="An average day" meta="kW, most likely in year 1 and year 5, with the year 5 range" />
          <div className="px-3 pb-2 h-[300px]">
            <ResponsiveChart summary={`Load peaks around ${peakH}:00 at about ${n1(prof[peakH].y5)} kW on an average day in year 5.`}>
              <ComposedChart data={prof} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="h" {...axisProps} interval={3} />
                <YAxis {...axisProps} width={44} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipCard title={String(label)} rows={[
                    { label: 'Year 5', value: `${n1(Number(payload[0].payload.y5))} kW`, color: 'var(--sun)' },
                    { label: 'Year 5 range', value: `${n1(Number(payload[0].payload.base))} to ${n1(Number(payload[0].payload.base) + Number(payload[0].payload.band))} kW` },
                    { label: 'Year 1', value: `${n1(Number(payload[0].payload.y1))} kW`, color: 'var(--info)' },
                  ]} />) : null} />
                <Area dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area dataKey="band" stackId="b" stroke="none" fill="var(--sun)" fillOpacity={0.18} />
                <Line type="monotone" dataKey="y5" stroke="var(--sun)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="y1" stroke="var(--info)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <div className="px-5 pb-4"><Legend items={[{ label: 'Year 5, most likely', color: 'var(--sun)' }, { label: 'Year 5, P10 to P90', color: 'color-mix(in srgb, var(--sun) 30%, transparent)' }, { label: 'Year 1, most likely', color: 'var(--info)' }]} />
            <Cite className="mt-2" k={['faza', 'esmap', 'assumption']} label="Appliance power and hours of use" /></div>
        </Box>
        <Box>
          <BoxHeader title="Who uses the energy" meta="kWh a day, most likely" />
          <div className="px-3 pb-2 h-[260px]">
            <ResponsiveChart summary={`In year 5 households use ${n0(eng.sectors[4].Households)} kWh a day and productive use ${n0(eng.sectors[4]['Productive use'])}.`}>
              <BarChart data={eng.sectors.map(s => ({ ...s, y: `Year ${s.year}` }))} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="y" {...axisProps} />
                <YAxis {...axisProps} width={44} />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipCard title={String(label)} rows={SECT.map(s => ({ label: s.k, value: `${n0(Number(payload[0].payload[s.k]))} kWh`, color: s.c }))} />) : null} />
                {SECT.map(s => <Bar key={s.k} dataKey={s.k} stackId="s" fill={s.c} />)}
              </BarChart>
            </ResponsiveChart>
          </div>
          <div className="px-5 pb-4"><Legend items={SECT.map(s => ({ label: s.k, color: s.c }))} />
            <Cite className="mt-2" k={['faza', 'rockefeller', 'esmap', 'peters', 'assumption']} /></div>
        </Box>
      </div>

      <Box>
        <BoxHeader title="Why this number" meta={
          <span className="inline-flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Year">
            {([1, 5] as const).map(y => <button key={y} role="radio" aria-checked={yr === y} onClick={() => setYr(y)} className={`h-8 px-3 text-xs ${yr === y ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>Year {y}</button>)}
          </span>} />
        <div className="px-5 pb-5">
          <p className="text-sm text-muted max-w-prose mb-4">
            Share of the forecast's uncertainty that each input explains. The longest bars are where a short site visit narrows the range most.
          </p>
          <ol className="space-y-3">
            {drv.map((d, i) => (
              <li key={d.input} className="grid gap-x-6 gap-y-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center">
                <p className="text-sm text-fg min-w-0"><span className="text-muted tabular-nums mr-2">{i + 1}</span>{d.label}
                  <span className="block text-xs text-muted ml-5">{d.effect.replace('->', 'means')}</span>
                  <Cite className="ml-5" k={DRIVER_SRC[d.input] ?? ['assumption']} /></p>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 h-3 rounded-sm bg-surface-2 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${(d.share_of_uncertainty / maxShare) * 100}%`, background: 'color-mix(in srgb, var(--sun) 65%, transparent)' }} /></div>
                  <span className="text-sm tabular-nums w-10 text-right">{pc(d.share_of_uncertainty)}</span>
                </div>
              </li>
            ))}
          </ol>
          {drv[0]?.input === 'buildings_per_household' && (
            <p className="text-sm mt-4 max-w-prose"><span className="text-fg font-medium">Field check that pays most:</span> <span className="text-muted">count households on the ground. Satellites count roofs, and a family compound often has several.</span></p>
          )}
        </div>
      </Box>

      <NearbyBox eng={eng} name={site.name} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Box>
          <BoxHeader title="What the map gave the model" meta={`${eng.landuse.evidence_pct}% of buildings carry a use tag`} />
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-4 font-normal">Type</th><th className="py-2 pr-4 font-normal text-right">Mapped</th><th className="py-2 font-normal text-right">Used (P10 to P90)</th></tr></thead>
              <tbody>
                <tr className="border-b border-line/60"><td className="py-1.5 pr-4">Residential buildings</td><td className="py-1.5 pr-4 text-right">{n0(eng.landuse.residential_buildings)}</td><td className="py-1.5 text-right text-muted">{n0(S.households[0].p10)} to {n0(S.households[0].p90)} households</td></tr>
                {biz.map(([k, b]) => (
                  <tr key={k} className="border-b border-line/60"><td className="py-1.5 pr-4">{b.label}</td><td className="py-1.5 pr-4 text-right">{n0(b.mapped)}</td><td className="py-1.5 text-right text-muted">{n1(b.p10)} to {n1(b.p90)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-3 leading-relaxed">Where few buildings are tagged, shops, schools and clinics come from regional averages per household; mapped counts are used where higher. Check them on site.</p>
            <Cite className="mt-2" k={['openbuildings', 'overture', 'omorate', 'assumption']} />
          </div>
        </Box>
        <Box>
          <BoxHeader title="Second opinion" meta="Two models, built separately" />
          <div className="px-5 pb-5 text-sm space-y-3">
            <p className="text-muted">GridSight's building-level model classes every roof and assumes most homes connect in year 1. It gives <span className="text-fg tabular-nums">{n0(ours.p10 / 30)} to {n0(ours.p90 / 30)} kWh a day</span> for year 1.</p>
            <p className="text-muted">The demand engine follows the connection pace measured at the Faza mini-grid in Kenya, so year 1 starts lower ({n0(e1.p10)} to {n0(e1.p90)}) and grows faster. By year 5 the building model says {n0(ours5.p10 / 30)} to {n0(ours5.p90 / 30)} kWh a day and the engine {n0(e5.p10)} to {n0(e5.p90)}.</p>
            <Cite k={['esmap', 'mtf', 'who', 'amda', 'assumption']} label="Building-level model" />
            <p className="text-xs text-muted">Demand engine by Fereshteh (forecast/demand_forecast.py); every input and its source in forecast/assumptions.yaml, and listed on the Method tab.</p>
          </div>
        </Box>
      </div>
      <div className="flex justify-end"><button onClick={onNext} className={`${btn.primary} h-11 px-6`}>Next: growth, size and tariff</button></div>
    </>
  );
};
