import React, { useEffect, useMemo, useState } from 'react';
import { markDone } from './runtime';
import { Box, BoxHeader, StatusDot, TINT, CHART, btn } from './ui';
import { Cite } from './Sources';

// ---------- 7. PPE kit ----------

type Job = 'clean' | 'inspect' | 'electrical' | 'height';
const JOBS: { key: Job | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'clean', label: 'Cleaning panels' },
  { key: 'inspect', label: 'Inspection' },
  { key: 'electrical', label: 'Electrical work' },
  { key: 'height', label: 'Near roof edges' },
];

const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const PPE: { name: string; protects: string; spec: string; src?: string; jobs: Job[]; tint: string; icon: React.ReactNode }[] = [
  { name: 'Insulated gloves', protects: 'Electric shock through the hands', spec: 'Class 0 rubber gloves, rated 1,000 V. Check for holes before every use.', src: 'gloves', jobs: ['electrical'], tint: TINT.sun,
    icon: <G><path d="M9 28V15l-2-5a1.6 1.6 0 013-1l2 4V5a1.6 1.6 0 013 0v8-9a1.6 1.6 0 013 0v9-7a1.6 1.6 0 013 0v8-5a1.6 1.6 0 013 0v10c0 5-3 9-7 9h-1" /><path d="M9 28h12" /></G> },
  { name: 'Safety shoes', protects: 'Shocks, slips and dropped tools', spec: 'Rubber soled, electrical hazard rated, with toe protection.', jobs: ['clean', 'inspect', 'electrical', 'height'], tint: TINT.sky,
    icon: <G><path d="M4 22V12h7l3 5 10 2a4 4 0 014 4v1H4z" /><path d="M4 26h24" /></G> },
  { name: 'Safety helmet', protects: 'Head injuries from falls and low frames', spec: 'Hard hat with a chin strap for roof work.', jobs: ['inspect', 'electrical', 'height'], tint: TINT.sun,
    icon: <G><path d="M5 22a11 11 0 0122 0" /><path d="M3 22h26v3H3z" /><path d="M16 11v-3" /></G> },
  { name: 'Harness and lifeline', protects: 'Falls from the roof', spec: 'Full body harness clipped to a fixed anchor, or a guard rail, for anyone working near an unguarded roof edge.', src: 'fall-protection', jobs: ['height'], tint: TINT.violet,
    icon: <G><path d="M11 4l5 6 5-6M11 4v24M21 4v24M11 16h10M11 22l5-3 5 3" /></G> },
  { name: 'Safety glasses', protects: 'Glare, flying dust and sparks', spec: 'UV protective, shatter resistant lenses.', jobs: ['clean', 'inspect', 'electrical'], tint: TINT.sky,
    icon: <G><circle cx="9" cy="17" r="5" /><circle cx="23" cy="17" r="5" /><path d="M14 17h4M4 17L2 13M28 17l2-4" /></G> },
  { name: 'Insulated tools', protects: 'Shock while tightening or cutting', spec: 'Screwdrivers, pliers and MC4 spanners rated 1,000 V.', jobs: ['electrical'], tint: TINT.sun,
    icon: <G><path d="M20 4l8 8-4 4-8-8zM16 8L5 19a3 3 0 004 4l11-11" /></G> },
  { name: 'Multimeter or clamp meter', protects: 'Touching something you thought was off', spec: 'CAT III, 1,000 V DC rated. Test before you touch.', jobs: ['inspect', 'electrical'], tint: TINT.leaf,
    icon: <G><rect x="8" y="3" width="16" height="26" rx="2" /><rect x="11" y="6" width="10" height="6" rx="1" /><circle cx="16" cy="20" r="4" /></G> },
  { name: 'Lock and tag', protects: 'Someone switching power back on', spec: 'A padlock and a "Do not switch on" tag on each isolator during work.', jobs: ['electrical'], tint: TINT.violet,
    icon: <G><rect x="7" y="14" width="18" height="14" rx="2" /><path d="M11 14V9a5 5 0 0110 0v5M16 19v4" /></G> },
  { name: 'Soft brush and plain water', protects: 'Scratching the panel glass', spec: 'Soft bristles, a long handle and no soap or pressure washer.', jobs: ['clean'], tint: TINT.leaf,
    icon: <G><path d="M18 3l-6 14M8 17h10l-1 4H9zM9 21l-1 7M12 21v7M15 21l1 7" /></G> },
  { name: 'First aid kit', protects: 'Treating cuts and burns quickly', spec: 'Kept by the stairs, checked each month. Know where it is.', jobs: ['clean', 'inspect', 'electrical', 'height'], tint: CHART.negative,
    icon: <G><rect x="4" y="9" width="24" height="18" rx="2" /><path d="M12 9V6h8v3M16 13v10M11 18h10" /></G> },
];

export const PpeKit: React.FC = () => {
  const [job, setJob] = useState<Job | 'all'>('all');
  const list = job === 'all' ? PPE : PPE.filter(p => p.jobs.includes(job));
  return (
    <Box>
      <BoxHeader title="Protective gear" meta={`${list.length} items`} />
      <p className="px-5 text-sm text-muted max-w-prose">Pick a job to see what to wear and carry for it. Students only help with cleaning and inspection, always with a teacher.</p>
      <div className="px-5 pt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Job">
        {JOBS.map(j => (
          <button
            key={j.key}
            role="radio"
            aria-checked={job === j.key}
            onClick={() => setJob(j.key)}
            className={`h-8 px-3 rounded-ctl border text-sm transition-colors ${job === j.key ? 'border-silver bg-surface-2 text-fg' : 'border-line text-muted hover:text-fg hover:bg-surface-2'}`}
          >
            {j.label}
          </button>
        ))}
      </div>
      <ul className="m-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
        {list.map(p => (
          <li key={p.name} className="bg-surface p-4 flex gap-3">
            <span className="h-11 w-11 shrink-0 rounded-box flex items-center justify-center" style={{ color: p.tint, background: `color-mix(in srgb, ${p.tint} 13%, transparent)` }}>
              {p.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{p.name}</p>
              <p className="text-xs text-muted">Protects from: {p.protects}</p>
              <p className="mt-1 text-[13px] text-muted leading-relaxed">{p.spec}{p.src && <Cite id={p.src} />}</p>
            </div>
          </li>
        ))}
      </ul>
    </Box>
  );
};

// ---------- 9. Shutdown drill ----------

const STEPS = [
  { t: 'Switch off the AC breaker', b: 'In the AC distribution board, so no power flows to the school or grid.', why: 'Stop the load first, so nothing is disconnected while current flows.' },
  { t: 'Switch off the inverter', b: 'Using its own switch or display.', why: 'The inverter stops drawing from the panels before the DC side is opened.' },
  { t: 'Open the DC isolator', b: 'This cuts panel power to the inverter. The panels themselves stay live.', why: 'Opening DC under full load can arc, so it comes after the inverter is off.' },
  { t: 'Wait at least 5 minutes', b: 'Capacitors inside the inverter keep a charge after shutdown.', why: 'The inverter needs time to discharge before anyone opens it.' },
  { t: 'Lock, tag and test', b: 'Padlock the isolators, hang a tag, then check with a meter that there is no voltage.', why: 'Only a meter proves it is safe. Never trust a switch alone.' },
];

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  // never start already solved
  return r.every((x, i) => x === a[i]) ? [...r.slice(1), r[0]] : r;
};

export const ShutdownDrill: React.FC = () => {
  const [seed, setSeed] = useState(0);
  const order = useMemo(() => shuffle(STEPS.map((_, i) => i)), [seed]);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ i: number; k: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const complete = done.length === STEPS.length;
  useEffect(() => { if (complete) markDone('drill'); }, [complete]);

  const tap = (i: number) => {
    if (done.includes(i) || complete) return;
    if (i === done.length) { setDone(d => [...d, i]); setWrong(null); }
    else { setWrong({ i, k: Date.now() }); setMistakes(m => m + 1); }
  };
  const restart = () => { setDone([]); setWrong(null); setMistakes(0); setSeed(s => s + 1); };

  return (
    <Box>
      <BoxHeader title="Shutdown drill" meta="Technicians only, practise the order" />
      <p className="px-5 text-sm text-muted max-w-prose">Before anyone works on the system it must be shut down in the right order. Tap the steps from first to last.</p>

      <div className="grid md:grid-cols-2 gap-5 p-5">
        <div>
          <p className="text-xs text-muted mb-2">Steps, mixed up</p>
          <ul className="space-y-2">
            {order.map(i => {
              const used = done.includes(i);
              const isWrong = wrong?.i === i;
              return (
                <li key={i}>
                  <button
                    onClick={() => tap(i)}
                    disabled={used}
                    className={`w-full text-left rounded-ctl border px-3 py-2.5 text-sm transition-colors ${
                      used ? 'border-line text-muted/50 line-through cursor-default' : isWrong ? 'border-bad text-fg' : 'border-line text-fg hover:bg-surface-2'
                    }`}
                  >
                    {STEPS[i].t}
                  </button>
                </li>
              );
            })}
          </ul>
          {wrong && !complete && (
            <p className="mt-2 text-xs text-muted" role="status">
              <StatusDot tone="bad" className="text-bad">Not yet</StatusDot> · "{STEPS[wrong.i].t}" comes later. What has to happen first?
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Your order</p>
          <ol className="border border-line rounded-box divide-y divide-line min-h-[120px]">
            {done.map((i, n) => (
              <li key={i} className="px-3 py-2.5 flex gap-3">
                <span className="shrink-0 h-6 w-6 rounded-ctl text-xs font-semibold flex items-center justify-center tabular-nums" style={{ background: CHART.positive, color: '#0b0b0d' }}>{n + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm text-fg">{STEPS[i].t}</p>
                  <p className="text-xs text-muted leading-relaxed">{STEPS[i].b} {STEPS[i].why}</p>
                </div>
              </li>
            ))}
            {done.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Tap the first step on the left.</li>}
          </ol>
          {complete && (
            <div className="mt-3 space-y-1.5">
              <p className="text-sm"><StatusDot tone="ok" className="text-ok">{mistakes === 0 ? 'Perfect, no mistakes' : `Done with ${mistakes} mistake${mistakes > 1 ? 's' : ''}`}</StatusDot></p>
              <p className="text-xs text-muted">To start up again, go in reverse: remove locks, close the DC isolator, switch on the inverter, then the AC breaker.</p>
            </div>
          )}
          {(done.length > 0 || mistakes > 0) && <button onClick={restart} className={`${btn.quiet} mt-3`}>Shuffle and try again</button>}
        </div>
      </div>
    </Box>
  );
};
