'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/metrics');
const { CmcClient } = require('../src/cmc');
const path = require('path');

const gold = {
  rwa_id: 1, name: 'Gold', symbol: 'GOLD', asset_type: 'commodity', average_tokenized_price: 4000,
  tokenized_market_cap: 4e9, tokenized_volume_24h: 4e8,
  tokens: [
    { symbol: 'PAXG', price: 4010, market_cap: 2e9, volume_24h: 2e8, issuer_id: 'a', issuer_name: 'Paxos' },
    { symbol: 'XAUt', price: 3990, market_cap: 2e9, volume_24h: 2e8, issuer_id: 'b', issuer_name: 'Tether' },
  ],
};

test('consensus is volume weighted', () => {
  assert.equal(M.consensusPrice(gold.tokens), 4000);
  const skew = [{ price: 100, volume_24h: 3 }, { price: 200, volume_24h: 1 }];
  assert.equal(M.consensusPrice(skew), 125);
});

test('consensus falls back to market cap, then to CMC average', () => {
  assert.equal(M.consensusPrice([{ price: 10, market_cap: 1 }, { price: 20, market_cap: 3 }]), 17.5);
  assert.equal(M.consensusPrice([], 42), 42);
});

test('deviation and spread in bps', () => {
  assert.equal(M.deviationBps(4010, 4000), 25);
  const a = M.analyzeAsset(gold);
  assert.equal(Math.round(a.spread_bps), 50);
  assert.equal(a.issuer_count, 2);
  assert.equal(a.hhi, 5000);
});

test('arb flag needs spread above threshold AND liquid legs', () => {
  assert.equal(M.analyzeAsset(gold, { arbThresholdBps: 75 }).arb, null);
  const a = M.analyzeAsset(gold, { arbThresholdBps: 40 });
  assert.deepEqual([a.arb.buy, a.arb.sell], ['XAUt', 'PAXG']);
  const thin = JSON.parse(JSON.stringify(gold));
  thin.tokens[0].volume_24h = 1000;
  assert.equal(M.analyzeAsset(thin, { arbThresholdBps: 40 }).arb, null);
});

test('twin score prefers the token closest to consensus with more liquidity', () => {
  const tokens = [
    { symbol: 'GOOD', price: 100, volume_24h: 1e7, market_cap: 5e7 },
    { symbol: 'BAD', price: 102, volume_24h: 1e4, market_cap: 1e6 },
  ];
  const ranked = M.twinScores(tokens, 100);
  assert.equal(ranked[0].symbol, 'GOOD');
  assert.ok(ranked[0].twin_score > 90);
  assert.ok(ranked[1].twin_score < 40);
});

test('single-issuer asset has no spread and full concentration', () => {
  const a = M.analyzeAsset({ rwa_id: 9, tokens: [{ symbol: 'X', price: 5, market_cap: 10, volume_24h: 1, issuer_name: 'Solo' }] });
  assert.equal(a.spread_bps, 0);
  assert.equal(a.hhi, 10000);
  assert.equal(a.arb, null);
});

test('venue stats group market pairs by base token', () => {
  const v = M.venueStats([
    { exchange: { slug: 'a', name: 'A' }, market_pair: 'T/USDT', market_pair_base: { symbol: 'T' }, quotes: [{ price: 100, volume_24h: 10 }] },
    { exchange: { slug: 'b', name: 'B' }, market_pair: 'T/USDC', market_pair_base: { symbol: 'T' }, quotes: [{ price: 101, volume_24h: 30 }] },
  ]);
  assert.equal(v.T.venues, 2);
  assert.equal(v.T.volume, 40);
  assert.equal(Math.round(v.T.dispersionBps), 100);
  assert.equal(v.T.pairs[0].exchange, 'B');
});

test('issuer leaderboard ranks by fidelity on contested assets only', () => {
  const a = M.analyzeAsset(gold);
  const solo = M.analyzeAsset({ rwa_id: 2, tokens: [{ symbol: 'S', price: 1, issuer_id: 'c', issuer_name: 'Solo' }] });
  const lb = M.issuerLeaderboard([a, solo], [{ issuer_id: 'a', website: 'https://paxos.com' }]);
  assert.equal(lb.length, 2);
  assert.ok(lb.every((i) => i.issuer_name !== 'Solo'));
  assert.equal(lb.find((i) => i.issuer_id === 'a').website, 'https://paxos.com');
});

test('client: demo mode replays fixtures, filters, logs calls and caches', async () => {
  const c = new CmcClient({ fixturesDir: path.join(__dirname, '..', 'fixtures') });
  assert.equal(c.mode, 'demo');
  const r = await c.assetsList({ asset_type: 'commodity', limit: 10 });
  assert.ok(r.data.rwa_assets.length >= 1);
  assert.ok(r.data.rwa_assets.every((x) => x.asset_type === 'commodity'));
  await c.assetsList({ asset_type: 'commodity', limit: 10 });
  assert.equal(c.log.length, 1, 'second identical call is served from cache');
  const m = await c.map({ symbol: 'NVDA' });
  assert.equal(m.data.rwa_assets[0].symbol, 'NVDA');
});

test('client: live mode sends the API key header and surfaces CMC errors', async () => {
  let seen;
  const fake = async (url, opts) => {
    seen = { url, opts };
    return { status: 401, json: async () => ({ data: null, status: { error_code: 1002, error_message: 'API key missing.', credit_count: 0 } }) };
  };
  const c = new CmcClient({ apiKey: 'k', fetchImpl: fake });
  await assert.rejects(() => c.quotesLatest({ rwa_id: 1 }), /API key missing/);
  assert.equal(seen.opts.headers['X-CMC_PRO_API_KEY'], 'k');
  assert.match(seen.url, /\/v5\/real-world-assets\/quotes\/latest\?rwa_id=1$/);
  assert.equal(c.log[0].http_status, 401);
});

test('client: treats the live string error_code "0" as success', async () => {
  const fake = async () => ({ status: 200, json: async () => ({ data: { rwa_assets: [] }, status: { error_code: '0', credit_count: 1 } }) });
  const c = new CmcClient({ apiKey: 'k', fetchImpl: fake });
  const r = await c.assetsList({ limit: 1 });
  assert.deepEqual(r.data.rwa_assets, []);
  assert.equal(c.creditsUsed, 1);
});

test('data hygiene: gram-priced gold is converted, junk tokens are excluded', () => {
  const asset = {
    rwa_id: 1, symbol: 'GOLD', asset_type: 'commodity', average_tokenized_price: 3850,
    tokens: [
      { symbol: 'XAUt', price: 3855, market_cap: 2.9e9, volume_24h: 1.5e8, issuer_id: 'a', issuer_name: 'Tether' },
      { symbol: 'PAXG', price: 3859, market_cap: 1.7e9, volume_24h: 6.9e7, issuer_id: 'b', issuer_name: 'Paxos' },
      { symbol: 'CGO', price: 124.15, market_cap: 1.7e7, volume_24h: 8e5, issuer_id: 'c', issuer_name: 'Comtech Gold' },
      { symbol: 'XAU', price: 3873, market_cap: 0, volume_24h: 0, issuer_id: 'd', issuer_name: 'NA (Derivatives)' },
      { symbol: 'X.D', price: null, market_cap: null, volume_24h: null, issuer_id: 'e', issuer_name: 'Dinari Assets' },
      { symbol: 'OLD', price: 3000, market_cap: 1e5, volume_24h: 0, issuer_id: 'f', issuer_name: 'Stale Co' },
      { symbol: 'ODD', price: 1700, market_cap: 1e6, volume_24h: 5e5, issuer_id: 'g', issuer_name: 'Odd Co' },
    ],
  };
  const a = M.analyzeAsset(asset);
  const cgo = a.twins.find((t) => t.symbol === 'CGO');
  assert.equal(cgo.status, 'unit_adjusted');
  assert.match(cgo.unit_label, /gram/);
  assert.ok(Math.abs(cgo.price - 3861.5) < 5);
  const reasons = Object.fromEntries(a.excluded.map((x) => [x.symbol, x.status]));
  assert.deepEqual(reasons, { XAU: 'derivative', 'X.D': 'no_price', OLD: 'stale', ODD: 'outlier' });
  assert.equal(a.issuer_count, 3);
  assert.ok(a.spread_bps < 30, `spread ${a.spread_bps} should only reflect comparable tokens`);
});

test('data hygiene: duplicate symbols from different issuers stay distinct', () => {
  const a = M.analyzeAsset({ rwa_id: 5, tokens: [
    { symbol: 'SPCX', crypto_id: 1, price: 137.8, market_cap: 1e7, volume_24h: 1e7, issuer_id: 'a', issuer_name: 'Backpack' },
    { symbol: 'SPCX', crypto_id: 2, price: 136.1, market_cap: 0, volume_24h: 1e7, issuer_id: 'b', issuer_name: 'Robinhood' },
  ] });
  assert.equal(a.twins.length, 2);
  assert.notEqual(a.twins[0].key, a.twins[1].key);
});

test('weighted median ignores light outliers', () => {
  assert.ok(M.weightedMedian([{ v: 100, w: 10 }, { v: 101, w: 10 }, { v: 999, w: 1 }]) <= 101);
});
