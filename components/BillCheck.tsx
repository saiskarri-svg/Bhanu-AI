import React, { useState } from 'react';
import { SystemConfig } from '../types';
import { Cite } from './Sources';
import { SEASONAL_YIELDS, MONTHS, calculateIndianSubsidy } from '../constants';
import { Box, BoxHeader, StatusDot, CHART, ResponsiveChart, CountUp } from './ui';

const EXPORT_RATE = 3; // ₹ per extra unit credited, varies by DISCOM

const field = 'h-9 w-full bg-bg border border-line rounded-ctl px-3 text-sm text-fg tabular-nums focus:outline-none focus:border-silver';

const BillCheck: React.FC<{ config: SystemConfig; annualGen: number }> = ({ config, annualGen }) => {
  const [month, setMonth] = useState(2);
  const [units, setUnits] = useState(650);
  const [amount, setAmount] = useState(5200);

  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
  const rate = units > 0 ? amount / units : config.unitPrice;
  const solar = annualGen * SEASONAL_YIELDS[month];
  const net = units - solar;
  const newBill = net >= 0 ? net * rate : 0;
  const credit = net < 0 ? -net * EXPORT_RATE : 0;
  const saved = amount - newBill + credit;
  const sub = calculateIndianSubsidy(config.systemSize, config.state, config.grant);
  const cost = config.systemSize * config.costPerKw;

  return (
    <Box>
      <BoxHeader title="Check a real bill" meta={`${config.systemSize} kWp system`} />
      <p className="px-5 text-sm text-muted max-w-prose">
        Type in the units and amount from one of the school's DISCOM bills. See what it would have been with solar.
      </p>

      <div className="px-5 pt-4 grid sm:grid-cols-3 gap-4 max-w-3xl">
        <div>
          <label htmlFor="bill-month" className="block text-xs text-muted mb-1">Bill month</label>
          <select id="bill-month" value={month} onChange={e => setMonth(Number(e.target.value))} className={field}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bill-units" className="block text-xs text-muted mb-1">Units used (kWh)</label>
          <input id="bill-units" type="number" min={0} value={units} onChange={e => setUnits(Math.max(0, Number(e.target.value)))} className={field} />
        </div>
        <div>
          <label htmlFor="bill-amount" className="block text-xs text-muted mb-1">Bill amount (₹)</label>
          <input id="bill-amount" type="number" min={0} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} className={field} />
        </div>
      </div>

      <div className="m-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-box overflow-hidden">
        {[
          { l: 'You pay per unit', v: `₹${rate.toFixed(2)}`, s: 'Bill amount ÷ units, including fixed charges' },
          { l: `Solar in ${MONTHS[month]}`, v: `${Math.round(solar)} kWh`, s: `From the ${config.systemSize} kWp system`, c: CHART.sun },
          { l: 'Bill with solar', v: inr(newBill), s: net >= 0 ? `${Math.round(net)} units still bought` : `${Math.round(-net)} extra units sent to the grid` },
          { l: 'Saved this month', v: inr(saved), s: credit ? `Includes about ${inr(credit)} export credit` : `${amount > 0 ? Math.round((saved / amount) * 100) : 0}% off the bill`, c: CHART.positive },
        ].map(x => (
          <div key={x.l} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{x.l}</p>
            <p className="mt-1 font-display font-semibold text-[22px] leading-none tabular-nums" style={{ color: x.c }}><CountUp value={x.v} /></p>
            <p className="mt-1.5 text-xs text-muted">{x.s}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 grid md:grid-cols-2 gap-5">
        <div>
          <p className="text-xs text-muted mb-2">Cost and grants for this system</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between gap-4"><span className="text-muted">System cost</span><span className="tabular-nums">{inr(cost)}</span></li>
            <li className="flex justify-between gap-4"><span className="text-muted">Central rooftop subsidy<Cite id={['rts2', 'rts2-guideline']} /></span><span className="tabular-nums text-muted">None for schools</span></li>
            <li className="flex justify-between gap-4"><span className="text-muted">Grants secured (set in site settings)</span><span className="tabular-nums">−{inr(sub.totalSubsidy)}</span></li>
            <li className="flex justify-between gap-4 border-t border-line pt-1.5"><span className="text-fg">School pays</span><span className="tabular-nums text-fg font-medium">{inr(Math.max(0, cost - sub.totalSubsidy))}</span></li>
          </ul>
        </div>
        <div className="text-sm text-muted leading-relaxed space-y-2">
          <p><StatusDot tone="info" className="text-fg">How net metering works</StatusDot></p>
          <p>The meter counts units in both directions. In sunny months the school can send more than it uses. Units sent out first cancel units the school buys. Any surplus left at the year end is usually paid at about ₹{EXPORT_RATE} a unit, less than the tariff<Cite id={['export-rate', 'net-metering']} />.</p>
          <p className="text-xs">PM Surya Ghar's subsidy is for homes. Government schools can get rooftop solar through its government buildings programme, usually run by a RESCO or the DISCOM with little or no upfront cost<Cite id="psg-gov" />, or through state schemes and CSR. Check with your DISCOM.</p>
        </div>
      </div>
    </Box>
  );
};

export default BillCheck;
