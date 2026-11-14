// Render-check dimension pages in a headless browser.
//
// Usage (from the repo root):
//   node scripts/render_check.js [dimension ...] [--shots DIR]
//
// Serves site/ on a local port, opens ward.html, clicks each dimension card
// (all dimensions if none are named) and reports: page errors, number of trend
// charts, headline values, and any "undefined"/"NaN" text. With --shots DIR it
// also saves a screenshot of each dimension's page. Exits 1 on any error.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'site');
const args = process.argv.slice(2);
const shotIdx = args.indexOf('--shots');
const shotDir = shotIdx >= 0 ? args[shotIdx + 1] : null;
const dims = args.filter((a, i) => !a.startsWith('--') && (shotIdx < 0 || i !== shotIdx + 1));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(0, async () => {
  const base = `http://localhost:${server.address().port}/ward.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForTimeout(1000);
  const all = await page.$$eval('.dimension-card', els => [...new Set(els.map(e => e.dataset.dimension))]);
  let failed = errors.length > 0;
  for (const dim of (dims.length ? dims : all)) {
    await page.goto(base);
    await page.waitForTimeout(800);
    const card = await page.$(`.dimension-card[data-dimension="${dim}"]`);
    if (!card) { console.log(`${dim}: no card found`); failed = true; continue; }
    await card.click();
    await page.waitForTimeout(700);
    const charts = (await page.$$('#detail-container svg[id^="trend-chart-"]')).length;
    const values = await page.$$eval('.value-readout .big-value', els => els.map(e => e.innerText));
    const text = await page.$eval('#detail-container', e => e.innerText);
    const bad = (text.match(/\bundefined\b|\bNaN\b/g) || []).length;
    if (bad) failed = true;
    console.log(`${dim}: ${charts} chart(s); headlines ${JSON.stringify(values)}${bad ? `; ${bad} undefined/NaN` : ''}`);
    if (shotDir) {
      fs.mkdirSync(shotDir, { recursive: true });
      await page.screenshot({ path: path.join(shotDir, `${dim}.png`), fullPage: true });
    }
  }
  console.log(errors.length ? `Page errors: ${JSON.stringify(errors)}` : 'No page errors');
  await browser.close();
  server.close();
  process.exit(failed || errors.length ? 1 : 0);
});
