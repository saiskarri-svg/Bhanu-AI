import React from 'react';
import { ResponsiveContainer } from 'recharts';

// Chart styling shared by every Recharts view
// Colours carry meaning: sun = solar output, monsoon = rain months,
// leaf = savings and carbon, ember = money still owed, sky = time and grid.
export const CHART = {
  grid: '#2a2a30',
  axis: '#9a9aa3',
  primary: '#e8e8ea',
  sun: '#ffc23d',
  sunLow: '#ff7a3d',
  monsoon: '#5aa9ff',
  positive: '#34d65c',
  negative: '#ff6f66',
  faint: '#5a5a63',
};

export const TINT = {
  sun: '#ffc23d',
  leaf: '#34d65c',
  sky: '#6ab8ff',
  violet: '#b49cff',
};

export const axisProps = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export const Box: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-surface border border-line rounded-box ${className}`}>{children}</div>
);

// Boxes fade and rise in the first time they scroll into view. Call it on a
// page's root when the tab changes: it picks the outer boxes and sections
// (not ones inside another box), and one observer staggers boxes that
// arrive together. Reduced motion skips it.
let revealObserver: IntersectionObserver | null = null;
export const revealWithin = (root: HTMLElement | null) => {
  if (!root || typeof IntersectionObserver === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  revealObserver ??= new IntersectionObserver(entries => {
    let i = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      el.style.transitionDelay = `${Math.min(i++, 5) * 60}ms`;
      el.classList.add('in');
      revealObserver!.unobserve(el);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  // Outer boxes taller than the screen pass the effect down to the boxes inside
  const pick = (within: HTMLElement): HTMLElement[] =>
    [...within.querySelectorAll<HTMLElement>('.rounded-box, section')]
      .filter(el => el.parentElement?.closest('.rounded-box, section') === (within === root ? null : within))
      .flatMap(el => {
        if (el.offsetHeight > window.innerHeight * 1.2) { const inner = pick(el); if (inner.length > 1) return inner; }
        return [el];
      });
  const els = pick(root).filter(el => !el.classList.contains('in'));
  els.forEach(el => { el.classList.add('reveal'); revealObserver!.observe(el); });
  return () => els.forEach(el => revealObserver?.unobserve(el));
};

const motionOK = () =>
  typeof IntersectionObserver !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Runs once, the first time the element is mostly on screen
const useFirstSeen = (ref: React.RefObject<Element>, enabled: boolean, onSeen: () => void) => {
  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); onSeen(); } }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
};

// Use in place of ResponsiveContainer: the chart is drawn when it scrolls into
// view, so its draw-in animation is seen instead of finishing off screen.
// The parent must have a fixed height, as every chart here does.
export const ResponsiveChart: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(() => !motionOK());
  useFirstSeen(ref, !seen, () => setTimeout(() => setSeen(true), 120));
  return (
    <div ref={ref} className="h-full w-full">
      {seen && <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
    </div>
  );
};

// A big number that counts up from zero the first time it is seen. Keeps the
// text around the number (₹, %, units), its decimals and its commas. Later
// changes, from a slider say, show straight away.
export const CountUp: React.FC<{ value: React.ReactNode }> = ({ value }) => {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  const m = text.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  const ref = React.useRef<HTMLSpanElement>(null);
  const format = (n: number) => {
    if (!m) return text;
    const decimals = m[2].includes('.') ? m[2].split('.')[1].length : 0;
    const body = m[2].includes(',')
      ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : n.toFixed(decimals);
    return m[1] + body + m[3];
  };
  const [shown, setShown] = React.useState<string | null>(() => (m && motionOK() ? format(0) : null));
  const latest = React.useRef(m);
  latest.current = m;
  useFirstSeen(ref, shown !== null, () => {
    const start = performance.now();
    const step = (t: number) => {
      const cur = latest.current;
      const target = cur ? parseFloat(cur[2].replace(/,/g, '')) : 0;
      const k = Math.min(1, (t - start) / 900);
      if (k < 1 && cur) { setShown(format(target * (1 - Math.pow(1 - k, 3)))); requestAnimationFrame(step); }
      else setShown(null);
    };
    requestAnimationFrame(step);
  });
  return <span ref={ref}>{shown ?? value}</span>;
};

// Shows after scrolling well down a long page, and takes you back to the top
export const BackToTop: React.FC = () => {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 1.5);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      className={`back-to-top fixed z-40 right-[var(--gutter)] bottom-[calc(16px+env(safe-area-inset-bottom,0px))] h-11 w-11 grid place-items-center rounded-full border border-line bg-surface-2/90 text-fg shadow-lg hover:bg-line ${show ? 'show' : ''}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 16V4m0 0L5 9m5-5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export const BoxHeader: React.FC<{ title: string; meta?: React.ReactNode }> = ({ title, meta }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 pb-1">
    <h3 className="text-[15px] font-semibold text-fg whitespace-nowrap">{title}</h3>
    {meta && <div className="text-xs text-muted">{meta}</div>}
  </div>
);

export interface Stat {
  label: string;
  icon?: React.ReactNode;
  tint?: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
}

// One strip split by 1px lines instead of separate tiles
export const StatStrip: React.FC<{ stats: Stat[]; cols?: 3 | 4; className?: string }> = ({ stats, cols = 4, className = '' }) => (
  <div className={`grid ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'} gap-px bg-line border border-line rounded-box overflow-hidden ${className}`}>
    {stats.map(s => (
      <div key={s.label} className="bg-surface px-5 py-4 min-w-0">
        <p className="flex items-center gap-2 text-xs text-muted">
          {s.icon && (
            <span
              className="h-6 w-6 shrink-0 rounded-ctl flex items-center justify-center"
              style={{ color: s.tint, background: `color-mix(in srgb, ${s.tint} 14%, transparent)` }}
              aria-hidden="true"
            >
              {s.icon}
            </span>
          )}
          {s.label}
        </p>
        <p className="mt-1 flex items-baseline gap-1.5 min-w-0">
          <span className="font-display font-semibold text-[28px] leading-none text-fg tabular-nums truncate"><CountUp value={s.value} /></span>
          {s.unit && <span className="text-xs text-muted whitespace-nowrap">{s.unit}</span>}
        </p>
        {s.note && <p className="mt-2 text-xs text-muted leading-relaxed">{s.note}</p>}
      </div>
    ))}
  </div>
);

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

const toneClass: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
  muted: 'bg-muted',
};

// Colour as a small dot plus plain text, no box
export const StatusDot: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({ tone, children, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${toneClass[tone]}`} aria-hidden="true" />
    {children}
  </span>
);

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export const TooltipCard: React.FC<{ title: string; rows: TooltipRow[] }> = ({ title, rows }) => (
  <div className="bg-surface-2 border border-line rounded-box shadow-pop px-3 py-2.5 min-w-[160px]">
    <p className="text-xs text-muted mb-1.5">{title}</p>
    {rows.map(r => (
      <div key={r.label} className="flex items-center justify-between gap-6 text-[13px]">
        <span className="flex items-center gap-1.5 text-muted">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
          {r.label}
        </span>
        <span className="text-fg font-medium tabular-nums">{r.value}</span>
      </div>
    ))}
  </div>
);

export const Legend: React.FC<{ items: { label: string; color: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
    {items.map(i => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
        {i.label}
      </span>
    ))}
  </div>
);

export const SunMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="7.1" y2="7.1" />
      <line x1="16.9" y1="16.9" x2="18.7" y2="18.7" />
      <line x1="5.3" y1="18.7" x2="7.1" y2="16.9" />
      <line x1="16.9" y1="7.1" x2="18.7" y2="5.3" />
    </g>
  </svg>
);

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-ctl bg-accent text-[#0b0b0d] text-sm font-semibold hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition',
  secondary: 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-ctl bg-surface-2 border border-line text-fg text-sm font-medium hover:bg-line transition',
  quiet: 'inline-flex items-center gap-1 text-sm text-muted hover:text-fg transition',
};

// Small 16px line icons for stat labels
const I: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg className="icon-draw h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const Icons = {
  sun: <I><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></I>,
  leaf: <I><path d="M3 13c0-6 4-9.5 10-10-.5 6-4 10-10 10z" /><path d="M3 13l5.5-5.5" /></I>,
  clock: <I><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></I>,
  rupee: <I><path d="M4.5 3h7M4.5 6h7M6 3c3.5 0 3.5 6 0 6H4.5l5 4.5" /></I>,
  bolt: <I><path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" /></I>,
  room: <I><path d="M2.5 13.5V6L8 2.5 13.5 6v7.5zM6.5 13.5V9.5h3v4" /></I>,
  screen: <I><rect x="2" y="3" width="12" height="8" rx="1" /><path d="M6 14h4M8 11v3" /></I>,
  book: <I><path d="M3 2.5h7.5a2 2 0 012 2v9H5a2 2 0 01-2-2z" /><path d="M3 11.5a2 2 0 012-2h7.5" /></I>,
  tree: <I><path d="M8 14.5V9M8 1.5L3.5 8h9z" /><path d="M5 11h6" /></I>,
  wifi: <I><path d="M2 6.5a9 9 0 0112 0M4.25 9a5.5 5.5 0 017.5 0" /><circle cx="8" cy="12" r="0.75" fill="currentColor" /></I>,
  drop: <I><path d="M8 1.5S3.5 6.5 3.5 9.5a4.5 4.5 0 009 0C12.5 6.5 8 1.5 8 1.5z" /></I>,
};
