import React, { useState } from 'react';
import { SystemConfig } from '../types';
import { STATE_YIELDS, STATE_LAT } from '../constants';
import SchoolScene from './SchoolScene';
import Simulator from './Simulator';
import { VoltageCurrent, Wiring } from './Electricity';
import { FLOW_ART } from './FlowIcons';
import Sizing from './Sizing';
import HazardGame from './HazardGame';
import { PpeKit, ShutdownDrill } from './SafetyExtras';
import Quiz, { QUIZZES } from './Quiz';
import Careers from './Careers';
import DataDetective from './DataDetective';
import Certificate, { useRequirements } from './Certificate';
import TeacherGuide from './TeacherGuide';
import Standards from './Standards';
import { simulate, SimInputs } from './solarModel';
import { Box, BoxHeader, StatusDot, Legend, CHART, TINT, btn } from './ui';
import { Cite } from './Sources';

interface LearnTabProps {
  config: SystemConfig;
  annualGen: number;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
}

const PANEL_WATTS = 540;

const I: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const icons = {
  sun: <><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></>,
  panel: <><path d="M3 4h10l1.5 7h-13z" /><path d="M2.3 7.5h11.4M6 4l-.5 7M10 4l.5 7M8 11v3M5.5 14h5" /></>,
  inverter: <><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M5.5 6.5c.8-1.3 1.7-1.3 2.5 0s1.7 1.3 2.5 0M5.5 10.5h5" /></>,
  school: <><path d="M2 14V7l6-4 6 4v7z" /><path d="M6.5 14v-3.5h3V14" /></>,
  grid: <><path d="M5 14L8 2l3 12M6 9.5h4M5.5 6h5M3 14h10" /></>,
  frame: <><path d="M2 12L14 5M3.5 11v3M12.5 6v8M2 14h12" /></>,
  cable: <><path d="M2 5h4a2 2 0 012 2v2a2 2 0 002 2h4" /><rect x="1" y="3.5" width="2" height="3" rx="0.5" /><rect x="13" y="9.5" width="2" height="3" rx="0.5" /></>,
  shield: <><path d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 7-2.9-1.4-5-3.8-5-7v-4z" /><path d="M8.5 5L6.5 8.5h3l-2 3" /></>,
  switch: <><rect x="2" y="3" width="12" height="10" rx="1" /><path d="M5 10l3-4M5 6h.01M11 10h.01" /></>,
  meter: <><circle cx="8" cy="8" r="6" /><path d="M8 8l2.5-2.5M5 10.5h6" /></>,
  earth: <><path d="M8 2v7M4 9h8M5.5 11.5h5M7 14h2" /></>,
  battery: <><rect x="2" y="4.5" width="11" height="7" rx="1" /><path d="M14.5 7v2M5 8h3M6.5 6.5v3" /></>,
  chip: <><rect x="4" y="4" width="8" height="8" rx="1" /><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5" /></>,
};

// ---------- How it works ----------

type StageKey = 'sun' | 'panel' | 'inverter' | 'school' | 'grid';

const STAGES: { key: StageKey; label: string; tint: string }[] = [
  { key: 'sun', label: 'Sunlight', tint: TINT.sun },
  { key: 'panel', label: 'Panels', tint: TINT.sun },
  { key: 'inverter', label: 'Inverter', tint: TINT.violet },
  { key: 'school', label: 'School', tint: TINT.leaf },
  { key: 'grid', label: 'Grid', tint: TINT.sky },
];

// Wire type after each stage: light, DC, AC, AC
const WIRES: ('light' | 'dc' | 'ac')[] = ['light', 'dc', 'ac', 'ac'];

const HowItWorks: React.FC<LearnTabProps> = ({ config, annualGen }) => {
  const [stage, setStage] = useState<StageKey>('panel');
  const panels = Math.ceil((config.systemSize * 1000) / PANEL_WATTS);
  const dailyKwh = annualGen / 365;
  const yieldPerKw = STATE_YIELDS[config.state] || 1450;

  const detail: Record<StageKey, { title: string; body: string; fact: string }> = {
    sun: {
      title: 'Sunlight brings the energy',
      body: 'Light travels as tiny packets of energy called photons. Brighter sun and a clear sky mean more photons reach the panels. Dust, shade and clouds all block some of them.',
      fact: `In ${config.state}, each kW of panels makes about ${yieldPerKw.toLocaleString()} kWh a year.`,
    },
    panel: {
      title: 'Panels turn light into DC power',
      body: 'Each panel has silicon cells. When photons hit a cell, they knock electrons loose and push them along a wire. This is the photovoltaic effect. The power comes out as direct current (DC), which flows one way only.',
      fact: `Your ${config.systemSize} kWp system is about ${panels} panels of ${PANEL_WATTS} W.`,
    },
    inverter: {
      title: 'The inverter makes AC power',
      body: 'School lights, fans and computers use alternating current (AC) at 230 V and 50 Hz. The inverter switches the DC from the panels into matching AC. If the grid goes down, it stops sending power out so line workers stay safe.',
      fact: 'The inverter display shows live power (kW) and energy made today (kWh).',
    },
    school: {
      title: 'The school uses it first',
      body: 'AC power goes to the distribution board and on to every room. Whatever the school needs right now is taken from the panels first, so less is bought from the DISCOM.',
      fact: `On an average day this system makes about ${dailyKwh.toFixed(1)} kWh.`,
    },
    grid: {
      title: 'Extra power goes to the grid',
      body: 'On holidays and weekends the school uses little, so spare power flows out to the grid. A net meter counts units in both directions, and the school pays only for the difference.',
      fact: `Units sent out first cancel units the school buys, worth about ₹${config.unitPrice} each. Any surplus left at the year end earns less, about ₹3 a unit.`,
    },
  };

  const d = detail[stage];
  const wireColor = (w: 'light' | 'dc' | 'ac') => (w === 'ac' ? CHART.monsoon : CHART.sun);

  return (
    <div className="space-y-6">
      <Box>
        <BoxHeader
          title="Follow the energy"
          meta={<Legend items={[{ label: 'DC power', color: CHART.sun }, { label: 'AC power', color: CHART.monsoon }]} />}
        />
        <p className="px-5 text-sm text-muted">Tap a step to learn what happens there.</p>

        <div className="px-5 pt-5 pb-2">
          <ol className="flex flex-col md:flex-row md:items-center gap-0" aria-label="Energy flow">
            {STAGES.map((s, i) => {
              const active = s.key === stage;
              return (
                <React.Fragment key={s.key}>
                  <li className="md:flex-1 md:min-w-0">
                    <button
                      onClick={() => setStage(s.key)}
                      aria-pressed={active}
                      className={`group w-full flex md:flex-col items-center gap-3 md:gap-2.5 rounded-box border px-3 py-3 md:py-4 text-left md:text-center transition-colors ${
                        active ? 'border-silver bg-surface-2' : 'border-line hover:bg-surface-2'
                      }`}
                    >
                      <span
                        className="h-16 w-16 md:h-[72px] md:w-[72px] shrink-0 rounded-box flex items-center justify-center transition-transform group-hover:-translate-y-0.5"
                        style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${s.tint} ${active ? 26 : 14}%, transparent), transparent 72%)` }}
                      >
                        {React.createElement(FLOW_ART[s.key], { className: 'h-14 w-14 md:h-16 md:w-16' })}
                      </span>
                      <span className={`text-sm ${active ? 'text-fg font-medium' : 'text-muted'}`}>{s.label}</span>
                    </button>
                  </li>
                  {i < WIRES.length && (
                    <li aria-hidden="true" className="flex md:block justify-start pl-[43px] md:pl-0 md:w-10 shrink-0">
                      <span
                        className={`flow-wire block ${WIRES[i] === 'light' ? 'flow-light' : ''}`}
                        style={{ ['--wire' as string]: wireColor(WIRES[i]) }}
                      />
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </div>

        <div className="mx-5 mb-5 mt-3 grid md:grid-cols-[minmax(0,1fr)_280px] gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="bg-surface p-5">
            <h3 className="text-base font-semibold">{d.title}</h3>
            <p className="mt-1.5 text-sm text-muted leading-relaxed max-w-prose">{d.body}</p>
          </div>
          <div className="bg-surface p-5">
            <p className="text-xs text-muted">At this school</p>
            <p className="mt-1.5 text-sm text-fg leading-relaxed">{d.fact}</p>
          </div>
        </div>
      </Box>

      <VoltageCurrent />
      <Wiring defaultPanels={panels} />

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Three ideas to remember</h3>
        <div className="grid md:grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
          {[
            { t: 'kW is speed, kWh is distance', b: 'kW is how fast power flows right now. kWh is how much energy added up over time. A 1 kW fan running for 1 hour uses 1 kWh, also called 1 unit.' },
            { t: 'DC and AC', b: 'DC flows one way, like from a battery. AC changes direction 50 times a second, like the wall socket. Panels make DC, the school runs on AC.' },
            { t: 'Heat and dust cost power', b: <>Panels lose about 0.4% of output for every degree above 25 °C<Cite id="temp-coeff" />. Two months of dust without rain can cut output by 15 to 25%<Cite id="soiling" />, which is why cleaning matters.</> },
          ].map(c => (
            <div key={c.t} className="bg-surface p-5">
              <p className="text-sm font-semibold text-fg">{c.t}</p>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{c.b}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ---------- Components ----------

type PartId = 'panel' | 'frame' | 'cable' | 'combiner' | 'inverter' | 'acdb' | 'meter' | 'earth' | 'battery' | 'sensor';

const PARTS: { id: PartId; at: [number, number]; icon: keyof typeof icons; side: string; tint: string; name: string; job: string; check: string }[] = [
  { id: 'panel', at: [370, 150], icon: 'panel', side: 'DC side', tint: TINT.sun, name: 'Solar panels', job: 'Silicon cells in a glass and aluminium frame. They turn sunlight into DC power and last 25 years or more.', check: 'Look for dust, bird droppings, cracks or shade from trees, from the ground only.' },
  { id: 'frame', at: [236, 190], icon: 'frame', side: 'DC side', tint: TINT.sun, name: 'Mounting structure', job: 'Galvanised steel frame that holds the panels at the right tilt, facing south, and keeps them safe in strong wind.', check: 'Rust spots and loose bolts, seen from a safe spot.' },
  { id: 'cable', at: [652, 286], icon: 'cable', side: 'DC side', tint: TINT.sun, name: 'DC cables and MC4 connectors', job: 'UV proof cables link the panels into strings. MC4 connectors snap them together with a watertight lock.', check: 'Cables hanging loose or lying in water. Never touch or pull them.' },
  { id: 'combiner', at: [578, 175], icon: 'switch', side: 'Protection', tint: TINT.violet, name: 'DC combiner box', job: 'Joins the strings and holds fuses, a surge protector and the DC isolator switch that cuts panel power to the inverter.', check: 'Box door closed and labels readable.' },
  { id: 'inverter', at: [684, 378], icon: 'inverter', side: 'AC side', tint: TINT.sky, name: 'Inverter', job: 'Changes DC to 230 V AC, tracks the best operating point of the panels, and shuts off if the grid fails.', check: 'Read the display: live kW, today\'s kWh and any fault code.' },
  { id: 'acdb', at: [730, 374], icon: 'shield', side: 'Protection', tint: TINT.violet, name: 'AC distribution board', job: 'Holds the AC breaker and surge protector between the inverter and the school wiring.', check: 'Breaker position and any tripped switch. Report it, don\'t reset it.' },
  { id: 'meter', at: [820, 368], icon: 'meter', side: 'AC side', tint: TINT.sky, name: 'Net meter', job: 'A two-way meter fitted by the DISCOM. It counts units bought from and sent to the grid.', check: 'Note both readings each month and compare with the bill.' },
  { id: 'earth', at: [132, 456], icon: 'earth', side: 'Protection', tint: TINT.violet, name: 'Earthing and lightning arrester', job: 'Copper rods in earth pits carry fault current and lightning safely into the ground.', check: 'Earth pit covers in place and the area kept clear.' },
  { id: 'battery', at: [688, 425], icon: 'battery', side: 'Optional', tint: TINT.leaf, name: 'Battery bank', job: 'Stores energy for evening use or outages. Many school systems run without one and use the grid instead.', check: 'Ventilation clear and no swelling or leaks.' },
  { id: 'sensor', at: [506, 122], icon: 'chip', side: 'Monitoring', tint: TINT.leaf, name: 'Bhanu AI sensors', job: 'Measure dust, temperature and output every day and send them to this dashboard.', check: 'The "Sensors live" light at the top of this page.' },
];

// Cropped view of the 960 x 520 school scene
const VIEW_X = 96;
const VIEW_Y = 100;
const VIEW_W = 864;
const VIEW_H = 396;

const PartCard: React.FC<{ part: typeof PARTS[number]; index: number }> = ({ part, index }) => (
  <div className="flex gap-3">
    <span
      className="h-8 w-8 shrink-0 rounded-ctl flex items-center justify-center"
      style={{ color: part.tint, background: `color-mix(in srgb, ${part.tint} 14%, transparent)` }}
    >
      <I>{icons[part.icon]}</I>
    </span>
    <div className="min-w-0">
      <p className="text-xs text-muted">{index + 1} · {part.side}</p>
      <h4 className="text-sm font-semibold text-fg">{part.name}</h4>
      <p className="mt-1 text-[13px] text-muted leading-relaxed">{part.job}</p>
      <p className="mt-1.5 text-xs text-muted"><span className="text-silver">Students can check:</span> {part.check}</p>
    </div>
  </div>
);

const Components: React.FC<{ config: SystemConfig }> = ({ config }) => {
  // A clear midday in March, everything switched on
  const env: SimInputs = {
    hour: 12, month: 2, lat: STATE_LAT[config.state] ?? 20, cloud: 0.05, haze: 0.1, rain: false, dustDays: 5,
    shade: 0, airTemp: 31, wind: 8, size: config.systemSize, lights: true, fans: true, lab: true,
  };
  const out = simulate(env);
  const [hover, setHover] = useState<PartId | null>(null);
  const [pinned, setPinned] = useState<PartId | null>(null);
  const activeId = hover ?? pinned;
  const activeIdx = PARTS.findIndex(p => p.id === activeId);
  const active = activeIdx >= 0 ? PARTS[activeIdx] : null;
  const pick = (id: PartId) => setPinned(p => (p === id ? null : id));

  // Card sits beside the marker, on whichever side has room
  const cardStyle = (at: [number, number]): React.CSSProperties => {
    const left = ((at[0] - VIEW_X) / VIEW_W) * 100;
    const top = ((at[1] - VIEW_Y) / VIEW_H) * 100;
    const x = left > 55 ? 'calc(-100% - 18px)' : '18px';
    const y = top < 30 ? '-12%' : top > 70 ? '-88%' : '-50%';
    return { left: `${left}%`, top: `${top}%`, transform: `translate(${x}, ${y})` };
  };

  return (
    <div className="space-y-6" onKeyDown={e => { if (e.key === 'Escape') { setPinned(null); setHover(null); } }}>
      <Box>
        <BoxHeader
          title="Find the parts at the school"
          meta={<Legend items={[{ label: 'DC power', color: CHART.sun }, { label: 'AC power', color: CHART.monsoon }]} />}
        />
        <p className="px-5 text-sm text-muted">Hover or tap a numbered part to learn what it does.</p>

        <div className="relative mx-3 sm:mx-5 mt-4 mb-5" onClick={() => setPinned(null)}>
          <SchoolScene
            schoolName={config.schoolName}
            place={`${config.village}, ${config.state}`}
            env={env}
            out={out}
            viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
            parts={{
              active: activeId,
              onHover: id => setHover(id as PartId | null),
              onPick: id => pick(id as PartId),
              tintOf: id => PARTS.find(p => p.id === id)?.tint ?? CHART.primary,
            }}
          />

          {PARTS.map((p, i) => {
            const isOn = activeId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`${i + 1}. ${p.name}`}
                aria-pressed={pinned === p.id}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p.id)}
                onBlur={() => setHover(null)}
                onClick={e => { e.stopPropagation(); pick(p.id); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 rounded-full border text-[10px] sm:text-[11px] font-semibold tabular-nums flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  left: `${((p.at[0] - VIEW_X) / VIEW_W) * 100}%`,
                  top: `${((p.at[1] - VIEW_Y) / VIEW_H) * 100}%`,
                  borderColor: p.tint,
                  color: isOn ? '#0b0b0d' : p.tint,
                  background: isOn ? p.tint : 'rgba(11,11,13,0.85)',
                }}
              >
                {i + 1}
              </button>
            );
          })}

          {active && (
            <div
              className="hidden md:block absolute z-10 w-[280px] pointer-events-none bg-surface-2 border border-line rounded-box shadow-pop p-4"
              style={cardStyle(active.at)}
              role="tooltip"
            >
              <PartCard part={active} index={activeIdx} />
            </div>
          )}
        </div>

        {/* Phones: the card shows under the drawing */}
        <div className="md:hidden mx-3 mb-4 bg-surface-2 border border-line rounded-box p-4" aria-live="polite">
          {active ? <PartCard part={active} index={activeIdx} /> : <p className="text-sm text-muted">Tap a number to see that part.</p>}
        </div>
      </Box>

      <Box>
        <BoxHeader title="All parts" meta={`${PARTS.length} parts`} />
        <ul className="mt-2 border-t border-line divide-y divide-line">
          {PARTS.map((p, i) => (
            <li
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              className={`px-5 py-4 transition-colors ${activeId === p.id ? 'bg-surface-2' : ''}`}
            >
              <PartCard part={p} index={i} />
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
};


// ---------- Safety ----------

const Safety: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-surface border border-line rounded-box p-5 flex gap-4">
      <span
        className="h-9 w-9 shrink-0 rounded-ctl flex items-center justify-center"
        style={{ color: CHART.negative, background: `color-mix(in srgb, ${CHART.negative} 14%, transparent)` }}
      >
        <I>{icons.shield}</I>
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold">The golden rule</h3>
        <p className="mt-1 text-sm text-muted leading-relaxed max-w-prose">
          Panels make electricity whenever there is light, and switching off the inverter does not stop them. Students learn by watching and reading the data. Only a trained, licensed technician opens boxes or touches wiring.
        </p>
      </div>
    </div>

    <HazardGame />
    <PpeKit />
    <ShutdownDrill />
    <Standards />

    <div className="grid xl:grid-cols-2 gap-6 items-start">
      <div className="contents">
        <div className="grid sm:grid-cols-2 gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="bg-surface p-5">
            <StatusDot tone="ok" className="text-xs text-muted">Do</StatusDot>
            <ul className="mt-2 space-y-1.5 text-sm text-fg leading-relaxed">
              <li>Watch from the ground or a safe railing</li>
              <li>Clean with plain water and a soft brush</li>
              <li>Clean in the early morning or evening</li>
              <li>Wear rubber soled shoes near equipment</li>
              <li>Report anything odd to a teacher</li>
            </ul>
          </div>
          <div className="bg-surface p-5">
            <StatusDot tone="bad" className="text-xs text-muted">Don't</StatusDot>
            <ul className="mt-2 space-y-1.5 text-sm text-muted leading-relaxed">
              <li>Climb on the roof alone</li>
              <li>Stand, sit or lean on panels</li>
              <li>Touch cables, connectors or open boxes</li>
              <li>Use soap or pressure washers</li>
              <li>Go near the system in rain or lightning</li>
            </ul>
          </div>
        </div>

        <Box>
          <BoxHeader title="Warning signs" meta="Keep away and report" />
          <ul className="mt-2 border-t border-line divide-y divide-line text-sm">
            {[
              ['Burning smell or smoke', 'bad'],
              ['Sparks, crackling or buzzing sounds', 'bad'],
              ['Melted or brown connectors', 'warn'],
              ['Cracked glass or a panel hotter than the rest', 'warn'],
              ['Fault code on the inverter display', 'info'],
            ].map(([t, tone]) => (
              <li key={t} className="px-5 py-2.5">
                <StatusDot tone={tone as 'bad' | 'warn' | 'info'} className="text-fg">{t}</StatusDot>
              </li>
            ))}
          </ul>
        </Box>

        <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="bg-surface px-5 py-4">
            <p className="text-xs text-muted">Emergency</p>
            <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums select-all">112</p>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="text-xs text-muted">Fire</p>
            <p className="mt-1 font-display font-semibold text-[28px] leading-none tabular-nums select-all">101</p>
          </div>
        </div>
      </div>
    </div>

    <Quiz id="safety" {...QUIZZES.safety} />
  </div>
);

// ---------- Tab ----------

const MODULES = ['How it works', 'Components', 'Size it', 'Simulator', 'Safety', 'Data detective', 'Careers', 'Certificate', 'Teacher guide'] as const;
// Lessons are numbered; the certificate and teacher guide are not
const MODULE_COLOR: Record<string, string> = {
  'How it works': '#ffc23d', Components: '#6ab8ff', 'Size it': '#b49cff', Simulator: '#ff7a3d', Safety: '#ff6f66',
  'Data detective': '#5aa9ff', Careers: '#34d65c', Certificate: '#f5c518', 'Teacher guide': '#c8c8cf',
};
const LESSON_COUNT = 7;

const LearnTab: React.FC<LearnTabProps> = props => {
  const [module, setModule] = useState(0);
  const reqs = useRequirements();
  const lessonDone = (m: string) => {
    const r = reqs.filter(x => x.lesson === m);
    return r.length > 0 && r.every(x => x.done);
  };
  const goTo = (lesson: string) => {
    const i = MODULES.indexOf(lesson as typeof MODULES[number]);
    if (i >= 0) { setModule(i); window.scrollTo({ top: 0 }); }
  };
  const done = reqs.filter(r => r.done).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Learn solar</h2>
          <p className="text-base sm:text-lg text-silver">Short lessons for students and staff, using this school's own system.</p>
        </div>
        <button onClick={() => goTo('Certificate')} className="text-sm text-silver hover:text-fg tabular-nums">
          {done} of {reqs.length} steps to the certificate
        </button>
      </div>

      <div role="tablist" aria-label="Lessons" className="flex flex-wrap gap-2">
        {MODULES.map((m, i) => {
          const on = module === i;
          const c = MODULE_COLOR[m];
          const isDone = lessonDone(m);
          return (
            <button
              key={m}
              role="tab"
              aria-selected={on}
              data-lesson
              onClick={() => setModule(i)}
              className="shrink-0 h-10 sm:h-11 pl-1.5 pr-3.5 sm:pr-4 rounded-full border text-sm sm:text-[15px] flex items-center gap-2 transition-colors duration-200"
              style={{
                borderColor: on ? c : `color-mix(in srgb, ${c} 35%, var(--line))`,
                background: on ? `color-mix(in srgb, ${c} 22%, var(--surface))` : 'var(--surface)',
                color: on ? 'var(--fg)' : 'var(--silver)',
                fontWeight: on ? 600 : 500,
              }}
            >
              <span
                className="h-7 min-w-7 sm:h-8 sm:min-w-8 px-1.5 rounded-full flex items-center justify-center text-[13px] font-semibold tabular-nums"
                style={{ background: on ? c : `color-mix(in srgb, ${c} 18%, transparent)`, color: on ? '#0b0b0d' : c }}
                aria-label={isDone ? 'done' : undefined}
              >
                {isDone ? '✓' : i < LESSON_COUNT ? i + 1 : m === 'Certificate' ? '★' : '✎'}
              </span>
              {m}
            </button>
          );
        })}
      </div>

      {module === 0 && <><HowItWorks {...props} /><Quiz id="how" {...QUIZZES.how} /></>}
      {module === 1 && <><Components config={props.config} /><Quiz id="parts" {...QUIZZES.parts} /></>}
      {module === 2 && <><Sizing config={props.config} setConfig={props.setConfig} /><Quiz id="size" {...QUIZZES.size} /></>}
      {module === 3 && <><Simulator config={props.config} /><Quiz id="sim" {...QUIZZES.sim} /></>}
      {module === 4 && <Safety />}
      {module === 5 && <DataDetective config={props.config} />}
      {module === 6 && <Careers />}
      {module === 7 && <Certificate config={props.config} goTo={goTo} />}
      {module === 8 && <TeacherGuide />}
    </div>
  );
};

export default LearnTab;
