// Recent open satellite pictures (Copernicus Sentinel-2, 10 m), one per
// village, made by pipeline/satellite.py. Inlined into the build.
const pics = import.meta.glob('../data/imagery/*.jpg', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const metas = import.meta.glob('../data/imagery/*.json', { eager: true, import: 'default' }) as Record<string, ImageryMeta>;

export interface ImageryMeta { site: string; date: string; scene: string; clear: number; bounds: { west: number; south: number; east: number; north: number }; resolution_m: number; source: string; credit: string }
export interface Imagery extends ImageryMeta { url: string }

export const IMAGERY: Record<string, Imagery> = Object.fromEntries(Object.entries(metas).map(([p, m]) => {
  const id = p.split('/').pop()!.replace('.json', '');
  const url = Object.entries(pics).find(([q]) => q.endsWith(`/${id}.jpg`))?.[1];
  return [id, url ? { ...m, url } : null];
}).filter(([, v]) => v)) as Record<string, Imagery>;

export const fmtDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
