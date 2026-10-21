import React, { useEffect, useState } from 'react';
import { SOURCES } from './sourceList';

// Book-style citations: <Cite id="..."/> renders a small superscript number
// that opens the Sources tab at that entry.

export const OPEN_SOURCE_EVENT = 'bhanu-open-source';
const order = Object.fromEntries(SOURCES.map((s, i) => [s.id, i + 1]));

export const Cite: React.FC<{ id: string | string[] }> = ({ id }) => {
  const ids = Array.isArray(id) ? id : [id];
  return (
    <sup className="ml-0.5 text-[0.7em] font-medium leading-none whitespace-nowrap">
      {ids.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-muted">,</span>}
          <a
            href={`#src-${k}`}
            onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent(OPEN_SOURCE_EVENT, { detail: k })); }}
            className="text-accent-ink hover:underline"
            aria-label={`Source ${order[k] ?? '?'}`}
          >
            {order[k] ?? '?'}
          </a>
        </React.Fragment>
      ))}
    </sup>
  );
};

/** Scroll to and briefly highlight a source after the Sources tab opens. */
export function focusSource(id: string) {
  requestAnimationFrame(() => setTimeout(() => {
    const el = document.getElementById(`src-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('src-flash');
    setTimeout(() => el.classList.remove('src-flash'), 1800);
  }, 60));
}

export const SourcesPage: React.FC = () => {
  const [q, setQ] = useState('');
  const groups = [...new Set(SOURCES.map(s => s.group))];
  const match = (s: (typeof SOURCES)[number]) => !q || `${s.title} ${s.publisher} ${s.supports}`.toLowerCase().includes(q.toLowerCase());
  useEffect(() => { if (location.hash.startsWith('#src-')) focusSource(location.hash.slice(5)); }, []);
  return (
    <article className="max-w-3xl mx-auto w-full space-y-8 pb-12">
      <header className="pt-4 space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight">Sources</h2>
        <p className="text-muted leading-relaxed">
          Every number on this site with a small raised number next to it, like this<sup className="text-accent-ink text-[0.7em]">1</sup>, comes from one of the sources below. Tap the number anywhere on the site to jump here. Figures change over time, so treat prices, subsidies and pay as rough guides and check the latest version before deciding. Titles are shortened. Sources were last checked in October 2026, some through search listings rather than the full page, so open the link before quoting a number.
        </p>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search sources"
          aria-label="Search sources"
          className="w-full sm:w-72 h-10 px-3 rounded-ctl bg-surface-2 border border-line text-sm text-fg focus:outline-none focus:border-silver"
        />
      </header>
      {groups.map(g => {
        const list = SOURCES.map((s, i) => ({ s, n: i + 1 })).filter(x => x.s.group === g && match(x.s));
        if (!list.length) return null;
        return (
          <section key={g} className="space-y-3">
            <h3 className="text-lg font-semibold">{g}</h3>
            <ol className="border border-line rounded-box divide-y divide-line overflow-hidden">
              {list.map(({ s, n }) => (
                <li key={s.id} id={`src-${s.id}`} className="bg-surface px-5 py-4 flex gap-4 transition-colors duration-700">
                  <span className="shrink-0 w-7 text-right font-display font-semibold text-accent-ink tabular-nums">{n}</span>
                  <div className="min-w-0 space-y-1">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-fg hover:underline break-words">{s.title}</a>
                    <p className="text-xs text-muted">{s.publisher}</p>
                    <p className="text-sm text-silver leading-relaxed">Supports: {s.supports}</p>
                    <p className="text-xs text-muted break-all">{s.url}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </article>
  );
};
