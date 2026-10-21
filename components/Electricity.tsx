import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts';
import { Box, BoxHeader, Legend, StatusDot, TooltipCard, CHART, axisProps, ResponsiveChart, CountUp } from './ui';

// A typical 540 W mono PERC panel (72 cells in series), at 1000 W/m² and 25 °C
export const PANEL = { watts: 540, vmp: 41.6, imp: 12.98, voc: 49.5, isc: 13.85, cells: 72 };
// A typical 5 kW single phase string inverter
const INVERTER = { inputs: 2, mpptMin: 90, mpptMax: 520, maxV: 600, maxA: 16 };

const fmt = (n: number, d = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- Panel I-V curve ----------

function panelCurve(sun: number, temp: number) {
  const g = sun / 1000;
  const vt = (0.02569 * (temp + 273.15)) / 298.15;
  const isc = PANEL.isc * g * (1 + 0.0005 * (temp - 25));
  const voc = Math.max(1, PANEL.voc * (1 - 0.0027 * (temp - 25)) + 1.2 * PANEL.cells * vt * Math.log(Math.max(0.01, g)));
  const vmp = PANEL.vmp * (voc / PANEL.voc);
  const imp = PANEL.imp * (isc / PANEL.isc);
  // Explicit single diode approximation that passes through Isc, MPP and Voc
  const c2 = (vmp / voc - 1) / Math.log(1 - imp / isc);
  const c1 = (1 - imp / isc) * Math.exp(-vmp / (c2 * voc));
  const current = (v: number) => Math.max(0, isc * (1 - c1 * (Math.exp(v / (c2 * voc)) - 1)));

  const points = Array.from({ length: 61 }, (_, i) => {
    const v = (voc * i) / 60;
    const a = current(v);
    return { v: +v.toFixed(2), a: +a.toFixed(2), w: +(v * a).toFixed(1) };
  });
  const mpp = points.reduce((best, p) => (p.w > best.w ? p : best), points[0]);
  return { points, mpp, voc, isc };
}

const CurveTooltip = ({ active, payload }: any) =>
  active && payload?.length ? (
    <TooltipCard
      title={`${payload[0].payload.v} V`}
      rows={[
        { label: 'Current', value: `${payload[0].payload.a} A`, color: CHART.monsoon },
        { label: 'Power', value: `${payload[0].payload.w} W`, color: CHART.sun },
      ]}
    />
  ) : null;

const MiniSlider: React.FC<{ id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }> = ({ id, label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <label htmlFor={id} className="text-xs text-muted">{label}</label>
      <span className="text-xs text-fg tabular-nums">{display}</span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full" />
  </div>
);

export const VoltageCurrent: React.FC = () => {
  const [sun, setSun] = useState(1000);
  const [temp, setTemp] = useState(25);
  const c = useMemo(() => panelCurve(sun, temp), [sun, temp]);

  return (
    <Box>
      <BoxHeader title="Voltage, current and power" />
      <p className="px-5 text-sm text-muted max-w-prose">Think of electricity like water in a pipe. All three numbers matter for a solar system.</p>

      <div className="mx-5 mt-4 grid sm:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[
          { sym: 'V', name: 'Voltage', unit: 'volts', b: 'The push, like water pressure. Panels in series add their voltage.', color: CHART.sun },
          { sym: 'I', name: 'Current', unit: 'amps', b: 'The flow, like litres per second. Panels in parallel add their current.', color: CHART.monsoon },
          { sym: 'P', name: 'Power = V × I', unit: 'watts', b: 'Push times flow. 400 V × 13 A = 5,200 W, the same as 40 V × 130 A.', color: CHART.positive },
        ].map(x => (
          <div key={x.sym} className="bg-surface p-4">
            <p className="flex items-baseline gap-2">
              <span className="font-display font-semibold text-2xl leading-none" style={{ color: x.color }}>{x.sym}</span>
              <span className="text-sm font-semibold text-fg">{x.name}</span>
              <span className="text-xs text-muted">{x.unit}</span>
            </p>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{x.b}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pt-5 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">One {PANEL.watts} W panel: current and power at each voltage</h4>
        <Legend items={[{ label: 'Current (A)', color: CHART.monsoon }, { label: 'Power (W)', color: CHART.sun }]} />
      </div>
      <div className="h-[280px] px-2 pt-2">
        <ResponsiveChart summary={`One 540 W panel: the most power is about ${Math.round(c.mpp.w)} W at ${Math.round(c.mpp.v)} V. With no load the voltage is ${c.voc.toFixed(1)} V; shorted, the current is ${c.isc.toFixed(1)} A.`}>
          <ComposedChart data={c.points} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="v" type="number" domain={[0, 52]} ticks={[0, 10, 20, 30, 40, 50]} {...axisProps} tickFormatter={v => `${v} V`} />
            <YAxis yAxisId="a" domain={[0, 15]} ticks={[0, 5, 10, 15]} {...axisProps} width={44} tickFormatter={v => `${v} A`} />
            <YAxis yAxisId="w" orientation="right" domain={[0, 600]} ticks={[0, 200, 400, 600]} {...axisProps} width={52} tickFormatter={v => `${v} W`} />
            <Tooltip content={<CurveTooltip />} cursor={{ stroke: CHART.faint }} />
            <Line yAxisId="a" type="monotone" dataKey="a" stroke={CHART.monsoon} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="w" type="monotone" dataKey="w" stroke={CHART.sun} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot
              yAxisId="w"
              x={c.mpp.v}
              y={c.mpp.w}
              r={5}
              fill={CHART.sun}
              stroke="#0b0b0d"
              strokeWidth={2}
              label={{ value: 'Maximum power point', position: 'top', fill: CHART.sun, fontSize: 11 }}
            />
          </ComposedChart>
        </ResponsiveChart>
      </div>

      <div className="px-5 pt-3 grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <MiniSlider id="iv-sun" label="Sunlight" value={sun} min={100} max={1000} step={10} display={`${sun} W/m²`} onChange={setSun} />
        <MiniSlider id="iv-temp" label="Panel temperature" value={temp} min={10} max={75} step={1} display={`${temp} °C`} onChange={setTemp} />
      </div>

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[
          { l: 'Best voltage', v: fmt(c.mpp.v), u: 'V' },
          { l: 'Best current', v: fmt(c.mpp.a), u: 'A' },
          { l: 'Most power', v: fmt(c.mpp.w, 0), u: 'W' },
          { l: 'Open circuit voltage', v: fmt(c.voc), u: 'V' },
        ].map(x => (
          <div key={x.l} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{x.l}</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="font-display font-semibold text-[22px] leading-none tabular-nums">{x.v}</span>
              <span className="text-xs text-muted">{x.u}</span>
            </p>
          </div>
        ))}
      </div>

      <ul className="px-5 pb-5 grid md:grid-cols-3 gap-4 text-sm text-muted leading-relaxed">
        <li><span className="text-fg font-medium">More sun, more current.</span> Current rises almost in step with sunlight. Voltage barely changes until it gets quite dark.</li>
        <li><span className="text-fg font-medium">More heat, less voltage.</span> Each degree above 25 °C takes away about 0.3% of the voltage, so hot panels make less power.</li>
        <li><span className="text-fg font-medium">The inverter finds the peak.</span> Too little voltage and the current is wasted, too much and the current drops. The inverter's MPPT keeps hunting for the top of the yellow curve.</li>
      </ul>
    </Box>
  );
};

// ---------- Series and parallel ----------

type Mode = 'series' | 'parallel' | 'two';
const MODES: { key: Mode; label: string }[] = [
  { key: 'series', label: 'Series' },
  { key: 'parallel', label: 'Parallel' },
  { key: 'two', label: 'Two strings' },
];

// 4 mm² copper, 20 m from roof to inverter (40 m there and back)
const CABLE_OHMS = (0.0175 * 40) / 4;
const COLD_VOC = 1 + 0.0027 * (25 - 10); // Voc on a 10 °C morning

interface WiringResult {
  strings: number[];         // panels in each string
  volts: number;             // working voltage at the inverter
  amps: number;              // total current
  watts: number;
  cableLossW: number;
  coldVoc: number;           // highest string voltage on a cold morning
  ampsPerInput: number;
  checks: { tone: 'ok' | 'warn' | 'bad'; text: string }[];
}

function wire(mode: Mode, n: number, shaded: boolean): WiringResult {
  const strings = mode === 'series' ? [n] : mode === 'parallel' ? Array(n).fill(1) : [Math.ceil(n / 2), Math.floor(n / 2)];
  // A shaded panel is skipped by its bypass diode in a series string; in parallel it just makes less
  const shadedLossPanels = !shaded ? 0 : mode === 'parallel' ? 0.75 : 1;
  const longest = Math.max(...strings);
  const volts = (shaded && mode === 'series' ? n - 1 : longest) * PANEL.vmp;
  const amps = mode === 'parallel' ? (n - shadedLossPanels) * PANEL.imp : mode === 'two' ? 2 * PANEL.imp : PANEL.imp;
  const watts = (n - shadedLossPanels) * PANEL.watts;
  // Separate inputs: each string has its own cable run
  const runs = mode === 'two' ? [PANEL.imp, PANEL.imp] : [amps];
  const cableLossW = runs.reduce((s, a) => s + a * a * CABLE_OHMS, 0);
  const coldVoc = longest * PANEL.voc * COLD_VOC;
  const ampsPerInput = mode === 'two' ? PANEL.imp : amps;

  const checks: WiringResult['checks'] = [];
  if (longest * PANEL.vmp < INVERTER.mpptMin) checks.push({ tone: 'bad', text: `${fmt(longest * PANEL.vmp, 0)} V is below the ${INVERTER.mpptMin} V the inverter needs to start.` });
  else if (longest * PANEL.vmp > INVERTER.mpptMax) checks.push({ tone: 'warn', text: `${fmt(longest * PANEL.vmp, 0)} V is above the ${INVERTER.mpptMax} V working range, so the inverter can't find the best point.` });
  else checks.push({ tone: 'ok', text: `${fmt(longest * PANEL.vmp, 0)} V is inside the inverter's ${INVERTER.mpptMin} to ${INVERTER.mpptMax} V working range.` });

  if (coldVoc > INVERTER.maxV) checks.push({ tone: 'bad', text: `On a cold morning a string can reach ${fmt(coldVoc, 0)} V, over the ${INVERTER.maxV} V limit. This can damage the inverter.` });
  else if (coldVoc > INVERTER.maxV * 0.95) checks.push({ tone: 'warn', text: `Cold morning voltage of ${fmt(coldVoc, 0)} V is very close to the ${INVERTER.maxV} V limit.` });
  else checks.push({ tone: 'ok', text: `Cold morning voltage stays at ${fmt(coldVoc, 0)} V, under the ${INVERTER.maxV} V limit.` });

  if (ampsPerInput > INVERTER.maxA) checks.push({ tone: 'bad', text: `${fmt(ampsPerInput, 0)} A is far more than the ${INVERTER.maxA} A one input can take.` });
  else checks.push({ tone: 'ok', text: `${fmt(ampsPerInput, 1)} A per input is under the ${INVERTER.maxA} A limit.` });

  return { strings, volts, amps, watts, cableLossW, coldVoc, ampsPerInput, checks };
}

const WiringDiagram: React.FC<{ mode: Mode; n: number; shaded: boolean; amps: number }> = ({ mode, n, shaded, amps }) => {
  const W = 720;
  const areaW = 560;
  const gap = 10;
  const pw = Math.min(46, (areaW - gap * (n - 1)) / n);
  const strokeFor = (a: number) => 1.5 + Math.min(7, a / 18);
  const dur = (a: number) => `${Math.max(0.35, 1.6 - a / 60)}s`;
  const invX = 618;

  const panel = ({ x, y, h, idx, label }: { x: number; y: number; h: number; idx: number; label: string }) => {
    const isShaded = shaded && idx === 0;
    return (
      <g>
        <rect x={x} y={y} width={pw} height={h} rx="3" fill={isShaded ? '#141a26' : '#18284a'} stroke="#3a5689" />
        {[1, 2].map(k => <line key={k} x1={x} y1={y + (h * k) / 3} x2={x + pw} y2={y + (h * k) / 3} stroke="#3a5689" strokeWidth="0.7" />)}
        <line x1={x + pw / 2} y1={y} x2={x + pw / 2} y2={y + h} stroke="#3a5689" strokeWidth="0.7" />
        {isShaded && <rect x={x} y={y} width={pw} height={h} rx="3" fill="#000" opacity="0.5" />}
        <text x={x + 4} y={y + 11} fontSize="10" fill={CHART.negative} fontFamily="Inter, sans-serif">−</text>
        <text x={x + pw - 10} y={y + 11} fontSize="10" fill={CHART.positive} fontFamily="Inter, sans-serif">+</text>
        <text x={x + pw / 2} y={y + h + 13} textAnchor="middle" fontSize="9" fill="#9a9aa3" fontFamily="Inter, sans-serif">{label}</text>
      </g>
    );
  };

  const wireStyle = (a: number): React.CSSProperties => ({ animationDuration: dur(a) });
  const pos = (i: number) => 20 + i * (pw + gap);

  return (
    <svg viewBox={`0 0 ${W} 230`} className="block w-full h-auto" role="img" aria-label={`${n} panels wired in ${mode === 'two' ? 'two strings' : mode}`}>
      {/* Inverter */}
      <rect x={invX} y="62" width="82" height="106" rx="6" fill="#26262c" stroke={CHART.monsoon} />
      <text x={invX + 41} y="84" textAnchor="middle" fontSize="11" fill="#e8e8ea" fontFamily="Inter, sans-serif">Inverter</text>
      {mode === 'two' ? (
        <>
          <text x={invX + 41} y="108" textAnchor="middle" fontSize="9" fill="#9a9aa3" fontFamily="Inter, sans-serif">Input 1</text>
          <text x={invX + 41} y="150" textAnchor="middle" fontSize="9" fill="#9a9aa3" fontFamily="Inter, sans-serif">Input 2</text>
        </>
      ) : (
        <text x={invX + 41} y="126" textAnchor="middle" fontSize="9" fill="#9a9aa3" fontFamily="Inter, sans-serif">Input 1</text>
      )}

      {mode === 'series' && (
        <g>
          {Array.from({ length: n }, (_, i) => <React.Fragment key={i}>{panel({ x: pos(i), y: 78, h: 74, idx: i, label: shaded && i === 0 ? 'bypassed' : `${PANEL.vmp} V` })}</React.Fragment>)}
          {/* + of each panel to − of the next */}
          {Array.from({ length: n - 1 }, (_, i) => (
            <path key={i} className="wire-dc" style={wireStyle(amps)} d={`M${pos(i) + pw - 4} 78 L${pos(i) + pw - 4} 66 L${pos(i + 1) + 4} 66 L${pos(i + 1) + 4} 78`} stroke={CHART.sun} strokeWidth={strokeFor(amps)} fill="none" />
          ))}
          <path className="wire-dc" style={wireStyle(amps)} d={`M${pos(n - 1) + pw - 4} 78 L${pos(n - 1) + pw - 4} 40 L${invX} 40 L${invX} 90`} stroke={CHART.sun} strokeWidth={strokeFor(amps)} fill="none" />
          <path className="wire-dc" style={wireStyle(amps)} d={`M${invX} 140 L${invX - 10} 140 L${invX - 10} 196 L${pos(0) + 4} 196 L${pos(0) + 4} 152`} stroke={CHART.faint} strokeWidth={strokeFor(amps)} fill="none" />
          <text x={(pos(0) + invX) / 2} y="30" textAnchor="middle" fontSize="11" fill={CHART.sun} fontFamily="Inter, sans-serif">Voltages add up · current stays {fmt(PANEL.imp)} A</text>
        </g>
      )}

      {mode === 'parallel' && (
        <g>
          {Array.from({ length: n }, (_, i) => <React.Fragment key={i}>{panel({ x: pos(i), y: 78, h: 74, idx: i, label: shaded && i === 0 ? '3 A' : `${fmt(PANEL.imp, 0)} A` })}</React.Fragment>)}
          {/* + bus on top, − bus below */}
          <path className="wire-dc" style={wireStyle(amps)} d={`M${pos(0) + pw - 4} 50 L${invX} 50 L${invX} 90`} stroke={CHART.sun} strokeWidth={strokeFor(amps)} fill="none" />
          <path className="wire-dc" style={wireStyle(amps)} d={`M${invX} 140 L${invX - 10} 140 L${invX - 10} 200 L${pos(0) + 4} 200`} stroke={CHART.faint} strokeWidth={strokeFor(amps)} fill="none" />
          {Array.from({ length: n }, (_, i) => (
            <g key={i}>
              <line x1={pos(i) + pw - 4} y1="78" x2={pos(i) + pw - 4} y2="50" stroke={CHART.sun} strokeWidth="1.5" />
              <line x1={pos(i) + 4} y1="152" x2={pos(i) + 4} y2="200" stroke={CHART.faint} strokeWidth="1.5" />
            </g>
          ))}
          <text x={(pos(0) + invX) / 2} y="30" textAnchor="middle" fontSize="11" fill={CHART.monsoon} fontFamily="Inter, sans-serif">Currents add up · voltage stays {fmt(PANEL.vmp)} V</text>
        </g>
      )}

      {mode === 'two' && (() => {
        const a = Math.ceil(n / 2), b = Math.floor(n / 2);
        const h = 56;
        const rows = [
          { count: a, y: 36, plusY: 98, minusY: 112, first: 0 },
          { count: b, y: 146, plusY: 140, minusY: 154, first: a },
        ];
        return rows.map((r, ri) => {
          const last = r.count - 1;
          const top = r.y - 18;
          const back = r.y + h + 12;
          return (
            <g key={ri}>
              {Array.from({ length: r.count }, (_, i) => (
                <React.Fragment key={i}>{panel({ x: pos(i), y: r.y, h, idx: r.first + i, label: shaded && r.first + i === 0 ? 'bypassed' : '' })}</React.Fragment>
              ))}
              {/* + of each panel to − of the next */}
              {Array.from({ length: Math.max(0, last) }, (_, i) => (
                <path key={i} className="wire-dc" style={wireStyle(PANEL.imp)} d={`M${pos(i) + pw - 4} ${r.y} L${pos(i) + pw - 4} ${r.y - 8} L${pos(i + 1) + 4} ${r.y - 8} L${pos(i + 1) + 4} ${r.y}`} stroke={CHART.sun} strokeWidth={strokeFor(PANEL.imp)} fill="none" />
              ))}
              {/* + lead to its own inverter input */}
              <path className="wire-dc" style={wireStyle(PANEL.imp)} d={`M${pos(last) + pw - 4} ${r.y} L${pos(last) + pw - 4} ${top} L${invX - 20} ${top} L${invX - 20} ${r.plusY} L${invX} ${r.plusY}`} stroke={CHART.sun} strokeWidth={strokeFor(PANEL.imp)} fill="none" />
              {/* − return */}
              <path className="wire-dc" style={wireStyle(PANEL.imp)} d={`M${pos(0) + 4} ${r.y} L${pos(0) + 4} ${r.y - 6} L10 ${r.y - 6} L10 ${back} L${invX - 34} ${back} L${invX - 34} ${r.minusY} L${invX} ${r.minusY}`} stroke={CHART.faint} strokeWidth={strokeFor(PANEL.imp)} fill="none" />
              <text x={pos(last) + pw + 10} y={r.y + h / 2 + 4} fontSize="10" fill={CHART.sun} fontFamily="Inter, sans-serif">
                {fmt((shaded && ri === 0 ? r.count - 1 : r.count) * PANEL.vmp, 0)} V · {fmt(PANEL.imp, 0)} A
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
};

export const Wiring: React.FC<{ defaultPanels: number }> = ({ defaultPanels }) => {
  const [mode, setMode] = useState<Mode>('series');
  const [n, setN] = useState(Math.min(12, Math.max(2, defaultPanels)));
  const [shaded, setShaded] = useState(false);
  const r = useMemo(() => wire(mode, n, shaded), [mode, n, shaded]);
  const all = useMemo(() => MODES.map(m => ({ ...m, r: wire(m.key, n, false) })), [n]);
  const worst = (x: WiringResult) => (x.checks.some(c => c.tone === 'bad') ? 'bad' : x.checks.some(c => c.tone === 'warn') ? 'warn' : 'ok');

  const explain: Record<Mode, string> = {
    series: 'The + of one panel joins the − of the next, like batteries in a torch. Voltages add up and the current stays the same as one panel. This is how most school systems are wired: high voltage, low current, thin cables.',
    parallel: 'Every + joins every +, and every − joins every −. Currents add up and the voltage stays the same as one panel. The power is the same, but the current is huge, so cables get hot and waste energy unless they are very thick.',
    two: 'Two shorter series strings, each going to its own inverter input. Each string keeps a sensible voltage, and if one string is shaded the other keeps working at its best point.',
  };

  return (
    <Box>
      <BoxHeader title="Series or parallel" meta={`${PANEL.watts} W panels at full sun`} />
      <p className="px-5 text-sm text-muted max-w-prose">The same panels can be joined in different ways. The power is about the same, but voltage and current change a lot.</p>

      <div className="px-5 pt-4 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="text-xs text-muted mb-1.5">Wiring</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Wiring">
            {MODES.map(m => (
              <button
                key={m.key}
                role="radio"
                aria-checked={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`h-8 px-3 rounded-ctl border text-sm transition-colors ${mode === m.key ? 'border-silver bg-surface-2 text-fg' : 'border-line text-muted hover:text-fg hover:bg-surface-2'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full sm:w-56">
          <MiniSlider id="wire-n" label="Number of panels" value={n} min={2} max={12} step={1} display={`${n} panels`} onChange={setN} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer h-8">
          <input type="checkbox" checked={shaded} onChange={e => setShaded(e.target.checked)} className="h-4 w-4 accent-[var(--silver)]" />
          Shade one panel
        </label>
      </div>

      <div className="mx-3 sm:mx-5 mt-4 rounded-box border border-line bg-bg/40 p-2 overflow-x-auto">
        <div className="min-w-[520px] max-w-[900px] mx-auto">
          <WiringDiagram mode={mode} n={n} shaded={shaded} amps={r.amps} />
        </div>
      </div>

      <p className="px-5 pt-3 text-sm text-muted leading-relaxed max-w-prose">{explain[mode]}</p>
      {shaded && (
        <p className="px-5 pt-2 text-sm text-muted leading-relaxed max-w-prose">
          <span className="text-fg">Shade:</span>{' '}
          {mode === 'parallel'
            ? 'Only the shaded panel makes less. The others are not affected.'
            : 'Each panel has bypass diodes, so the current skips the shaded panel and the string loses only that panel. Without them, one shaded panel would slow the current through the whole string.'}
        </p>
      )}

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[
          { l: 'Voltage', v: fmt(r.volts, 0), u: 'V', c: CHART.sun },
          { l: 'Current', v: fmt(r.amps, 1), u: 'A', c: CHART.monsoon },
          { l: 'Power', v: fmt(r.watts / 1000, 2), u: 'kW', c: CHART.positive },
          { l: 'Lost as heat in cables', v: fmt(r.cableLossW, 0), u: `W · ${fmt((r.cableLossW / Math.max(1, r.watts)) * 100, 1)}%`, c: r.cableLossW / r.watts > 0.03 ? CHART.negative : undefined },
        ].map(x => (
          <div key={x.l} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{x.l}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display font-semibold text-[24px] leading-none tabular-nums" style={{ color: x.c }}>{x.v}</span>
              <span className="text-xs text-muted">{x.u}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="px-5">
        <p className="text-xs text-muted mb-2">Check against a typical 5 kW inverter</p>
        <ul className="space-y-1.5 text-sm">
          {r.checks.map(c => (
            <li key={c.text}><StatusDot tone={c.tone} className="text-fg">{c.text}</StatusDot></li>
          ))}
        </ul>
      </div>

      <div className="m-5 overflow-x-auto rounded-box border border-line">
        <table className="stack-table w-full min-w-[520px] text-sm tabular-nums">
          <caption className="sr-only">Comparison of wiring options for {n} panels</caption>
          <thead>
            <tr className="text-xs text-muted text-left">
              <th className="font-normal px-4 py-2.5">{n} panels as</th>
              <th className="font-normal px-4 py-2.5 text-right">Voltage</th>
              <th className="font-normal px-4 py-2.5 text-right">Current</th>
              <th className="font-normal px-4 py-2.5 text-right">Cable loss</th>
              <th className="font-normal px-4 py-2.5">Inverter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {all.map(({ key, label, r: x }) => {
              const w = worst(x);
              return (
                <tr key={key} className={key === mode ? 'bg-surface-2' : ''}>
                  <td className="px-4 py-2.5 text-fg">{label}{key === 'two' && <span className="text-muted"> ({x.strings.join(' + ')})</span>}</td>
                  <td data-label="Voltage" className="px-4 py-2.5 text-right">{fmt(x.volts, 0)} V</td>
                  <td data-label="Current" className="px-4 py-2.5 text-right">{fmt(x.amps, 1)} A</td>
                  <td data-label="Cable loss" className="px-4 py-2.5 text-right">{fmt((x.cableLossW / x.watts) * 100, 1)}%</td>
                  <td data-label="Inverter" className="px-4 py-2.5">
                    <StatusDot tone={w} className={w === 'ok' ? 'text-ok' : w === 'warn' ? 'text-warn' : 'text-bad'}>
                      {w === 'ok' ? 'Works' : w === 'warn' ? 'Risky' : 'Does not work'}
                    </StatusDot>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-5 pb-5 -mt-2 text-xs text-muted leading-relaxed max-w-prose">
        Cable loss is current × current × resistance, for 20 m of 4 mm² copper cable. Doubling the current makes four times the heat, which is why solar systems use high voltage and low current.
      </p>
    </Box>
  );
};
