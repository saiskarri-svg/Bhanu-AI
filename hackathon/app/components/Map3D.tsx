import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Building, Cls, SiteData } from './model';

// 3D view: each footprint extruded to a typical height for its class (map
// data rarely has real heights). Drawn with WebGL inside the page; no map
// tiles are needed. Callout anchors are projected to the screen on every
// camera move so the HTML callouts can follow.

const HEIGHT: Record<Cls, number> = { res: 3.2, com: 4.2, health: 5.5, school: 4.8, other: 2.6 };
const VAR: Record<Cls, string> = { res: '--res', com: '--com', health: '--health', school: '--school', other: '--other' };

export interface Projected { centre: [number, number]; r: number; anchors: Record<string, [number, number]> }
export interface Map3DHandle { zoom: (f: number) => void; reset: () => void }

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

export const Map3D = React.forwardRef<Map3DHandle, {
  site: SiteData; buildings: Building[]; outlines?: (number[] | null)[]; anchors: { key: string; x: number; y: number; h?: number }[];
  theme: string; padLeft: number; padRight: number; onProject: (p: Projected) => void;
  picture?: { url: string; bounds: { west: number; south: number; east: number; north: number } } | null;
}>(({ site, buildings, outlines, anchors, theme, padLeft, padRight, onProject, picture }, ref) => {
  const box = React.useRef<HTMLDivElement>(null);
  const api = React.useRef<Map3DHandle>({ zoom: () => {}, reset: () => {} });
  React.useImperativeHandle(ref, () => ({ zoom: f => api.current.zoom(f), reset: () => api.current.reset() }));
  const latest = React.useRef({ anchors, onProject, padLeft, padRight });
  latest.current = { anchors, onProject, padLeft, padRight };

  React.useEffect(() => {
    const el = box.current!;
    const W0 = el.clientWidth, H0 = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W0, H0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W0 / H0, 1, 20000);
    const R = site.radius_m;
    const kx = 111320 * Math.cos((site.lat * Math.PI) / 180), ky = 110574;
    const P = (la: number, lo: number) => new THREE.Vector3((lo - site.lon) * kx, 0, -(la - site.lat) * ky);

    // Ground and the radius ring
    const ground = new THREE.Mesh(new THREE.CircleGeometry(R * 3, 64), new THREE.MeshBasicMaterial({ color: css('--map-bg') }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.5; scene.add(ground);
    let imgMat: THREE.MeshBasicMaterial | null = null;
    if (picture) {
      const b = picture.bounds;
      const w = (b.east - b.west) * kx, h = (b.north - b.south) * ky;
      const c = P((b.north + b.south) / 2, (b.east + b.west) / 2);
      const tex = new THREE.TextureLoader().load(picture.url);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      imgMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const img = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imgMat);
      img.rotation.x = -Math.PI / 2; img.position.set(c.x, -0.4, c.z); scene.add(img);
    }
    const ringPts = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * R, 0.1, Math.sin((i / 128) * Math.PI * 2) * R));
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: css('--map-road'), dashSize: 14, gapSize: 10 }));
    ring.computeLineDistances(); scene.add(ring);

    // Roads and power lines
    const roadMat = new THREE.LineBasicMaterial({ color: css('--map-road') });
    for (const r of site.roads) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(r.p.map(([la, lo]) => P(la, lo).setY(picture ? 0.25 : 0.08))), roadMat));
    const lineMat = new THREE.LineDashedMaterial({ color: css('--sun'), dashSize: 12, gapSize: 7 });
    for (const r of site.power_lines) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(r.p.map(([la, lo]) => P(la, lo).setY(9))), lineMat); l.computeLineDistances(); scene.add(l); }

    // Buildings: one merged mesh per class
    const groups: Record<Cls, THREE.BufferGeometry[]> = { res: [], com: [], health: [], school: [], other: [] };
    buildings.forEach((b, i) => {
      const c = P(b.lat, b.lon);
      const o = outlines?.[i];
      const shape = new THREE.Shape();
      if (o && o.length >= 6) {
        for (let k = 0; k < o.length; k += 2) { const x = o[k] / 10, y = o[k + 1] / 10; k ? shape.lineTo(x, y) : shape.moveTo(x, y); }
      } else {
        const s = Math.sqrt(Math.max(4, b.area)) / 2;
        shape.moveTo(-s, -s); shape.lineTo(s, -s); shape.lineTo(s, s); shape.lineTo(-s, s);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: HEIGHT[b.cls], bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(c.x, 0, c.z);
      groups[b.cls].push(g);
    });
    const mats: THREE.Material[] = [];
    (Object.keys(groups) as Cls[]).forEach(k => {
      if (!groups[k].length) return;
      const m = new THREE.MeshLambertMaterial({ color: css(VAR[k]) });
      mats.push(m);
      const mesh = new THREE.Mesh(mergeGeometries(groups[k]), m);
      groups[k].forEach(g => g.dispose());
      scene.add(mesh);
    });
    const plant = (site.grid.plants ?? []).find(p => p.cls === 'plant');
    if (plant) { const p = P(plant.lat, plant.lon); const m = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 22), new THREE.MeshLambertMaterial({ color: css('--sun') })); m.position.set(p.x, 1.25, p.z); scene.add(m); }

    scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-R, R * 1.5, R * 0.6); scene.add(sun);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.44; controls.minDistance = 60; controls.maxDistance = R * 6;
    const home = () => {
      const d = R * 1.55;
      camera.position.set(-d * 0.42, d * 0.66, d * 0.62);
      controls.target.set(0, 0, 0); controls.update();
    };
    home();

    // Shift the picture so the village sits between the side panels
    const setOffset = () => {
      const w = el.clientWidth, h = el.clientHeight, { padLeft: pl, padRight: pr } = latest.current;
      camera.aspect = w / h;
      camera.setViewOffset(w, h, -(pl - pr) / 2, 0, w, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    setOffset();

    const v = new THREE.Vector3();
    const toScreen = (x: number, y: number, z: number): [number, number] => {
      v.set(x, y, z).project(camera);
      return [(v.x + 1) / 2 * el.clientWidth, (1 - v.y) / 2 * el.clientHeight];
    };
    let last = '';
    const project = () => {
      const centre = toScreen(0, 0, 0);
      const edge = toScreen(R, 0, 0), edge2 = toScreen(0, 0, R);
      const r = Math.max(Math.hypot(edge[0] - centre[0], edge[1] - centre[1]), Math.hypot(edge2[0] - centre[0], edge2[1] - centre[1]));
      const anchors: Record<string, [number, number]> = {};
      for (const a of latest.current.anchors) anchors[a.key] = toScreen(a.x, a.h ?? 4, a.y);
      const key = JSON.stringify([centre, r, anchors].flat().map(n => (typeof n === 'number' ? Math.round(n) : n)));
      if (key !== last) { last = key; latest.current.onProject({ centre, r, anchors }); }
    };

    let raf = 0, alive = true;
    const loop = () => {
      if (!alive) return;
      controls.update();
      // The picture is 10 m detail: fade it as the camera comes close, so the sharp footprints take over
      if (imgMat) imgMat.opacity = Math.min(1, Math.max(0.35, (camera.position.distanceTo(controls.target) - 250) / 900));
      renderer.render(scene, camera); project(); raf = requestAnimationFrame(loop);
    };
    loop();
    const ro = new ResizeObserver(setOffset); ro.observe(el);

    api.current = {
      zoom: f => { const off = camera.position.clone().sub(controls.target).multiplyScalar(f); camera.position.copy(controls.target).add(off); controls.update(); },
      reset: home,
    };
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
      mats.forEach(m => m.dispose()); renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, [site, buildings, outlines, theme, picture]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="absolute inset-0" aria-label={`3D view of ${buildings.length} buildings in ${site.name}`} role="img" />;
});
