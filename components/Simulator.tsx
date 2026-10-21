import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SystemConfig } from '../types';
import { STATE_LAT } from '../constants';
import { Box, BoxHeader, CHART, btn } from './ui';
import { Cite } from './Sources';
import SchoolScene, { LoadKey } from './SchoolScene';
import { simulate, energySoFar, formatHour, SimInputs, SimOutputs, LOADS } from './solarModel';
import { StatusDot } from './ui';
import { markDone } from './runtime';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Typical afternoon air temperature in south and central India
const MONTH_TEMP = [29, 32, 35, 38, 40, 35, 32, 31, 31, 30, 29, 28];

type Preset = { key: string; label: string; cloud: number; haze: number; rain: boolean; wind?: number };
const PRESETS: Preset[] = [
  { key: 'clear', label: 'Clear', cloud: 0.05, haze: 0.08, rain: false },
  { key: 'hazy', label: 'Hazy', cloud: 0.1, haze: 0.55, rain: false },
  { key: 'partly', label: 'Partly cloudy', cloud: 0.5, haze: 0.12, rain: false },
  { key: 'overcast', label: 'Overcast', cloud: 0.92, haze: 0.15, rain: false },
  { key: 'rain', label: 'Monsoon rain', cloud: 1, haze: 0.05, rain: true, wind: 25 },
  { key: 'dust', label: 'Dust storm', cloud: 0.2, haze: 1, rain: false, wind: 45 },
];

const START = (config: SystemConfig): SimInputs => ({
  hour: 11,
  month: 2,
  lat: STATE_LAT[config.state] ?? 20,
  cloud: 0.05,
  haze: 0.08,
  rain: false,
  dustDays: 10,
  shade: 0,
  airTemp: MONTH_TEMP[2],
  wind: 8,
  size: config.systemSize,
  lights: true,
  fans: true,
  lab: true,
});

interface Ctx { best: number; dayKwh: number; ideal: number }
interface Challenge {
  id: string;
  title: string;
  story: string;
  setup: Partial<SimInputs>;
  check: (s: SimInputs, o: SimOutputs, c: Ctx) => boolean;
  progress: (s: SimInputs, o: SimOutputs, c: Ctx) => string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'rain',
    title: 'Rainy day lunch',
    story: 'It is pouring at noon. Keep the school off the grid between 11:30 and 12:30 by switching off what is not needed. You cannot change the weather.',
    setup: { cloud: 1, haze: 0.05, rain: true, wind: 25, hour: 12, lights: true, fans: true, lab: true },
    check: (s, o) => s.rain && s.hour >= 11.5 && s.hour <= 12.5 && o.gridKw >= 0,
    progress: (_, o) => `Solar ${o.acKw.toFixed(2)} kW, school uses ${o.loadKw.toFixed(2)} kW`,
  },
  {
    id: 'peak',
    title: 'Find the peak',
    story: 'Move the time to the moment the panels make the most power today.',
    setup: { hour: 8, cloud: 0.05, haze: 0.08, rain: false },
    check: (_, o, c) => o.acKw > 0.1 && o.acKw >= c.best * 0.98,
    progress: (_, o, c) => `Now ${o.acKw.toFixed(2)} kW, the best today is ${c.best.toFixed(2)} kW`,
  },
  {
    id: 'heat',
    title: 'Beat the heat',
    story: 'A hot, still, dusty noon. Get the panels to their best possible output without changing the sky or the time.',
    setup: { month: 2, hour: 12, cloud: 0.05, haze: 0.08, rain: false, airTemp: 40, wind: 5, dustDays: 20, shade: 0.15 },
    check: (s, o, c) => !s.rain && s.cloud <= 0.1 && s.hour >= 11.5 && s.hour <= 12.5 && o.acKw >= c.ideal * 0.95,
    progress: (_, o, c) => `Now ${o.acKw.toFixed(2)} kW, goal ${(c.ideal * 0.95).toFixed(2)} kW`,
  },
  {
    id: 'cloudy',
    title: 'Pay nothing on a cloudy day',
    story: 'It is overcast all day. Make the day\'s solar cover a 7 hour school day without changing the weather.',
    setup: { cloud: 0.92, haze: 0.15, rain: false, dustDays: 45, hour: 12, lights: true, fans: true, lab: true },
    check: (s, o, c) => s.cloud >= 0.9 && !s.rain && c.dayKwh >= o.loadKw * 7,
    progress: (_, o, c) => `Solar today ${c.dayKwh.toFixed(1)} kWh, school needs ${(o.loadKw * 7).toFixed(1)} kWh`,
  },
];

const Slider: React.FC<{
  id: string; label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; hint?: React.ReactNode;
}> = ({ id, label, value, min, max, step, display, onChange, hint }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <label htmlFor={id} className="text-xs text-muted">{label}</label>
      <span className="text-xs text-fg tabular-nums">{display}</span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full" />
    {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
  </div>
);

const Switch: React.FC<{ id: string; label: string; sub: string; on: boolean; onToggle: () => void }> = ({ id, label, sub, on, onToggle }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onToggle}
    className="w-full flex items-center justify-between gap-3 rounded-ctl border border-line px-3 py-2 text-left hover:bg-surface-2 transition-colors"
  >
    <span className="min-w-0">
      <span className="block text-sm text-fg">{label}</span>
      <span className="block text-xs text-muted">{sub}</span>
    </span>
    <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${on ? 'bg-ok' : 'bg-line'}`} aria-hidden="true">
      <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-fg transition-transform ${on ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
    </span>
  </button>
);

const Simulator: React.FC<{ config: SystemConfig }> = ({ config }) => {
  const [s, setS] = useState<SimInputs>(() => START(config));
  const [playing, setPlaying] = useState(false);
  const last = useRef<number | null>(null);

  // Follow the site settings
  useEffect(() => {
    setS(p => ({ ...p, size: config.systemSize, lat: STATE_LAT[config.state] ?? 20 }));
  }, [config.systemSize, config.state]);

  // Play: one school day (5 am to 7:30 pm) in about 30 seconds
  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (t: number) => {
      const dt = last.current === null ? 0 : (t - last.current) / 1000;
      last.current = t;
      setS(p => ({ ...p, hour: Math.min(19.5, p.hour + dt * 0.5) }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (playing && s.hour >= 19.5) setPlaying(false);
  }, [playing, s.hour]);

  const set = <K extends keyof SimInputs>(k: K, v: SimInputs[K]) => setS(p => ({ ...p, [k]: v }));
  const toggle = (k: LoadKey) => setS(p => ({ ...p, [k]: !p[k] }));

  const out = useMemo(() => simulate(s), [s]);
  const today = useMemo(() => energySoFar(s), [s]);
  const [activeCh, setActiveCh] = useState<string | null>(null);
  const [doneCh, setDoneCh] = useState<string[]>([]);
  const ctx = useMemo<Ctx>(() => {
    let best = 0;
    for (let h = 5; h <= 19.5; h += 0.1) best = Math.max(best, simulate({ ...s, hour: h }).acKw);
    return {
      best,
      dayKwh: energySoFar({ ...s, hour: 19.5 }),
      ideal: simulate({ ...s, dustDays: 0, shade: 0, airTemp: Math.min(s.airTemp, 20), wind: Math.max(s.wind, 30) }).acKw,
    };
  }, [s]);
  useEffect(() => { if (doneCh.length >= 2) markDone('challenges'); }, [doneCh.length]);
  const active = CHALLENGES.find(c => c.id === activeCh) ?? null;
  const activeMet = active ? active.check(s, out, ctx) : false;
  useEffect(() => {
    if (active && activeMet && !doneCh.includes(active.id)) setDoneCh(d => [...d, active.id]);
  }, [active, activeMet, doneCh]);
  const preset = PRESETS.find(p => Math.abs(p.cloud - s.cloud) < 0.01 && Math.abs(p.haze - s.haze) < 0.01 && p.rain === s.rain)?.key;
  const night = out.elevation <= 0;

  // Which single change would help most right now
  const tip = useMemo(() => {
    if (night) return 'The sun is down, so the panels make nothing. The school runs on grid power until morning.';
    const gain = (patch: Partial<SimInputs>) => simulate({ ...s, ...patch }).acKw - out.acKw;
    const options = [
      { kw: gain({ dustDays: 0 }), text: (k: string) => `Cleaning the panels would add about ${k} kW right now.` },
      { kw: gain({ shade: 0 }), text: (k: string) => `Trimming the tree that shades the panels would add about ${k} kW.` },
      { kw: gain({ wind: s.wind + 20 }), text: (k: string) => `The panels are hot. A stronger breeze would cool them and add about ${k} kW.` },
    ].filter(o => o.kw > 0.05).sort((a, b) => b.kw - a.kw);
    if (options.length) return options[0].text(options[0].kw.toFixed(2));
    if (s.cloud > 0.4 || s.rain) return 'Clouds are the biggest loss right now. Nothing to fix, the panels will recover when the sky clears.';
    if (s.haze > 0.4) return 'Dust in the air is blocking sunlight. It usually clears after rain.';
    return 'Conditions are good. This is close to the best this system can do at this hour.';
  }, [s, out, night]);

  const pctOfMax = Math.round((out.acKw / Math.max(0.1, s.size)) * 100);
  const sending = out.gridKw >= 0;

  return (
    <div className="space-y-6">
      <Box>
        <BoxHeader title="Live solar simulator" meta={`${MONTHS[s.month]} · ${formatHour(s.hour)}`} />
        <p className="px-5 text-sm text-muted">Change the weather, the season and the school's loads, and watch the power change.</p>

        <div className="relative mx-3 sm:mx-5 mt-4 rounded-box overflow-hidden border border-line">
          <SchoolScene
            schoolName={config.schoolName}
            place={`${config.village}, ${config.state} · ${config.systemSize} kWp solar`}
            env={s}
            out={out}
            viewBox="40 24 920 476"
            onToggle={toggle}
          />
          <div className="hidden sm:block absolute left-3 top-3 rounded-ctl bg-[rgba(11,11,13,0.72)] backdrop-blur px-2.5 py-1.5 text-[11px] sm:text-xs text-fg tabular-nums leading-relaxed">
            <div>{formatHour(s.hour)} · sun {Math.max(0, out.elevation).toFixed(0)}° high</div>
            <div className="text-muted">{s.airTemp} °C air · wind {s.wind} km/h</div>
          </div>
        </div>
        <p className="mx-5 mt-2 text-xs text-muted">Tip: click the switchboard next to the door to turn lights, fans and computers on or off. The sunlight maths uses standard clear-sky<Cite id="haurwitz" /> and cloud<Cite id="kasten" /> formulas.</p>

        <div className="mx-3 sm:mx-5 mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <button onClick={() => { if (s.hour >= 19.5) set('hour', 5); setPlaying(p => !p); }} className={`${btn.primary} min-w-[112px] whitespace-nowrap`}>
                  {playing ? (
                    <><svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1" /><rect x="9" y="3" width="3" height="10" rx="1" /></svg>Pause</>
                  ) : (
                    <><svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>Play day</>
                  )}
                </button>
                <div className="flex-1 min-w-[200px]">
                  <Slider id="sim-hour" label="Time of day" value={s.hour} min={5} max={19.5} step={0.05} display={formatHour(s.hour)} onChange={v => { setPlaying(false); set('hour', v); }} />
                </div>
                <div className="w-full sm:w-44">
                  <label htmlFor="sim-month" className="block text-xs text-muted mb-1">Month</label>
                  <select
                    id="sim-month"
                    value={s.month}
                    onChange={e => { const m = Number(e.target.value); setS(p => ({ ...p, month: m, airTemp: MONTH_TEMP[m] })); }}
                    className="w-full h-9 bg-bg border border-line rounded-ctl px-3 text-sm text-fg focus:outline-none focus:border-silver"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted mb-2">Weather</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setS(v => ({ ...v, cloud: p.cloud, haze: p.haze, rain: p.rain, wind: p.wind ?? v.wind }))}
                      aria-pressed={preset === p.key}
                      className={`h-8 px-3 rounded-ctl border text-sm transition-colors ${preset === p.key ? 'border-silver bg-surface-2 text-fg' : 'border-line text-muted hover:text-fg hover:bg-surface-2'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
        </div>

        {/* Live meter */}
        <div className="m-3 sm:m-5 grid grid-cols-2 lg:grid-cols-6 gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="col-span-2 bg-surface px-5 py-4">
            <p className="text-xs text-muted">Solar power now</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display font-semibold text-[40px] leading-none tabular-nums" style={{ color: out.acKw > 0.02 ? CHART.sun : undefined }}>{out.acKw.toFixed(2)}</span>
              <span className="text-sm text-muted">kW</span>
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pctOfMax}%`, background: `linear-gradient(90deg, ${CHART.sunLow}, ${CHART.sun})` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">{pctOfMax}% of the {s.size} kWp system</p>
          </div>
          {[
            { label: 'Sunlight on panels', value: Math.round(out.irradiance).toString(), unit: 'W/m²' },
            { label: 'Panel temperature', value: out.cellTemp.toFixed(0), unit: '°C' },
            { label: 'School is using', value: out.loadKw.toFixed(2), unit: 'kW' },
            {
              label: sending ? 'Sending to grid' : 'Buying from grid',
              value: Math.abs(out.gridKw).toFixed(2),
              unit: 'kW',
              color: sending ? CHART.monsoon : CHART.negative,
            },
          ].map(c => (
            <div key={c.label} className="bg-surface px-5 py-4">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-semibold text-[26px] leading-none tabular-nums" style={{ color: c.color }}>{c.value}</span>
                <span className="text-xs text-muted">{c.unit}</span>
              </p>
            </div>
          ))}
          <div className="col-span-2 lg:col-span-6 bg-surface px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Made today so far <span className="text-fg font-medium tabular-nums">{today.toFixed(1)} kWh</span>
              <span> · worth about </span><span className="text-fg font-medium tabular-nums">₹{Math.round(today * config.unitPrice)}</span>
            </p>
            <p className="text-sm text-fg">{tip}</p>
          </div>
        </div>
      </Box>

      <Box>
        <BoxHeader title="Challenges" meta={`${doneCh.length} of ${CHALLENGES.length} done`} />
        <ul className="mt-2 border-t border-line divide-y divide-line">
          {CHALLENGES.map((c, i) => {
            const isDone = doneCh.includes(c.id);
            const isActive = activeCh === c.id;
            return (
              <li key={c.id} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${isActive ? 'bg-surface-2' : ''}`}>
                <span
                  className="shrink-0 h-7 w-7 rounded-ctl border flex items-center justify-center text-xs font-semibold tabular-nums"
                  style={isDone ? { background: CHART.positive, borderColor: CHART.positive, color: '#0b0b0d' } : { borderColor: 'var(--line)', color: 'var(--muted)' }}
                  aria-label={isDone ? 'Done' : undefined}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{c.title}</p>
                  <p className="text-sm text-muted leading-relaxed">{c.story}</p>
                  {isActive && (
                    <p className="mt-1 text-xs" role="status">
                      <StatusDot tone={activeMet ? 'ok' : 'warn'} className={activeMet ? 'text-ok' : 'text-warn'}>
                        {activeMet ? 'Goal reached' : 'In progress'}
                      </StatusDot>
                      <span className="text-muted"> · {c.progress(s, out, ctx)}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setPlaying(false); setActiveCh(c.id); setS(p => ({ ...p, ...c.setup })); }}
                  className={`${btn.secondary} shrink-0 self-start sm:self-auto`}
                >
                  {isActive ? 'Restart' : isDone ? 'Play again' : 'Start'}
                </button>
              </li>
            );
          })}
        </ul>
      </Box>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        <Box>
          <BoxHeader title="Fine tune" />
          <div className="p-5 pt-3 space-y-6">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              <Slider id="sim-cloud" label="Cloud cover" value={s.cloud} min={0} max={1} step={0.01} display={`${Math.round(s.cloud * 100)}%`} onChange={v => set('cloud', v)} />
              <Slider id="sim-haze" label="Dust and smoke in the air" value={s.haze} min={0} max={1} step={0.01} display={`${Math.round(s.haze * 100)}%`} onChange={v => set('haze', v)} />
              <Slider
                id="sim-dirt"
                label="Days since panels were cleaned"
                value={s.dustDays}
                min={0}
                max={90}
                step={1}
                display={`${s.dustDays} days`}
                onChange={v => set('dustDays', v)}
                hint={s.rain ? 'Rain is washing the panels clean.' : (
                  <span>Dirt is cutting {Math.round(out.soilLoss * 100)}% · <button className="underline decoration-dotted hover:text-fg" onClick={() => set('dustDays', 0)}>Clean panels</button></span>
                )}
              />
              <Slider id="sim-shade" label="Shade from the tree" value={s.shade} min={0} max={0.6} step={0.01} display={`${Math.round(s.shade * 100)}% of panels`} onChange={v => set('shade', v)} />
              <Slider id="sim-temp" label="Air temperature" value={s.airTemp} min={10} max={48} step={1} display={`${s.airTemp} °C`} onChange={v => set('airTemp', v)} />
              <Slider id="sim-wind" label="Wind" value={s.wind} min={0} max={60} step={1} display={`${s.wind} km/h`} onChange={v => set('wind', v)} />
            </div>

            <div>
              <p className="text-xs text-muted mb-2">School loads</p>
              <div className="grid sm:grid-cols-3 gap-2">
                <Switch id="sim-lights" label="Classroom lights" sub={`${LOADS.lights.toFixed(1)} kW · 40 tubes`} on={s.lights} onToggle={() => toggle('lights')} />
                <Switch id="sim-fans" label="Ceiling fans" sub={`${LOADS.fans.toFixed(1)} kW · 20 fans`} on={s.fans} onToggle={() => toggle('fans')} />
                <Switch id="sim-lab" label="Computer lab" sub={`${LOADS.lab.toFixed(1)} kW · 10 PCs`} on={s.lab} onToggle={() => toggle('lab')} />
              </div>
            </div>

            <button onClick={() => { setPlaying(false); setS(START(config)); }} className={btn.quiet}>Reset to a clear March morning</button>
          </div>
        </Box>

        <Box>
          <BoxHeader title="What is cutting output" />
          <p className="px-5 text-sm text-muted">Compared with clean panels under a clear sky.</p>
          {night ? (
            <p className="mx-5 mt-3 mb-4 text-sm text-muted">The sun is below the horizon, so there is nothing to lose. Move the time to daylight.</p>
          ) : (
          <ul className="mt-3 border-t border-line divide-y divide-line">
            {out.losses.map(l => {
              const gain = l.pct < 0;
              const width = Math.min(100, Math.abs(l.pct) * 2);
              return (
                <li key={l.key} className="px-5 py-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className={l.pct === 0 ? 'text-muted' : 'text-fg'}>{l.label}</span>
                    <span className="tabular-nums" style={{ color: gain ? CHART.positive : l.pct > 0 ? CHART.negative : undefined }}>
                      {l.pct === 0 ? '0%' : gain ? `+${-l.pct}%` : `-${l.pct}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${width}%`, background: gain ? CHART.positive : CHART.negative }} />
                  </div>
                </li>
              );
            })}
          </ul>
          )}
          <p className="px-5 py-3 border-t border-line text-xs text-muted leading-relaxed">
            The sun's height matters most of all. Right now a clear sky would give {Math.round(out.clearSky)} W/m². At noon in {MONTHS[s.month]} the sun is highest, and early or late in the day its light passes through more air.
          </p>
        </Box>
      </div>
    </div>
  );
};

export default Simulator;
