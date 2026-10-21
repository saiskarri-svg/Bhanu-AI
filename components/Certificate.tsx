import React, { useEffect, useRef, useState } from 'react';
import { SystemConfig } from '../types';
import { Box, BoxHeader, StatusDot, CHART, btn } from './ui';
import { readProgress, quizBest, saveFile, PROGRESS_EVENT } from './runtime';
import { QUIZZES } from './Quiz';

export interface Requirement { key: string; label: string; done: boolean; lesson: string }

const PASS = 0.8;

export function requirements(): Requirement[] {
  const p = readProgress();
  const quiz = (id: string, lesson: string) => {
    const n = QUIZZES[id].questions.length;
    const need = Math.ceil(n * PASS);
    return { key: `quiz-${id}`, label: `${QUIZZES[id].title.replace('Check: ', 'Quiz: ')} (${need} of ${n})`, done: quizBest(id) >= need, lesson };
  };
  return [
    quiz('how', 'How it works'),
    quiz('parts', 'Components'),
    { key: 'audit', label: 'Size the school system and apply it', done: !!p.audit, lesson: 'Size it' },
    quiz('size', 'Size it'),
    { key: 'challenges', label: 'Finish 2 simulator challenges', done: !!p.challenges, lesson: 'Simulator' },
    quiz('sim', 'Simulator'),
    { key: 'hazards', label: 'Find all 8 rooftop hazards', done: !!p.hazards, lesson: 'Safety' },
    { key: 'drill', label: 'Complete the shutdown drill', done: !!p.drill, lesson: 'Safety' },
    quiz('safety', 'Safety'),
    { key: 'detective', label: 'Solve the data detective cases', done: !!p.detective, lesson: 'Data detective' },
  ];
}

export function useRequirements() {
  const [reqs, setReqs] = useState(requirements);
  useEffect(() => {
    const on = () => setReqs(requirements());
    window.addEventListener(PROGRESS_EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(PROGRESS_EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  return reqs;
}

const NAME_KEY = 'bhanu-cert-name';
const readName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };

const W = 1200, H = 850;

const CertificateSvg = React.forwardRef<SVGSVGElement, { name: string; school: string; place: string; date: string }>(({ name, school, place, date }, ref) => (
  <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={`Certificate for ${name || 'student'}`}>
    <rect width={W} height={H} fill="#fbf7ee" />
    <rect x="28" y="28" width={W - 56} height={H - 56} fill="none" stroke="#b8862b" strokeWidth="3" />
    <rect x="42" y="42" width={W - 84} height={H - 84} fill="none" stroke="#b8862b" strokeWidth="1" />
    <g transform="translate(600 150)">
      <circle r="34" fill="#f5b323" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="-3" y="-62" width="6" height="18" rx="3" fill="#f5b323" transform={`rotate(${i * 30})`} />
      ))}
    </g>
    <text x="600" y="262" textAnchor="middle" fontSize="20" letterSpacing="6" fill="#7a5a1a" fontFamily="Georgia, 'Times New Roman', serif">BHANU AI SOLAR SCHOOL</text>
    <text x="600" y="330" textAnchor="middle" fontSize="52" fill="#1d1a14" fontFamily="Georgia, 'Times New Roman', serif">Certificate of Completion</text>
    <text x="600" y="392" textAnchor="middle" fontSize="20" fill="#5a5246" fontFamily="Arial, sans-serif">This certifies that</text>
    <text x="600" y="466" textAnchor="middle" fontSize="48" fontStyle="italic" fill="#1d1a14" fontFamily="Georgia, 'Times New Roman', serif">{name || 'Your name'}</text>
    <line x1="330" y1="488" x2="870" y2="488" stroke="#b8862b" strokeWidth="1.5" />
    <text x="600" y="536" textAnchor="middle" fontSize="20" fill="#3a352c" fontFamily="Arial, sans-serif">has completed the Bhanu AI solar course: how solar works, components,</text>
    <text x="600" y="566" textAnchor="middle" fontSize="20" fill="#3a352c" fontFamily="Arial, sans-serif">system sizing, the live simulator, rooftop safety and data detective.</text>
    <text x="600" y="616" textAnchor="middle" fontSize="20" fill="#3a352c" fontFamily="Arial, sans-serif">{school}{place ? `, ${place}` : ''}</text>
    <line x1="170" y1="732" x2="450" y2="732" stroke="#7a6a52" />
    <text x="310" y="760" textAnchor="middle" fontSize="16" fill="#5a5246" fontFamily="Arial, sans-serif">Teacher</text>
    <text x="310" y="722" textAnchor="middle" fontSize="18" fill="#3a352c" fontFamily="Arial, sans-serif"> </text>
    <line x1="750" y1="732" x2="1030" y2="732" stroke="#7a6a52" />
    <text x="890" y="722" textAnchor="middle" fontSize="18" fill="#3a352c" fontFamily="Arial, sans-serif">{date}</text>
    <text x="890" y="760" textAnchor="middle" fontSize="16" fill="#5a5246" fontFamily="Arial, sans-serif">Date</text>
  </svg>
));

async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

const Certificate: React.FC<{ config: SystemConfig; goTo: (lesson: string) => void }> = ({ config, goTo }) => {
  const reqs = useRequirements();
  const [name, setName] = useState(readName);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const done = reqs.filter(r => r.done).length;
  const all = done === reqs.length;
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => { try { localStorage.setItem(NAME_KEY, name); } catch { /* storage may be blocked */ } }, [name]);

  const download = async () => {
    setMsg('');
    if (!svgRef.current) return;
    try {
      const png = await svgToPng(svgRef.current);
      const ok = await saveFile(`Bhanu AI certificate - ${name || 'student'}.png`, png);
      setMsg(ok ? 'Certificate saved.' : 'The download was not saved.');
    } catch {
      setMsg('Could not create the image in this browser.');
    }
  };

  return (
    <div className="space-y-6">
      <Box>
        <BoxHeader title="Your progress" meta={`${done} of ${reqs.length} done`} />
        <div className="px-5 pt-1 flex gap-1.5" aria-hidden="true">
          {reqs.map(r => <span key={r.key} className="h-1.5 flex-1 rounded-full" style={{ background: r.done ? CHART.positive : 'var(--line)' }} />)}
        </div>
        <ul className="mt-4 border-t border-line divide-y divide-line">
          {reqs.map(r => (
            <li key={r.key} className="px-5 py-2.5 flex items-center justify-between gap-3">
              <StatusDot tone={r.done ? 'ok' : 'muted'} className={`text-sm ${r.done ? 'text-fg' : 'text-muted'}`}>{r.label}</StatusDot>
              {!r.done && <button onClick={() => goTo(r.lesson)} className={`${btn.quiet} shrink-0`}>Go to {r.lesson}</button>}
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 border-t border-line text-xs text-muted">Progress is saved on this device. Quizzes need 80% to count.</p>
      </Box>

      <Box>
        <BoxHeader title="Certificate" meta={all ? 'Ready' : `Unlocks when all ${reqs.length} are done`} />
        <div className="px-5 pt-2 flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-72">
            <label htmlFor="cert-name" className="block text-xs text-muted mb-1">Name on the certificate</label>
            <input
              id="cert-name"
              value={name}
              maxLength={40}
              onChange={e => setName(e.target.value)}
              placeholder="Student's full name"
              className="h-9 w-full bg-bg border border-line rounded-ctl px-3 text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-silver"
            />
          </div>
          <button onClick={download} disabled={!all || !name.trim()} className={btn.primary}>Download certificate</button>
          {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
        </div>
        <div className={`m-5 rounded-box overflow-hidden border border-line ${all ? '' : 'opacity-60'}`}>
          <CertificateSvg ref={svgRef} name={name.trim()} school={config.schoolName} place={`${config.village}, ${config.state}`} date={date} />
        </div>
      </Box>
    </div>
  );
};

export default Certificate;
