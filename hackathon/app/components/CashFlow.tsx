import React from 'react';
import { Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BoxHeader, ResponsiveChart, axisProps, CHART, TooltipCard, Legend, More } from './ui';
import type { Engine } from './engine';
import { derive, type Settings } from './settings';
import { n0, usd } from './format';
import { Cite } from './refs';
import { expSold, scaleQ, lerpQ } from './rightsize';

// Engine cost inputs (forecast/assumptions.yaml, Omorate 2021 prices)
const OM = { pv: 13.5, inv: 4.3, batt: 22.3 };
// Rough-guide finance terms (assumptions); change with a lender's real offer
export const LOANS = {
  commercial: { label: 'Commercial', rate: 0.12, years: 7, grace: 0 },
  concessional: { label: 'Concessional', rate: 0.06, years: 12, grace: 12 },
} as const;
export const TERMS = { collection: 0.9, debtShare: 0.7, ...LOANS.commercial };
export const termsFor = (s: Settings) => ({ collection: TERMS.collection, debtShare: TERMS.debtShare, ...LOANS[s.loan ?? 'commercial'] });
export const DSCR_MIN = 1.2;

export interface CashMonth { m: number; kwh: number; revenue: number; om: number; debt: number; net: number; cum: number }

// A 24-month cash flow for the chosen system and tariff, after a grant
export const cashFlow = (eng: Engine, s: Settings, grant: number) => {
  const T = termsFor(s);
  const d = derive(eng, s);
  if (!d.des || !d.E) return null;
  const des = d.des;
  const inv = 'inverter_kw' in des ? (des as { inverter_kw: number }).inverter_kw : (d.PK?.[4].p50 ?? 0) * 1.25;
  const om = (des.pv_kwp * OM.pv + inv * OM.inv + des.battery_kwh * OM.batt) / 12;
  // Higher tariffs lower use: scale by the engine's year-5 use at this tariff
  const base = eng.summary.energy_kwh_per_day[4].p50;
  const f = d.meta || !d.tsel ? 1 : d.tsel.year5_kwh_per_day_p50 / base;
  const capex = des.capex_usd;
  const toFinance = Math.max(0, capex - grant * d.grantShare0);
  const loan = toFinance * T.debtShare, equity = toFinance - loan;
  // Grace period: no payments, interest added to the loan; then equal payments over the rest of the term
  const r = T.rate / 12, n = T.years * 12 - T.grace;
  const bal = loan * Math.pow(1 + r, T.grace);
  const debt = loan > 0 ? bal * r / (1 - Math.pow(1 + r, -n)) : 0;
  const rows: CashMonth[] = [];
  let cum = -equity;
  for (let m = 1; m <= 24; m++) {
    const y = (m - 0.5) / 12; // years since connection
    const i = Math.min(3, Math.floor(y)), t = y - i;
    const q = scaleQ(lerpQ(d.E[i], d.E[i + 1], t), f);
    const yr = Math.floor((m - 1) / 12) + 1;
    const add = (d.adds ?? []).filter(a => a.year <= yr).pop();
    const cap = add ? add.kit.capacity_kwh_day : des.capacity_kwh_day;
    const omM = add ? (add.kit.pv_kwp * OM.pv + add.kit.inverter_kw * OM.inv + add.kit.battery_kwh * OM.batt) / 12 : om;
    const addDebt = (d.adds ?? []).filter(a => a.year <= yr).reduce((t, a) => { const L = Math.max(0, a.capex_usd - grant * a.grantShare) * T.debtShare; return t + (L > 0 ? L * r / (1 - Math.pow(1 + r, -T.years * 12)) : 0); }, 0);
    const kwh = expSold(q, cap) * 30.4;
    const revenue = kwh * s.tar * T.collection;
    const pay = (m > T.grace ? debt : 0) + addDebt;
    const net = revenue - omM - pay;
    cum += net;
    rows.push({ m, kwh, revenue, om: omM, debt: pay, net, cum });
  }
  const firstPositive = rows.find(x => x.net > 0)?.m;
  const y2 = rows.slice(12);
  const cfads = y2.reduce((a, x) => a + x.revenue - x.om, 0);
  const debtY2 = y2.reduce((a, x) => a + x.debt, 0);
  const dscr = debtY2 > 0 ? cfads / debtY2 : undefined;
  const ok = cfads > 0 && (dscr === undefined || dscr >= DSCR_MIN);
  return { rows, capex, grant, loan, equity, debt, om, firstPositive, dscr, ok, T, stage2: d.stage2, total: rows.reduce((a, x) => a + x.net, 0) };
};

// Smallest grant per connection that makes year 2 cover running costs and 1.2x the loan payment
export const minGrant = (eng: Engine, s: Settings, extra?: (grantTotal: number) => boolean): number | null => {
  const d = derive(eng, s); const cust = d.CU?.[4].p50 ?? 0;
  if (!d.des || cust <= 0) return null;
  const at = (g: number) => { const c = cashFlow(eng, s, g * cust); return c && c.ok && (!extra || extra(g * cust)) ? c : null; };
  if (at(0)) return 0;
  const max = (d.full?.capex_usd ?? d.des.capex_usd) / cust / Math.max(0.05, Math.min(d.grantShare0, ...(d.adds ?? []).map(a => a.grantShare || 1)));
  if (!at(max)) return null; // even a full grant leaves bills below running costs
  let lo = 0, hi = max;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (at(mid)) hi = mid; else lo = mid; }
  return Math.ceil(hi / 10) * 10;
};

export const CashFlow: React.FC<{ eng: Engine; s: Settings; grant: number }> = ({ eng, s, grant }) => {
  const c = cashFlow(eng, s, grant);
  if (!c) return null;
  const data = c.rows.map(x => ({ ...x, out: x.om + x.debt }));
  const tone = (v: number | undefined, ok: number, warn: number) => v === undefined ? 'text-fg' : v >= ok ? 'text-ok' : v >= warn ? 'text-warn' : 'text-bad';
  return (
    <>
      <BoxHeader title="First 24 months of cash" meta={`$${s.tar.toFixed(2)} a kWh · ${c.T.label.toLowerCase()} loan · after the grant above · rough guide`} />
      <div className="px-5 pb-5 space-y-4">
        <dl className="grid gap-px bg-line border border-line rounded-ctl overflow-hidden grid-cols-2 lg:grid-cols-4">
          {[
            { k: 'Loan (70% of the rest)', v: usd(c.loan), sub: `${usd(c.debt)} a month, ${c.T.years} years at ${Math.round(c.T.rate * 100)}%${c.T.grace ? `, ${c.T.grace}-month grace` : ''}` },
            { k: 'Owner puts in', v: usd(c.equity), sub: 'the other 30%' },
            { k: 'Debt cover, year 2', v: c.dscr !== undefined ? `${c.dscr.toFixed(2)}x` : 'no loan', sub: 'lenders often want 1.2x or more', cls: c.dscr === undefined ? (c.ok ? 'text-ok' : 'text-bad') : tone(c.dscr, 1.2, 1) },
            { k: 'Cash after 24 months', v: usd(Math.abs(c.total)), sub: c.total >= 0 ? 'ahead, after loan payments' : 'short, after loan payments', cls: c.total >= 0 ? 'text-ok' : 'text-bad' },
          ].map(x => (
            <div key={x.k} className="bg-surface-2 px-3 py-2 min-w-0">
              <dt className="text-[11px] text-muted">{x.k}</dt>
              <dd className={`font-display text-lg tabular-nums ${x.cls ?? ''}`}>{x.v}</dd>
              <dd className="text-[11px] text-muted">{x.sub}</dd>
            </div>
          ))}
        </dl>
        <div className="h-[220px]">
          <ResponsiveChart summary={`Money in from bills grows from ${n0(c.rows[0].revenue)} to ${n0(c.rows[23].revenue)} dollars a month against ${n0(c.rows[0].om + c.rows[0].debt)} dollars of running costs and loan payments; ${c.firstPositive ? `bills first cover them in month ${c.firstPositive}` : 'bills do not cover them within 24 months'}.`}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="m" {...axisProps} ticks={[1, 6, 12, 18, 24]} tickFormatter={v => `M${v}`} />
              <YAxis {...axisProps} width={52} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                            <Tooltip content={({ active, payload }) => active && payload?.length ? (
                <TooltipCard title={`Month ${payload[0].payload.m}`} rows={[
                  { label: 'Sold', value: `${n0(payload[0].payload.kwh)} kWh` },
                  { label: 'Money in', value: usd(payload[0].payload.revenue), color: 'var(--ok)' },
                  { label: 'Running costs', value: usd(payload[0].payload.om) },
                  { label: 'Loan payment', value: usd(payload[0].payload.debt) },
                  { label: 'Cash this month', value: usd(payload[0].payload.net) },
                  { label: 'Running total', value: usd(payload[0].payload.cum), color: 'var(--sun)' },
                ]} />) : null} />
              <Bar dataKey="revenue" fill="var(--ok)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line dataKey="out" stroke="var(--bad)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveChart>
        </div>
        {c.stage2 && <p className="text-sm text-muted max-w-prose">Built in {c.stage2.adds.length + 1} stages: {c.stage2.adds.map(a => `+${usd(a.capex_usd)} in year ${a.year}`).join(', ')}, each on the same loan terms with no grant. Payback over 20 years counts them all.</p>}
        {c.total < 0 && <p className="text-sm text-muted max-w-prose">Short early on because demand ramps up as homes connect. A smaller first stage (P25), a larger grant, lower build costs or a loan grace period close the gap; Compare villages shows which sites already cover their loan at these settings.</p>}
        <Legend items={[{ label: 'Money in from bills', color: 'var(--ok)' }, { label: 'Running costs plus loan payment', color: 'var(--bad)' }]} />
        <More label="What this assumes">
          <p className="text-xs text-muted max-w-prose">Expected sales across the demand range for the chosen households, rising month by month: when demand would exceed what the system makes the extra is lost, and spare capacity earns nothing; use falls a little at higher tariffs (engine). {Math.round(c.T.collection * 100)}% of bills collected; build cost from the chosen basis (2021 engine prices, or AMDA's 2024 cost per connection); running costs from the engine's cost file; a loan for 70% of the build cost left after the grant, {c.T.years} years at {Math.round(c.T.rate * 100)}%. All rough guides: replace with real quotes and a lender's terms.</p>
        </More>
        <Cite k={['amda2024', 'irena2024', 'omorate']} />
      </div>
    </>
  );
};
