import React from 'react';
import { Box, BoxHeader } from './ui';

const STEPS = [
  { t: 'Share site totals, not customers', d: 'Operators upload one row per site per month: kWh sold by customer type, number of customers, peak kW, tariff. No names, meter numbers or household rows ever leave the operator.' },
  { t: 'Hide small groups', d: 'Any figure built from fewer than 20 customers is merged or left out, so no one household can be picked out. Site locations are rounded to about 1 km.' },
  { t: 'Hold it in a neutral data trust', d: 'A neutral host, such as a developers’ association or a rural electrification agency, keeps the data under a written agreement: what it may be used for, who may see it, and when it is deleted.' },
  { t: 'Train where the data lives', d: 'For operators who will not upload at all, the model trains on their own servers and only the fitted ranges leave (federated learning). Public releases add calibrated noise (differential privacy).' },
  { t: 'Give to get', d: 'Operators who share get the calibrated model and a benchmark of their sites against peers, free. Lenders get one trusted reference instead of each developer’s own survey.' },
  { t: 'Follow the law and tell customers', d: 'Meet national data laws (for example Nigeria’s Data Protection Act 2023 and Kenya’s Data Protection Act 2019) and say on customer contracts that anonymous totals may be shared to plan new mini-grids.' },
];

const SCHEMA = `{
  "site_id": "hashed, stable per operator",
  "country": "NG",
  "location_1km": [6.85, 4.21],
  "month": "2026-09",
  "months_since_connection": 14,
  "customers": { "residential": 412, "commercial": 58, "productive_use": 6, "public": 3 },
  "kwh_sold":  { "residential": 3120, "commercial": 1890, "productive_use": 1460, "public": 410 },
  "peak_kw": 31.5,
  "tariff_usd_per_kwh": 0.42,
  "uptime_pct": 98.6
}`;

export const SharingPage: React.FC = () => (
  <>
    <Box>
      <BoxHeader title="Sharing meter data safely" meta="A proposal for operators, lenders and regulators" />
      <div className="px-5 pb-5">
        <p className="text-sm text-muted max-w-prose">
          A few hundred sites sharing monthly totals would let Kesho AI learn real ranges. Six rules keep customers and business data safe.
        </p>
        <ol className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="min-w-0 grid grid-cols-[1.75rem_minmax(0,1fr)]">
              <span className="font-display text-lg text-muted tabular-nums leading-6">{i + 1}</span>
              <span><span className="block text-sm text-fg font-medium">{s.t}</span><span className="block text-xs text-muted leading-relaxed mt-1">{s.d}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </Box>
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Box>
        <BoxHeader title="One row per site per month" meta="Example, made-up numbers" />
        <pre className="mx-5 mb-5 text-[12px] leading-relaxed bg-surface-2 border border-line rounded-ctl p-3 overflow-x-auto">{SCHEMA}</pre>
      </Box>
      <Box>
        <BoxHeader title="Who gets what" />
        <ul className="px-5 pb-5 space-y-3 text-sm">
          <li><span className="text-fg font-medium">Operators:</span> <span className="text-muted">a model tuned on real sites, peer benchmarks, fewer oversized and undersized builds.</span></li>
          <li><span className="text-fg font-medium">Lenders:</span> <span className="text-muted">a range with a track record, so uncertainty is priced on evidence, not guesswork.</span></li>
          <li><span className="text-fg font-medium">Agencies and funders:</span> <span className="text-muted">a map of likely demand for every unserved village, to plan tenders and subsidies.</span></li>
          <li><span className="text-fg font-medium">Villages:</span> <span className="text-muted">a system sized for them, with a tariff they can pay and power in the evening.</span></li>
        </ul>
      </Box>
    </div>
  </>
);
