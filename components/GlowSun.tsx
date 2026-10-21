import React, { useId } from 'react';

// A glowing, textured sun for headline moments: granular surface, bright
// limb, a soft corona and slowly turning rays.
const RAYS = Array.from({ length: 28 }, (_, i) => ({
  angle: (i * 360) / 28 + (i % 3) * 4,
  len: i % 4 === 0 ? 40 : i % 2 === 0 ? 30 : 22,
  width: i % 4 === 0 ? 4 : 2.6,
}));

const GlowSun: React.FC<{ className?: string }> = ({ className = '' }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="-64 -64 128 128" aria-hidden="true" overflow="visible">
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="#fff6c8" stopOpacity="1" />
          <stop offset="0.5" stopColor="#ffc23d" stopOpacity="0.7" />
          <stop offset="0.75" stopColor="#ff9a2a" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff6cc" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffc23d" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-ball`} cx="0.42" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.45" stopColor="#ffa834" />
          <stop offset="0.85" stopColor="#f0701c" />
          <stop offset="1" stopColor="#d4520f" />
        </radialGradient>
        <radialGradient id={`${id}-limb`}>
          <stop offset="0.78" stopColor="#fff2b8" stopOpacity="0" />
          <stop offset="0.95" stopColor="#fff2b8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-grain`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.6  0 0 0 1.6 -0.75" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={`${id}-flare`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id={`${id}-clip`}><circle r="28" /></clipPath>
      </defs>

      <circle r="62" fill={`url(#${id}-halo)`} />

      <g className="glow-sun-rays" filter={`url(#${id}-soft)`}>
        {RAYS.map((r, i) => (
          <polygon
            key={i}
            points={`24,${-r.width} ${24 + r.len},0 24,${r.width}`}
            fill={`url(#${id}-ray)`}
            transform={`rotate(${r.angle})`}
          />
        ))}
      </g>

      {/* Small flares at the poles, like solar prominences */}
      <g filter={`url(#${id}-flare)`} fill="none" stroke="#ff5a2a" strokeWidth="3" strokeOpacity="0.8">
        <path d="M -11 -26 C -10 -39, 10 -39, 11 -26" />
        <path d="M -10 26 C -8 37, 8 37, 10 26" />
      </g>

      <circle r="28" fill={`url(#${id}-ball)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-28" y="-28" width="56" height="56" fill="#fff" filter={`url(#${id}-grain)`} opacity="0.75" />
      </g>
      <circle r="30" fill={`url(#${id}-limb)`} />
    </svg>
  );
};

export default GlowSun;
