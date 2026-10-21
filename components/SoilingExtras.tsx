import React, { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { SystemConfig } from '../types';
import { Box, BoxHeader, StatusDot, TooltipCard, Legend, CHART, axisProps, btn, ResponsiveChart, CountUp } from './ui';
import { Cite } from './Sources';
import { getLastClean, LAST_CLEAN_EVENT, useCap } from './runtime';
import { Risk, RISK_TONE, RISK_MEANING, classifyFault, waStatus, hoursText, WA_DAILY_CAP, WA_COOLDOWN_H, WaSend, phoneKey, siteKey, checkPhone } from './risk';
import { soilLossFor } from './solarModel';

const DAY = 86400000;
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const daysBetween = (a: Date, b: Date) => Math.max(0, Math.floor((b.getTime() - a.getTime()) / DAY));

// Dust loss after d dry days, from the same model as the simulator
const loss = (d: number) => soilLossFor(d, false);
const lostKwh = (days: number, dailyKwh: number) => {
  let s = 0;
  for (let d = 1; d <= days; d++) s += loss(d) * dailyKwh;
  return s;
};

/** The cleaning interval that costs least per day: cleaning cost spread over the interval plus energy lost to dust. */
export function bestInterval(dailyKwh: number, tariff: number, cleanCost: number) {
  let best = { days: 30, perDay: Infinity };
  for (let t = 3; t <= 90; t++) {
    const perDay = (cleanCost + lostKwh(t, dailyKwh) * tariff) / t;
    if (perDay < best.perDay) best = { days: t, perDay };
  }
  return best;
}

/** Last cleaning date: from the maintenance log, otherwise a value the viewer set. */
function useLastClean() {
  const [fromLog, setFromLog] = useState<string | null>(getLastClean());
  useEffect(() => {
    const on = () => setFromLog(getLastClean());
    window.addEventListener(LAST_CLEAN_EVENT, on);
    return () => window.removeEventListener(LAST_CLEAN_EVENT, on);
  }, []);
  return fromLog;
}

// ---------- Today: what needs doing, at the top of the Maintenance tab ----------
export const TodayStrip: React.FC<{ config: SystemConfig; annualGen: number; highRisk: number; sample: boolean; dueChecks: number | null }> = ({ config, annualGen, highRisk, sample, dueChecks }) => {
  const logged = useLastClean();
  const last = logged ? new Date(logged) : new Date(Date.now() - 12 * DAY);
  const plan = bestInterval(annualGen / 365, config.unitPrice, 200);
  const left = plan.days - daysBetween(last, new Date());
  const due = new Date(last.getTime() + plan.days * DAY);
  const tiles = [
    { href: '#alerts', label: 'High risk items', value: String(highRisk), tone: highRisk ? 'var(--bad)' : 'var(--ok)',
      note: sample ? 'Sample faults for practice' : highRisk ? 'Fix within a day' : 'Nothing urgent', go: 'See alerts' },
    { href: '#cleaning', label: 'Next cleaning', value: left <= 0 ? 'Now' : due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      tone: left <= 0 ? 'var(--warn)' : 'var(--fg)', note: left <= 0 ? 'Cleaning is due' : `In ${left} day${left > 1 ? 's' : ''}`, go: 'Cleaning planner' },
    { href: '#checks', label: 'Checks due', value: dueChecks === null ? '…' : String(dueChecks), tone: dueChecks ? 'var(--warn)' : 'var(--ok)',
      note: dueChecks === null ? 'Loading' : dueChecks ? 'Due or never done' : 'All up to date', go: 'Maintenance log' },
  ];
  return (
    <section aria-label="Today" className="grid grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
      {tiles.map(t => (
        <a key={t.href} href={t.href} className="group bg-surface px-4 sm:px-5 py-4 min-w-0 hover:bg-surface-2 transition-colors">
          <p className="text-xs text-muted truncate">{t.label}</p>
          <p className="mt-1 font-display font-semibold text-[26px] sm:text-[28px] leading-none tabular-nums truncate" style={{ color: t.tone }}>{t.value}</p>
          <p className="mt-1.5 text-xs text-muted leading-snug">{t.note}</p>
          <p className="mt-2 text-xs text-silver group-hover:text-fg">{t.go} →</p>
        </a>
      ))}
    </section>
  );
};

const isMonsoon = (d: Date) => d.getMonth() >= 5 && d.getMonth() <= 8;

// ---------- 6 + 7. Cleaning planner and rupees lost to dust ----------

export const CleaningPlanner: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const logged = useLastClean();
  const [manual, setManual] = useState(() => new Date(Date.now() - 12 * DAY).toISOString().slice(0, 10));
  const [cost, setCost] = useState(200);
  const last = logged ? new Date(logged) : new Date(manual);
  const today = new Date();
  const daily = annualGen / 365;
  const days = daysBetween(last, today);
  const plan = useMemo(() => bestInterval(daily, config.unitPrice, cost), [daily, config.unitPrice, cost]);
  const lostSoFar = lostKwh(days, daily);
  const perDayNow = loss(Math.max(1, days)) * daily * config.unitPrice;
  const due = new Date(last.getTime() + plan.days * DAY);
  const overdue = days >= plan.days;
  const upcoming = Array.from({ length: 3 }, (_, i) => new Date((overdue ? today.getTime() : due.getTime()) + i * plan.days * DAY));

  const curve = useMemo(() => Array.from({ length: 61 }, (_, d) => ({
    d,
    rupees: +(loss(d) * daily * config.unitPrice).toFixed(1),
  })), [daily, config.unitPrice]);

  const CurveTip = ({ active, payload }: any) => active && payload?.length
    ? <TooltipCard title={`Day ${payload[0].payload.d} after cleaning`} rows={[{ label: 'Lost that day', value: inr(payload[0].value), color: CHART.negative }]} />
    : null;

  return (
    <Box>
      <BoxHeader title="Cleaning planner" meta={logged ? 'Last cleaning from the maintenance log' : 'Set the last cleaning date'} />
      <p className="px-5 text-sm text-muted max-w-prose">
        Dirt builds up a little every dry day. Cleaning too often wastes effort, too rarely wastes power. This finds the best gap between cleanings for this school.
      </p>

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        <div className="col-span-2 lg:col-span-1 bg-surface px-5 py-4">
          <p className="text-xs text-muted">Next cleaning</p>
          <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums" style={{ color: overdue ? CHART.negative : undefined }}>
            {overdue ? 'Now' : fmtDate(due)}
          </p>
          <p className="mt-1.5 text-xs text-muted">{overdue ? `${days - plan.days} days overdue` : `in ${daysBetween(today, due)} days`} · clean every {plan.days} days</p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="text-xs text-muted">Lost to dust since cleaning</p>
          <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums" style={{ color: CHART.negative }}><CountUp value={inr(lostSoFar * config.unitPrice)} /></p>
          <p className="mt-1.5 text-xs text-muted">{Math.round(lostSoFar)} kWh over {days} days</p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="text-xs text-muted">Losing today</p>
          <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums"><CountUp value={inr(perDayNow)} /></p>
          <p className="mt-1.5 text-xs text-muted">{Math.round(loss(days) * 100)}% of output</p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="text-xs text-muted">Last cleaned</p>
          <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums">{fmtDate(last)}</p>
          <p className="mt-1.5 text-xs text-muted">{days} days ago</p>
        </div>
      </div>

      <div className="px-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
        {!logged && (
          <div>
            <label htmlFor="clean-last" className="block text-xs text-muted mb-1">Last cleaned on</label>
            <input id="clean-last" type="date" value={manual} max={today.toISOString().slice(0, 10)} onChange={e => setManual(e.target.value)} className="h-9 w-full bg-bg border border-line rounded-ctl px-3 text-sm text-fg focus:outline-none focus:border-silver" />
          </div>
        )}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="clean-cost" className="text-xs text-muted">Cost of one cleaning (water, helper's time)</label>
            <span className="text-xs text-fg tabular-nums">{inr(cost)}</span>
          </div>
          <input id="clean-cost" type="range" min={0} max={1000} step={50} value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Money lost each day as dirt builds up</h4>
        <Legend items={[{ label: 'Lost per day', color: CHART.negative }, { label: 'Best day to clean', color: CHART.sun }]} />
      </div>
      <div className="h-[200px] px-2 pt-2">
        <ResponsiveChart summary={`Money lost each day as dirt builds up: from nothing on cleaning day to about ${inr(curve[60].rupees)} a day after 60 days. The best gap between cleanings is ${plan.days} days.`}>
          <ComposedChart data={curve} margin={{ top: 10, right: 16, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="lostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={CHART.negative} stopOpacity={0.3} />
                <stop offset="1" stopColor={CHART.negative} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="d" type="number" domain={[0, 60]} ticks={[0, 10, 20, 30, 40, 50, 60]} {...axisProps} tickFormatter={v => `${v}d`} />
            <YAxis {...axisProps} width={48} tickFormatter={v => `₹${v}`} />
            <Tooltip content={<CurveTip />} cursor={{ stroke: CHART.faint }} />
            <Area type="monotone" dataKey="rupees" stroke={CHART.negative} strokeWidth={2} fill="url(#lostFill)" isAnimationActive={false} />
            <ReferenceLine x={plan.days} stroke={CHART.sun} strokeDasharray="4 3" label={{ value: `Clean at day ${plan.days}`, position: 'insideTopRight', fill: CHART.sun, fontSize: 11 }} />
            {days <= 60 && <ReferenceLine x={days} stroke={CHART.primary} strokeOpacity={0.6} label={{ value: 'Today', position: 'insideTopLeft', fill: '#e8e8ea', fontSize: 11 }} />}
          </ComposedChart>
        </ResponsiveChart>
      </div>

      <div className="p-5 space-y-1.5 text-sm">
        <p className="text-muted">Next three cleanings: <span className="text-fg">{upcoming.map(fmtDate).join(' · ')}</span></p>
        {upcoming.some(isMonsoon) && (
          <p><StatusDot tone="info" className="text-fg">Monsoon rain cleans the panels for free<Cite id="rain-cleans" />. Skip a cleaning if it rained hard in the last few days.</StatusDot></p>
        )}
        <p className="text-xs text-muted">Each cleaning stops about {inr(plan.perDay)} a day of combined loss. Mark cleanings in the maintenance log below to keep this up to date.</p>
      </div>
    </Box>
  );
};

// ---------- 8. Before and after cleaning ----------

export const BeforeAfter: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const logged = useLastClean();
  const daily = annualGen / 365;
  const interval = bestInterval(daily, config.unitPrice, 200).days;
  const cleanDay = logged ? new Date(logged) : new Date(Date.now() - 5 * DAY);
  // Days before the cleaning carry the dirt of a full interval; after it, dirt starts again from zero
  const data = Array.from({ length: 13 }, (_, i) => {
    const k = i - 6;
    const dirtyDays = k < 0 ? interval + k : k;
    const wobble = 0.97 + 0.03 * Math.sin((i + 1) * 2.3);
    const date = new Date(cleanDay.getTime() + k * DAY);
    return { k, label: k === 0 ? 'Cleaned' : fmtDate(date), kwh: +(daily * (1 - loss(dirtyDays)) * wobble).toFixed(1), after: k >= 0, future: date > new Date() };
  });
  const before = data.filter(d => d.k < 0).reduce((s, d) => s + d.kwh, 0) / 6;
  const after = data.filter(d => d.k >= 0 && !d.future).reduce((s, d, _, a) => s + d.kwh / a.length, 0);
  const gain = before > 0 && after > 0 ? ((after - before) / before) * 100 : 0;

  const Tip = ({ active, payload }: any) => active && payload?.length
    ? <TooltipCard title={payload[0].payload.label} rows={[{ label: payload[0].payload.after ? 'After cleaning' : 'Before cleaning', value: `${payload[0].value} kWh`, color: payload[0].payload.after ? CHART.positive : CHART.faint }]} />
    : null;

  return (
    <Box>
      <BoxHeader title="Did cleaning work?" meta={logged ? `Cleaning on ${fmtDate(cleanDay)}` : 'Example'} />
      <p className="px-5 text-sm text-muted max-w-prose">
        Energy made each day for a week before and after the last cleaning. A clear jump proves the cleaning paid off: a ready made science project for students.
      </p>
      <div className="px-5 pt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          {after > 0
            ? <StatusDot tone={gain > 3 ? 'ok' : 'warn'} className="text-fg">Output went up {gain.toFixed(0)}% after cleaning</StatusDot>
            : <span className="text-muted">Check back tomorrow for the first day after cleaning.</span>}
        </p>
        <Legend items={[{ label: 'Before', color: CHART.faint }, { label: 'After', color: CHART.positive }]} />
      </div>
      <div className="h-[200px] px-2 pt-2">
        <ResponsiveChart summary={`Energy each day for six days before and after the last cleaning: about ${before.toFixed(1)} kWh a day before and ${after.toFixed(1)} kWh a day after.`}>
          <ComposedChart data={data.filter(d => !d.future)} margin={{ top: 10, right: 16, left: -4, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval={1} />
            <YAxis {...axisProps} width={44} tickFormatter={v => `${v}`} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="kwh" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {data.filter(d => !d.future).map(d => <Cell key={d.k} fill={d.after ? CHART.positive : CHART.faint} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveChart>
      </div>
      <p className="px-5 pb-5 pt-2 text-xs text-muted">
        {logged ? 'Daily energy in kWh, from the dust model until the sensors report each day.' : 'This is an example. Mark a cleaning in the maintenance log to see your own.'}
      </p>
    </Box>
  );
};

// ---------- 9. Dust risk outlook ----------

type Region = 'north' | 'west' | 'south' | 'east';
const REGION: Record<string, Region> = {
  Punjab: 'north', Haryana: 'north', Delhi: 'north', Chandigarh: 'north', 'Uttar Pradesh': 'north', 'Himachal Pradesh': 'north', Uttarakhand: 'north', 'Jammu and Kashmir': 'north', Ladakh: 'north', Bihar: 'north', 'Madhya Pradesh': 'north', Jharkhand: 'north',
  Rajasthan: 'west', Gujarat: 'west', Maharashtra: 'west', 'Dadra and Nagar Haveli and Daman and Diu': 'west', Goa: 'west',
  Assam: 'east', 'Arunachal Pradesh': 'east', Meghalaya: 'east', Manipur: 'east', Mizoram: 'east', Nagaland: 'east', Tripura: 'east', Sikkim: 'east', 'West Bengal': 'east', Odisha: 'east', 'Andaman and Nicobar Islands': 'east',
};
// 0 low, 1 some, 2 high, 3 very high, by month
const RISK: Record<Region, number[]> = {
  north: [2, 2, 2, 3, 3, 2, 0, 0, 1, 3, 3, 2],
  west: [2, 2, 3, 3, 3, 3, 1, 0, 1, 2, 2, 2],
  south: [2, 2, 3, 3, 3, 1, 0, 0, 1, 1, 1, 2],
  east: [1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1],
};
const WHY: Record<Region, string[]> = {
  north: ['Winter haze and smog', 'Dry, hazy days', 'Dry spring winds', 'Dust storms begin', 'Peak dust storms', 'Storms before the monsoon', 'Monsoon rain washes panels', 'Monsoon rain washes panels', 'Rain eases off', 'Crop stubble burning', 'Smoke and smog', 'Winter haze'],
  west: ['Dry winter', 'Dry winter', 'Dry, hot winds', 'Desert dust', 'Desert dust storms', 'Dust storms before the rain', 'Monsoon rain', 'Monsoon rain washes panels', 'Rain eases off', 'Dry after the rain', 'Dry, dusty fields', 'Dry winter'],
  south: ['Dry winter', 'Dry season begins', 'Hot and dry', 'Hottest, driest weeks', 'Dry winds before the rain', 'Monsoon arrives', 'Monsoon rain washes panels', 'Monsoon rain washes panels', 'Rain eases off', 'Northeast monsoon showers', 'Northeast monsoon showers', 'Last northeast monsoon showers'],
  east: ['Dry winter', 'Dry spells', 'Pre-monsoon storms', 'Pre-monsoon storms', 'Early rain', 'Monsoon rain', 'Monsoon rain', 'Monsoon rain', 'Monsoon rain', 'Rain eases off', 'Dry winter begins', 'Dry winter'],
};
const RISK_LABEL = ['Low', 'Some', 'High', 'Very high'];
const RISK_COLOR = [CHART.positive, CHART.sun, '#ff9a3d', CHART.negative];

export const DustOutlook: React.FC<{ config: SystemConfig }> = ({ config }) => {
  const region = REGION[config.state] ?? 'south';
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * DAY);
    // gentle day-to-day variation around the month's typical level
    const base = RISK[region][d.getMonth()];
    const level = Math.max(0, Math.min(3, base + (Math.sin(d.getDate() * 1.7) > 0.75 ? 1 : 0) - (Math.sin(d.getDate() * 2.9) > 0.85 ? 1 : 0)));
    return { d, level };
  });
  const high = days.filter(x => x.level >= 2).length;
  const firstCalm = days.find((x, i) => i > 0 && x.level <= 1 && days[i - 1].level >= 2);

  return (
    <Box>
      <BoxHeader title="Dust risk, next 2 weeks" meta={`${config.state} · typical pattern`} />
      <p className="px-5 text-sm text-muted max-w-prose">{WHY[region][new Date().getMonth()]}. Plan cleanings for just after dusty spells, not just before them.</p>
      <div className="m-5 grid grid-cols-7 gap-1.5">
        {days.map(({ d, level }) => (
          <div key={d.toISOString()} className="rounded-ctl border border-line px-1.5 py-2 text-center" title={`${fmtDate(d)}: ${RISK_LABEL[level]} dust risk`}>
            <p className="text-[11px] text-muted">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
            <p className="text-xs text-fg tabular-nums">{d.getDate()}</p>
            <span className="mt-1.5 mx-auto block h-1.5 w-6 rounded-full" style={{ background: RISK_COLOR[level] }} />
          </div>
        ))}
      </div>
      <div className="px-5 pb-5 space-y-1.5 text-sm">
        <p>
          <StatusDot tone={high >= 7 ? 'bad' : high >= 3 ? 'warn' : 'ok'} className="text-fg">
            {high} of the next 14 days have high dust risk.
          </StatusDot>
        </p>
        {firstCalm && high >= 3 && <p className="text-muted">Best time to clean: around {fmtDate(firstCalm.d)}, when the dusty spell eases.</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {RISK_LABEL.map((l, i) => <span key={l} className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-4 rounded-full" style={{ background: RISK_COLOR[i] }} />{l}</span>)}
        </div>
        <p className="text-xs text-muted">Based on the usual seasons for this region, not a live weather forecast<Cite id={['imd-monsoon', 'ne-monsoon', 'stubble']} />. Dust builds up about 0.3 to 0.6% a day in dry weather<Cite id="soiling" />.</p>
      </div>
    </Box>
  );
};

// ---------- 10. Panel health map ----------

export const PanelHealth: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const logged = useLastClean();
  const daily = annualGen / 365;
  const days = logged ? daysBetween(new Date(logged), new Date()) : 12;
  const n = Math.max(2, Math.ceil((config.systemSize * 1000) / 540));
  const [sel, setSel] = useState<number | null>(null);

  const panels = Array.from({ length: n }, (_, i) => {
    let pct = 100 * (1 - loss(days)) + Math.sin(i * 3.1) * 1.5;
    let note = 'Working normally.';
    let fix = 'Nothing to do.';
    if (i === 0) { pct -= 14; note = 'Low in the morning only: likely shade from the east side.'; fix = 'Check for a tree branch or new structure east of the array at 8 am.'; }
    if (i === n - 3) { pct -= 11; note = 'Low all day while its neighbours are fine: a hot spot, cracked cell or loose connector.'; fix = 'Tell the technician. Do not touch the panel.'; }
    return { i, pct: Math.max(0, pct), note, fix };
  });
  const top = Math.max(...panels.map(p => p.pct));
  const tone = (p: number) => (p >= top * 0.94 ? 'ok' : p >= top * 0.86 ? 'warn' : 'bad');
  const color = { ok: CHART.positive, warn: CHART.sun, bad: CHART.negative };
  const flagged = panels.filter(p => tone(p.pct) !== 'ok');
  const cur = sel !== null ? panels[sel] : null;

  return (
    <Box>
      <BoxHeader title="Panel health map" meta={`${n} panels · sample readings`} />
      <p className="px-5 text-sm text-muted max-w-prose">Each square is one panel, seen from above. One weak panel can hide inside a normal-looking total, so this compares each panel with its neighbours.</p>
      <div className="p-5 grid md:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(5, n)}, minmax(0, 1fr))` }}>
            {panels.map(p => {
              const t = tone(p.pct);
              return (
                <button
                  key={p.i}
                  onClick={() => setSel(p.i)}
                  aria-pressed={sel === p.i}
                  aria-label={`Panel ${p.i + 1}, ${Math.round(p.pct)}% output`}
                  className={`aspect-[3/4] rounded-ctl border flex flex-col items-center justify-center gap-0.5 transition-colors ${sel === p.i ? 'border-silver' : 'border-line hover:border-[#3a3a42]'}`}
                  style={{ background: `color-mix(in srgb, ${color[t]} ${t === 'ok' ? 10 : 22}%, #18284a)` }}
                >
                  <span className="text-[11px] text-muted">P{p.i + 1}</span>
                  <span className="font-display font-semibold text-lg tabular-nums" style={{ color: color[t] }}>{Math.round(p.pct)}%</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">South edge of the roof is at the bottom. Percent of a clean, new panel's output.</p>
        </div>
        <div className="bg-surface-2 border border-line rounded-box p-4 space-y-2 min-h-[150px]" aria-live="polite">
          {cur ? (
            <>
              <StatusDot tone={tone(cur.pct)} className="text-xs text-muted">Panel {cur.i + 1} · {Math.round(cur.pct)}%</StatusDot>
              <p className="text-sm text-fg leading-relaxed">{cur.note}</p>
              <p className="text-sm text-muted leading-relaxed"><span className="text-fg">What to do: </span>{cur.fix}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-fg">{flagged.length ? `${flagged.length} panel${flagged.length > 1 ? 's' : ''} need a look.` : 'All panels look even.'}</p>
              <p className="text-sm text-muted">Tap a panel for details. All panels show dirt at {Math.round(loss(days) * 100)}% after {days} days.</p>
            </>
          )}
        </div>
      </div>
      <p className="px-5 pb-5 -mt-2 text-xs text-muted">Sample readings to show how this works. Real per-panel numbers need panel-level sensors or optimisers.</p>
    </Box>
  );
};

// ---------- 11. Alerts ----------

const PHONE_KEY = 'bhanu-alert-phone';

const WA_LOCAL = 'bhanu-wa-sends';
const readSends = (): WaSend[] => { try { return JSON.parse(localStorage.getItem(WA_LOCAL) || '[]'); } catch { return []; } };

/** WhatsApp sends, shared through the page's `whatsapp` collection so every teacher sees the same limit. */
function useWaSends() {
  const [sends, setSends] = useState<WaSend[]>(readSends);
  const [shared, setShared] = useState(false);
  const dbRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    useCap('db').then(db => {
      if (!alive || !db) return;
      dbRef.current = db;
      setShared(true);
      unsub = db.collection('whatsapp').orderBy('at', 'desc').limit(50).onSnapshot(
        (snap: { docs: { data(): Record<string, unknown> }[] }) => setSends(snap.docs.map(d => d.data() as unknown as WaSend)),
        () => setShared(false),
      );
    });
    return () => { alive = false; unsub?.(); };
  }, []);
  const record = async (alert: string, scope: { phone: string; site: string }) => {
    const s: WaSend = { alert, at: new Date().toISOString(), ...scope };
    if (dbRef.current) {
      try { await dbRef.current.collection('whatsapp').doc(`w${Date.now().toString(36)}`).set(s); return; } catch { /* fall back to this device */ }
    }
    const next = [s, ...sends].slice(0, 50);
    setSends(next);
    try { localStorage.setItem(WA_LOCAL, JSON.stringify(next)); } catch { /* storage may be blocked */ }
  };
  return { sends, record, shared };
}

interface Alert { id: string; risk: Risk; title: string; action: string }

/** Where the technician should go: the typed address, else village and state. */
export function siteAddress(config: SystemConfig) {
  const typed = (config.address ?? '').trim();
  const text = typed || [config.schoolName, config.village, config.state].filter(Boolean).join(', ');
  const map = (config.mapLink ?? '').trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(typed ? `${typed}, India` : [config.schoolName, config.village, config.state, 'India'].filter(Boolean).join(', '))}`;
  return { text, map, typed: !!typed };
}

/** One WhatsApp message for the whole site: where to go, then everything to fix there. */
export function siteMessage(config: SystemConfig, alerts: Alert[], sample = false) {
  const where = siteAddress(config);
  const lines = alerts.map((a, i) => `${i + 1}. [${a.risk.toUpperCase()}] ${a.title}. ${a.action}`);
  const high = alerts.some(a => a.risk === 'High');
  return [
    sample ? 'PRACTICE ONLY: these are sample faults from the Bhanu AI demo, not real problems. No visit is needed.' : '',
    `Bhanu AI: solar work needed at ${config.schoolName || 'the school'}`,
    `Address: ${where.text}`,
    `Map: ${where.map}`,
    '',
    `To fix on this visit (${alerts.length}):`,
    ...lines,
    '',
    high ? 'High risk items need a technician within a day. Do not let students touch the panels, cables or inverter until they are checked.' : '',
    'Please reply when the visit is booked, and log each repair in the Bhanu AI repair log.',
  ].filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n').trim();
}

// sample: the faults come from sample data, so they are tagged and any message says PRACTICE ONLY
export const Alerts: React.FC<{ config: SystemConfig; annualGen: number; faults: string[]; sample?: boolean }> = ({ config, annualGen, faults, sample = false }) => {
  const logged = useLastClean();
  const [phone, setPhone] = useState(() => { try { return localStorage.getItem(PHONE_KEY) || ''; } catch { return ''; } });
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { sends, record, shared } = useWaSends();
  useEffect(() => { try { localStorage.setItem(PHONE_KEY, phone); } catch { /* ignore */ } }, [phone]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const daily = annualGen / 365;
  const days = logged ? daysBetween(new Date(logged), new Date()) : null;
  const plan = bestInterval(daily, config.unitPrice, 200).days;
  const region = REGION[config.state] ?? 'south';
  const dustNext = RISK[region][new Date().getMonth()];

  const alerts: Alert[] = [];
  // One item per distinct open fault, each with its own risk level
  Array.from(new Set<string>(faults)).forEach((f: string) => {
    const risk = classifyFault(f);
    alerts.push({ id: `fault:${f}`, risk, title: f.replace(/\.$/, ''), action: risk === 'High' ? 'Check and repair within a day.' : risk === 'Medium' ? 'Check this week.' : 'Check at the next visit.' });
  });
  if (days === null) alerts.push({ id: 'nolog', risk: 'Low', title: 'No cleaning logged yet', action: 'Log the last panel cleaning in the maintenance log.' });
  else if (days >= plan * 2) alerts.push({ id: 'clean', risk: 'Medium', title: `Cleaning overdue (${days} days)`, action: 'Clean the panels with plain water and a soft brush, early morning.' });
  else if (days >= plan) alerts.push({ id: 'clean', risk: 'Low', title: `Panels due for cleaning (${days} days)`, action: 'Clean with plain water and a soft brush, early morning, with a teacher.' });
  if (dustNext >= 3) alerts.push({ id: 'dust', risk: 'Low', title: 'Very dusty season', action: 'Check the panels from the ground each week.' });
  const order: Record<Risk, number> = { High: 0, Medium: 1, Low: 2 };
  alerts.sort((x, y) => order[x.risk] - order[y.risk]);

  const counts = { High: 0, Medium: 0, Low: 0 } as Record<Risk, number>;
  alerts.forEach(a => counts[a.risk]++);
  const where = siteAddress(config);
  const msg = siteMessage(config, alerts, sample);
  // The same set of high risk problems is not sent twice within the cooldown; a new one can go straight away
  const sendId = 'site:' + alerts.filter(a => a.risk === 'High').map(a => a.id).sort().join('|');
  const scope = { phone: phoneKey(phone), site: siteKey(where.text) };
  const st = waStatus(sends, sendId, now, scope);
  const hasHigh = counts.High > 0;
  const phoneCheck = checkPhone(phone);
  const canSend = hasHigh && st.wait === 0 && phoneCheck === 'ok';

  const link = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };

  return (
    <Box>
      <BoxHeader title="Alerts" meta={alerts.length ? `${counts.High} high · ${counts.Medium} medium · ${counts.Low} low` : 'All clear'} />
      <p className="px-5 text-sm text-muted max-w-prose">
        Every item gets a risk level. When something is high risk, one WhatsApp message goes to the technician or teacher in charge with the site address and the full list of things to fix, so everything is done in one visit and nobody gets spammed.
      </p>

      {/* Where to go */}
      <div className="mx-5 mt-4 rounded-box border border-line bg-surface-2 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted">Site address</p>
          <p className="text-sm text-fg">{where.text}</p>
          {!where.typed && <p className="mt-1 text-xs text-warn">Add the full school address in the site settings (Overview tab) so the technician can find it.</p>}
        </div>
        <a href={where.map} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} shrink-0 whitespace-nowrap`}>Open in Maps</a>
      </div>

      <div className="px-5 pt-4 flex flex-wrap gap-x-6 gap-y-3 items-end">
        <div className="max-w-sm w-full sm:w-auto">
          <label htmlFor="alert-phone" className="block text-xs text-muted mb-1">Technician or teacher's WhatsApp number, with country code</label>
          <input id="alert-phone" aria-invalid={phoneCheck === 'invalid' || phoneCheck === 'no-code'} aria-describedby="alert-phone-hint" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="91 98765 43210" className="h-9 w-full sm:w-64 bg-bg border border-line rounded-ctl px-3 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:border-silver" />
          <p id="alert-phone-hint" className={`mt-1 text-xs ${phoneCheck === 'ok' ? 'text-ok' : phoneCheck === 'empty' ? 'text-muted' : 'text-warn'}`}>
            {phoneCheck === 'ok' ? 'Number looks right.' : phoneCheck === 'no-code' ? 'Add the country code at the start: 91 for India.' : phoneCheck === 'invalid' ? 'This does not look like a WhatsApp number. Use the country code, then the mobile number.' : 'Country code first, for example 91 98765 43210.'}
          </p>
        </div>
        <div className="text-xs text-muted">
          <p className="text-fg tabular-nums">{st.usedToday} of {WA_DAILY_CAP} messages sent to {scope.phone ? 'this number' : 'WhatsApp (no number set)'} about this site in the last 24 hours</p>
          <p>The limit is per phone number and per site: a different number or site has its own count. The same list is not sent again within {WA_COOLDOWN_H} hours.{shared ? ' Counted for everyone using this page.' : ' Counted on this device.'}</p>
        </div>
      </div>

      {/* What to fix */}
      <ul className="mt-4 border-t border-line divide-y divide-line">
        {alerts.length ? alerts.map((a, i) => (
          <li key={a.id} className="px-5 py-3 flex gap-3">
            <span className="text-xs text-muted tabular-nums w-4 pt-0.5">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{ color: `var(--${RISK_TONE[a.risk]})`, background: `color-mix(in srgb, var(--${RISK_TONE[a.risk]}) 14%, transparent)` }}>
                  {a.risk === 'High' && <span className="risk-pulse inline-block h-1.5 w-1.5 rounded-full bg-bad mr-1.5 align-middle" aria-hidden="true" />}{a.risk} risk
                </span>
                {sample && a.id.startsWith('fault:') && <span className="text-[11px] px-1.5 py-0.5 rounded border border-line text-muted">Sample</span>}
                <span className="text-sm text-fg">{a.title}</span>
              </p>
              <p className="mt-1 text-xs text-muted">{RISK_MEANING[a.risk]} {a.action}</p>
            </div>
          </li>
        )) : <li className="px-5 py-8 text-center text-sm text-muted">Nothing needs attention right now.</li>}
      </ul>

      {alerts.length > 0 && (
        <div className="px-5 py-4 border-t border-line space-y-3">
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted hover:text-fg">Preview the message</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-silver bg-bg border border-line rounded-ctl p-3 font-sans">{msg}</pre>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            {canSend ? (
              <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => record(sendId, scope)} className={btn.primary}>
                Send list on WhatsApp ({alerts.length} {alerts.length === 1 ? 'item' : 'items'})
              </a>
            ) : (
              <span className="text-xs text-muted">
                {!hasHigh ? 'No high risk items, so nothing is sent. The list stays here.'
                  : phoneCheck !== 'ok' ? 'Enter a valid WhatsApp number above to send this list.'
                  : st.cooldownLeft > 0 ? `This list was already sent. It can be sent again ${hoursText(st.cooldownLeft)}, or straight away if a new high risk item appears.`
                  : `Limit of ${WA_DAILY_CAP} messages to this number for this site reached. Next send ${hoursText(st.wait)}.`}
              </span>
            )}
            <button onClick={copy} className={btn.quiet}>{copied ? 'Copied' : 'Copy message'}</button>
          </div>
        </div>
      )}
      <p className="px-5 py-3 border-t border-line text-xs text-muted">Someone taps to send. Fully automatic messages need a WhatsApp or SMS service connected to the school's account.</p>
    </Box>
  );
};
