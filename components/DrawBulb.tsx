import React from 'react';

// A light bulb that draws itself: the outline traces in, turns green, then a
// leaf-shaped filament draws inside and the bulb glows. Based on the "Green
// light bulb" line animation Sai shared, redrawn in the site's colours.
// `loop` repeats every 3 s (to invite a tap); otherwise it plays once on mount.

const OUTLINE = 'M-31.279,195.068L-17.962,209.55L24.241,209.55L35.768,190.863L-48.883,156.552C-48.883,156.552,-37.878,149.317,-48.883,135.725L51.484,175.552C51.484,175.552,43.972,163.812,51.484,154.414L-48.883,114.587C-48.883,114.587,-56.659,111.877,-59.846,108.293C-62.182,105.665,-63.149,101.556,-63.149,96.362C-63.149,68.481,-67.089,61.505,-80.413,53.653C-120.172,30.224,-144.426,-15.3,-144.867,-64.798C-145.581,-144.947,-79.725,-210.306,0,-209.544C79.725,-210.306,145.581,-144.947,144.867,-64.798C144.426,-15.3,120.172,30.224,80.413,53.653C67.089,61.505,63.149,68.481,63.149,96.362C63.149,109.783,54.989,114.587,44.924,114.587C44.924,114.587,37.833,125.445,51.484,133.277L0,113.097';
const LEAF_RIGHT = 'M-37.61,110.828L-37.61,-39.815C-37.61,-39.815,-40.677,-110.828,37.626,-110.828C37.626,-110.828,38.348,-41.34,-37.61,-41.34C-37.61,-41.34,-18.539,-70.395,13.593,-91.051';
const LEAF_LEFT = 'M37.61,84.591L37.61,-13.577C37.61,-13.577,40.677,-84.591,-37.626,-84.591C-37.626,-84.591,-38.348,-15.102,37.61,-15.102C37.61,-15.102,18.539,-44.157,-13.593,-64.813';

// Line weights are in the bulb's own units; small bulbs need heavier lines to read.
const DrawBulb: React.FC<{ className?: string; loop?: boolean; title?: string; small?: boolean }> = ({ className = '', loop = false, title, small = false }) => {
  const w = small ? 26 : 14;
  return (
  <svg
    className={`draw-bulb ${loop ? 'draw-bulb-loop' : 'draw-bulb-once'} ${className}`}
    viewBox="250 130 700 920"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
  >
    {/* Glow behind the bulb once it lights */}
    <circle className="db-glow" cx="603" cy="460" r="300" />
    <g transform="matrix(2,0,0,2,-605.999,-600)">
      <path className="db-outline" pathLength={100} strokeWidth={w} d={OUTLINE} transform="translate(604.313,594.758)" />
    </g>
    <g transform="matrix(2,0,0,2,677.847,594.054)">
      <path className="db-leaf db-leaf-a" pathLength={100} strokeWidth={w} d={LEAF_RIGHT} />
    </g>
    <g transform="matrix(2,0,0,2,527.406,646.529)">
      <path className="db-leaf db-leaf-b" pathLength={100} strokeWidth={w} d={LEAF_LEFT} />
    </g>
  </svg>
  );
};

export default DrawBulb;
