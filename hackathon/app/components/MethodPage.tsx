import React from 'react';
import { Box, BoxHeader, More } from './ui';
import { PARAMS, GROWTH_PARAMS } from './model';
import { REFS } from './refs';

const GROUPS = [
  { t: 'Map data', k: ['openbuildings', 'overture', 'sentinel2', 'metahrsl', 'worldcover'] },
  { t: 'Measured use and connections', k: ['faza', 'igc', 'frame', 'scottcoley', 'ngrea', 'rockefeller', 'sltariff', 'clasp'] },
  { t: 'Benchmarks and context', k: ['esmap', 'peters', 'antonanzas'] },
  { t: 'Weather, sun and climate', k: ['nasapower', 'clearsky', 'copdem', 'cmip6'] },
  { t: 'Costs and sun', k: ['amda2024', 'irena2024', 'esmapgrid', 'onsset2026', 'wbgrid', 'rmi2018', 'omorate', 'wbsplit', 'gsrough'] },
  { t: 'Population (Benichab)', k: ['dhs', 'census'] },
  { t: 'Building-level model (second opinion)', k: ['mtf', 'who', 'amda'] },
  { t: 'Model and assumptions', k: ['engine', 'assumption'] },
  { t: 'Planned inputs', k: ['zenodo', 'viirs', 'gridfinder'] },
];

const fmt = (x: number, unit: string) => (unit === '%' ? `${Math.round(x * 100)}%` : `${x}`);

export const MethodPage: React.FC = () => (
  <>
    <Box>
      <BoxHeader title="How GridSight works" />
      <ol className="px-5 pb-5 space-y-3 text-sm max-w-3xl">
        <li><span className="text-fg font-medium">1. Count roofs.</span> <span className="text-muted">Every building within the radius from three footprint sources merged by Overture Maps (Google Open Buildings, Microsoft ML Buildings, OpenStreetMap), because any one source can have old or missing pictures. Homes built since each record's date are added at the local household growth rate. Tags, places, roads and power lines come from OpenStreetMap.</span></li>
        <li><span className="text-fg font-medium">2. Say what each one is.</span> <span className="text-muted">Use the map tag or a nearby mapped place where there is one. Where the map is thin, shops, schools and clinics come from regional averages per household, and the building-level model keeps each roof's doubt as a probability.</span></li>
        <li><span className="text-fg font-medium">3. Forecast five years.</span> <span className="text-muted">The demand engine turns roofs into households, connects them at the pace measured at the Faza mini-grid in Kenya, adds appliances along S-curves for early and late adopters, mills and workshops one at a time, and the effect of the tariff. Household use is calibrated to measured sites (Rwanda, Malawi), not surveys, which overstate use.</span></li>
        <li><span className="text-fg font-medium">4. Simulate 4,000 futures.</span> <span className="text-muted">Every input is a range with its source. Report P10, P50 and P90, not one number, and rank which inputs drive the range.</span></li>
        <li><span className="text-fg font-medium">5. Test system sizes.</span> <span className="text-muted">Size solar and battery for P25 to P90 demand and test each against every future: brownouts, idle capacity, cost per kWh and whether revenue covers cost at each tariff.</span></li>
        <li><span className="text-fg font-medium">Use measured load nearby.</span> <span className="text-muted">Metered sites within 1,000 miles pull the forecast toward what they actually use, weighted by distance, data quality and location accuracy. The published ranges count as one good site, so one weak number cannot swing the answer.</span></li>
        <li><span className="text-fg font-medium">6. Learn from meters.</span> <span className="text-muted">The engine's validate command scores coverage and error on held-out metered sites and calibrates from them (see Validation and Data sharing).</span></li>
        <li><span className="text-fg font-medium">Why independent matters.</span> <span className="text-muted">Demand projections are often overstated, especially for productive use, and should come from parties without an incentive to overstate growth (Peters, Sievert and Toman 2019). GridSight is open: every input, source and building class can be traced.</span></li>
      </ol>
    </Box>
    <Box>
      <BoxHeader title="Building-level model: inputs and ranges" meta="The second opinion on Demand. The engine's inputs are listed below" />
      <div className="px-5 pb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-4 font-normal">Input</th><th className="py-2 pr-4 font-normal">Low</th><th className="py-2 pr-4 font-normal">Likely</th><th className="py-2 pr-4 font-normal">High</th><th className="py-2 pr-4 font-normal">Unit</th><th className="py-2 font-normal">Source</th></tr></thead>
          <tbody>
            {PARAMS.map(p => (
              <tr key={p.key} className="border-b border-line align-top">
                <td className="py-2 pr-4">{p.label}</td>
                <td className="py-2 pr-4 tabular-nums">{fmt(p.lo, p.unit)}</td><td className="py-2 pr-4 tabular-nums">{fmt(p.mode, p.unit)}</td><td className="py-2 pr-4 tabular-nums">{fmt(p.hi, p.unit)}</td>
                <td className="py-2 pr-4 text-muted whitespace-nowrap">{p.unit === '%' ? 'share' : p.unit || 'per roof'}</td>
                <td className="py-2 text-muted text-xs min-w-[200px]">{p.src}</td>
              </tr>
            ))}
            {Object.entries(GROWTH_PARAMS).map(([k, g]) => (
              <tr key={k} className="border-b border-line align-top">
                <td className="py-2 pr-4">{g.label}</td>
                <td className="py-2 pr-4 tabular-nums">{Math.round(g.lo * 100)}%</td><td className="py-2 pr-4 tabular-nums">{Math.round(g.mode * 100)}%</td><td className="py-2 pr-4 tabular-nums">{Math.round(g.hi * 100)}%</td>
                <td className="py-2 pr-4 text-muted">{k === 'connMax' ? 'share' : k === 'k' ? 'per year' : 'a year'}</td>
                <td className="py-2 text-muted text-xs">ESMAP 2022 on demand growth; own estimate</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
    <Box>
      <BoxHeader title="Where each number comes from" meta="Links to the paper where we hold it; otherwise to a search for it" />
      <More label="Show all sources" className="px-5 pb-5"><div className="space-y-5 [overflow-wrap:anywhere]">
        {GROUPS.map(g => (
          <div key={g.t}>
            <p className="text-xs text-muted mb-2">{g.t}</p>
            <ul className="space-y-2.5">
              {g.k.map(key => { const r = REFS[key]; return (
                <li key={key} id={`ref-${key}`} className="text-sm">
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-fg underline decoration-line underline-offset-2 hover:decoration-fg">{r.full}</a> : <span className={key === 'assumption' ? 'text-warn' : 'text-fg'}>{r.full}</span>}
                  <span className="block text-xs text-muted mt-0.5">Feeds: {r.feeds}</span>
                </li>); })}
            </ul>
          </div>
        ))}
        <p className="text-xs text-muted">Engine references are cited as forecast/assumptions.yaml names them (author and year); confirm full citations before submission. Every number on the Demand and Growth and money tabs carries a Source line pointing here.</p>
      </div></More>
    </Box>
  </>
);
