import React from 'react';
import { Box, BoxHeader, StatusDot } from './ui';
import type { Cls, RawBuilding, SiteData } from './model';
import { CLASSES, CLS_LABEL, classify } from './model';
import type { Engine } from './engine';
import { kwpFor } from './engine';
import { btn } from './ui';
import { SITES } from './sites';
import { n0, pc } from './format';

// Held-out OSM-tagged buildings, made by pipeline/holdout_tags.py
const holdFiles = import.meta.glob('../data/holdout/*.json', { eager: true, import: 'default' }) as Record<string, { made: string; villages: { name: string; country: string; buildings: number; tagged: number }[]; buildings: { c: string; truth: string; f: RawBuilding }[] }>;
const HOLD = Object.values(holdFiles)[0];

const truthClass = (t: string): Cls | null => {
  const b = classify([0, 0, 50, 1, t, null, null, null, null, 0, null, null, null]);
  return b.tagged ? b.cls : null;
};

const ClassCheck: React.FC = () => {
  const res = React.useMemo(() => {
    if (!HOLD) return null;
    const m: Record<Cls, Record<Cls, number>> = Object.fromEntries(CLASSES.map(a => [a, Object.fromEntries(CLASSES.map(b => [b, 0]))])) as any;
    let n = 0, ok = 0;
    const exp: Record<Cls, number> = { res: 0, com: 0, health: 0, school: 0, other: 0 };
    const act: Record<Cls, number> = { res: 0, com: 0, health: 0, school: 0, other: 0 };
    for (const b of HOLD.buildings) {
      const t = truthClass(b.truth); if (!t) continue;
      const g = classify(b.f); // tag hidden: f carries no tag or place
      m[t][g.cls]++; n++; if (t === g.cls) ok++;
      act[t]++; CLASSES.forEach(c => { exp[c] += g.probs[c]; });
    }
    return { m, n, ok, exp, act };
  }, []);
  if (!HOLD || !res) return <p className="px-5 pb-5 text-sm text-muted">Held-out test set not built yet. Run pipeline/holdout_tags.py.</p>;
  return (
    <div className="px-5 pb-5 space-y-4">
      <p className="text-sm text-muted max-w-prose">
        {n0(res.n)} buildings that OpenStreetMap volunteers tagged as a home, shop, school, clinic or other use ({n0(HOLD.buildings.length - res.n)} more carry tags such as "roof" that name no use and are left out), in {HOLD.villages.length} villages across Nigeria, Sierra Leone, Kenya, Uganda and Tanzania that are not among the sample sites. We hide the tag, classify each building from its footprint and surroundings only, and compare.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 overflow-x-auto">
          <p className="text-xs text-muted mb-2">Tagged as (rows) against our estimate (columns)</p>
          <table className="text-sm tabular-nums">
            <thead><tr className="text-xs text-muted"><th className="text-left font-normal pr-3 py-1"></th>{CLASSES.map(c => <th key={c} className="font-normal px-2 py-1 text-right">{CLS_LABEL[c].split(' ')[0]}</th>)}</tr></thead>
            <tbody>
              {CLASSES.map(t => (
                <tr key={t} className="border-t border-line/60">
                  <td className="pr-3 py-1.5 text-muted whitespace-nowrap">{CLS_LABEL[t]}</td>
                  {CLASSES.map(g => <td key={g} className={`px-2 py-1.5 text-right ${t === g ? 'text-fg font-medium' : 'text-muted'}`}>{res.m[t][g] || ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex items-baseline gap-2"><span className="font-display text-3xl tabular-nums">{pc(res.ok / Math.max(1, res.n))}</span><span className="text-sm text-muted">of single buildings classed the same as the volunteers</span></div>
          <p className="text-xs text-muted">What matters for demand is the count per class, not each roof. Summed probabilities against the tagged counts:</p>
          <ul className="space-y-1.5 text-sm">
            {CLASSES.map(c => (
              <li key={c} className="flex justify-between gap-4"><span>{CLS_LABEL[c]}</span><span className="tabular-nums text-muted">tagged <span className="text-fg">{n0(res.act[c])}</span> · estimated <span className="text-fg">{n0(res.exp[c])}</span></span></li>
            ))}
          </ul>
          <p className="text-sm text-fg leading-relaxed">What we learned: shape rules find homes well but miss most shops, schools and clinics. Those need map tags, the place list, or a model trained on tagged villages like these (next step). Until then the demand range carries this doubt.</p>
          <p className="text-xs text-muted leading-relaxed">Caveat: volunteers tag clinics and schools more often than ordinary houses, so this set has more of them than a real village. Footprints here are OSM polygons, not Open Buildings.</p>
        </div>
      </div>
    </div>
  );
};

export const ValidationPage: React.FC<{ site: SiteData; eng: Engine; onNext: () => void }> = ({ site, eng, onNext }) => {
  // Public check: mapped plant size against the solar needed for each year's forecast
  const plantRows = SITES.map(s => ({ s, plant: (s.data.grid.plants ?? []).find(p => p.cls === 'plant' && p.output) })).filter(r => r.plant);
  const kwp = eng.summary.energy_kwh_per_day.map(r => ({ year: r.year, p10: kwpFor(r.p10, eng.peak_sun_hours), p50: kwpFor(r.p50, eng.peak_sun_hours), p90: kwpFor(r.p90, eng.peak_sun_hours) }));
  return (
    <>
      <Box>
        <BoxHeader title="How we would prove it" meta="The test the judges score: error against metered demand" />
        <div className="px-5 pb-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ol className="space-y-3 text-sm min-w-0">
            <li><span className="text-fg font-medium">Hold sites back.</span> <span className="text-muted">Split metered mini-grids by country and developer, so the model is always tested on sites, and ideally countries, it has not seen.</span></li>
            <li><span className="text-fg font-medium">Predict before looking.</span> <span className="text-muted">Run GridSight on each held-out site using public data only, as Amina would before building.</span></li>
            <li><span className="text-fg font-medium">Score the middle.</span> <span className="text-muted">Error of the P50 against metered kWh in months 6 to 12 (median absolute percentage error).</span></li>
            <li><span className="text-fg font-medium">Score the range.</span> <span className="text-muted">About 8 in 10 sites should land between P10 and P90. Fewer means the range is too narrow; more means it is too wide to help a lender.</span></li>
            <li><span className="text-fg font-medium">Score the growth.</span> <span className="text-muted">Repeat for years 2 and 3 where meters have run that long.</span></li>
            <li><span className="text-fg font-medium">Beat the baseline.</span> <span className="text-muted">Compare with what developers do today: a flat kWh per household from a survey. The model is only worth using if it wins.</span></li>
          </ol>
          <div className="min-w-0 bg-surface-2 border border-line rounded-box p-4 text-sm">
            <p className="text-fg font-medium">Status</p>
            <ul className="mt-2 space-y-2 text-muted">
              <li><StatusDot tone="warn">Metered site data: not yet available.</StatusDot> <span className="block text-xs mt-0.5">Needs a partner operator or a data trust (see Data sharing).</span></li>
              <li><StatusDot tone="warn">Building classifier: tested below; misses most shops, schools and clinics.</StatusDot></li>
              <li><StatusDot tone="ok">Plant size sanity check: below, from a plant mapped on OpenStreetMap.</StatusDot></li>
              <li><StatusDot tone="info">Retraining: when meters arrive, the hand-set ranges on the Method tab are replaced by ranges fitted to them; the scoring above runs again.</StatusDot></li>
            </ul>
          </div>
        </div>
      </Box>

      <Box>
        <BoxHeader title="Check 1: building classes on held-out villages" meta={HOLD ? `Built ${HOLD.made}` : ''} />
        <ClassCheck />
      </Box>

      <Box>
        <BoxHeader title="Check 2: a mini-grid that was actually built" meta="Public data only; not metered demand" />
        <div className="px-5 pb-5 text-sm space-y-3">
          {plantRows.length ? plantRows.map(({ s, plant }) => {
            const kw = parseFloat(plant!.output!) * (plant!.output!.toLowerCase().includes('mw') ? 1000 : 1);
            const here = s.data.name === site.name;
            return (
              <div key={s.id} className="max-w-prose">
                <p><span className="text-fg font-medium">{s.data.name}, {s.data.region}.</span> <span className="text-muted">OpenStreetMap maps a solar plant rated {plant!.output} ({n0(kw)} kWp), {Math.round(plant!.d_km * 1000)} m from the village point.</span></p>
                {here ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-muted">Solar needed for the forecast demand each year (most likely, with P10 to P90 below):</p>
                    <ul className="grid grid-cols-5 gap-2 text-center tabular-nums max-w-xl">
                      {kwp.map(k => { const inside = kw >= k.p10 && kw <= k.p90; return (
                        <li key={k.year} className={`rounded-ctl border px-1 py-2 ${inside ? 'border-ok' : 'border-line'}`}>
                          <span className="block text-[11px] text-muted">Year {k.year}</span>
                          <span className="block font-semibold">{n0(k.p50)}</span>
                          <span className="block text-[11px] text-muted">{n0(k.p10)} to {n0(k.p90)}</span>
                        </li>); })}
                    </ul>
                    <p className="text-muted">The built {n0(kw)} kWp sits inside the range for {kwp.filter(k => kw >= k.p10 && kw <= k.p90).map(k => `year ${k.year}`).join(' and ') || 'none of the years'} (green outline). That fits a developer sizing for the first few years and expanding later. This is a sanity check, not validation: plant size reflects budget and staging, not measured use.</p>
                  </div>
                ) : <p className="text-muted mt-2">Pick {s.data.name} above to compare.</p>}
              </div>
            );
          }) : <p className="text-muted">No mapped plants with a rating among the sample sites.</p>}
        </div>
      </Box>
      <div className="flex justify-end"><button onClick={onNext} className={`${btn.primary} h-11 px-6`}>Next: sharing meter data</button></div>
    </>
  );
};
