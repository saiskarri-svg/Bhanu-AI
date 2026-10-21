// Risk levels for faults and alerts. Only a high risk item triggers a WhatsApp
// message, so nobody gets spammed; that one message lists every open item for
// the site, with its address, so everything is fixed in one visit.

export type Risk = 'High' | 'Medium' | 'Low';

export const RISK_TONE: Record<Risk, 'bad' | 'warn' | 'info'> = { High: 'bad', Medium: 'warn', Low: 'info' };

export const RISK_MEANING: Record<Risk, string> = {
  High: 'Safety or fire risk, or the system may stop.',
  Medium: 'Losing power or money, but safe.',
  Low: 'Good to know or a routine reminder.',
};

// Words that point to an electrical safety problem or a stopped system
const HIGH = [/isolation/i, /earth|ground fault/i, /dc injection/i, /surge/i, /arc/i, /burn|smoke|spark|hot spot/i, /mc4|connector loose|loose connector/i, /inverter.*(fault|off|trip)/i, /shock|exposed|broken glass|crack/i, /fire/i];
const MEDIUM = [/output drop|underperform|low output/i, /shade|shading/i, /dust|dirty|soiling|cleaning overdue/i, /meter/i];

/** Classify a fault description written by the sensors, a teacher or a technician. */
export function classifyFault(text: string): Risk {
  if (HIGH.some(r => r.test(text))) return 'High';
  if (MEDIUM.some(r => r.test(text))) return 'Medium';
  return 'Low';
}

// ---------- WhatsApp sending limits ----------

/** At most this many WhatsApp messages per day to one phone number about one site. */
export const WA_DAILY_CAP = 3;
/** The same alert is not sent again for this many hours. */
export const WA_COOLDOWN_H = 24;

/** One send. `phone` (digits only) and `site` scope the limit: a different number or site has its own count. */
export interface WaSend { alert: string; at: string; phone?: string; site?: string }

export const phoneKey = (p: string) => p.replace(/\D/g, '');
export const siteKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function waStatus(all: WaSend[], alertId: string, at = Date.now(), scope?: { phone: string; site: string }) {
  const now = Math.max(at, Date.now());
  // Count only sends to this number about this site
  const sends = scope ? all.filter(s => (s.phone ?? '') === scope.phone && (s.site ?? '') === scope.site) : all;
  const dayAgo = now - 24 * 3600e3;
  const today = sends.filter(s => new Date(s.at).getTime() > dayAgo);
  const last = sends.filter(s => s.alert === alertId).map(s => new Date(s.at).getTime()).sort((a, b) => b - a)[0];
  const cooldownLeft = last ? Math.max(0, last + WA_COOLDOWN_H * 3600e3 - now) : 0;
  const capLeft = WA_DAILY_CAP - today.length;
  // When the cap is reached, the oldest send in the last 24 hours frees a slot first
  const oldest = today.map(s => new Date(s.at).getTime()).sort((a, b) => a - b)[0];
  const capWait = capLeft > 0 ? 0 : oldest + 24 * 3600e3 - now;
  return { usedToday: today.length, capLeft: Math.max(0, capLeft), cooldownLeft, wait: Math.max(cooldownLeft, capWait), lastSent: last ?? null };
}

export const hoursText = (ms: number) => {
  const h = Math.round(ms / 3600e3);
  return h < 1 ? 'in under an hour' : h === 1 ? 'in about 1 hour' : `in ${h} hours`;
};
