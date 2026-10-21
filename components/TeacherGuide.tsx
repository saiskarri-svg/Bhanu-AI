import React, { useState } from 'react';
import { Box, BoxHeader, StatusDot, btn } from './ui';
import { QUIZZES } from './Quiz';
import { saveFile } from './runtime';

interface Plan {
  lesson: string;
  quiz?: keyof typeof QUIZZES;
  goal: string;
  steps: [string, string][]; // [minutes, activity]
  discuss: string[];
  activity: string;
}

const PLANS: Plan[] = [
  {
    lesson: 'How it works', quiz: 'how',
    goal: 'Students can trace energy from the sun to the classroom and explain voltage, current and power.',
    steps: [['5', 'Ask: where does the power for our fans come from? Write answers on the board.'], ['10', 'Follow the energy together, tapping each step on the projector.'], ['15', 'Pairs try the series and parallel lab: wire 10 panels each way and compare current and cable loss.'], ['10', 'Quiz, then discuss the answers they missed.']],
    discuss: ['Why does the school run on AC if the panels make DC?', 'Why would an electrician choose series over parallel?'],
    activity: 'Read the inverter display at lunch and at 4 pm. Write both kW numbers. Which is higher and why?',
  },
  {
    lesson: 'Components', quiz: 'parts',
    goal: 'Students can name the 10 parts of the school system and what each does.',
    steps: [['5', 'Show the school drawing. Ask who has seen any of these parts.'], ['15', 'Walk outside and find the real inverter, net meter and earth pit, from a safe distance.'], ['10', 'Back in class, match each number on the drawing to a part.'], ['10', 'Quiz.']],
    discuss: ['Which part would you check first if the dashboard shows zero power?', 'Why is the battery optional here?'],
    activity: 'Draw your own school roof and mark where each part is.',
  },
  {
    lesson: 'Size it', quiz: 'size',
    goal: 'Students can estimate the school\'s energy use and size a system for it.',
    steps: [['15', 'Groups count lights, fans and computers in two rooms and read their watt labels.'], ['10', 'Enter the counts in the audit and compare with the sample school.'], ['10', 'Use the sizing step, then plan the roof using real measurements.'], ['5', 'Quiz.']],
    discuss: ['Which change would cut our energy use the most?', 'Is a battery worth it for our power cuts?'],
    activity: 'Measure the roof with a tape (with a teacher). Enter the size in the roof planner.',
  },
  {
    lesson: 'Simulator', quiz: 'sim',
    goal: 'Students can explain how weather, dust, heat and shade change solar output.',
    steps: [['5', 'Predict: will panels make more on a hot day or a cool day?'], ['15', 'Pairs try the four challenges and note what they changed.'], ['10', 'Share: which challenge was hardest and why?'], ['10', 'Quiz.']],
    discuss: ['Why does a cool, windy day help the panels?', 'What can the school control, and what can it not?'],
    activity: 'Note the weather each day for a week and compare with the real Soiling tab readings.',
  },
  {
    lesson: 'Safety', quiz: 'safety',
    goal: 'Students know the golden rule, spot hazards and know what to do when they see one.',
    steps: [['5', 'Golden rule: panels are always live in daylight. Students repeat it.'], ['10', 'Spot the hazard as a class on the projector.'], ['10', 'Protective gear and shutdown drill in pairs.'], ['5', 'Rules and standards: which ones apply to our school?'], ['10', 'Quiz. All students must pass before helping with cleaning.']],
    discuss: ['What would you do if you saw a cable lying in water?', 'Why must the AC side be switched off first?'],
    activity: 'Make a safety poster for the stairs to the roof.',
  },
  {
    lesson: 'Data detective',
    goal: 'Students can read a power curve and diagnose common problems.',
    steps: [['5', 'Draw an ideal day curve on the board together.'], ['20', 'Pairs solve the cases and write down their evidence.'], ['15', 'Compare with the real Overview and Soiling charts.']],
    discuss: ['What does a flat top on the curve mean?', 'How can you tell clouds from dust?'],
    activity: 'Check the dashboard each morning for a week. Report anything unusual.',
  },
];

const worksheet = (p: Plan) => {
  const q = p.quiz ? QUIZZES[p.quiz].questions : [];
  return [
    `# ${p.lesson}: worksheet`,
    '',
    'Name: ____________________    Class: ______    Date: __________',
    '',
    `Goal: ${p.goal}`,
    '',
    '## Questions',
    ...q.flatMap((x, i) => ['', `${i + 1}. ${x.q}`, ...x.options.map((o, j) => `   ${String.fromCharCode(97 + j)}) ${o}`)]),
    '',
    '## Think about it',
    ...p.discuss.map(d => `- ${d}\n\n  ______________________________________________`),
    '',
    '## Activity',
    p.activity,
    '',
  ].join('\n');
};

const answerKey = (p: Plan) => {
  const q = p.quiz ? QUIZZES[p.quiz].questions : [];
  return [`# ${p.lesson}: answer key`, '', ...q.map((x, i) => `${i + 1}. ${String.fromCharCode(97 + x.answer)}) ${x.options[x.answer]}. ${x.why}`), ''].join('\n');
};

const TeacherGuide: React.FC = () => {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const fileName = (p: Plan, kind: string) => `${p.lesson} ${kind}.md`;

  const get = async (p: Plan, kind: 'worksheet' | 'answer key') => {
    const ok = await saveFile(fileName(p, kind), kind === 'worksheet' ? worksheet(p) : answerKey(p));
    setMsg(ok ? `${p.lesson} ${kind} saved.` : 'The download was not saved.');
  };

  return (
    <div className="space-y-6">
      <Box>
        <BoxHeader title="Teacher guide" meta="One 40 minute period per lesson" />
        <p className="px-5 pb-4 text-sm text-muted max-w-prose">
          A plan for each lesson, questions to discuss, and a worksheet to download and print. Answer keys are hidden until you open them.
        </p>
        {msg && <p className="px-5 pb-3 text-xs text-muted" role="status">{msg}</p>}
      </Box>

      {PLANS.map(p => (
        <Box key={p.lesson}>
          <BoxHeader title={p.lesson} meta={`${p.steps.reduce((s, [m]) => s + Number(m), 0)} minutes`} />
          <p className="px-5 text-sm text-muted max-w-prose"><span className="text-fg">Goal: </span>{p.goal}</p>
          <div className="p-5 grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
            <ol className="border border-line rounded-box divide-y divide-line">
              {p.steps.map(([m, a], i) => (
                <li key={i} className="px-3 py-2.5 flex gap-3 text-sm">
                  <span className="shrink-0 w-14 text-muted tabular-nums">{m} min</span>
                  <span className="text-fg leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted mb-1.5">Discuss</p>
                <ul className="space-y-1.5 text-fg">{p.discuss.map(d => <li key={d}>{d}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5">Homework or activity</p>
                <p className="text-fg leading-relaxed">{p.activity}</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => get(p, 'worksheet')} className={btn.secondary}>Download worksheet</button>
            {p.quiz && (
              <>
                <button onClick={() => get(p, 'answer key')} className={btn.quiet}>Download answer key</button>
                <button onClick={() => setShowKey(k => (k === p.lesson ? null : p.lesson))} className={btn.quiet} aria-expanded={showKey === p.lesson}>
                  {showKey === p.lesson ? 'Hide answers' : 'Show answers'}
                </button>
              </>
            )}
          </div>
          {p.quiz && showKey === p.lesson && (
            <ol className="mx-5 mb-5 border border-line rounded-box divide-y divide-line text-sm">
              {QUIZZES[p.quiz].questions.map((x, i) => (
                <li key={i} className="px-3 py-2">
                  <p className="text-fg">{i + 1}. {x.q}</p>
                  <p className="text-xs text-muted"><StatusDot tone="ok" className="text-ok">{x.options[x.answer]}</StatusDot> · {x.why}</p>
                </li>
              ))}
            </ol>
          )}
        </Box>
      ))}
    </div>
  );
};

export default TeacherGuide;
