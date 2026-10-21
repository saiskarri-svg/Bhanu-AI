import React from 'react';
import { BarChart, Bar, XAxis, Cell } from 'recharts';
import { SystemConfig } from '../types';
import { MONTHS, SEASONAL_YIELDS, EMISSION_FACTOR, TREE_ABSORPTION } from '../constants';
import { CHART, axisProps, ResponsiveChart, CountUp } from './ui';
import { Cite } from './Sources';
import GlowSun from './GlowSun';
import { FLOW_ART } from './FlowIcons';

// A plain, friendly page for parents and the village. Opens on its own with #impact.
const ImpactPage: React.FC<{ config: SystemConfig; annualGen: number; standalone: boolean; onOpenDashboard: () => void }> = ({ config, annualGen, standalone, onOpenDashboard }) => {
  const saved = annualGen * config.unitPrice;
  const co2 = (annualGen * EMISSION_FACTOR) / 1000;
  const trees = Math.floor((annualGen * EMISSION_FACTOR) / TREE_ABSORPTION);
  const rooms = Math.floor(annualGen / 330);
  const books = Math.floor(saved / 250);
  const months = MONTHS.map((m, i) => ({ m, kwh: Math.round(annualGen * SEASONAL_YIELDS[i]), monsoon: i >= 5 && i <= 8 }));
  const School = FLOW_ART.school;
  const Sun = FLOW_ART.sun;

  return (
    <div className={`${standalone ? 'min-h-screen' : ''} relative`}>
      <div className="max-w-4xl mx-auto px-[var(--gutter)] py-10 space-y-10">
        {standalone && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2.5">
              <GlowSun className="h-12 w-12 -mx-2 -my-2 shrink-0" />
              <span className="text-[17px] font-semibold tracking-tight">Bhanu AI</span>
            </span>
            <button onClick={onOpenDashboard} className="text-sm text-muted hover:text-fg">Open the full dashboard</button>
          </div>
        )}

        <header className="text-center space-y-4">
          <div className="flex justify-center gap-2" aria-hidden="true">
            <Sun className="h-20 w-20" />
            <School className="h-20 w-20" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight [text-wrap:balance]">{config.schoolName || 'Our school'} runs on sunshine</h1>
          <p className="text-lg text-muted [text-wrap:balance]">
            {config.village}, {config.state}. A {config.systemSize} kWp rooftop solar system powers our classrooms, fans and computer lab.
          </p>
        </header>

        <section aria-label="This year's impact" className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
          {[
            { v: Math.round(annualGen).toLocaleString('en-IN'), u: 'kWh of clean power a year', c: CHART.sun },
            { v: '₹' + Math.round(saved).toLocaleString('en-IN'), u: 'saved on electricity bills a year', c: CHART.positive },
            { v: co2.toFixed(1), u: 'tonnes of CO₂ avoided a year', c: CHART.positive, src: 'cea-co2' },
            { v: trees.toLocaleString('en-IN'), u: 'trees would be needed to absorb the same', src: 'tree-co2' },
            { v: String(rooms), u: 'classrooms with steady lights and fans' },
            { v: books.toLocaleString('en-IN'), u: 'library books the savings could buy' },
          ].map(s => (
            <div key={s.u} className="bg-surface px-5 py-6 text-center">
              <p className="font-display font-semibold text-[34px] leading-none tabular-nums" style={{ color: s.c }}><CountUp value={s.v} /></p>
              <p className="mt-2 text-sm text-muted">{s.u}{s.src && <Cite id={s.src} />}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-center">Power through the year</h2>
          <p className="text-sm text-muted text-center">Less in the monsoon months, most in the dry, sunny spring.</p>
          <div className="h-[220px]">
            <ResponsiveChart>
              <BarChart data={months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="m" {...axisProps} />
                <Bar dataKey="kwh" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={false} label={{ position: 'top', fill: '#9a9aa3', fontSize: 10 }}>
                  {months.map(m => <Cell key={m.m} fill={m.monsoon ? CHART.monsoon : CHART.sun} />)}
                </Bar>
              </BarChart>
            </ResponsiveChart>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
          {[
            { t: 'Students learn solar', b: 'Every class learns how the system works, how to keep it safe and how to read its data.' },
            { t: 'Power made at school', b: 'Lights and fans run on power made on the school roof, easing the load on the village grid.' },
            { t: 'Savings stay in school', b: 'Money not spent on electricity goes to books and learning materials.' },
          ].map(x => (
            <div key={x.t} className="bg-surface p-5">
              <p className="text-sm font-semibold">{x.t}</p>
              <p className="mt-1 text-sm text-muted leading-relaxed">{x.b}</p>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-muted">
          Figures are estimates for a typical year from the system size and local sunshine. {standalone ? '' : 'To share this page on its own, add #impact to the end of the link.'}
        </p>
      </div>
    </div>
  );
};

export default ImpactPage;
