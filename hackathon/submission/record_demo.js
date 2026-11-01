// Scripted, captioned walkthrough of Kesho AI, recorded to video
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:3100/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  const K = 1.32; // pacing
  const wait = ms => p.waitForTimeout(Math.round(ms * K));
  const fs = require('fs'); const DIR = '/tmp/claude-0/frames'; fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR);
  const log = []; let n = 0; let rec = false;
  const cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', async f => {
    if (rec) { const name = `f${String(n++).padStart(6, '0')}.jpg`; fs.writeFileSync(`${DIR}/${name}`, Buffer.from(f.data, 'base64')); log.push([name, f.metadata.timestamp]); }
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  // keep frames coming even when nothing moves: a 1px element that changes every 100 ms
  const tick = () => p.evaluate(() => { if (document.getElementById('demo-tick')) return; const t = document.createElement('div'); t.id = 'demo-tick'; t.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;pointer-events:none'; document.body.appendChild(t); let k = 0; setInterval(() => { t.style.background = k++ % 2 ? 'rgba(0,0,0,.01)' : 'rgba(0,0,0,.02)'; }, 100); });
  const cap = async (title, text) => p.evaluate(([t, x]) => {
    let d = document.getElementById('demo-cap');
    if (!d) { d = document.createElement('div'); d.id = 'demo-cap'; d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:28px;z-index:99999;max-width:1240px;width:calc(100% - 80px);background:rgba(10,12,18,.92);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:16px 24px;font:21px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);pointer-events:none'; document.body.appendChild(d); }
    d.innerHTML = (t ? `<div style="font-weight:700;color:#ffc23d;margin-bottom:3px">${t}</div>` : '') + x;
  }, [title, text]);
  const tab = async name => { await p.getByRole('tab', { name, exact: true }).first().click(); await wait(1200); };
  const scrollTo = async (re, off = 90) => { const el = p.getByRole('heading', { name: re }).first(); await el.evaluate((e, o) => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - o, behavior: 'smooth' }), off); await wait(1400); };
  const glide = async (px, ms = 2500) => { await p.evaluate(([d, t]) => new Promise(r => { const s = scrollY, t0 = performance.now(); const f = n => { const k = Math.min(1, (n - t0) / t); scrollTo(0, s + d * k); k < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }), [px, ms]); };

  await p.goto(URL + '#map');
  await p.evaluate(() => { localStorage.setItem('gs-site', 'gbamu-gbamu'); localStorage.removeItem('gs-settings'); localStorage.setItem('gs-theme', 'dark'); });
  await p.reload(); await p.waitForTimeout(3500); await tick();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 }); rec = true; await p.waitForTimeout(300);
  // 1. Intro
  await cap('Kesho AI · Global Energy Hackathon 2026, Brief 03', 'Predict mini-grid demand before building. Kesho AI counts every roof from satellite data, forecasts five years of demand with ranges, then sizes and finances a solar mini-grid. Everything here was built during the sprint, from open data.');
  await wait(9000);
  await cap('Map view: Gbamu Gbamu, Nigeria', '1,346 roofs within 1 km, coloured by what each building is likely used for, on a fresh Sentinel-2 picture. Labels show demand by type. The mapped 85 kWp solar plant is real.');
  await wait(8000);
  await p.getByRole('radio', { name: 'Flat' }).first().click(); await wait(2500);
  await p.getByRole('radio', { name: '3D' }).first().click(); await wait(2500);
  await cap('Site settings, right panel', 'Pick a village, the year after connection, the system size, how households are counted, the build-cost basis and the tariff. The left panel answers for those choices: demand, system, brownout odds and cost.');
  await p.getByRole('button', { name: /Talek/ }).first().click(); await wait(4000);
  await p.getByRole('button', { name: /Gbamu Gbamu/ }).first().click(); await wait(3500);

  // 2. Site
  await tab('Site');
  await cap('Step 1: count the roofs', 'Footprints from Google, Microsoft and OpenStreetMap, merged by Overture with duplicates removed. Google alone sees 91% here; elsewhere as little as half. Every building is classed with a likely range, and old pictures are aged forward.');
  await wait(4000); await glide(520, 4000); await wait(3500);
  await scrollTo(/Footprint sources and dates/);
  await cap('Pictures can be old or missing', 'Each source is dated and homes built since are added at household growth, so an old picture does not under-count the village. A second, independent count comes from Meta\'s population map.');
  await wait(6500);

  // 3. Demand
  await tab('Demand');
  await cap('Step 2: forecast demand', 'The demand engine runs 4,000 futures: how fast homes connect, what appliances they buy, what businesses and clinics use. Gbamu Gbamu: about 124 kWh a day in year 1 growing to 595 by year 5 (411 to 879).');
  await wait(6000);
  await scrollTo(/Two ways to count households/);
  await cap('Two independent household counts', 'Roofs give 867 households in year 1; Meta\'s population map gives 223. The settings bar switches every number between them. One day of counting on the ground settles it.');
  await wait(6500);
  await scrollTo(/An average day/);
  await cap('An average day', 'The hour-by-hour load in year 1 and year 5: a morning bump, daytime business use, and the evening peak the battery must carry.');
  await wait(6000);
  await scrollTo(/Why this number/);
  await cap('Why this number', 'What drives the range, with sources. "Buildings per household" explains about 38% of the uncertainty, so a household count is the most valuable field check.');
  await wait(6000);
  await scrollTo(/Measured load within 1,000 miles/);
  await cap('Calibrated to real meters', 'Published meter data from mini-grids within 1,000 miles pulls the forecast toward what customers actually use.');
  await wait(5500);

  // 4. Money: right size
  await tab('Money');
  await p.getByRole('tab', { name: 'Size and tariff' }).click(); await wait(1200);
  await scrollTo(/Right size/);
  await cap('Step 3: not too big, not too small', 'One P50 build has a 37% chance of brownouts by year 5 and sits mostly idle in early years. The staged plan sizes each stage so brownout odds stay at 15% or less with the least idle kit, and expands when meters pass 80% of what is installed.');
  await wait(9000);
  await p.getByRole('button', { name: 'Use the staged plan' }).click(); await wait(2500);
  await scrollTo(/Wires and the grid/);
  await cap('Wires, grid line or shared plant', 'The village network is measured from the roofs. Bringing the grid 13.9 km is compared with solar and battery, and sharing one plant with nearby settlements saves about $198k within 3 km here.');
  await wait(8000);
  await scrollTo(/Share one plant/); await wait(4000);

  // 5. Money: funding
  await p.getByRole('tab', { name: 'Funding' }).click(); await wait(1500);
  await cap('Step 4: who pays', 'Funding routes for the village\'s country and across Africa, a grant-per-connection check, a 24-month cash flow and a 20-year payback for the owner and the whole project.');
  await wait(6000);
  await scrollTo(/What a grant per connection would cover/);
  await cap('Grants and the first 24 months', 'A results-based grant per connection against the build cost, then month-by-month money in from bills against running costs and loan payments.');
  await wait(6500);
  await scrollTo(/First 24 months of cash/); await wait(4500);
  await scrollTo(/Payback over 20 years/);
  await cap('Payback over 20 years', 'The owner\'s money and the whole project, counting later stages, battery and inverter renewal around year 11 and loan repayment.');
  await wait(6500);
  await scrollTo(/Make it pencil out/);
  await cap('Make it pencil out', 'Lever by lever, the smallest grant per connection that makes year-2 bills cover running costs and the loan, and pays the owner back within 10 years. Green is within the $433 a connection that results-based grants have paid.');
  await wait(9000);
  await scrollTo(/What funders ask for/);
  await cap('Ready for a funder', 'What lenders ask for against what Kesho AI already provides, and a 2-page concept note PDF built from these numbers.');
  await wait(6000);
  await p.getByRole('tab', { name: 'Compare villages' }).click(); await wait(1500);
  await cap('Compare villages', 'All six villages side by side with the same settings: cost per customer, sun, cost cover, bill, cash at 24 months, owner payback and grid distance. A portfolio funders can bundle.');
  await wait(7000);

  // 6. Weather
  await tab('Sun and weather');
  await cap('Step 5: real weather', 'Ten years of NASA POWER weather: cloudy, rainy and dusty days, heat and dust losses, and climate-model outlooks to 2036. The system is sized on the dull season, not the yearly average.');
  await wait(7000);
  await scrollTo(/10 years of real weather/);
  await cap('Tested on ten real years', 'Each system size is run day by day through 2015 to 2024 weather: demand not served, the worst year and the worst month.');
  await wait(6500);
  await scrollTo(/What the battery has to carry/);
  await cap('What the battery has to carry', 'An hour-by-hour year with the design battery: share of demand from the battery, the battery one night needs (P10 to P90), demand not served and a week in the hardest month.');
  await wait(6000); await glide(420, 3500); await wait(3500);

  // 7. Trust
  await tab('Trust');
  await cap('Step 6: check it', 'Building classes tested on 2,225 volunteer-tagged buildings in 84 villages the model never saw, and a real-world check: the 85 kWp plant built at Gbamu Gbamu matches our year-2 demand.');
  await wait(5000); await glide(600, 4000); await wait(3000);
  await p.getByRole('tab', { name: 'Data sharing' }).click(); await wait(1200);
  await cap('Next: share meter data safely', 'A data-trust design so operators share monthly site totals, never customer rows, and get a better model back. Every number on the site links to its source on the Method tab.');
  await wait(7000);

  // 8. Close
  await p.getByRole('tab', { name: 'Map', exact: true }).first().click(); await wait(2000);
  await cap('Kesho AI: see a village\'s power needs before you build', 'Six villages in six countries, open data only. Ask: a pilot developer, meter data from 50 to 200 sites, and an introduction to REA Nigeria. Live prototype and code: github.com/saiskarri-svg/GridSight');
  await wait(9000);
  rec = false; await cdp.send('Page.stopScreencast');
  fs.writeFileSync(`${DIR}/log.json`, JSON.stringify(log));
  console.log('frames', log.length, 'seconds', (log[log.length - 1][1] - log[0][1]).toFixed(1));
  await ctx.close(); await b.close();
})();
