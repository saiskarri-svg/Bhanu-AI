import React, { useRef, useState } from 'react';
import { Box, BoxHeader, StatusDot, CHART, btn } from './ui';
import { markDone } from './runtime';

interface Spot {
  id: string;
  x: number;
  y: number;
  title: string;
  why: string;
  todo: string;
  good?: boolean;
}

const HAZARDS: Spot[] = [
  { id: 'crack', x: 304, y: 200, title: 'Cracked panel glass', why: 'Rain gets inside and live parts can be exposed. A cracked panel can give a shock or start a fire.', todo: 'Do not touch it. Tell a teacher so a technician can replace the panel.' },
  { id: 'mc4', x: 382, y: 404, title: 'Loose MC4 connector', why: 'DC power can jump across a small gap as an arc, which is hot enough to start a fire.', todo: 'Keep away. A technician shuts the system down before reconnecting it. Never pull connectors apart.' },
  { id: 'puddle', x: 650, y: 470, title: 'Cable lying in water', why: 'Water and damaged insulation can cause shocks and earth faults.', todo: 'Report it. Cables should be clipped in trays, off the roof floor.' },
  { id: 'combiner', x: 724, y: 128, title: 'Combiner box left open', why: 'The terminals inside carry DC at up to 500 V, enough to kill.', todo: 'Do not close it yourself. Tell a teacher. A technician checks it and locks it.' },
  { id: 'burn', x: 866, y: 196, title: 'Burn marks on the inverter', why: 'Scorch marks mean overheating or an arc inside. It could catch fire.', todo: 'Move away and tell a teacher straight away. A technician shuts it down, AC side first.' },
  { id: 'earth', x: 52, y: 336, title: 'Broken earth wire', why: 'Without earthing, the metal frames can become live during a fault or lightning strike.', todo: 'Report it. A technician reconnects the wire and tests the earth pit.' },
  { id: 'edge', x: 360, y: 522, title: 'Gap in the roof wall', why: 'Falls are the most common serious injury on rooftops.', todo: 'Stay well back from edges. The school needs a railing, and anyone working near the edge wears a harness.' },
  { id: 'soap', x: 486, y: 466, title: 'Soap and a hard brush', why: 'Soap and stiff bristles scratch the glass coating and cut output. Cold water on hot panels can crack them.', todo: 'Clean with plain water and a soft brush, in the early morning or evening.' },
];

const DECOYS: Spot[] = [
  { id: 'ext', x: 924, y: 276, good: true, title: 'Fire extinguisher', why: 'A CO₂ extinguisher next to the inverter is exactly right.', todo: 'Nothing to fix. Check its pressure gauge each month.' },
  { id: 'sign', x: 836, y: 142, good: true, title: 'DC danger sign', why: 'Warning signs tell people the equipment is live.', todo: 'Nothing to fix. Keep signs clean and readable.' },
];

const SPOTS = [...HAZARDS, ...DECOYS];

const panelRow = (xs: number[], yTop: number, yBot: number, w: number, inset: number) =>
  xs.map(x => ({
    pts: `${x},${yBot} ${x + w},${yBot} ${x + w - inset},${yTop} ${x + inset},${yTop}`,
    x, yTop, yBot, w, inset,
  }));

const ROW_A = panelRow([80, 236, 392, 548], 165, 240, 140, 12);
const ROW_B = panelRow([60, 220, 380, 540], 298, 382, 150, 12);

const HazardGame: React.FC = () => {
  const [found, setFound] = useState<string[]>([]);
  const [current, setCurrent] = useState<Spot | null>(null);
  const [miss, setMiss] = useState<{ x: number; y: number; k: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const hazardsFound = found.filter(id => HAZARDS.some(h => h.id === id)).length;
  const done = hazardsFound === HAZARDS.length;
  React.useEffect(() => { if (done && !revealed) markDone('hazards'); }, [done, revealed]);

  const pick = (s: Spot) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(s);
    setHint(null);
    if (!found.includes(s.id)) setFound(f => [...f, s.id]);
  };

  const onMiss = (e: React.MouseEvent<SVGRectElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    setMiss({ x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 540, k: Date.now() });
  };

  const showHint = () => {
    const left = HAZARDS.filter(h => !found.includes(h.id));
    if (!left.length) return;
    const h = left[Math.floor(Math.random() * left.length)];
    setHint(h.id);
    setTimeout(() => setHint(x => (x === h.id ? null : x)), 2600);
  };

  const reset = () => { setFound([]); setCurrent(null); setRevealed(false); setHint(null); };

  return (
    <Box>
      <BoxHeader title="Spot the hazard" meta={`${hazardsFound} of ${HAZARDS.length} found`} />
      <p className="px-5 text-sm text-muted max-w-prose">
        This school roof has {HAZARDS.length} problems that make it unsafe. Tap everything that looks wrong. Some things are there on purpose, so look carefully.
      </p>

      <div className="px-5 pt-3 flex gap-1.5" aria-hidden="true">
        {HAZARDS.map((h, i) => (
          <span key={h.id} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < hazardsFound ? CHART.positive : 'var(--line)' }} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 p-5">
        <div className="relative rounded-box overflow-hidden border border-line">
          <svg ref={svgRef} viewBox="0 0 960 540" className="block w-full h-auto select-none" role="img" aria-label="School rooftop with solar panels and hidden hazards">
            <defs>
              <linearGradient id="hz-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a3654" /><stop offset="1" stopColor="#3a6283" /></linearGradient>
              <linearGradient id="hz-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3833" /><stop offset="1" stopColor="#2c2a26" /></linearGradient>
              <linearGradient id="hz-cells" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2b5cc4" /><stop offset="0.6" stopColor="#163a8a" /><stop offset="1" stopColor="#0c1f4d" /></linearGradient>
              <linearGradient id="hz-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d4234" /><stop offset="1" stopColor="#3a3128" /></linearGradient>
              <pattern id="hz-earth" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="8" fill="#34d65c" /><rect x="4" width="4" height="8" fill="#ffd34d" />
              </pattern>
            </defs>

            {/* background: a miss lands here */}
            <rect x="0" y="0" width="960" height="540" fill="url(#hz-sky)" onClick={onMiss} />
            <g pointerEvents="none">
              <circle cx="120" cy="50" r="18" fill="#fff1b8" opacity="0.9" />
              <rect x="0" y="110" width="960" height="430" fill="url(#hz-floor)" />
              {[170, 230, 300, 380, 470].map(y => <line key={y} x1="0" y1={y} x2="960" y2={y} stroke="#454139" strokeWidth="1" />)}
              {/* back parapet */}
              <rect x="0" y="96" width="800" height="22" fill="url(#hz-wall)" />
              <rect x="0" y="94" width="800" height="4" fill="#6a5a46" />
              {/* stair room */}
              <rect x="800" y="30" width="160" height="300" fill="url(#hz-wall)" />
              <rect x="796" y="24" width="168" height="8" fill="#6a5a46" />
              <rect x="900" y="300" width="0" height="0" />
              {/* front parapet with a gap */}
              <rect x="0" y="504" width="300" height="36" fill="url(#hz-wall)" />
              <rect x="420" y="504" width="540" height="36" fill="url(#hz-wall)" />
              <rect x="0" y="500" width="300" height="5" fill="#6a5a46" />
              <rect x="420" y="500" width="540" height="5" fill="#6a5a46" />
              <rect x="300" y="504" width="120" height="36" fill="#0d0f12" />
              <path d="M300 504 l10 36 M420 504 l-10 36" stroke="#5a4c3a" strokeWidth="2" />
            </g>

            {/* panels */}
            <g pointerEvents="none">
              {[...ROW_A, ...ROW_B].map((p, i) => (
                <g key={i}>
                  <line x1={p.x + 20} y1={p.yTop} x2={p.x + 20} y2={p.yBot + 14} stroke="#8a909b" strokeWidth="3" />
                  <line x1={p.x + p.w - 20} y1={p.yTop} x2={p.x + p.w - 20} y2={p.yBot + 14} stroke="#8a909b" strokeWidth="3" />
                  <polygon points={p.pts} fill="#c9ccd3" />
                  <polygon points={p.pts} fill="url(#hz-cells)" transform={`translate(${p.x + p.w / 2} ${(p.yTop + p.yBot) / 2}) scale(0.95) translate(${-(p.x + p.w / 2)} ${-(p.yTop + p.yBot) / 2})`} />
                  {[0.25, 0.5, 0.75].map(t => (
                    <line key={t} x1={p.x + p.w * t} y1={p.yBot - 3} x2={p.x + p.inset + (p.w - 2 * p.inset) * t} y2={p.yTop + 3} stroke="#6f95e6" strokeWidth="0.8" opacity="0.6" />
                  ))}
                  {[1 / 3, 2 / 3].map(t => {
                    const y = p.yBot - (p.yBot - p.yTop) * t;
                    const dx = p.inset * t;
                    return <line key={t} x1={p.x + dx + 4} y1={y} x2={p.x + p.w - dx - 4} y2={y} stroke="#6f95e6" strokeWidth="0.8" opacity="0.6" />;
                  })}
                  <polygon points={`${p.x + 30},${p.yBot - 4} ${p.x + 52},${p.yBot - 4} ${p.x + 62},${p.yTop + 4} ${p.x + 42},${p.yTop + 4}`} fill="#fff" opacity="0.08" />
                </g>
              ))}
              {/* crack */}
              <path d="M304 200 l-22 -18 M304 200 l26 -12 M304 200 l-8 28 M304 200 l18 22 M304 200 l-26 8 M290 189 l-6 10 M318 194 l6 -10" stroke="#e8eef8" strokeWidth="1.3" opacity="0.9" />
            </g>

            {/* cables */}
            <g pointerEvents="none" fill="none" strokeLinecap="round">
              <path d="M150 396 L370 396 M394 396 L680 396 L690 396 L690 470 L780 470 L780 140 L740 140" stroke="#1d1d22" strokeWidth="5" />
              <path d="M200 254 L700 254 L720 254 L720 150" stroke="#1d1d22" strokeWidth="5" />
              {/* puddle */}
              <ellipse cx="650" cy="472" rx="70" ry="16" fill="#3a6d9a" opacity="0.65" />
              <ellipse cx="636" cy="468" rx="26" ry="4" fill="#9fc4e8" opacity="0.5" />
              <path d="M600 470 L700 470" stroke="#1d1d22" strokeWidth="5" />
              {/* loose MC4 */}
              <rect x="356" y="390" width="14" height="12" rx="2" fill="#111" />
              <rect x="394" y="390" width="14" height="12" rx="2" fill="#111" />
              <path d="M374 392 l6 6 l-4 2 l8 6" stroke="#ffd34d" strokeWidth="1.6" />
              <path d="M386 390 l-3 -6 M388 404 l4 5" stroke="#ff8a3d" strokeWidth="1.3" />
            </g>

            {/* earth wire, broken */}
            <g pointerEvents="none">
              <path d="M70 240 L46 300 L50 330" stroke="url(#hz-earth)" strokeWidth="5" fill="none" />
              <path d="M58 352 L40 420" stroke="url(#hz-earth)" strokeWidth="5" fill="none" />
              <rect x="30" y="420" width="22" height="12" rx="2" fill="#7a6a52" />
              <path d="M50 330 l4 6 M58 352 l-3 -6" stroke="#c9c9c9" strokeWidth="1.4" />
            </g>

            {/* combiner box, door open */}
            <g pointerEvents="none">
              <rect x="700" y="100" width="50" height="58" rx="3" fill="#2a2a30" stroke="#5a5a64" />
              <path d="M708 112 h34 M708 124 h34 M708 136 h34" stroke="#ff6f66" strokeWidth="2" />
              <path d="M712 112 v34 M738 112 v34" stroke="#111" strokeWidth="2" />
              <polygon points="700,100 676,94 676,160 700,158" fill="#3a3a42" stroke="#5a5a64" />
            </g>

            {/* stair room: inverter, sign, extinguisher, door */}
            <g pointerEvents="none">
              <rect x="830" y="170" width="72" height="100" rx="5" fill="#d8dbe1" />
              <rect x="840" y="184" width="52" height="22" rx="2" fill="#0b1a24" />
              <text x="866" y="199" textAnchor="middle" fontSize="11" fill="#5ac8ff" fontFamily="Saira, Inter, sans-serif">2.4kW</text>
              <ellipse cx="866" cy="178" rx="26" ry="10" fill="#1a120c" opacity="0.75" />
              <ellipse cx="878" cy="170" rx="14" ry="8" fill="#0f0a07" opacity="0.7" />
              <path d="M846 222 h40 M846 230 h40 M846 238 h40" stroke="#9aa0aa" strokeWidth="2" />
              <polygon points="836,124 852,152 820,152" fill="#ffd34d" stroke="#1a1a1a" strokeWidth="1.5" />
              <text x="836" y="148" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a1a" fontFamily="Inter, sans-serif">!</text>
              <rect x="914" y="246" width="20" height="54" rx="8" fill="#d23a2e" />
              <rect x="918" y="238" width="12" height="10" rx="2" fill="#1d1d22" />
              <path d="M930 242 q14 4 10 22" stroke="#1d1d22" strokeWidth="3" fill="none" />
              <rect x="820" y="290" width="0" height="0" />
            </g>

            {/* soap bucket and hard brush */}
            <g pointerEvents="none">
              <path d="M466 452 L506 452 L500 490 L472 490 Z" fill="#3a8fd4" />
              <rect x="466" y="448" width="40" height="6" rx="2" fill="#5aa9ff" />
              {[[472, 444, 5], [482, 440, 6], [494, 443, 5], [502, 438, 4]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.75" />)}
              <text x="486" y="476" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff" fontFamily="Inter, sans-serif">SOAP</text>
              <path d="M520 488 L560 430" stroke="#8a6a3a" strokeWidth="4" />
              <rect x="508" y="484" width="30" height="8" rx="2" fill="#d9a441" transform="rotate(-55 523 488)" />
            </g>

            {/* hit areas */}
            {SPOTS.map(s => {
              const isFound = found.includes(s.id);
              const show = isFound || (revealed && !s.good);
              return (
                <g key={s.id} onClick={pick(s)} style={{ cursor: 'pointer' }}>
                  <circle cx={s.x} cy={s.y} r="40" fill="transparent" />
                  {show && (
                    <circle cx={s.x} cy={s.y} r="30" fill="none" stroke={s.good ? CHART.positive : isFound ? CHART.negative : CHART.sun} strokeWidth="3" strokeDasharray={isFound ? undefined : '6 4'} />
                  )}
                  {isFound && !s.good && (
                    <g>
                      <circle cx={s.x + 24} cy={s.y - 24} r="11" fill={CHART.negative} />
                      <text x={s.x + 24} y={s.y - 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b0b0d" fontFamily="Inter, sans-serif">
                        {HAZARDS.findIndex(h => h.id === s.id) + 1}
                      </text>
                    </g>
                  )}
                  {hint === s.id && <circle cx={s.x} cy={s.y} r="34" fill="none" stroke={CHART.sun} strokeWidth="3" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />}
                </g>
              );
            })}

            {miss && (
              <g key={miss.k} pointerEvents="none" className="animate-[fadeout_1.2s_ease-out_forwards]">
                <circle cx={miss.x} cy={miss.y} r="14" fill="none" stroke="#e8e8ea" strokeWidth="2" opacity="0.7" />
                <text x={miss.x} y={miss.y - 22} textAnchor="middle" fontSize="13" fill="#e8e8ea" fontFamily="Inter, sans-serif">Looks fine</text>
              </g>
            )}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-2 border border-line rounded-box p-4 min-h-[180px]" aria-live="polite">
            {current ? (
              <>
                <StatusDot tone={current.good ? 'ok' : 'bad'} className={`text-xs ${current.good ? 'text-ok' : 'text-bad'}`}>
                  {current.good ? 'Not a hazard' : `Hazard ${HAZARDS.findIndex(h => h.id === current.id) + 1}`}
                </StatusDot>
                <h4 className="mt-1 text-base font-semibold">{current.title}</h4>
                <p className="mt-2 text-sm text-muted leading-relaxed"><span className="text-fg">Why: </span>{current.why}</p>
                <p className="mt-2 text-sm text-muted leading-relaxed"><span className="text-fg">What to do: </span>{current.todo}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Tap something on the roof that looks unsafe. Details appear here.</p>
            )}
          </div>

          {done && (
            <div className="border border-line rounded-box p-4">
              <StatusDot tone="ok" className="text-sm text-ok">All {HAZARDS.length} hazards found</StatusDot>
              <p className="mt-1 text-sm text-muted">Great spotting. Remember: you find it, you report it, a trained technician fixes it.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!done && <button onClick={showHint} className={btn.secondary}>Give me a hint</button>}
            {!done && !revealed && <button onClick={() => setRevealed(true)} className={btn.quiet}>Show the rest</button>}
            {(found.length > 0 || revealed) && <button onClick={reset} className={btn.quiet}>Start again</button>}
          </div>

          {found.some(id => HAZARDS.some(h => h.id === id)) && (
            <ul className="border border-line rounded-box divide-y divide-line">
              {HAZARDS.filter(h => found.includes(h.id)).map(h => (
                <li key={h.id}>
                  <button onClick={() => setCurrent(h)} className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface-2 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums" style={{ background: CHART.negative, color: '#0b0b0d' }}>
                      {HAZARDS.indexOf(h) + 1}
                    </span>
                    {h.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Box>
  );
};

export default HazardGame;
