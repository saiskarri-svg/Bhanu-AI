import React, { useState } from 'react';
import { Box, BoxHeader, StatusDot, btn } from './ui';
import { notifyProgress } from './runtime';

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

const readBest = (key: string) => {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
};

const Quiz: React.FC<{ id: string; title: string; questions: QuizQuestion[] }> = ({ id, title, questions }) => {
  const storeKey = `bhanu-quiz-${id}`;
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);
  const [best, setBest] = useState(() => readBest(storeKey));

  const score = answers.filter((a, i) => a === questions[i].answer).length;
  const allAnswered = answers.every(a => a !== null);

  const check = () => {
    setChecked(true);
    if (score > best) {
      setBest(score);
      try { localStorage.setItem(storeKey, String(score)); } catch { /* storage may be blocked */ }
      notifyProgress();
    }
  };

  const reset = () => {
    setAnswers(questions.map(() => null));
    setChecked(false);
  };

  return (
    <Box>
      <BoxHeader title={title} meta={best ? `Best score ${best} of ${questions.length}` : `${questions.length} questions`} />
      <ol className="mt-2 border-t border-line divide-y divide-line">
        {questions.map((item, qi) => {
          const chosen = answers[qi];
          const right = chosen === item.answer;
          return (
            <li key={qi} className="px-5 py-4">
              <fieldset>
                <legend className="text-sm font-semibold text-fg">
                  <span className="text-muted tabular-nums mr-2">{qi + 1}.</span>{item.q}
                </legend>
                <div className="mt-2.5 grid gap-1.5">
                  {item.options.map((opt, oi) => {
                    const selected = chosen === oi;
                    const showRight = checked && oi === item.answer;
                    const showWrong = checked && selected && !right;
                    return (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 rounded-ctl border px-3 py-2 text-sm transition-colors ${
                          showRight ? 'border-ok text-fg' : showWrong ? 'border-bad text-fg' : selected ? 'border-silver bg-surface-2 text-fg' : 'border-line text-muted hover:bg-surface-2'
                        } ${checked ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <input
                          type="radio"
                          name={`${id}-q${qi}`}
                          id={`${id}-q${qi}-${oi}`}
                          className="sr-only"
                          checked={selected}
                          disabled={checked}
                          onChange={() => setAnswers(a => a.map((v, i) => (i === qi ? oi : v)))}
                        />
                        <span
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 shrink-0 rounded-full border ${selected ? 'border-silver bg-silver shadow-[inset_0_0_0_2.5px_var(--surface-2)]' : 'border-muted'}`}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                {checked && (
                  <p className="mt-2 text-xs text-muted">
                    <StatusDot tone={right ? 'ok' : 'bad'} className={right ? 'text-ok' : 'text-bad'}>{right ? 'Correct' : 'Not quite'}</StatusDot>
                    <span> · {item.why}</span>
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className="px-5 py-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {checked
            ? score === questions.length
              ? `${score} of ${questions.length}. Well done.`
              : `${score} of ${questions.length}. Read the notes above and try again.`
            : allAnswered ? 'Ready to check.' : `${answers.filter(a => a !== null).length} of ${questions.length} answered`}
        </p>
        {checked ? (
          <button onClick={reset} className={btn.secondary}>Try again</button>
        ) : (
          <button onClick={check} disabled={!allAnswered} className={btn.primary}>Check answers</button>
        )}
      </div>
    </Box>
  );
};

export default Quiz;

export const QUIZZES: Record<string, { title: string; questions: QuizQuestion[] }> = {
  how: {
    title: 'Check: how solar works',
    questions: [
      { q: 'What kind of electricity do solar panels make?', options: ['DC, direct current', 'AC, alternating current', 'Both at once'], answer: 0, why: 'Panels make DC. The inverter turns it into AC for the school.' },
      { q: 'What does the inverter do?', options: ['Stores energy for the night', 'Turns DC into AC', 'Measures dust on the panels'], answer: 1, why: 'It changes DC into 230 V AC that matches the grid.' },
      { q: '10 panels of 41.6 V each are wired in series. What is the voltage?', options: ['41.6 V', '416 V', '4,160 V'], answer: 1, why: 'In series the voltages add up: 10 × 41.6 = 416 V.' },
      { q: 'Why do solar systems use high voltage and low current?', options: ['Less energy is lost as heat in the cables', 'The panels last longer', 'It makes cleaning easier'], answer: 0, why: 'Cable heat is current × current × resistance, so lower current wastes much less.' },
      { q: 'When panels get hotter, their voltage…', options: ['goes up', 'goes down', 'stays the same'], answer: 1, why: 'About 0.3% less voltage for every degree above 25 °C.' },
    ],
  },
  parts: {
    title: 'Check: components',
    questions: [
      { q: 'Which part counts units sent to and bought from the grid?', options: ['Inverter', 'Net meter', 'Combiner box'], answer: 1, why: 'The two-way net meter is fitted by the DISCOM.' },
      { q: 'Where does the lightning arrester send a lightning strike?', options: ['Into the earth pit', 'Into the inverter', 'Into the water tank'], answer: 0, why: 'The down conductor carries it safely into the earth pit.' },
      { q: 'Which part is optional in a grid-tied school system?', options: ['Earthing', 'Inverter', 'Battery bank'], answer: 2, why: 'With net metering the grid acts like a battery, so many schools skip one.' },
      { q: 'What are MC4 connectors for?', options: ['Joining panel cables', 'Measuring dust', 'Switching the fans'], answer: 0, why: 'They snap DC cables together with a watertight lock.' },
    ],
  },
  size: {
    title: 'Check: sizing',
    questions: [
      { q: 'A school uses 20 kWh a day for 230 school days. How much a year?', options: ['460 kWh', '4,600 kWh', '46,000 kWh'], answer: 1, why: '20 × 230 = 4,600 kWh.' },
      { q: 'Each kWp makes 1,500 kWh a year. What size covers 4,500 kWh?', options: ['1.5 kWp', '3 kWp', '4.5 kWp'], answer: 1, why: '4,500 ÷ 1,500 = 3 kWp.' },
      { q: 'At about 10 m² per kWp, how much roof does 5 kWp need?', options: ['5 m²', '50 m²', '500 m²'], answer: 1, why: '5 × 10 = 50 m² of shadow free roof.' },
      { q: 'What is the cheapest way to need a smaller system?', options: ['Use efficient appliances like BLDC fans', 'Run the pump at night', 'Add more lights'], answer: 0, why: 'Every unit you do not use is a unit you do not need to make.' },
    ],
  },
  sim: {
    title: 'Check: what changes output',
    questions: [
      { q: 'Around what time do panels usually make the most power?', options: ['8 am', 'Around noon', '5 pm'], answer: 1, why: 'The sun is highest at noon, so its light passes through the least air.' },
      { q: 'How does wind help a solar system?', options: ['It cools the panels', 'It turns the panels to face the sun', 'It charges the battery'], answer: 0, why: 'Cooler panels have higher voltage, so they make more power.' },
      { q: 'How do monsoon clouds cut output?', options: ['They make the panels wet', 'They block sunlight', 'They cool the inverter'], answer: 1, why: 'Thick cloud can block three quarters of the sunlight.' },
      { q: 'Panels left uncleaned for 60 days lose about…', options: ['2%', '15 to 25%', '90%'], answer: 1, why: 'In dry weather dust can take 0.3 to 0.6% a day. Regular cleaning pays off.' },
    ],
  },
  safety: {
    title: 'Check: safety',
    questions: [
      { q: 'The inverter is switched off. Are the panels safe to touch?', options: ['Yes, everything is off', 'No, panels make voltage whenever there is light', 'Only at night they are live'], answer: 1, why: 'Panels produce DC voltage in any daylight, even with the inverter off.' },
      { q: 'A technician is shutting the system down. What comes first?', options: ['Unplug the MC4 connectors', 'Switch off the AC breaker', 'Spray the panels with water'], answer: 1, why: 'AC side first, then the inverter, then the DC isolator. Pulling connectors under load can cause an arc.' },
      { q: 'When is the best time to clean the panels?', options: ['Early morning or evening', 'At noon, when they are brightest', 'During a thunderstorm'], answer: 0, why: 'Panels are cool and making little power. Cold water on hot glass can crack it.' },
      { q: 'What should be used on an electrical fire?', options: ['A bucket of water', 'A CO₂ or dry powder extinguisher', 'A wet cloth'], answer: 1, why: 'Water conducts electricity. Use CO₂ or dry powder, and call 101.' },
      { q: 'You smell burning near the inverter. What do you do?', options: ['Open the cover to look', 'Keep away and tell a teacher straight away', 'Switch it off and on again'], answer: 1, why: 'Move away, keep others away and let the teacher call the technician.' },
    ],
  },
};
