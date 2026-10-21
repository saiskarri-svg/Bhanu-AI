import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { SystemConfig } from '../types';
import { calculateIndianSubsidy, SEASONAL_YIELDS, MONTHS, EMISSION_FACTOR, TREE_ABSORPTION } from '../constants';
import { Box, BoxHeader, StatusDot, Legend, TooltipCard, CHART, axisProps, btn, ResponsiveChart, CountUp, useFreshIds, SavedTick, fadeOutRow, SkeletonRows } from './ui';
import { Cite } from './Sources';
import { useCap, saveFile, downloadCsv } from './runtime';

const inr = (n: number) => (n < 0 ? '-' : '') + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
const lakh = (n: number) => (Math.abs(n) >= 1e5 ? `${n < 0 ? '-' : ''}₹${(Math.abs(n) / 1e5).toFixed(2)} lakh` : inr(n));

const Slider: React.FC<{ id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }> = ({ id, label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <label htmlFor={id} className="text-xs text-muted">{label}</label>
      <span className="text-xs text-fg tabular-nums">{display}</span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full" />
  </div>
);

/** Shared money facts for this site. */
function useMoney(config: SystemConfig, annualGen: number) {
  return useMemo(() => {
    const cost = config.systemSize * config.costPerKw;
    const subsidy = calculateIndianSubsidy(config.systemSize, config.state, config.grant).totalSubsidy;
    const net = Math.max(0, cost - subsidy);
    const genYear = (y: number) => annualGen * Math.pow(1 - config.degradation / 100, y - 1);
    const savingsYear = (y: number) => genYear(y) * config.unitPrice;
    const savings20 = Array.from({ length: 20 }, (_, i) => savingsYear(i + 1)).reduce((a, b) => a + b, 0);
    return { cost, subsidy, net, genYear, savingsYear, savings20 };
  }, [config, annualGen]);
}

// ---------- 1. Compare funding options ----------

export const FundingOptions: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const m = useMoney(config, annualGen);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(5);
  const [csr, setCsr] = useState(100);
  const [ppa, setPpa] = useState(4.5);

  const rows = useMemo(() => {
    const yearlySave = m.savingsYear(1);
    // Loan: 20% down, rest as equal monthly payments
    const down = m.net * 0.2;
    const r = rate / 100 / 12;
    const n = years * 12;
    const emi = r > 0 ? (m.net - down) * r / (1 - Math.pow(1 + r, -n)) : (m.net - down) / n;
    // Developer-owned (RESCO): school buys all solar units at a fixed rate below the tariff
    const resco20 = Array.from({ length: 20 }, (_, i) => m.genYear(i + 1) * (config.unitPrice - ppa)).reduce((a, b) => a + b, 0);
    return [
      { key: 'cash', name: 'Pay upfront', upfront: m.net, monthly: yearlySave / 12, total: m.savings20 - m.net, owner: 'School, from day one', note: 'Simplest and the biggest long-term saving, if the school has the money.' },
      { key: 'loan', name: `Bank loan, ${years} years`, upfront: down, monthly: yearlySave / 12 - emi, total: m.savings20 - down - emi * n, owner: 'School, after the loan', note: `About ${inr(emi)} a month to the bank at ${rate}% interest, 20% paid upfront.` },
      { key: 'csr', name: 'Company CSR grant', upfront: m.net * (1 - csr / 100), monthly: yearlySave / 12, total: m.savings20 - m.net * (1 - csr / 100), owner: 'School', note: `A company pays ${csr}% under its CSR budget for education and the environment.` },
      { key: 'resco', name: 'Installer owns it (pay per unit)', upfront: 0, monthly: (m.genYear(1) * (config.unitPrice - ppa)) / 12, total: resco20, owner: 'Installer, often handed over after the contract', note: `No upfront cost. The school buys the solar units at ₹${ppa} instead of ₹${config.unitPrice}.` },
    ];
  }, [m, rate, years, csr, ppa, config.unitPrice]);

  const best = rows.reduce((a, b) => (b.total > a.total ? b : a));
  const noCash = rows.filter(r => r.upfront === 0 || r.key === 'csr').reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <Box>
      <BoxHeader title="Ways to pay for it" meta={`${config.systemSize} kWp · ${inr(m.net)} after grants`} />
      <p className="px-5 text-sm text-muted max-w-prose">The same system can be paid for in four ways. Compare what the school pays upfront, what it gains each month, and over 20 years.</p>

      <div className="px-5 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        <Slider id="fund-rate" label="Loan interest" value={rate} min={6} max={16} step={0.5} display={`${rate}% a year`} onChange={setRate} />
        <Slider id="fund-years" label="Loan length" value={years} min={2} max={10} step={1} display={`${years} years`} onChange={setYears} />
        <Slider id="fund-csr" label="Share a CSR grant covers" value={csr} min={25} max={100} step={5} display={`${csr}%`} onChange={setCsr} />
        <Slider id="fund-ppa" label="Price per unit to the installer" value={ppa} min={2.5} max={Math.max(3, config.unitPrice)} step={0.1} display={`₹${ppa.toFixed(1)}`} onChange={setPpa} />
      </div>

      <div className="m-5 overflow-x-auto rounded-box border border-line">
        <table className="stack-table w-full min-w-[720px] text-sm">
          <caption className="sr-only">Funding options compared</caption>
          <thead>
            <tr className="text-xs text-muted text-left">
              <th className="font-normal px-4 py-2.5">Option</th>
              <th className="font-normal px-4 py-2.5 text-right">School pays upfront</th>
              <th className="font-normal px-4 py-2.5 text-right">Each month, year 1</th>
              <th className="font-normal px-4 py-2.5 text-right">20 year gain</th>
              <th className="font-normal px-4 py-2.5">Owns the system</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {rows.map(r => (
              <tr key={r.key} className={r.key === best.key ? 'bg-surface-2' : ''}>
                <td className="px-4 py-3">
                  <p className="text-fg">{r.name}</p>
                  <p className="text-xs text-muted max-w-xs">{r.note}</p>
                </td>
                <td data-label="School pays upfront" className="px-4 py-3 text-right tabular-nums">{r.upfront ? inr(r.upfront) : 'Nothing'}</td>
                <td data-label="Each month, year 1" className="px-4 py-3 text-right tabular-nums" style={{ color: r.monthly >= 0 ? CHART.positive : CHART.negative }}>{r.monthly >= 0 ? '+' : ''}{inr(r.monthly)}</td>
                <td data-label="20 year gain" className="px-4 py-3 text-right tabular-nums text-fg">{lakh(r.total)}</td>
                <td data-label="Owns the system" className="px-4 py-3 text-muted">{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 pb-5 -mt-1 space-y-1.5 text-sm">
        <p><StatusDot tone="ok" className="text-fg">Biggest 20 year gain: {best.name.replace(/csr/i,'CSR')} ({lakh(best.total)}).</StatusDot></p>
        <p className="text-muted">If the school has no money to spare, {noCash.name.replace(/^./, c => c.toLowerCase())} gives the most without a large upfront payment.</p>
        <p className="text-xs text-muted">Rough guide. Loan terms, CSR rules<Cite id="csr" /> and pay-per-unit contracts<Cite id="psg-gov" /> vary; get written quotes before deciding.</p>
      </div>
    </Box>
  );
};

// ---------- 2. What if ----------

export const WhatIf: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const m = useMoney(config, annualGen);
  const [growth, setGrowth] = useState(3);
  const [degr, setDegr] = useState(config.degradation);
  const [invYear, setInvYear] = useState(12);
  const [upkeep, setUpkeep] = useState(2000);
  const invCost = Math.round(config.systemSize * 6000);

  const data = useMemo(() => {
    let base = -m.net, sc = -m.net;
    const out = [{ year: 0, base: Math.round(base), scenario: Math.round(sc) }];
    for (let y = 1; y <= 20; y++) {
      base += m.savingsYear(y);
      const gen = annualGen * Math.pow(1 - degr / 100, y - 1);
      sc += gen * config.unitPrice * Math.pow(1 + growth / 100, y - 1) - upkeep - (invYear > 0 && y === invYear ? invCost : 0);
      out.push({ year: y, base: Math.round(base), scenario: Math.round(sc) });
    }
    return out;
  }, [m, annualGen, degr, growth, upkeep, invYear, invCost, config.unitPrice]);

  const payback = (k: 'base' | 'scenario') => data.find(d => d[k] >= 0)?.year;
  const Tip = ({ active, payload, label }: any) => active && payload?.length
    ? <TooltipCard title={`Year ${label}`} rows={payload.map((p: any) => ({ label: p.dataKey === 'base' ? 'Simple estimate' : 'Your scenario', value: inr(p.value), color: p.dataKey === 'base' ? CHART.faint : CHART.sun }))} />
    : null;

  return (
    <Box>
      <BoxHeader title="What if?" meta="Test the numbers" />
      <p className="px-5 text-sm text-muted max-w-prose">The simple estimate assumes nothing changes for 20 years. Real life adds rising tariffs, upkeep and an inverter replacement. Move the sliders to see an honest range. Typical values: panels last 25 years or more<Cite id="panel-life" /> and wear about 0.5% a year<Cite id="degradation" />, inverters often need replacing after 10 to 15 years<Cite id="inverter-life" />.</p>
      <div className="px-5 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        <Slider id="wi-growth" label="Tariff rise each year" value={growth} min={0} max={8} step={0.5} display={`${growth}%`} onChange={setGrowth} />
        <Slider id="wi-degr" label="Panels wear out each year" value={degr} min={0.2} max={1.5} step={0.1} display={`${degr.toFixed(1)}%`} onChange={setDegr} />
        <Slider id="wi-inv" label="Inverter replaced in year" value={invYear} min={0} max={20} step={1} display={invYear ? `${invYear} (${inr(invCost)})` : 'Never'} onChange={setInvYear} />
        <Slider id="wi-upkeep" label="Upkeep each year" value={upkeep} min={0} max={10000} step={500} display={inr(upkeep)} onChange={setUpkeep} />
      </div>
      <div className="px-5 pt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Breaks even in year <span className="text-fg tabular-nums">{payback('scenario') ?? 'over 20'}</span> (simple estimate: year {payback('base') ?? 'over 20'}) · <span className="text-fg tabular-nums">{lakh(data[20].scenario)}</span> ahead by year 20
        </p>
        <Legend items={[{ label: 'Your scenario', color: CHART.sun }, { label: 'Simple estimate', color: CHART.faint }]} />
      </div>
      <div className="h-[260px] px-2 pt-2 pb-4">
        <ResponsiveChart>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis {...axisProps} width={64} tickFormatter={v => `${v < 0 ? '-' : ''}₹${Math.abs(Math.round(v / 1000))}k`} />
            <Tooltip content={<Tip />} cursor={{ stroke: CHART.faint }} />
            <ReferenceLine y={0} stroke={CHART.faint} />
            <Line type="monotone" dataKey="base" stroke={CHART.faint} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="scenario" stroke={CHART.sun} strokeWidth={2.25} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveChart>
      </div>
    </Box>
  );
};

// ---------- 3. Monthly savings tracker ----------

interface Bill { id: string; month: string; solar: number; units: number; amount: number }
const LOCAL_BILLS = 'bhanu-bills';
const readLocal = (): Bill[] => { try { return JSON.parse(localStorage.getItem(LOCAL_BILLS) || '[]'); } catch { return []; } };

export const SavingsTracker: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const m = useMoney(config, annualGen);
  const [mode, setMode] = useState<'loading' | 'shared' | 'local'>('loading');
  const [bills, setBills] = useState<Bill[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), solar: '', units: '', amount: '' });
  const [error, setError] = useState('');
  const dbRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const [db, user] = await Promise.all([useCap('db'), useCap('user')]);
      if (!alive) return;
      if (user && (await user.can('data.write')) === false) setCanWrite(false);
      if (!db) { setBills(readLocal()); setMode('local'); return; }
      dbRef.current = db;
      setMode('shared');
      unsub = db.collection('bills').orderBy('month', 'desc').limit(60).onSnapshot(
        (snap: { docs: { id: string; data(): Record<string, unknown> }[] }) => setBills(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Bill, 'id'>) }))),
        () => { setBills(readLocal()); setMode('local'); },
      );
    })();
    return () => { alive = false; unsub?.(); };
  }, []);

  const expected = (month: string) => annualGen * SEASONAL_YIELDS[Number(month.slice(5, 7)) - 1];
  const rows = [...bills].sort((a, b) => b.month.localeCompare(a.month)).map(b => {
    const rateNow = b.units > 0 ? b.amount / b.units : config.unitPrice;
    return { ...b, exp: expected(b.month), saved: b.solar * rateNow, ok: b.solar >= expected(b.month) * 0.9 };
  });
  const totalSaved = rows.reduce((s, r) => s + r.saved, 0);
  const totalSolar = rows.reduce((s, r) => s + r.solar, 0);
  const totalExp = rows.reduce((s, r) => s + r.exp, 0);
  const onTrack = totalExp > 0 ? totalSolar / totalExp : 1;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const b = { month: form.month, solar: Number(form.solar), units: Number(form.units), amount: Number(form.amount) };
    if (!/^\d{4}-\d{2}$/.test(b.month) || !(b.solar >= 0) || !(b.amount >= 0)) { setError('Fill in the month, solar units and bill amount.'); return; }
    if (mode === 'shared' && dbRef.current) {
      try { await dbRef.current.doc(`bills/${b.month}`).set(b); }
      catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'invalid_argument') { setCanWrite(false); setError('You can view the tracker but not add to it.'); }
        else setError('Could not save. Check your connection and try again.');
        return;
      }
    } else {
      const next = [{ id: b.month, ...b }, ...readLocal().filter(x => x.month !== b.month)];
      try { localStorage.setItem(LOCAL_BILLS, JSON.stringify(next)); } catch { /* ignore */ }
      setBills(next);
    }
    setForm(f => ({ ...f, solar: '', units: '', amount: '' }));
  };

  const remove = async (month: string) => {
    if (mode === 'shared' && dbRef.current) { try { await dbRef.current.doc(`bills/${month}`).delete(); } catch { setError('Could not remove that month.'); } }
    else { const next = readLocal().filter(x => x.month !== month); try { localStorage.setItem(LOCAL_BILLS, JSON.stringify(next)); } catch { /* ignore */ } setBills(next); }
  };

  const field = 'h-9 w-full bg-bg border border-line rounded-ctl px-3 text-sm text-fg tabular-nums focus:outline-none focus:border-silver';

  const isFresh = useFreshIds(rows.map(r => r.month));
  return (
    <Box>
      <BoxHeader title="Savings tracker" meta={mode === 'shared' ? 'Shared with everyone who opens this page' : mode === 'local' ? 'Saved on this device only' : 'Loading'} />
      <p className="px-5 text-sm text-muted max-w-prose">Each month, add the solar units from the inverter display and the DISCOM bill. See what solar really saved, and whether it is keeping up with the estimate.</p>

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        <div className="bg-surface px-4 py-3"><p className="text-xs text-muted">Saved so far</p><p className="mt-1 font-display font-semibold text-2xl tabular-nums" style={{ color: CHART.positive }}>{inr(totalSaved)}</p></div>
        <div className="bg-surface px-4 py-3"><p className="text-xs text-muted">Paid back</p><p className="mt-1 font-display font-semibold text-2xl tabular-nums">{m.net ? Math.min(100, Math.round((totalSaved / m.net) * 100)) : 100}%</p></div>
        <div className="bg-surface px-4 py-3"><p className="text-xs text-muted">Solar made vs estimate</p><p className="mt-1 font-display font-semibold text-2xl tabular-nums" style={{ color: rows.length ? (onTrack >= 0.9 ? CHART.positive : CHART.negative) : undefined }}>{rows.length ? `${Math.round(onTrack * 100)}%` : '–'}</p></div>
        <div className="bg-surface px-4 py-3"><p className="text-xs text-muted">Months logged</p><p className="mt-1 font-display font-semibold text-2xl tabular-nums">{rows.length}</p></div>
      </div>

      {canWrite && mode !== 'loading' && (
        <form onSubmit={save} className="px-5 grid grid-cols-2 lg:grid-cols-[150px_1fr_1fr_1fr_auto] gap-3 items-end">
          <div><label htmlFor="bill-m" className="block text-xs text-muted mb-1">Month</label><input id="bill-m" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className={field} /></div>
          <div><label htmlFor="bill-s" className="block text-xs text-muted mb-1">Solar made (kWh)</label><input id="bill-s" type="number" min={0} value={form.solar} onChange={e => setForm({ ...form, solar: e.target.value })} placeholder={String(Math.round(expected(form.month)))} className={field} /></div>
          <div><label htmlFor="bill-u" className="block text-xs text-muted mb-1">Units on bill</label><input id="bill-u" type="number" min={0} value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} className={field} /></div>
          <div><label htmlFor="bill-a" className="block text-xs text-muted mb-1">Bill amount (₹)</label><input id="bill-a" type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={field} /></div>
          <button type="submit" className={`${btn.secondary} col-span-2 lg:col-span-1`}>Add month</button>
        </form>
      )}
      {error && <p className="px-5 pt-2 text-sm"><StatusDot tone="bad" className="text-bad">{error}</StatusDot></p>}

      <ul className="mt-4 border-t border-line divide-y divide-line">
        {rows.length ? rows.map(r => (
          <li key={r.month} className={`px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm ${isFresh(r.month) ? 'row-new' : ''}`}>
            <span className="w-24 text-fg">{MONTHS[Number(r.month.slice(5, 7)) - 1]} {r.month.slice(0, 4)}</span>
            <StatusDot tone={r.ok ? 'ok' : 'bad'} className="text-muted tabular-nums">{Math.round(r.solar)} of {Math.round(r.exp)} kWh expected</StatusDot>
            <span className="text-fg tabular-nums">Saved {inr(r.saved)}</span>
            {isFresh(r.month) && <SavedTick />}
            {canWrite && <button onClick={e => fadeOutRow(e, () => remove(r.month))} className={`${btn.quiet} ml-auto`}>Remove</button>}
          </li>
        )) : mode === 'loading' ? <li className="px-5 py-5"><SkeletonRows /></li> : <li className="px-5 py-8 text-center text-sm text-muted">No months added yet. Start with last month's bill.</li>}
      </ul>
      <div className="px-5 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-xs text-muted max-w-prose">Savings are the solar units times what the school pays per unit on that bill. A month under 90% of the estimate is worth checking: dirty panels, shade or a fault.</p>
        {rows.length > 0 && (
          <button
            onClick={() => downloadCsv(`${config.schoolName || 'school'} savings.csv`,
              ['Month', 'Solar made (kWh)', 'Estimate (kWh)', 'Units on bill', 'Bill amount (Rs)', 'Saved (Rs)', 'On track'],
              rows.map(r => [r.month, r.solar, Math.round(r.exp), r.units, r.amount, Math.round(r.saved), r.ok ? 'Yes' : 'Check']))}
            className={`${btn.quiet} shrink-0 whitespace-nowrap`}
          >
            Download as spreadsheet (CSV)
          </button>
        )}
      </div>
    </Box>
  );
};

// ---------- 4. Where the savings go ----------

export const SavingsSplit: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const yearly = annualGen * config.unitPrice;
  const [books, setBooks] = useState(40);
  const [lab, setLab] = useState(30);
  const [care, setCare] = useState(20);
  const rest = Math.max(0, 100 - books - lab - care);
  const amt = (p: number) => (yearly * p) / 100;
  const cap = (others: number) => Math.max(0, 100 - others);

  const items = [
    { label: 'Library books', pct: books, out: `${Math.floor(amt(books) / 250)} books`, sub: 'at about ₹250 each', color: CHART.positive },
    { label: 'Lab equipment', pct: lab, out: (n => `${n} tablet${n === 1 ? '' : 's'}`)(Math.floor(amt(lab) / 12000)), sub: 'at about ₹12,000 each', color: CHART.monsoon },
    { label: 'System upkeep fund', pct: care, out: `${Math.floor(amt(care) / 200)} cleanings`, sub: amt(care) >= 3000 + 12 * 200 ? 'covers monthly cleaning and the yearly service' : 'at about ₹200 each', color: CHART.sun },
    { label: 'School fund', pct: rest, out: inr(amt(rest)), sub: 'for anything else', color: CHART.faint },
  ];

  return (
    <Box>
      <BoxHeader title="Where the savings go" meta={`${inr(yearly)} a year`} />
      <p className="px-5 text-sm text-muted max-w-prose">Decide how the school spends what solar saves, and see what it buys each year. Children notice books and tablets more than a smaller bill.</p>
      <div className="px-5 pt-4 grid sm:grid-cols-3 gap-x-6 gap-y-4">
        <Slider id="sp-books" label="Library books" value={books} min={0} max={cap(lab + care)} step={5} display={`${books}%`} onChange={setBooks} />
        <Slider id="sp-lab" label="Lab equipment" value={lab} min={0} max={cap(books + care)} step={5} display={`${lab}%`} onChange={setLab} />
        <Slider id="sp-care" label="System upkeep fund" value={care} min={0} max={cap(books + lab)} step={5} display={`${care}%`} onChange={setCare} />
      </div>
      <div className="mx-5 mt-4 flex h-2 rounded-full overflow-hidden" aria-hidden="true">
        {items.map(i => <span key={i.label} style={{ width: `${i.pct}%`, background: i.color }} />)}
      </div>
      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        {items.map(i => (
          <div key={i.label} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />{i.label} · {i.pct}%</p>
            <p className="mt-1 font-display font-semibold text-xl tabular-nums">{i.out}</p>
            <p className="mt-0.5 text-xs text-muted">{i.sub}</p>
          </div>
        ))}
      </div>
    </Box>
  );
};

// ---------- 5. Funder summary (PDF) ----------

export const FunderSummary: React.FC<{ config: SystemConfig; annualGen: number; payback: number | string }> = ({ config, annualGen, payback }) => {
  const m = useMoney(config, annualGen);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const co2 = (annualGen * EMISSION_FACTOR) / 1000;
  const trees = Math.floor((annualGen * EMISSION_FACTOR) / TREE_ABSORPTION);
  const rs = (n: number) => 'Rs ' + Math.round(n).toLocaleString('en-IN');

  const make = async () => {
    setBusy(true); setMsg('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      let y = 20;
      doc.setFillColor(245, 197, 24); doc.circle(24, y + 2, 5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
      doc.text('BHANU AI · SCHOOL SOLAR PROGRAMME', 33, y + 3.5);
      y += 16;
      doc.setTextColor(20, 20, 20); doc.setFontSize(22);
      doc.text(`${config.schoolName || 'Village school'} runs on sunshine`, 18, y);
      y += 8;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(80, 80, 80);
      doc.text(`${config.village}, ${config.state} · ${config.systemSize} kWp rooftop solar system`, 18, y);
      y += 12;

      const stats: [string, string][] = [
        ['Clean power a year', `${Math.round(annualGen).toLocaleString('en-IN')} kWh`],
        ['Bill savings a year', rs(m.savingsYear(1))],
        ['CO2 avoided a year', `${co2.toFixed(1)} tonnes`],
        ['Trees equivalent', trees.toLocaleString('en-IN')],
        ['System cost', rs(m.cost)],
        ['Grants secured', rs(m.subsidy)],
        ['Funding needed', rs(m.net)],
        ['Pays for itself in', `${payback} years`],
      ];
      const colW = (W - 36) / 4;
      stats.forEach(([k, v], i) => {
        const x = 18 + (i % 4) * colW, yy = y + Math.floor(i / 4) * 22;
        doc.setDrawColor(225, 225, 225); doc.rect(x, yy, colW - 3, 19);
        doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.text(k, x + 3, yy + 6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 20, 20); doc.text(v, x + 3, yy + 14);
        doc.setFont('helvetica', 'normal');
      });
      y += 52;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 20, 20);
      doc.text('Power through the year (kWh)', 18, y);
      y += 4;
      const vals = SEASONAL_YIELDS.map(s => annualGen * s);
      const max = Math.max(...vals);
      const bw = (W - 36) / 12;
      vals.forEach((v, i) => {
        const h = (v / max) * 30;
        const monsoon = i >= 5 && i <= 8;
        doc.setFillColor(monsoon ? 90 : 245, monsoon ? 169 : 180, monsoon ? 255 : 40);
        doc.rect(18 + i * bw + 1.5, y + 32 - h, bw - 3, h, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110, 110, 110);
        doc.text(MONTHS[i], 18 + i * bw + bw / 2, y + 37, { align: 'center' });
      });
      y += 46;

      const section = (title: string, lines: string[]) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 20, 20); doc.text(title, 18, y); y += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        lines.forEach(l => { const w = doc.splitTextToSize('•  ' + l, W - 40); doc.text(w, 20, y); y += w.length * 5 + 1; });
        y += 3;
      };
      section('For children', [
        'Lights, fans and computer labs run on the sun in the daytime, and the bill goes down.',
        'Students learn science from their own roof: data, safety and maintenance.',
        'A path to skilled solar jobs, starting in class 6.',
      ]);
      section('For the community and funders', [
        `Bill savings of about ${rs(m.savingsYear(1))} a year stay in the school for books and materials.`,
        'Local jobs cleaning, inspecting and repairing systems.',
        'Each school avoids tonnes of CO2 a year and trains the workforce India needs for its 500 GW non-fossil power target for 2030.',
      ]);

      doc.setFontSize(8); doc.setTextColor(140, 140, 140);
      doc.text(`Estimates for a typical year from the system size and local sunshine. Prepared with Bhanu AI on ${new Date().toLocaleDateString('en-IN')}.`, 18, 285);

      const blob = doc.output('blob');
      const ok = await saveFile(`${config.schoolName || 'School'} solar funding summary.pdf`, blob);
      setMsg(ok ? 'Summary saved.' : 'The download was not saved.');
    } catch {
      setMsg('Could not create the PDF in this browser.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <BoxHeader title="Funder summary" meta="One page PDF" />
      <div className="p-5 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-muted max-w-prose">A one page summary for a company's CSR team, a bank or the district office: the system, costs, subsidy, savings, CO₂ and what it means for children. Send it to fund this school or the next one.</p>
        <div className="flex items-center gap-3 shrink-0">
          {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
          <button onClick={make} disabled={busy} className={btn.secondary}>{busy ? 'Making the PDF…' : 'Download summary (PDF)'}</button>
        </div>
      </div>
    </Box>
  );
};
