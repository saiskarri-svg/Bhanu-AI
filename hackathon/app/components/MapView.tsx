import React from 'react';
import type { Building, Cls, SiteData } from './model';
import { CLS_LABEL } from './model';
import type { Engine } from './engine';
import { ENGINE } from './engine';
import { SITES, FLAG } from './sites';
import { btn, StatusDot } from './ui';
import { n0, n1, pc, usd } from './format';
import { Map3D } from './Map3D';
import { IMAGERY, fmtDate } from './imagery';
import type { Map3DHandle, Projected } from './Map3D';

const useThemeKey = () => {
  const get = () => `${document.documentElement.getAttribute('data-theme') ?? ''}${window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'd' : 'l'}`;
  const [k, setK] = React.useState(get);
  React.useEffect(() => {
    const mo = new MutationObserver(() => setK(get())); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)'); const on = () => setK(get()); mq?.addEventListener?.('change', on);
    return () => { mo.disconnect(); mq?.removeEventListener?.('change', on); };
  }, []);
  return k;
};

// Full-screen map view: the village drawn from its coordinates, a summary
// panel on the left, the village list on the right and callouts on the
// buildings that matter. Colour carries meaning only: blue homes, amber
// shops and solar, red clinics, violet schools.

const COLOR: Record<Cls, string> = { res: 'var(--res)', com: 'var(--com)', health: 'var(--health)', school: 'var(--school)', other: 'var(--other)' };
const ROAD_W: Record<string, number> = { trunk: 9, primary: 8, secondary: 7, tertiary: 6, residential: 4, unclassified: 4, track: 2.6, path: 1.6, footway: 1.4 };

const useSize = (ref: React.RefObject<HTMLElement>) => {
  const [s, setS] = React.useState({ w: 1000, h: 700 });
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setS({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setS({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
};

// Donut of who uses the power, with the day's total in the middle
const Donut: React.FC<{ segs: { k: string; v: number; c: string }[]; label: string; sub: string }> = ({ segs, label, sub }) => {
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1, r = 38, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[132px] mx-auto" role="img" aria-label={`${label} ${sub}: ${segs.map(s => `${s.k} ${Math.round((s.v / tot) * 100)}%`).join(', ')}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      {segs.map(s => { const len = (s.v / tot) * C; const el = <circle key={s.k} cx="50" cy="50" r={r} fill="none" stroke={s.c} strokeWidth="10" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />; acc += len; return el; })}
      <text x="50" y="50" textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--fg)" style={{ fontFamily: 'Saira, sans-serif' }}>{label}</text>
      <text x="50" y="64" textAnchor="middle" fontSize="8" fill="var(--muted)">{sub}</text>
    </svg>
  );
};

// Half-circle gauge: demand as a share of what the system can make, with the P10 to P90 band
const Gauge: React.FC<{ value: number; lo: number; hi: number }> = ({ value, lo, hi }) => {
  const max = 1.5, a = (f: number) => Math.PI * (1 - Math.min(max, Math.max(0, f)) / max);
  const pt = (f: number, r: number) => [50 + r * Math.cos(a(f)), 58 - r * Math.sin(a(f))];
  const arc = (f0: number, f1: number, r: number) => { const [x0, y0] = pt(f0, r), [x1, y1] = pt(f1, r); return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`; };
  const tone = value > 1 ? 'var(--bad)' : value < 0.6 ? 'var(--warn)' : 'var(--ok)';
  const [nx, ny] = pt(value, 30);
  return (
    <svg viewBox="0 0 100 72" className="w-full max-w-[150px] mx-auto" role="img" aria-label={`Demand is ${Math.round(value * 100)}% of what the system can make (range ${Math.round(lo * 100)} to ${Math.round(hi * 100)}%)`}>
      <path d={arc(0, max, 38)} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
      <path d={arc(0.6, 1, 38)} fill="none" stroke="var(--ok)" strokeOpacity="0.25" strokeWidth="9" />
      <path d={arc(lo, hi, 38)} fill="none" stroke={tone} strokeOpacity="0.55" strokeWidth="9" />
      <line x1="50" y1="58" x2={nx} y2={ny} stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="58" r="3" fill="var(--fg)" />
      <text x="50" y="71" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--fg)" style={{ fontFamily: 'Saira, sans-serif' }}>{Math.round(value * 100)}%</text>
      <text x="8" y="70" fontSize="6" fill="var(--muted)">0</text>
      <text x="85" y="70" fontSize="6" fill="var(--muted)">150%</text>
    </svg>
  );
};

interface Callout { key: string; x: number; y: number; label: string; value: string; unit: string; note: string; color: string }

export const MapView: React.FC<{ site: SiteData; buildings: Building[]; eng?: Engine; siteId: string; onPick: (id: string) => void; goTab: (t: number) => void }> =
  ({ site, buildings, eng, siteId, onPick, goTab }) => {
    const box = React.useRef<HTMLDivElement>(null);
    const { w: W, h: H } = useSize(box);
    const wide = W >= 1024;
    const [mode, setMode] = React.useState<'2d' | '3d'>(() => (window.innerWidth >= 1024 ? '3d' : '2d'));
    const theme = useThemeKey();
    const [sat, setSat] = React.useState(true);
    const pic = sat ? IMAGERY[siteId] ?? null : null;
    const m3 = React.useRef<Map3DHandle>(null);
    const [pj, setPj] = React.useState<Projected | null>(null);
    React.useEffect(() => setPj(null), [mode, site.name]);
    const kx = 111320 * Math.cos((site.lat * Math.PI) / 180), ky = 110574;
    const proj = React.useCallback((la: number, lo: number): [number, number] => [(lo - site.lon) * kx, -(la - site.lat) * ky], [site, kx]);

    // Fit the village between the panels on wide screens
    const fit = React.useCallback(() => {
      const left = wide ? 400 : 0, right = wide ? 236 : 0;
      const usable = Math.max(200, Math.min(W - left - right, H)) * 0.92;
      const mpp = (2 * site.radius_m) / usable; // metres per pixel
      const cx = left + (W - left - right) / 2;
      return { mpp, x: -cx * mpp, y: -(H / 2) * mpp };
    }, [W, H, wide, site.radius_m]);
    const [v, setV] = React.useState(fit);
    React.useEffect(() => setV(fit()), [fit, site.name]);
    const drag = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
    const zoom = (f: number, px = W / 2, py = H / 2) => setV(o => {
      const mpp = Math.min(fit().mpp * 2, Math.max(0.15, o.mpp * f));
      const wx = o.x + px * o.mpp, wy = o.y + py * o.mpp;
      return { mpp, x: wx - px * mpp, y: wy - py * mpp };
    });
    const toScreen = (x: number, y: number) => [(x - v.x) / v.mpp, (y - v.y) / v.mpp];
    const px = v.mpp;

    const roads = React.useMemo(() => site.roads.map(r => ({ c: r.c, d: r.p.map(([la, lo], i) => { const [x, y] = proj(la, lo); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('') })), [site, proj]);
    const lines = React.useMemo(() => site.power_lines.map(r => r.p.map(([la, lo], i) => { const [x, y] = proj(la, lo); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('')), [site, proj]);
    const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant');

    // Callouts on the buildings that matter, with the engine's year-5 numbers
    const callouts = React.useMemo<Callout[]>(() => {
      if (!eng) return [];
      const s5 = eng.sectors[4];
      const tot = s5.Households + s5.Businesses + s5.Institutions + s5['Productive use'];
      const out: Callout[] = [];
      const pts = buildings.map(b => ({ b, xy: proj(b.lat, b.lon) }));
      const cen = (list: typeof pts) => list.reduce((a, p) => [a[0] + p.xy[0] / list.length, a[1] + p.xy[1] / list.length], [0, 0]);
      const homes = pts.filter(p => p.b.cls === 'res');
      if (homes.length) { const [x, y] = cen(homes); out.push({ key: 'homes', x, y, label: 'Homes', value: n0(s5.Households), unit: 'kWh a day, year 5', note: `${pc(s5.Households / tot)} of demand`, color: 'var(--res)' }); }
      const biz = [...pts].sort((a, b) => b.b.probs.com - a.b.probs.com).slice(0, 12);
      if (biz.length) { const [x, y] = cen(biz); out.push({ key: 'biz', x, y, label: 'Shops and services', value: n0(s5.Businesses), unit: 'kWh a day, year 5', note: `${pc(s5.Businesses / tot)} of demand`, color: 'var(--com)' }); }
      const inst = [...pts].sort((a, b) => (b.b.probs.health + b.b.probs.school) - (a.b.probs.health + a.b.probs.school))[0];
      if (inst) out.push({ key: 'inst', x: inst.xy[0], y: inst.xy[1], label: inst.b.tagged ? CLS_LABEL[inst.b.cls] : 'Likely clinic or school', value: n0(s5.Institutions), unit: 'kWh a day, all institutions', note: inst.b.tagged ? 'tagged on the map' : `${pc(inst.b.probs.health + inst.b.probs.school)} sure`, color: 'var(--health)' });
      if (plant) { const [x, y] = proj(plant.lat, plant.lon); out.push({ key: 'plant', x, y, label: plant.name ? `${plant.name} solar plant` : 'Solar plant', value: plant.output ? n0(parseFloat(plant.output) * (plant.output.toLowerCase().includes('mw') ? 1000 : 1)) : '?', unit: 'kWp, mapped on OpenStreetMap', note: 'existing', color: 'var(--sun)' }); }
      return out;
    }, [eng, buildings, plant, proj]);

    const [yr, setYr] = React.useState(5);
    const [di, setDi] = React.useState(1);
    const S = eng?.summary;
    const e1 = S?.energy_kwh_per_day[0], e5 = S?.energy_kwh_per_day[4];
    const p50 = eng?.designs.find(d => d.design.startsWith('P50'));
    const r5 = p50 && eng?.risk.find(r => r.design === p50.design && r.year === 5);
    const t85 = eng?.tariffs.find(t => t.tariff_usd_per_kwh === 0.85);
    const s5 = eng?.sectors[yr - 1];
    const des = eng?.designs[di];
    const solarDay = des ? des.capacity_kwh_day : 0;
    const demDay = S ? S.energy_kwh_per_day[yr - 1] : undefined;
    const rk = des && eng?.risk.find(r => r.design === des.design && r.year === yr);
    const segs = s5 ? [
      { k: 'Homes', v: s5.Households, c: 'var(--res)' }, { k: 'Shops', v: s5.Businesses, c: 'var(--com)' },
      { k: 'Institutions', v: s5.Institutions, c: 'var(--school)' }, { k: 'Machines', v: s5['Productive use'], c: 'var(--pue)' },
    ] : [];
    const segTot = segs.reduce((a, s) => a + s.v, 0) || 1;

    const panel = (
      <div className="bg-surface border border-line rounded-box shadow-pop p-5 space-y-5 min-w-0">
        <div>
          <p className="text-xs text-muted">{site.region.includes(FLAG[site.country] ?? '#') ? site.region : `${site.region}, ${FLAG[site.country] ?? site.country}`}</p>
          <h2 className="text-xl font-semibold tracking-tight">{site.name}</h2>
          <p className="text-xs text-muted tabular-nums">{site.lat.toFixed(4)}, {site.lon.toFixed(4)} · {n0(buildings.length)} roofs within {site.radius_m / 1000} km</p>
        </div>
        {e1 && e5 ? (
          <>
            <div className="grid grid-cols-2 gap-px bg-line rounded-ctl overflow-hidden border border-line">
              {[['Year 1', e1], ['Year 5', e5]].map(([l, q]) => { const r = q as typeof e1; return (
                <div key={l as string} className="bg-surface-2 px-3 py-2.5">
                  <p className="text-[11px] text-muted">{l as string}, kWh a day</p>
                  <p className="font-display text-[26px] leading-tight tabular-nums">{n0(r.p50)}</p>
                  <p className="text-[11px] text-muted tabular-nums">{n0(r.p10)} to {n0(r.p90)}</p>
                </div>); })}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Year after connection</p>
                <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Year">
                  {[1, 2, 3, 4, 5].map(y => <button key={y} role="radio" aria-checked={yr === y} onClick={() => setYr(y)} className={`h-7 w-7 text-xs tabular-nums ${yr === y ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{y}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <figure className="min-w-0 text-center">
                  <Donut segs={segs} label={demDay ? n0(demDay.p50) : '-'} sub="kWh a day" />
                  <figcaption className="text-[11px] text-muted mt-1">Who uses the power</figcaption>
                </figure>
                <figure className="min-w-0 text-center">
                  <Gauge value={demDay ? demDay.p50 / Math.max(1, solarDay) : 0} lo={demDay ? demDay.p10 / Math.max(1, solarDay) : 0} hi={demDay ? demDay.p90 / Math.max(1, solarDay) : 0} />
                  <figcaption className="text-[11px] text-muted mt-1">Demand against what the {des?.design.split(' ')[0]} system makes</figcaption>
                </figure>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{segs.map(s => (
                <li key={s.k} className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-1.5 truncate"><span className="h-2 w-2 rounded-sm shrink-0" style={{ background: s.c }} />{s.k}</span><span className="tabular-nums text-muted">{pc(s.v / segTot)}</span></li>))}</ul>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">System size</p>
                <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="System size">
                  {(eng?.designs ?? []).map((d, i) => <button key={d.design} role="radio" aria-checked={di === i} onClick={() => setDi(i)} className={`h-7 px-2 text-xs ${di === i ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{d.design.split(' ')[0]}</button>)}
                </div>
              </div>
              {des && rk && (
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted">Solar and battery</span><span className="tabular-nums">{n0(des.pv_kwp)} kWp · {n0(des.battery_kwh)} kWh</span></div>
                  <div className="flex justify-between"><span className="text-muted">Build cost (rough)</span><span className="tabular-nums">{usd(des.capex_usd)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted">Brownouts, year {yr}</span><StatusDot tone={rk.p_brownouts > 0.3 ? 'bad' : rk.p_brownouts > 0.15 ? 'warn' : 'ok'}>{pc(rk.p_brownouts)}</StatusDot></div>
                  <div className="flex justify-between gap-2"><span className="text-muted">Under 60% used, year {yr}</span><StatusDot tone={rk.p_underused > 0.5 ? 'warn' : 'ok'}>{pc(rk.p_underused)}</StatusDot></div>
                  <div className="flex justify-between"><span className="text-muted">Cost per kWh, year {yr}</span><span className="tabular-nums">${rk.cost_per_kwh_p50.toFixed(2)}</span></div>
                </div>
              )}
            </div>
            {S && (
              <div className="text-sm space-y-1.5 border-t border-line pt-3">
                <div className="flex justify-between"><span className="text-muted">Peak, year {yr}</span><span className="tabular-nums">{n1(S.peak_kw[yr - 1].p50)} kW</span></div>
                <div className="flex justify-between"><span className="text-muted">Customers, year {yr}</span><span className="tabular-nums">{n0(S.customers[yr - 1].p50)}</span></div>
                {t85 && <div className="flex justify-between gap-2"><span className="text-muted">Covers cost at $0.85/kWh (P50 size)</span><StatusDot tone={t85.p_revenue_covers_cost_year5 >= 0.8 ? 'ok' : 'warn'}>{pc(t85.p_revenue_covers_cost_year5)}</StatusDot></div>}
              </div>
            )}
            <p className="text-xs text-muted">Grid: {site.grid.dist_km != null ? `mapped line ${site.grid.dist_km} km away` : 'no mapped line within 40 km'}{eng?.nearby?.sites.length ? ` · ${eng.nearby.sites.length} metered ${eng.nearby.sites.length === 1 ? 'site' : 'sites'} within 1,000 miles` : ' · no metered site within 1,000 miles'}. Rough guide.</p>
            <button onClick={() => goTab(2)} className={`${btn.primary} w-full h-10`}>See the forecast</button>
          </>
        ) : <p className="text-sm text-muted">Forecast runs on a laptop for a loaded site file (pipeline/run_engine.py).</p>}
      </div>
    );

    const rail = (
      <div className="bg-surface border border-line rounded-box shadow-pop p-2 min-w-0">
        <p className="px-2 pt-1 pb-2 text-xs text-muted">Villages · year 5 kWh a day</p>
        <ul className="space-y-0.5">
          {SITES.map(s => { const e = ENGINE[s.id]?.summary.energy_kwh_per_day[4]; const on = s.id === siteId; return (
            <li key={s.id}>
              <button onClick={() => onPick(s.id)} aria-pressed={on} className={`w-full text-left rounded-ctl px-2 py-2 flex items-center justify-between gap-2 ${on ? 'bg-line text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}>
                <span className="min-w-0"><span className="block text-sm truncate">{s.data.name}</span><span className="block text-[11px] text-muted">{FLAG[s.data.country] ?? s.data.country}</span></span>
                <span className={`tabular-nums text-sm ${on ? 'text-fg' : ''}`}>{e ? n0(e.p50) : '-'}</span>
              </button>
            </li>); })}
        </ul>
        <button onClick={() => goTab(1)} className="w-full mt-1 px-2 py-2 text-left text-xs text-muted hover:text-fg rounded-ctl hover:bg-surface-2">Any location: latitude and longitude</button>
      </div>
    );

    return (
      <div className="lg:relative">
        <div ref={box} className="relative h-[62vh] lg:h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--map-bg)] select-none">
          {mode === '3d' && <Map3D ref={m3} site={site} buildings={buildings} outlines={site.outlines} theme={theme} padLeft={wide ? 400 : 0} padRight={wide ? 236 : 0}
            anchors={callouts.map(c => ({ key: c.key, x: c.x, y: c.y, h: c.key === 'plant' ? 2 : 5 }))} onProject={setPj} picture={pic} />}
          {mode === '2d' && <svg className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing" viewBox={`${v.x} ${v.y} ${W * px} ${H * px}`}
            role="img" aria-label={`Map of ${buildings.length} buildings in ${site.name}, coloured by estimated use`}
            onWheel={e => { const r = box.current!.getBoundingClientRect(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }}
            onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }; }}
            onPointerMove={e => { const d = drag.current; if (!d) return; setV(o => ({ ...o, x: d.vx - (e.clientX - d.x) * o.mpp, y: d.vy - (e.clientY - d.y) * o.mpp })); }}
            onPointerUp={() => { drag.current = null; }}>
            <defs>
              <pattern id="mapgrid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="var(--map-grid)" strokeWidth={px} /></pattern>
            </defs>
            <rect x={v.x - 5000} y={v.y - 5000} width={W * px + 10000} height={H * px + 10000} fill="url(#mapgrid)" />
            {pic && (() => { const [x0, y0] = proj(pic.bounds.north, pic.bounds.west), [x1, y1] = proj(pic.bounds.south, pic.bounds.east); return <image href={pic.url} x={x0} y={y0} width={x1 - x0} height={y1 - y0} preserveAspectRatio="none" />; })()}
            <circle cx={0} cy={0} r={site.radius_m} fill="none" stroke="var(--map-road)" strokeWidth={px * 1.2} strokeDasharray={`${px * 6} ${px * 6}`} />
            {roads.map((r, i) => <path key={i} d={r.d} fill="none" stroke="var(--map-road)" strokeWidth={Math.max(px * 1.4, ROAD_W[r.c] ?? 3)} strokeLinecap="round" strokeLinejoin="round" />)}
            {lines.map((d, i) => <path key={'l' + i} d={d} fill="none" stroke="var(--sun)" strokeWidth={px * 2} strokeDasharray={`${px * 10} ${px * 6}`} />)}
            {buildings.map((b, i) => { const [x, y] = proj(b.lat, b.lon); return (
              <circle key={i} cx={x} cy={y} r={Math.max(Math.sqrt(b.area / Math.PI), px * 1.8)} fill={COLOR[b.cls]} fillOpacity={pic ? 0.85 : 0.45 + 0.5 * b.conf} stroke={pic ? 'rgba(0,0,0,0.45)' : 'none'} strokeWidth={px * 0.6} />); })}
            {plant && (() => { const [x, y] = proj(plant.lat, plant.lon); const s = px * 10; return <rect x={x - s} y={y - s} width={2 * s} height={2 * s} rx={px * 2} fill="var(--sun)" />; })()}
            <text x={site.radius_m * 0.72} y={-site.radius_m * 0.72} fontSize={px * 11} fill="var(--muted)">{site.radius_m / 1000} km</text>
          </svg>}
          {/* Callouts: boxes sit in fixed spots around the village, with a leader line to the building */}
          {(() => {
            if (mode === '3d' && !pj) return null;
            const [cx, cy] = mode === '3d' ? pj!.centre : toScreen(0, 0);
            const rs = mode === '3d' ? pj!.r * 0.62 : site.radius_m / v.mpp;
            const SLOT: Record<string, [number, number]> = { homes: [0.95, -0.45], biz: [0.75, 0.72], inst: [-0.95, -0.55], plant: [-0.9, 0.55] };
            const half = wide ? 110 : 62;
            const minX = (wide ? 400 : 0) + half, maxX = W - (wide ? 252 : 56) - half;
            const items = callouts.map(c => {
              const [sx, sy] = mode === '3d' ? (pj!.anchors[c.key] ?? [-1, -1]) : toScreen(c.x, c.y);
              const [fx, fy] = SLOT[c.key] ?? [0.8, 0];
              const bx = Math.min(maxX, Math.max(minX, cx + fx * rs)), by = Math.min(H - (wide ? 120 : 110), Math.max(wide ? 100 : 76, cy + fy * rs));
              return { c, sx, sy, bx, by };
            }).filter(i => i.sx > 0 && i.sy > 0 && i.sx < W && i.sy < H);
            return (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                  {items.map(({ c, sx, sy, bx, by }) => <line key={c.key} x1={sx} y1={sy} x2={bx} y2={by} stroke="var(--fg)" strokeOpacity={0.35} strokeWidth={1} />)}
                  {items.map(({ c, sx, sy }) => <circle key={c.key + 'd'} cx={sx} cy={sy} r={5} fill={c.color} stroke="var(--map-bg)" strokeWidth={2} />)}
                </svg>
                {items.map(({ c, bx, by }) => (
                  <div key={c.key} className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-surface border border-line rounded-box shadow-pop ${wide ? 'px-3 py-2' : 'px-2 py-1'}`} style={{ left: bx, top: by }}>
                    <p className="text-[11px] text-muted flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: c.color }} />{wide ? c.label : c.key === 'plant' ? 'Solar plant' : c.label.split(' ')[0]}</p>
                    <p className="flex items-baseline gap-1.5"><span className={`font-display leading-tight tabular-nums ${wide ? 'text-xl' : 'text-base'}`}>{c.value}</span><span className="text-[11px] text-muted">{wide ? c.unit : c.key === 'plant' ? 'kWp' : 'kWh/day'}</span></p>
                    {wide && <p className="text-[11px] text-muted">{c.note}</p>}
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="absolute top-3 left-3 lg:top-4 lg:left-[400px] flex rounded-ctl border border-line overflow-hidden shadow-pop" role="radiogroup" aria-label="Map style">
            {(['2d', '3d'] as const).map(m => <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`h-9 px-3 text-xs ${mode === m ? 'bg-line text-fg font-medium' : 'bg-surface text-muted hover:text-fg'}`}>{m === '2d' ? 'Flat' : '3D'}</button>)}
            {IMAGERY[siteId] && <button role="switch" aria-checked={sat} onClick={() => setSat(x => !x)} className={`h-9 px-3 text-xs border-l border-line ${sat ? 'bg-line text-fg font-medium' : 'bg-surface text-muted hover:text-fg'}`}>Satellite</button>}
          </div>

          {/* Controls */}
          <div className="absolute right-3 bottom-3 lg:right-[252px] flex flex-col gap-1 w-9">
            <button aria-label="Zoom in" onClick={() => (mode === '3d' ? m3.current?.zoom(0.75) : zoom(1 / 1.5))} className="h-9 w-9 rounded-ctl bg-surface border border-line text-lg leading-none hover:bg-line">+</button>
            <button aria-label="Zoom out" onClick={() => (mode === '3d' ? m3.current?.zoom(1.33) : zoom(1.5))} className="h-9 w-9 rounded-ctl bg-surface border border-line text-lg leading-none hover:bg-line">-</button>
            <button aria-label="Fit village" onClick={() => (mode === '3d' ? m3.current?.reset() : setV(fit()))} className="h-9 w-9 rounded-ctl bg-surface border border-line text-[11px] text-muted hover:bg-line">fit</button>
          </div>
          <div className="absolute left-3 bottom-3 lg:left-[400px] flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted bg-surface border border-line rounded-ctl px-2.5 py-1.5 max-w-[calc(100%-5rem)] lg:max-w-[calc(100%-720px)]">
            {(['res', 'com', 'health', 'school', 'other'] as Cls[]).map(c => <span key={c} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR[c] }} />{CLS_LABEL[c]}</span>)}
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sun" />Solar plant</span>
            {pic && <span className="basis-full">Picture {fmtDate(pic.date)}, 10 m · {pic.credit}</span>}
          </div>
          {wide && <div className="absolute left-4 top-4 bottom-4 w-[368px] overflow-y-auto no-scrollbar">{panel}</div>}
          {wide && <div className="absolute right-4 top-4 w-[220px]">{rail}</div>}
        </div>
        {!wide && <div className="px-[var(--gutter)] py-4 space-y-4">{rail}{panel}</div>}
      </div>
    );
  };
