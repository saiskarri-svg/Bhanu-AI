// Desktop and phone screenshots of Bhanu AI tabs, with error and overflow checks.
// node shoot.mjs --tabs "Learn,Mission" --out ./shots [--section "Heading"] [--click "A,B"] [--url ...] [--wait 1500]
import { createRequire } from 'module';
// require() honours NODE_PATH, so a globally installed Playwright is found
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const tabs = (args.tabs || 'Overview').split(',').map(s => s.trim()).filter(Boolean);
const out = args.out || './shots';
const url = args.url || 'http://localhost:3002';
const wait = Number(args.wait || 1500);
const clicks = args.click ? args.click.split(',').map(s => s.trim()) : [];
mkdirSync(out, { recursive: true });

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  for (const tab of tabs) {
    await page.getByRole('tab', { name: tab, exact: false }).first().click();
    await page.waitForTimeout(400);
    for (const c of clicks) await page.getByRole('button', { name: c }).first().click().catch(() => console.log(`could not click "${c}"`));
    await page.waitForTimeout(wait);
    const file = `${out}/${slug(tab)}${args.section ? '-' + slug(args.section) : ''}-${name}.png`;
    if (args.section) {
      const box = page.getByText(args.section, { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded-box") or self::section][1]');
      await box.scrollIntoViewIfNeeded();
      await box.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file, fullPage: true });
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sideways > 0) failed = true;
    console.log(`${file}  sideways scroll: ${sideways}px`);
  }
  if (errors.length) failed = true;
  console.log(`${name} page errors:`, errors.length ? errors : 'none');
  await page.close();
}
await browser.close();
if (failed) { console.log('CHECK FAILED: fix overflow or errors before sending.'); process.exit(1); }
