import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SystemConfig, SensorLog } from '../types';
import { SEASONAL_YIELDS } from '../constants';
import { Box, BoxHeader, StatusDot, btn } from './ui';
import { useCap, downloadCsv } from './runtime';
import { Cite } from './Sources';

// Real readings: the energy the school's inverter made each day. Students type
// in the "today" figure from the inverter display, or anyone uploads a CSV
// exported from the inverter's monitoring portal (any brand). Saved in the
// page's shared `readings` collection (one document per date).

export interface Reading { date: string; kwh: number; source: 'display' | 'import' }

const LOCAL_KEY = 'bhanu-readings';
const readLocal = (): Reading[] => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Readings shared through the page, newest first. */
export function useReadings() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [mode, setMode] = useState<'loading' | 'shared' | 'local'>('loading');
  const [canWrite, setCanWrite] = useState(true);
  const dbRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const [db, user] = await Promise.all([useCap('db'), useCap('user')]);
      if (!alive) return;
      if (user && (await user.can('data.write')) === false) setCanWrite(false);
      if (!db) { setReadings(readLocal()); setMode('local'); return; }
      dbRef.current = db;
      setMode('shared');
      unsub = db.collection('readings').orderBy('date', 'desc').limit(400).onSnapshot(
        (snap: { docs: { data(): Record<string, unknown> }[] }) => setReadings(snap.docs.map(d => d.data() as unknown as Reading)),
        () => { setReadings(readLocal()); setMode('local'); },
      );
    })();
    return () => { alive = false; unsub?.(); };
  }, []);

  /** Save many readings; a date that already exists is replaced. Returns how many were saved. */
  const save = async (list: Reading[], onProgress?: (done: number) => void) => {
    if (dbRef.current) {
      let done = 0;
      for (const r of list) {
        await dbRef.current.collection('readings').doc(r.date).set({ ...r });
        onProgress?.(++done);
      }
      return done;
    }
    const map = new Map(readLocal().map(r => [r.date, r]));
    list.forEach(r => map.set(r.date, r));
    const next = [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
    setReadings(next);
    return list.length;
  };

  const remove = async (date: string) => {
    if (dbRef.current) { await dbRef.current.collection('readings').doc(date).delete(); return; }
    const next = readLocal().filter(r => r.date !== date);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setReadings(next);
  };

  return { readings, mode, canWrite, save, remove };
}

/** What a clean, healthy system should make on a given day (kWh), from the yearly estimate and the month. */
export function expectedOn(dateIso: string, annualGen: number) {
  const d = new Date(dateIso + 'T00:00:00');
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return (annualGen * SEASONAL_YIELDS[d.getMonth()]) / days;
}

/** Turn real daily readings into the log the dashboard charts use. */
export function readingsToLogs(readings: Reading[], annualGen: number): SensorLog[] {
  return [...readings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-120)
    .map(r => {
      const exp = expectedOn(r.date, annualGen);
      const ratio = exp > 0 ? r.kwh / exp : 0;
      const efficiency = Math.max(0, Math.min(1.1, ratio * 0.98));
      // Estimated from the shortfall; cloudy days also lower output, so this is a guide only
      const dustIndex = Math.max(0, Math.min(1, (1 - efficiency / 0.98) / 0.9));
      let status: SensorLog['status'] = 'Active & Optimized';
      let faultDescription: string | undefined;
      if (ratio < 0.1) { status = 'Maintenance Required'; faultDescription = 'Inverter may be off: almost no power made. Check the inverter display for a fault code.'; }
      else if (ratio < 0.6) status = 'Underperforming';
      else if (ratio < 0.85) status = 'Cleaning Needed';
      return { id: `r-${r.date}`, date: new Date(r.date + 'T00:00:00').toLocaleDateString(), efficiency, dustIndex, status, faultDescription };
    });
}

// ---------- CSV import from a monitoring portal ----------

type Parsed = { headers: string[]; rows: string[][] };

function parseCsv(text: string): Parsed {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  const delim = [',', ';', '\t'].map(d => [d, (lines[0]?.split(d).length ?? 0)] as const).sort((a, b) => b[1] - a[1])[0][0];
  const split = (l: string) => {
    const out: string[] = []; let cur = ''; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === delim && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  // Portals often put a title or notes above the table: use the first row with a date-like or energy-like header
  const all = lines.map(split);
  const hi = Math.max(0, all.findIndex(r => r.some(c => /date|time|day/i.test(c)) && r.some(c => /kwh|wh|energy|yield|generation|production|pv/i.test(c))));
  return { headers: all[hi] ?? [], rows: all.slice(hi + 1) };
}

/** Day-first dates, as Indian portals use; also ISO and month names. */
function parseDate(s: string): string | null {
  const t = s.trim().split(/[ T]/)[0];
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : isoDay(d);
}

const guessDateCol = (h: string[]) => Math.max(0, h.findIndex(c => /date|day|time/i.test(c)));
const guessEnergyCol = (h: string[]) => {
  const score = (c: string) => (/kwh/i.test(c) ? 4 : /\bwh\b/i.test(c) ? 3 : 0) + (/day|daily|today/i.test(c) ? 2 : 0) + (/energy|yield|generation|production/i.test(c) ? 2 : 0) - (/total|lifetime|cumul/i.test(c) ? 3 : 0);
  let best = -1, bi = 1;
  h.forEach((c, i) => { const s = score(c); if (s > best) { best = s; bi = i; } });
  return bi;
};

export const ConnectData: React.FC<{ config: SystemConfig; annualGen: number; data: ReturnType<typeof useReadings> }> = ({ config, annualGen, data }) => {
  const { readings, mode, canWrite, save, remove } = data;
  const [day, setDay] = useState(isoDay(new Date()));
  const [kwh, setKwh] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState('');
  const [dateCol, setDateCol] = useState(0);
  const [energyCol, setEnergyCol] = useState(1);
  const [unit, setUnit] = useState<'kWh' | 'Wh'>('kWh');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const last = readings[0];
  const exp = expectedOn(day, annualGen);

  const preview = useMemo(() => {
    if (!parsed) return [];
    const byDay = new Map<string, number>();
    for (const r of parsed.rows) {
      const d = parseDate(r[dateCol] ?? '');
      const v = parseFloat(String(r[energyCol] ?? '').replace(/[^0-9.\-]/g, ''));
      if (!d || !isFinite(v)) continue;
      byDay.set(d, (byDay.get(d) ?? 0) + (unit === 'Wh' ? v / 1000 : v)); // hourly rows add up to the day
    }
    return [...byDay].map(([date, k]) => ({ date, kwh: Math.round(k * 100) / 100, source: 'import' as const })).sort((a, b) => a.date.localeCompare(b.date));
  }, [parsed, dateCol, energyCol, unit]);

  const avg = preview.length ? preview.reduce((s, r) => s + r.kwh, 0) / preview.length : 0;
  const looksWrong = preview.length > 0 && (avg > (annualGen / 365) * 5 || avg < (annualGen / 365) / 20);

  const onFile = async (f: File | undefined) => {
    setMsg('');
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) { setMsg('Please choose a CSV file. In Excel or Google Sheets, use File, Download or Save as, then CSV.'); return; }
    const p = parseCsv(await f.text());
    if (!p.headers.length || !p.rows.length) { setMsg('That file has no table we can read.'); return; }
    setParsed(p); setFileName(f.name);
    const dc = guessDateCol(p.headers), ec = guessEnergyCol(p.headers);
    setDateCol(dc); setEnergyCol(ec);
    setUnit(/\bwh\b/i.test(p.headers[ec]) && !/kwh/i.test(p.headers[ec]) ? 'Wh' : 'kWh');
  };

  const importAll = async () => {
    setBusy(`Saving 0 of ${preview.length}`);
    try {
      const n = await save(preview, done => setBusy(`Saving ${done} of ${preview.length}`));
      setMsg(`Saved ${n} days of readings.`); setParsed(null); setFileName('');
    } catch { setMsg('Could not save. You may only have view access to this page.'); }
    setBusy('');
  };

  const addDay = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(kwh);
    if (!isFinite(v) || v < 0) return;
    try { await save([{ date: day, kwh: v, source: 'display' }]); setKwh(''); setMsg(`Saved ${v} kWh for ${fmt(day)}.`); }
    catch { setMsg('Could not save. You may only have view access to this page.'); }
  };

  const field = 'h-10 w-full px-3 rounded-ctl bg-surface-2 border border-line text-sm text-fg focus:outline-none focus:border-silver';

  return (
    <Box>
      <BoxHeader
        title="Real data from the inverter"
        meta={readings.length ? `${readings.length} days · last ${fmt(last.date)}` : 'Showing sample data'}
      />
      <p className="px-5 text-sm text-muted max-w-prose">
        {readings.length
          ? 'The charts, faults, alerts and AI Advisor now use the school\'s real readings. Add each day\'s reading to keep them current.'
          : 'The dashboard is showing sample data. Add real readings and every chart, alert and AI answer switches to them.'}
        {mode === 'shared' ? ' Readings are shared with everyone who opens this page.' : mode === 'local' ? ' Readings are saved on this device only.' : ''}
      </p>

      <div className="mt-4 grid lg:grid-cols-2 gap-px bg-line border-y border-line">
        {/* Daily reading from the display */}
        <form onSubmit={addDay} className="bg-surface p-5 space-y-3">
          <p className="text-sm font-semibold text-fg">1. Every day: read the inverter display</p>
          <p className="text-xs text-muted">After sunset, a student and teacher read "E-Today", "Today yield" or "Daily energy" (kWh) on the inverter screen. Look only; do not open the inverter.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted space-y-1">Date<input type="date" value={day} max={isoDay(new Date())} onChange={e => setDay(e.target.value)} className={field} /></label>
            <label className="text-xs text-muted space-y-1">Energy today (kWh)<input type="number" inputMode="decimal" min={0} step="0.1" value={kwh} onChange={e => setKwh(e.target.value)} placeholder={`about ${exp.toFixed(1)}`} className={field} /></label>
          </div>
          <button type="submit" disabled={!canWrite || !kwh} className={`${btn.secondary} disabled:opacity-40`}>Save reading</button>
        </form>

        {/* CSV from a monitoring portal */}
        <div className="bg-surface p-5 space-y-3">
          <p className="text-sm font-semibold text-fg">2. Or upload history from the monitoring app</p>
          <p className="text-xs text-muted">Many monitoring portals have a Reports or Export option. For example, Huawei FusionSolar exports plant and inverter yield reports from its Reports menu<Cite id="huawei-reports" />. Choose a daily report, export it as CSV (or open the Excel file and save it as CSV), then upload it here. Some portals, such as some Growatt web portals, only export pictures of graphs<Cite id="growatt-export" />. If yours has no data export, use the daily reading, or ask the installer for a daily energy file.</p>
          <label className={`${btn.secondary} cursor-pointer inline-flex ${!canWrite ? 'pointer-events-none opacity-40' : ''}`}>
            Choose CSV file
            <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {parsed && (
            <div className="space-y-3 rounded-box border border-line p-3">
              <p className="text-xs text-muted">{fileName}: {parsed.rows.length} rows. Check the columns:</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-muted space-y-1">Date column
                  <select value={dateCol} onChange={e => setDateCol(Number(e.target.value))} className={field}>{parsed.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select>
                </label>
                <label className="text-xs text-muted space-y-1">Energy column
                  <select value={energyCol} onChange={e => setEnergyCol(Number(e.target.value))} className={field}>{parsed.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select>
                </label>
                <label className="text-xs text-muted space-y-1">Unit
                  <select value={unit} onChange={e => setUnit(e.target.value as 'kWh' | 'Wh')} className={field}><option>kWh</option><option>Wh</option></select>
                </label>
              </div>
              {preview.length ? (
                <p className="text-sm text-fg">
                  {preview.length} days, {fmt(preview[0].date)} to {fmt(preview[preview.length - 1].date)}, about {avg.toFixed(1)} kWh a day
                  <span className="text-muted"> (expected about {(annualGen / 365).toFixed(1)}).</span>
                </p>
              ) : <p className="text-sm text-bad">No dates and numbers found in those columns. Try another column.</p>}
              {looksWrong && <p className="text-xs text-warn">That is far from what a {config.systemSize} kWp system makes. Check the energy column and the unit, or that it is a daily (not total) figure.</p>}
              <div className="flex gap-2">
                <button onClick={importAll} disabled={!preview.length || !!busy} className={`${btn.primary} disabled:opacity-40`}>{busy || `Import ${preview.length} days`}</button>
                <button onClick={() => { setParsed(null); setFileName(''); }} className={btn.quiet}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {msg && <p className="px-5 pt-3 text-sm text-fg">{msg}</p>}

      {readings.length > 0 && (
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">Latest readings</p>
            <button onClick={() => downloadCsv('inverter-readings.csv', ['Date', 'Energy (kWh)', 'Expected (kWh)', 'From'], [...readings].sort((a, b) => a.date.localeCompare(b.date)).map(r => [r.date, r.kwh, expectedOn(r.date, annualGen).toFixed(1), r.source === 'display' ? 'Inverter display' : 'Imported file']))} className={btn.quiet}>
              Download as spreadsheet (CSV)
            </button>
          </div>
          <ul className="divide-y divide-line border border-line rounded-box">
            {readings.slice(0, 5).map(r => {
              const ratio = r.kwh / expectedOn(r.date, annualGen);
              return (
                <li key={r.date} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <StatusDot tone={ratio >= 0.85 ? 'ok' : ratio >= 0.6 ? 'warn' : 'bad'} className="text-fg tabular-nums">{fmt(r.date)}</StatusDot>
                  <span className="tabular-nums">{r.kwh} kWh</span>
                  <span className="text-xs text-muted">{Math.round(ratio * 100)}% of expected</span>
                  {canWrite && <button onClick={() => remove(r.date)} className={`${btn.quiet} ml-auto`}>Remove</button>}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">Below 85% of expected on a sunny day usually means dust or shade; below 60%, or several low days in a row, needs a check. Cloudy days are lower too, so look at the weather before cleaning.</p>
        </div>
      )}
    </Box>
  );
};
