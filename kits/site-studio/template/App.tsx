import React, { useState } from 'react';
import { Box, BoxHeader, StatStrip, btn, BackToTop, revealWithin, useEdgeFade } from './components/ui';

// Starter shell: a top bar with the name (goes home), tabs with a sliding
// underline, boxes that fade in as they scroll into view, and Back to top.
// Rename the tabs and fill each one; keep one accent-coloured action per tab.

const TABS = ['Home', 'Details', 'About'];

const App: React.FC = () => {
  const [tab, setTab] = useState(0);
  const goTab = (t: number) => { setTab(t); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); };

  const navRef = React.useRef<HTMLElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  useEdgeFade(navRef, 'x');
  React.useLayoutEffect(() => {
    const b = navRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[tab];
    if (b) setInk({ x: b.offsetLeft, w: b.offsetWidth });
  }, [tab]);
  React.useLayoutEffect(() => revealWithin(pageRef.current), [tab]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-[rgba(11,11,13,0.72)] backdrop-blur-xl">
        <div className="max-w-page mx-auto px-[var(--gutter)] flex flex-wrap items-center gap-x-8">
          <button type="button" onClick={() => goTab(0)} className="h-14 lg:h-16 text-[17px] font-semibold tracking-tight">New Site</button>
          <nav ref={navRef} role="tablist" aria-label="Sections" className="relative order-3 lg:order-2 w-full lg:w-auto flex gap-6 overflow-x-auto no-scrollbar">
            {TABS.map((t, i) => (
              <button key={t} role="tab" aria-selected={tab === i} onClick={() => goTab(i)}
                className={`shrink-0 h-11 lg:h-16 text-sm transition-colors ${tab === i ? 'text-fg font-medium' : 'text-muted hover:text-fg'}`}>
                {t}
              </button>
            ))}
            {ink && <span aria-hidden="true" className="tab-ink absolute left-0 bottom-0 h-0.5 rounded-full bg-fg" style={{ width: ink.w, transform: `translateX(${ink.x}px)` }} />}
          </nav>
          <div className="order-2 lg:order-3 ml-auto">
            <button className={btn.primary}>Main action</button>
          </div>
        </div>
      </header>

      <main ref={pageRef} className="max-w-page mx-auto px-[var(--gutter)] py-6 space-y-6">
        {tab === 0 && (
          <>
            <StatStrip stats={[
              { label: 'First number', value: '1,234', unit: 'units' },
              { label: 'Second number', value: '56', unit: '%' },
              { label: 'Third number', value: '₹7,800', unit: 'rough guide' },
              { label: 'Fourth number', value: '9', unit: 'days' },
            ]} />
            <Box>
              <BoxHeader title="Start here" meta="Replace this box" />
              <p className="px-5 pb-5 text-sm text-muted max-w-prose">Describe what this page helps the user do, in one or two plain sentences.</p>
            </Box>
          </>
        )}
        {tab !== 0 && (
          <Box>
            <BoxHeader title={TABS[tab]} />
            <p className="px-5 pb-5 text-sm text-muted">Content for {TABS[tab]}.</p>
          </Box>
        )}
      </main>
      <BackToTop />
    </div>
  );
};

export default App;
