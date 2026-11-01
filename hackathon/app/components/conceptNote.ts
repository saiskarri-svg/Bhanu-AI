import type { Engine } from './engine';
import type { SiteData } from './model';
import { derive, type Settings } from './settings';
import { cashFlow } from './CashFlow';
import { lifetime } from './lifetime';
import { lvNetwork, gridVsMini, LV_PER_KM, VERDICT } from './wires';

const n0 = (x: number) => Math.round(x).toLocaleString('en-US');
const usd = (x: number) => (x >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : x >= 1e4 ? `$${n0(x / 1000)}k` : `$${n0(x)}`);
const pc = (x: number) => `${Math.round(x * 100)}%`;

// Two-page concept note for funders, built from the numbers on screen
export const conceptNote = async (site: SiteData, eng: Engine, s: Settings, grant: number, rate: number, routes: string[], country: string) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const d = derive(eng, s);
  const cf = cashFlow(eng, s, grant);
  const W = 210, M = 18, TW = W - 2 * M;
  let y = 20;
  const need = (h: number) => { if (y + h > 280) { doc.addPage(); y = 20; } };
  const h1 = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(t, M, y); y += 8; };
  const h2 = (t: string) => { need(14); y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(t, M, y); y += 5.5; };
  const p = (t: string, size = 9.5, color = 40) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(t, TW); need(lines.length * size * 0.45); doc.text(lines, M, y); y += lines.length * size * 0.45 + 1.5; doc.setTextColor(0);
  };
  const row = (cells: string[], widths: number[], bold = false) => {
    need(6); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9);
    let x = M; cells.forEach((c, i) => { doc.text(c, x, y); x += widths[i]; }); y += 5;
  };

  const S = eng.summary, E = d.E!, des = d.des!;
  h1(`Mini-grid concept note: ${site.name}`);
  p(`${site.region && site.region.includes(country) ? site.region : [site.region, country].filter(Boolean).join(', ')} · ${site.lat.toFixed(4)}, ${site.lon.toFixed(4)} · prepared with GridSight from open data, ${new Date().toISOString().slice(0, 10)}. All figures are rough guides to be checked on site.`, 9, 90);

  h2('1. The opportunity');
  p(`${n0(eng.landuse.residential_buildings)} homes and outbuildings within 1 km (${n0(S.households[0].p50)} households from roofs${eng.by_population ? `; Meta's population map suggests ${n0(eng.by_population.households[0].p50)}` : ''}). No mini-grid demand data exists here yet, so demand is forecast from satellite roofs, measured connection and appliance curves, and metered sites within 1,000 miles.`);

  h2(`2. Expected demand (households from ${d.meta ? "Meta's map" : 'roofs'})`);
  row(['Year', 'kWh a day, most likely', 'Range (P10 to P90)', 'Customers', 'Evening peak'], [16, 44, 44, 30, 30], true);
  for (let i = 0; i < 5; i++) row([`${i + 1}`, n0(E[i].p50), `${n0(E[i].p10)} to ${n0(E[i].p90)}`, n0(d.CU![i].p50), `${n0(d.PK![i].p50)} kW`], [16, 44, 44, 30, 30]);

  h2('3. Proposed system');
  p(`${des.design.split(' ')[0]} size (covers that share of 4,000 simulated futures in year 5): ${n0(des.pv_kwp)} kWp of solar, ${n0(des.battery_kwh)} kWh of battery. Build cost about ${usd(des.capex_usd)} (${s.cost === 'amda' ? "AMDA 2024 benchmark per connection for the region" : s.cost === 'irena' ? 'IRENA 2024 equipment prices with a 1.5x remote-site premium, plus 40% for wires, meters and soft costs' : '2021 Omorate prices including distribution'}; rough guide, replace with quotes).${d.rk ? ` Chance of brownouts by year ${s.yr}: ${pc(d.rk.p_brownouts)}; chance it is under 60% used: ${pc(d.rk.p_underused)}.` : ''} ${d.stage2 ? `Built in stages: this first stage covers year-2 demand; about ${usd(d.stage2.capex_usd)} more is added at the start of year 3 to reach the full system.` : 'Build in stages: the first stage can be sized for year-2 to year-3 demand.'}`);
  { const lv = lvNetwork(site), g = gridVsMini(site, eng, s);
    p(`Village network: about ${lv.km.toFixed(1)} km of low-voltage line reaches ${n0(lv.reached)} of ${n0(lv.total)} roofs, roughly ${usd(lv.km * LV_PER_KM.mid)} (${usd(lv.km * LV_PER_KM.lo)} to ${usd(lv.km * LV_PER_KM.hi)}). Grid alternative: the nearest mapped line is ${g.known ? `${g.km.toFixed(1)} km` : `over ${g.km} km`} away; a medium-voltage line costs about ${usd(g.grid.mid)} (${usd(g.grid.lo)} to ${usd(g.grid.hi)}) against ${usd(g.gen)} for solar and battery. ${VERDICT[g.verdict]} (break-even about ${g.breakEven.toFixed(1)} km; line cost only, rough guide).`); }
  if (eng.weather_sim) p(`Checked against 10 real weather years (NASA POWER, 2015 to 2024): clouds, heat and dust on panels included.`);

  h2('4. Affordability and cost recovery');
  if (d.tsel) p(`At $${s.tar.toFixed(2)} a kWh the most likely household bill in year 5 is $${d.tsel.year5_household_bill_usd_month_p50.toFixed(2)} a month, and revenue covers the cost of the P50 system in ${pc(d.tsel.p_revenue_covers_cost_year5)} of futures (no grant). Families typically spend $5 to $20 a month today on kerosene, candles and batteries (ESMAP 2022).`);

  h2('5. Grant and first 24 months');
  if (cf) {
    p(`A results-based grant of $${rate} per connection for ${n0(d.CU![4].p50)} connections gives about ${usd(grant)} (${pc(grant / des.capex_usd)} of the build cost). The rest: a loan of ${usd(cf.loan)} (${Math.round(cf.T.debtShare * 100)}%, ${cf.T.years} years at ${Math.round(cf.T.rate * 100)}%${cf.T.grace ? `, ${cf.T.grace}-month grace` : ''}, ${usd(cf.debt)} a month) and ${usd(cf.equity)} from the developer.`);
    p(`Cash after running costs and loan payments: ${cf.firstPositive ? `first positive month ${cf.firstPositive}` : 'not positive within 24 months'}; ${cf.total >= 0 ? 'ahead' : 'short'} by ${usd(Math.abs(cf.total))} after 24 months${cf.dscr !== undefined ? `; debt cover in year 2 about ${cf.dscr.toFixed(2)}x` : ''}. Assumes ${Math.round(cf.T.collection * 100)}% of bills collected.${cf.total < 0 ? ' The early gap comes from demand ramping up as homes connect; a smaller first stage, a larger grant, lower build costs or a loan grace period close it.' : ''}`);
  }

  { const L = lifetime(eng, s, grant);
    if (L) p(`Over 20 years: the owner's money (${usd(L.equity)}) is back in ${L.ownerPayback === null ? 'more than 20 years' : `about ${L.ownerPayback.toFixed(1)} years`}, and the whole project after the grant in ${L.projectPayback === null ? 'more than 20 years' : `about ${L.projectPayback.toFixed(1)} years`}, counting battery and inverter renewal around year 11${L.capex3 ? ' and the year-3 expansion' : ''}. Owner's cash after 20 years: ${L.ownerTotal < 0 ? '-' : ''}${usd(Math.abs(L.ownerTotal))}. Demand grows 2% a year after year 5 (assumption).`); }

  h2('6. Funding routes to approach');
  routes.forEach(r => p(`• ${r}`, 9));
  p('Potential partners, not approvals or open calls. Confirm live status, eligibility, matching money and timing with each.', 8.5, 110);

  h2('7. What we ask for');
  p('1) A household count and short business walk-through in the village (the biggest driver of the range). 2) Partner introductions for installation and maintenance. 3) Grant or concessional finance for the first stage. 4) Monthly site totals once running, shared through a data trust, to sharpen future forecasts.');

  h2('Method and sources');
  p('Roofs: Google Open Buildings, Microsoft and OpenStreetMap via Overture Maps. Demand engine: Fereshteh (forecast/demand_forecast.py), with measured connection and appliance curves (Faza, Kenya), published meter data and ESMAP 2022. Weather: NASA POWER, CMIP6. Satellite: Sentinel-2. Costs: Wassie and Ahlgren 2023 (2021 prices); AMDA Benchmarking Africa\'s Minigrids 2024 (2022 to 2024 data); IRENA Renewable Power Generation Costs in 2024. Line costs per km: ESMAP tables, OnSSET West Africa 2026, World Bank 2019, RMI 2018. Built by the GridSight team for the Global Energy Hackathon 2026.', 8.5, 90);

  const name = `GridSight-concept-note-${site.name.replace(/\s+/g, '-')}.pdf`;
  // Inside claude.ai the page asks the runtime to save; elsewhere a normal download
  const w = window as unknown as { claude?: { use(n: string): Promise<{ save(f: { filename: string; data: Blob }): Promise<void> } | null> } };
  const dl = w.claude?.use ? await w.claude.use('downloads').catch(() => null) : null;
  if (dl) { await dl.save({ filename: name, data: doc.output('blob') }); return; }
  doc.save(name);
};
