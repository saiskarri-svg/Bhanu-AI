import React from 'react';
import { Box, BoxHeader, StatusDot, More } from './ui';
import type { Engine } from './engine';
import { n0, n1, pc } from './format';

const SRC_LABEL: Record<string, string> = { G: 'Google Open Buildings', M: 'Microsoft ML Buildings', O: 'OpenStreetMap', X: 'Other' };

// Measured sites within 1,000 miles and how they move this village's forecast
export const NearbyBox: React.FC<{ eng: Engine; name: string }> = ({ eng, name }) => {
  const nb = eng.nearby;
  if (!nb) return null;
  const c = eng.summary.energy_kwh_per_day, e = eng.uncalibrated?.energy_kwh_per_day ?? c;
  const move = nb.factor - 1;
  return (
    <Box>
      <BoxHeader title="Measured load within 1,000 miles" meta="Metered sites nearby pull the forecast toward what they actually use" />
      <div className="px-5 pb-5 space-y-4">
        {nb.sites.length === 0 ? (
          <p className="text-sm text-muted max-w-prose">
            No published metered site lies within 1,000 miles (1,609 km) of {name}, so the forecast rests on the published ranges alone.
            A partner's meter data from the region, or the Kenya and Nigeria smart-meter dataset run on a laptop, would fill this in.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums min-w-[640px]">
                <thead><tr className="text-left text-xs text-muted border-b border-line">
                  <th className="py-2 pr-3 font-normal">Measured site</th><th className="py-2 pr-3 font-normal text-right">Distance</th>
                  <th className="py-2 pr-3 font-normal text-right">Measured</th><th className="py-2 pr-3 font-normal text-right">Model here, same year</th>
                  <th className="py-2 pr-3 font-normal text-right">Ratio</th><th className="py-2 font-normal text-right">Weight</th>
                </tr></thead>
                <tbody>
                  {nb.sites.map(s => (
                    <tr key={s.site_id} className="border-b border-line align-top">
                      <td className="py-2 pr-3 min-w-[220px]">
                        <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:decoration-fg">{s.name}</a>
                        <span className="block text-[11px] text-muted leading-snug mt-0.5">{s.source}. {s.note}</span>
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{n0(s.d_km)} km</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{n1(s.observed)} kWh/mo<span className="block text-[11px] text-muted">per {s.metric}, year {s.year}</span></td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{n1(s.predicted)} kWh/mo</td>
                      <td className="py-2 pr-3 text-right">{n1(s.ratio)}x</td>
                      <td className="py-2 text-right whitespace-nowrap"><StatusDot tone={s.quality === 'high' ? 'ok' : s.quality === 'medium' ? 'warn' : 'bad'}>{s.weight.toFixed(2)}</StatusDot>
                        <span className="block text-[11px] text-muted">{s.quality} quality, located to {s.precision}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start">
              <div className="bg-surface-2 border border-line rounded-box p-4">
                <p className="text-xs text-muted">Nearby adjustment</p>
                <p className="font-display text-3xl tabular-nums mt-1">{nb.factor.toFixed(2)}x</p>
                <p className="text-xs text-muted mt-1">range {nb.factor_lo.toFixed(2)}x to {nb.factor_hi.toFixed(2)}x · total weight {nb.weight.toFixed(2)} against 1.00 for the published ranges</p>
              </div>
              <div className="text-sm text-muted space-y-2 min-w-0">
                <p>Every number in Kesho AI for {name} uses this adjustment: about <span className="text-fg tabular-nums">{n0(c[0].p50)} kWh a day</span> in year 1 and <span className="text-fg tabular-nums">{n0(c[4].p50)}</span> by year 5, against {n0(e[0].p50)} and {n0(e[4].p50)} from the published ranges alone. Sizing and tariffs follow.</p>
                <More label="How the nearby sites move it"><p>{Math.abs(move) < 0.05 ? 'The nearby data barely moves the forecast.' : move > 0 ? `Nearby sites use more than the model expects, so the forecast moves up ${pc(move)}.` : `Nearby sites use less than the model expects, so the forecast moves down ${pc(-move)}.`} Each site's weight falls with distance, data quality and how exactly it is located, and the published ranges count as one good site, so a single weak nearby number cannot swing the answer.</p></More>
              </div>
            </div>
          </>
        )}
        <More label="Add more measured sites"><p className="text-[11px] text-muted">Sites are listed in pipeline/measured_sites.csv with their sources. Add rows from partner operators or from the Kenya and Nigeria smart-meter dataset (24 mini-grids, 11,942 customers, on Zenodo) and run pipeline/run_engine.py.</p></More>
      </div>
    </Box>
  );
};

// Footprint sources, their dates, and the estimate of buildings added since
export const FootprintBox: React.FC<{ eng?: Engine; total: number; coverage?: { google_alone: number; merged: number } }> = ({ eng, total, coverage }) => {
  const a = eng?.age;
  if (!a) return null;
  const share = coverage ? coverage.google_alone / Math.max(1, coverage.merged) : null;
  return (
    <div className="space-y-2">
      {coverage && share != null && (
        <p className="text-sm"><StatusDot hang tone={share < 0.8 ? 'warn' : 'ok'}>Google alone finds {n0(coverage.google_alone)} of {n0(coverage.merged)} roofs ({pc(share)}).</StatusDot>
          <span className="block text-xs text-muted mt-0.5">{share < 0.8 ? 'Its pictures miss many buildings here; Microsoft and OpenStreetMap fill the gap.' : 'Microsoft and OpenStreetMap add the rest.'}</span></p>
      )}
      <p className="text-xs text-muted">Who supplied each footprint, after duplicates are removed (OpenStreetMap is preferred where sources overlap):</p>
      <ul className="space-y-1 text-sm">
        {(Object.entries(a.sources) as [string, number][]).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3"><span>{SRC_LABEL[k] ?? k}</span><span className="tabular-nums text-muted">{n0(v)} ({pc(v / Math.max(1, total))})</span></li>
        ))}
      </ul>
      <More label="How old are the pictures?"><p className="text-xs text-muted leading-relaxed">
        Typical record date {a.data_year ?? 'unknown'}. Pictures may be older than that, and villages grow. At {pc(a.growth)} household growth a year, the model adds about {n0(a.residential_now - a.residential_seen)} homes built since ({n0(a.residential_seen)} seen, {n0(a.residential_now)} used). Dates are when each source last updated its record, not the photo date.
      </p></More>
    </div>
  );
};
