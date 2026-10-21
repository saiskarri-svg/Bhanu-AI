import React from 'react';
import { SimInputs, SimOutputs } from './solarModel';

// Scene colours (the app is dark only)
const C = {
  grass: '#141c16',
  grassEdge: '#1f2b21',
  path: '#2a251f',
  wall: '#3a3128',
  wallShade: '#30281f',
  trim: '#5a2724',
  trimLight: '#7a3a33',
  parapet: '#4a4033',
  pilaster: '#443a2f',
  windowFrame: '#6b5a44',
  windowDark: '#120f0c',
  sill: '#7a6a52',
  board: '#0f1a14',
  boardText: '#e9e3cf',
  boardSub: '#a8b9a9',
  panel: '#18284a',
  panelLine: '#3a5689',
  steel: '#7b7b85',
  box: '#26262c',
  text: '#d6d3cb',
  muted: '#8a8790',
  amber: '#ffc23d',
  sky: '#5aa9ff',
  leaf: '#34d65c',
  violet: '#b49cff',
  red: '#ff6f66',
  tree: '#1f3a28',
  treeLight: '#2b4d34',
  trunk: '#4a3626',
};

type Hex = string;
const mix = (a: Hex, b: Hex, t: number) => {
  const p = (h: Hex) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  const k = Math.max(0, Math.min(1, t));
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface PartHooks {
  active: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  tintOf: (id: string) => string;
}

export type LoadKey = 'lights' | 'fans' | 'lab';

interface SceneProps {
  schoolName: string;
  place: string;
  env: SimInputs;
  out: SimOutputs;
  viewBox: string;
  parts?: PartHooks;
  onToggle?: (k: LoadKey) => void;
}

const panelShape = (x: number, yb: number) => {
  const w = 60, h = 26, k = 10;
  return {
    outline: `${x},${yb} ${x + w},${yb} ${x + w + k},${yb - h} ${x + k},${yb - h}`,
    cells: [
      `M${x + w / 3},${yb} L${x + w / 3 + k},${yb - h}`,
      `M${x + (2 * w) / 3},${yb} L${x + (2 * w) / 3 + k},${yb - h}`,
      `M${x + k / 2},${yb - h / 2} L${x + w + k / 2},${yb - h / 2}`,
    ],
  };
};
const ROWS = [{ yb: 196, x0: 180 }, { yb: 164, x0: 190 }];
const UPPER = [178, 256, 334, 412, 490, 568];
const LOWER = [178, 256, 490, 568];
const FONT = 'Inter, -apple-system, sans-serif';

const Cloud: React.FC<{ x: number; y: number; s: number; fill: string; opacity: number; dur: number; delay: number }> = ({ x, y, s, fill, opacity, dur, delay }) => (
  <g className="cloud-drift" style={{ ['--drift-dur' as string]: `${dur}s`, animationDelay: `${delay}s` }}>
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill={fill}>
      <ellipse cx="0" cy="0" rx="46" ry="16" />
      <ellipse cx="-22" cy="-8" rx="22" ry="16" />
      <ellipse cx="14" cy="-14" rx="26" ry="20" />
    </g>
  </g>
);

const Tree: React.FC<{ x: number; s?: number; wind: number }> = ({ x, s = 1, wind }) => (
  <g
    className="sway"
    style={{ ['--sway-deg' as string]: `${0.4 + (wind / 60) * 4}deg`, ['--sway-dur' as string]: `${Math.max(0.6, 3.5 - wind / 20)}s` }}
  >
    <g transform={`translate(${x} 440) scale(${s})`}>
      <rect x="-5" y="-80" width="10" height="80" fill={C.trunk} />
      <circle cx="0" cy="-100" r="38" fill={C.tree} />
      <circle cx="-26" cy="-80" r="26" fill={C.tree} />
      <circle cx="26" cy="-82" r="28" fill={C.tree} />
      <circle cx="-8" cy="-112" r="20" fill={C.treeLight} opacity="0.6" />
    </g>
  </g>
);

const SchoolScene: React.FC<SceneProps> = ({ schoolName, place, env, out, viewBox, parts, onToggle }) => {
  const elev = out.elevation;
  const day = clamp01(Math.sin((Math.max(0, elev) * Math.PI) / 180) * 1.6);
  const twilight = clamp01(1 - Math.abs(elev - 2) / 10);
  const overcast = clamp01(env.cloud * 0.9 + (env.rain ? 0.2 : 0));

  // Sky
  const skyTop = mix('#060912', mix('#1a3654', '#25282e', overcast), day);
  let skyBottom = mix('#0b1020', mix('#3a6283', '#3a3d43', overcast), day);
  skyBottom = mix(skyBottom, '#8a4f2c', twilight * 0.75 * (1 - overcast));
  const sunVisible = elev > -2;
  const sunX = 60 + ((env.hour - 5) / 14.5) * 860;
  const sunY = 440 - 360 * Math.sin((Math.max(-4, elev) * Math.PI) / 180);
  const sunColor = mix('#ff8a3d', '#fff1b8', clamp01(elev / 35));
  const sunDim = (1 - overcast * 0.75) * (1 - env.haze * 0.5);

  // Inside the classrooms
  const roomGlow = env.lights ? 0.35 + 0.55 * (1 - day) : 0;
  const pacText = out.acKw.toFixed(1);

  // Parts highlighting (only in the Components lesson)
  const on = (id: string) => parts?.active === id;
  const partProps = (id: string) =>
    parts
      ? {
          onMouseEnter: () => parts.onHover(id),
          onMouseLeave: () => parts.onHover(null),
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); parts.onPick(id); },
          style: { cursor: 'pointer', filter: on(id) ? `drop-shadow(0 0 6px ${parts.tintOf(id)})` : undefined, transition: 'filter .15s' } as React.CSSProperties,
          opacity: parts.active && !on(id) ? 0.55 : 1,
        }
      : {};
  const hl = (id: string, base: string) => (parts && on(id) ? parts.tintOf(id) : base);

  // Wires move faster with more power; the grid wire reverses when buying
  const flow = (kw: number): React.CSSProperties =>
    kw > 0.02
      ? { animationDuration: `${Math.max(0.35, 2.4 - (kw / Math.max(1, env.size)) * 2)}s` }
      : { animationPlayState: 'paused', opacity: 0.35 };
  const gridFlow: React.CSSProperties = { ...flow(Math.abs(out.gridKw)), animationDirection: out.gridKw < 0 ? 'reverse' : 'normal' };

  const cloudCount = Math.round(env.cloud * 7);
  const cloudFill = mix('#9aa3ad', '#4a4f57', overcast);
  const toggle = (k: LoadKey) => (e: React.MouseEvent) => { e.stopPropagation(); onToggle?.(k); };

  return (
    <svg viewBox={viewBox} className="block w-full h-auto select-none" role="img" aria-label={`Drawing of ${schoolName || 'the school'} with its rooftop solar system`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0" stopColor={sunColor} stopOpacity={0.55 * sunDim} />
          <stop offset="1" stopColor={sunColor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(C.wall, '#5a4c3a', day * 0.5)} />
          <stop offset="1" stopColor={C.wallShade} />
        </linearGradient>
        <radialGradient id="roomLight" cx="0.5" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffe3a0" />
          <stop offset="1" stopColor="#a8742a" />
        </radialGradient>
        <clipPath id="skyClip"><rect x="0" y="0" width="960" height="440" /></clipPath>
      </defs>

      {/* Sky, sun and weather */}
      <rect x="0" y="0" width="960" height="440" fill="url(#sky)" />
      {sunVisible && (
        <g opacity={sunDim}>
          <circle cx={sunX} cy={sunY} r="70" fill="url(#sunGlow)" />
          <circle cx={sunX} cy={sunY} r="16" fill={sunColor} />
        </g>
      )}
      {!sunVisible && <circle cx="820" cy="70" r="12" fill="#d9dde6" opacity="0.7" />}
      <g clipPath="url(#skyClip)">
        {Array.from({ length: cloudCount }, (_, i) => (
          <Cloud
            key={i}
            x={(i * 173) % 900}
            y={50 + ((i * 37) % 90)}
            s={0.8 + ((i * 7) % 5) / 6}
            fill={cloudFill}
            opacity={0.55 + overcast * 0.4}
            dur={Math.max(25, 120 - env.wind * 1.6)}
            delay={-i * 17}
          />
        ))}
        {env.haze > 0.02 && <rect x="0" y="0" width="960" height="440" fill="#8a6a42" opacity={env.haze * 0.5} />}
        {env.rain && (
          <g className="rain-fall" stroke="#9fb6cc" strokeWidth="1.2" opacity="0.5">
            {Array.from({ length: 90 }, (_, i) => {
              const x = (i * 53) % 980;
              const y = ((i * 97) % 500) - 40;
              return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 18} />;
            })}
          </g>
        )}
      </g>

      {/* Ground */}
      <rect x="0" y="440" width="960" height="80" fill={C.grass} />
      <line x1="0" y1="440" x2="960" y2="440" stroke={C.grassEdge} strokeWidth="2" />
      <polygon points="372,444 428,444 470,520 330,520" fill={C.path} />
      <Tree x={70} s={1.05} wind={env.wind} />
      <Tree x={948} s={0.85} wind={env.wind} />

      {/* Building */}
      <rect x="156" y="206" width="488" height="234" fill="url(#wall)" stroke="#4a3f33" />
      {[164, 242, 320, 398, 476, 554, 632].map(x => (
        <rect key={x} x={x - 4} y="206" width="8" height="234" fill={C.pilaster} />
      ))}
      <rect x="156" y="316" width="488" height="10" fill={C.trim} />
      <rect x="156" y="430" width="488" height="10" fill={C.trim} />
      <rect x="150" y="192" width="500" height="14" fill={C.parapet} />
      <rect x="150" y="192" width="500" height="3" fill={C.trimLight} />
      <rect x="560" y="140" width="80" height="52" fill="url(#wall)" stroke="#4a3f33" />
      <rect x="556" y="136" width="88" height="6" fill={C.parapet} />

      {/* Name board from the site settings */}
      <rect x="262" y="209" width="276" height="38" rx="3" fill={C.board} stroke={C.trimLight} />
      <text x="400" y="225" textAnchor="middle" fontSize="12.5" fontWeight="600" fill={C.boardText} fontFamily={FONT}>
        {(schoolName || 'Village School').slice(0, 34)}
      </text>
      <text x="400" y="240" textAnchor="middle" fontSize="9.5" fill={C.boardSub} fontFamily={FONT}>
        {place.slice(0, 44)}
      </text>

      {/* Classrooms: lights, fans and the computer lab */}
      {[...UPPER.map(x => ({ x, y: 252, lab: false })), ...LOWER.map(x => ({ x, y: 340, lab: x >= 490 }))].map(({ x, y, lab }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="46" height="48" rx="2" fill={C.windowDark} />
          {roomGlow > 0 && <rect x={x} y={y} width="46" height="48" rx="2" fill="url(#roomLight)" opacity={roomGlow} />}
          {/* tube light */}
          <rect x={x + 9} y={y + 5} width="28" height="3" rx="1.5" fill={env.lights ? '#fff6d8' : '#3a352c'} />
          {/* ceiling fan */}
          <g transform={`translate(${x + 23} ${y + 18})`}>
            <line x1="0" y1="-10" x2="0" y2="0" stroke="#5a5040" strokeWidth="1" />
            <g className={env.fans ? 'fan-spin' : undefined}>
              <ellipse cx="0" cy="0" rx="11" ry="2" fill="#7a6a52" />
              <ellipse cx="0" cy="0" rx="2" ry="11" fill="#7a6a52" transform="rotate(60)" opacity="0.8" />
              <circle r="2.2" fill="#9a8a72" />
            </g>
          </g>
          {/* computers in the lab */}
          {lab && (
            <g>
              {[8, 26].map(dx => (
                <rect key={dx} x={x + dx} y={y + 32} width="12" height="9" rx="1" fill={env.lab ? '#4aa3ff' : '#1d2026'} opacity={env.lab ? 0.9 : 1} />
              ))}
            </g>
          )}
          <rect x={x} y={y} width="46" height="48" rx="2" fill="none" stroke={C.windowFrame} strokeWidth="2" />
          <line x1={x + 23} y1={y} x2={x + 23} y2={y + 48} stroke={C.windowFrame} strokeWidth="1" opacity="0.6" />
          <rect x={x - 3} y={y + 48} width="52" height="3" fill={C.sill} />
        </g>
      ))}
      <text x="552" y="402" textAnchor="middle" fontSize="8.5" fill={C.muted} fontFamily={FONT}>Computer lab</text>

      {/* Door and steps */}
      <rect x="376" y="356" width="48" height="76" rx="2" fill="#1a1410" stroke={C.windowFrame} strokeWidth="2" />
      <line x1="400" y1="356" x2="400" y2="432" stroke={C.windowFrame} />
      <rect x="366" y="432" width="68" height="5" fill="#5a5048" />
      <rect x="360" y="437" width="80" height="5" fill="#4a423a" />

      {/* Solar display board */}
      <g>
        <rect x="306" y="350" width="62" height="38" rx="3" fill="#0b0d0f" stroke="#3a3a42" />
        <text x="337" y="362" textAnchor="middle" fontSize="7" fill={C.muted} fontFamily={FONT} letterSpacing="0.5">SOLAR NOW</text>
        <text x="337" y="381" textAnchor="middle" fontSize="15" fontWeight="600" fill={out.acKw > 0.02 ? C.amber : C.muted} fontFamily="Saira, Inter, sans-serif">
          {pacText} kW
        </text>
      </g>

      {/* Switchboard: click to switch loads */}
      <g aria-label="Switchboard">
        <rect x="432" y="368" width="34" height="40" rx="3" fill="#d8d2c4" stroke="#8a8478" />
        {(['lights', 'fans', 'lab'] as LoadKey[]).map((k, i) => {
          const isOn = env[k];
          return (
            <g key={k} onClick={onToggle ? toggle(k) : undefined} style={{ cursor: onToggle ? 'pointer' : 'default' }}>
              <rect x={436 + i * 10} y="374" width="8" height="14" rx="1.5" fill="#f2eee4" stroke="#9a948a" strokeWidth="0.8" />
              <rect x={437.5 + i * 10} y={isOn ? 381 : 375.5} width="5" height="6" rx="1" fill={isOn ? C.red : '#8a8478'} />
              <rect x={434 + i * 10} y="370" width="12" height="38" fill="transparent" />
            </g>
          );
        })}
        <text x="449" y="402" textAnchor="middle" fontSize="6" fill="#4a463e" fontFamily={FONT}>L  F  PC</text>
      </g>

      {/* Electrical room annex */}
      <rect x="644" y="330" width="126" height="110" fill={C.wallShade} stroke="#4a3f33" />
      <rect x="640" y="326" width="134" height="6" fill={C.parapet} />
      <text x="707" y="346" textAnchor="middle" fontSize="8" fill={C.muted} fontFamily={FONT}>Electrical room</text>

      {/* Gate pillar, grid pole */}
      <rect x="0" y="420" width="150" height="20" fill="#2e2822" />
      <rect x="770" y="420" width="26" height="20" fill="#2e2822" />
      <rect x="844" y="420" width="116" height="20" fill="#2e2822" />
      <rect x="796" y="330" width="48" height="110" fill="#3a2e26" stroke="#4a3f33" />
      <rect x="792" y="324" width="56" height="8" fill={C.parapet} />
      <line x1="900" y1="222" x2="900" y2="440" stroke={C.steel} strokeWidth="6" />
      <line x1="868" y1="234" x2="932" y2="234" stroke={C.steel} strokeWidth="4" />
      <path d="M868 234 L960 222 M932 234 L960 240" stroke={C.steel} strokeWidth="1.5" fill="none" />
      <text x="900" y="212" textAnchor="middle" fontSize="10" fill={C.text} fontFamily={FONT}>DISCOM grid</text>

      {/* Mounting structure */}
      <g {...partProps('frame')}>
        {ROWS.map(r => [0, 1, 2, 3, 4].map(i => {
          const x = r.x0 + i * 72;
          return (
            <g key={`${r.yb}-${i}`}>
              <line x1={x + 18} y1={r.yb - 26} x2={x + 18} y2="196" stroke={hl('frame', C.steel)} strokeWidth="2" />
              <line x1={x + 62} y1={r.yb - 26} x2={x + 62} y2="196" stroke={hl('frame', C.steel)} strokeWidth="2" />
            </g>
          );
        }))}
        <rect x="170" y="186" width="400" height="10" fill="transparent" />
      </g>

      {/* Panels, with dust and shade */}
      <g {...partProps('panel')}>
        {ROWS.slice().reverse().map(r => [0, 1, 2, 3, 4].map(i => {
          const p = panelShape(r.x0 + i * 72, r.yb);
          return (
            <g key={`${r.yb}-${i}`}>
              <polygon points={p.outline} fill={mix(C.panel, '#2a4a80', day * (1 - overcast) * 0.6)} stroke={hl('panel', C.panelLine)} strokeWidth={on('panel') ? 2 : 1.2} />
              {p.cells.map((d, j) => <path key={j} d={d} stroke={C.panelLine} strokeWidth="0.8" />)}
              {out.soilLoss > 0.005 && <polygon points={p.outline} fill="#9a7a4a" opacity={Math.min(0.6, out.soilLoss * 2)} />}
            </g>
          );
        }))}
        {env.shade > 0.01 && (
          <polygon
            points={`180,198 ${180 + env.shade * 370},198 ${200 + env.shade * 370},134 200,134`}
            fill="#000"
            opacity="0.45"
          />
        )}
      </g>

      {/* Lightning arrester and earth pit */}
      <g {...partProps('earth')}>
        <path d="M172 192 L172 146 M166 154 L172 140 L178 154" stroke={hl('earth', '#c0a06a')} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M172 192 L150 198 L150 440 L132 448" stroke={hl('earth', '#9a8058')} strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
        <rect x="116" y="446" width="32" height="18" rx="2" fill="#2a241c" stroke={hl('earth', '#9a8058')} />
        <line x1="132" y1="464" x2="132" y2="488" stroke={hl('earth', '#9a8058')} strokeWidth="2" />
      </g>

      {/* DC cables */}
      <g {...partProps('cable')}>
        <path className="wire-dc" style={flow(out.dcKw)} d="M533 183 L566 178 M543 151 L566 168 M578 190 L578 200 L652 200 L652 378 L664 378" stroke={hl('cable', C.amber)} strokeWidth={on('cable') ? 3 : 2} fill="none" />
        <path d="M578 190 L578 200 L652 200 L652 378 L664 378" stroke="transparent" strokeWidth="14" fill="none" />
      </g>

      {/* AC cables: to the school, and to and from the grid */}
      <path className="wire-ac" style={flow(Math.min(out.acKw, out.loadKw) || 0.0)} d="M704 372 L716 372 M730 392 L730 412 L644 412" stroke={C.sky} strokeWidth="2" fill="none" />
      <path className="wire-ac" style={gridFlow} d="M744 374 L806 368 M820 350 Q 846 256 880 236" stroke={out.gridKw < 0 ? C.red : C.sky} strokeWidth="2" fill="none" />

      {/* DC combiner box */}
      <g {...partProps('combiner')}>
        <rect x="566" y="160" width="24" height="30" rx="2" fill={C.box} stroke={hl('combiner', C.violet)} strokeWidth={on('combiner') ? 2 : 1.2} />
        <line x1="572" y1="170" x2="584" y2="170" stroke={C.muted} />
        <line x1="572" y1="178" x2="584" y2="178" stroke={C.muted} />
      </g>

      {/* Inverter with its own display */}
      <g {...partProps('inverter')}>
        <rect x="664" y="352" width="40" height="52" rx="3" fill={C.box} stroke={hl('inverter', C.sky)} strokeWidth={on('inverter') ? 2 : 1.2} />
        <rect x="668" y="357" width="32" height="13" rx="1.5" fill="#0b1a24" />
        <text x="684" y="367" textAnchor="middle" fontSize="8" fill={C.sky} fontFamily="Saira, Inter, sans-serif">{pacText}</text>
        <circle cx="684" cy="388" r="3" fill={out.acKw > 0.02 ? C.leaf : '#3a3a42'} />
      </g>

      {/* AC distribution board */}
      <g {...partProps('acdb')}>
        <rect x="716" y="356" width="28" height="36" rx="2" fill={C.box} stroke={hl('acdb', C.violet)} strokeWidth={on('acdb') ? 2 : 1.2} />
        {[722, 729, 736].map(x => <rect key={x} x={x} y="366" width="4" height="12" rx="1" fill={C.muted} />)}
      </g>

      {/* Battery (optional) */}
      <g {...partProps('battery')}>
        <rect x="664" y="414" width="48" height="22" rx="2" fill={C.box} stroke={hl('battery', C.leaf)} strokeDasharray="4 3" strokeWidth={on('battery') ? 2 : 1.2} />
        <path d="M680 425 h8 M684 421 v8 M696 425 h6" stroke={C.leaf} strokeWidth="1.3" />
      </g>

      {/* Net meter, arrow shows the flow */}
      <g {...partProps('meter')}>
        <rect x="806" y="346" width="28" height="44" rx="2" fill={C.box} stroke={hl('meter', C.sky)} strokeWidth={on('meter') ? 2 : 1.2} />
        <rect x="810" y="351" width="20" height="10" rx="1" fill="#0b1a24" />
        <text x="820" y="359" textAnchor="middle" fontSize="7" fill={out.gridKw < 0 ? C.red : C.sky} fontFamily="Saira, Inter, sans-serif">
          {Math.abs(out.gridKw).toFixed(1)}
        </text>
        <text x="820" y="378" textAnchor="middle" fontSize="11" fill={out.gridKw < 0 ? C.red : C.sky} fontFamily={FONT}>
          {out.gridKw < 0 ? '←' : '→'}
        </text>
      </g>

      {/* Bhanu AI sensor */}
      <g {...partProps('sensor')}>
        <line x1="506" y1="132" x2="506" y2="140" stroke={C.steel} strokeWidth="1.5" />
        <rect x="498" y="122" width="16" height="11" rx="2" fill={C.box} stroke={hl('sensor', C.leaf)} strokeWidth={on('sensor') ? 2 : 1.2} />
        <path d="M499 116 a10 10 0 0 1 14 0 M502 119 a5 5 0 0 1 8 0" stroke={C.leaf} strokeWidth="1.3" fill="none" />
      </g>
    </svg>
  );
};

export default SchoolScene;
