import React from 'react';
import { Box, BoxHeader, TINT } from './ui';
import { Cite } from './Sources';

const GROUPS: { title: string; tint: string; items: { code: string; name: string; site: string; src: string }[] }[] = [
  {
    title: 'Panels and parts', tint: TINT.sun, items: [
      { src: 'std-goods', code: 'IS 14286 / IEC 61215', name: 'Panel design and performance', site: 'The panel has passed heat, hail, damp and UV tests. Look for it on the label.' },
      { src: 'std-goods', code: 'IS/IEC 61730', name: 'Panel safety', site: 'The panel will not shock or catch fire under normal faults.' },
      { src: 'bis-list', code: 'IEC 62852', name: 'DC connectors (MC4)', site: 'Use matching connectors from one maker. Mixing brands can overheat.' },
      { src: 'bis-list', code: 'IEC 62930', name: 'Solar DC cable', site: 'UV and heat resistant cable made for rooftops, not ordinary house wire.' },
      { src: 'almm', code: 'ALMM (MNRE)', name: 'Approved list of models and makers', site: 'Government-backed and net metered projects must use panels from this list.' },
    ],
  },
  {
    title: 'Inverters and the grid', tint: TINT.sky, items: [
      { src: 'std-goods', code: 'IS 16221 / IEC 62109', name: 'Inverter safety', site: 'The inverter is safe to touch from outside and protects against faults inside.' },
      { src: 'std-goods', code: 'IS 16169 / IEC 62116', name: 'Anti-islanding test', site: 'The inverter switches off when the grid fails, so line workers are safe.' },
      { src: 'cea-connect', code: 'CEA Connectivity Regulations (2013, amended 2019)', name: 'Connecting rooftop solar to the grid', site: 'Sets the protection, metering and approvals the DISCOM checks before connection.' },
    ],
  },
  {
    title: 'Electrical safety', tint: TINT.violet, items: [
      { src: 'cea-safety', code: 'CEA Safety Regulations, 2023', name: 'Measures relating to safety and electric supply', site: 'Only licensed people work on live installations. Isolation, earthing and signage are required.' },
      { src: 'bis-list', code: 'IS 3043', name: 'Code of practice for earthing', site: 'How earth pits are built and tested. Test them every year.' },
      { src: 'bis-list', code: 'IS/IEC 62305', name: 'Lightning protection', site: 'Rooftop arrays need an arrester and a down conductor to an earth pit.' },
    ],
  },
];

const Standards: React.FC = () => (
  <Box>
    <BoxHeader title="Rules and standards" meta="India" />
    <p className="px-5 text-sm text-muted max-w-prose">
      Every part of a safe system follows a standard. Installers and DISCOM inspectors check these. Students do not need to learn the numbers, only what they mean.
    </p>
    <div className="mt-4 border-t border-line">
      {GROUPS.map(g => (
        <section key={g.title} className="border-b border-line last:border-b-0">
          <h4 className="px-5 pt-4 pb-1 text-xs text-muted flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: g.tint }} aria-hidden="true" />
            {g.title}
          </h4>
          <ul className="divide-y divide-line">
            {g.items.map(it => (
              <li key={it.code} className="px-5 py-3 grid md:grid-cols-[260px_minmax(0,1fr)] gap-x-6 gap-y-0.5">
                <div>
                  <p className="text-sm font-medium text-fg">{it.name}</p>
                  <p className="text-xs text-muted tabular-nums">{it.code}<Cite id={it.src} /></p>
                </div>
                <p className="text-sm text-muted leading-relaxed">{it.site}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
    <p className="px-5 py-3 border-t border-line text-xs text-muted">Standards are revised from time to time. Check the latest versions with BIS, MNRE and the CEA before relying on them.</p>
  </Box>
);

export default Standards;
