import React, { useEffect, useMemo, useState } from 'react';
import { SystemConfig } from '../types';
import { STATE_YIELDS, STATE_LAT, calculateIndianSubsidy } from '../constants';
import { RoofPlanner, BatteryPlanner } from './SizingExtras';
import { markDone } from './runtime';
import { Box, BoxHeader, StatusDot, CHART, btn } from './ui';
import { Cite } from './Sources';
import { PANEL } from './Electricity';

// ---------- 1. Energy audit ----------

interface Appliance {
  id: string;
  name: string;
  watts: number;
  qty: number;
  hours: number;
  kind?: string;
}

const DEFAULTS: Appliance[] = [
  { id: 'tube', kind: 'tube', name: 'LED tube lights', watts: 20, qty: 40, hours: 6 },
  { id: 'fan', kind: 'fan', name: 'Ceiling fans', watts: 60, qty: 20, hours: 6 },
  { id: 'pc', kind: 'pc', name: 'Computers', watts: 100, qty: 10, hours: 4 },
  { id: 'proj', kind: 'proj', name: 'Projector', watts: 250, qty: 1, hours: 2 },
  { id: 'pump', kind: 'pump', name: 'Water pump (1 HP)', watts: 750, qty: 1, hours: 1 },
  { id: 'ro', kind: 'ro', name: 'Drinking water purifier', watts: 60, qty: 1, hours: 4 },
  { id: 'wifi', kind: 'wifi', name: 'Wi-Fi router', watts: 10, qty: 1, hours: 8 },
  { id: 'outdoor', kind: 'outdoor', name: 'Outdoor lights (night)', watts: 20, qty: 4, hours: 12 },
];

const TIPS: Record<string, string> = {
  tube: 'Already LED. Switch them off in empty rooms and use daylight near windows.',
  fan: 'BLDC fans use about 30 W instead of 70 to 75 W for an old fan, which would more than halve this.',
  pc: 'Set computers to sleep after 10 minutes and switch monitors off at lunch.',
  proj: 'Switch the projector off between lessons. It uses a lot while idle.',
  pump: 'Run the pump around noon, when the panels make the most power.',
  ro: 'Fine as it is. Keep the filters clean so it does not run longer than needed.',
  outdoor: 'Night lights run on grid power. A motion sensor or timer would cut this.',
};

const STORE_KEY = 'bhanu-audit';
const readAudit = (): { rows: Appliance[]; days: number } | null => {
  try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
};

const num = 'h-8 w-full bg-bg border border-line rounded-ctl px-2 text-sm text-fg tabular-nums text-right focus:outline-none focus:border-silver';

// ---------- 2. Sizing ----------

const INVERTER_SIZES = [1, 2, 3, 3.6, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const MAX_PER_STRING = Math.floor(600 / (PANEL.voc * 1.04)); // cold morning limit
const EXPORT_RATE = 3; // ₹ per kWh credited for extra units sent to the grid
const AREA_PER_KWP = 10; // m² of shadow free roof per kWp (MNRE guide)

const Sizing: React.FC<{ config: SystemConfig; setConfig: React.Dispatch<React.SetStateAction<SystemConfig>> }> = ({ config, setConfig }) => {
  const saved = readAudit();
  const [rows, setRows] = useState<Appliance[]>(saved?.rows ?? DEFAULTS);
  const [days, setDays] = useState(saved?.days ?? 230);
  const [coverage, setCoverage] = useState(100);
  const [roof, setRoof] = useState(300);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ rows, days })); } catch { /* storage may be blocked */ }
  }, [rows, days]);

  const update = (id: string, patch: Partial<Appliance>) => setRows(r => r.map(a => (a.id === id ? { ...a, ...patch } : a)));
  const daily = (a: Appliance) => (a.watts * a.qty * a.hours) / 1000;
  const totalDaily = rows.reduce((s, a) => s + daily(a), 0);
  const peakKw = rows.reduce((s, a) => s + a.watts * a.qty, 0) / 1000;
  const annual = totalDaily * days;
  const top = [...rows].sort((a, b) => daily(b) - daily(a)).filter(a => daily(a) > 0).slice(0, 3);

  const yieldPerKwp = STATE_YIELDS[config.state] || 1450;

  const plan = useMemo(() => {
    const neededKwp = (annual * coverage) / 100 / yieldPerKwp;
    const panels = Math.max(2, Math.ceil((neededKwp * 1000) / PANEL.watts));
    const kwp = (panels * PANEL.watts) / 1000;
    const inverter = INVERTER_SIZES.find(s => s >= kwp * 0.9) ?? INVERTER_SIZES[INVERTER_SIZES.length - 1];
    const strings = Math.max(1, Math.ceil(panels / MAX_PER_STRING));
    const base = Math.floor(panels / strings);
    const extra = panels % strings;
    const layout = Array.from({ length: strings }, (_, i) => base + (i < extra ? 1 : 0));
    const area = kwp * AREA_PER_KWP;
    const gen = kwp * yieldPerKwp;
    const cost = kwp * config.costPerKw;
    const subsidy = calculateIndianSubsidy(kwp, config.state).totalSubsidy;
    const net = Math.max(0, cost - subsidy);
    const savings = Math.min(gen, annual) * config.unitPrice + Math.max(0, gen - annual) * EXPORT_RATE;
    const payback = savings > 0 ? net / savings : Infinity;
    return { neededKwp, panels, kwp, inverter, layout, area, gen, cost, subsidy, net, savings, payback };
  }, [annual, coverage, yieldPerKwp, config.costPerKw, config.state, config.unitPrice]);

  const currentCover = annual > 0 ? Math.round(((config.systemSize * yieldPerKwp) / annual) * 100) : 0;
  const roofOk = plan.area <= roof;
  const sizeForSettings = Math.min(30, Math.max(1, Math.ceil(plan.kwp * 2) / 2));
  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* Audit */}
      <Box>
        <BoxHeader title="Step 1: How much energy does the school use?" meta={`${rows.length} items`} />
        <p className="px-5 text-sm text-muted max-w-prose">
          Walk around the school and count every appliance. Check the watts on its label and estimate how many hours a day it runs. Change any number below.
        </p>

        <div className="mt-4 border-t border-line">
          <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_88px_88px_88px_96px_minmax(0,1fr)_36px] gap-3 px-5 py-2 text-xs text-muted">
            <span>Appliance</span><span className="text-right">Watts each</span><span className="text-right">How many</span><span className="text-right">Hours a day</span><span className="text-right">kWh a day</span><span>Share</span><span />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {rows.map(a => {
              const kwh = daily(a);
              const share = totalDaily > 0 ? kwh / totalDaily : 0;
              return (
                <li key={a.id} className="px-5 py-3 grid grid-cols-3 md:grid-cols-[minmax(0,1.6fr)_88px_88px_88px_96px_minmax(0,1fr)_36px] gap-x-3 gap-y-2 items-center">
                  <input
                    aria-label="Appliance name"
                    value={a.name}
                    onChange={e => update(a.id, { name: e.target.value })}
                    className="col-span-2 md:col-span-1 h-8 bg-transparent border border-transparent hover:border-line focus:border-silver rounded-ctl px-2 -mx-2 text-sm text-fg focus:outline-none"
                  />
                  <button
                    onClick={() => setRows(r => r.filter(x => x.id !== a.id))}
                    aria-label={`Remove ${a.name}`}
                    className="md:order-last justify-self-end h-8 w-8 rounded-ctl text-muted hover:text-fg hover:bg-surface-2 flex items-center justify-center"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  </button>
                  <label className="block"><span className="md:hidden text-xs text-muted">Watts</span>
                    <input type="number" min={0} value={a.watts} onChange={e => update(a.id, { watts: Math.max(0, Number(e.target.value)) })} className={num} />
                  </label>
                  <label className="block"><span className="md:hidden text-xs text-muted">How many</span>
                    <input type="number" min={0} value={a.qty} onChange={e => update(a.id, { qty: Math.max(0, Number(e.target.value)) })} className={num} />
                  </label>
                  <label className="block"><span className="md:hidden text-xs text-muted">Hours a day</span>
                    <input type="number" min={0} max={24} step={0.5} value={a.hours} onChange={e => update(a.id, { hours: Math.min(24, Math.max(0, Number(e.target.value))) })} className={num} />
                  </label>
                  <p className="col-span-2 md:col-span-1 text-sm text-fg tabular-nums md:text-right">{kwh.toFixed(2)} <span className="text-muted text-xs">kWh</span></p>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: CHART.sun }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-5 py-3 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setRows(r => [...r, { id: `c${Date.now()}`, name: 'New appliance', watts: 100, qty: 1, hours: 2 }])}
              className={btn.quiet}
            >
              + Add an appliance
            </button>
            <button onClick={() => setRows(DEFAULTS)} className={btn.quiet}>Reset to the sample school</button>
          </div>
        </div>

        <div className="m-5 mt-0 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">Energy a school day</p>
            <p className="mt-1"><span className="font-display font-semibold text-2xl tabular-nums" style={{ color: CHART.sun }}>{totalDaily.toFixed(1)}</span> <span className="text-xs text-muted">kWh</span></p>
          </div>
          <div className="bg-surface px-4 py-3">
            <label htmlFor="audit-days" className="block text-xs text-muted">School days a year</label>
            <input id="audit-days" type="number" min={1} max={365} value={days} onChange={e => setDays(Math.min(365, Math.max(1, Number(e.target.value))))} className="mt-1 h-8 w-24 bg-bg border border-line rounded-ctl px-2 text-sm text-fg tabular-nums focus:outline-none focus:border-silver" />
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">Energy a year</p>
            <p className="mt-1"><span className="font-display font-semibold text-2xl tabular-nums">{Math.round(annual).toLocaleString('en-IN')}</span> <span className="text-xs text-muted">kWh</span></p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">Everything on at once</p>
            <p className="mt-1"><span className="font-display font-semibold text-2xl tabular-nums">{peakKw.toFixed(1)}</span> <span className="text-xs text-muted">kW peak load</span></p>
          </div>
        </div>

        {top.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-xs text-muted mb-2">Biggest users and how to save</p>
            <ul className="space-y-2">
              {top.map(a => (
                <li key={a.id} className="text-sm leading-relaxed">
                  <span className="text-fg font-medium">{a.name}</span>
                  <span className="text-muted tabular-nums"> · {Math.round((daily(a) / totalDaily) * 100)}% of use. </span>
                  <span className="text-muted">{TIPS[a.kind ?? ''] ?? 'Check that it is switched off when not needed.'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Box>

      {/* Sizing */}
      <Box>
        <BoxHeader title="Step 2: What size system does it need?" meta={`${config.state} · ${yieldPerKwp.toLocaleString()} kWh per kWp a year`} />
        <p className="px-5 text-sm text-muted max-w-prose">
          Each kW of panels in {config.state} makes about {yieldPerKwp.toLocaleString()} kWh a year. With net metering, power made on holidays and weekends is credited too.
        </p>

        <div className="px-5 pt-4 grid sm:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="size-cover" className="text-xs text-muted">Share of the school's energy to cover</label>
              <span className="text-xs text-fg tabular-nums">{coverage}%</span>
            </div>
            <input id="size-cover" type="range" min={30} max={150} step={5} value={coverage} onChange={e => setCoverage(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="size-roof" className="text-xs text-muted">Shadow free roof area</label>
              <span className="text-xs text-fg tabular-nums">{roof} m²</span>
            </div>
            <input id="size-roof" type="range" min={20} max={1000} step={10} value={roof} onChange={e => setRoof(Number(e.target.value))} className="w-full" />
          </div>
        </div>

        <div className="m-5 grid grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line rounded-box overflow-hidden">
          <div className="col-span-2 lg:col-span-5 bg-surface px-5 py-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
            <p className="text-xs text-muted">Recommended system</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display font-semibold text-[44px] leading-none tabular-nums" style={{ color: CHART.sun }}>{plan.kwp.toFixed(2)}</span>
              <span className="text-sm text-muted">kWp</span>
            </p>
            <p className="mt-2 text-sm text-muted">{plan.panels} panels of {PANEL.watts} W, making about {Math.round(plan.gen).toLocaleString('en-IN')} kWh a year.</p>
            <p className="mt-1 text-xs text-muted">The exact need is {plan.neededKwp.toFixed(2)} kWp, rounded up to whole panels.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setConfig(c => ({ ...c, systemSize: sizeForSettings })); setApplied(true); markDone('audit'); setTimeout(() => setApplied(false), 2500); }}
                className={btn.primary}
              >
                Use {sizeForSettings} kWp for this site
              </button>
              {applied && <span className="text-xs text-ok" role="status">Site settings updated</span>}
            </div>
          </div>
          {[
            { l: 'Inverter', v: `${plan.inverter} kW`, s: `DC to AC ratio ${(plan.kwp / plan.inverter).toFixed(2)}` },
            { l: 'Wiring', v: `${plan.layout.length} string${plan.layout.length > 1 ? 's' : ''}`, s: plan.layout.map(n => `${n} panels`).join(' + ') + ` · ${Math.max(...plan.layout) * PANEL.vmp > 0 ? Math.round(Math.max(...plan.layout) * PANEL.vmp) : 0} V` },
            { l: 'Roof needed', v: `${Math.round(plan.area)} m²`, s: roofOk ? `Fits in your ${roof} m²` : `Only ${roof} m² free`, tone: roofOk ? 'ok' : 'bad' },
            { l: 'Cost after subsidy', v: inr(plan.net), s: `${inr(plan.cost)} minus ${inr(plan.subsidy)} subsidy` },
            { l: 'Saved each year', v: inr(plan.savings), s: Number.isFinite(plan.payback) ? `Pays back in about ${plan.payback.toFixed(1)} years` : 'No savings' },
          ].map(x => (
            <div key={x.l} className="bg-surface px-5 py-4">
              <p className="text-xs text-muted">{x.l}</p>
              <p className="mt-1 font-display font-semibold text-[22px] leading-none tabular-nums">{x.v}</p>
              <p className="mt-1.5 text-xs text-muted">
                {x.tone ? <StatusDot tone={x.tone as 'ok' | 'bad'} className={x.tone === 'ok' ? 'text-ok' : 'text-bad'}>{x.s}</StatusDot> : x.s}
              </p>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 space-y-1.5 text-sm">
          <p>
            <StatusDot tone={currentCover >= 90 ? 'ok' : currentCover >= 60 ? 'warn' : 'bad'} className="text-fg">
              The current {config.systemSize} kWp system covers about {currentCover}% of this school's use.
            </StatusDot>
          </p>
          {!roofOk && <p className="text-muted">The roof is too small for full coverage. Lower the share to cover, or add panels over a car park or walkway.</p>}
          {plan.kwp > 10 && <p className="text-muted">Larger systems, often above 5 to 10 kW depending on the DISCOM, need a three phase connection and approval for a larger net meter.</p>}
          <p className="text-xs text-muted">Export credit is taken as ₹{EXPORT_RATE} per extra unit; the real rate depends on the DISCOM<Cite id="export-rate" />. Roof area uses about {AREA_PER_KWP} m² per kWp<Cite id="area" />. Three phase limits vary by DISCOM<Cite id="three-phase" />. Fan wattages<Cite id="bldc" />.</p>
        </div>
      </Box>

      <RoofPlanner needed={plan.panels} lat={STATE_LAT[config.state] ?? 20} />
      <BatteryPlanner dailyKwh={totalDaily} peakKw={peakKw} kwp={plan.kwp} costPerKw={config.costPerKw} />
    </div>
  );
};

export default Sizing;
