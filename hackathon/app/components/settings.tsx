import React from 'react';
import type { Engine } from './engine';
import { SITES, FLAG } from './sites';
import { StatusDot, More } from './ui';
import { n0, n1 } from './format';
import { lifetime } from './lifetime';
import { plan } from './rightsize';

// Site settings shared by the Map panel and every tab: change once, everything follows.
export interface Settings { yr: number; di: number; hh: 'roofs' | 'meta'; tar: number; cost: 'engine' | 'amda' | 'irena'; stage: boolean; stages: number; grant: number; loan: 'commercial' | 'concessional'; reuse: boolean }
export const DEFAULT: Settings = { yr: 5, di: 1, hh: 'roofs', tar: 0.85, cost: 'engine', stage: false, stages: 3, grant: 433, loan: 'commercial', reuse: true };

// 2024 equipment: IRENA Renewable Power Generation Costs in 2024 (solar $691/kW, batteries $192/kWh, utility averages)
// times a remote small-site premium (assumption), inverter at the engine price; wires, meters and soft costs stay 40%
export const IRENA = { pv: 691, batt: 192, inv: 315, premium: 1.5, nonGen: 0.4 };
export const COST_LABEL = { engine: '2021 engine', amda: 'AMDA 2024', irena: '2024 equipment' } as const;

// AMDA Benchmarking Africa's Minigrids 2024 (data 2022 to 2024), full build cost per connection, rough guide
export const AMDA_PER_CONNECTION: Record<string, number> = { NG: 1046, SL: 1046, MR: 1046, KE: 1948, UG: 1948, TZ: 1948 };
const COUNTRY_OF = (id: string) => SITES.find(x => x.id === id)?.data.country ?? '';

// Existing solar plant mapped within 1 km (OpenStreetMap via Overture), in kWp
export const existingPlant = (id: string) => {
  const p = (SITES.find(x => x.id === id)?.data.grid.plants ?? []).find(q => q.cls === 'plant' && q.source === 'solar' && q.output && q.d_km <= 1);
  if (!p || !p.output) return null;
  const v = parseFloat(p.output); if (!isFinite(v)) return null;
  return { kwp: /mw/i.test(p.output) ? v * 1000 : v, name: p.name, d_km: p.d_km };
};

const KEY = 'gs-settings';
export const useSettings = () => {
  const [s, setS] = React.useState<Settings>(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULT; }
  });
  const set = (p: Partial<Settings>) => setS(o => { const n = { ...o, ...p }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* private mode */ } return n; });
  return [s, set] as const;
};

// Everything the settings decide, worked out once
export const derive = (eng: Engine | undefined, s: Settings) => {
  const B = eng?.by_population;
  const meta = s.hh === 'meta' && !!B;
  const S = eng?.summary;
  const E = meta ? B!.energy_kwh_per_day : S?.energy_kwh_per_day;
  const PK = meta ? B!.peak_kw : S?.peak_kw;
  const CU = meta ? B!.customers : S?.customers;
  const dsel = meta ? 1 : s.di;
  const base0 = meta && B
    ? { design: 'P50 of year-5 demand', pv_kwp: B.p50_design.pv_kwp, battery_kwh: B.p50_design.battery_kwh, inverter_kw: (B.peak_kw[4].p50 || 0) * 1.25, capex_usd: B.p50_design.capex_usd, capacity_kwh_day: B.energy_kwh_per_day[4].p50 * 1.1 }
    : eng?.designs[s.stage ? 1 : s.di];
  // Build cost for the chosen basis
  const cc = eng ? COUNTRY_OF(eng.site) : '';
  const per = AMDA_PER_CONNECTION[cc];
  const p50kwp = meta && B ? B.p50_design.pv_kwp : eng?.designs[1].pv_kwp;
  const priced = !base0 ? undefined
    : s.cost === 'amda' && per && CU && p50kwp ? { ...base0, capex_usd: CU[4].p50 * per * (base0.pv_kwp / p50kwp) }
    : s.cost === 'irena' ? { ...base0, capex_usd: ((base0.pv_kwp * IRENA.pv + base0.battery_kwh * IRENA.batt) * IRENA.premium + base0.inverter_kw * IRENA.inv) / (1 - IRENA.nonGen) }
    : base0;
  // Build in stages (right-sized, components/rightsize.ts): stage 1 for years 1-2 and stage 2 from year 3, each sized
  // so brownout odds stay under 15% while idle capacity is as low as possible. Equipment scales with capacity;
  // wires, meters and soft costs (40%) are built for the homes connected by year 2, the rest with stage 2.
  const P = s.stage && E && priced ? plan(E, priced.capacity_kwh_day, priced, s.stages ?? 3) : undefined;
  // wires for the homes connected by the end of each stage's years
  const wiresBy = (lastYear: number) => (CU ? Math.min(1, CU[lastYear - 1].p50 / CU[4].p50) : 1);
  const cumCapex = (k: number) => priced!.capex_usd * (0.6 * P!.caps[k] / priced!.capacity_kwh_day + 0.4 * wiresBy(P!.groups[k][P!.groups[k].length - 1]));
  const kitFor = (c: number) => ({ pv_kwp: c * P!.kwpPerCap, battery_kwh: c * P!.kwhPerCap, inverter_kw: priced!.inverter_kw * c / priced!.capacity_kwh_day, capacity_kwh_day: c });
  const last = P ? P.caps.length - 1 : 0;
  const full = P && priced ? { ...priced, design: 'Stages, full', ...kitFor(P.caps[last]), capex_usd: cumCapex(last) } : priced;
  const des = P && priced ? { ...priced, design: 'Stage 1 (right-sized)', ...kitFor(P.caps[0]), capex_usd: cumCapex(0) } : priced;
  // Later stages: the year they are added, what they cost and the kit they add
  // Results-based grants are paid as homes connect: each stage gets the share of connections made in its years
  const connBy = (k: number) => wiresBy(P!.groups[k][P!.groups[k].length - 1]);
  const grantShare0 = P ? connBy(0) : 1;
  const adds = P && priced ? P.caps.slice(1).map((c, i) => ({ year: P.groups[i + 1][0], capex_usd: cumCapex(i + 1) - cumCapex(i), kit: kitFor(c), prev: kitFor(P.caps[i]), grantShare: connBy(i + 1) - connBy(i) })) : [];
  const stage2 = adds.length ? { capex_usd: adds.reduce((a, x) => a + x.capex_usd, 0), month: (adds[0].year - 1) * 12 + 1, capacity_kwh_day: full!.capacity_kwh_day, adds } : undefined;
  // Build on an existing plant: its panels count toward each stage, so fewer new panels are bought
  const ex = s.reuse && eng ? existingPlant(eng.site) : null;
  const pvPrice = s.cost === 'irena' ? IRENA.pv * IRENA.premium : 2133;
  const credit = (kit: { pv_kwp: number } | undefined) => ex && kit ? Math.min(ex.kwp, kit.pv_kwp) * pvPrice : 0;
  const reuse = ex ? { kwp: ex.kwp, name: ex.name, saved: credit(full) } : null;
  const desR = des && ex ? { ...des, capex_usd: des.capex_usd - credit(des) } : des;
  const fullR = full && ex ? { ...full, capex_usd: full.capex_usd - credit(full) } : full;
  if (ex && adds.length) { let prev = credit(des); adds.forEach(a => { const c = credit(a.kit); a.capex_usd -= c - prev; prev = c; }); if (stage2) stage2.capex_usd = adds.reduce((t, a) => t + a.capex_usd, 0); }
  const tsel = eng?.tariffs.find(t => t.tariff_usd_per_kwh === s.tar);
  const rk = !meta && des && !s.stage ? eng?.risk.find(r => r.design === des.design && r.year === s.yr) : undefined;
  const dem = E?.[s.yr - 1];
  return { meta, E, PK, CU, dsel, des: desR, tsel, rk, dem, stage2, full: fullR, plan: P, adds, grantShare0, reuse };
};

const usd = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}k`;
const pc = (v: number) => `${Math.round(v * 100)}%`;

export const Seg: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`space-y-1.5 min-w-0 ${className}`}><p className="text-xs text-muted">{label}</p><div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label={label}>{children}</div></div>
);
// Plain-words note for the size buttons
export const SizeNote: React.FC = () => (
  <More label="What P25, P50, P90 mean" className="mt-1">
    <p className="text-[11px] text-muted leading-relaxed max-w-[44ch]">Kesho runs 4,000 possible futures. P50 is the middle one: half come in higher, half lower. A P50 system is built for that year-5 demand, so running short by year 5 is about a coin flip. P25 is smaller and cheaper but runs short in about 3 futures in 4; P75 and P90 are bigger, rarely run short, and sit idle more. Stages builds in steps, each kept to 15% or less chance of running short.</p>
  </More>
);

export const opt = (on: boolean, onClick: () => void, text: React.ReactNode, key: React.Key, disabled = false) => (
  <button key={key} role="radio" aria-checked={on} disabled={disabled} onClick={onClick}
    className={`h-8 flex-1 px-2 text-xs tabular-nums whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed ${on ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{text}</button>
);

// The controls: year, system size, household count, tariff
export const Controls: React.FC<{ eng: Engine; s: Settings; set: (p: Partial<Settings>) => void; className?: string }> = ({ eng, s, set, className = '' }) => {
  const { meta, dsel } = derive(eng, s);
  const tariffs = eng.tariffs.filter((t, i, a) => a.findIndex(u => u.tariff_usd_per_kwh === t.tariff_usd_per_kwh) === i);
  return (
    <div className={className}>
      <Seg label="Year after connection">{[1, 2, 3, 4, 5].map(y => opt(s.yr === y, () => set({ yr: y }), y, y))}</Seg>
      <div className="min-w-0"><Seg label="System size">{eng.designs.map((d, i) => opt(!s.stage && dsel === i, () => set({ di: i, stage: false }), d.design.split(' ')[0], d.design, meta && i !== 1))}{opt(s.stage, () => set({ stage: true }), 'Stages', 'st')}</Seg><SizeNote /></div>
      {eng.by_population && <Seg label="Households from">{opt(!meta, () => set({ hh: 'roofs' }), 'Roofs', 'r')}{opt(meta, () => set({ hh: 'meta' }), "Meta's map", 'm')}</Seg>}
      {existingPlant(eng.site) && <Seg label={`Existing ${Math.round(existingPlant(eng.site)!.kwp)} kWp solar plant`}>{opt(s.reuse, () => set({ reuse: true }), 'Build on it', 'ry')}{opt(!s.reuse, () => set({ reuse: false }), 'Start fresh', 'rn')}</Seg>}
      <Seg label="Build cost">{(['engine', 'irena', 'amda'] as const).map(c => opt(s.cost === c, () => set({ cost: c }), c === 'engine' ? '2021' : c === 'irena' ? '2024 kit' : 'AMDA', c))}</Seg>
      <Seg label="Tariff, $ per kWh">{tariffs.map(t => opt(s.tar === t.tariff_usd_per_kwh, () => set({ tar: t.tariff_usd_per_kwh }), t.tariff_usd_per_kwh.toFixed(2), t.tariff_usd_per_kwh, meta))}</Seg>
    </div>
  );
};

// The answer for the chosen settings, in five numbers
export const Answer: React.FC<{ eng: Engine; s: Settings }> = ({ eng, s }) => {
  const { meta, des, tsel, rk, dem, CU, reuse } = derive(eng, s);
  const cells: { k: string; v: React.ReactNode; sub?: React.ReactNode }[] = [
    { k: `Demand, year ${s.yr}`, v: dem ? <>{n0(dem.p50)} <span className="text-xs text-muted font-sans">kWh a day</span></> : '-', sub: dem ? `${n0(dem.p10)} to ${n0(dem.p90)}` : undefined },
    { k: s.stage ? 'Stage 1 system' : `${des?.design.split(' ')[0]} system`, v: des ? <>{n0(des.pv_kwp)} <span className="text-xs text-muted font-sans">kWp</span></> : '-', sub: des ? `${n0(des.battery_kwh)} kWh battery · ${usd(des.capex_usd)} (${COST_LABEL[s.cost]}${reuse ? `, uses existing ${n0(reuse.kwp)} kWp` : ''}, rough)` : undefined },
    { k: `Brownouts, year ${s.yr}`, v: rk ? <StatusDot tone={rk.p_brownouts > 0.3 ? 'bad' : rk.p_brownouts > 0.15 ? 'warn' : 'ok'}>{pc(rk.p_brownouts)}</StatusDot> : '-', sub: rk ? `under 60% used: ${pc(rk.p_underused)}` : meta ? 'run for the roof count' : undefined },
    { k: `Covers cost at $${s.tar.toFixed(2)}`, v: tsel && !meta ? <StatusDot tone={tsel.p_revenue_covers_cost_year5 >= 0.8 ? 'ok' : tsel.p_revenue_covers_cost_year5 >= 0.5 ? 'warn' : 'bad'}>{pc(tsel.p_revenue_covers_cost_year5)}</StatusDot> : '-', sub: s.cost !== 'engine' || s.stage ? 'of futures, P50, 2021 engine costs' : 'of futures, P50 system, year 5' },
    { k: 'Home bill, year 5', v: tsel && !meta ? <>${n1(tsel.year5_household_bill_usd_month_p50)} <span className="text-xs text-muted font-sans">a month</span></> : '-', sub: `at $${s.tar.toFixed(2)} a kWh` },
    { k: "Owner's money back", v: (() => { const L = lifetime(eng, s, s.grant * (CU?.[4].p50 ?? 0)); return L?.ownerPayback == null ? <span className="text-bad">20+ yrs</span> : <span className={L.ownerPayback <= 7 ? 'text-ok' : L.ownerPayback <= 12 ? 'text-warn' : 'text-bad'}>{n1(L.ownerPayback)} <span className="text-xs text-muted font-sans">yrs</span></span>; })(), sub: `$${s.grant} grant, ${s.loan} loan` },
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line border border-line rounded-ctl overflow-hidden">
      {cells.map(c => (
        <div key={c.k} className="bg-surface-2 px-3 py-2 min-w-0">
          <dt className="text-[11px] text-muted truncate">{c.k}</dt>
          <dd className="font-display text-lg tabular-nums leading-tight">{c.v}</dd>
          {c.sub && <dd className="text-[11px] text-muted truncate">{c.sub}</dd>}
        </div>
      ))}
    </dl>
  );
};

// Bar above every tab: village, settings and the answer
export const SettingsBar: React.FC<{ eng?: Engine; s: Settings; set: (p: Partial<Settings>) => void; siteId: string; onPick: (id: string) => void; goTab: (t: number) => void }> = ({ eng, s, set, siteId, onPick, goTab }) => {
  const [open, setOpen] = React.useState(false);
  return (
  <section aria-label="Site settings" className="bg-surface border border-line rounded-box p-3 sm:p-4 space-y-3">
    <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
      <span className="text-muted mr-1 shrink-0">Village</span>
      {SITES.map(x => (
        <button key={x.id} onClick={() => onPick(x.id)} aria-pressed={siteId === x.id}
          className={`shrink-0 h-8 px-3 rounded-ctl border transition text-sm ${siteId === x.id ? 'bg-line border-line text-fg font-medium' : 'bg-surface-2 border-line text-muted hover:text-fg'}`}>
          {x.data.name} <span className="text-muted font-normal">· {FLAG[x.data.country] ?? x.data.country}</span>
        </button>
      ))}
      <button onClick={() => goTab(1)} className="shrink-0 h-8 px-2 text-muted hover:text-fg underline underline-offset-2 decoration-line">Any location</button>
    </div>
    {eng && <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="sm:hidden text-xs text-muted hover:text-fg underline underline-offset-2 decoration-line">{open ? 'Hide settings' : `Change settings · year ${s.yr}, ${['P25', 'P50', 'P75', 'P90'][derive(eng, s).dsel]}, ${s.hh === 'meta' ? "Meta's map" : 'roofs'}, $${s.tar.toFixed(2)}`}</button>}
    {eng && <Controls eng={eng} s={s} set={set} className={`${open ? 'grid' : 'hidden'} sm:grid gap-3 grid-cols-2 lg:grid-cols-5`} />}
    {eng && <div className="hidden sm:block"><Answer eng={eng} s={s} /></div>}
  </section>
  );
};

// Phones: the answer stays in view at the bottom of the screen
export const PhoneBar: React.FC<{ eng: Engine; s: Settings }> = ({ eng, s }) => {
  const { des, tsel, dem, meta } = derive(eng, s);
  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line grid grid-cols-3 divide-x divide-line pb-[env(safe-area-inset-bottom)]" aria-label="Answer for the chosen settings">
      <div className="px-3 py-2 min-w-0"><p className="text-[10px] text-muted truncate">Demand, yr {s.yr}</p><p className="font-display text-base tabular-nums">{dem ? n0(dem.p50) : '-'} <span className="text-[10px] text-muted font-sans">kWh/day</span></p></div>
      <div className="px-3 py-2 min-w-0"><p className="text-[10px] text-muted truncate">{s.stage ? 'Stage 1' : des?.design.split(' ')[0]} system</p><p className="font-display text-base tabular-nums">{des ? n0(des.pv_kwp) : '-'} <span className="text-[10px] text-muted font-sans">kWp</span></p></div>
      <div className="px-3 py-2 min-w-0"><p className="text-[10px] text-muted truncate">Covers cost at ${s.tar.toFixed(2)}</p><p className="font-display text-base tabular-nums">{tsel && !meta ? `${Math.round(tsel.p_revenue_covers_cost_year5 * 100)}%` : '-'}</p></div>
    </div>
  );
};

// Links to each box on the page, read from the box titles after render
export const JumpLinks: React.FC<{ deps: unknown[] }> = ({ deps }) => {
  const ref = React.useRef<HTMLElement>(null);
  const [items, setItems] = React.useState<{ id: string; t: string }[]>([]);
  React.useEffect(() => {
    const root = ref.current?.parentElement; if (!root) return;
    const hs = [...root.querySelectorAll<HTMLElement>('h3')].filter(h => h.closest('.rounded-box') && !h.closest('[aria-label="Site settings"]'));
    setItems(hs.map((h, i) => { if (!h.id) h.id = `sec-${i}-${(h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`; return { id: h.id, t: h.textContent || '' }; }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <nav ref={ref} aria-label="On this page" className={`flex items-center gap-x-3 gap-y-1 text-xs overflow-x-auto no-scrollbar -mx-[var(--gutter)] px-[var(--gutter)] sm:mx-0 sm:px-0 sm:flex-wrap ${items.length < 3 ? 'hidden' : ''}`}>
      <span className="text-muted shrink-0">On this page</span>
      {items.map(x => (
        <a key={x.id} href={`#${x.id}`} onClick={e => { e.preventDefault(); document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          className="shrink-0 text-muted hover:text-fg underline underline-offset-2 decoration-line">{x.t}</a>
      ))}
    </nav>
  );
};
