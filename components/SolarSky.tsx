import React, { useEffect, useRef } from 'react';

// Soft WebGL sky behind the top of the page. The glow sits where the sun is
// right now (local time), warm by day and cool blue at night.
const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uSun;     // sun position in 0..1 of the canvas
uniform float uDay;    // 0 night .. 1 noon

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;
  float aspect = uRes.x / uRes.y;
  // Wide ellipse so the light spreads along the top like a sky band
  vec2 d = (uv - uSun) * vec2(aspect * 0.42, 1.0);
  float r = length(d);

  // Slow drifting haze, like heat over panels
  float haze = fbm(uv * vec2(3.0 * aspect, 3.0) + vec2(uTime * 0.02, -uTime * 0.012));

  vec3 dayCore = vec3(1.0, 0.80, 0.30);
  vec3 dayEdge = vec3(0.95, 0.42, 0.12);
  vec3 night = vec3(0.30, 0.48, 0.95);

  float core = exp(-r * 6.0);
  float halo = exp(-r * 2.6);
  vec3 sunCol = mix(dayEdge, dayCore, core);
  vec3 col = mix(night * halo, sunCol * (0.55 * halo + 0.9 * core), uDay);

  float strength = mix(0.30, 0.42, uDay) * (0.7 + 0.6 * haze);
  // Fade out toward the bottom so the page ground stays clean
  float fade = smoothstep(1.0, 0.0, uv.y);
  float a = clamp((halo * 0.9 + core) * strength * fade, 0.0, 1.0);

  // Dither to avoid banding on dark screens
  a += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
  gl_FragColor = vec4(col * a, a);
}
`;

function sunState(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  // Daylight from 6:00 to 18:00
  const t = (h - 6) / 12;
  const up = t >= 0 && t <= 1;
  const elevation = up ? Math.sin(t * Math.PI) : 0;
  return {
    x: up ? 0.06 + t * 0.88 : 0.82,
    y: up ? 0.16 - elevation * 0.14 : 0.04,
    day: up ? Math.min(1, 0.35 + elevation) : 0,
  };
}

const SolarSky: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uSun = gl.getUniformLocation(prog, 'uSun');
    const uDay = gl.getUniformLocation(prog, 'uDay');

    const resize = () => {
      // Half resolution is plenty for a soft glow
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const draw = () => {
      const sun = sunState(new Date());
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduceMotion ? 0 : (performance.now() - start) / 1000);
      gl.uniform2f(uSun, sun.x, sun.y);
      gl.uniform1f(uDay, sun.day);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(draw);
    };
    draw();
    const onVisible = () => { if (!document.hidden && !reduceMotion) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[420px] w-full"
    />
  );
};

export default SolarSky;
