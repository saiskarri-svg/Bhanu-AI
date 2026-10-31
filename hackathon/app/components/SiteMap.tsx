import React from 'react';
import type { Building, Cls, SiteData } from './model';
import { CLASSES, CLS_LABEL } from './model';
import { IMAGERY, fmtDate } from './imagery';
import { SITES } from './sites';

// Map drawn from latitude and longitude in metres around the village point.
// Buildings are drawn at true size (a circle with the footprint's area), so
// the picture is to scale. Drag to pan, buttons or wheel to zoom.

const COLOR: Record<Cls, string> = { res: 'var(--res)', com: 'var(--com)', health: 'var(--health)', school: 'var(--school)', other: 'var(--other)' };
const ROAD_W: Record<string, number> = { primary: 7, secondary: 6, tertiary: 5, trunk: 8, residential: 3.5, unclassified: 3.5, track: 2.2, path: 1.4, footway: 1.2 };

export const useProj = (lat0: number, lon0: number) =>
  React.useMemo(() => {
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574;
    return (lat: number, lon: number): [number, number] => [(lon - lon0) * kx, -(lat - lat0) * ky];
  }, [lat0, lon0]);

export const SiteMap: React.FC<{ site: SiteData; buildings: Building[]; selected?: number | null; onSelect?: (i: number | null) => void }> = ({ site, buildings, selected, onSelect }) => {
  const proj = useProj(site.lat, site.lon);
  const R = site.radius_m * 1.08;
  const [view, setView] = React.useState({ x: -R, y: -R, w: 2 * R });
  React.useEffect(() => setView({ x: -R, y: -R, w: 2 * R }), [site.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hide, setHide] = React.useState<Set<Cls>>(new Set());
  const [hover, setHover] = React.useState<number | null>(null);
  const sid = SITES.find(s => s.data === site)?.id;
  const [sat, setSat] = React.useState(true);
  const pic = sat && sid ? IMAGERY[sid] : null;
  const svgRef = React.useRef<SVGSVGElement>(null);
  const drag = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const zoom = (f: number, cx = view.x + view.w / 2, cy = view.y + view.w / 2) => {
    const w = Math.min(2 * R * 1.5, Math.max(80, view.w * f));
    setView({ x: cx - (cx - view.x) * (w / view.w), y: cy - (cy - view.y) * (w / view.w), w });
  };
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return [view.x + ((e.clientX - r.left) / r.width) * view.w, view.y + ((e.clientY - r.top) / r.height) * view.w];
  };

  const roads = React.useMemo(() => site.roads.map(r => ({ c: r.c, d: r.p.map(([la, lo], i) => { const [x, y] = proj(la, lo); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('') })), [site, proj]);
  const lines = React.useMemo(() => site.power_lines.map(r => r.p.map(([la, lo], i) => { const [x, y] = proj(la, lo); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('')), [site, proj]);
  const plants = (site.grid.plants ?? []).filter(p => p.cls === 'plant');
  const px = view.w / 600; // metres per screen pixel at a 600px wide map
  const shown = hover ?? selected ?? null;
  const hb = shown != null ? buildings[shown] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
        className="w-full aspect-square max-h-[640px] bg-surface-2 rounded-ctl touch-none select-none cursor-grab active:cursor-grabbing"
        role="img"
        aria-label={`Map of ${buildings.length} buildings around ${site.name}, coloured by estimated use`}
        onWheel={e => { const [cx, cy] = toWorld(e); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, cx, cy); }}
        onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; }}
        onPointerMove={e => {
          const d = drag.current; if (!d) return;
          const r = svgRef.current!.getBoundingClientRect();
          setView(v => ({ ...v, x: d.vx - ((e.clientX - d.x) / r.width) * v.w, y: d.vy - ((e.clientY - d.y) / r.height) * v.w }));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        {pic && (() => { const [x0, y0] = proj(pic.bounds.north, pic.bounds.west), [x1, y1] = proj(pic.bounds.south, pic.bounds.east); return <image href={pic.url} x={x0} y={y0} width={x1 - x0} height={y1 - y0} preserveAspectRatio="none" opacity={Math.min(1, Math.max(0.3, (px - 0.6) / 2))} />; })()}
        <circle cx={0} cy={0} r={site.radius_m} fill="none" stroke="var(--line)" strokeWidth={px * 1.5} strokeDasharray={`${px * 6} ${px * 5}`} />
        {roads.map((r, i) => <path key={i} d={r.d} fill="none" stroke="var(--line)" strokeWidth={Math.max(px * 1.2, ROAD_W[r.c] ?? 2.5)} strokeLinecap="round" strokeLinejoin="round" />)}
        {lines.map((d, i) => <path key={'l' + i} d={d} fill="none" stroke="var(--sun)" strokeWidth={px * 2} strokeDasharray={`${px * 8} ${px * 5}`} />)}
        {buildings.map((b, i) => {
          if (hide.has(b.cls)) return null;
          const [x, y] = proj(b.lat, b.lon);
          const r = Math.max(Math.sqrt(b.area / Math.PI), px * 2.2);
          const on = i === shown;
          return (
            <circle key={i} cx={x} cy={y} r={on ? r * 1.6 : r} fill={COLOR[b.cls]} fillOpacity={pic ? 0.85 : b.tagged ? 0.95 : 0.35 + 0.6 * b.conf}
              stroke={on ? 'var(--fg)' : b.tagged ? 'var(--fg)' : 'none'} strokeWidth={on ? px * 2 : b.tagged ? px * 1 : 0}
              onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => onSelect?.(i === selected ? null : i)} />
          );
        })}
        {plants.map((p, i) => { const [x, y] = proj(p.lat, p.lon); const s = px * 9; return (
          <g key={'p' + i}><rect x={x - s} y={y - s} width={2 * s} height={2 * s} rx={px * 2} fill="var(--sun)" stroke="var(--surface)" strokeWidth={px * 1.5} /></g>
        ); })}
        <circle cx={0} cy={0} r={px * 3} fill="var(--fg)" />
        {/* scale bar */}
        <g transform={`translate(${view.x + px * 16},${view.y + view.w - px * 20})`}>
          {(() => { const m = [50, 100, 200, 500, 1000].find(v => v / px > 70) ?? 1000; return (<>
            <rect width={m} height={px * 3} fill="var(--fg)" />
            <text y={-px * 6} fontSize={px * 11} fill="var(--muted)">{m >= 1000 ? `${m / 1000} km` : `${m} m`}</text>
          </>); })()}
        </g>
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button aria-label="Zoom in" onClick={() => zoom(1 / 1.5)} className="h-8 w-8 rounded-ctl bg-surface border border-line text-fg text-lg leading-none hover:bg-line">+</button>
        <button aria-label="Zoom out" onClick={() => zoom(1.5)} className="h-8 w-8 rounded-ctl bg-surface border border-line text-fg text-lg leading-none hover:bg-line">-</button>
        {sid && IMAGERY[sid] && <button aria-label="Satellite picture" aria-pressed={sat} onClick={() => setSat(x => !x)} className={`h-8 w-8 rounded-ctl border border-line text-[10px] ${sat ? 'bg-line text-fg' : 'bg-surface text-muted'} hover:bg-line`}>Sat</button>}
        <button aria-label="Reset view" onClick={() => setView({ x: -R, y: -R, w: 2 * R })} className="h-8 w-8 rounded-ctl bg-surface border border-line text-muted text-[11px] hover:bg-line">fit</button>
      </div>
      {hb && (
        <div className="absolute left-2 top-2 max-w-[260px] bg-surface border border-line rounded-box shadow-pop px-3 py-2.5 text-xs pointer-events-none">
          <p className="font-medium text-fg flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR[hb.cls] }} />{CLS_LABEL[hb.cls]} <span className="text-muted font-normal">{Math.round(hb.conf * 100)}% sure</span></p>
          <p className="text-muted mt-1 tabular-nums">{hb.lat.toFixed(5)}, {hb.lon.toFixed(5)} · {Math.round(hb.area)} m²</p>
          <p className="text-muted mt-1 leading-snug">{hb.why}</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        {CLASSES.map(c => (
          <button key={c} onClick={() => setHide(h => { const n = new Set(h); n.has(c) ? n.delete(c) : n.add(c); return n; })}
            aria-pressed={!hide.has(c)} className={`inline-flex items-center gap-1.5 ${hide.has(c) ? 'opacity-40 line-through' : 'hover:text-fg'}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[c] }} />{CLS_LABEL[c]}
          </button>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sun" />Mapped solar plant</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-sun" />Mapped power line</span>
        <span>Outlined: tagged on the map. Faint: low confidence.</span>
        {pic && <span>Picture {fmtDate(pic.date)}, 10 m · {pic.credit}</span>}
      </div>
    </div>
  );
};
