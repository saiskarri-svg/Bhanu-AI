import React from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { Box, BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, StatStrip, StatusDot, btn, monthTick } from './ui';
import type { SiteData } from './model';
import type { Engine } from './engine';
import { Cite } from './refs';
import { n0, n1, pc } from './format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Weather {
  site: string; years: [number, number]; source: string;
  assumptions: { system: number; temp_coef_per_c: number; soiling_base_per_day: number; soiling_per_aod_per_day: number; rain_wash_mm: number; cleaning_every_days: number; cloudy_below_clear_sky: number; rainy_mm: number; dusty_aod: number };
  annual: { ghi: number; yield_kwh_kwp_day: number; yield_by_year: number[]; performance_ratio: number; daily_cv: number; two_day_cv: number;
    loss_share: { cloud: number; heat: number; dust_on_panels: number }; days: { cloudy: number; rainy: number; dusty: number };
    yield_on: { normal: number; cloudy: number | null; rainy: number | null; dusty: number | null }; longest_low_spell_days: { median: number; worst: number } };
  monthly: { ghi: number[]; clear: number[]; cloud: number[]; aod: number[]; rain_mm: number[]; t: number[]; tmax: number[]; yield_p50: number[]; yield_p10: number[]; yield_p90: number[]; cloudy_days: number[]; rainy_days: number[]; dusty_days: number[] };
  outlook?: { scenario: string; baseline: number[]; future: number[]; models: { model: string; rsds_pct: number[]; tas_c: number[] }[]; yield_change?: { models: number[]; low: number; mid: number; high: number } };
}
const files = import.meta.glob('../data/weather/*.json', { eager: true, import: 'default' }) as Record<string, Weather>;
export const WEATHER: Record<string, Weather> = Object.fromEntries(Object.entries(files).map(([p, d]) => [p.split('/').pop()!.replace('.json', ''), d]));

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

export const WeatherPage: React.FC<{ site: SiteData; siteId: string; eng?: Engine; onNext: () => void }> = ({ site, siteId, eng, onNext }) => {
  const w = WEATHER[siteId];
  const sim = eng?.weather_sim;
  if (!w) return <Box><p className="px-5 py-4 text-sm text-muted">Weather for this site runs on a laptop: python pipeline/weather.py, then pipeline/run_engine.py.</p></Box>;
  const A = w.annual, M = w.monthly, out = w.outlook?.yield_change;
  const months = MONTHS.map((m, i) => ({
    m, p10: M.yield_p10[i], p50: M.yield_p50[i], p90: M.yield_p90[i], base: M.yield_p10[i], band: M.yield_p90[i] - M.yield_p10[i],
    fut: out ? M.yield_p50[i] * (1 + out.mid) : undefined, ghi: M.ghi[i], clear: M.clear[i],
    cloudy: M.cloudy_days[i], rainy: M.rainy_days[i], dusty: M.dusty_days[i], rain: M.rain_mm[i], t: M.t[i],
  }));
  const worst = months.reduce((a, r) => (r.p50 < a.p50 ? r : a), months[0]);
  const best = months.reduce((a, r) => (r.p50 > a.p50 ? r : a), months[0]);
  const gen = sim ? MONTHS.map((m, i) => ({ m, dem: sim.monthly.demand[i], p50: sim.monthly.gen_p50[i], base: sim.monthly.gen_p10[i], band: sim.monthly.gen_p90[i] - sim.monthly.gen_p10[i], fut: sim.monthly.gen_outlook[i] })) : [];
  const L = A.loss_share;
  const losses = [
    { k: 'Clouds', v: L.cloud, c: 'var(--info)', why: 'Sunlight lost to cloud compared with a clear sky. Rainy-season months lose most.' },
    { k: 'Heat', v: L.heat, c: 'var(--bad)', why: `Panels lose about ${(w.assumptions.temp_coef_per_c * 100).toFixed(1)}% per degree above 25 C. Average daily high ${n1(avg(M.tmax))} C.` },
    { k: 'Dust on panels', v: L.dust_on_panels, c: 'var(--warn)', why: `Builds up faster on hazy, dusty days; washed off by ${w.assumptions.rain_wash_mm} mm of rain or cleaning every ${w.assumptions.cleaning_every_days} days.` },
  ];
  const maxLoss = Math.max(...losses.map(l => l.v), 0.01);
  const wi = eng?.weather_inputs;
  const tone = (u: number) => (u > 0.05 ? 'bad' : u > 0.01 ? 'warn' : 'ok') as 'bad' | 'warn' | 'ok';

  return (
    <>
      <Box>
        <div className="px-5 py-4">
          <p className="text-xs text-muted">Sun and weather at {site.name}, {w.years[0]} to {w.years[1]}</p>
          <p className="mt-1 text-lg leading-snug max-w-4xl text-balance">
            Each kilowatt of solar panels here makes about <b className="font-semibold tabular-nums">{n1(A.yield_kwh_kwp_day)} kWh a day</b>,
            from {n1(worst.p50)} in {worst.m} to {n1(best.p50)} in {best.m}. Clouds take {pc(L.cloud)} of a clear sky's output, heat {pc(L.heat)} and dust on the panels {pc(L.dust_on_panels)}.
            {out && <> Climate models expect {out.mid >= 0 ? 'about the same or slightly more' : 'slightly less'} sun over 2027 to 2036 ({out.low >= 0 ? '+' : ''}{pc(out.low)} to {out.high >= 0 ? '+' : ''}{pc(out.high)}).</>}
          </p>
          <Cite className="mt-2" label="Built from" k={['nasapower', 'cmip6', 'assumption']} />
        </div>
      </Box>

      <StatStrip cols={4} stats={[
        { label: 'Cloudy days a year', value: n0(A.days.cloudy), unit: 'days', tint: 'var(--info)', note: <>Output {A.yield_on.cloudy != null ? n1(A.yield_on.cloudy) : '-'} kWh/kWp against {n1(A.yield_on.normal)} on a normal day. Cloudy: under {pc(w.assumptions.cloudy_below_clear_sky)} of clear-sky sun.</> },
        { label: 'Rainy days a year', value: n0(A.days.rainy), unit: 'days', tint: 'var(--info)', note: <>Output {A.yield_on.rainy != null ? n1(A.yield_on.rainy) : '-'} kWh/kWp. Rainy: {w.assumptions.rainy_mm} mm or more. Rain also washes the panels.</> },
        { label: 'Dusty or hazy days a year', value: n0(A.days.dusty), unit: 'days', tint: 'var(--warn)', note: <>Output {A.yield_on.dusty != null ? n1(A.yield_on.dusty) : '-'} kWh/kWp. Dusty: aerosol optical depth {w.assumptions.dusty_aod} or more (Harmattan dust, smoke, haze).</> },
        { label: 'Longest dull spell', value: n0(A.longest_low_spell_days.median), unit: 'days, typical year', tint: 'var(--muted)', note: <>Worst year {A.longest_low_spell_days.worst} days in a row under 60% of the month's usual output. Sets how many days of battery to carry.</> },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Box>
          <BoxHeader title="Solar output per kW of panels" meta="kWh a day, by month: range across 10 years, typical, and 2027 to 2036 outlook" />
          <div className="px-3 pb-2 h-[280px]">
            <ResponsiveChart summary={`Output per kWp ranges from ${n1(worst.p50)} kWh a day in ${worst.m} to ${n1(best.p50)} in ${best.m}.`}>
              <ComposedChart data={months} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="m" {...axisProps} tickFormatter={monthTick} interval={0} />
                <YAxis {...axisProps} width={40} domain={[0, 'auto']} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipCard title={String(label)} rows={[
                    { label: 'Typical', value: `${n1(Number(payload[0].payload.p50))} kWh`, color: 'var(--sun)' },
                    { label: 'Worst to best year', value: `${n1(Number(payload[0].payload.p10))} to ${n1(Number(payload[0].payload.p90))}` },
                    ...(out ? [{ label: '2027 to 2036', value: `${n1(Number(payload[0].payload.fut))} kWh`, color: 'var(--ok)' }] : []),
                  ]} />) : null} />
                <Area dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area dataKey="band" stackId="b" stroke="none" fill="var(--sun)" fillOpacity={0.22} />
                <Line dataKey="p50" stroke="var(--sun)" strokeWidth={2.5} dot={false} />
                {out && <Line dataKey="fut" stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />}
              </ComposedChart>
            </ResponsiveChart>
          </div>
          <div className="px-5 pb-4"><Legend items={[{ label: 'Typical year', color: 'var(--sun)' }, { label: 'P10 to P90 year', color: 'color-mix(in srgb, var(--sun) 30%, transparent)' }, ...(out ? [{ label: '2027 to 2036 outlook', color: 'var(--ok)' }] : [])]} /></div>
        </Box>
        <Box>
          <BoxHeader title="Bad-weather days by month" meta="Average days a month; a day can count in more than one" />
          <div className="px-3 pb-2 h-[280px]">
            <ResponsiveChart summary={`About ${A.days.cloudy} cloudy, ${A.days.rainy} rainy and ${A.days.dusty} dusty days a year.`}>
              <BarChart data={months} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="m" {...axisProps} tickFormatter={monthTick} interval={0} />
                <YAxis {...axisProps} width={32} />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipCard title={String(label)} rows={[
                    { label: 'Cloudy', value: `${n0(Number(payload[0].payload.cloudy))} days`, color: 'var(--other)' },
                    { label: 'Rainy', value: `${n0(Number(payload[0].payload.rainy))} days (${n0(Number(payload[0].payload.rain))} mm)`, color: 'var(--info)' },
                    { label: 'Dusty or hazy', value: `${n0(Number(payload[0].payload.dusty))} days`, color: 'var(--warn)' },
                    { label: 'Mean temperature', value: `${n1(Number(payload[0].payload.t))} C` },
                  ]} />) : null} />
                <Bar dataKey="cloudy" fill="var(--other)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="rainy" fill="var(--info)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dusty" fill="var(--warn)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveChart>
          </div>
          <div className="px-5 pb-4"><Legend items={[{ label: 'Cloudy', color: 'var(--other)' }, { label: 'Rainy', color: 'var(--info)' }, { label: 'Dusty or hazy', color: 'var(--warn)' }]} /></div>
        </Box>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] [&>*]:min-w-0">
        <Box>
          <BoxHeader title="Where the sunshine goes" meta="Share of a clear sky's output lost over a year" />
          <div className="px-5 pb-5 space-y-4">
            {losses.map(l => (
              <div key={l.k}>
                <div className="flex justify-between text-sm"><span>{l.k}</span><span className="tabular-nums">{pc(l.v)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(l.v / maxLoss) * 100}%`, background: l.c }} /></div>
                <p className="text-xs text-muted mt-1">{l.why}</p>
              </div>
            ))}
            <p className="text-xs text-muted">Plus {pc(1 - w.assumptions.system)} for the inverter, wiring and mismatch. Overall {pc(A.performance_ratio)} of the sunlight on the panels becomes usable power (rough guide).</p>
            <Cite k={['nasapower', 'assumption']} />
          </div>
        </Box>
        {sim && (
          <Box>
            <BoxHeader title="Solar made against demand, by month" meta={`P50 system (${n0(eng!.designs.find(d => d.design.startsWith('P50'))!.pv_kwp)} kWp) against year-5 demand, kWh a day`} />
            <div className="px-3 pb-2 h-[260px]">
              <ResponsiveChart summary="Monthly solar output of the P50 system against year-5 demand.">
                <ComposedChart data={gen} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="m" {...axisProps} tickFormatter={monthTick} interval={0} />
                  <YAxis {...axisProps} width={44} domain={[0, 'auto']} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <TooltipCard title={String(label)} rows={[
                      { label: 'Solar, typical', value: `${n0(Number(payload[0].payload.p50))} kWh`, color: 'var(--sun)' },
                      { label: 'Solar, worst to best year', value: `${n0(Number(payload[0].payload.base))} to ${n0(Number(payload[0].payload.base) + Number(payload[0].payload.band))}` },
                      { label: 'Demand, year 5', value: `${n0(Number(payload[0].payload.dem))} kWh`, color: 'var(--fg)' },
                    ]} />) : null} />
                  <Area dataKey="base" stackId="g" stroke="none" fill="transparent" isAnimationActive={false} />
                  <Area dataKey="band" stackId="g" stroke="none" fill="var(--sun)" fillOpacity={0.22} />
                  <Line dataKey="p50" stroke="var(--sun)" strokeWidth={2.5} dot={false} />
                  <Line dataKey="dem" stroke="var(--fg)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveChart>
            </div>
            <div className="px-5 pb-4"><Legend items={[{ label: 'Solar made, typical', color: 'var(--sun)' }, { label: 'Worst to best year', color: 'color-mix(in srgb, var(--sun) 30%, transparent)' }, { label: 'Demand, year 5', color: 'var(--fg)' }]} />
              <p className="text-xs text-muted mt-2">Solar above demand charges the battery for the night; the battery covers evening use. Months where the band dips toward the dashed line are where brownouts come from.</p></div>
          </Box>
        )}
      </div>

      {sim && (
        <Box>
          <BoxHeader title="10 years of real weather" meta="Day by day: solar in, battery, year-5 demand out" />
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-sm tabular-nums min-w-[680px]">
              <thead><tr className="text-left text-xs text-muted border-b border-line">
                <th className="py-2 pr-3 font-normal">System</th><th className="py-2 pr-3 font-normal text-right">Demand not served</th><th className="py-2 pr-3 font-normal text-right">Worst year</th>
                <th className="py-2 pr-3 font-normal text-right">Short days a year</th><th className="py-2 pr-3 font-normal text-right">Worst month</th><th className="py-2 font-normal text-right">2027 to 2036 weather</th>
              </tr></thead>
              <tbody>
                {sim.designs.map((r, i) => {
                  const wm = r.monthly_unmet_share.reduce((a, v, k) => (v > r.monthly_unmet_share[a] ? k : a), 0);
                  const f = sim.designs_outlook[i];
                  return (
                    <tr key={r.design} className="border-b border-line/60">
                      <td className="py-2 pr-3 whitespace-nowrap">{r.design.split(' ')[0]} of year-5 demand</td>
                      <td className="py-2 pr-3 text-right"><StatusDot tone={tone(r.unmet_share)}>{pc(r.unmet_share)}</StatusDot></td>
                      <td className="py-2 pr-3 text-right">{pc(r.worst_year_unmet_share)}</td>
                      <td className="py-2 pr-3 text-right">{n0(r.shortfall_days_per_year)}</td>
                      <td className="py-2 pr-3 text-right">{r.monthly_unmet_share[wm] > 0 ? `${MONTHS[wm]} (${pc(r.monthly_unmet_share[wm])})` : 'none'}</td>
                      <td className="py-2 text-right">{pc(f.unmet_share)} not served</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-3 max-w-prose">Demand is the most likely year-5 forecast; the P25 system is built for less than that, so it falls short most often. A short day is one with more than 10% of the day's use unserved. This uses daily totals and the engine's battery size, a rough guide; the hourly files in forecast/ go into HOMER or REopt for detailed design.</p>
            <Cite className="mt-2" k={['nasapower', 'engine', 'cmip6']} />
          </div>
        </Box>
      )}

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {wi && (
          <Box>
            <BoxHeader title="What the weather changed in the model" meta="Fed into Fereshteh's engine (forecast/assumptions.yaml settings)" />
            <ul className="px-5 pb-5 space-y-2 text-sm">
              <li className="flex justify-between gap-3"><span className="text-muted">Sun hours used for sizing (third-worst month)</span><span className="tabular-nums">{n1(wi.peak_sun_hours)} kWh/m² a day</span></li>
              <li className="flex justify-between gap-3"><span className="text-muted">Share of sunlight that becomes power</span><span className="tabular-nums">{pc(wi.performance_ratio)}</span></li>
              <li className="flex justify-between gap-3"><span className="text-muted">Day-to-day swing in solar after a day of battery</span><span className="tabular-nums">{pc(wi.daily_pv_variability)}</span></li>
              <li className="flex justify-between gap-3"><span className="text-muted">Days of battery carried</span><span className="tabular-nums">{n1(wi.autonomy_days)}</span></li>
              <li className="flex justify-between gap-3"><span className="text-muted">Monthly temperature (drives fan and fridge use)</span><span className="tabular-nums">{n0(Math.min(...wi.monthly_mean_temp_c))} to {n0(Math.max(...wi.monthly_mean_temp_c))} C</span></li>
            </ul>
          </Box>
        )}
        {w.outlook && (
          <Box>
            <BoxHeader title="Climate outlook, 2027 to 2036" meta={`Five CMIP6 models, ${w.outlook.scenario}, change against ${w.outlook.baseline[0]} to ${w.outlook.baseline[1]}`} />
            <div className="px-5 pb-5 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-3 font-normal">Model</th><th className="py-2 pr-3 font-normal text-right">Sunlight</th><th className="py-2 pr-3 font-normal text-right">Temperature</th><th className="py-2 font-normal text-right">Solar output</th></tr></thead>
                <tbody>
                  {w.outlook.models.map((m, i) => (
                    <tr key={m.model} className="border-b border-line/60">
                      <td className="py-1.5 pr-3">{m.model}</td>
                      <td className="py-1.5 pr-3 text-right">{avg(m.rsds_pct) >= 0 ? '+' : ''}{n1(avg(m.rsds_pct))}%</td>
                      <td className="py-1.5 pr-3 text-right">{avg(m.tas_c) >= 0 ? '+' : ''}{n1(avg(m.tas_c))} C</td>
                      <td className="py-1.5 text-right">{out ? `${out.models[i] >= 0 ? '+' : ''}${n1(out.models[i] * 100)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted mt-3">Models change the sunlight reaching the ground through clouds and aerosols; warming adds heat loss. Small next to year-to-year swings, so the 10-year history above carries most of the risk.</p>
            </div>
          </Box>
        )}
      </div>
      <div className="flex justify-end"><button onClick={onNext} className={`${btn.primary} h-11 px-6`}>Next: does it work?</button></div>
    </>
  );
};
