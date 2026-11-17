// Thin CoinMarketCap Pro API client with a TTL cache, a call log (the
// "API Inspector" in the UI) and a demo mode that replays fixtures shaped
// exactly like the documented v5 RWA responses.
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE = 'https://pro-api.coinmarketcap.com';
const LOG_SIZE = 40;

class CmcClient {
  constructor({ apiKey, baseUrl, fixturesDir, recordDir, snapshot = false, cacheTtlMs = 60_000, fetchImpl } = {}) {
    this.recordDir = recordDir;
    this.apiKey = apiKey || '';
    this.baseUrl = (baseUrl || DEFAULT_BASE).replace(/\/$/, '');
    this.fixturesDir = fixturesDir;
    this.cacheTtlMs = cacheTtlMs;
    this.fetch = fetchImpl || globalThis.fetch;
    this.cache = new Map();
    this.log = [];
    this.creditsUsed = 0;
    // live: real API · snapshot: replay of recorded live responses · demo: synthetic fixtures
    this.mode = this.apiKey ? 'live' : snapshot ? 'snapshot' : 'demo';
  }

  _record(entry) {
    this.log.unshift(entry);
    if (this.log.length > LOG_SIZE) this.log.length = LOG_SIZE;
  }

  static fixtureNames(endpoint, params) {
    // fixtures/<endpoint path with / -> _>.json ; keyed variants for per-id calls
    const base = endpoint.replace(/^\/v5\/real-world-assets\/?/, '').replace(/\//g, '_') || 'root';
    const keyed = params.rwa_id && !String(params.rwa_id).includes(',')
      ? `${base}__${params.rwa_id}`
      : params.issuer_id ? `${base}__${params.issuer_id}` : null;
    return { base, keyed };
  }

  _fixture(endpoint, params) {
    const { base, keyed } = CmcClient.fixtureNames(endpoint, params);
    const candidates = [keyed, base].filter(Boolean);
    for (const c of candidates) {
      const f = path.join(this.fixturesDir, `${c}.json`);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    }
    return { data: null, status: { error_code: 404, error_message: `No fixture for ${endpoint}` } };
  }

  _filterFixture(endpoint, params, body) {
    // Emulate the server-side filters we rely on so demo mode behaves like live.
    if (!body || !body.data) return body;
    const d = JSON.parse(JSON.stringify(body));
    if (Array.isArray(d.data.rwa_assets)) {
      let list = d.data.rwa_assets;
      if (params.rwa_id) {
        const ids = String(params.rwa_id).split(',').map(Number);
        list = list.filter((a) => ids.includes(a.rwa_id));
      }
      if (params.symbol) {
        const syms = String(params.symbol).toUpperCase().split(',');
        list = list.filter((a) => syms.includes(String(a.symbol).toUpperCase()));
      }
      if (params.asset_type) list = list.filter((a) => a.asset_type === params.asset_type);
      if (params.sort) {
        const k = params.sort;
        const dir = params.sort_dir === 'desc' ? -1 : 1;
        list.sort((a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0));
      }
      const start = Number(params.start || 1) - 1;
      const limit = Number(params.limit || 100);
      d.data.total_size = list.length;
      d.data.has_more = start + limit < list.length;
      d.data.rwa_assets = list.slice(start, start + limit);
    }
    return d;
  }

  async get(endpoint, params = {}) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    );
    const qs = new URLSearchParams(clean).toString();
    const key = `${endpoint}?${qs}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.cacheTtlMs) return hit.body;

    const started = Date.now();
    let body;
    let httpStatus;
    if (this.mode !== 'live') {
      body = this._filterFixture(endpoint, clean, this._fixture(endpoint, clean));
      httpStatus = body.data ? 200 : 404;
      if (body.status && this.mode === 'demo') body.status.timestamp = new Date().toISOString();
    } else {
      const url = `${this.baseUrl}${endpoint}${qs ? `?${qs}` : ''}`;
      const res = await this.fetch(url, {
        headers: { 'X-CMC_PRO_API_KEY': this.apiKey, Accept: 'application/json' },
      });
      httpStatus = res.status;
      body = await res.json().catch(() => ({ data: null, status: { error_code: res.status, error_message: 'Non-JSON response' } }));
    }

    const status = body.status || {};
    const credits = Number(status.credit_count || 0);
    this.creditsUsed += credits;
    this._record({
      at: new Date().toISOString(),
      mode: this.mode,
      method: 'GET',
      endpoint,
      params: clean,
      http_status: httpStatus,
      error_code: status.error_code ?? null,
      error_message: status.error_message || '',
      credit_count: credits,
      elapsed_ms: status.elapsed ?? Date.now() - started,
      response_preview: JSON.stringify(body).slice(0, 1500),
    });

    // Live v5 RWA responses send error_code as the string "0" (docs show a number).
    if (httpStatus >= 400 || Number(status.error_code || 0) !== 0) {
      const err = new Error(`CMC ${endpoint} failed: ${status.error_message || httpStatus}`);
      err.status = httpStatus;
      throw err;
    }
    if (this.recordDir && this.mode === 'live') this._recordFixture(endpoint, clean, body);
    this.cache.set(key, { at: Date.now(), body });
    return body;
  }

  _recordFixture(endpoint, params, body) {
    // Save a live response in fixture layout so demo mode can replay a real snapshot.
    const { base, keyed } = CmcClient.fixtureNames(endpoint, params);
    const perId = /market-pairs|issuers$/.test(endpoint);
    const name = perId && keyed ? keyed : base;
    const file = path.join(this.recordDir, `${name}.json`);
    let out = body;
    if (!perId && fs.existsSync(file) && body.data && Array.isArray(body.data.rwa_assets)) {
      // merge rwa_assets from several calls (e.g. a batched quotes call + single-asset calls)
      try {
        const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
        const byId = new Map((prev.data.rwa_assets || []).map((a) => [a.rwa_id, a]));
        for (const a of body.data.rwa_assets) byId.set(a.rwa_id, a);
        out = { ...body, data: { ...body.data, rwa_assets: [...byId.values()] } };
      } catch { /* overwrite */ }
    }
    fs.mkdirSync(this.recordDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(out));
  }

  // ---- RWA endpoint helpers (names match the official reference) ----
  map(p) { return this.get('/v5/real-world-assets/map', p); }
  info(p) { return this.get('/v5/real-world-assets/info', p); }
  assetsList(p) { return this.get('/v5/real-world-assets/assets/list', p); }
  marketPairs(p) { return this.get('/v5/real-world-assets/market-pairs/list', p); }
  quotesLatest(p) { return this.get('/v5/real-world-assets/quotes/latest', p); }
  issuersList(p) { return this.get('/v5/real-world-assets/issuers/list', p); }
  issuer(p) { return this.get('/v5/real-world-assets/issuers', p); }
}

module.exports = { CmcClient, DEFAULT_BASE };
