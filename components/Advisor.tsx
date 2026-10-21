import React, { useEffect, useRef, useState } from 'react';
import { Box, BoxHeader, StatusDot, btn } from './ui';
import { PAGE_URL } from './runtime';
import { getSample, sampleErrorText, saveFile, SampleFn } from './runtime';

// ---------- Shared ----------

const LANGS = [
  { key: 'English', label: 'English' },
  { key: 'Telugu', label: 'తెలుగు' },
  { key: 'Hindi', label: 'हिन्दी' },
];

// Every answer must be honest about its evidence and safe (idea 16)
const RULES = `You are the Bhanu AI solar advisor for a rural school in India. Teachers, students and the school's caretaker read your answers.
Rules:
- Use only the school data below and general solar knowledge. If the data does not show something, say so plainly. Never invent readings.
- Safety first: students and teachers never open boxes, touch wiring or climb roofs alone. Anything electrical is for a licensed technician. Panels are live whenever there is daylight.
- A grid tied system without a battery switches off during a power cut.
- Write short, plain sentences a class 8 student understands. Use short bullet points when listing steps. No tables.
- End every answer with exactly two lines:
Based on: <the data you used, in a few words>
Confidence: <high, medium or low>`;

function useSampleFn() {
  const [fn, setFn] = useState<SampleFn | null | undefined>(undefined);
  useEffect(() => { let on = true; getSample().then(s => { if (on) setFn(s); }); return () => { on = false; }; }, []);
  return fn; // undefined while loading, null when this view cannot ask Claude
}

/** Splits off the "Based on" and "Confidence" lines and renders the rest with light formatting. */
const Answer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.replace(/\r/g, '').split('\n');
  const based = lines.find(l => /^\s*\**based on:?\**/i.test(l));
  const conf = lines.find(l => /^\s*\**confidence:?\**/i.test(l));
  const body = lines.filter(l => l !== based && l !== conf);
  const strip = (l?: string) => (l ?? '').replace(/^\s*\**[^:]+:\**\s*/, '').trim();
  const level = strip(conf).toLowerCase();
  const tone = level.startsWith('high') ? 'ok' : level.startsWith('low') ? 'bad' : 'warn';

  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>,
    );

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`u${blocks.length}`} className="list-disc pl-5 space-y-1">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of body) {
    const l = raw.trim();
    if (/^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l)) { list.push(l.replace(/^([-*•]|\d+[.)])\s+/, '')); continue; }
    flush();
    if (!l) continue;
    if (/^#{1,4}\s+/.test(l)) blocks.push(<p key={`h${blocks.length}`} className="font-semibold text-fg">{inline(l.replace(/^#+\s+/, ''))}</p>);
    else blocks.push(<p key={`p${blocks.length}`}>{inline(l)}</p>);
  }
  flush();

  return (
    <div className="space-y-2 text-sm text-fg leading-relaxed">
      {blocks}
      {(based || conf) && (
        <p className="pt-1 text-xs text-muted">
          {conf && <StatusDot tone={tone as 'ok' | 'warn' | 'bad'} className="mr-2">Confidence: {strip(conf)}</StatusDot>}
          {based && <span>Based on: {strip(based)}</span>}
        </p>
      )}
    </div>
  );
};

// Each card's placeholder when AI answers are off; the full explanation is
// said once, by AdvisorNotice at the top of the tab.
const Unavailable: React.FC = () => (
  <p className="text-sm text-muted">Available on the claude.ai page.</p>
);

// One notice for the whole tab when the page is opened outside claude.ai
export const AdvisorNotice: React.FC = () => {
  const sample = useSampleFn();
  if (sample !== null) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-box border border-line bg-surface px-5 py-4">
      <div className="max-w-prose">
        <p className="text-sm text-fg font-medium">AI answers need the claude.ai page</p>
        <p className="mt-1 text-sm text-muted">This copy of the site works offline, so it cannot ask the AI. Open the same page on claude.ai to ask questions, diagnose faults, write the weekly report and build lessons.</p>
      </div>
      <a href={PAGE_URL} target="_blank" rel="noopener noreferrer" className={btn.secondary}>Open in claude.ai</a>
    </div>
  );
};

const LangPicker: React.FC<{ id: string; value: string; onChange: (v: string) => void }> = ({ id, value, onChange }) => (
  <div className="flex items-center gap-2">
    <label htmlFor={id} className="text-xs text-muted">Answer in</label>
    <select id={id} value={value} onChange={e => onChange(e.target.value)} className="h-8 bg-bg border border-line rounded-ctl px-2 text-sm text-fg focus:outline-none focus:border-silver">
      {LANGS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
    </select>
  </div>
);

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** One-shot generator used by the report, diagnosis and lesson tools. */
function useGenerate(sample: SampleFn | null | undefined) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ctl = useRef<AbortController | null>(null);
  const run = async (prompt: string, options: Record<string, unknown> = {}) => {
    if (!sample) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(true); setError(''); setText('');
    try {
      const r = await sample(prompt, { ...options, signal: c.signal, onText: ({ text }: { text: string }) => setText(text) });
      setText(r.text);
    } catch (e: unknown) {
      const err = e as { code?: string; text?: string };
      if (err.code !== 'cancelled') setError(sampleErrorText(err.code));
      setText(err.code === 'refused' ? '' : err.text ?? '');
    } finally {
      setBusy(false);
    }
  };
  return { text, busy, error, run, stop: () => ctl.current?.abort() };
}

// ---------- 12. Ask the advisor ----------

interface Turn { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Why was output low on the worst day this week?',
  'Should we clean the panels this week?',
  'Explain MPPT for a class 8 student.',
  'What should the technician check first?',
];

export const AskAdvisor: React.FC<{ context: string }> = ({ context }) => {
  const sample = useSampleFn();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('English');
  const ctl = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [turns, live]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || !sample || busy) return;
    const history = [...turns, { role: 'user' as const, content: question }].slice(-10);
    setTurns(history);
    setDraft(''); setError(''); setLive(''); setBusy(true);
    const c = new AbortController();
    ctl.current = c;
    const intro = `${RULES}\nAnswer in ${lang}. Keep technical words like kW, kWh, DC and AC as they are.\n\nSchool data:\n${context}\n\nThe next message is the first question.`;
    try {
      const r = await sample([{ role: 'user', content: intro }, ...history], {
        cache: false,
        signal: c.signal,
        onText: ({ text }: { text: string }) => setLive(text),
      });
      setTurns(t => [...t, { role: 'assistant', content: r.text }]);
    } catch (e: unknown) {
      const err = e as { code?: string; text?: string };
      if (err.text && err.code !== 'refused') setTurns(t => [...t, { role: 'assistant', content: err.text + '\n\n(Answer interrupted.)' }]);
      if (err.code !== 'cancelled') setError(sampleErrorText(err.code));
    } finally {
      setLive(''); setBusy(false);
    }
  };

  return (
    <Box>
      <BoxHeader title="Ask the advisor" meta="Uses this school's own data" />
      <p className="px-5 text-sm text-muted max-w-prose">
        Ask anything about this school's system: why output changed, what to do next, or how something works. Answers show what data they used and how sure the advisor is.
      </p>

      {sample === null ? (
        <div className="p-5"><Unavailable /></div>
      ) : (
        <>
          <div className="px-5 pt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)} disabled={busy || !sample} className="h-8 px-3 rounded-ctl border border-line text-sm text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>

          <div className="mx-5 mt-4 border border-line rounded-box bg-bg/40 max-h-[460px] overflow-y-auto" aria-live="polite">
            {turns.length === 0 && !busy ? (
              <p className="px-4 py-10 text-center text-sm text-muted">No questions yet. Pick one above or type your own.</p>
            ) : (
              <ul className="divide-y divide-line">
                {turns.map((t, i) => (
                  <li key={i} className={`px-4 py-3 ${t.role === 'user' ? 'bg-surface-2' : ''}`}>
                    <p className="text-xs text-muted mb-1">{t.role === 'user' ? 'You asked' : 'Advisor'}</p>
                    {t.role === 'user' ? <p className="text-sm text-fg whitespace-pre-wrap">{t.content}</p> : <Answer text={t.content} />}
                  </li>
                ))}
                {busy && (
                  <li className="px-4 py-3">
                    <p className="text-xs text-muted mb-1">Advisor</p>
                    {live ? <Answer text={live} /> : <p className="text-sm text-muted inline-flex items-center gap-2"><Spinner /> Thinking…</p>}
                  </li>
                )}
              </ul>
            )}
            <div ref={endRef} />
          </div>

          {error && <p className="px-5 pt-2 text-sm"><StatusDot tone="bad" className="text-bad">{error}</StatusDot></p>}

          <form className="p-5 flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); ask(draft); }}>
            <label htmlFor="advisor-q" className="sr-only">Your question</label>
            <textarea
              id="advisor-q"
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
              placeholder="Type a question, for example: how much did dust cost us this month?"
              className="flex-1 min-h-[44px] bg-bg border border-line rounded-ctl px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-silver resize-y"
            />
            <div className="flex sm:flex-col gap-2 sm:w-36">
              {busy
                ? <button type="button" onClick={() => ctl.current?.abort()} className={`${btn.secondary} flex-1`}>Stop</button>
                : <button type="submit" disabled={!draft.trim() || !sample} className={`${btn.primary} flex-1`}>Ask</button>}
              <LangPicker id="advisor-lang" value={lang} onChange={setLang} />
            </div>
          </form>
          <div className="px-5 pb-4 -mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>Answers use your own Claude account. The first question asks for your permission.</span>
            {turns.length > 0 && !busy && <button onClick={() => { setTurns([]); setError(''); }} className={btn.quiet}>Clear chat</button>}
          </div>
        </>
      )}
    </Box>
  );
};

// ---------- 13. Weekly report ----------

export const WeeklyReport: React.FC<{ context: string; school: string }> = ({ context, school }) => {
  const sample = useSampleFn();
  const g = useGenerate(sample);
  const [lang, setLang] = useState('English');
  const [msg, setMsg] = useState('');
  const week = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `${RULES}\nAnswer in ${lang}.\n\nWrite this week's report for ${school}, for the principal. Use these headings, in this order:\n## This week in numbers\n## What went well\n## Problems to fix\n## Three actions for next week\nUnder actions, say who should do each one: students with a teacher, the teacher, or the technician.\nKeep it under 250 words.\n\nSchool data:\n${context}`;

  return (
    <Box>
      <BoxHeader title="Weekly report" meta={`Week of ${week}`} />
      <p className="px-5 text-sm text-muted max-w-prose">A short summary for the principal, written from the last seven days of data, with three actions and who should do them.</p>
      {sample === null ? <div className="p-5"><Unavailable /></div> : (
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {g.busy
              ? <button onClick={g.stop} className={btn.secondary}>Stop</button>
              : <button onClick={() => g.run(prompt, { cache: false })} disabled={!sample} className={btn.secondary}>{g.text ? 'Write it again' : 'Write this week\'s report'}</button>}
            <LangPicker id="report-lang" value={lang} onChange={setLang} />
            {g.text && !g.busy && (
              <button
                onClick={async () => setMsg((await saveFile(`${school} weekly report ${new Date().toISOString().slice(0, 10)}.md`, g.text)) ? 'Report saved.' : 'The download was not saved.')}
                className={btn.quiet}
              >
                Download report
              </button>
            )}
            {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
          </div>
          {g.error && <p className="text-sm"><StatusDot tone="bad" className="text-bad">{g.error}</StatusDot></p>}
          {(g.busy || g.text) && (
            <div className="border border-line rounded-box p-4 bg-bg/40" aria-live="polite">
              {g.text ? <Answer text={g.text} /> : <p className="text-sm text-muted inline-flex items-center gap-2"><Spinner /> Writing the report…</p>}
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

// ---------- 14. Diagnose a problem ----------

export const Diagnose: React.FC<{ context: string }> = ({ context }) => {
  const sample = useSampleFn();
  const g = useGenerate(sample);
  const [symptom, setSymptom] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [canPhoto, setCanPhoto] = useState(false);
  const [types, setTypes] = useState('image/jpeg,image/png,image/webp');
  const [lang, setLang] = useState('English');

  useEffect(() => {
    if (!sample?.limits) return;
    sample.limits().then(l => {
      if (l?.images) { setCanPhoto(true); setTypes(l.images.mediaTypes.join(',')); }
    }).catch(() => setCanPhoto(false));
  }, [sample]);

  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const run = () => {
    const prompt = `${RULES}\nAnswer in ${lang}.\n\nSomeone at the school reports a problem${photo ? ' and attached a photo of it' : ''}. Give:\n## Most likely cause\n## How urgent\n(one of: Act now, This week, Can wait, with one sentence why)\n## Who should act\n(students with a teacher, the teacher, or a licensed technician)\n## Safe next steps\nIf anything could be dangerous, start with: Keep everyone away and call the technician.\n\nThe problem: ${symptom.trim()}\n\nSchool data:\n${context}`;
    g.run(prompt, { cache: false, ...(photo ? { images: [photo] } : {}) });
  };

  return (
    <Box>
      <BoxHeader title="Diagnose a problem" meta="Describe it, add a photo" />
      <p className="px-5 text-sm text-muted max-w-prose">
        Describe what you see, such as a fault code on the inverter or a brown mark on a panel. The advisor says the likely cause, how urgent it is and who should act. Never touch anything to take a photo.
      </p>
      {sample === null ? <div className="p-5"><Unavailable /></div> : (
        <div className="p-5 space-y-4">
          <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-4">
            <div>
              <label htmlFor="diag-text" className="block text-xs text-muted mb-1">What do you see?</label>
              <textarea
                id="diag-text"
                rows={3}
                value={symptom}
                onChange={e => setSymptom(e.target.value)}
                placeholder="For example: the inverter screen shows E023 and a red light since this morning."
                className="w-full bg-bg border border-line rounded-ctl px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-silver resize-y"
              />
            </div>
            {canPhoto && (
              <div>
                <p className="text-xs text-muted mb-1">Photo, optional</p>
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="The photo you added" className="w-full h-[88px] object-cover rounded-ctl border border-line" />
                    <button onClick={() => setPhoto(null)} className="absolute top-1 right-1 h-7 px-2 rounded-ctl bg-[rgba(11,11,13,0.8)] text-xs text-fg">Remove</button>
                  </div>
                ) : (
                  <label htmlFor="diag-photo" className="flex h-[88px] items-center justify-center rounded-ctl border border-dashed border-line text-sm text-muted hover:bg-surface-2 cursor-pointer">
                    Add a photo
                  </label>
                )}
                <input id="diag-photo" type="file" accept={types} className="sr-only" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {g.busy
              ? <button onClick={g.stop} className={btn.secondary}>Stop</button>
              : <button onClick={run} disabled={!symptom.trim() || !sample} className={btn.secondary}>Diagnose</button>}
            <LangPicker id="diag-lang" value={lang} onChange={setLang} />
          </div>
          {g.error && <p className="text-sm"><StatusDot tone="bad" className="text-bad">{g.error}</StatusDot></p>}
          {(g.busy || g.text) && (
            <div className="border border-line rounded-box p-4 bg-bg/40" aria-live="polite">
              {g.text ? <Answer text={g.text} /> : <p className="text-sm text-muted inline-flex items-center gap-2"><Spinner /> Looking into it…</p>}
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

// ---------- 15. Lesson builder ----------

export const LessonBuilder: React.FC<{ context: string }> = ({ context }) => {
  const sample = useSampleFn();
  const g = useGenerate(sample);
  const [grade, setGrade] = useState('8');
  const [minutes, setMinutes] = useState('40');
  const [topic, setTopic] = useState('Why our solar output changed this week');
  const [lang, setLang] = useState('English');
  const [msg, setMsg] = useState('');

  const run = () => {
    const prompt = `${RULES}\nAnswer in ${lang}.\n\nWrite a ${minutes} minute lesson plan for class ${grade} on: "${topic.trim()}".\nUse this school's real numbers from the data below as examples. Use these headings:\n## Goal\n## Timing\n(each step with its minutes, adding up to ${minutes})\n## Questions to ask\n## Activity\n## Safety note\nKeep it under 300 words.\n\nSchool data:\n${context}`;
    g.run(prompt, { cache: false });
  };

  return (
    <Box>
      <BoxHeader title="Lesson builder" meta="For teachers" />
      <p className="px-5 text-sm text-muted max-w-prose">Make a fresh lesson using this week's real numbers from the school's own system.</p>
      {sample === null ? <div className="p-5"><Unavailable /></div> : (
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-[100px_100px_minmax(0,1fr)] gap-3">
            <div>
              <label htmlFor="lesson-grade" className="block text-xs text-muted mb-1">Class</label>
              <select id="lesson-grade" value={grade} onChange={e => setGrade(e.target.value)} className="w-full h-9 bg-bg border border-line rounded-ctl px-2 text-sm text-fg focus:outline-none focus:border-silver">
                {['6', '7', '8', '9', '10', '11', '12'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lesson-min" className="block text-xs text-muted mb-1">Minutes</label>
              <select id="lesson-min" value={minutes} onChange={e => setMinutes(e.target.value)} className="w-full h-9 bg-bg border border-line rounded-ctl px-2 text-sm text-fg focus:outline-none focus:border-silver">
                {['20', '40', '60'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lesson-topic" className="block text-xs text-muted mb-1">Topic</label>
              <input id="lesson-topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full h-9 bg-bg border border-line rounded-ctl px-3 text-sm text-fg focus:outline-none focus:border-silver" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {g.busy
              ? <button onClick={g.stop} className={btn.secondary}>Stop</button>
              : <button onClick={run} disabled={!topic.trim() || !sample} className={btn.secondary}>Make the lesson</button>}
            <LangPicker id="lesson-lang" value={lang} onChange={setLang} />
            {g.text && !g.busy && (
              <button onClick={async () => setMsg((await saveFile(`Class ${grade} lesson - ${topic.trim().slice(0, 40)}.md`, g.text)) ? 'Lesson saved.' : 'The download was not saved.')} className={btn.quiet}>
                Download lesson
              </button>
            )}
            {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
          </div>
          {g.error && <p className="text-sm"><StatusDot tone="bad" className="text-bad">{g.error}</StatusDot></p>}
          {(g.busy || g.text) && (
            <div className="border border-line rounded-box p-4 bg-bg/40" aria-live="polite">
              {g.text ? <Answer text={g.text} /> : <p className="text-sm text-muted inline-flex items-center gap-2"><Spinner /> Writing the lesson…</p>}
            </div>
          )}
        </div>
      )}
    </Box>
  );
};
