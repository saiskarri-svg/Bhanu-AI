import React from 'react';
import type { Settings } from './settings';
import { WiresBox } from './wires';
import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, StatStrip, StatusDot, btn, More } from './ui';
import type { SiteData } from './model';
import type { Engine } from './engine';
import { kwpFor } from './engine';
import { Cite } from './refs';
import { n0, n1, pc, usd } from './format';

const STORY = [
  { y: 'Year 1', t: 'Early adopters connect first, about a third of eventual customers. Lights, phone charging, radio, some TVs. Shops add a fridge or sound system.' },
  { y: 'Year 2', t: 'The biggest wave of connections, as neighbours see the supply work. More TVs and fans.' },
  { y: 'Year 3', t: 'Late adopters join. Fridges in bars and shops. The first mill or welder appears if there is finance for it.' },
  { y: 'Years 4 to 5', t: 'Appliance buying follows an S-curve and slows. New mills and workshops arrive one at a time; they decide the daytime load.' },
];

export const GrowthPage: React.FC<{ site: SiteData; eng: Engine; s: Settings; set: (p: Partial<Settings>) => void; onNext: () => void }> = ({ site, eng, s, set, onNext }) => {
  const S = eng.summary;
  const pick = s.di, setPick = (i: number) => set({ di: i }); // shared site setting
  const d = eng.designs[pick];
  const risk = eng.risk.filter(r => r.design === d.design);
  const r5 = risk.find(r => r.year === 5)!, r2 = risk.find(r => r.year === 2)!;
  const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant' && p.output);
  const plantKw = plant?.output ? parseFloat(plant.output) * (plant.output.toLowerCase().includes('mw') ? 1000 : 1) : null;
  const data = S.energy_kwh_per_day.map(r => ({ year: `Year ${r.year}`, base: r.p10, band: r.p90 - r.p10, p50: r.p50, p10: r.p10, p90: r.p90 }));
  const tone = (x: number) => (x > 0.3 ? 'bad' : x > 0.15 ? 'warn' : 'ok') as 'bad' | 'warn' | 'ok';
  const cover = (x: number) => (x >= 0.8 ? 'ok' : x >= 0.5 ? 'warn' : 'bad') as 'bad' | 'warn' | 'ok';

  return (
    <>
      <Box>
        <BoxHeader title="Demand growth after connection" meta="kWh a day, most likely line and P10 to P90 band" />
        <div className="px-3 pb-2 h-[300px]">
          <ResponsiveChart summary={`Most likely demand grows from ${n0(data[0].p50)} kWh a day in year 1 to ${n0(data[4].p50)} in year 5, range ${n0(data[4].p10)} to ${n0(data[4].p90)}.`}>
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} width={48} tickFormatter={v => n0(v)} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipCard title={String(label)} rows={[
                  { label: 'P90', value: `${n0(Number(payload[0].payload.p90))} kWh/day` },
                  { label: 'Most likely', value: `${n0(Number(payload[0].payload.p50))} kWh/day`, color: 'var(--sun)' },
                  { label: 'P10', value: `${n0(Number(payload[0].payload.p10))} kWh/day` },
                ]} />) : null} />
              <Area dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area dataKey="band" stackId="b" stroke="none" fill="var(--sun)" fillOpacity={0.2} />
              <Line dataKey="p50" stroke="var(--sun)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--sun)' }} />
              <ReferenceLine y={d.capacity_kwh_day} stroke="var(--bad)" strokeDasharray="4 4" label={{ value: `Capacity of the ${d.design.split(' ')[0]} design`, position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 11 }} />
              {plantKw && <ReferenceLine y={(plantKw * eng.peak_sun_hours * 0.75) / 1.1} stroke={CHART.axis} strokeDasharray="2 4" label={{ value: `Existing ${plantKw} kWp plant`, position: 'insideBottomRight', fill: 'var(--muted)', fontSize: 11 }} />}
            </ComposedChart>
          </ResponsiveChart>
        </div>
        <div className="px-5 pb-4 flex flex-wrap items-center justify-between gap-2">
          <Legend items={[{ label: 'Most likely', color: 'var(--sun)' }, { label: 'P10 to P90', color: 'color-mix(in srgb, var(--sun) 30%, transparent)' }, { label: 'Capacity of chosen design', color: 'var(--bad)' }]} />
          <p className="text-xs text-muted">Customers {n0(S.customers[0].p50)} in year 1, {n0(S.customers[4].p50)} by year 5. Year 5 is {n1(data[4].p50 / data[0].p50)} times year 1.</p>
          <Cite className="w-full" k={site.country === 'MR' ? ['faza', 'igc', 'frame', 'dhs', 'census', 'engine'] : ['faza', 'igc', 'frame', 'assumption', 'engine']} />
        </div>
      </Box>

      <Box>
        <BoxHeader title="What people buy, year by year" meta="Connection pace and appliance uptake measured at the Faza mini-grid, Kenya" />
        <ol className="px-5 pb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STORY.map(s => (
            <li key={s.y} className="min-w-0 border-t-2 border-line pt-3">
              <p className="text-sm font-medium">{s.y}</p>
              <p className="text-xs text-muted leading-relaxed mt-1">{s.t}</p>
            </li>
          ))}
        </ol>
        <Cite className="px-5 pb-5 -mt-2" k={['faza', 'clasp', 'esmap', 'peters']} />
      </Box>

      <Box>
        <BoxHeader title="How wrong can we be? Pick a size" meta="Each design tested against all 4,000 futures" />
        <div className="px-5 pb-5 overflow-x-auto">
          <table className="w-full text-sm tabular-nums min-w-[720px]">
            <thead><tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-normal">Build for</th><th className="py-2 pr-3 font-normal text-right">Solar kWp</th><th className="py-2 pr-3 font-normal text-right">Battery kWh</th><th className="py-2 pr-3 font-normal text-right">Build cost</th>
              <th className="py-2 pr-3 font-normal text-right">Brownouts, year 5</th><th className="py-2 pr-3 font-normal text-right">Under 60% used, year 2</th><th className="py-2 pr-3 font-normal text-right">Cost per kWh, year 5</th><th className="py-2 font-normal text-right">Revenue covers cost, year 5</th>
            </tr></thead>
            <tbody>
              {eng.designs.map((x, i) => {
                const a = eng.risk.find(r => r.design === x.design && r.year === 5)!, b = eng.risk.find(r => r.design === x.design && r.year === 2)!;
                return (
                  <tr key={x.design} onClick={() => setPick(i)} aria-selected={pick === i} className={`border-b border-line cursor-pointer ${pick === i ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                    <td className="py-2 pr-3 whitespace-nowrap"><span className={`inline-block h-3 w-3 rounded-full border mr-2 align-[-1px] ${pick === i ? 'bg-accent border-accent' : 'border-muted'}`} />{x.design.split(' ')[0]} of year-5 demand</td>
                    <td className="py-2 pr-3 text-right">{n0(x.pv_kwp)}</td><td className="py-2 pr-3 text-right">{n0(x.battery_kwh)}</td><td className="py-2 pr-3 text-right">{usd(x.capex_usd)}</td>
                    <td className="py-2 pr-3 text-right"><StatusDot tone={tone(a.p_brownouts)}>{pc(a.p_brownouts)}</StatusDot></td>
                    <td className="py-2 pr-3 text-right"><StatusDot tone={tone(b.p_underused - 0.5)}>{pc(b.p_underused)}</StatusDot></td>
                    <td className="py-2 pr-3 text-right">${a.cost_per_kwh_p50.toFixed(2)}</td>
                    <td className="py-2 text-right"><StatusDot tone={cover(1 - a.p_revenue_below_cost)}>{pc(1 - a.p_revenue_below_cost)}</StatusDot></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-sm mt-4 max-w-prose"><span className="text-fg font-medium">Build in stages.</span> <span className="text-muted">A system big enough for year 5 sits mostly idle in year 2, and one sized for today browns out later. Size for year 2 or 3 and add panels and batteries as metered demand shows up.</span></p>
          <Cite className="mt-2" label="Costs, sun hours and thresholds" k={eng.weather_inputs ? ['omorate', 'wbsplit', 'nasapower', 'assumption'] : ['omorate', 'wbsplit', 'gsrough', 'assumption']} />
        </div>
      </Box>

      <StatStrip cols={4} stats={[
        { label: 'Solar', value: n0(d.pv_kwp), unit: 'kWp', tint: 'var(--sun)', note: <>{n1(eng.weather_inputs?.peak_sun_hours ?? eng.peak_sun_hours)} sun hours a day (dull-season month), {Math.round((eng.weather_inputs?.performance_ratio ?? 0.75) * 100)}% of sunlight used<Cite className="mt-1" k={eng.weather_inputs ? ['nasapower'] : site.country === 'MR' ? ['omorate'] : ['gsrough']} /></> },
        { label: 'Battery', value: n0(d.battery_kwh), unit: 'kWh', tint: 'var(--info)', note: <>Inverter {n0(d.inverter_kw)} kW<Cite className="mt-1" k={['omorate']} /></> },
        { label: 'Build cost', value: usd(d.capex_usd), unit: 'rough guide', note: <>{usd(d.capex_per_customer_usd)} per customer<Cite className="mt-1" k={['omorate', 'wbsplit']} /></> },
        { label: 'Risk of this size', value: pc(r5.p_brownouts), unit: 'brownouts, year 5', tint: 'var(--bad)', note: <>{pc(r2.p_underused)} chance it is under 60% used in year 2<Cite className="mt-1" k={['engine', 'assumption']} /></> },
      ]} />

      {eng.sizing_basis && (() => { const a = eng.sizing_basis.dull_season, b = eng.sizing_basis.yearly_average; const row = (k: string, f: (x: typeof a) => string) => (
        <tr key={k} className="border-b border-line"><td className="py-2 pr-3 text-muted">{k}</td><td className="py-2 pr-3 text-right">{f(a)}</td><td className="py-2 text-right">{f(b)}</td></tr>); return (
        <Box>
          <BoxHeader title="Size for the dull season or the yearly average?" meta="P50 system, year-5 demand, run through 10 real weather years" />
          <div className="px-5 pb-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm tabular-nums min-w-[420px]">
                <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-3 font-normal"></th><th className="py-2 pr-3 font-normal text-right">Dull-season month (used)</th><th className="py-2 font-normal text-right">Yearly average</th></tr></thead>
                <tbody>
                  {row('Sun hours used for sizing', x => `${n1(x.peak_sun_hours)} kWh/m² a day`)}
                  {row('Solar and battery', x => `${n0(x.pv_kwp)} kWp · ${n0(x.battery_kwh)} kWh`)}
                  {row('Build cost (rough)', x => usd(x.capex_usd))}
                  {row('Demand not served, 10 weather years', x => pc(x.weather_unmet_share))}
                  {row('Short days a year', x => n0(x.weather_short_days))}
                  {row('Worst month, demand not served', x => pc(x.worst_month_unmet))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-muted space-y-2 min-w-0">
              <p>Sizing on the yearly average saves {pc(1 - b.capex_usd / a.capex_usd)} of the build cost but misses {pc(b.weather_unmet_share - a.weather_unmet_share)} more of demand, and up to {pc(b.worst_month_unmet)} in the worst month, when rain and cloud are heaviest.</p>
              <p><span className="text-fg font-medium">Recommendation:</span> size the first stage for the dull season, so evenings stay lit in the rainy months; the staged build already keeps early capital low.</p>
              <Cite k={['nasapower', 'engine']} />
            </div>
          </div>
        </Box>); })()}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Box>
          <BoxHeader title="Tariff: demand, bills and cost recovery" meta={`P50 design at each tariff, year 5`} />
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-sm tabular-nums min-w-[520px]">
              <thead><tr className="text-left text-xs text-muted border-b border-line">
                <th className="py-2 pr-3 font-normal">Tariff</th><th className="py-2 pr-3 font-normal text-right">Demand</th><th className="py-2 pr-3 font-normal text-right">Home use</th><th className="py-2 pr-3 font-normal text-right">Home bill</th><th className="py-2 font-normal text-right">Covers cost</th>
              </tr></thead>
              <tbody>
                {eng.tariffs.filter((t, i, a) => a.findIndex(u => u.tariff_usd_per_kwh === t.tariff_usd_per_kwh) === i).map(t => (
                  <tr key={t.tariff_usd_per_kwh} className="border-b border-line">
                    <td className="py-2 pr-3">${t.tariff_usd_per_kwh.toFixed(2)}/kWh</td>
                    <td className="py-2 pr-3 text-right">{n0(t.year5_kwh_per_day_p50)} kWh/day</td>
                    <td className="py-2 pr-3 text-right">{n1(t.year5_kwh_per_household_month_p50)} kWh/mo</td>
                    <td className="py-2 pr-3 text-right">${t.year5_household_bill_usd_month_p50.toFixed(2)}/mo</td>
                    <td className="py-2 text-right"><StatusDot tone={cover(t.p_revenue_covers_cost_year5)}>{pc(t.p_revenue_covers_cost_year5)}</StatusDot></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <More label="How the tariff changes use" className="mt-3"><p className="text-xs text-muted mt-3 leading-relaxed">A higher tariff lowers use (price elasticity -0.1 to -0.8; in Sierra Leone a 41% tariff cut raised use by about 50%) but raises revenue per kWh. Households spend $5 to $20 a month today on candles, kerosene, batteries and diesel (ESMAP 2022).</p></More>
            <Cite className="mt-2" k={['sltariff', 'esmap', 'omorate']} />
          </div>
        </Box>
        <Box>
          <BoxHeader title="Tariffs in the region" meta="For context, as reported" />
          <ul className="px-5 pb-5 space-y-3 text-sm">
            <li><span className="text-fg">Private mini-grids in West Africa:</span> <span className="text-muted">about $0.8 to $5 per kWh.</span></li>
            <li><span className="text-fg">Sierra Leone, 90-grid programme:</span> <span className="text-muted">about $0.85 per kWh.</span></li>
            <li><span className="text-fg">National grids in West Africa:</span> <span className="text-muted">about $0.35 per kWh on average, $0.14 (Ghana) to $0.66 (Liberia), often subsidised.</span></li>
            <li className="text-xs text-muted">Antonanzas-Torres et al. (2021), Energies, data from 2020. Villagers compare with grid prices, so cost-covering tariffs are politically hard (Peters, Sievert and Toman 2019).<Cite className="mt-1" k={['antonanzas', 'peters']} /></li>
          </ul>
        </Box>
      </div>
      <More label="Where the costs come from"><p className="text-xs text-muted">
        Costs: Omorate mini-grid, Ethiopia, 2021 contract prices (Wassie and Ahlgren 2023), generation only plus a share for distribution and soft costs. Newer data: AMDA's 2024 benchmark (member sites 2022 to 2024) puts the full build cost at about $1,046 a connection in West and Central Africa and $1,948 in East and Southern Africa; switch "Build cost" in the settings bar to use it. Panels and batteries are far cheaper now (IRENA 2024: $691 a kW, $192 a kWh), so most of the gap is installation, wiring and soft costs. Replace with real quotes before quoting dollars. Grants and subsidies are not included.
        {plantKw ? ` Solar for the most likely demand: year 1 about ${n0(kwpFor(S.energy_kwh_per_day[0].p50, eng.peak_sun_hours))} kWp, year 3 about ${n0(kwpFor(S.energy_kwh_per_day[2].p50, eng.peak_sun_hours))} kWp.` : ''}
      </p></More>
      <WiresBox site={site} eng={eng} s={s} />
      <div className="flex justify-end"><button onClick={onNext} className={`${btn.primary} h-11 px-6`}>Next: funding</button></div>
    </>
  );
};
