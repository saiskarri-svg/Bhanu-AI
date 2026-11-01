import React, { useMemo, useState } from 'react';
import { BackToTop, useEdgeFade, SunMark, More } from './components/ui';
import { SITES } from './components/sites';
import type { SiteData } from './components/model';
import { classify, draws, estimate, growth, summarise } from './components/model';
import { ENGINE } from './components/engine';
import { FLAG } from './components/sites';
import { SitePage, SitePicker } from './components/SitePage';
import { DemandPage } from './components/DemandPage';
import { GrowthPage } from './components/GrowthPage';
import { ValidationPage } from './components/ValidationPage';
import { SharingPage } from './components/SharingPage';
import { FundingPage } from './components/FundingPage';
import { useSettings, SettingsBar, JumpLinks, PhoneBar } from './components/settings';
import { Compare } from './components/Compare';
import { MapView } from './components/MapView';
import { WeatherPage } from './components/WeatherPage';
import { MethodPage } from './components/MethodPage';

const TABS = ['Map', 'Site', 'Demand', 'Money', 'Sun and weather', 'Trust'] as const;
const HASH = ['map', 'site', 'demand', 'money', 'weather', 'trust'];
// Old links still work: they open the tab and section that replaced them
const ALIAS: Record<string, [number, string]> = { growth: [3, 'size'], funding: [3, 'funding'], validation: [5, 'checks'], 'data-sharing': [5, 'sharing'], method: [5, 'method'] };
const MONEY = [['size', 'Size and tariff'], ['funding', 'Funding'], ['compare', 'Compare villages']] as const;
const TRUST = [['checks', 'Checks'], ['sharing', 'Data sharing'], ['method', 'Method and sources']] as const;

type Theme = 'system' | 'light' | 'dark';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const applyTheme = (t: Theme) => { if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); };

const ThemeToggle: React.FC = () => {
  const [t, setT] = useState<Theme>(() => (store.get('gs-theme') as Theme) || 'system');
  React.useEffect(() => { applyTheme(t); store.set('gs-theme', t); }, [t]);
  const dark = t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  return (
    <button onClick={() => setT(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}
      className="h-9 w-9 grid place-items-center rounded-ctl border border-line bg-surface-2 text-fg hover:bg-line">
      {dark
        ? <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></svg>
        : <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 107 7z" /></svg>}
    </button>
  );
};


const NoEngine: React.FC = () => (
  <div className="bg-surface border border-line rounded-box px-5 py-4 text-sm text-muted max-w-3xl">
    The demand forecast for a loaded site file runs on a laptop: <code className="text-fg">python pipeline/run_engine.py</code> after copying the file into app/data. Pick a sample village to see a full forecast.
  </div>
);

const App: React.FC = () => {
  const h0 = location.hash.slice(1);
  const fromHash = () => { const h = location.hash.slice(1); return ALIAS[h]?.[0] ?? Math.max(0, HASH.indexOf(h)); };
  const [tab, setTab] = useState(fromHash);
  const [money, setMoney] = useState<string>(ALIAS[h0]?.[0] === 3 ? ALIAS[h0][1] : 'size');
  const [trust, setTrust] = useState<string>(ALIAS[h0]?.[0] === 5 ? ALIAS[h0][1] : 'checks');
  React.useEffect(() => { const on = () => { const h = location.hash.slice(1); setTab(fromHash()); if (ALIAS[h]) (ALIAS[h][0] === 3 ? setMoney : setTrust)(ALIAS[h][1]); }; window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  const goTab = (t: number, sub?: string) => { setTab(t); if (sub) (t === 3 ? setMoney : setTrust)(sub); try { history.replaceState(null, '', '#' + HASH[t]); } catch { /* sandboxed */ } window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); };
  const [st, setSt] = useSettings();

  const [siteId, setSiteId] = useState(() => store.get('gs-site') || SITES[0].id);
  const [upload, setUpload] = useState<SiteData | null>(null);
  const site: SiteData = (siteId === 'upload' && upload) || (SITES.find(s => s.id === siteId) ?? SITES[0]).data;
  const pick = (id: string) => { setSiteId(id); store.set('gs-site', id); };

  const buildings = useMemo(() => site.buildings.map(classify), [site]);
  const sum = useMemo(() => summarise(buildings), [buildings]);
  const ds = useMemo(() => draws(sum), [sum]);
  const est = useMemo(() => estimate(sum, ds), [sum, ds]);
  const ours5 = useMemo(() => growth(ds)[4], [ds]);
  const eng = siteId === 'upload' ? undefined : ENGINE[siteId];

  const navRef = React.useRef<HTMLElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  useEdgeFade(navRef, 'x');
  React.useLayoutEffect(() => {
    const b = navRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[tab];
    if (b) setInk({ x: b.offsetLeft, w: b.offsetWidth });
  }, [tab]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-[var(--header)] backdrop-blur-xl">
        <div className="max-w-page mx-auto px-[var(--gutter)] flex flex-wrap items-center gap-x-8">
          <button type="button" onClick={() => goTab(0)} className="h-14 lg:h-16 inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <SunMark className="h-5 w-5 text-accent" />GridSight
          </button>
          <nav ref={navRef} role="tablist" aria-label="Sections" className="relative order-3 lg:order-2 w-full lg:w-auto flex gap-6 overflow-x-auto no-scrollbar">
            {TABS.map((t, i) => (
              <button key={t} role="tab" aria-selected={tab === i} onClick={() => goTab(i)}
                className={`shrink-0 h-11 lg:h-16 text-sm transition-colors ${tab === i ? 'text-fg font-medium' : 'text-muted hover:text-fg'}`}>{t}</button>
            ))}
            {ink && <span aria-hidden="true" className="tab-ink absolute left-0 bottom-0 h-0.5 rounded-full bg-fg" style={{ width: ink.w, transform: `translateX(${ink.x}px)` }} />}
          </nav>
          <div className="order-2 lg:order-3 ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted">Mini-grid demand from public data</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {tab === 0 && <MapView site={site} buildings={buildings} eng={eng} siteId={siteId} onPick={pick} goTab={goTab} st={st} set={setSt} />}
      {tab > 0 && <main className="max-w-page mx-auto px-[var(--gutter)] py-6 pb-24 sm:pb-6 space-y-6">
        <section className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance">How much power will a village use, before anyone builds there?</h1>
          {tab === 1 && <More label="The story behind GridSight"><p className="text-sm text-muted max-w-3xl">Amina builds mini-grids. Her last site was too big, so the tariff priced out half the village; the one before was too small and browned out every evening. GridSight gives her and her lender a demand range from open satellite and map data, explains what drives it, and tests system sizes against it.</p></More>}
        </section>
        {tab === 1 && <SitePicker id={siteId} onPick={pick} onUpload={d => { setUpload(d); setSiteId('upload'); }} />}
        {tab > 1 && <SettingsBar eng={eng} s={st} set={setSt} siteId={siteId} onPick={pick} goTab={goTab} />}
        {(tab === 3 || tab === 5) && (
          <div className="flex rounded-ctl border border-line overflow-hidden w-fit max-w-full" role="tablist" aria-label="Sections">
            {(tab === 3 ? MONEY : TRUST).map(([k, l]) => { const on = (tab === 3 ? money : trust) === k; return (
              <button key={k} role="tab" aria-selected={on} onClick={() => (tab === 3 ? setMoney : setTrust)(k)}
                className={`h-9 px-4 text-sm whitespace-nowrap ${on ? 'bg-line text-fg font-medium' : 'bg-surface-2 text-muted hover:text-fg'}`}>{l}</button>); })}
          </div>
        )}
        {tab > 1 && <JumpLinks deps={[tab, money, trust, siteId]} />}
        {tab === 1 && <SitePage site={site} buildings={buildings} sum={sum} eng={eng} onNext={() => goTab(2)} />}
        {(tab === 2 || (tab === 3 && money === 'size') || (tab === 5 && trust === 'checks')) && !eng && <NoEngine />}
        {tab === 2 && eng && <DemandPage site={site} eng={eng} est={est} ours5={ours5} onNext={() => goTab(3, 'size')} />}
        {tab === 3 && money === 'size' && eng && <GrowthPage site={site} eng={eng} s={st} set={setSt} siteId={siteId} onPick={pick} onNext={() => goTab(3, 'funding')} />}
        {tab === 3 && money === 'funding' && <FundingPage site={site} eng={eng} s={st} set={setSt} goTab={goTab} />}
        {tab === 3 && money === 'compare' && <Compare s={st} siteId={siteId} onPick={pick} rate={st.grant} />}
        {tab === 4 && <WeatherPage site={site} siteId={siteId} eng={eng} onNext={() => goTab(5, 'checks')} />}
        {tab === 5 && trust === 'checks' && eng && <ValidationPage site={site} eng={eng} onNext={() => goTab(5, 'sharing')} />}
        {tab === 5 && trust === 'sharing' && <SharingPage />}
        {tab === 5 && trust === 'method' && <MethodPage />}
      </main>}
      {tab > 1 && eng && <PhoneBar eng={eng} s={st} />}
      {tab > 0 && <footer className="max-w-page mx-auto px-[var(--gutter)] pb-10 text-xs text-muted">
        GridSight prototype for the Global Energy Hackathon 2026, Brief 03. Demand engine by Fereshteh (forecast/demand_forecast.py); map, data pipeline and dashboard by GridSight. Buildings: Google Open Buildings v3 (CC BY 4.0) and Overture Maps / OpenStreetMap (ODbL). All money and energy figures are rough guides.
      </footer>}
      <BackToTop />
    </div>
  );
};

export default App;
