import React from 'react';
import { Box, BoxHeader, StatStrip, btn, More } from './ui';
import { SiteMap } from './SiteMap';
import type { Building, ClassSummary, SiteData } from './model';
import { CLASSES, CLS_LABEL } from './model';
import { n0, pc } from './format';
import { FLAG, SITES } from './sites';
import { Cite } from './refs';
import { FootprintBox } from './Nearby';
import type { Engine } from './engine';

const COLOR = { res: 'var(--res)', com: 'var(--com)', health: 'var(--health)', school: 'var(--school)', other: 'var(--other)' };

export const SitePicker: React.FC<{ id: string; onPick: (id: string) => void; onUpload: (d: SiteData) => void }> = ({ id, onPick, onUpload }) => {
  const [lat, setLat] = React.useState('9.0765');
  const [lon, setLon] = React.useState('7.3986');
  const [rad, setRad] = React.useState('1000');
  const [copied, setCopied] = React.useState(false);
  const [err, setErr] = React.useState('');
  const cmd = `python gridsight_fetch.py --name "My site" --country XX --lat ${lat} --lon ${lon} --radius ${rad} --out my-site.json`;
  const bad = !(Math.abs(+lat) <= 90 && Math.abs(+lon) <= 180 && +rad >= 100 && +rad <= 5000);
  return (
    <Box>
      <BoxHeader title="Pick a site" meta="Real building data, fetched for a 1 km radius" />
      <div className="px-5 pb-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <p className="text-xs text-muted mb-2">Sample villages</p>
          <div className="flex flex-wrap gap-2">
            {SITES.map(s => (
              <button key={s.id} onClick={() => onPick(s.id)} aria-pressed={id === s.id}
                className={`h-9 px-3 rounded-ctl border text-sm transition ${id === s.id ? 'bg-line border-line text-fg font-medium' : 'bg-surface-2 border-line text-muted hover:text-fg'}`}>
                {s.data.name} <span className="text-muted font-normal">· {FLAG[s.data.country] ?? s.data.country}</span>
              </button>
            ))}
            {id === 'upload' && <span className="h-9 px-3 inline-flex items-center rounded-ctl bg-line text-sm font-medium">Your site</span>}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted mb-2">Any location: latitude, longitude and radius (m)</p>
          <div className="grid grid-cols-3 gap-2">
            <input id="lat" aria-label="Latitude" value={lat} onChange={e => setLat(e.target.value)} className="h-9 px-2 rounded-ctl bg-surface-2 border border-line text-sm tabular-nums min-w-0" />
            <input id="lon" aria-label="Longitude" value={lon} onChange={e => setLon(e.target.value)} className="h-9 px-2 rounded-ctl bg-surface-2 border border-line text-sm tabular-nums min-w-0" />
            <input id="rad" aria-label="Radius in metres" value={rad} onChange={e => setRad(e.target.value)} className="h-9 px-2 rounded-ctl bg-surface-2 border border-line text-sm tabular-nums min-w-0" />
          </div>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            This page cannot reach map servers itself, so run the free fetch script on a laptop (about a minute), then load its file here.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button disabled={bad} className={btn.secondary} onClick={() => { navigator.clipboard?.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
              {copied ? 'Copied' : 'Copy fetch command'}
            </button>
            <label className={`${btn.secondary} cursor-pointer`}>
              Load site file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.buildings)) throw new Error(); setErr(''); onUpload(d); }
                catch { setErr('That file is not a GridSight site file. Make it with gridsight_fetch.py.'); }
              }} />
            </label>
          </div>
          {bad && <p className="mt-2 text-xs text-bad">Latitude -90 to 90, longitude -180 to 180, radius 100 to 5,000 m.</p>}
          {err && <p className="mt-2 text-xs text-bad">{err}</p>}
          <code className="mt-2 block text-[11px] text-muted bg-surface-2 border border-line rounded-ctl px-2 py-1.5 overflow-x-auto whitespace-nowrap">{cmd}</code>
        </div>
      </div>
    </Box>
  );
};

export const SitePage: React.FC<{ site: SiteData; buildings: Building[]; sum: ClassSummary; eng?: Engine; onNext: () => void }> = ({ site, buildings, sum, eng, onNext }) => {
  const [sel, setSel] = React.useState<number | null>(null);
  const [rows, setRows] = React.useState(10);
  const [sort, setSort] = React.useState<'area' | 'conf' | 'cls'>('area');
  const total = buildings.length;
  const roof = buildings.reduce((a, b) => a + b.area, 0);
  const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant');
  const sorted = React.useMemo(() => {
    const idx = buildings.map((_, i) => i);
    if (sort === 'area') idx.sort((a, b) => buildings[b].area - buildings[a].area);
    if (sort === 'conf') idx.sort((a, b) => buildings[a].conf - buildings[b].conf);
    if (sort === 'cls') idx.sort((a, b) => CLASSES.indexOf(buildings[a].cls) - CLASSES.indexOf(buildings[b].cls) || buildings[b].area - buildings[a].area);
    return idx;
  }, [buildings, sort]);
  const obs = site.sources.overture_building_sources;
  return (
    <>
      <StatStrip cols={4} stats={[
        { label: 'Buildings in 1 km', value: n0(total), unit: 'roofs', note: <>{n0(sum.tagged)} tagged on the map, the rest estimated<Cite className="mt-1" k={['openbuildings', 'overture']} /></> },
        { label: 'Residential', value: n0(sum.expected.res), unit: 'buildings', tint: 'var(--res)', note: <>Commercial {n0(sum.expected.com)} · Other {n0(sum.expected.other)} (estimated)<Cite className="mt-1" k={['overture', 'assumption']} /></> },
        { label: 'Health and schools', value: n0(sum.expected.health + sum.expected.school), unit: 'buildings', tint: 'var(--health)', note: <>{n0(sum.expected.health)} health, {n0(sum.expected.school)} school (estimated)<Cite className="mt-1" k={['overture', 'assumption']} /></> },
        { label: 'Roof area', value: n0(roof), unit: 'm²', tint: 'var(--sun)', note: <>{site.grid.dist_km != null ? `Nearest mapped grid line ${site.grid.dist_km} km away${site.grid.dist_km < 5 ? '. Check whether the village is already connected or the grid will arrive soon.' : ''}` : 'No mapped grid line within 40 km'}<Cite className="mt-1" k={site.grid.dist_km != null && site.grid.dist_km < 5 ? ['openbuildings', 'overture', 'peters'] : ['openbuildings', 'overture']} /></> },
      ]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Box>
          <BoxHeader title={`${site.name}, ${site.region}`} meta={<span className="tabular-nums">{site.lat.toFixed(4)}, {site.lon.toFixed(4)}</span>} />
          <div className="px-5 pb-5"><SiteMap site={site} buildings={buildings} selected={sel} onSelect={setSel} /></div>
        </Box>
        <div className="space-y-6 min-w-0">
          <Box>
            <BoxHeader title="What the buildings are" meta="Estimated class, share of buildings" />
            <div className="px-5 pb-5 space-y-3">
              {CLASSES.map(c => {
                const ex = sum.expected[c]; const sd = Math.sqrt(sum.variance[c]);
                return (
                  <div key={c}>
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[c] }} />{CLS_LABEL[c]}</span>
                      <span className="tabular-nums text-fg">{n0(ex)} <span className="text-muted text-xs">({n0(Math.max(0, ex - 1.28 * sd))} to {n0(ex + 1.28 * sd)})</span></span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(ex / Math.max(1, total)) * 100}%`, background: COLOR[c] }} /></div>
                  </div>
                );
              })}
              <More label="How the classes are worked out"><p className="text-xs text-muted leading-relaxed pt-1">
                Numbers add up each building's chance of being that class; brackets show the likely range. Map colours show each building's most likely class. Untagged buildings are classed by size, shape, road frontage and how crowded the spot is. It is an estimate, never more than 85% sure.
              </p></More>
            </div>
          </Box>
          {eng?.age && (
            <Box>
              <BoxHeader title="Footprint sources and dates" meta="Pictures can be old or missing" />
              <div className="px-5 pb-5"><FootprintBox eng={eng} total={buildings.length} coverage={site.coverage} /></div>
            </Box>
          )}
          {eng?.landcover && (() => {
            const C: Record<string, string> = { Trees: '#3f8f4f', Shrubland: '#9aa04a', Grassland: '#c8b45a', Cropland: 'var(--sun)', 'Built-up': 'var(--bad)', 'Bare or sparse': '#b9a48a', Water: 'var(--info)', Wetland: '#4fa3a0', Mangroves: '#2f7a5f' };
            const bar = (sh: Record<string, number>) => (Object.entries(sh) as [string, number][]).filter(([, v]) => v >= 0.005).sort((x, y) => y[1] - x[1]);
            const crop = eng.landcover.within_5km['Cropland'] ?? 0;
            return (
              <Box>
                <BoxHeader title="Land around the village" meta="ESA WorldCover 2021, 10 m" />
                <div className="px-5 pb-5 space-y-3">
                  {([['Within 1 km', eng.landcover.within_1km], ['Within 5 km', eng.landcover.within_5km]] as const).map(([l, sh]) => (
                    <div key={l}>
                      <p className="text-xs text-muted mb-1">{l}</p>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-2">{bar(sh).map(([k, v]) => <span key={k} title={`${k} ${pc(v)}`} style={{ width: `${v * 100}%`, background: C[k] ?? 'var(--other)' }} />)}</div>
                      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{bar(sh).slice(0, 4).map(([k, v]) => <li key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C[k] ?? 'var(--other)' }} />{k} {pc(v)}</li>)}</ul>
                    </div>
                  ))}
                  <p className="text-xs text-muted leading-relaxed">{crop >= 0.05 ? `Cropland covers ${pc(crop)} within 5 km: grain mills, irrigation pumps and cold storage are likely early productive loads.` : 'Little open cropland within 5 km (farms under tree cover show as trees), so productive use is more likely shops, welding and cold drinks than mills and pumps.'} Shown for context; the forecast does not use it yet.</p>
                  <Cite k={['worldcover']} />
                </div>
              </Box>
            );
          })()}
          <Box>
            <BoxHeader title="Where the data comes from" />
            <More label="Show data sources" className="px-5 pb-5"><ul className="text-sm space-y-2 text-muted">
              <li><span className="text-fg">Footprints:</span> Overture's merged set of Google Open Buildings, Microsoft ML Buildings and OpenStreetMap (duplicates removed), plus Google buildings with 70% or more confidence that the others miss. Area is the footprint, not floor space.</li>
              <li><span className="text-fg">Tags, places, roads, power lines:</span> Overture Maps (includes OpenStreetMap). Footprint sources here: {Object.entries(obs).map(([k, v]) => `${k} ${n0(Number(v))}`).join(', ')}.</li>
              <li><span className="text-fg">Night light:</span> {site.viirs != null ? `${site.viirs.toFixed(2)} nW/cm²/sr (VIIRS)` : 'not loaded in this prototype, so local spending power stays a wide range.'}</li>
              {plant && <li><span className="text-fg">Existing mini-grid:</span> OpenStreetMap shows a solar plant "{plant.name ?? 'unnamed'}" {plant.output ? `rated ${plant.output}` : ''} {Math.round(plant.d_km * 1000)} m from the centre. See Validation.</li>}
              <li><span className="text-fg">Fetched:</span> {site.fetched}</li>
            </ul></More>
          </Box>
          <button onClick={onNext} className={`${btn.primary} w-full h-11`}>Estimate demand for {site.name}</button>
        </div>
      </div>
      <Box>
        <BoxHeader title="Buildings" meta={
          <span className="flex gap-3">Sort by
            {(['area', 'conf', 'cls'] as const).map(s => <button key={s} onClick={() => setSort(s)} className={sort === s ? 'text-fg font-medium' : 'hover:text-fg'}>{s === 'area' ? 'size' : s === 'conf' ? 'least sure' : 'class'}</button>)}
          </span>} />
        <div className="px-5 pb-5 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead><tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-2 pr-4 font-normal">Latitude, longitude</th><th className="py-2 pr-4 font-normal">Area m²</th><th className="py-2 pr-4 font-normal">Class</th><th className="py-2 pr-4 font-normal">Sure</th><th className="py-2 font-normal">Why</th>
            </tr></thead>
            <tbody>
              {sorted.slice(0, rows).map(i => { const b = buildings[i]; return (
                <tr key={i} onClick={() => setSel(i)} className={`border-b border-line/60 cursor-pointer ${sel === i ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                  <td className="py-2 pr-4 whitespace-nowrap">{b.lat.toFixed(5)}, {b.lon.toFixed(5)}</td>
                  <td className="py-2 pr-4">{n0(b.area)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR[b.cls] }} />{CLS_LABEL[b.cls]}</span></td>
                  <td className="py-2 pr-4">{pc(b.conf)}</td>
                  <td className="py-2 text-muted text-xs min-w-[220px]">{b.why}</td>
                </tr>
              ); })}
            </tbody>
          </table>
          {rows < total && <button className={`${btn.quiet} mt-3`} onClick={() => setRows(r => r + 40)}>Show more ({n0(total - rows)} left)</button>}
        </div>
      </Box>
    </>
  );
};
