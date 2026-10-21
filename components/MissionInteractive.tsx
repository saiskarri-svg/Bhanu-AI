import React, { useEffect, useRef, useState } from 'react';
import { StatusDot, TINT, Icons, btn } from './ui';
import { Cite } from './Sources';
import DrawBulb from './DrawBulb';

// Interactive pieces for the Mission tab: what the system becomes, who it
// helps, the problems it fixes, how it scales, and where to go next.

const mix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

const IconChip: React.FC<{ color: string; children: React.ReactNode; big?: boolean }> = ({ color, children, big }) => (
  <span className={`${big ? 'h-10 w-10' : 'h-7 w-7'} shrink-0 rounded-ctl flex items-center justify-center`} style={{ color, background: mix(color, 14) }} aria-hidden="true">
    {children}
  </span>
);

// ---------- 1. One roof, three jobs ----------

const ROLES = [
  { key: 'plant', title: 'A power plant', icon: Icons.bolt, color: TINT.sun, line: 'Daytime power for lights, fans and computers, made on the school roof.', more: 'Every unit made on the roof is a unit the school does not buy. Spare units go to the grid and earn a credit on the bill.', tab: 0, cta: 'See today\'s power' },
  { key: 'class', title: 'A classroom', icon: Icons.book, color: TINT.sky, line: 'Students learn science from real data on their own roof.', more: 'Lessons on how solar works, safety, sizing and a live simulator, plus quizzes and a certificate.', tab: 4, cta: 'Open the lessons' },
  { key: 'train', title: 'A training ground', icon: Icons.leaf, color: TINT.leaf, line: 'The first step to skilled solar jobs, starting in class 6.', more: 'Students who clean, log and check the system learn the same skills installers and technicians use every day.', tab: 4, cta: 'Explore careers' },
];

export const ThreeJobs: React.FC<{ onGo: (tab: number) => void }> = ({ onGo }) => {
  const [open, setOpen] = useState('plant');
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">One roof, three jobs</h3>
      <p className="text-sm text-muted">Tap each one to see what it means for the school.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {ROLES.map(r => {
          const on = open === r.key;
          return (
            <button key={r.key} onClick={() => setOpen(r.key)} aria-expanded={on}
              className="text-left rounded-box border p-4 transition-colors duration-200"
              style={{ borderColor: on ? r.color : 'var(--line)', background: on ? mix(r.color, 8) : 'var(--surface)' }}>
              <IconChip color={r.color} big>{r.icon}</IconChip>
              <p className="mt-3 font-semibold text-fg">{r.title}</p>
              <p className="mt-1 text-sm text-muted leading-relaxed">{r.line}</p>
            </button>
          );
        })}
      </div>
      {ROLES.filter(r => r.key === open).map(r => (
        <div key={r.key} className="mission-fade rounded-box border border-line bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-silver leading-relaxed max-w-prose">{r.more}</p>
          <button onClick={() => onGo(r.tab)} className={`${btn.secondary} shrink-0 whitespace-nowrap`}>{r.cta}</button>
        </div>
      ))}
    </section>
  );
};

// ---------- 2. Who it helps ----------

const GROUPS = [
  {
    key: 'children', label: 'Children', color: TINT.sun,
    points: [
      ['Cooler, brighter classrooms', <>Heat makes learning harder<Cite id="heat-schools" />. Daytime solar runs lights and fans and cuts the bill. With a backup battery, they stay on through power cuts too.</>, Icons.sun],
      ['Computer labs that cost less', 'Daytime solar runs the lab. A UPS or battery keeps computers on through power cuts and voltage dips.', Icons.screen],
      ['Science they can touch', 'Students read data from their own roof, test ideas in the simulator and see the results the next day.', Icons.book],
      ['A path to skilled work', 'The same skills used by solar installers, technicians, engineers and data analysts, starting in class 6.', Icons.bolt],
    ],
  },
  {
    key: 'community', label: 'Community', color: TINT.leaf,
    points: [
      ['Money that stays local', 'Lower electricity bills free up school funds for books, meals and materials.', Icons.rupee],
      ['Jobs close to home', 'Every system needs trained people nearby to clean, inspect and repair it.', Icons.room],
      ['A stronger village grid', 'Schools make power in the daytime, when feeders are most strained, and send spare units to neighbours through the grid.', Icons.bolt],
      ['Cleaner air and a model to copy', 'Parents and farmers see clean power working every day, and bring it to their homes and fields.', Icons.leaf],
    ],
  },
  {
    key: 'world', label: 'Companies and the world', color: TINT.sky,
    points: [
      ['A trained workforce', <>India aims for 500 GW of non-fossil power capacity by 2030<Cite id="target-500" />. Every gigawatt needs thousands of skilled people<Cite id="jobs-gw" />, and schools are where they start.</>, Icons.room],
      ['Data from hard climates', 'Daily readings from hot, dusty and monsoon conditions help makers and installers build panels and maintenance plans that last.', Icons.wifi],
      ['A programme anyone can fund', 'Simple tools and open lessons that companies, CSR programmes and NGOs can bring to any school, anywhere.', Icons.rupee],
      ['Real climate progress', <>Each unit from India's grid releases about 0.72 kg of CO₂<Cite id="cea-co2" />, so each school avoids tonnes a year. Across thousands of schools, that adds up.</>, Icons.tree],
    ],
  },
] as const;

export const WhoItHelps: React.FC = () => {
  const [g, setG] = useState(0);
  const group = GROUPS[g];
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">Who it helps</h3>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Who it helps">
        {GROUPS.map((x, i) => (
          <button key={x.key} role="tab" aria-selected={g === i} onClick={() => setG(i)}
            className="h-9 px-3.5 rounded-ctl border text-sm flex items-center gap-2 transition-colors"
            style={{ borderColor: g === i ? x.color : 'var(--line)', color: g === i ? 'var(--fg)' : 'var(--muted)', background: g === i ? mix(x.color, 10) : 'transparent' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: x.color }} aria-hidden="true" />
            {x.label}
          </button>
        ))}
      </div>
      <div key={group.key} className="mission-fade grid sm:grid-cols-2 gap-px bg-line border border-line rounded-box overflow-hidden">
        {group.points.map(([t, b, icon], i) => (
          <div key={t} className="bg-surface p-5 flex gap-3" style={{ animationDelay: `${i * 60}ms` }}>
            <IconChip color={group.color}>{icon}</IconChip>
            <div>
              <p className="text-sm font-semibold text-fg">{t}</p>
              <p className="mt-1 text-sm text-muted leading-relaxed">{b}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{g + 1} of {GROUPS.length}</span>
        <button onClick={() => setG((g + 1) % GROUPS.length)} className="hover:text-fg">Next: {GROUPS[(g + 1) % GROUPS.length].label} →</button>
      </div>
    </section>
  );
};

// ---------- 3. Problems, with the fix behind a tap ----------

const PROBLEMS = [
  {
    stat: '73,000+', of: 'schools in India still have no electricity at all', cite: 'udise-power',
    detail: 'About 1 in 15 schools has no working electricity. Where schools are connected, long power cuts and heat still cut lessons short.',
    fix: 'Solar power runs fans and lights in the daytime and cuts the bill. A grid-tied system switches off in a power cut, so where cuts are long, add a backup battery to keep them on.', fixCite: 'cea-connect',
  },
  {
    stat: '17%', of: "of India's electricity is lost on the grid", cite: 'td-loss',
    detail: 'Transmission and distribution losses waste power on the way, and losses are often higher on long rural lines.',
    fix: 'Power made on the school roof is used right where it is made, and schools become small energy hubs that ease the rural grid during the day.',
  },
];

export const Problems: React.FC = () => {
  const [shown, setShown] = useState<Record<number, boolean>>({});
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">The problems we are solving</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {PROBLEMS.map((p, i) => {
          const on = !!shown[i];
          return (
            <div key={i} className="rounded-box border bg-surface p-5 flex flex-col gap-3 transition-colors duration-300"
              style={{ borderColor: on ? 'var(--ok)' : 'var(--line)' }}>
              <p className="flex items-baseline gap-2">
                <span className="font-display font-semibold text-4xl tabular-nums" style={{ color: on ? 'var(--ok)' : 'var(--bad)' }}>{p.stat}</span>
                <span className="text-sm text-silver">{p.of}<Cite id={p.cite} /></span>
              </p>
              <p className="text-sm text-muted leading-relaxed">{p.detail}</p>
              {on && (
                <div className="mission-fade flex gap-3 items-start">
                  <DrawBulb className="h-14 w-14 shrink-0 -ml-1" title="Idea" />
                  <div className="space-y-1.5">
                    <StatusDot tone="ok" className="text-xs text-muted">With Bhanu AI</StatusDot>
                    <p className="text-sm text-fg leading-relaxed">{p.fix}{p.fixCite && <Cite id={p.fixCite} />}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShown(s => ({ ...s, [i]: !on }))}
                aria-expanded={on}
                className={on
                  ? `${btn.quiet} self-start mt-auto`
                  : 'fix-cta self-start mt-auto h-10 pl-3 pr-4 rounded-ctl border text-sm font-semibold inline-flex items-center gap-2 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0'}
                style={on ? undefined : { color: 'var(--ok)', borderColor: 'color-mix(in srgb, var(--ok) 55%, transparent)', background: 'color-mix(in srgb, var(--ok) 12%, transparent)' }}
              >
                {!on && <DrawBulb loop small className="h-6 w-6 -my-1 -ml-0.5" />}
                {on ? 'Hide the fix' : 'See the fix'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ---------- 4. Scale it up ----------

const STEPS = [1, 10, 100, 1000, 10000, 100000];
const GOV_SCHOOLS = 1000000; // roughly 10 lakh government schools in India
const STUDENTS_PER_SCHOOL = 250; // rough guide for a rural government school
const TECHS_PER_SCHOOL = 2;

const useCountUp = (target: number) => {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setV(target); from.current = target; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target]);
  return v;
};

const compact = (n: number) => {
  const t = (x: number, d: number) => String(Number(x.toFixed(d)));
  if (n >= 1e7) return `${t(n / 1e7, n >= 1e8 ? 0 : 1)} crore`;
  if (n >= 1e5) return `${t(n / 1e5, n >= 1e6 ? 0 : 1)} lakh`;
  return Math.round(n).toLocaleString('en-IN');
};

const Counter: React.FC<{ value: number; format: (n: number) => string; label: string; unit?: string; icon: React.ReactNode; color: string }> = ({ value, format, label, unit, icon, color }) => {
  const v = useCountUp(value);
  return (
    <div className="bg-surface px-5 py-4">
      <p className="flex items-center gap-2 text-xs text-muted"><IconChip color={color}>{icon}</IconChip>{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display font-semibold text-[26px] leading-none tabular-nums">{format(v)}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </p>
    </div>
  );
};

export const ScaleUp: React.FC<{ annualGen: number; unitPrice: number; co2PerSchool: number; treesPerSchool: number }> = ({ annualGen, unitPrice, co2PerSchool, treesPerSchool }) => {
  const [step, setStep] = useState(3);
  const n = STEPS[step];
  const share = (n / GOV_SCHOOLS) * 100;
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">One school, then a thousand</h3>
      <p className="text-sm text-muted">Slide to see what schools like this one add up to in a year.</p>
      <div className="rounded-box border border-line bg-surface p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">Schools</span>
          <span className="font-display font-semibold text-3xl text-accent tabular-nums">{compact(n)}</span>
        </div>
        <input type="range" min={0} max={STEPS.length - 1} step={1} value={step} onChange={e => setStep(Number(e.target.value))}
          aria-label="Number of schools" aria-valuetext={`${compact(n)} schools`} className="w-full" />
        <div className="flex justify-between text-[11px] text-muted tabular-nums" aria-hidden="true">
          {STEPS.map(s => <span key={s}>{compact(s)}</span>)}
        </div>
        <div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(share, 0.6)}%`, background: TINT.sun }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{share < 0.01 ? 'Less than 0.01' : share.toFixed(share < 1 ? 2 : 0)}% of India's roughly 10 lakh government schools<Cite id="udise-schools" /></p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
        <Counter value={annualGen * n / 1e6} format={v => (v < 10 ? v.toFixed(2) : compact(v))} unit="GWh a year" label="Clean power" icon={Icons.sun} color={TINT.sun} />
        <Counter value={co2PerSchool * n} format={compact} unit="tonnes a year" label="CO₂ avoided" icon={Icons.leaf} color={TINT.leaf} />
        <Counter value={annualGen * unitPrice * n} format={v => `₹${compact(v)}`} unit="a year" label="Bills saved" icon={Icons.rupee} color={TINT.violet} />
        <Counter value={STUDENTS_PER_SCHOOL * n} format={compact} label="Students learning solar" icon={Icons.book} color={TINT.sky} />
        <Counter value={TECHS_PER_SCHOOL * n} format={compact} label="Local technicians trained" icon={Icons.room} color={TINT.sun} />
        <Counter value={treesPerSchool * n} format={compact} label="Trees equivalent" icon={Icons.tree} color={TINT.leaf} />
      </div>
      <p className="text-xs text-muted">Rough guide: about {STUDENTS_PER_SCHOOL} students and {TECHS_PER_SCHOOL} trained technicians per school, with this school's size and sunshine.</p>
    </section>
  );
};

// ---------- 5. Where to go next ----------

export const NextSteps: React.FC<{ onGo: (tab: number) => void }> = ({ onGo }) => (
  <section className="rounded-box border border-line bg-surface p-6 text-center space-y-4" style={{ background: `radial-gradient(120% 140% at 50% 0%, ${mix(TINT.sun, 10)}, var(--surface) 60%)` }}>
    <h3 className="text-xl font-semibold">Bring it to the next school</h3>
    <p className="text-sm text-muted max-w-prose mx-auto">Size a system for a school, show a funder the numbers, or start teaching with the lessons.</p>
    <div className="flex flex-wrap justify-center gap-2">
      <button onClick={() => onGo(1)} className={btn.primary}>See the funding options</button>
      <button onClick={() => onGo(4)} className={btn.secondary}>Start the lessons</button>
      <button onClick={() => onGo(6)} className={btn.secondary}>Share the impact</button>
    </div>
  </section>
);
