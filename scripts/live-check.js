// Runs the Parallax pipeline once against the LIVE API, prints a summary and
// records every raw response into fixtures-live/ (no key is ever written),
// so a real market snapshot can be replayed offline:  DEMO_FIXTURES=fixtures-live npm start
'use strict';
process.env.RECORD_FIXTURES = '1';
const fs = require('fs');
const path = require('path');
const { scan, cmc } = require('../server');

(async () => {
  const out = path.join(__dirname, '..', 'docs', 'evidence');
  fs.mkdirSync(out, { recursive: true });
  const live = path.join(__dirname, '..', 'fixtures-live');
  fs.rmSync(live, { recursive: true, force: true });
  try {
    if (cmc.mode !== 'live') throw new Error('CMC_API_KEY missing in .env');
    const r = await scan({ limit: Number(process.env.SCAN_LIMIT || 100) });
    const ids = r.assets.map((a) => a.rwa_id);
    await cmc.info({ rwa_id: ids.join(','), skip_invalid: 'true' });
    await cmc.map({ limit: 250, sort: 'rwa_rank' });
    const issuers = await cmc.issuersList({ limit: 250 });
    for (const i of issuers.data.issuers) {
      if (i.num_tokens > 0) await cmc.issuer({ issuer_id: i.issuer_id, limit: 250 }).catch((e) => console.log('issuer', i.name, e.message));
    }
    // market pairs: one call per asset; stop at the first plan refusal
    for (const a of r.assets.filter((x) => x.issuer_count > 1)) {
      try {
        await cmc.marketPairs({ rwa_id: a.rwa_id, limit: 250 });
      } catch (e) {
        console.log('market-pairs:', e.message);
        break;
      }
    }
    fs.writeFileSync(path.join(out, 'live-radar-summary.json'), JSON.stringify({ at: new Date().toISOString(), summary: r.summary,
      assets: r.assets.map((a) => ({ symbol: a.symbol, type: a.asset_type, issuers: a.issuer_count, spread_bps: Math.round(a.spread_bps * 10) / 10, best_twin: a.best_twin, arb: a.arb })) }, null, 1));
    console.log('radar:', r.summary);
  } catch (e) {
    console.error('LIVE CHECK FAILED:', e.message);
  }
  fs.writeFileSync(path.join(out, 'live-calls.json'), JSON.stringify(cmc.log.map((c) => ({ ...c, response_preview: c.response_preview.slice(0, 400) })), null, 1));
  console.log('mode', cmc.mode, '| calls', cmc.log.length, '| credits', cmc.creditsUsed);
  process.exit(0);
})();
