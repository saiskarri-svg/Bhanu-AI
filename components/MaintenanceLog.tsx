import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, BoxHeader, StatusDot, TINT, btn, useFreshIds, SavedTick, fadeOutRow } from './ui';
import { useCap, setLastClean, downloadCsv } from './runtime';

interface Task { id: string; title: string; every: number; who: 'Students with a teacher' | 'Teacher' | 'Technician'; tint: string }
interface Entry { id: string; task: string; at: string; by: string | null; note: string }

const TASKS: Task[] = [
  { id: 'inverter', title: 'Check the inverter display shows no fault', every: 1, who: 'Students with a teacher', tint: TINT.sky },
  { id: 'look', title: 'Look at the panels from the ground for dust, droppings or shade', every: 7, who: 'Students with a teacher', tint: TINT.sun },
  { id: 'clean', title: 'Clean the panels with plain water and a soft brush, early morning', every: 30, who: 'Students with a teacher', tint: TINT.sun },
  { id: 'meter', title: 'Write down both net meter readings', every: 30, who: 'Students with a teacher', tint: TINT.sky },
  { id: 'extinguisher', title: 'Check the fire extinguisher gauge is in the green', every: 30, who: 'Teacher', tint: TINT.leaf },
  { id: 'cables', title: 'Inspect cables, MC4 connectors and the combiner box', every: 90, who: 'Technician', tint: TINT.violet },
  { id: 'earth', title: 'Test the earth pit and lightning arrester', every: 365, who: 'Technician', tint: TINT.violet },
  { id: 'service', title: 'Service the inverter and AC board', every: 365, who: 'Technician', tint: TINT.violet },
];

const LOCAL_KEY = 'bhanu-log';
const DAY = 86400000;
const readLocal = (): Entry[] => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

const MaintenanceLog: React.FC = () => {
  const [mode, setMode] = useState<'loading' | 'shared' | 'local'>('loading');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const dbRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const userRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Connect once: shared log when the page runs on claude.ai, this device otherwise
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const [db, user] = await Promise.all([useCap('db'), useCap('user')]);
      if (!alive) return;
      userRef.current = user;
      if (user) {
        setMyId(await user.id());
        const w = await user.can('data.write');
        if (w === false) setCanWrite(false);
      }
      if (!db) { setEntries(readLocal()); setMode('local'); return; }
      dbRef.current = db;
      setMode('shared');
      unsub = db.collection('log').orderBy('at', 'desc').limit(300).onSnapshot(
        (snap: { docs: { id: string; data(): Record<string, unknown> }[] }) => {
          setEntries(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Entry, 'id'>) })));
        },
        () => { setEntries(readLocal()); setMode('local'); },
      );
    })();
    return () => { alive = false; unsub?.(); };
  }, []);

  // Resolve names for the people in the log, every time it changes
  useEffect(() => {
    const user = userRef.current;
    const ids = [...new Set(entries.map(e => e.by).filter(Boolean))] as string[];
    if (!user || !ids.length) return;
    user.profiles(ids).then((ps: Record<string, { name: string; isMe: boolean }>) => {
      const m: Record<string, string> = {};
      for (const id of ids) m[id] = ps[id]?.isMe ? 'You' : ps[id]?.name || 'Someone';
      setNames(m);
    });
  }, [entries]);

  const last = useMemo(() => {
    const m: Record<string, Entry> = {};
    for (const e of entries) if (!m[e.task] || e.at > m[e.task].at) m[e.task] = e;
    return m;
  }, [entries]);

  // Tell the cleaning planner when the panels were last cleaned
  useEffect(() => { setLastClean(last.clean?.at ?? null); }, [last]);

  const save = async (task: string) => {
    setError('');
    const entry = { task, at: new Date().toISOString(), by: myId, note: note.trim().slice(0, 280) };
    if (mode === 'shared' && dbRef.current) {
      try {
        await dbRef.current.collection('log').add(entry);
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === 'invalid_argument') { setCanWrite(false); setError('You can view this log but not add to it.'); }
        else if (code === 'quota_exceeded') setError('The log is full. Ask the owner to clear old entries.');
        else setError('Could not save. Check your connection and try again.');
        return;
      }
    } else {
      const next = [{ id: `l${Date.now()}`, ...entry }, ...readLocal()].slice(0, 300);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
      setEntries(next);
    }
    setEditing(null);
    setNote('');
  };

  const who = (e: Entry) => (e.by ? names[e.by] || 'Someone' : mode === 'local' ? 'You' : 'Someone');
  const overdueCount = TASKS.filter(t => { const l = last[t.id]; return !l || Date.now() - new Date(l.at).getTime() > t.every * DAY; }).length;

  const isFresh = useFreshIds(entries.map(e => e.id));
  return (
    <Box>
      <BoxHeader
        title="Maintenance log"
        meta={mode === 'shared' ? 'Shared with everyone who opens this page' : mode === 'local' ? 'Saved on this device only' : 'Loading'}
      />
      <p className="px-5 text-sm text-muted max-w-prose">
        Tick off each check when it is done. {overdueCount ? `${overdueCount} of ${TASKS.length} checks are due or never done.` : 'Everything is up to date.'}
        {!canWrite && ' You can view this log. Ask the owner for Contributor access to add entries.'}
      </p>
      {error && <p className="px-5 pt-2 text-sm"><StatusDot tone="bad" className="text-bad">{error}</StatusDot></p>}

      <ul className="mt-3 border-t border-line divide-y divide-line">
        {TASKS.map(t => {
          const l = last[t.id];
          const age = l ? (Date.now() - new Date(l.at).getTime()) / DAY : Infinity;
          const left = Math.ceil(t.every - age);
          const tone = !l ? 'info' : left < 0 ? 'bad' : left <= Math.max(1, t.every * 0.2) ? 'warn' : 'ok';
          const status = !l ? 'Not done yet' : left < 0 ? `Overdue by ${-left} day${-left > 1 ? 's' : ''}` : left === 0 ? 'Due today' : `Due in ${left} day${left > 1 ? 's' : ''}`;
          const freq = t.every === 1 ? 'Daily' : t.every === 7 ? 'Weekly' : t.every === 30 ? 'Monthly' : t.every === 90 ? 'Every 3 months' : 'Yearly';
          return (
            <li key={t.id} className="px-5 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="hidden sm:block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.tint }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{freq} · {t.who}</p>
                  <p className="text-sm font-medium text-fg">{t.title}</p>
                  <p className="text-xs text-muted">
                    <StatusDot tone={tone as 'ok' | 'warn' | 'bad' | 'info'} className={tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-info'}>{status}</StatusDot>
                    {l && <span> · last done {ago(l.at)} by {who(l)}</span>}
                  </p>
                </div>
                {canWrite && mode !== 'loading' && editing !== t.id && (
                  <button onClick={() => { setEditing(t.id); setNote(''); }} className={`${btn.secondary} shrink-0 self-start sm:self-auto`}>Mark done</button>
                )}
              </div>
              {editing === t.id && (
                <form className="mt-2 sm:pl-5 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); save(t.id); }}>
                  <input
                    id={`note-${t.id}`}
                    autoFocus
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Note, optional: what did you see?"
                    className="flex-1 min-w-[200px] h-9 bg-bg border border-line rounded-ctl px-3 text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-silver"
                  />
                  <button type="submit" className={btn.secondary}>Save</button>
                  <button type="button" onClick={() => setEditing(null)} className={btn.quiet}>Cancel</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs text-muted">Recent activity</p>
          {entries.length > 0 && (
            <button
              onClick={() => downloadCsv('maintenance-log.csv', ['Date', 'Time', 'Check', 'Who should do it', 'Logged by', 'Note'],
                entries.map(e => {
                  const d = new Date(e.at);
                  const t = TASKS.find(x => x.id === e.task);
                  return [d.toLocaleDateString('en-IN'), d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), t?.title ?? e.task, t?.who ?? '', who(e), e.note];
                }))}
              className={btn.quiet}
            >
              Download as spreadsheet (CSV)
            </button>
          )}
        </div>
        {entries.length ? (
          <ul className="space-y-1.5 text-sm">
            {entries.slice(0, 8).map(e => (
              <li key={e.id} className={`text-muted rounded-ctl -mx-1.5 px-1.5 ${isFresh(e.id) ? 'row-new' : ''}`}>
                <span className="text-fg">{who(e)}</span> · {TASKS.find(t => t.id === e.task)?.title ?? e.task} · {ago(e.at)}{isFresh(e.id) && <> <SavedTick /></>}
                {e.note && <span className="block text-xs pl-0.5">“{e.note}”</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing logged yet. Press "Mark done" after the first check.</p>
        )}
      </div>
    </Box>
  );
};

export default MaintenanceLog;
