import React, { useEffect, useState } from 'react';
import { Box, BoxHeader, CHART, TINT } from './ui';
import { PanelArt, SchoolArt, GridArt } from './FlowIcons';
import { LOADS } from './solarModel';

// Where the power goes right now, estimated from the typical day curve and a
// school timetable. The moving lines show which way power flows; they move
// faster and look thicker when more power flows.

interface Props {
  forecast: { time: string; generation: number }[];
}

const schoolLoad = (d: Date) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const open = d.getDay() !== 0 && h >= 9 && h < 16.5;
  return open ? LOADS.base + LOADS.lights * 0.5 + LOADS.fans * 0.75 + LOADS.lab * 0.5 : LOADS.base;
};

const solarAt = (forecast: Props['forecast'], d: Date) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const a = forecast[Math.floor(h) % 24]?.generation ?? 0;
  const b = forecast[Math.ceil(h) % 24]?.generation ?? 0;
  return a + (b - a) * (h - Math.floor(h));
};

const kw = (v: number) => `${v.toFixed(1)} kW`;

const Wire: React.FC<{ power: number; color: string; reverse?: boolean; label: string }> = ({ power, color, reverse, label }) => {
  const on = power > 0.05;
  const dur = Math.max(0.5, 2.2 - power * 0.35);
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 px-1">
      <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: on ? color : 'var(--muted)' }}>{on ? kw(power) : 'none'}</span>
      <svg className="w-full h-3 overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="6" x2="100" y2="6" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {on && (
          <line
            x1="0" y1="6" x2="100" y2="6"
            className={`flow-dash ${reverse ? 'flow-reverse' : ''}`}
            stroke={color}
            strokeWidth={Math.min(5, 2 + power * 0.6)}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ animationDuration: `${dur}s` }}
          />
        )}
      </svg>
      <span className="text-[11px] text-muted whitespace-nowrap">{label}</span>
    </div>
  );
};

const Node: React.FC<{ art: React.ReactNode; name: string }> = ({ art, name }) => (
  <div className="shrink-0 flex flex-col items-center gap-1.5">
    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-box bg-surface-2 border border-line grid place-items-center p-2">{art}</div>
    <span className="text-xs text-silver">{name}</span>
  </div>
);

export const EnergyNow: React.FC<Props> = ({ forecast }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const solar = solarAt(forecast, now);
  const load = schoolLoad(now);
  const grid = solar - load; // + to the grid, - from the grid
  const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const summary = solar < 0.05
    ? `The sun is down, so solar makes nothing. The school takes about ${kw(load)} from the grid.`
    : grid >= 0
      ? `Solar makes about ${kw(solar)}. The school uses about ${kw(load)}, so about ${kw(grid)} goes to the grid and earns credit.`
      : `Solar makes about ${kw(solar)}. The school needs about ${kw(load)}, so the grid adds about ${kw(-grid)}.`;

  return (
    <Box>
      <BoxHeader title="Where the power goes now" meta={`Estimate for ${time}`} />
      <div className="px-5 pb-2 pt-1 flex items-start">
        <Node art={<PanelArt className="h-full w-full" />} name="Panels" />
        <div className="flex-1 flex pt-4 sm:pt-5"><Wire power={solar} color={CHART.sun} label="solar" /></div>
        <Node art={<SchoolArt className="h-full w-full" />} name="School" />
        <div className="flex-1 flex pt-4 sm:pt-5"><Wire power={Math.abs(grid)} color={TINT.sky} reverse={grid < 0} label={grid >= 0 ? 'to grid' : 'from grid'} /></div>
        <Node art={<GridArt className="h-full w-full" />} name="Grid" />
      </div>
      <p className="px-5 pb-4 text-sm text-muted leading-relaxed">
        {summary} Based on a typical day and school hours, not a live meter.
      </p>
    </Box>
  );
};
