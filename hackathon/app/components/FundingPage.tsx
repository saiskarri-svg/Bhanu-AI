import React from 'react';
import { derive, type Settings } from './settings';
import { CashFlow, LOANS } from './CashFlow';
import { Pencil } from './Pencil';
import { Payback } from './Payback';
import { conceptNote } from './conceptNote';
import { Box, BoxHeader, More, StatusDot, StatStrip, type Tone } from './ui';
import type { Engine } from './engine';
import type { SiteData } from './model';

type Kind = 'Grant per connection' | 'Subsidy' | 'Grant' | 'Investment and debt' | 'Blended finance' | 'Advice' | 'Public-private' | 'Policy';
interface Scheme { name: string; who: string; kind: Kind; what: string; fit: string; status: string; url: string }

const KIND_TONE: Record<Kind, Tone> = {
  'Grant per connection': 'ok', Subsidy: 'ok', Grant: 'ok', 'Investment and debt': 'info', 'Blended finance': 'info', 'Public-private': 'info', Advice: 'muted', Policy: 'muted',
};

// Country schemes. Nigeria rows follow Sai's shortlist (1 Nov 2026); others from public programme pages and press, checked Nov 2026.
const COUNTRY: Record<string, Scheme[]> = {
  NG: [
    { name: 'DARES (Distributed Access through Renewable Energy Scale-up)', who: 'Rural Electrification Agency, World Bank funded', kind: 'Grant per connection', what: 'Results-based incentives for eligible stand-alone solar and mini-grids, paid after installations are verified.', fit: 'Strongest fit for subsidised rural installs. Apply as an eligible developer or with an accredited one; expect technical, quality, financial and verification checks.', status: 'The central portal said applications were not being accepted. Ask about the next intake.', url: 'https://rea.gov.ng/apply' },
    { name: 'Africa Minigrids Program, Nigeria', who: 'REA with UNDP and GEF', kind: 'Grant', what: 'Grants and technical support for solar mini-grid developers, aimed at lowering cost and risk.', fit: 'Mini-grid developers; check current round and eligible states.', status: 'Check the programme site for open calls.', url: 'https://amp.gefundp.rea.gov.ng/about-us' },
    { name: 'All On', who: 'Shell-backed impact investor, Lagos', kind: 'Investment and debt', what: 'Equity and debt for commercially viable off-grid companies, including solar distribution and productive use. Interest in the Niger Delta.', fit: 'Needs a real business model, pipeline, unit economics and an affordability plan. Not a household subsidy.', status: 'Verify current funding windows.', url: 'https://www.all-on.com/' },
    { name: 'AECF Nigeria Energy Transition Challenge Fund', who: 'Africa Enterprise Challenge Fund', kind: 'Grant', what: 'Matching grants for household energy access in rural and peri-urban Nigeria; past range about EUR 100,000 to 800,000.', fit: 'Past criteria: operating Nigerian company, track record, audited accounts, matching money.', status: 'Past terms are not an open 2026 call. Ask if a new call is expected.', url: 'https://www.aecfafrica.org/approach/our-programmes/renewable-energy/household-energy-access-window/' },
    { name: 'Green Finance and Investment Facility (GFIF)', who: 'Nigerian blended-finance platform', kind: 'Blended finance', what: 'Concessional and other finance for portfolios of distributed renewable projects.', fit: 'For larger developers or a consortium bundling many villages, not a single small site.', status: 'Explore once there is a pipeline.', url: 'https://www.gfif.fund/' },
  ],
  SL: [
    { name: 'Results-based financing for solar mini-grids', who: 'Government of Sierra Leone, EU funds (EUR 20 million), run through SEforALL', kind: 'Grant per connection', what: 'Grants per verified connection for private developers; aims to connect about 35,000 households.', fit: 'Private mini-grid developers and operators. Money only after connections are verified.', status: 'Announced Jan 2025; check SEforALL for the current window.', url: 'https://www.seforall.org/news/sierra-leone-adopts-results-based-financing-mechanism-for-solar-mini-grids' },
    { name: 'SOGREA developer call', who: 'Sierra Leone Off-Grid Renewable Energy Accelerator, UNOPS', kind: 'Grant', what: 'Performance-based capital support for part of the upfront cost of green mini-grids, paid against verified milestones.', fit: 'Mini-grid developers; pre-qualification call issued in 2026.', status: 'Check UNOPS for deadlines.', url: 'https://content.unops.org/documents/libraries/press-releases/2026/en/Press-release-SOGREA-launches-call-for-private-developers-to-accelerate-rural-electrification-in-Sierra-Leone.pdf' },
  ],
  MR: [
    { name: 'Desert to Power: RIMDIR green mini-grids', who: 'African Development Bank (SEFA grant about EUR 14.4 million), with AFD and the World Bank', kind: 'Public-private', what: 'Seven hybrid solar mini-grid clusters with storage for 40 communities in Hodh El Gharbi and Hodh Echargui, built as public-private partnerships.', fit: 'Private operators bidding for the clusters; the first private-capital model in Mauritania\'s power sector.', status: 'Approved Nov 2023; check the AfDB project page for tenders.', url: 'https://ewsdata.rightsindevelopment.org/projects/p-mr-ff0-002-mauritania-desert-to-power-rimdir1-green-min/' },
    { name: 'ReTAPS technical assistance', who: 'ECREEE (ECOWAS renewable energy centre)', kind: 'Advice', what: 'Consultants to help the government plan and tender green mini-grids in rural places.', fit: 'Useful to get a site onto the government\'s mini-grid list.', status: 'Consultant call in Oct 2025.', url: 'https://www.ecreee.org/?p=36097' },
    { name: 'Africa Minigrids Program, Mauritania', who: 'UNDP and GEF', kind: 'Grant', what: 'Support for the mini-grid market: planning, finance and lower costs.', fit: 'Check the national team for developer support.', status: 'Check for open calls.', url: 'https://www.thegef.org/newsroom/publications/africa-minigrids-program' },
  ],
  KE: [
    { name: 'KOSAP (Kenya Off-grid Solar Access Project)', who: 'Ministry of Energy, Kenya Power and REREC, World Bank funded', kind: 'Public-private', what: 'Public-private contracts for about 113 solar mini-grids in 14 underserved counties, plus results-based finance for stand-alone solar and clean cooking.', fit: 'Developers in the KOSAP counties (Talek is in Narok, which is not one of them: check before applying).', status: 'Mini-grid contracts signed in 2025; ask REREC about follow-on rounds.', url: 'https://projects.worldbank.org/P160009?lang=en' },
  ],
  UG: [
    { name: 'EASP price subsidies and credit lines', who: 'UECCC, World Bank funded Electricity Access Scale-up Project', kind: 'Subsidy', what: 'Price cuts of up to about 50% on solar home systems and about 60% on productive-use equipment such as solar pumps, sold through approved companies; credit lines through banks (about USD 110 million).', fit: 'Approved energy service companies selling to households and businesses. No mini-grid subsidy was found.', status: 'Runs to June 2027.', url: 'https://www.ueccc.or.ug/?p=2637' },
  ],
  TZ: [
    { name: 'ASCENT Tanzania', who: 'Government of Tanzania, World Bank (about USD 300 million)', kind: 'Grant per connection', what: 'Results-based finance plus a short-term loan window for renewable energy companies working in rural areas.', fit: 'Mini-grid and solar companies; terms in the financing agreement.', status: 'Ask the Rural Energy Agency about windows.', url: 'https://projects.worldbank.org/en/projects-operations/project-detail/P177140' },
    { name: 'TREEP (rural electrification programme)', who: 'Rural Energy Agency (REA Tanzania), World Bank', kind: 'Public-private', what: 'National rural electrification, including mini-grid connections in its targets.', fit: 'Developers working with REA; due to close in 2026.', status: 'Check REA Tanzania for remaining support.', url: 'https://projects.worldbank.org/en/projects-operations/project-detail/P153781' },
  ],
};

const COMPACT: Record<string, string> = { NG: 'Jan 2025', TZ: 'Jan 2025', MR: 'Jan 2025', KE: 'Sep 2025', SL: 'Sep 2025' };

const AFRICA: Scheme[] = [
  { name: 'Mission 300', who: 'World Bank and African Development Bank', kind: 'Policy', what: 'Aim of connecting 300 million Africans by 2030. Each country signs a national energy compact listing reforms and projects; new World Bank and AfDB money follows those compacts.', fit: 'Ask the national electrification agency where mini-grids sit in its compact.', status: 'About 30 countries have compacts; more due in 2026.', url: 'https://www.worldbank.org/en/programs/energizing-africa/national-energy-compacts' },
  { name: 'Universal Energy Facility (UEF)', who: 'SEforALL, several donors', kind: 'Grant per connection', what: 'Grants paid per verified connection for mini-grids, stand-alone solar for productive use, and clean cooking in sub-Saharan Africa.', fit: 'Developers in the countries with an open window; first wave paid about USD 433 a connection.', status: 'Windows open country by country.', url: 'https://www.seforall.org/programmes/universal-energy-facility' },
  { name: 'Africa Minigrids Program', who: 'UNDP and the Global Environment Facility', kind: 'Grant', what: 'National programmes in about 21 countries to cut mini-grid costs: planning tools, finance, and lower-cost designs.', fit: 'Countries include Nigeria and Mauritania; national teams run calls.', status: 'Varies by country.', url: 'https://www.thegef.org/newsroom/publications/africa-minigrids-program' },
  { name: 'Sustainable Energy Fund for Africa (SEFA)', who: 'African Development Bank', kind: 'Grant', what: 'Grants and concessional finance for project preparation and green mini-grid programmes (it funds RIMDIR in Mauritania).', fit: 'Usually goes through governments or larger programmes; developers bid into what it funds.', status: 'Watch AfDB procurement.', url: 'https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/sustainable-energy-fund-for-africa' },
  { name: 'GET.invest Finance Access Advisory', who: 'EU and partners', kind: 'Advice', what: 'Free help with financial models, investment readiness and meeting lenders.', fit: 'Good while turning a Kesho AI forecast into a bankable plan. Advice, not money.', status: 'Open on a rolling basis; check eligibility.', url: 'https://www.get-invest.eu/finance-access-advisory/' },
  { name: 'Africa Enterprise Challenge Fund (AECF)', who: 'Regional challenge fund', kind: 'Grant', what: 'Matching grants and loans for energy access companies across Africa, one call at a time.', fit: 'Operating companies with accounts and matching money.', status: 'Watch for country calls.', url: 'https://www.aecfafrica.org/' },
];

const NAME: Record<string, string> = { NG: 'Nigeria', SL: 'Sierra Leone', MR: 'Mauritania', KE: 'Kenya', UG: 'Uganda', TZ: 'Tanzania' };

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const usd = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}k`;

const SchemeList: React.FC<{ items: Scheme[] }> = ({ items }) => (
  <ul className="divide-y divide-line">
    {items.map(s => (
      <li key={s.name} className="py-4 first:pt-0 last:pb-0 grid gap-x-6 gap-y-1.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0">
          <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-fg underline underline-offset-2 decoration-line hover:decoration-fg">{s.name}</a>
          <p className="text-xs text-muted mt-0.5">{s.who}</p>
          <div className="mt-1.5 text-xs text-muted"><StatusDot hang tone={KIND_TONE[s.kind]}>{s.kind}</StatusDot></div>
        </div>
        <div className="min-w-0 text-sm space-y-1">
          <p>{s.what}</p>
          <More label="Fit and status"><div className="text-xs text-muted space-y-1"><p><span className="text-fg">Fit:</span> {s.fit}</p><p><span className="text-fg">Status:</span> {s.status}</p></div></More>
        </div>
      </li>
    ))}
  </ul>
);

export const FundingPage: React.FC<{ site: SiteData; eng?: Engine; s: Settings; set: (p: Partial<Settings>) => void; goTab: (t: number, sub?: string) => void }> = ({ site, eng, s: st, set, goTab }) => {
  const cc = site.country;
  const local = COUNTRY[cc] ?? [];
  const dv = derive(eng, st);
  const p50 = dv.des ? { ...dv.des, capex_per_customer_usd: dv.des.capex_usd / Math.max(1, dv.CU?.[4].p50 ?? 1) } : undefined;
  const cust = dv.CU?.[4].p50 ?? 0;
  const sz = dv.des?.design.split(' ')[0] ?? 'P50';
  const rate = st.grant, setRate = (g: number) => set({ grant: g });
  const grant = cust * rate;
  const share = p50 ? grant / p50.capex_usd : 0;
  const t45 = eng?.tariffs.find(t => t.tariff_usd_per_kwh === 0.45);
  const t85 = eng?.tariffs.find(t => t.tariff_usd_per_kwh === 0.85);

  const READY: { t: string; tone: Tone; state: string; tab?: number }[] = [
    { t: 'Target community and number of households', tone: 'ok', state: 'Roof count plus a second count from Meta\'s population map', tab: 1 },
    { t: 'Evidence of demand', tone: 'ok', state: 'Five-year range, its drivers, and pull toward metered sites within 1,000 miles', tab: 2 },
    { t: 'System tiers: panels, inverter, battery', tone: 'ok', state: 'Four sizes with kWp, kWh, inverter kW and build cost', tab: 3 },
    { t: 'Customer affordability', tone: 'ok', state: 'Household bill and chance of covering cost at four tariffs', tab: 3 },
    { t: 'Weather risk to output', tone: 'ok', state: 'Ten real weather years and climate-model outlook', tab: 4 },
    { t: '12 to 24 month cash flow', tone: 'ok', state: 'First 24 months above, for the chosen system, tariff and grant' },
    { t: 'Payback period', tone: 'ok', state: '20-year payback for the owner and the whole project, above' },
    { t: '2-page concept note', tone: 'ok', state: 'Download below, built from these numbers' },
    { t: 'Installation and maintenance partners', tone: 'muted', state: 'From the developer; not something Kesho AI can supply' },
    { t: 'Track record and audited accounts', tone: 'muted', state: 'From the developer' },
  ];

  return (
    <>
      <Box>
        <BoxHeader title="Who could pay for it" meta={`Funding routes for ${site.name}, ${NAME[cc] ?? cc}, and across Africa`} />
        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-muted max-w-prose">Grants, subsidies, loans and advice that can share the upfront cost.</p>
          <More label="Before you apply"><p className="text-xs text-muted max-w-prose">These are potential partners, not approvals or open calls. Confirm the live status, eligible equipment, places covered, matching money and payment timing with each one. Amounts are rough guides.</p></More>
          {eng && p50 && (
            <StatStrip stats={[
              { label: `${sz} build cost (rough)`, value: usd(p50.capex_usd), note: `${n0(p50.pv_kwp)} kWp, ${n0(p50.battery_kwh)} kWh` },
              { label: 'Customers by year 5', value: n0(cust), note: `$${n0(p50.capex_per_customer_usd)} a customer` },
              { label: 'Covers cost at $0.85/kWh', value: t85 ? `${Math.round(t85.p_revenue_covers_cost_year5 * 100)}%` : '-', note: 'of futures, no grant' },
              { label: 'Covers cost at $0.45/kWh', value: t45 ? `${Math.round(t45.p_revenue_covers_cost_year5 * 100)}%` : '-', note: 'of futures, no grant' },
            ]} />
          )}
        </div>
      </Box>

      {eng && p50 && (
        <Box>
          <BoxHeader title="What a grant per connection would cover" meta="Rough guide" />
          <div className="px-5 pb-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted">Grant per connection</span>
              <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Grant per connection">
                {[...new Set([0, 250, 433, 600, 800, rate])].sort((a, b) => a - b).map(r => (
                  <button key={r} role="radio" aria-checked={rate === r} onClick={() => setRate(r)}
                    className={`h-8 px-3 text-xs tabular-nums ${rate === r ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{r === 0 ? 'None' : `$${n0(r)}`}</button>
                ))}
              </div>
              <span className="text-xs text-muted ml-2">Loan</span>
              <div className="flex rounded-ctl border border-line overflow-hidden" role="radiogroup" aria-label="Loan terms">
                {(Object.keys(LOANS) as (keyof typeof LOANS)[]).map(k => (
                  <button key={k} role="radio" aria-checked={st.loan === k} onClick={() => set({ loan: k })}
                    className={`h-8 px-3 text-xs ${st.loan === k ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{LOANS[k].label} {Math.round(LOANS[k].rate * 100)}%</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted">Grant for {n0(cust)} connections</p><p className="font-display text-2xl tabular-nums text-ok">{usd(grant)}</p></div>
              <div><p className="text-xs text-muted">Share of the {sz} build cost</p><p className="font-display text-2xl tabular-nums">{Math.round(share * 100)}%</p></div>
              <div><p className="text-xs text-muted">Left for the developer and lenders</p><p className="font-display text-2xl tabular-nums">{usd(Math.max(0, p50.capex_usd - grant))}</p></div>
            </div>
            <div className="h-2 rounded-full bg-line overflow-hidden" aria-hidden><div className="h-full bg-ok" style={{ width: `${Math.min(100, share * 100)}%` }} /></div>
            <More label="About the $433 rate"><p className="text-xs text-muted max-w-prose">
              $433 is what the Universal Energy Facility paid per connection in its first wave in Sierra Leone and Madagascar; it is a past rate, not an offer. Grants paid per connection reward signing people up, so the year-5 customer count from the Demand tab matters as much as the build cost. The grant lowers the money to repay, which is what lets a lower tariff cover cost.
            </p></More>
          </div>
        </Box>
      )}

      {eng && p50 && <Box><CashFlow eng={eng} s={st} grant={grant} /></Box>}
      {eng && p50 && <Payback eng={eng} s={st} />}
      {eng && p50 && <Pencil eng={eng} s={st} set={set} />}

      <Box>
        <BoxHeader title={`In ${NAME[cc] ?? cc}`} meta={COMPACT[cc] ? `Mission 300 energy compact presented ${COMPACT[cc]}` : 'No Mission 300 compact confirmed'} />
        <div className="px-5 pb-5 pt-2">
          {local.length ? <SchemeList items={local} /> : <p className="text-sm text-muted">No country programmes listed yet for this location; see the Africa-wide routes below.</p>}
        </div>
      </Box>

      <Box>
        <BoxHeader title="Across Africa" meta="Open to several countries" />
        <div className="px-5 pb-5 pt-2"><SchemeList items={AFRICA} /></div>
      </Box>

      <Box>
        <BoxHeader title="What funders ask for" meta="And what Kesho AI already gives" />
        <div className="px-5 pb-5 space-y-4">
          <ul className="divide-y divide-line">
            {READY.map(r => (
              <li key={r.t} className="py-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] text-sm">
                <span>{r.t}</span>
                <span className="flex items-start gap-2 min-w-0">
                  <StatusDot tone={r.tone}>{r.tone === 'ok' ? 'Ready' : r.tone === 'warn' ? 'Partly' : 'Developer'}</StatusDot>
                  <span className="text-xs text-muted">{r.state}{r.tab !== undefined && <> · <button onClick={() => goTab(r.tab!, r.tab === 3 ? "size" : undefined)} className="underline underline-offset-2 hover:text-fg">open</button></>}</span>
                </span>
              </li>
            ))}
          </ul>
          {eng && p50 && <button onClick={() => conceptNote(site, eng, st, grant, rate, [...local, ...AFRICA.slice(0, 3)].map(x => `${x.name} (${x.who}): ${x.kind.toLowerCase()}`), NAME[cc] ?? cc)} className="h-10 px-4 rounded-ctl bg-accent text-[#131316] text-sm font-medium hover:brightness-105">Download concept note (PDF)</button>}
          <More label="A suggested order"><div className="text-sm space-y-1.5 max-w-prose">
                        <p className="text-muted">1. Results-based grants first (the national agency and the Universal Energy Facility), since they pay per connection and fit village mini-grids. 2. Free advice (GET.invest) to turn the forecast and sizing into a bankable plan. 3. Investors and lenders (All On in Nigeria, AECF calls) once there is a pipeline. 4. Bundle several villages into one portfolio for blended-finance platforms such as GFIF: Kesho AI can run the same forecast for each village. Do not promise a subsidy to a village before it is formally approved.</p>
          </div></More>
        </div>
      </Box>
    </>
  );
};
