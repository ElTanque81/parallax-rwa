// Parallax: one asset, many tokens. See the spread.
// Zero-dependency Node server: serves the UI and a small JSON API built on the
// CoinMarketCap Pro API v5 Real-World-Asset endpoints.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { CmcClient } = require('./src/cmc');
const { HistoryStore } = require('./src/store');
const { Alerter } = require('./src/alerts');
const M = require('./src/metrics');

loadDotEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 8787);
const SCAN_LIMIT = Math.min(250, Number(process.env.SCAN_LIMIT || 60));
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MIN || 5) * 60_000;
const ARB_BPS = Number(process.env.ARB_THRESHOLD_BPS || 75);

const cmc = new CmcClient({
  apiKey: process.env.CMC_API_KEY,
  baseUrl: process.env.CMC_BASE_URL,
  fixturesDir: path.join(__dirname, process.env.DEMO_FIXTURES || 'fixtures'),
  snapshot: Boolean(process.env.DEMO_FIXTURES && !process.env.CMC_API_KEY),
  recordDir: process.env.RECORD_FIXTURES ? path.join(__dirname, 'fixtures-live') : undefined,
  cacheTtlMs: 55_000,
});
const history = new HistoryStore(path.join(__dirname, 'data', cmc.mode === 'live' ? 'history.json' : `history-${cmc.mode}.json`));
const alerter = new Alerter({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});

let lastScan = null;

// ---------- core pipeline ----------

async function scan({ assetType, limit = SCAN_LIMIT } = {}) {
  // 1) Rank the universe by tokenized market cap.
  const list = await cmc.assetsList({
    sort: 'tokenized_market_cap',
    sort_dir: 'desc',
    limit,
    asset_type: assetType,
  });
  const ids = list.data.rwa_assets.filter((a) => a.has_tokens && a.rwa_id).map((a) => a.rwa_id);
  if (!ids.length) return { summary: M.summarize([]), assets: [] };

  // 2) One batched quotes call returns every issuer token per asset.
  const quotes = await cmc.quotesLatest({ rwa_id: ids.join(',') });
  const analyzed = quotes.data.rwa_assets
    .map((a) => M.analyzeAsset(a, { arbThresholdBps: ARB_BPS }))
    .sort((a, b) => b.tokenized_market_cap - a.tokenized_market_cap);

  return { summary: M.summarize(analyzed), assets: analyzed };
}

// Demo mode only: synthesize 24h of past snapshots so the history chart has
// something to show. Live mode records real snapshots and never does this.
function seedDemoHistory(assets) {
  if (cmc.mode !== 'demo' || Object.keys(history.series).length) return;
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const now = Date.now();
  for (let i = 288; i >= 1; i--) {
    const at = new Date(now - i * 5 * 60_000).toISOString();
    const wobble = assets.map((a) => {
      const k = 0.55 + 0.45 * Math.sin(i / 37 + a.rwa_id) + (rnd() - 0.5) * 0.3;
      return { ...a, spread_bps: Math.max(0, a.spread_bps * k), twins: a.twins.map((tw) => ({ ...tw, deviation_bps: tw.deviation_bps * k })) };
    });
    history.record(wobble, at);
  }
}

async function backgroundScan() {
  try {
    const r = await scan();
    seedDemoHistory(r.assets);
    history.record(r.assets);
    await alerter.check(r.assets);
    lastScan = { at: new Date().toISOString(), ...r.summary };
    console.log(`[scan] ${r.assets.length} assets, ${r.summary.multi_issuer_assets} multi-issuer, ${r.summary.arb_count} alerts (${cmc.mode})`);
  } catch (e) {
    console.warn('[scan] failed:', e.message);
  }
}

async function assetDetail(id) {
  const [quotes, info, pairs] = await Promise.all([
    cmc.quotesLatest({ rwa_id: id }),
    cmc.info({ rwa_id: id }).catch(() => null),
    cmc.marketPairs({ rwa_id: id, limit: 250 }).catch(() => null),
  ]);
  const raw = quotes.data.rwa_assets[0];
  if (!raw) return null;
  const venues = pairs ? M.venueStats(pairs.data.market_pairs) : {};
  const analysis = M.analyzeAsset(raw, { venuesBySymbol: venues, arbThresholdBps: ARB_BPS });
  return {
    ...analysis,
    info: info && info.data.rwa_assets[0] ? info.data.rwa_assets[0] : null,
    venues,
    num_market_pairs: pairs ? pairs.data.num_market_pairs : null,
    history: history.get(id),
  };
}

async function issuers() {
  const [radar, list] = await Promise.all([
    scan(),
    cmc.issuersList({ limit: 250 }),
  ]);
  return {
    leaderboard: M.issuerLeaderboard(radar.assets, list.data.issuers),
    all: list.data.issuers,
  };
}

// ---------- http ----------

const routes = [
  ['GET', /^\/api\/status$/, async () => ({
    mode: cmc.mode,
    snapshot_at: cmc.mode === 'snapshot' ? snapshotTime() : null,
    credits_used: cmc.creditsUsed,
    last_scan: lastScan,
    scan_limit: SCAN_LIMIT,
    arb_threshold_bps: ARB_BPS,
    alerts_enabled: alerter.enabled,
  })],
  ['GET', /^\/api\/radar$/, (q) => scan({ assetType: q.get('asset_type') || undefined })],
  ['GET', /^\/api\/radar\.csv$/, async (q) => {
    const r = await scan({ assetType: q.get('asset_type') || undefined });
    const head = 'rwa_id,symbol,name,asset_type,tokenized_market_cap,tokenized_volume_24h,comparable_issuers,listed_tokens,spread_bps,hhi,best_twin,arb';
    const rows = r.assets.map((a) => [a.rwa_id, a.symbol, JSON.stringify(a.name), a.asset_type,
      a.tokenized_market_cap.toFixed(0), a.tokenized_volume_24h.toFixed(0), a.issuer_count, a.token_count,
      a.spread_bps.toFixed(1), a.hhi ?? '', a.best_twin ?? '', a.arb ? `${a.arb.buy}->${a.arb.sell}` : ''].join(','));
    return { __raw: [head, ...rows].join('\n'), __type: 'text/csv' };
  }],
  ['GET', /^\/api\/asset\/(\d+)$/, async (_q, m) => (await assetDetail(Number(m[1]))) || { __status: 404, error: 'not found' }],
  ['GET', /^\/api\/history\/(\d+)$/, async (_q, m) => history.get(Number(m[1]))],
  ['GET', /^\/api\/issuers$/, () => issuers()],
  ['GET', /^\/api\/issuer\/([0-9a-f]{24})$/, async (_q, m) => (await cmc.issuer({ issuer_id: m[1], limit: 250 })).data],
  ['GET', /^\/api\/search$/, async (q) => {
    const s = (q.get('q') || '').trim().toUpperCase();
    if (!s) return [];
    const r = await cmc.map({ symbol: s }).catch(() => null);
    return r ? r.data.rwa_assets : [];
  }],
  ['GET', /^\/api\/inspector$/, async () => ({ mode: cmc.mode, credits_used: cmc.creditsUsed, calls: cmc.log })],
  ['GET', /^\/api\/alerts$/, async () => ({ enabled: alerter.enabled, threshold_bps: ARB_BPS, recent: alerter.sent })],
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    for (const [method, re, fn] of routes) {
      const m = url.pathname.match(re);
      if (req.method === method && m) {
        try {
          const out = await fn(url.searchParams, m);
          if (out && out.__raw !== undefined) {
            res.writeHead(200, { 'Content-Type': out.__type });
            return res.end(out.__raw);
          }
          res.writeHead(out && out.__status ? out.__status : 200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(out));
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: e.message }));
        }
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end('{"error":"unknown route"}');
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(__dirname, 'public', rel));
  if (!file.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

function snapshotTime() {
  try {
    return JSON.parse(fs.readFileSync(path.join(cmc.fixturesDir, 'quotes_latest.json'), 'utf8')).status.timestamp;
  } catch {
    return null;
  }
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Parallax running on http://localhost:${PORT}  (mode: ${cmc.mode})`);
    if (cmc.mode === 'demo') console.log('No CMC_API_KEY set: serving recorded demo fixtures. Add your key to .env for live data.');
    backgroundScan();
    setInterval(backgroundScan, SCAN_INTERVAL_MS).unref();
  });
}

module.exports = { server, scan, assetDetail, cmc };
