// Small helpers around the claude.ai page runtime. Every helper works
// without it too (local dev, the single HTML file), falling back to the
// browser.

type AnyCap = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const w = window as unknown as { claude?: { use(name: string): Promise<AnyCap | null> } };

export const useCap = (name: string): Promise<AnyCap | null> =>
  w.claude?.use ? w.claude.use(name).catch(() => null) : Promise.resolve(null);

/** Offer a file to the viewer. Returns false if they declined or it could not be saved. */
export async function saveFile(filename: string, data: string | Blob): Promise<boolean> {
  const downloads = await useCap('downloads');
  if (downloads) {
    try { await downloads.save({ filename, data }); return true; } catch { return false; }
  }
  if (w.claude) return false; // inside a viewer that cannot save
  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// ---------- Learning progress, kept on this device ----------

const PROGRESS_KEY = 'bhanu-progress';
const EVENT = 'bhanu-progress';

export type ProgressKey = 'hazards' | 'drill' | 'challenges' | 'audit' | 'detective';

export function readProgress(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

export function markDone(key: ProgressKey) {
  const p = readProgress();
  if (p[key]) return;
  p[key] = true;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* storage may be blocked */ }
  window.dispatchEvent(new Event(EVENT));
}

export function quizBest(id: string): number {
  try { return Number(localStorage.getItem(`bhanu-quiz-${id}`)) || 0; } catch { return 0; }
}

export const notifyProgress = () => window.dispatchEvent(new Event(EVENT));
export const PROGRESS_EVENT = EVENT;

// ---------- Last panel cleaning, shared between the log and the planner ----------

const CLEAN_EVENT = 'bhanu-last-clean';
let lastClean: string | null = null;

export function setLastClean(iso: string | null) {
  if (iso === lastClean) return;
  lastClean = iso;
  window.dispatchEvent(new Event(CLEAN_EVENT));
}
export const getLastClean = () => lastClean;
export const LAST_CLEAN_EVENT = CLEAN_EVENT;

// ---------- Asking Claude from the page ----------

export type SampleFn = ((input: unknown, options?: Record<string, unknown>) => Promise<{ text: string; truncated: boolean }>) & {
  limits?: () => Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
};

let samplePromise: Promise<SampleFn | null> | null = null;
export const getSample = () => (samplePromise ??= useCap('sample') as Promise<SampleFn | null>);

/** Viewer-facing copy for a failed AI call. */
export function sampleErrorText(code?: string) {
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'AI answers are turned off for this page. Allow Claude for this page to use them.';
    case 'rate_limited':
      return 'Too many questions right now. Wait a minute and try again.';
    case 'session_expired':
      return 'Please sign in to Claude again, then try once more.';
    case 'refused':
      return 'The advisor could not answer that. Try asking it differently.';
    case 'image_rejected':
      return 'That photo could not be used. Try a smaller JPG or PNG.';
    case 'prompt_too_large':
      return 'That was too much to send at once. Ask about less at a time.';
    default:
      return 'Something went wrong. Try again in a moment.';
  }
}

// ---------- Spreadsheet export ----------

/** Offer rows as a CSV file that opens in Excel or Google Sheets. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = [headers.map(q).join(','), ...rows.map(r => r.map(q).join(','))].join('\n');
  return saveFile(filename, new Blob([text], { type: 'text/csv' }));
}
