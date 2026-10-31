import React from 'react';
import { Box, BoxHeader } from './ui';
import { PARAMS, GROWTH_PARAMS } from './model';
import { SOURCES } from './sources';

const fmt = (x: number, unit: string) => (unit === '%' ? `${Math.round(x * 100)}%` : `${x}`);

export const MethodPage: React.FC = () => (
  <>
    <Box>
      <BoxHeader title="How GridSight works" />
      <ol className="px-5 pb-5 space-y-3 text-sm max-w-3xl">
        <li><span className="text-fg font-medium">1. Count roofs.</span> <span className="text-muted">Every building within the radius from Google Open Buildings: centre point, footprint area and how sure the satellite model is.</span></li>
        <li><span className="text-fg font-medium">2. Say what each one is.</span> <span className="text-muted">Use the OpenStreetMap tag or a mapped place (clinic, school, shop) when there is one. Otherwise score it from size, shape, road frontage, crowding and nearby markets, and keep the doubt as a probability.</span></li>
        <li><span className="text-fg font-medium">3. Turn buildings into customers and kWh.</span> <span className="text-muted">Each class gets a range of households per roof, sign-up rate and monthly use, taken from the sources below.</span></li>
        <li><span className="text-fg font-medium">4. Simulate 1,500 futures.</span> <span className="text-muted">Draw every input from its range at once, and the building classes from their probabilities. Report P10, P50 and P90, not one number.</span></li>
        <li><span className="text-fg font-medium">5. Explain it.</span> <span className="text-muted">Swing each input alone from low to high to show which ones move the answer most.</span></li>
        <li><span className="text-fg font-medium">6. Learn from meters.</span> <span className="text-muted">The ranges are set by hand today. With metered sites they become fitted distributions, checked on sites held back from fitting (see Validation).</span></li>
      </ol>
    </Box>
    <Box>
      <BoxHeader title="Inputs and their ranges" meta="Low, likely, high. Rough guides." />
      <div className="px-5 pb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted border-b border-line"><th className="py-2 pr-4 font-normal">Input</th><th className="py-2 pr-4 font-normal">Low</th><th className="py-2 pr-4 font-normal">Likely</th><th className="py-2 pr-4 font-normal">High</th><th className="py-2 pr-4 font-normal">Unit</th><th className="py-2 font-normal">Source</th></tr></thead>
          <tbody>
            {PARAMS.map(p => (
              <tr key={p.key} className="border-b border-line/60 align-top">
                <td className="py-2 pr-4">{p.label}</td>
                <td className="py-2 pr-4 tabular-nums">{fmt(p.lo, p.unit)}</td><td className="py-2 pr-4 tabular-nums">{fmt(p.mode, p.unit)}</td><td className="py-2 pr-4 tabular-nums">{fmt(p.hi, p.unit)}</td>
                <td className="py-2 pr-4 text-muted whitespace-nowrap">{p.unit === '%' ? 'share' : p.unit || 'per roof'}</td>
                <td className="py-2 text-muted text-xs min-w-[200px]">{p.src}</td>
              </tr>
            ))}
            {Object.entries(GROWTH_PARAMS).map(([k, g]) => (
              <tr key={k} className="border-b border-line/60 align-top">
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
      <BoxHeader title="Sources" />
      <ol className="px-5 pb-5 space-y-3 text-sm">
        {SOURCES.map(s => (
          <li key={s.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)]">
            <span className="text-muted tabular-nums">{s.id}</span>
            <span className="min-w-0"><a href={s.url} target="_blank" rel="noreferrer" className="text-fg underline decoration-line underline-offset-2 hover:decoration-fg">{s.title}</a> <span className="text-muted">· {s.who}</span>
              <span className="block text-xs text-muted mt-0.5">{s.used}</span></span>
          </li>
        ))}
      </ol>
    </Box>
  </>
);
