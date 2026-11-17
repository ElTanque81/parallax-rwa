// Calls every RWA endpoint Parallax uses against the LIVE CoinMarketCap API
// and saves request + (trimmed) response to docs/evidence/ as submission proof.
// The API key is read from .env / environment and is never written to disk.
'use strict';

const fs = require('fs');
const path = require('path');
const { CmcClient } = require('../src/cmc');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
if (!process.env.CMC_API_KEY) {
  console.error('Set CMC_API_KEY in .env first.');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', 'docs', 'evidence');
fs.mkdirSync(OUT, { recursive: true });
const cmc = new CmcClient({ apiKey: process.env.CMC_API_KEY, baseUrl: process.env.CMC_BASE_URL });

function trim(obj, depth = 0) {
  if (Array.isArray(obj)) return obj.slice(0, 3).map((x) => trim(x, depth + 1));
  if (obj && typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, trim(v, depth + 1)]));
  return obj;
}

async function save(name, fn, params) {
  try {
    const body = await fn(params);
    const rec = { requested_at: new Date().toISOString(), request: cmc.log[0] && { endpoint: cmc.log[0].endpoint, params: cmc.log[0].params }, status: body.status, data_sample: trim(body.data) };
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(rec, null, 2));
    console.log(`OK   ${cmc.log[0].endpoint}  credits=${body.status.credit_count}  elapsed=${body.status.elapsed}ms`);
    return body;
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    return null;
  }
}

(async () => {
  const map = await save('01-map', (p) => cmc.map(p), { symbol: 'NVDA,GOLD' });
  const list = await save('02-assets-list', (p) => cmc.assetsList(p), { sort: 'tokenized_market_cap', sort_dir: 'desc', limit: 25 });
  // assets/list can contain entries with rwa_id: null (seen live), so filter them out
  const ids = list ? list.data.rwa_assets.filter((a) => a.has_tokens && a.rwa_id).map((a) => a.rwa_id).slice(0, 25).join(',') : '1,2';
  await save('03-quotes-latest', (p) => cmc.quotesLatest(p), { rwa_id: ids });
  const firstId = map && map.data.rwa_assets[0] ? map.data.rwa_assets[0].rwa_id : 1;
  await save('04-info', (p) => cmc.info(p), { rwa_id: firstId });
  await save('05-market-pairs', (p) => cmc.marketPairs(p), { rwa_id: firstId, limit: 50 });
  const issuers = await save('06-issuers-list', (p) => cmc.issuersList(p), { limit: 50 });
  const iid = issuers && issuers.data.issuers[0] ? issuers.data.issuers[0].issuer_id : null;
  if (iid) await save('07-issuer', (p) => cmc.issuer(p), { issuer_id: iid });
  console.log(`\nTotal credits used: ${cmc.creditsUsed}. Evidence written to docs/evidence/`);
})();
