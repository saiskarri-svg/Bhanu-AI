import type { SiteData } from './model';

// Sample villages: real building data fetched by pipeline/gridsight_fetch.py
// from Google Open Buildings v3 and Overture Maps (OpenStreetMap). Each file
// covers a 1 km radius around the village point.
const files = import.meta.glob('../data/*.json', { eager: true, import: 'default' }) as Record<string, SiteData>;

export const ORDER = ['gbamu-gbamu', 'kychom', 'talek', 'kitobo', 'bulongwa'];
export const FLAG: Record<string, string> = { NG: 'Nigeria', KE: 'Kenya', UG: 'Uganda', TZ: 'Tanzania', SL: 'Sierra Leone' };
export const WEST = ['NG', 'SL', 'GH', 'LR', 'SN', 'ML', 'BF', 'NE', 'CI', 'GN', 'TG', 'BJ'];

export const SITES: { id: string; data: SiteData }[] = Object.entries(files)
  .map(([path, data]) => ({ id: path.split('/').pop()!.replace('.json', ''), data }))
  .sort((a, b) => (ORDER.indexOf(a.id) + 99 * +(ORDER.indexOf(a.id) < 0)) - (ORDER.indexOf(b.id) + 99 * +(ORDER.indexOf(b.id) < 0)));
