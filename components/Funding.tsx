import React from 'react';
import { SystemConfig } from '../types';
import { Box, BoxHeader, StatusDot, btn } from './ui';
import { FUNDING_NATIONAL, FUNDING_STATES, FUNDING_CHECKED, FundingItem } from './fundingData';

// Where a school can find money for solar: the selected state's agency and
// schemes, then national routes. Each item links to the source it came from.

const STATUS: Record<NonNullable<FundingItem['status']>, { tone: 'ok' | 'muted' | 'warn'; label: string }> = {
  current: { tone: 'ok', label: 'Running' },
  past: { tone: 'muted', label: 'Past scheme' },
  unclear: { tone: 'warn', label: 'Check if still open' },
};

const Item: React.FC<{ f: FundingItem }> = ({ f }) => (
  <li className="py-3">
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm text-fg font-medium">{f.name}</span>
      {f.status && (
        <StatusDot tone={STATUS[f.status].tone} className={`text-xs ${f.status === 'current' ? 'text-ok' : f.status === 'unclear' ? 'text-warn' : 'text-muted'}`}>
          {STATUS[f.status].label}
        </StatusDot>
      )}
    </p>
    <p className="mt-1 text-sm text-muted leading-relaxed">{f.what}</p>
    {(f.who || f.amount) && (
      <p className="mt-1 text-xs text-muted leading-relaxed">
        {f.who && <span><span className="text-silver">Ask:</span> {f.who}</span>}
        {f.who && f.amount && <span> · </span>}
        {f.amount && <span><span className="text-silver">Amount:</span> {f.amount}</span>}
      </p>
    )}
    {f.url && (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-silver underline decoration-line underline-offset-2 hover:text-fg">
        Source: {f.publisher || f.source}
      </a>
    )}
  </li>
);

export const Funding: React.FC<{ config: SystemConfig }> = ({ config }) => {
  const st = FUNDING_STATES[config.state];
  const schemes = st?.schemes ?? [];
  const [allNational, setAllNational] = React.useState(false);
  const national = allNational ? FUNDING_NATIONAL : FUNDING_NATIONAL.slice(0, 3);
  return (
    <Box>
      <BoxHeader title={`Funding for schools in ${config.state}`} meta="Rough guide · check before applying" />
      <p className="px-5 text-sm text-muted max-w-prose">
        Schools do not get the household rooftop subsidy, but there are other ways to pay. Start with the state agency, then the national routes. Change the state in the site settings on Overview to see another state.
      </p>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 border-t border-line lg:divide-x divide-line">
        <section aria-label={`${config.state} options`} className="px-5 pt-4 pb-2">
          <h3 className="text-xs text-muted uppercase tracking-wide">In {config.state}</h3>
          {st?.agency && (
            <div className="mt-3 rounded-ctl border border-line bg-surface-2 px-4 py-3">
              <p className="text-xs text-muted">State solar agency</p>
              <p className="text-sm text-fg">{st.agency.name}</p>
              {st.agency.url && (
                <a href={st.agency.url} target="_blank" rel="noopener noreferrer" className="text-xs text-silver underline decoration-line underline-offset-2 hover:text-fg">
                  Visit the agency's website
                </a>
              )}
            </div>
          )}
          {schemes.length ? (
            <ul className="mt-1 divide-y divide-line">{schemes.map(f => <Item key={f.name} f={f} />)}</ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No school solar scheme was found for {config.state}. {st?.agency ? `Ask ${st.agency.name} about rooftop solar for government buildings.` : 'Ask the state renewable energy agency about rooftop solar for government buildings.'}
            </p>
          )}
          {st?.netMetering && (
            <p className="mt-2 mb-3 text-xs text-muted leading-relaxed">
              <span className="text-silver">Net metering:</span> {st.netMetering.text}
              {st.netMetering.url && <> <a href={st.netMetering.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2 hover:text-fg">Source</a></>}
            </p>
          )}
        </section>

        <section aria-label="National options" className="px-5 pt-4 pb-2 border-t lg:border-t-0 border-line">
          <h3 className="text-xs text-muted uppercase tracking-wide">Across India</h3>
          <ul className="mt-1 divide-y divide-line">{national.map(f => <Item key={f.name} f={f} />)}</ul>
          {FUNDING_NATIONAL.length > 3 && (
            <button onClick={() => setAllNational(v => !v)} aria-expanded={allNational} className={`${btn.quiet} mb-3 -ml-2`}>
              {allNational ? 'Show fewer' : `Show ${FUNDING_NATIONAL.length - 3} more ways`}
            </button>
          )}
        </section>
      </div>

      <p className="px-5 py-3 border-t border-line text-xs text-muted">
        Gathered in {FUNDING_CHECKED} from official pages and news reports. Schemes, amounts and rules change, so open the source and confirm with the office before applying. Once money is promised, enter it as "Grants secured" in the site settings.
      </p>
    </Box>
  );
};
