import React, { useMemo, useState } from 'react';
import { Box, BoxHeader, StatusDot, CHART } from './ui';
import { Cite } from './Sources';
import { PANEL } from './Electricity';

const MiniSlider: React.FC<{ id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }> = ({ id, label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <label htmlFor={id} className="text-xs text-muted">{label}</label>
      <span className="text-xs text-fg tabular-nums">{display}</span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full" />
  </div>
);

const Check: React.FC<{ id: string; label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center gap-2 text-sm text-muted cursor-pointer">
    <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--silver)]" />
    {label}
  </label>
);

// ---------- 3. Roof planner ----------

const PANEL_L = 2.278; // m, long side, runs north to south
const PANEL_W = 1.134; // m
const GAP_SIDE = 0.02;
const SETBACK = 1; // m kept clear along every edge for safe access

interface Rect { x: number; y: number; w: number; h: number }
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const RoofPlanner: React.FC<{ needed: number; lat: number }> = ({ needed, lat }) => {
  const [W, setW] = useState(24);
  const [D, setD] = useState(12);
  const [stair, setStair] = useState(true);
  const [tank, setTank] = useState(true);

  const layout = useMemo(() => {
    const tilt = Math.min(25, Math.max(10, Math.round(lat)));
    const depth = PANEL_L * Math.cos((tilt * Math.PI) / 180);
    const height = PANEL_L * Math.sin((tilt * Math.PI) / 180);
    // Winter noon sun, with extra room so morning and evening sun also clear the row in front
    const winterElev = 90 - lat - 23.45;
    const shadowPerM = 1 / Math.tan((winterElev * Math.PI) / 180);
    const gap = height * shadowPerM * 1.5;
    const pitch = depth + gap;

    const obstacles: (Rect & { name: string; hgt: number })[] = [];
    if (stair) obstacles.push({ name: 'Stair room', x: W - 3.5, y: 0, w: 3.5, h: 3.5, hgt: 2.5 });
    if (tank) obstacles.push({ name: 'Water tank', x: W / 2 - 1, y: 0.4, w: 2, h: 2, hgt: 1.5 });
    // Keep 0.5 m around obstacles and stay out of their shadow, which falls to the south (down)
    const keepOut = obstacles.map(o => ({ x: o.x - 0.5, y: o.y - 0.5, w: o.w + 1, h: o.h + 0.5 + o.hgt * shadowPerM * 1.5 }));

    const cols = Math.max(0, Math.floor((W - 2 * SETBACK + GAP_SIDE) / (PANEL_W + GAP_SIDE)));
    const rows = D - 2 * SETBACK >= depth ? Math.floor((D - 2 * SETBACK - depth) / pitch) + 1 : 0;
    const panels: Rect[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = { x: SETBACK + c * (PANEL_W + GAP_SIDE), y: SETBACK + r * pitch, w: PANEL_W, h: depth };
        if (!keepOut.some(k => overlaps(p, k))) panels.push(p);
      }
    }
    return { tilt, depth, gap, pitch, obstacles, keepOut, panels };
  }, [W, D, stair, tank, lat]);

  const fits = layout.panels.length;
  const ok = fits >= needed;
  const scale = Math.min(720 / W, 380 / D);
  const vw = W * scale, vh = D * scale;
  const pad = 28;

  return (
    <Box>
      <BoxHeader title="Step 3: Plan the roof" meta={`Panels tilted ${layout.tilt}° to the south`} />
      <p className="px-5 text-sm text-muted max-w-prose">
        Measure the flat roof with a tape. Panels keep {SETBACK} m back from every edge, stay out of the shadow of the stair room and tank, and leave {layout.gap.toFixed(1)} m between rows so one row never shades the next.
      </p>

      <div className="px-5 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
        <MiniSlider id="roof-w" label="Roof length, east to west" value={W} min={6} max={60} step={0.5} display={`${W} m`} onChange={setW} />
        <MiniSlider id="roof-d" label="Roof depth, north to south" value={D} min={5} max={40} step={0.5} display={`${D} m`} onChange={setD} />
        <Check id="roof-stair" label="Stair room on the roof" checked={stair} onChange={setStair} />
        <Check id="roof-tank" label="Water tank on the roof" checked={tank} onChange={setTank} />
      </div>

      <div className="mx-3 sm:mx-5 mt-4 rounded-box border border-line bg-bg/40 p-2 overflow-x-auto">
        <svg viewBox={`0 0 ${vw + pad * 2} ${vh + pad * 2}`} className="block w-full h-auto max-h-[460px] min-w-[420px] mx-auto" role="img" aria-label={`Roof plan with ${fits} panels`}>
          <g transform={`translate(${pad} ${pad})`}>
            <rect x="0" y="0" width={vw} height={vh} fill="#2c2a26" stroke="#5a4c3a" strokeWidth="3" />
            <rect x={SETBACK * scale} y={SETBACK * scale} width={(W - 2 * SETBACK) * scale} height={(D - 2 * SETBACK) * scale} fill="none" stroke="#6a6458" strokeDasharray="5 4" />
            {layout.keepOut.map((k, i) => {
              // draw only the part inside the roof
              const x0 = Math.max(0, k.x), y0 = Math.max(0, k.y);
              const x1 = Math.min(W, k.x + k.w), y1 = Math.min(D, k.y + k.h);
              return <rect key={`k${i}`} x={x0 * scale} y={y0 * scale} width={Math.max(0, x1 - x0) * scale} height={Math.max(0, y1 - y0) * scale} fill="#000" opacity="0.25" />;
            })}
            {layout.panels.map((p, i) => (
              <rect
                key={i}
                x={p.x * scale}
                y={p.y * scale}
                width={p.w * scale}
                height={p.h * scale}
                rx="1.5"
                fill={i < needed ? '#1d3f8f' : 'transparent'}
                stroke={i < needed ? '#6f95e6' : '#4a5a7a'}
                strokeWidth="1"
                strokeDasharray={i < needed ? undefined : '3 2'}
              />
            ))}
            {layout.obstacles.map(o => (
              <g key={o.name}>
                <rect x={o.x * scale} y={o.y * scale} width={o.w * scale} height={o.h * scale} fill={o.name === 'Water tank' ? '#2b4a66' : '#4a3f33'} stroke="#7a6a52" />
                <text x={(o.x + o.w / 2) * scale} y={(o.y + o.h / 2) * scale + 4} textAnchor="middle" fontSize="11" fill="#e8e8ea" fontFamily="Inter, sans-serif">
                  {o.name === 'Water tank' ? 'Tank' : 'Stairs'}
                </text>
              </g>
            ))}
            {/* dimensions and north arrow */}
            <text x={vw / 2} y={-9} textAnchor="middle" fontSize="11" fill="#9a9aa3" fontFamily="Inter, sans-serif">{W} m</text>
            <text x={-10} y={vh / 2} textAnchor="middle" fontSize="11" fill="#9a9aa3" fontFamily="Inter, sans-serif" transform={`rotate(-90 -10 ${vh / 2})`}>{D} m</text>
            <g transform={`translate(${vw + 14} 6)`}>
              <path d="M0 14 L0 0 M-4 5 L0 0 L4 5" stroke="#e8e8ea" strokeWidth="1.5" fill="none" />
              <text x="0" y="26" textAnchor="middle" fontSize="10" fill="#e8e8ea" fontFamily="Inter, sans-serif">N</text>
            </g>
            <text x={vw / 2} y={vh + 18} textAnchor="middle" fontSize="11" fill={CHART.sun} fontFamily="Inter, sans-serif">South: panels face this way</text>
          </g>
        </svg>
      </div>

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[
          { l: 'Panels that fit', v: String(fits), u: 'panels' },
          { l: 'Most the roof can hold', v: ((fits * PANEL.watts) / 1000).toFixed(2), u: 'kWp' },
          { l: 'Your plan needs', v: String(needed), u: 'panels' },
          { l: 'Gap between rows', v: layout.gap.toFixed(2), u: 'm' },
        ].map(x => (
          <div key={x.l} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{x.l}</p>
            <p className="mt-1"><span className="font-display font-semibold text-2xl tabular-nums">{x.v}</span> <span className="text-xs text-muted">{x.u}</span></p>
          </div>
        ))}
      </div>
      <p className="px-5 pb-5 -mt-1 text-sm">
        <StatusDot tone={ok ? 'ok' : 'bad'} className="text-fg">
          {ok
            ? `Fits. ${needed} filled panels are your plan, the dashed ones show spare room for ${fits - needed} more.`
            : `Only ${fits} of ${needed} panels fit. Use a bigger roof area, a walkway canopy, or cover less of the school's use.`}
        </StatusDot>
      </p>
    </Box>
  );
};

// ---------- 4. Battery or no battery ----------

const CHEM = {
  lfp: { label: 'Lithium (LFP)', dod: 0.9, eff: 0.95, price: 20000, life: 10 },
  lead: { label: 'Lead acid', dod: 0.5, eff: 0.85, price: 10000, life: 4 },
};
const HYBRID_EXTRA = 20000; // ₹ more for a hybrid inverter than a grid-tied one

export const BatteryPlanner: React.FC<{ dailyKwh: number; peakKw: number; kwp: number; costPerKw: number }> = ({ dailyKwh, peakKw, kwp, costPerKw }) => {
  const [outage, setOutage] = useState(2);
  const [backup, setBackup] = useState(() => Math.min(1.5, Math.max(0.2, Math.round(peakKw * 0.4 * 10) / 10)));
  const [chem, setChem] = useState<keyof typeof CHEM>('lfp');
  const c = CHEM[chem];
  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const hybridKwh = (backup * outage) / (c.dod * c.eff);
  const hybridCost = hybridKwh * c.price + HYBRID_EXTRA;
  const offKwh = (dailyKwh * 1.5) / (c.dod * c.eff); // a day and a half of storage for cloudy days
  const offCost = offKwh * c.price + kwp * 0.3 * costPerKw; // 30% more panels to recharge

  const options = [
    {
      key: 'grid', name: 'Grid tied, no battery', battery: '0 kWh', cost: 0, yearly: 0,
      outage: 'Switches off during a power cut, for line workers\' safety.', net: true,
    },
    {
      key: 'hybrid', name: 'Hybrid with backup battery', battery: `${hybridKwh.toFixed(1)} kWh`, cost: hybridCost, yearly: (hybridKwh * c.price) / c.life,
      outage: `Keeps ${backup} kW of chosen loads running for ${outage} h.`, net: true,
    },
    {
      key: 'off', name: 'Off grid', battery: `${offKwh.toFixed(1)} kWh`, cost: offCost, yearly: (offKwh * c.price) / c.life,
      outage: 'No grid at all. Runs everything, until a few cloudy days in a row drain it.', net: false,
    },
  ];
  const pick = outage <= 0.5 ? 'grid' : 'hybrid';

  return (
    <Box>
      <BoxHeader title="Step 4: Battery or no battery?" />
      <p className="px-5 text-sm text-muted max-w-prose">
        A grid tied system switches off when the grid fails. A battery keeps important loads running, but costs a lot and needs replacing. Set how long power cuts last at this school.
      </p>

      <div className="px-5 pt-4 grid sm:grid-cols-3 gap-x-6 gap-y-4 items-end">
        <MiniSlider id="bat-out" label="Power cuts in school hours" value={outage} min={0} max={8} step={0.5} display={`${outage} h a day`} onChange={setOutage} />
        <MiniSlider id="bat-load" label="Loads to keep on in a cut" value={backup} min={0.2} max={Math.max(1, Math.ceil(peakKw))} step={0.1} display={`${backup} kW`} onChange={setBackup} />
        <div>
          <p className="text-xs text-muted mb-1.5">Battery type</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Battery type">
            {(Object.keys(CHEM) as (keyof typeof CHEM)[]).map(k => (
              <button
                key={k}
                role="radio"
                aria-checked={chem === k}
                onClick={() => setChem(k)}
                className={`h-8 px-3 rounded-ctl border text-sm transition-colors ${chem === k ? 'border-silver bg-surface-2 text-fg' : 'border-line text-muted hover:text-fg hover:bg-surface-2'}`}
              >
                {CHEM[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="m-5 overflow-x-auto rounded-box border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Comparison of battery options</caption>
          <thead>
            <tr className="text-xs text-muted text-left">
              <th className="font-normal px-4 py-2.5">Option</th>
              <th className="font-normal px-4 py-2.5 text-right">Battery</th>
              <th className="font-normal px-4 py-2.5 text-right">Extra cost</th>
              <th className="font-normal px-4 py-2.5 text-right">Battery wear a year</th>
              <th className="font-normal px-4 py-2.5">In a power cut</th>
              <th className="font-normal px-4 py-2.5">Net metering</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {options.map(o => (
              <tr key={o.key} className={o.key === pick ? 'bg-surface-2' : ''}>
                <td className="px-4 py-3 text-fg">
                  {o.name}
                  {o.key === pick && <span className="block text-xs" style={{ color: CHART.positive }}>Best fit for this school</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{o.battery}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.cost ? inr(o.cost) : 'None'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.yearly ? inr(o.yearly) : 'None'}</td>
                <td className="px-4 py-3 text-muted leading-relaxed">{o.outage}</td>
                <td className="px-4 py-3"><StatusDot tone={o.net ? 'ok' : 'bad'} className={o.net ? 'text-ok' : 'text-bad'}>{o.net ? 'Yes' : 'No'}</StatusDot></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 pb-5 -mt-1 text-xs text-muted leading-relaxed max-w-prose">
        {c.label} batteries use {Math.round(c.dod * 100)}% of their capacity and last about {c.life} years. Prices are rough guides at about {inr(c.price)} per kWh<Cite id="battery-prices" />. Battery wear is the battery cost spread over its life.
      </p>
    </Box>
  );
};
