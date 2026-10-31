export const n0 = (x: number) => Math.round(x).toLocaleString('en-US');
export const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('en-US');
export const kwh = (x: number) => (x >= 10000 ? `${n1(x / 1000)} MWh` : `${n0(x)} kWh`);
export const usd = (x: number) => (x >= 1e6 ? `$${n1(x / 1e6)}M` : x >= 1e4 ? `$${n0(x / 1000)}k` : `$${n0(x)}`);
export const pc = (x: number) => `${Math.round(x * 100)}%`;
export const round2 = (x: number) => { const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1)); return Math.round(x / m) * m; };
