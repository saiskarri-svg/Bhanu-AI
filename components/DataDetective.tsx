import React, { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SystemConfig } from '../types';
import { STATE_LAT } from '../constants';
import { Box, BoxHeader, Legend, StatusDot, TooltipCard, CHART, axisProps, btn, ResponsiveChart, CountUp } from './ui';
import { simulate, SimInputs } from './solarModel';
import { markDone } from './runtime';

type Shape = (h: number, kw: number, size: number) => number;

interface Case {
  id: string;
  clue: string;
  shape: Shape;
  options: string[];
  answer: number;
  why: string;
  todo: string;
}

// Deterministic wobble so passing clouds look the same every time
const wobble = (h: number) => 0.5 + 0.5 * Math.sin(h * 7.3) * Math.sin(h * 2.1 + 1);

const CASES: Case[] = [
  {
    id: 'shade', clue: 'Monday. A dry, clear day, but the morning looks wrong.',
    shape: (h, kw) => (h < 10.2 ? kw * 0.35 : kw),
    options: ['Dirty panels', 'Shade in the morning', 'Inverter fault', 'Passing clouds'], answer: 1,
    why: 'Output is low only before about 10 am, then jumps back to normal. Something is shading the panels while the sun is low in the east.',
    todo: 'Look east of the panels at sunrise. A tree branch or a new water tank is the usual cause.',
  },
  {
    id: 'dust', clue: 'Thursday. Clear sky all day, no rain for six weeks.',
    shape: (_, kw) => kw * 0.74,
    options: ['Dirty panels', 'One string disconnected', 'Shade in the morning', 'Inverter too small'], answer: 0,
    why: 'The curve has the right shape but is about a quarter lower all day. A steady loss like this is dust on the glass.',
    todo: 'Clean the panels early in the morning with water and a soft brush.',
  },
  {
    id: 'clouds', clue: 'Saturday in July. The monsoon is starting.',
    shape: (h, kw) => kw * (0.25 + 0.75 * wobble(h)),
    options: ['Inverter fault', 'Passing clouds', 'Dirty panels', 'One string disconnected'], answer: 1,
    why: 'The power jumps up and down quickly through the day. Each dip is a cloud passing in front of the sun.',
    todo: 'Nothing to fix. The system recovers as soon as the sky clears.',
  },
  {
    id: 'trip', clue: 'Tuesday. Clear sky, but someone says the lab computers went off after lunch.',
    shape: (h, kw) => (h >= 12.5 && h < 14 ? 0 : kw),
    options: ['Passing clouds', 'Shade in the morning', 'Inverter or grid trip', 'Dirty panels'], answer: 2,
    why: 'Output drops straight to zero at midday and comes back 90 minutes later. Clouds never cut it to zero, so the inverter stopped. It does this when the grid fails, for line workers\' safety, or when it has a fault.',
    todo: 'Check the inverter display for a fault code and ask the DISCOM about a power cut. Report repeated trips to the technician.',
  },
  {
    id: 'string', clue: 'Friday. Clear sky, every panel looks clean.',
    shape: (_, kw) => kw * 0.5,
    options: ['Dirty panels', 'One string disconnected', 'Passing clouds', 'Hot panels'], answer: 1,
    why: 'Exactly half the expected power, all day. With two strings, that means one string is not reaching the inverter, often a loose MC4 connector or a blown fuse.',
    todo: 'Do not touch anything. Tell the technician, who will shut down and check the string with a meter.',
  },
  {
    id: 'clip', clue: 'A new school with lots of panels on a cool, clear day.',
    shape: (_, kw, size) => Math.min(kw, size * 0.72),
    options: ['Inverter too small', 'Inverter or grid trip', 'Shade in the morning', 'Dirty panels'], answer: 0,
    why: 'The curve is normal in the morning and evening but flat across the middle of the day. The inverter has reached its limit and cannot pass on more power. This is called clipping.',
    todo: 'A little clipping is normal. A long flat top means the inverter is undersized for the panels.',
  },
];

const DetectiveTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <TooltipCard
      title={`${Math.floor(label)}:${String(Math.round((label % 1) * 60)).padStart(2, '0')}`}
      rows={payload.map((p: any) => ({ label: p.dataKey === 'actual' ? 'Measured' : 'Expected', value: `${p.value} kW`, color: p.dataKey === 'actual' ? CHART.sun : CHART.primary }))}
    />
  ) : null;

const DataDetective: React.FC<{ config: SystemConfig }> = ({ config }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [i, setI] = useState(0);
  const c = CASES[i];

  const base: SimInputs = {
    hour: 12, month: 2, lat: STATE_LAT[config.state] ?? 20, cloud: 0.05, haze: 0.08, rain: false, dustDays: 0, shade: 0,
    airTemp: 30, wind: 10, size: config.systemSize, lights: false, fans: false, lab: false,
  };

  const data = useMemo(() => {
    const pts = [];
    for (let h = 6; h <= 19; h += 0.25) {
      const kw = simulate({ ...base, hour: h }).acKw;
      pts.push({ h, expected: +kw.toFixed(2), actual: +c.shape(h, kw, config.systemSize).toFixed(2) });
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, config.systemSize, config.state]);

  const picked = answers[c.id];
  const answered = picked !== undefined;
  const right = Object.entries(answers).filter(([id, a]) => CASES.find(x => x.id === id)!.answer === a).length;
  const finished = Object.keys(answers).length === CASES.length;

  useEffect(() => { if (finished && right >= CASES.length - 1) markDone('detective'); }, [finished, right]);

  return (
    <div className="space-y-6">
      <Box>
        <BoxHeader title="Data detective" meta={`Case ${i + 1} of ${CASES.length} · ${right} solved`} />
        <p className="px-5 text-sm text-muted max-w-prose">
          Each case is one day of real-looking data from a {config.systemSize} kWp system. Compare the measured power with what a healthy system should make, then name the problem.
        </p>

        <div className="px-5 pt-3 flex gap-1.5" role="tablist" aria-label="Cases">
          {CASES.map((x, n) => {
            const a = answers[x.id];
            const color = a === undefined ? 'var(--line)' : a === x.answer ? CHART.positive : CHART.negative;
            return (
              <button key={x.id} role="tab" aria-selected={n === i} aria-label={`Case ${n + 1}`} onClick={() => setI(n)} className="flex-1 py-2">
                <span className={`block h-1.5 rounded-full ${n === i ? 'ring-1 ring-silver ring-offset-2 ring-offset-[var(--surface)]' : ''}`} style={{ background: color }} />
              </button>
            );
          })}
        </div>

        <div className="px-5 pt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg">{c.clue}</p>
          <Legend items={[{ label: 'Measured', color: CHART.sun }, { label: 'Healthy system', color: CHART.primary }]} />
        </div>
        <div className="h-[300px] px-2 pt-2">
          <ResponsiveChart>
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="h" type="number" domain={[6, 19]} ticks={[6, 8, 10, 12, 14, 16, 18]} {...axisProps} tickFormatter={v => `${v}:00`} />
              <YAxis {...axisProps} width={44} domain={[0, Math.max(1, Math.ceil(config.systemSize))]} allowDecimals={false} tickFormatter={v => `${v} kW`} />
              <Tooltip content={<DetectiveTooltip />} cursor={{ stroke: CHART.faint }} />
              <Line type="monotone" dataKey="expected" stroke={CHART.primary} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="actual" stroke={CHART.sun} strokeWidth={2.25} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveChart>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-2">
          {c.options.map((o, n) => {
            const isRight = answered && n === c.answer;
            const isWrong = answered && n === picked && picked !== c.answer;
            return (
              <button
                key={o}
                disabled={answered}
                onClick={() => setAnswers(a => ({ ...a, [c.id]: n }))}
                className={`text-left rounded-ctl border px-3 py-2.5 text-sm transition-colors ${
                  isRight ? 'border-ok text-fg' : isWrong ? 'border-bad text-fg' : answered ? 'border-line text-muted' : 'border-line text-fg hover:bg-surface-2'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mx-5 mb-5 bg-surface-2 border border-line rounded-box p-4 space-y-2" aria-live="polite">
            <StatusDot tone={picked === c.answer ? 'ok' : 'bad'} className={`text-sm ${picked === c.answer ? 'text-ok' : 'text-bad'}`}>
              {picked === c.answer ? 'Solved' : `Not quite. It was: ${c.options[c.answer]}`}
            </StatusDot>
            <p className="text-sm text-muted leading-relaxed"><span className="text-fg">The evidence: </span>{c.why}</p>
            <p className="text-sm text-muted leading-relaxed"><span className="text-fg">What to do: </span>{c.todo}</p>
          </div>
        )}

        <div className="px-5 pb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {finished ? `All cases done: ${right} of ${CASES.length} solved.` : 'Answer every case to finish.'}
          </p>
          <div className="flex gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className={btn.quiet}>Previous</button>}
            {i < CASES.length - 1 && <button onClick={() => setI(i + 1)} className={btn.secondary}>Next case</button>}
            {finished && <button onClick={() => { setAnswers({}); setI(0); }} className={btn.quiet}>Start again</button>}
          </div>
        </div>
      </Box>
    </div>
  );
};

export default DataDetective;
