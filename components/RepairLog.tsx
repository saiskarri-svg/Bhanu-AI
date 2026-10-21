import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, BoxHeader, StatusDot, btn, useFreshIds, SavedTick, fadeOutRow, SkeletonRows } from './ui';
import { useCap, saveFile } from './runtime';

// Repairs done by technicians: what was fixed, by whom, for which organisation.
// Shared through the page's `repairs` collection; this device only otherwise.

type Status = 'Fixed' | 'Needs follow-up';
interface Repair {
  id: string; date: string; part: string; work: string;
  tech: string; org: string; cost: number | null; status: Status; at: string;
}

const PARTS = ['Panels', 'Inverter', 'Wiring and connectors', 'Combiner box', 'Earthing and lightning arrester', 'Net meter', 'Mounting structure', 'Other'];
const LOCAL = 'N/A (local trained technician)';
const LOCAL_KEY = 'bhanu-repairs';
const readLocal = (): Repair[] => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const field = 'w-full h-10 px-3 rounded-ctl bg-surface-2 border border-line text-sm text-fg focus:outline-none focus:border-silver';

const blank = { date: today(), part: PARTS[1], work: '', tech: '', org: '', local: false, cost: '', status: 'Fixed' as Status };

const RepairLog: React.FC = () => {
  const [mode, setMode] = useState<'loading' | 'shared' | 'local'>('loading');
  const [rows, setRows] = useState<Repair[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | Status>('All');
  const [error, setError] = useState('');
  const dbRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const [db, user] = await Promise.all([useCap('db'), useCap('user')]);
      if (!alive) return;
      if (user && (await user.can('data.write')) === false) setCanWrite(false);
      if (!db) { setRows(readLocal()); setMode('local'); return; }
      dbRef.current = db;
      setMode('shared');
      unsub = db.collection('repairs').orderBy('date', 'desc').limit(300).onSnapshot(
        (snap: { docs: { id: string; data(): Record<string, unknown> }[] }) =>
          setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Repair, 'id'>) }))),
        () => { setRows(readLocal()); setMode('local'); },
      );
    })();
    return () => { alive = false; unsub?.(); };
  }, []);

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF(p => ({ ...p, [k]: v }));
  const valid = f.work.trim() && f.tech.trim() && (f.local || f.org.trim());

  const writeLocal = (next: Repair[]) => {
    setRows(next);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
  };

  const add = async () => {
    if (!valid) return;
    setError('');
    const r: Omit<Repair, 'id'> = {
      date: f.date || today(), part: f.part, work: f.work.trim(), tech: f.tech.trim(),
      org: f.local ? LOCAL : f.org.trim(), cost: f.cost ? Number(f.cost) : null, status: f.status, at: new Date().toISOString(),
    };
    const id = `r${Date.now().toString(36)}`;
    if (mode === 'shared') {
      try { await dbRef.current.collection('repairs').doc(id).set(r); }
      catch { setError('Could not save. You may only have view access to this page.'); return; }
    } else writeLocal([{ id, ...r }, ...rows].sort((a, b) => b.date.localeCompare(a.date)));
    setF({ ...blank, tech: f.tech, org: f.org, local: f.local });
    setOpen(false);
  };

  const toggle = async (r: Repair) => {
    const status: Status = r.status === 'Fixed' ? 'Needs follow-up' : 'Fixed';
    if (mode === 'shared') {
      try { await dbRef.current.collection('repairs').doc(r.id).update({ status }); } catch { setError('Could not update that repair.'); }
    } else writeLocal(rows.map(x => (x.id === r.id ? { ...x, status } : x)));
  };

  const shown = useMemo(() => rows.filter(r => filter === 'All' || r.status === filter), [rows, filter]);
  const followUps = rows.filter(r => r.status === 'Needs follow-up').length;
  const spent = rows.reduce((s, r) => s + (r.cost || 0), 0);

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Date', 'Part', 'Work done', 'Technician', 'Organisation', 'Cost (Rs)', 'Status'].join(',')]
      .concat(rows.map(r => [r.date, r.part, r.work, r.tech, r.org, r.cost ?? '', r.status].map(q).join(',')));
    saveFile('repair-log.csv', new Blob([lines.join('\n')], { type: 'text/csv' }));
  };

  const isFresh = useFreshIds(shown.map(r => r.id));
  return (
    <Box>
      <BoxHeader
        title="Repair log"
        meta={mode === 'shared' ? 'Shared with everyone who opens this page' : mode === 'local' ? 'Saved on this device only' : 'Loading'}
      />
      <p className="px-5 text-sm text-muted max-w-prose">
        Every repair a technician does on the system: what was fixed, who did it and which organisation they work for. Keep it for warranty claims and to spot parts that keep failing.
      </p>

      <div className="mt-4 mx-5 grid grid-cols-3 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[['Repairs logged', rows.length], ['Need follow-up', followUps], ['Spent on repairs', `₹${spent.toLocaleString('en-IN')}`]].map(([k, v]) => (
          <div key={k as string} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-1 font-display font-semibold text-xl tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="px-5 mt-4 flex flex-wrap items-center gap-2">
        {canWrite && mode !== 'loading' && (
          <button onClick={() => setOpen(o => !o)} className={btn.secondary}>{open ? 'Close' : 'Log a repair'}</button>
        )}
        <div className="flex gap-1 text-xs" role="group" aria-label="Show">
          {(['All', 'Needs follow-up', 'Fixed'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
              className={`h-8 px-3 rounded-ctl border ${filter === s ? 'border-silver text-fg bg-surface-2' : 'border-line text-muted hover:text-fg'}`}>{s}</button>
          ))}
        </div>
        {rows.length > 0 && <button onClick={exportCsv} className={`${btn.quiet} ml-auto`}>Download as spreadsheet (CSV)</button>}
      </div>

      {open && (
        <div className="mx-5 mt-4 p-4 rounded-box border border-line bg-surface-2 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted space-y-1">Date of repair
            <input type="date" value={f.date} max={today()} onChange={e => set('date', e.target.value)} className={field} />
          </label>
          <label className="text-xs text-muted space-y-1">Part repaired
            <select value={f.part} onChange={e => set('part', e.target.value)} className={field}>
              {PARTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted space-y-1 sm:col-span-2">What was done
            <textarea value={f.work} onChange={e => set('work', e.target.value)} rows={2} placeholder="For example: replaced a burnt MC4 connector on string 2 and retightened the rest"
              className={`${field} h-auto py-2 resize-y`} />
          </label>
          <label className="text-xs text-muted space-y-1">Technician's name
            <input value={f.tech} onChange={e => set('tech', e.target.value)} placeholder="Full name" className={field} />
          </label>
          <div className="text-xs text-muted space-y-1">
            <label htmlFor="repair-org">Organisation</label>
            <input id="repair-org" value={f.local ? LOCAL : f.org} disabled={f.local} onChange={e => set('org', e.target.value)}
              placeholder="Installer, DISCOM or company name" className={`${field} disabled:text-muted`} />
            <label className="flex items-center gap-2 pt-1 text-fg">
              <input type="checkbox" checked={f.local} onChange={e => set('local', e.target.checked)} className="accent-[var(--accent)]" />
              Local trained technician (no organisation)
            </label>
          </div>
          <label className="text-xs text-muted space-y-1">Cost in ₹, optional
            <input type="number" min={0} inputMode="numeric" value={f.cost} onChange={e => set('cost', e.target.value)} className={field} />
          </label>
          <label className="text-xs text-muted space-y-1">Status
            <select value={f.status} onChange={e => set('status', e.target.value as Status)} className={field}>
              <option>Fixed</option><option>Needs follow-up</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button onClick={add} disabled={!valid} className={`${btn.primary} shrink-0 whitespace-nowrap disabled:opacity-40`}>Save repair</button>
            {!valid && <span className="text-xs text-muted">Add what was done, the technician and their organisation.</span>}
          </div>
        </div>
      )}
      {error && <p className="px-5 mt-3 text-sm text-bad">{error}</p>}

      <ul className="mt-4 border-t border-line divide-y divide-line">
        {shown.map(r => (
          <li key={r.id} className={`px-5 py-3 flex items-start justify-between gap-4 ${isFresh(r.id) ? 'row-new' : ''}`}>
            <div className="min-w-0">
              <p className="text-xs text-muted">{isFresh(r.id) && <><SavedTick /> </>}
                <StatusDot tone={r.status === 'Fixed' ? 'ok' : 'warn'} className={r.status === 'Fixed' ? 'text-ok' : 'text-warn'}>{r.status}</StatusDot>
                <span> · {fmt(r.date)} · {r.part}{r.cost ? ` · ₹${r.cost.toLocaleString('en-IN')}` : ''}</span>
              </p>
              <p className="mt-0.5 text-sm text-fg">{r.work}</p>
              <p className="text-xs text-muted">By {r.tech} · {r.org}</p>
            </div>
            {canWrite && (
              <button onClick={() => toggle(r)} className={`${btn.quiet} shrink-0`}>
                {r.status === 'Fixed' ? 'Reopen' : 'Mark fixed'}
              </button>
            )}
          </li>
        ))}
        {mode === 'loading' && <li className="px-5 py-5"><SkeletonRows /></li>}
        {mode !== 'loading' && shown.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            {rows.length ? 'No repairs with this status.' : 'No repairs logged yet. Press "Log a repair" after a technician visit.'}
          </li>
        )}
      </ul>
    </Box>
  );
};

export default RepairLog;
