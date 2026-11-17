// Parallax metrics: pure functions, no I/O. Everything here is unit-tested.
'use strict';

const BPS = 10_000;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Consensus price for one RWA asset.
 * Volume-weighted mean of the issuer token prices; falls back to market-cap
 * weighting, then to CMC's own average_tokenized_price.
 */
function consensusPrice(tokens, fallback) {
  const priced = tokens.filter((t) => num(t.price) > 0);
  if (priced.length === 0) return num(fallback) || null;
  const byVol = priced.reduce((s, t) => s + num(t.volume_24h), 0);
  const byCap = priced.reduce((s, t) => s + num(t.market_cap), 0);
  const weightKey = byVol > 0 ? 'volume_24h' : byCap > 0 ? 'market_cap' : null;
  if (!weightKey) return priced.reduce((s, t) => s + num(t.price), 0) / priced.length;
  const total = weightKey === 'volume_24h' ? byVol : byCap;
  return priced.reduce((s, t) => s + num(t.price) * num(t[weightKey]), 0) / total;
}

const GRAMS_PER_TROY_OZ = 31.1034768;
const METAL_UNITS = [
  { k: GRAMS_PER_TROY_OZ, label: 'per gram → per troy oz' },
  { k: 1 / GRAMS_PER_TROY_OZ, label: 'per troy oz → per gram' },
  { k: 1000 / GRAMS_PER_TROY_OZ, label: 'per kg → per troy oz' },
];
const SHARE_RATIOS = (() => {
  const c = [];
  for (let n = 2; n <= 100; n++) {
    c.push({ k: n, label: `token = 1/${n} unit → price ×${n}` });
    c.push({ k: 1 / n, label: `token = ${n} units → price ÷${n}` });
  }
  return c;
})();
function unitCandidates(assetType) {
  if (assetType === 'commodity') return METAL_UNITS;
  if (assetType === 'stock' || assetType === 'etf') return SHARE_RATIOS;
  return [...METAL_UNITS, ...SHARE_RATIOS];
}
const SAME_UNIT_BAND = 0.2; // within ±20% of the reference we assume the same unit
const UNIT_MATCH_TOL = 0.03; // a unit factor must land within 3% of the reference

function tokenKey(t) {
  return t.crypto_id ? `c${t.crypto_id}` : `${t.symbol}|${t.issuer_id || t.issuer_name}`;
}

/** Weighted median of [{v, w}]. */
function weightedMedian(items) {
  const xs = items.filter((i) => i.v > 0 && i.w > 0).sort((a, b) => a.v - b.v);
  if (!xs.length) return null;
  const half = xs.reduce((s, i) => s + i.w, 0) / 2;
  let acc = 0;
  for (const i of xs) {
    acc += i.w;
    if (acc >= half) return i.v;
  }
  return xs[xs.length - 1].v;
}

/**
 * Data-quality pass over the issuer tokens of one asset. The live feed mixes
 * units (gold per gram vs per ounce, pre-split share classes), derivative
 * proxies, null prices and stale quotes. Every token gets a status:
 *   ok · unit_adjusted · stale (no 24h volume) · derivative · no_price · outlier
 * Only ok and unit_adjusted tokens enter consensus, spread and scores.
 */
function classifyTokens(tokens, fallback, assetType) {
  const rows = tokens.map((t) => {
    const raw = t.price == null ? null : num(t.price);
    let status = 'ok';
    if (!raw || raw <= 0) status = 'no_price';
    else if (!t.issuer_name || /derivative/i.test(t.issuer_name)) status = 'derivative';
    else if (num(t.volume_24h) <= 0) status = 'stale';
    return { ...t, key: tokenKey(t), raw_price: raw, price: raw, unit_factor: 1, unit_label: null, status };
  });
  const live = rows.filter((r) => r.status === 'ok');
  const ref = weightedMedian(live.map((r) => ({ v: r.raw_price, w: num(r.volume_24h) }))) || num(fallback) || null;
  if (ref) {
    for (const r of live) {
      const ratio = r.raw_price / ref;
      if (Math.abs(ratio - 1) <= SAME_UNIT_BAND) continue;
      let best = null;
      for (const c of unitCandidates(assetType)) {
        const err = Math.abs(ratio * c.k - 1);
        if (!best || err < best.err) best = { ...c, err };
      }
      if (best && best.err <= UNIT_MATCH_TOL) {
        r.status = 'unit_adjusted';
        r.unit_factor = best.k;
        r.unit_label = best.label;
        r.price = r.raw_price * best.k;
      } else {
        r.status = 'outlier';
      }
    }
  }
  return { rows, reference: ref };
}

const ELIGIBLE = new Set(['ok', 'unit_adjusted']);

function deviationBps(price, consensus) {
  if (!consensus || !num(price)) return null;
  return ((num(price) - consensus) / consensus) * BPS;
}

/** Herfindahl-Hirschman index of issuer market-cap shares, 0..10000. */
function hhi(tokens) {
  const caps = tokens.map((t) => num(t.market_cap)).filter((c) => c > 0);
  const total = caps.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return Math.round(caps.reduce((s, c) => s + (c / total) ** 2, 0) * BPS);
}

/** Price fidelity 0..1: 1 at the consensus, ~0.37 at 50 bps away. */
function fidelity(devBps, scale = 50) {
  if (devBps == null) return 0;
  return Math.exp(-Math.abs(devBps) / scale);
}

/**
 * Twin Score 0..100 for each token of one asset: which issuer's token is the
 * best way to hold this asset right now?
 *   45% price fidelity to consensus
 *   30% liquidity (log-scaled 24h volume, relative to the most liquid twin)
 *   15% size (market-cap share)
 *   10% venue breadth (only when market-pair data is available)
 */
function twinScores(tokens, consensus, venuesBySymbol) {
  const maxLogVol = Math.max(0, ...tokens.map((t) => Math.log10(1 + num(t.volume_24h))));
  const totalCap = tokens.reduce((s, t) => s + num(t.market_cap), 0);
  const hasVenues = venuesBySymbol && Object.keys(venuesBySymbol).length > 0;
  const maxVenues = hasVenues
    ? Math.max(1, ...Object.values(venuesBySymbol).map((v) => v.venues))
    : 1;

  return tokens.map((t) => {
    const dev = deviationBps(t.price, consensus);
    const f = fidelity(dev);
    const liq = maxLogVol ? Math.log10(1 + num(t.volume_24h)) / maxLogVol : 0;
    const size = totalCap ? num(t.market_cap) / totalCap : 0;
    let score;
    let venues = null;
    if (hasVenues) {
      venues = venuesBySymbol[t.symbol] || { venues: 0, volume: 0, dispersionBps: null, pairs: [] };
      score = 45 * f + 30 * liq + 15 * size + 10 * (venues.venues / maxVenues);
    } else {
      score = (45 * f + 30 * liq + 15 * size) / 0.9;
    }
    return {
      key: t.key || tokenKey(t),
      status: t.status || 'ok',
      unit_label: t.unit_label || null,
      raw_price: t.raw_price ?? num(t.price),
      symbol: t.symbol,
      name: t.name,
      crypto_id: t.crypto_id,
      issuer_id: t.issuer_id,
      issuer_name: t.issuer_name,
      price: num(t.price),
      market_cap: num(t.market_cap),
      volume_24h: num(t.volume_24h),
      deviation_bps: dev,
      fidelity: f,
      liquidity: liq,
      cap_share: size,
      venues,
      twin_score: Math.round(score * 10) / 10,
    };
  }).sort((a, b) => b.twin_score - a.twin_score);
}

/** Full analysis of one asset from a /v5/real-world-assets/quotes/latest entry. */
function analyzeAsset(asset, opts = {}) {
  const all = Array.isArray(asset.tokens) ? asset.tokens : [];
  const { rows } = classifyTokens(all, asset.average_tokenized_price, asset.asset_type);
  const tokens = rows.filter((r) => ELIGIBLE.has(r.status));
  const excluded = rows.filter((r) => !ELIGIBLE.has(r.status)).map((r) => ({
    key: r.key, symbol: r.symbol, name: r.name, issuer_name: r.issuer_name, status: r.status,
    raw_price: r.raw_price, market_cap: num(r.market_cap), volume_24h: num(r.volume_24h),
  }));
  const consensus = consensusPrice(tokens, asset.average_tokenized_price);
  const prices = tokens.map((t) => num(t.price)).filter((p) => p > 0);
  const spread = prices.length >= 2 && consensus
    ? ((Math.max(...prices) - Math.min(...prices)) / consensus) * BPS
    : 0;
  const twins = twinScores(tokens, consensus, opts.venuesBySymbol);
  const threshold = opts.arbThresholdBps ?? 75;
  const minVol = opts.arbMinVolume ?? 50_000;
  let arb = null;
  if (twins.length >= 2) {
    const sorted = [...twins].filter((t) => t.price > 0).sort((a, b) => a.price - b.price);
    const cheap = sorted[0];
    const rich = sorted[sorted.length - 1];
    if (spread >= threshold && cheap.volume_24h >= minVol && rich.volume_24h >= minVol) {
      arb = { buy: cheap.symbol, buy_issuer: cheap.issuer_name, sell: rich.symbol, sell_issuer: rich.issuer_name, spread_bps: spread };
    }
  }
  return {
    rwa_id: asset.rwa_id,
    name: asset.name,
    symbol: asset.symbol,
    slug: asset.slug,
    asset_type: asset.asset_type,
    rwa_rank: asset.rwa_rank,
    consensus_price: consensus,
    average_tokenized_price: num(asset.average_tokenized_price),
    tokenized_market_cap: num(asset.tokenized_market_cap),
    tokenized_volume_24h: num(asset.tokenized_volume_24h),
    issuer_count: new Set(tokens.map((t) => t.issuer_id || t.issuer_name)).size,
    token_count: all.length,
    eligible_count: tokens.length,
    unit_adjusted: tokens.filter((t) => t.status === 'unit_adjusted').length,
    spread_bps: spread,
    hhi: hhi(tokens),
    best_twin: twins[0] ? twins[0].symbol : null,
    best_twin_issuer: twins[0] ? twins[0].issuer_name : null,
    arb,
    twins,
    excluded,
    tradfi_markets: asset.tradfi_markets || [],
    last_updated: asset.last_updated,
  };
}

/**
 * Venue stats from /v5/real-world-assets/market-pairs/list, grouped by the
 * base token symbol (one RWA asset has several issuer tokens).
 */
function venueStats(marketPairs) {
  const out = {};
  for (const mp of marketPairs || []) {
    const sym = mp.market_pair_base && mp.market_pair_base.symbol;
    if (!sym) continue;
    const q = (mp.quotes && mp.quotes[0]) || {};
    const o = (out[sym] ||= { venues: 0, exchanges: new Set(), volume: 0, prices: [], pairs: [] });
    o.exchanges.add(mp.exchange && mp.exchange.slug);
    o.volume += num(q.volume_24h);
    if (num(q.price) > 0) o.prices.push(num(q.price));
    o.pairs.push({
      exchange: mp.exchange && mp.exchange.name,
      pair: mp.market_pair,
      category: mp.category,
      price: num(q.price),
      volume_24h: num(q.volume_24h),
    });
  }
  for (const sym of Object.keys(out)) {
    const o = out[sym];
    o.venues = o.exchanges.size;
    delete o.exchanges;
    const mean = o.prices.length ? o.prices.reduce((a, b) => a + b, 0) / o.prices.length : 0;
    o.dispersionBps = o.prices.length >= 2 && mean
      ? ((Math.max(...o.prices) - Math.min(...o.prices)) / mean) * BPS
      : null;
    delete o.prices;
    o.pairs.sort((a, b) => b.volume_24h - a.volume_24h);
  }
  return out;
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Issuer Fidelity: how closely does each issuer's token track the cross-issuer
 * consensus for the same underlying? Only assets with 2+ issuers count.
 */
function issuerLeaderboard(analyzedAssets, issuerList = []) {
  const meta = new Map(issuerList.map((i) => [i.issuer_id, i]));
  const agg = new Map();
  for (const a of analyzedAssets) {
    if (a.issuer_count < 2) continue;
    for (const t of a.twins) {
      const key = t.issuer_id || t.issuer_name;
      if (!key || t.deviation_bps == null) continue;
      const o = agg.get(key) || {
        issuer_id: t.issuer_id,
        issuer_name: t.issuer_name,
        devs: [],
        contested_assets: 0,
        wins: 0,
        market_cap: 0,
        volume_24h: 0,
      };
      o.devs.push(Math.abs(t.deviation_bps));
      o.contested_assets += 1;
      if (a.twins[0] && a.twins[0].key === t.key) o.wins += 1;
      o.market_cap += t.market_cap;
      o.volume_24h += t.volume_24h;
      agg.set(key, o);
    }
  }
  const issues = new Map();
  for (const a of analyzedAssets) {
    for (const x of a.excluded || []) {
      if (!x.issuer_name || x.status === 'derivative') continue;
      issues.set(x.issuer_name, (issues.get(x.issuer_name) || 0) + 1);
    }
  }
  return [...agg.values()].map((o) => {
    const med = median(o.devs);
    const m = meta.get(o.issuer_id) || {};
    return {
      issuer_id: o.issuer_id,
      issuer_name: o.issuer_name,
      website: m.website || null,
      logo: m.logo || null,
      num_tokens: m.num_tokens ?? null,
      contested_assets: o.contested_assets,
      best_twin_wins: o.wins,
      median_abs_dev_bps: med,
      worst_abs_dev_bps: Math.max(...o.devs),
      fidelity_score: Math.round(100 * Math.exp(-med / 40) * 10) / 10,
      excluded_tokens: issues.get(o.issuer_name) || 0,
      market_cap: o.market_cap,
      volume_24h: o.volume_24h,
    };
  }).sort((a, b) => b.fidelity_score - a.fidelity_score || b.market_cap - a.market_cap);
}

/** Universe-level summary for the header cards. */
function summarize(analyzed) {
  const multi = analyzed.filter((a) => a.issuer_count >= 2);
  const spreads = multi.map((a) => a.spread_bps);
  return {
    assets_scanned: analyzed.length,
    multi_issuer_assets: multi.length,
    tokenized_market_cap: analyzed.reduce((s, a) => s + a.tokenized_market_cap, 0),
    tokenized_volume_24h: analyzed.reduce((s, a) => s + a.tokenized_volume_24h, 0),
    median_spread_bps: median(spreads),
    widest: multi.length ? [...multi].sort((a, b) => b.spread_bps - a.spread_bps)[0].symbol : null,
    arb_count: analyzed.filter((a) => a.arb).length,
    data_quality: dataQuality(analyzed),
  };
}

function dataQuality(analyzed) {
  const q = { tokens: 0, ok: 0, unit_adjusted: 0, stale: 0, derivative: 0, no_price: 0, outlier: 0 };
  for (const a of analyzed) {
    q.tokens += a.token_count;
    for (const t of a.twins) q[t.status] = (q[t.status] || 0) + 1;
    for (const x of a.excluded || []) q[x.status] = (q[x.status] || 0) + 1;
  }
  return q;
}

module.exports = {
  classifyTokens,
  weightedMedian,
  tokenKey,
  consensusPrice,
  deviationBps,
  hhi,
  fidelity,
  twinScores,
  analyzeAsset,
  venueStats,
  issuerLeaderboard,
  summarize,
  median,
};
