import React, { useId } from 'react';

// Detailed illustrations for the "Follow the energy" steps. 64 x 64 each.
const useIds = (...names: string[]) => {
  const base = useId().replace(/:/g, '');
  return Object.fromEntries(names.map(n => [n, `${base}-${n}`])) as Record<string, string>;
};

const Svg: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'h-14 w-14' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">{children}</svg>
);

export const SunArt: React.FC<{ className?: string }> = ({ className }) => {
  const id = useIds('glow', 'core', 'ray');
  return (
    <Svg className={className}>
      <defs>
        <radialGradient id={id.glow}>
          <stop offset="0" stopColor="#ffd25a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id.core} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff7d1" />
          <stop offset="0.45" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#ff8f2e" />
        </radialGradient>
        <linearGradient id={id.ray} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ff9a3d" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${id.glow})`} />
      {Array.from({ length: 12 }, (_, i) => (
        <polygon
          key={i}
          points={i % 2 ? '32,8 34,16 30,16' : '32,4 34.6,15 29.4,15'}
          fill={`url(#${id.ray})`}
          transform={`rotate(${i * 30} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="13" fill={`url(#${id.core})`} />
      <circle cx="27.5" cy="27" r="4" fill="#fffbe8" opacity="0.55" />
    </Svg>
  );
};

export const PanelArt: React.FC<{ className?: string }> = ({ className }) => {
  const id = useIds('frame', 'cells', 'glare');
  // Panel tilted towards the viewer
  const tl = [14, 12], tr = [56, 16], br = [50, 44], bl = [6, 40];
  const lerp = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const cols = 5, rows = 3;
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id.frame} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3e6ec" />
          <stop offset="1" stopColor="#7d838f" />
        </linearGradient>
        <linearGradient id={id.cells} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b5cc4" />
          <stop offset="0.55" stopColor="#163a8a" />
          <stop offset="1" stopColor="#0c1f4d" />
        </linearGradient>
        <linearGradient id={id.glare} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* stand */}
      <path d="M20 42 L18 58 M44 45 L46 58 M14 58 H52" stroke="#8a909b" strokeWidth="2.2" strokeLinecap="round" />
      {/* frame and cells */}
      <polygon points={`${tl} ${tr} ${br} ${bl}`} fill={`url(#${id.frame})`} />
      <polygon
        points={`${lerp(tl, br, 0.04)} ${lerp(tr, bl, 0.04)} ${lerp(br, tl, 0.04)} ${lerp(bl, tr, 0.04)}`}
        fill={`url(#${id.cells})`}
      />
      {Array.from({ length: cols - 1 }, (_, i) => {
        const t = (i + 1) / cols;
        const a = lerp(tl, tr, t), b = lerp(bl, br, t);
        return <line key={`c${i}`} x1={a[0]} y1={a[1] + 0.8} x2={b[0]} y2={b[1] - 0.8} stroke="#6f95e6" strokeWidth="0.7" opacity="0.7" />;
      })}
      {Array.from({ length: rows - 1 }, (_, i) => {
        const t = (i + 1) / rows;
        const a = lerp(tl, bl, t), b = lerp(tr, br, t);
        return <line key={`r${i}`} x1={a[0] + 0.8} y1={a[1]} x2={b[0] - 0.8} y2={b[1]} stroke="#6f95e6" strokeWidth="0.7" opacity="0.7" />;
      })}
      {/* glare */}
      <polygon points="24,13 33,14 19,41 10,40" fill={`url(#${id.glare})`} />
    </Svg>
  );
};

export const InverterArt: React.FC<{ className?: string }> = ({ className }) => {
  const id = useIds('body', 'side', 'screen');
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id.body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f3f6" />
          <stop offset="1" stopColor="#b7bcc6" />
        </linearGradient>
        <linearGradient id={id.side} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d939e" />
          <stop offset="1" stopColor="#5f6570" />
        </linearGradient>
        <linearGradient id={id.screen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d2433" />
          <stop offset="1" stopColor="#081520" />
        </linearGradient>
      </defs>
      {/* heat sink side */}
      <path d="M46 10 L52 13 L52 51 L46 54 Z" fill={`url(#${id.side})`} />
      {[17, 22, 27, 32, 37, 42, 47].map(y => <line key={y} x1="46.5" y1={y} x2="51.5" y2={y + 1.4} stroke="#4a4f58" strokeWidth="0.8" />)}
      {/* body */}
      <rect x="12" y="10" width="34" height="44" rx="4" fill={`url(#${id.body})`} />
      <rect x="12" y="10" width="34" height="44" rx="4" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.8" />
      {/* screen */}
      <rect x="17" y="16" width="24" height="13" rx="2" fill={`url(#${id.screen})`} />
      <text x="29" y="25.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#5ac8ff" fontFamily="Saira, Inter, sans-serif">5.0kW</text>
      {/* wave symbol */}
      <path d="M20 37 q3 -5 6 0 t6 0 t6 0" stroke="#3a7bd5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* LEDs */}
      <circle cx="21" cy="45" r="1.8" fill="#34d65c" />
      <circle cx="26" cy="45" r="1.8" fill="#3a3f47" />
      <text x="40" y="47" textAnchor="end" fontSize="4.5" fill="#6b717c" fontFamily="Inter, sans-serif">BHANU</text>
      {/* cable glands: DC in, AC out */}
      <rect x="17" y="54" width="5" height="4" rx="1" fill="#ffc23d" />
      <rect x="25" y="54" width="5" height="4" rx="1" fill="#ffc23d" />
      <rect x="36" y="54" width="5" height="4" rx="1" fill="#5aa9ff" />
    </Svg>
  );
};

export const SchoolArt: React.FC<{ className?: string }> = ({ className }) => {
  const id = useIds('wall', 'win', 'pv');
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id.wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e2bd" />
          <stop offset="1" stopColor="#c9ab78" />
        </linearGradient>
        <linearGradient id={id.win} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#e7a640" />
        </linearGradient>
        <linearGradient id={id.pv} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b5cc4" />
          <stop offset="1" stopColor="#0c1f4d" />
        </linearGradient>
      </defs>
      {/* rooftop panels */}
      {[10, 22, 34].map(x => (
        <polygon key={x} points={`${x},20 ${x + 11},20 ${x + 13},14 ${x + 2},14`} fill={`url(#${id.pv})`} stroke="#6f95e6" strokeWidth="0.5" />
      ))}
      <path d="M12 20 v2 M44 20 v2" stroke="#8a909b" strokeWidth="1" />
      {/* building */}
      <rect x="6" y="22" width="52" height="5" fill="#7a2f2a" />
      <rect x="8" y="27" width="48" height="27" fill={`url(#${id.wall})`} />
      <rect x="8" y="39" width="48" height="2.2" fill="#7a2f2a" />
      {/* windows */}
      {[12, 22, 36, 46].map(x => (
        <g key={x}>
          <rect x={x} y="30" width="6" height="7" rx="0.8" fill={`url(#${id.win})`} stroke="#8a6a3a" strokeWidth="0.6" />
          <rect x={x} y="44" width="6" height="7" rx="0.8" fill={`url(#${id.win})`} stroke="#8a6a3a" strokeWidth="0.6" />
        </g>
      ))}
      {/* door and board */}
      <rect x="29" y="44" width="6" height="10" rx="0.8" fill="#5a3a24" />
      <rect x="27" y="29.5" width="10" height="5" rx="0.8" fill="#1d4a34" />
      {/* steps and ground */}
      <rect x="27" y="54" width="10" height="2" fill="#a8a094" />
      <rect x="2" y="56" width="60" height="3" rx="1.5" fill="#2f5a3a" />
      {/* tree */}
      <rect x="59" y="46" width="1.6" height="10" fill="#6a4a30" />
      <circle cx="59.8" cy="44" r="4.2" fill="#3f8a54" />
    </Svg>
  );
};

export const GridArt: React.FC<{ className?: string }> = ({ className }) => {
  const id = useIds('steel');
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id.steel} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8ccd4" />
          <stop offset="1" stopColor="#7c828d" />
        </linearGradient>
      </defs>
      {/* lines */}
      <path d="M2 18 Q 14 24 20 16 M44 16 Q 52 24 62 18 M2 28 Q 12 34 16 26 M48 26 Q 54 34 62 28" stroke="#9aa3b0" strokeWidth="0.9" fill="none" />
      {/* lattice tower */}
      <g stroke={`url(#${id.steel})`} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M24 60 L30 8 L34 8 L40 60" />
        <path d="M18 16 H46 M16 26 H48" />
        <path d="M30 8 L32 4 L34 8" />
        <path d="M26.5 42 L37.5 42 M25 52 L39 52 M28 30 L36 30 M29 20 L35 20" />
      </g>
      <g stroke="#8a909b" strokeWidth="0.8">
        <path d="M24.6 60 L37.5 42 M39.4 60 L26.5 42 M26.5 42 L36 30 M37.5 42 L28 30 M28 30 L35 20 M36 30 L29 20" />
      </g>
      {/* insulators */}
      {[18, 46, 16, 48].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={i < 2 ? 16 : 26} x2={x} y2={(i < 2 ? 16 : 26) + 4} stroke="#cfd6e0" strokeWidth="1" />
          <circle cx={x} cy={(i < 2 ? 16 : 26) + 4} r="1.4" fill="#5aa9ff" />
        </g>
      ))}
      <rect x="20" y="60" width="24" height="2" rx="1" fill="#4a505a" />
    </Svg>
  );
};

export const FLOW_ART = { sun: SunArt, panel: PanelArt, inverter: InverterArt, school: SchoolArt, grid: GridArt };
