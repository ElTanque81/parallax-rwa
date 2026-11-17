// Generates DEMO fixtures shaped exactly like the documented CoinMarketCap
// v5 Real-World-Asset responses, so Parallax runs end-to-end without a key.
// Numbers are synthetic. Live mode never reads these files.
'use strict';

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'fixtures');
fs.mkdirSync(OUT, { recursive: true });

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jitter = (bps) => (rnd() * 2 - 1) * bps;
const hex = (s) => require('crypto').createHash('md5').update(s).digest('hex').slice(0, 24);

const ISSUERS = {
  backed: { name: 'Backed Assets', website: 'https://assets.backed.fi/' },
  ondo: { name: 'Ondo Assets', website: 'https://ondo.finance' },
  paxos: { name: 'Paxos', website: 'https://paxos.com' },
  tether: { name: 'Tether Holdings', website: 'https://gold.tether.to' },
  matrixdock: { name: 'Matrixdock', website: 'https://www.matrixdock.com' },
  kinesis: { name: 'Kinesis', website: 'https://kinesis.money' },
  comtech: { name: 'Comtech Gold', website: 'https://comtechgold.com' },
  dinari: { name: 'Dinari', website: 'https://dinari.com' },
  bstocks: { name: 'bStocks', website: 'https://bstocks.io' },
  backpack: { name: 'Backpack', website: 'https://backpack.exchange', logo: 'https://s2.coinmarketcap.com/static/img/issuer/M7sS2GzR_400x400.png' },
  superstate: { name: 'Superstate', website: 'https://superstate.co' },
  openeden: { name: 'OpenEden', website: 'https://openeden.com' },
  realt: { name: 'RealT', website: 'https://realt.co' },
};
for (const [k, v] of Object.entries(ISSUERS)) v.issuer_id = hex(k + 'issuer');

// [name, symbol, slug, type, basePrice, [[issuerKey, tokenSymbol, tokenName, capUSD, vol24hUSD, devBps]]]
const X = (s, n, cap, vol, dev) => ['backed', `${s}X`, `${n} tokenized stock (xStock)`, cap, vol, dev];
const O = (s, n, cap, vol, dev) => ['ondo', `${s}on`, `${n} Tokenized Stock (Ondo)`, cap, vol, dev];
const ASSETS = [
  ['Gold', 'GOLD', 'gold', 'commodity', 4152.4, [
    ['paxos', 'PAXG', 'PAX Gold', 1.98e9, 1.91e8, 9],
    ['tether', 'XAUt', 'Tether Gold', 2.74e9, 2.12e8, -3],
    ['matrixdock', 'XAUm', 'Matrixdock Gold', 1.21e8, 4.1e6, 14],
    ['kinesis', 'KAU', 'Kinesis Gold', 2.3e8, 9.6e5, -58],
    ['comtech', 'CGO', 'Comtech Gold', 3.1e7, 2.1e5, 31],
  ]],
  ['Nvidia Corp', 'NVDA', 'nvidia', 'stock', 211.8, [
    X('NVDA', 'NVIDIA', 4.12e7, 1.26e7, -4), O('NVDA', 'NVIDIA', 3.95e7, 2.7e6, 6),
    ['dinari', 'NVDAd', 'NVIDIA dShare (Dinari)', 3.4e6, 1.9e5, 22],
  ]],
  ['Tesla Inc', 'TSLA', 'tesla', 'stock', 404.7, [
    X('TSLA', 'Tesla', 6.33e7, 2.41e7, 3), O('TSLA', 'Tesla', 2.88e7, 4.4e6, -7),
    ['bstocks', 'TSLAb', 'Tesla bStock', 1.1e6, 3.1e4, -84],
  ]],
  ['Strategy Inc', 'MSTR', 'strategy', 'stock', 284.2, [
    X('MSTR', 'Strategy', 2.21e7, 8.8e6, -46), O('MSTR', 'Strategy', 1.42e7, 2.3e6, 97),
  ]],
  ['SPDR S&P 500 ETF', 'SPY', 'spdr-sp-500-etf', 'etf', 672.3, [
    X('SPY', 'SP500', 7.6e7, 9.1e6, 2), O('SPY', 'SPDR S&P 500 ETF', 1.12e8, 6.3e6, -2),
  ]],
  ['Invesco QQQ Trust', 'QQQ', 'invesco-qqq', 'etf', 609.9, [
    X('QQQ', 'Nasdaq', 3.3e7, 5.2e6, -5), O('QQQ', 'Invesco QQQ', 4.9e7, 3.1e6, 4),
  ]],
  ['Apple Inc', 'AAPL', 'apple', 'stock', 268.1, [
    X('AAPL', 'Apple', 2.6e7, 6.1e6, 5), O('AAPL', 'Apple', 2.2e7, 1.9e6, -6),
  ]],
  ['Coinbase Global', 'COIN', 'coinbase', 'stock', 329.5, [
    X('COIN', 'Coinbase', 1.71e7, 7.2e6, -11), O('COIN', 'Coinbase', 9.6e6, 1.4e6, 9),
    ['dinari', 'COINd', 'Coinbase dShare (Dinari)', 8.1e5, 2.6e4, 126],
  ]],
  ['Circle Internet Group', 'CRCL', 'circle', 'stock', 114.6, [
    X('CRCL', 'Circle', 1.33e7, 6.6e6, 58), O('CRCL', 'Circle', 7.9e6, 1.1e6, -33),
  ]],
  ['Microsoft Corp', 'MSFT', 'microsoft', 'stock', 514.9, [
    X('MSFT', 'Microsoft', 1.9e7, 3.2e6, -3), O('MSFT', 'Microsoft', 2.1e7, 1.6e6, 3),
  ]],
  ['Amazon.com Inc', 'AMZN', 'amazon', 'stock', 231.7, [
    X('AMZN', 'Amazon', 1.45e7, 2.9e6, 8), O('AMZN', 'Amazon', 1.6e7, 1.2e6, -9),
  ]],
  ['Alphabet Inc', 'GOOGL', 'alphabet', 'stock', 284.6, [
    X('GOOGL', 'Alphabet', 1.62e7, 3.4e6, -2), O('GOOGL', 'Alphabet', 1.1e7, 9.8e5, 12),
  ]],
  ['Meta Platforms', 'META', 'meta', 'stock', 641.2, [
    X('META', 'Meta', 1.21e7, 2.2e6, 6), O('META', 'Meta', 8.4e6, 7.1e5, -4),
  ]],
  ['Palantir Technologies', 'PLTR', 'palantir', 'stock', 184.9, [
    X('PLTR', 'Palantir', 1.38e7, 5.6e6, 14), O('PLTR', 'Palantir', 6.2e6, 8.7e5, -19),
  ]],
  ['Robinhood Markets', 'HOOD', 'robinhood', 'stock', 129.8, [
    X('HOOD', 'Robinhood', 9.1e6, 4.1e6, -16), O('HOOD', 'Robinhood', 5.4e6, 6.6e5, 21),
  ]],
  ['SPDR Gold Shares', 'GLD', 'spdr-gold-shares', 'etf', 381.4, [
    X('GLD', 'Gold ETF', 7.7e6, 1.1e6, 4), O('GLD', 'SPDR Gold Shares', 1.31e7, 1.7e6, -3),
  ]],
  ['iShares 20+ Year Treasury Bond ETF', 'TLT', 'ishares-20-year-treasury', 'etf', 88.3, [
    X('TLT', 'Treasury Bond ETF', 5.2e6, 4.6e5, -6), O('TLT', 'iShares 20+ Year Treasury', 9.9e6, 7.4e5, 5),
  ]],
  ['Advanced Micro Devices', 'AMD', 'amd', 'stock', 244.8, [
    X('AMD', 'AMD', 8.8e6, 2.4e6, 9), O('AMD', 'AMD', 7.1e6, 8.1e5, -12),
  ]],
  ['Broadcom Inc', 'AVGO', 'broadcom', 'stock', 344.9, [
    X('AVGO', 'Broadcom', 6.4e6, 1.3e6, -7), O('AVGO', 'Broadcom', 5.9e6, 6.2e5, 10),
  ]],
  ['Silver', 'SILVER', 'silver', 'commodity', 51.2, [
    ['kinesis', 'KAG', 'Kinesis Silver', 1.12e8, 4.4e5, 0],
  ]],
  ['Superstate Short Duration US Government Securities Fund', 'USTB', 'superstate-ustb', 'government_security', 10.93, [
    ['superstate', 'USTB', 'Superstate USTB', 7.1e8, 1.9e5, 0],
  ]],
  ['OpenEden TBILL', 'TBILL', 'openeden-tbill', 'government_security', 1.052, [
    ['openeden', 'TBILL', 'OpenEden TBILL Vault', 2.4e8, 3.3e5, 0],
  ]],
  ['SpaceX', 'SPCX', 'spacex', 'stock', 212.0, [
    ['backpack', 'SPCX', 'SpaceX tokenized stock (Backpack)', 4.4e6, 3.9e5, 0],
  ]],
  ['9943 Marlowe St, Detroit', 'REALT-9943', 'realt-9943-marlowe', 'real_estate', 51.7, [
    ['realt', 'REALT-9943', 'RealToken 9943 Marlowe St', 6.2e4, 1.1e3, 0],
  ]],
];

const VENUES = {
  backed: [['kraken', 'Kraken', 24], ['bybit', 'Bybit', 521], ['raydium', 'Raydium', 1342], ['jupiter', 'Jupiter', 1588]],
  ondo: [['bitget', 'Bitget', 513], ['gate', 'Gate', 302], ['uniswap-v3', 'Uniswap v3', 1348]],
  paxos: [['binance', 'Binance', 270], ['okx', 'OKX', 294], ['kraken', 'Kraken', 24], ['uniswap-v3', 'Uniswap v3', 1348]],
  tether: [['bitfinex', 'Bitfinex', 37], ['okx', 'OKX', 294], ['bybit', 'Bybit', 521]],
  default: [['mexc', 'MEXC', 544], ['uniswap-v3', 'Uniswap v3', 1348]],
};

const now = new Date().toISOString();
const status = (credits = 1) => ({ timestamp: now, error_code: 0, error_message: '', elapsed: 12, credit_count: credits, notice: 'DEMO FIXTURE - synthetic data', total_count: ASSETS.length });

let cryptoId = 36990;
const listRows = [];
const quoteRows = [];
const infoRows = [];
const mapRows = [];
const issuerTokens = {};

ASSETS.forEach(([name, symbol, slug, type, base, toks], i) => {
  const rwa_id = i + 1;
  const tokens = toks.map(([ik, sym, tname, cap, vol, dev]) => {
    const iss = ISSUERS[ik];
    const t = {
      symbol: sym,
      name: tname,
      price: base * (1 + (dev + jitter(1.5)) / 10_000),
      crypto_id: cryptoId++,
      issuer_id: iss.issuer_id,
      issuer_name: iss.name,
      market_cap: cap,
      volume_24h: vol,
      _ik: ik,
    };
    (issuerTokens[ik] ||= []).push({ name: tname, symbol: sym, crypto_id: t.crypto_id, rwa_id });
    return t;
  });
  // Mirror the messiness of the live feed (seen in real responses):
  if (symbol === 'GOLD') { const cgo = tokens.find((t) => t.symbol === 'CGO'); cgo.price /= 31.1034768; }
  if (['stock', 'etf'].includes(type) && tokens.length >= 2) {
    tokens.push({ symbol, name: `${name} perpetual`, price: base * (1 + jitter(10) / 10_000), crypto_id: cryptoId++, issuer_id: hex('derivatives'), issuer_name: 'NA (Derivatives)', market_cap: 0, volume_24h: 0, _ik: 'default' });
  }
  if (['NVDA', 'TSLA', 'SPY'].includes(symbol)) {
    tokens.push({ symbol: `${symbol}.D`, name: `${name} dShare`, price: null, crypto_id: cryptoId++, issuer_id: hex('dinari-null'), issuer_name: 'Dinari Assets', market_cap: null, volume_24h: null, _ik: 'default' });
  }
  if (['AAPL', 'QQQ', 'AMZN'].includes(symbol)) {
    tokens.push({ symbol: `w${symbol}x`, name: `Wrapped ${name} xStock`, price: base * 0.83, crypto_id: cryptoId++, issuer_id: ISSUERS.backed.issuer_id, issuer_name: ISSUERS.backed.name, market_cap: 0, volume_24h: 0, _ik: 'backed' });
  }
  const cap = tokens.reduce((s, t) => s + t.market_cap, 0);
  const vol = tokens.reduce((s, t) => s + t.volume_24h, 0);
  const priced = tokens.filter((t) => t.price && t.volume_24h);
  const avg = priced.reduce((s, t) => s + t.price, 0) / priced.length;
  const core = { rwa_id, asset_type: type, rwa_rank: 0, has_tokens: true };
  const q = { symbol: 'USD', crypto_id: 2781, average_tokenized_price: avg, tokenized_market_cap: cap, tokenized_volume_24h: vol, last_updated: now };
  const row = { name, symbol, slug, quotes: [q], ...core, average_tokenized_price: avg, tokenized_market_cap: cap, tokenized_volume_24h: vol, last_updated: now };
  listRows.push(row);
  quoteRows.push({
    ...row,
    tokens: tokens.map(({ _ik, ...t }) => t),
    tradfi_markets: type === 'stock' || type === 'etf'
      ? [{ exchange: { slug: 'binance', name: 'Binance', exchange_id: 270 }, ticker: symbol, market_url: `https://www.binance.com/en/stocks/EQ_${symbol}` }]
      : [],
  });
  infoRows.push({
    name, symbol, slug, website: null, employees: null, founded: null, industry: null, cik: null,
    about: { description: `${name} (demo fixture).`, logo: null, website: null, date_added: '2025-07-17T06:35:44.000Z' },
    ...core, primary_exchange: type === 'stock' ? 'Nasdaq' : null,
  });
  mapRows.push({ name, symbol, slug, ...core, first_historical_data: '2020-01-01T00:00:00.000Z', last_historical_data: now });

  // market pairs for this asset (all issuer tokens)
  const pairs = [];
  let mid = 990000 + rwa_id * 100;
  for (const t of tokens.filter((x) => x.price && x.volume_24h)) {
    const vs = (VENUES[t._ik] || VENUES.default).slice(0, Math.max(1, Math.round(1 + rnd() * 3)));
    vs.forEach(([eslug, ename, eid], k) => {
      const share = k === 0 ? 0.55 : 0.45 / (vs.length - 1 || 1);
      const p = t.price * (1 + jitter(t.volume_24h < 1e5 ? 35 : 6) / 10_000);
      const dex = /uniswap|raydium|jupiter/.test(eslug);
      const quoteSym = dex ? 'USDC' : 'USDT';
      pairs.push({
        exchange: { exchange_id: eid, name: ename, slug: eslug },
        market_id: mid++,
        market_pair: `${t.symbol}/${quoteSym}`,
        category: 'spot',
        fee_type: dex ? 'percentage' : 'percentage',
        market_pair_base: { crypto_id: t.crypto_id, symbol: t.symbol, exchange_symbol: t.symbol, currency_type: 'cryptocurrency' },
        market_pair_quotes: { crypto_id: dex ? 3408 : 825, symbol: quoteSym, exchange_symbol: quoteSym, currency_type: 'cryptocurrency' },
        exchange_reported_quotes: { price: p, volume_24h_base: (t.volume_24h * share) / p, volume_24h_quote: t.volume_24h * share, last_updated: now },
        quotes: [{ crypto_id: 2781, symbol: 'USD', price: p, volume_24h: t.volume_24h * share, last_updated: now }],
      });
    });
  }
  pairs.sort((a, b) => b.quotes[0].volume_24h - a.quotes[0].volume_24h);
  write(`market-pairs_list__${rwa_id}`, {
    data: { rwa_id, name, symbol, num_market_pairs: pairs.length, market_pairs: pairs, total_size: pairs.length, has_more: false },
    status: status(1),
  });
});

// rwa_rank by tokenized market cap
[...listRows].sort((a, b) => b.tokenized_market_cap - a.tokenized_market_cap).forEach((r, i) => {
  for (const arr of [listRows, quoteRows, infoRows, mapRows]) arr.find((x) => x.rwa_id === r.rwa_id).rwa_rank = i + 1;
});

write('assets_list', { data: { total_size: listRows.length, has_more: false, rwa_assets: listRows }, status: status(1) });
write('quotes_latest', { data: { rwa_assets: quoteRows }, status: status(1) });
write('info', { data: { rwa_assets: infoRows }, status: status(1) });
write('map', { data: { rwa_assets: mapRows, total_size: mapRows.length, has_more: false }, status: { ...status(0), credit_count: 0 } });

const issuerRows = Object.entries(ISSUERS).map(([k, v]) => ({
  name: v.name, website: v.website, logo: v.logo || null, issuer_id: v.issuer_id, num_tokens: (issuerTokens[k] || []).length,
}));
issuerRows.push({ name: 'Bitget Assets', website: 'https://www.bitget.com/', logo: null, issuer_id: hex('bitgetissuer'), num_tokens: 0 });
write('issuers_list', { data: { issuers: issuerRows, total_size: issuerRows.length, has_more: false }, status: status(1) });
for (const [k, v] of Object.entries(ISSUERS)) {
  const toks = issuerTokens[k] || [];
  write(`issuers__${v.issuer_id}`, {
    data: { name: v.name, website: v.website, logo: v.logo || null, tokens: toks, issuer_id: v.issuer_id, num_tokens: toks.length, total_size: toks.length, has_more: false },
    status: status(1),
  });
}

function write(name, obj) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(obj, null, 1));
}
console.log(`Wrote demo fixtures for ${ASSETS.length} assets, ${issuerRows.length} issuers to ${OUT}`);
