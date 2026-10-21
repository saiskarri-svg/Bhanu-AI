import React from 'react';
import { Cite } from './Sources';
import { Box, BoxHeader, TINT } from './ui';

const ROLES = [
  {
    name: 'Solar PV installer',
    tint: TINT.sun,
    does: 'Fixes mounting frames, lays panels, runs DC cables and connects MC4 plugs on rooftops.',
    entry: 'After class 10 and an ITI (Electrician, Wireman) or a diploma, aged 18 or over. The free Suryamitra course from NISE (about 3 months) is the common start.',
    pay: '₹12,000 to ₹20,000 a month to start',
    skills: ['Components', 'Series or parallel', 'Safety'],
  },
  {
    name: 'O&M technician',
    tint: TINT.leaf,
    does: 'Cleans and inspects systems, reads inverter faults, tests earthing and fixes small problems.',
    entry: 'Suryamitra or an SCGJ solar technician certificate, plus site experience.',
    pay: '₹15,000 to ₹25,000 a month',
    skills: ['Spot the hazard', 'Shutdown drill', 'Soiling data'],
  },
  {
    name: 'Electrician (ITI)',
    tint: TINT.sky,
    does: 'Wires inverters, AC boards and net meters, and holds the licence needed for grid connection.',
    entry: 'ITI Electrician (2 years) after class 10, then a state wireman or supervisor licence.',
    pay: '₹15,000 to ₹30,000 a month',
    skills: ['Voltage and current', 'Safety'],
  },
  {
    name: 'Solar site engineer',
    tint: TINT.violet,
    does: 'Sizes systems, plans roof layouts, checks string design and manages installation teams.',
    entry: 'Diploma or B.Tech in Electrical (EEE) engineering.',
    pay: '₹25,000 to ₹60,000 a month',
    skills: ['Size it', 'Roof planner', 'Returns'],
  },
  {
    name: 'Energy data analyst',
    tint: TINT.sky,
    does: 'Watches monitoring dashboards like this one, spots drops in output and plans cleaning and repairs.',
    entry: 'Class 12 with maths, then a diploma or degree in computers, data or engineering.',
    pay: '₹25,000 a month and up',
    skills: ['Simulator', 'Soiling data', 'AI Advisor'],
  },
];

const STEPS = [
  { when: 'Now, in school', what: 'Finish every lesson here, help your teacher with monthly inspections, and keep a log of the school system.' },
  { when: 'After class 10', what: 'Join ITI Electrician or Wireman. Then, at 18, a Suryamitra or SCGJ solar technician course.' },
  { when: 'After class 12', what: 'A diploma or B.Tech in electrical engineering leads to design and engineering roles.' },
  { when: 'First job', what: 'Start on installation or maintenance teams. Site experience matters more than anything else.' },
];

const Careers: React.FC = () => (
  <div className="space-y-6">
    <Box>
      <BoxHeader title="Jobs in solar" meta="India" />
      <p className="px-5 text-sm text-muted max-w-prose">
        India is adding solar faster than almost any country<Cite id="india-solar" />, and every system needs people to build, run and repair it. These are the main jobs, and the lessons here that prepare you for each.
      </p>
      <ul className="mt-4 border-t border-line divide-y divide-line">
        {ROLES.map(r => (
          <li key={r.name} className="px-5 py-4 grid md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 gap-y-2">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.tint }} aria-hidden="true" />
              <div>
                <h4 className="text-sm font-semibold text-fg">{r.name}</h4>
                <p className="text-xs text-muted tabular-nums">{r.pay}</p>
              </div>
            </div>
            <div className="text-sm text-muted leading-relaxed">
              <p><span className="text-fg">What they do: </span>{r.does}</p>
              <p className="mt-1"><span className="text-fg">How to start: </span>{r.entry}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">Practise it here</p>
              <p className="text-sm text-muted">{r.skills.join(' · ')}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-5 py-3 border-t border-line text-xs text-muted">
        Pay is a rough guide and varies by state and employer<Cite id="pay" />. Check course dates and entry rules with NISE (Suryamitra)<Cite id="suryamitra" /> and the Skill Council for Green Jobs. ITI courses<Cite id="iti" />.
      </p>
    </Box>

    <Box>
      <BoxHeader title="Your path from here" />
      <ol className="mt-2 border-t border-line divide-y divide-line">
        {STEPS.map((s, i) => (
          <li key={s.when} className="px-5 py-3 flex gap-4">
            <span className="shrink-0 h-7 w-7 rounded-ctl bg-surface-2 border border-line flex items-center justify-center text-xs text-muted tabular-nums">{i + 1}</span>
            <div>
              <p className="text-sm font-medium text-fg">{s.when}</p>
              <p className="text-sm text-muted leading-relaxed">{s.what}</p>
            </div>
          </li>
        ))}
      </ol>
    </Box>
  </div>
);

export default Careers;
