/* Parallax front end: vanilla JS, hash routing, hand-rolled SVG charts. */
'use strict';

// ---------------- i18n ----------------
const I18N = {
  en: {
    tagline: 'One asset. Many tokens. See the spread.',
    nav_radar: 'Radar', nav_issuers: 'Issuers', nav_inspector: 'API Inspector', nav_method: 'Method',
    footer: 'Data: CoinMarketCap Pro API v5 Real-World Assets. Not financial advice.',
    demo: 'DEMO DATA', live: 'LIVE · CMC API',
    radar_title: 'RWA Issuer Spread Radar',
    radar_sub: 'The same stock, ETF or ounce of gold is tokenized by several issuers. Parallax pulls every issuer token from the CoinMarketCap RWA API, builds a consensus price and shows where the twins disagree, which one is the best way to hold the asset, and which issuers track their underlying most faithfully.',
    c_assets: 'Assets scanned', c_multi: 'Multi-issuer assets', c_cap: 'Tokenized market cap', c_vol: '24h tokenized volume', c_med: 'Median issuer spread', c_arb: 'Spread alerts',
    all: 'All', stock: 'Stocks', etf: 'ETFs', commodity: 'Commodities', government_security: 'Treasuries', real_estate: 'Real estate', currency: 'Currencies',
    search: 'Find symbol…', csv: 'Export CSV', refresh: 'Refresh',
    chart_title: 'Where the twins disagree', chart_x: 'Tokenized market cap (log)', chart_y: 'Issuer spread (bps)',
    h_asset: 'Asset', h_type: 'Type', h_iss: 'Issuers', h_cap: 'Tok. market cap', h_vol: '24h volume', h_spread: 'Issuer spread', h_hhi: 'Concentration', h_best: 'Best twin', h_sig: 'Signal',
    sig_arb: 'SPREAD ALERT', sig_wide: 'wide', sig_tight: 'tight', sig_solo: 'single issuer',
    back: '← Back to radar', consensus: 'Consensus price', spread: 'Issuer spread', tokens: 'issuer tokens', venues_n: 'market pairs',
    twins_title: 'Twin Score: which token should you hold?',
    best: 'BEST TWIN', price: 'Price', dev: 'vs consensus', mcap: 'Market cap', vol: '24h volume', venues: 'Venues', vdisp: 'Cross-venue dispersion', issuer: 'Issuer',
    dev_title: 'Deviation from consensus (bps)', hist_title: 'Spread history (recorded by Parallax)',
    hist_empty: 'History builds up while Parallax runs (one snapshot per scan). CMC has not released the RWA historical endpoint yet, so Parallax records its own.',
    pairs_title: 'Where each twin trades', h_exch: 'Exchange', h_pair: 'Pair', h_pprice: 'Price', h_pvol: '24h volume',
    tradfi: 'TradFi listing', arb_text: (a) => `Cheapest twin ${a.buy} (${a.buy_issuer}), richest ${a.sell} (${a.sell_issuer}): ${a.spread_bps.toFixed(0)} bps apart with both legs liquid.`,
    no_arb: 'Twins are aligned within the alert threshold.',
    iss_title: 'Issuer Fidelity Leaderboard',
    iss_sub: 'For every asset tokenized by two or more issuers, Parallax measures how far each issuer\'s token sits from the cross-issuer consensus. A high Fidelity Score means the issuer\'s tokens track their underlying tightly.',
    h_fid: 'Fidelity', h_contested: 'Contested assets', h_wins: 'Best-twin wins', h_med: 'Median |dev|', h_worst: 'Worst |dev|', h_tokens: 'Tokens listed',
    iss_all: 'All issuers tracked by CMC',
    insp_title: 'API Inspector', insp_sub: 'Every CoinMarketCap call Parallax made, with parameters, credits and the raw response. This is the evidence that the app runs on real API data.',
    credits: 'Credits used this session', insp_demo: 'Demo mode: no API key is set, so these calls replay fixtures that mirror the documented response shapes. Add CMC_API_KEY to .env to see live calls here.', endpoints_used: 'Endpoints used',
    snapshot: 'LIVE SNAPSHOT',
    st_ok: 'comparable', st_unit_adjusted: 'unit-adjusted', st_stale: 'stale (no 24h volume)', st_derivative: 'derivative proxy', st_no_price: 'no price', st_outlier: 'outlier',
    excluded_title: 'Listed but excluded from the comparison', h_reason: 'Reason', raw: 'Raw price',
    dq_title: 'Feed hygiene', dq_sub: 'CMC lists every token it links to an asset. Before comparing, Parallax classifies each one: tokens without a price, derivative proxies and quotes with no 24h volume are excluded; tokens quoted in another unit (gold per gram, pre-split share classes) are converted.',
    h_cmp: 'Comparable / listed', h_excl: 'Excluded tokens', unit_note: 'Unit inferred from the price ratio',
    snap_note: (t) => `Replaying a recorded live CoinMarketCap API snapshot from ${t}. Run with CMC_API_KEY for live data.`,
    loading: 'Loading…', error: 'Could not load data',
  },
  de: {
    tagline: 'Ein Asset. Viele Token. Sieh den Spread.',
    nav_radar: 'Radar', nav_issuers: 'Emittenten', nav_inspector: 'API-Inspektor', nav_method: 'Methode',
    footer: 'Daten: CoinMarketCap Pro API v5 Real-World Assets. Keine Finanzberatung.',
    demo: 'DEMO-DATEN', live: 'LIVE · CMC API',
    radar_title: 'RWA-Emittenten-Spread-Radar',
    radar_sub: 'Dieselbe Aktie, derselbe ETF oder dieselbe Unze Gold wird von mehreren Emittenten tokenisiert. Parallax holt alle Emittenten-Token aus der CoinMarketCap-RWA-API, bildet einen Konsenspreis und zeigt, wo die Zwillinge auseinanderliegen, welcher Token sich am besten zum Halten eignet und welche Emittenten ihren Basiswert am genauesten abbilden.',
    c_assets: 'Gescannte Assets', c_multi: 'Assets mit mehreren Emittenten', c_cap: 'Tokenisierte Marktkapitalisierung', c_vol: 'Tokenisiertes 24h-Volumen', c_med: 'Median-Spread', c_arb: 'Spread-Alarme',
    all: 'Alle', stock: 'Aktien', etf: 'ETFs', commodity: 'Rohstoffe', government_security: 'Staatsanleihen', real_estate: 'Immobilien', currency: 'Währungen',
    search: 'Symbol suchen…', csv: 'CSV exportieren', refresh: 'Aktualisieren',
    chart_title: 'Wo die Zwillinge auseinanderliegen', chart_x: 'Tokenisierte Marktkap. (log)', chart_y: 'Emittenten-Spread (bps)',
    h_asset: 'Asset', h_type: 'Typ', h_iss: 'Emittenten', h_cap: 'Tok. Marktkap.', h_vol: '24h-Volumen', h_spread: 'Emittenten-Spread', h_hhi: 'Konzentration', h_best: 'Bester Zwilling', h_sig: 'Signal',
    sig_arb: 'SPREAD-ALARM', sig_wide: 'weit', sig_tight: 'eng', sig_solo: 'ein Emittent',
    back: '← Zurück zum Radar', consensus: 'Konsenspreis', spread: 'Emittenten-Spread', tokens: 'Emittenten-Token', venues_n: 'Handelspaare',
    twins_title: 'Twin Score: Welchen Token solltest du halten?',
    best: 'BESTER ZWILLING', price: 'Preis', dev: 'ggü. Konsens', mcap: 'Marktkap.', vol: '24h-Volumen', venues: 'Börsen', vdisp: 'Streuung über Börsen', issuer: 'Emittent',
    dev_title: 'Abweichung vom Konsens (bps)', hist_title: 'Spread-Verlauf (von Parallax aufgezeichnet)',
    hist_empty: 'Der Verlauf füllt sich, solange Parallax läuft (ein Snapshot pro Scan). CMC hat den historischen RWA-Endpunkt noch nicht veröffentlicht, daher zeichnet Parallax selbst auf.',
    pairs_title: 'Wo jeder Zwilling gehandelt wird', h_exch: 'Börse', h_pair: 'Paar', h_pprice: 'Preis', h_pvol: '24h-Volumen',
    tradfi: 'TradFi-Listing', arb_text: (a) => `Günstigster Zwilling ${a.buy} (${a.buy_issuer}), teuerster ${a.sell} (${a.sell_issuer}): ${a.spread_bps.toFixed(0)} bps auseinander, beide Seiten liquide.`,
    no_arb: 'Die Zwillinge liegen innerhalb der Alarmschwelle.',
    iss_title: 'Emittenten-Treue-Rangliste',
    iss_sub: 'Für jedes Asset mit zwei oder mehr Emittenten misst Parallax, wie weit der Token jedes Emittenten vom Konsens abweicht. Ein hoher Fidelity Score heißt: Die Token dieses Emittenten bilden ihren Basiswert eng ab.',
    h_fid: 'Fidelity', h_contested: 'Umkämpfte Assets', h_wins: 'Bester-Zwilling-Siege', h_med: 'Median |Abw.|', h_worst: 'Max. |Abw.|', h_tokens: 'Gelistete Token',
    iss_all: 'Alle von CMC erfassten Emittenten',
    insp_title: 'API-Inspektor', insp_sub: 'Jeder CoinMarketCap-Aufruf von Parallax mit Parametern, Credits und Rohantwort. Das ist der Nachweis, dass die App auf echten API-Daten läuft.',
    credits: 'Verbrauchte Credits (Sitzung)', insp_demo: 'Demo-Modus: Kein API-Key gesetzt, daher werden Fixtures abgespielt, die den dokumentierten Antwortformaten entsprechen. Trage CMC_API_KEY in .env ein, um hier echte Aufrufe zu sehen.', endpoints_used: 'Genutzte Endpunkte',
    snapshot: 'LIVE-SNAPSHOT',
    st_ok: 'vergleichbar', st_unit_adjusted: 'Einheit umgerechnet', st_stale: 'veraltet (kein 24h-Volumen)', st_derivative: 'Derivat', st_no_price: 'kein Preis', st_outlier: 'Ausreißer',
    excluded_title: 'Gelistet, aber vom Vergleich ausgeschlossen', h_reason: 'Grund', raw: 'Rohpreis',
    dq_title: 'Datenhygiene', dq_sub: 'CMC listet jeden Token, den es einem Asset zuordnet. Vor dem Vergleich ordnet Parallax jeden ein: Token ohne Preis, Derivate und Kurse ohne 24h-Volumen werden ausgeschlossen; Token in anderer Einheit (Gold pro Gramm, Aktienklassen vor einem Split) werden umgerechnet.',
    h_cmp: 'Vergleichbar / gelistet', h_excl: 'Ausgeschlossene Token', unit_note: 'Einheit aus dem Preisverhältnis abgeleitet',
    snap_note: (t) => `Abspielen eines aufgezeichneten echten CoinMarketCap-API-Snapshots vom ${t}. Mit CMC_API_KEY starten für Live-Daten.`,
    loading: 'Lädt…', error: 'Daten konnten nicht geladen werden',
  },
};
let lang = null;
try { lang = localStorage.getItem('parallax.lang'); } catch { /* storage unavailable */ }
if (!I18N[lang]) lang = (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
const t = (k) => (I18N[lang][k] ?? I18N.en[k] ?? k);

function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('parallax.lang', lang); } catch { /* ignore */ }
  applyStatic();
  route();
}));

// ---------------- helpers ----------------
const $view = document.getElementById('view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loc = () => (lang === 'de' ? 'de-DE' : 'en-US');
const usd = (n, d) => {
  if (n == null) return '–';
  const a = Math.abs(n);
  if (d === undefined) {
    if (a >= 1e9) return `$${(n / 1e9).toLocaleString(loc(), { maximumFractionDigits: 2 })}B`;
    if (a >= 1e6) return `$${(n / 1e6).toLocaleString(loc(), { maximumFractionDigits: 1 })}M`;
    if (a >= 1e3) return `$${(n / 1e3).toLocaleString(loc(), { maximumFractionDigits: 1 })}K`;
  }
  return `$${n.toLocaleString(loc(), { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? (a < 10 ? 4 : 2) })}`;
};
const bps = (n, signed) => (n == null ? '–' : `${signed && n > 0 ? '+' : ''}${n.toLocaleString(loc(), { maximumFractionDigits: 1 })} bps`);
const api = async (p) => {
  const r = await fetch(p);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
};
const tip = document.getElementById('tip');
function bindTips(root) {
  root.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      tip.hidden = false;
      tip.innerHTML = el.dataset.tip;
      tip.style.left = `${Math.min(e.clientX + 14, innerWidth - 260)}px`;
      tip.style.top = `${e.clientY + 14}px`;
    });
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}
function signal(a) {
  if (a.issuer_count < 2) return `<span class="sig solo">${t('sig_solo')}</span>`;
  if (a.arb) return `<span class="sig arb">${t('sig_arb')}</span>`;
  if (a.spread_bps >= 50) return `<span class="sig wide">${t('sig_wide')}</span>`;
  return `<span class="sig tight">${t('sig_tight')}</span>`;
}
const TYPE_COLOR = { stock: '#5eead4', etf: '#a78bfa', commodity: '#fbbf24', government_security: '#60a5fa', real_estate: '#f472b6', currency: '#60a5fa' };

// ---------------- status ----------------
let STATUS = {};
const fmtTime = (ts) => new Date(ts).toLocaleString(loc(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
async function loadStatus() {
  try {
    STATUS = await api('/api/status');
    const m = document.getElementById('mode');
    m.className = `mode ${STATUS.mode}`;
    m.textContent = t(STATUS.mode);
    if (STATUS.snapshot_at) m.title = fmtTime(STATUS.snapshot_at);
  } catch { /* ignore */ }
}
const snapBanner = () => (STATUS.mode === 'snapshot' && STATUS.snapshot_at ? `<div class="callout ok" style="border-color:var(--violet);background:rgba(167,139,250,.07)">${I18N[lang].snap_note(fmtTime(STATUS.snapshot_at))}</div>` : '');
const ST_COLOR = { ok: 'var(--green)', unit_adjusted: 'var(--cyan)', stale: 'var(--amber)', derivative: 'var(--violet)', no_price: 'var(--muted)', outlier: 'var(--red)' };

// ---------------- radar ----------------
const radarState = { type: '', sort: 'tokenized_market_cap', dir: -1, q: '' };

async function viewRadar() {
  $view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  const r = await api(`/api/radar${radarState.type ? `?asset_type=${radarState.type}` : ''}`);
  const s = r.summary;
  let rows = r.assets.filter((a) => !radarState.q || a.symbol.includes(radarState.q) || a.name.toUpperCase().includes(radarState.q));
  rows = rows.sort((a, b) => {
    const k = radarState.sort;
    const va = a[k] ?? -1; const vb = b[k] ?? -1;
    return (va > vb ? 1 : va < vb ? -1 : 0) * radarState.dir;
  });
  const maxSpread = Math.max(50, ...r.assets.map((a) => a.spread_bps));
  const types = ['', 'stock', 'etf', 'commodity', 'government_security', 'real_estate'];
  const th = (k, label, cls = '') => `<th class="sortable ${cls}" data-sort="${k}">${label}${radarState.sort === k ? (radarState.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;

  $view.innerHTML = `
    <h1>${t('radar_title')}</h1>
    <p class="sub">${t('radar_sub')}</p>
    ${snapBanner()}
    <div class="cards">
      <div class="card"><div class="k">${t('c_assets')}</div><div class="v">${s.assets_scanned}</div></div>
      <div class="card"><div class="k">${t('c_multi')}</div><div class="v">${s.multi_issuer_assets}</div></div>
      <div class="card"><div class="k">${t('c_cap')}</div><div class="v">${usd(s.tokenized_market_cap)}</div></div>
      <div class="card"><div class="k">${t('c_vol')}</div><div class="v">${usd(s.tokenized_volume_24h)}</div></div>
      <div class="card"><div class="k">${t('c_med')}</div><div class="v">${bps(s.median_spread_bps)}</div></div>
      <div class="card"><div class="k">${t('c_arb')}</div><div class="v" style="color:${s.arb_count ? 'var(--red)' : 'var(--green)'}">${s.arb_count}</div></div>
    </div>
    ${dqPanel(s.data_quality)}
    <div class="panel">
      <h2>${t('chart_title')}</h2>
      <div id="scatter"></div>
      <div class="legend">${types.slice(1).map((k) => `<span><i style="background:${TYPE_COLOR[k]}"></i>${t(k)}</span>`).join('')}</div>
    </div>
    <div class="panel">
      <div class="filters">
        ${types.map((k) => `<button class="chip ${radarState.type === k ? 'on' : ''}" data-type="${k}">${t(k || 'all')}</button>`).join('')}
        <span class="sp"></span>
        <input class="search" id="q" placeholder="${t('search')}" value="${esc(radarState.q)}">
        <a class="btn" href="/api/radar.csv${radarState.type ? `?asset_type=${radarState.type}` : ''}" download="parallax-radar.csv">${t('csv')}</a>
      </div>
      <table>
        <thead><tr>
          ${th('symbol', t('h_asset'))}<th>${t('h_type')}</th>${th('issuer_count', t('h_cmp'), 'num')}
          ${th('tokenized_market_cap', t('h_cap'), 'num')}${th('tokenized_volume_24h', t('h_vol'), 'num')}
          ${th('spread_bps', t('h_spread'), 'num')}${th('hhi', t('h_hhi'), 'num')}<th>${t('h_best')}</th><th>${t('h_sig')}</th>
        </tr></thead>
        <tbody>${rows.map((a) => `
          <tr class="click" data-id="${a.rwa_id}">
            <td><div class="sym">${esc(a.symbol)}</div><div class="nm">${esc(a.name)}</div></td>
            <td><span class="pill ${a.asset_type}">${esc(a.asset_type.replace('_', ' '))}</span></td>
            <td class="num">${a.issuer_count}<span class="muted"> / ${a.token_count}</span></td>
            <td class="num">${usd(a.tokenized_market_cap)}</td>
            <td class="num">${usd(a.tokenized_volume_24h)}</td>
            <td class="num"><div class="spreadcell">${a.issuer_count > 1 ? bps(a.spread_bps) : '–'}<div class="bar ${a.spread_bps >= 75 ? 'hot' : ''}"><i style="width:${Math.min(100, (a.spread_bps / maxSpread) * 100)}%"></i></div></div></td>
            <td class="num" data-tip="HHI 0–10,000: share concentration across issuers">${a.hhi ?? '–'}</td>
            <td><div class="sym">${esc(a.best_twin || '–')}</div><div class="nm">${esc(a.best_twin_issuer || '')}</div></td>
            <td>${signal(a)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  scatter(document.getElementById('scatter'), r.assets.filter((a) => a.issuer_count > 1));
  $view.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { radarState.type = b.dataset.type; viewRadar(); }));
  $view.querySelectorAll('[data-sort]').forEach((h) => h.addEventListener('click', () => {
    const k = h.dataset.sort;
    radarState.dir = radarState.sort === k ? -radarState.dir : -1;
    radarState.sort = k;
    viewRadar();
  }));
  $view.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/asset/${tr.dataset.id}`; }));
  const q = document.getElementById('q');
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { radarState.q = q.value.trim().toUpperCase(); viewRadar(); } });
  bindTips($view);
}

function dqPanel(q) {
  if (!q || !q.tokens) return '';
  const order = ['ok', 'unit_adjusted', 'stale', 'derivative', 'no_price', 'outlier'];
  const seg = order.map((k) => (q[k] ? `<i style="width:${(q[k] / q.tokens) * 100}%;background:${ST_COLOR[k]}" data-tip="${esc(t('st_' + k))}: ${q[k]}"></i>` : '')).join('');
  return `<div class="panel"><h2>${t('dq_title')} · ${q.ok + q.unit_adjusted} / ${q.tokens}</h2>
    <p class="muted" style="margin:0 0 10px;max-width:900px">${t('dq_sub')}</p>
    <div class="stack">${seg}</div>
    <div class="legend">${order.map((k) => `<span><i style="background:${ST_COLOR[k]}"></i>${t('st_' + k)} <b style="color:var(--text)">${q[k] || 0}</b></span>`).join('')}</div></div>`;
}

function scatter(el, assets) {
  const W = el.clientWidth || 900; const H = 300; const P = { l: 56, r: 20, t: 14, b: 38 };
  if (!assets.length) { el.innerHTML = '<p class="muted">–</p>'; return; }
  const caps = assets.map((a) => Math.log10(Math.max(1, a.tokenized_market_cap)));
  const x0 = Math.floor(Math.min(...caps)); const x1 = Math.ceil(Math.max(...caps));
  const yMax = Math.max(100, Math.ceil(Math.max(...assets.map((a) => a.spread_bps)) / 50) * 50);
  const X = (v) => P.l + ((v - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - (v / yMax) * (H - P.t - P.b);
  const maxVol = Math.max(...assets.map((a) => a.tokenized_volume_24h));
  let g = '';
  for (let v = 0; v <= yMax; v += (yMax <= 200 ? 25 : 50)) g += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`;
  for (let v = x0; v <= x1; v++) g += `<text x="${X(v)}" y="${H - P.b + 16}" text-anchor="middle">${usd(10 ** v)}</text>`;
  const thr = 75;
  g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(thr)}" y2="${Y(thr)}" stroke="#f87171" stroke-dasharray="5 4" opacity=".6"/><text x="${W - P.r}" y="${Y(thr) - 6}" text-anchor="end" style="fill:#f87171">${thr} bps</text>`;
  const dots = assets.map((a) => {
    const r = 5 + 16 * Math.sqrt(a.tokenized_volume_24h / maxVol);
    const tipTxt = `<b>${esc(a.symbol)}</b> · ${esc(a.name)}<br>${t('h_spread')}: ${bps(a.spread_bps)}<br>${t('h_cap')}: ${usd(a.tokenized_market_cap)}<br>${t('h_iss')}: ${a.issuer_count}`;
    return `<g class="dot" data-id="${a.rwa_id}" data-tip="${esc(tipTxt)}" style="cursor:pointer">
      <circle cx="${X(Math.log10(Math.max(1, a.tokenized_market_cap)))}" cy="${Y(a.spread_bps)}" r="${r}" fill="${TYPE_COLOR[a.asset_type] || '#94a3b8'}" fill-opacity=".28" stroke="${TYPE_COLOR[a.asset_type] || '#94a3b8'}" stroke-width="1.5"/>
      <text x="${X(Math.log10(Math.max(1, a.tokenized_market_cap)))}" y="${Y(a.spread_bps) - r - 4}" text-anchor="middle" style="fill:#e6ebf5;font-weight:600">${esc(a.symbol)}</text></g>`;
  }).join('');
  el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chart_title'))}">
    ${g}<line class="axis" x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}"/>
    <text x="${W / 2}" y="${H - 4}" text-anchor="middle">${t('chart_x')}</text>
    <text transform="translate(14 ${H / 2}) rotate(-90)" text-anchor="middle">${t('chart_y')}</text>
    ${dots}</svg>`;
  el.querySelectorAll('.dot').forEach((d) => d.addEventListener('click', () => { tip.hidden = true; location.hash = `#/asset/${d.dataset.id}`; }));
  bindTips(el);
}

// ---------------- asset ----------------
async function viewAsset(id) {
  $view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  const a = await api(`/api/asset/${id}`);
  const maxAbs = Math.max(10, ...a.twins.map((w) => Math.abs(w.deviation_bps || 0)));
  const allPairs = Object.entries(a.venues || {}).flatMap(([sym, v]) => v.pairs.map((p) => ({ sym, ...p })))
    .sort((x, y) => y.volume_24h - x.volume_24h);
  $view.innerHTML = `
    <a class="back" href="#/radar">${t('back')}</a>${snapBanner()}
    <div class="hero">
      <div><h1>${esc(a.name)} <span class="pill ${a.asset_type}">${esc(a.asset_type.replace('_', ' '))}</span></h1>
        <div class="muted">${esc(a.symbol)} · rwa_id ${a.rwa_id} · RWA rank #${a.rwa_rank} · ${a.eligible_count} / ${a.token_count} ${t('tokens')}${a.num_market_pairs != null ? ` · ${a.num_market_pairs} ${t('venues_n')}` : ''}</div></div>
    </div>
    <div class="cards">
      <div class="card"><div class="k">${t('consensus')}</div><div class="v">${usd(a.consensus_price, a.consensus_price < 10 ? 4 : 2)}</div></div>
      <div class="card"><div class="k">${t('spread')}</div><div class="v" style="color:${a.spread_bps >= 75 ? 'var(--red)' : a.spread_bps >= 30 ? 'var(--amber)' : 'var(--green)'}">${a.issuer_count > 1 ? bps(a.spread_bps) : '–'}</div></div>
      <div class="card"><div class="k">${t('h_cap')}</div><div class="v">${usd(a.tokenized_market_cap)}</div></div>
      <div class="card"><div class="k">${t('h_vol')}</div><div class="v">${usd(a.tokenized_volume_24h)}</div></div>
      <div class="card"><div class="k">${t('h_hhi')} (HHI)</div><div class="v">${a.hhi ?? '–'} <small>/ 10000</small></div></div>
    </div>
    ${a.issuer_count > 1 ? `<div class="callout ${a.arb ? '' : 'ok'}">${a.arb ? I18N[lang].arb_text(a.arb) : t('no_arb')}</div>` : ''}
    <div class="panel">
      <h2>${t('twins_title')}</h2>
      <div class="twins">${a.twins.map((w, i) => `
        <div class="twin ${i === 0 && a.twins.length > 1 ? 'best' : ''}">
          ${i === 0 && a.twins.length > 1 ? `<span class="badge">${t('best')}</span>` : ''}
          <div class="sym">${esc(w.symbol)}</div><div class="nm">${esc(w.issuer_name)}</div>
          ${w.status === 'unit_adjusted' ? `<div class="unit" data-tip="${esc(t('unit_note'))}">${esc(w.unit_label)} · ${t('raw')} ${usd(w.raw_price, 2)}</div>` : ''}
          <div class="score">${w.twin_score.toFixed(1)}<small> / 100</small></div>
          <div class="bar"><i style="width:${w.twin_score}%"></i></div>
          <dl>
            <dt>${t('price')}</dt><dd>${usd(w.price, w.price < 10 ? 4 : 2)}</dd>
            <dt>${t('dev')}</dt><dd class="${(w.deviation_bps || 0) > 0 ? 'pos' : 'neg'}">${bps(w.deviation_bps, true)}</dd>
            <dt>${t('mcap')}</dt><dd>${usd(w.market_cap)}</dd>
            <dt>${t('vol')}</dt><dd>${usd(w.volume_24h)}</dd>
            ${w.venues ? `<dt>${t('venues')}</dt><dd>${w.venues.venues}</dd><dt>${t('vdisp')}</dt><dd>${bps(w.venues.dispersionBps)}</dd>` : ''}
          </dl>
        </div>`).join('')}
      </div>
    </div>
    ${a.excluded && a.excluded.length ? `<div class="panel"><h2>${t('excluded_title')} (${a.excluded.length})</h2>
      <table><thead><tr><th>Token</th><th>${t('issuer')}</th><th>${t('h_reason')}</th><th class="num">${t('raw')}</th><th class="num">${t('mcap')}</th><th class="num">${t('vol')}</th></tr></thead>
      <tbody>${a.excluded.map((x) => `<tr><td class="sym">${esc(x.symbol || '–')}</td><td>${esc(x.issuer_name || '–')}</td>
        <td><span class="sig" style="color:${ST_COLOR[x.status]};border:1px solid currentColor">${t('st_' + x.status)}</span></td>
        <td class="num">${x.raw_price ? usd(x.raw_price, 2) : '–'}</td><td class="num">${usd(x.market_cap)}</td><td class="num">${usd(x.volume_24h)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="row">
      <div class="panel"><h2>${t('dev_title')}</h2><div id="devchart"></div></div>
      <div class="panel"><h2>${t('hist_title')}</h2><div id="hist"></div></div>
    </div>
    <div class="panel" ${allPairs.length || a.tradfi_markets.length ? '' : 'hidden'}>
      <h2>${t('pairs_title')}</h2>
      <table ${allPairs.length ? '' : 'hidden'}><thead><tr><th>Token</th><th>${t('h_exch')}</th><th>${t('h_pair')}</th><th class="num">${t('h_pprice')}</th><th class="num">${t('dev')}</th><th class="num">${t('h_pvol')}</th></tr></thead>
      <tbody>${allPairs.map((p) => `<tr><td class="sym">${esc(p.sym)}</td><td>${esc(p.exchange)}</td><td class="muted">${esc(p.pair)}</td>
        <td class="num">${usd(p.price, p.price < 10 ? 4 : 2)}</td>
        <td class="num">${bps(a.consensus_price ? ((p.price - a.consensus_price) / a.consensus_price) * 1e4 : null, true)}</td>
        <td class="num">${usd(p.volume_24h)}</td></tr>`).join('')}</tbody></table>
      ${a.tradfi_markets.length ? `<p class="muted" style="margin-top:12px">${t('tradfi')}: ${a.tradfi_markets.map((m) => `<a href="${esc(m.market_url)}" target="_blank" rel="noopener">${esc(m.exchange.name)} · ${esc(m.ticker)}</a>`).join(', ')}</p>` : ''}
    </div>`;

  devChart(document.getElementById('devchart'), a.twins, maxAbs);
  histChart(document.getElementById('hist'), a.history || []);
  bindTips($view);
}

function devChart(el, twins, maxAbs) {
  const W = el.clientWidth || 600; const rowH = 34; const H = twins.length * rowH + 30; const lab = 170; const mid = lab + (W - lab) / 2; const half = (W - lab) / 2 - 70;
  const bars = twins.map((w, i) => {
    const d = w.deviation_bps || 0; const len = (Math.abs(d) / maxAbs) * half; const y = 10 + i * rowH;
    const x = d >= 0 ? mid : mid - len;
    const iss = (w.issuer_name || '').replace(/ Assets$/, '');
    return `<text x="8" y="${y + 17}" style="fill:#e6ebf5;font-weight:600">${esc(w.symbol)}<tspan style="fill:#8b97b3;font-weight:400"> ${esc(iss.length > 14 ? iss.slice(0, 13) + '…' : iss)}</tspan></text>
      <rect x="${x}" y="${y + 4}" width="${Math.max(2, len)}" height="18" rx="4" fill="${d >= 0 ? '#fbbf24' : '#5eead4'}" fill-opacity=".8"/>
      <text x="${d >= 0 ? mid + len + 6 : mid - len - 6}" y="${y + 17}" text-anchor="${d >= 0 ? 'start' : 'end'}">${bps(d, true)}</text>`;
  }).join('');
  el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}"><line class="axis" x1="${mid}" x2="${mid}" y1="4" y2="${H - 20}"/>
    <text x="${mid}" y="${H - 4}" text-anchor="middle">0 = ${t('consensus')}</text>${bars}</svg>`;
}

function histChart(el, pts) {
  if (pts.length < 2) { el.innerHTML = `<p class="muted">${t('hist_empty')}</p>`; return; }
  const W = el.clientWidth || 500; const H = 200; const P = { l: 44, r: 12, t: 10, b: 26 };
  const ys = pts.map((p) => p.spread); const yMax = Math.ceil((Math.max(10, ...ys) * 1.15) / 20) * 20;
  const t0 = Date.parse(pts[0].t); const t1 = Date.parse(pts[pts.length - 1].t);
  const X = (ts) => P.l + ((Date.parse(ts) - t0) / (t1 - t0 || 1)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - (v / yMax) * (H - P.t - P.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.spread).toFixed(1)}`).join('');
  const area = `${d}L${X(pts[pts.length - 1].t)},${Y(0)}L${X(pts[0].t)},${Y(0)}Z`;
  const fmt = (ts) => new Date(ts).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity=".45"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient></defs>
    <line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(yMax / 2)}" y2="${Y(yMax / 2)}"/><text x="${P.l - 6}" y="${Y(yMax / 2) + 4}" text-anchor="end">${Math.round(yMax / 2)}</text>
    <line class="axis" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/><text x="${P.l - 6}" y="${Y(0) + 4}" text-anchor="end">0</text>
    <path d="${area}" fill="url(#hg)"/><path d="${d}" fill="none" stroke="#a78bfa" stroke-width="2"/>
    <text x="${P.l}" y="${H - 6}">${fmt(pts[0].t)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end">${fmt(pts[pts.length - 1].t)}</text></svg>`;
}

// ---------------- issuers ----------------
async function viewIssuers() {
  $view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  const r = await api('/api/issuers');
  $view.innerHTML = `
    <h1>${t('iss_title')}</h1><p class="sub">${t('iss_sub')}</p>${snapBanner()}
    <div class="panel"><table><thead><tr><th>#</th><th>${t('issuer')}</th><th>${t('h_fid')}</th><th class="num">${t('h_contested')}</th><th class="num">${t('h_wins')}</th><th class="num">${t('h_med')}</th><th class="num">${t('h_worst')}</th><th class="num">${t('h_excl')}</th><th class="num">${t('h_cap')}</th></tr></thead>
    <tbody>${r.leaderboard.map((i, n) => `<tr class="click" data-iss="${esc(i.issuer_id)}">
      <td class="muted">${n + 1}</td>
      <td><div class="sym">${esc(i.issuer_name)}</div><div class="nm">${i.website ? esc(i.website.replace(/^https?:\/\//, '').replace(/\/$/, '')) : ''}</div></td>
      <td><div class="spreadcell" style="justify-content:flex-start"><b style="font-family:var(--mono);min-width:38px">${i.fidelity_score.toFixed(1)}</b><div class="bar ${i.fidelity_score < 50 ? 'hot' : ''}" style="width:140px"><i style="width:${i.fidelity_score}%"></i></div></div></td>
      <td class="num">${i.contested_assets}</td><td class="num">${i.best_twin_wins}</td>
      <td class="num">${bps(i.median_abs_dev_bps)}</td><td class="num">${bps(i.worst_abs_dev_bps)}</td><td class="num">${i.excluded_tokens || 0}</td><td class="num">${usd(i.market_cap)}</td></tr>
      <tr hidden data-detail="${esc(i.issuer_id)}"><td></td><td colspan="8" class="muted">…</td></tr>`).join('')}</tbody></table></div>
    <div class="panel"><h2>${t('iss_all')}</h2><table><thead><tr><th>${t('issuer')}</th><th class="num">${t('h_tokens')}</th><th>Website</th></tr></thead>
    <tbody>${r.all.map((i) => `<tr><td class="sym">${esc(i.name)}</td><td class="num">${i.num_tokens}</td><td>${i.website ? `<a href="${esc(i.website)}" target="_blank" rel="noopener">${esc(i.website)}</a>` : '–'}</td></tr>`).join('')}</tbody></table></div>`;

  $view.querySelectorAll('tr[data-iss]').forEach((tr) => tr.addEventListener('click', async () => {
    const det = $view.querySelector(`tr[data-detail="${tr.dataset.iss}"]`);
    det.hidden = !det.hidden;
    if (det.hidden || det.dataset.loaded) return;
    try {
      const d = await api(`/api/issuer/${tr.dataset.iss}`);
      det.dataset.loaded = '1';
      det.children[1].innerHTML = d.tokens.map((tk) => `<a href="#/asset/${tk.rwa_id}"><code>${esc(tk.symbol)}</code></a>`).join(' ');
    } catch (e) { det.children[1].textContent = e.message; }
  }));
}

// ---------------- inspector ----------------
async function viewInspector() {
  $view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  const r = await api('/api/inspector');
  const eps = [...new Set(r.calls.map((c) => c.endpoint))];
  const pretty = (s) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return `${s}…`; } };
  $view.innerHTML = `
    <h1>${t('insp_title')}</h1><p class="sub">${t('insp_sub')}</p>${r.mode === 'demo' ? `<div class="callout">${t('insp_demo')}</div>` : snapBanner()}
    <div class="cards">
      <div class="card"><div class="k">Mode</div><div class="v">${t(r.mode)}</div></div>
      <div class="card"><div class="k">${t('credits')}</div><div class="v">${r.credits_used}</div></div>
      <div class="card"><div class="k">${t('endpoints_used')}</div><div class="v">${eps.length}</div></div>
    </div>
    <div class="panel"><h2>${t('endpoints_used')}</h2>${eps.map((e) => `<code>GET ${esc(e)}</code>`).join(' ')}</div>
    <div class="log">${r.calls.map((c) => `
      <details class="call"><summary>
        <span class="${c.http_status === 200 ? 'ok' : 'bad'}">${c.http_status}</span>
        <span class="ep">GET ${esc(c.endpoint)}</span>
        <span class="muted">${esc(Object.entries(c.params).map(([k, v]) => `${k}=${v}`).join('&'))}</span>
        <span class="muted" style="margin-left:auto">${c.credit_count} cr · ${c.elapsed_ms} ms · ${new Date(c.at).toLocaleTimeString(loc())}</span>
      </summary><pre>${esc(pretty(c.response_preview))}</pre></details>`).join('')}</div>`;
}

// ---------------- method ----------------
function viewMethod() {
  const en = lang === 'en';
  $view.innerHTML = `<div class="method panel">
    <h1>${t('nav_method')}</h1>
    <h3>${en ? 'Pipeline' : 'Ablauf'}</h3>
    <ol>
      <li><code>GET /v5/real-world-assets/assets/list</code> ${en ? 'ranks the RWA universe by tokenized market cap.' : 'sortiert das RWA-Universum nach tokenisierter Marktkapitalisierung.'}</li>
      <li><code>GET /v5/real-world-assets/quotes/latest</code> ${en ? 'returns every issuer token per asset in one batched call (1 credit per 250 assets).' : 'liefert alle Emittenten-Token pro Asset in einem gebündelten Aufruf (1 Credit pro 250 Assets).'}</li>
      <li><code>GET /v5/real-world-assets/market-pairs/list</code> ${en ? 'adds venues, per-venue prices and volumes for the asset page.' : 'ergänzt Börsen, Preise und Volumen pro Handelsplatz für die Asset-Seite.'}</li>
      <li><code>GET /v5/real-world-assets/info</code>, <code>/issuers/list</code>, <code>/issuers</code>, <code>/map</code> ${en ? 'add metadata, the issuer directory and symbol search.' : 'ergänzen Metadaten, das Emittenten-Verzeichnis und die Symbolsuche.'}</li>
    </ol>
    <h3>${en ? 'Feed hygiene (before any comparison)' : 'Datenhygiene (vor jedem Vergleich)'}</h3>
    <p>${en ? 'The live tokens[] array mixes very different things. Parallax classifies every token first: <b>no price</b> (price is null) · <b>derivative proxy</b> (issuer "NA (Derivatives)", no market cap) · <b>stale</b> (no 24h volume) · <b>unit-adjusted</b> (quoted in another unit: gold per gram is converted to per troy ounce; share classes at an integer ratio are rescaled) · <b>outlier</b> (more than 20% off with no unit that explains it). Only comparable and unit-adjusted tokens enter consensus, spread and scores. The reference for unit detection is the volume-weighted median price.' : 'Das echte tokens[]-Array mischt sehr Verschiedenes. Parallax ordnet zuerst jeden Token ein: <b>kein Preis</b> (price ist null) · <b>Derivat</b> (Emittent „NA (Derivatives)“, keine Marktkap.) · <b>veraltet</b> (kein 24h-Volumen) · <b>Einheit umgerechnet</b> (andere Einheit: Gold pro Gramm wird auf Feinunze umgerechnet, Aktienklassen mit ganzzahligem Verhältnis werden skaliert) · <b>Ausreißer</b> (mehr als 20 % daneben ohne erklärende Einheit). Nur vergleichbare und umgerechnete Token fließen in Konsens, Spread und Scores ein. Referenz für die Einheitenerkennung ist der volumengewichtete Median.'}</p>
    <h3>${en ? 'Consensus price' : 'Konsenspreis'}</h3>
    <p>${en ? 'Volume-weighted mean of all issuer token prices for the same asset (falls back to market-cap weights, then to CMC\'s average_tokenized_price). Each token\'s deviation is measured in basis points against it.' : 'Volumengewichteter Mittelwert aller Emittenten-Tokenpreise desselben Assets (Fallback: Marktkap.-Gewichtung, dann CMCs average_tokenized_price). Die Abweichung jedes Tokens wird in Basispunkten dazu gemessen.'}</p>
    <h3>${en ? 'Issuer spread & alerts' : 'Emittenten-Spread & Alarme'}</h3>
    <p>${en ? 'Spread = (highest token price − lowest) / consensus. A spread alert fires when it exceeds the threshold (default 75 bps) and both the cheapest and richest twin trade at least $50K a day, so thin, stale quotes do not trigger noise. Alerts can be pushed to Telegram.' : 'Spread = (höchster Tokenpreis − niedrigster) / Konsens. Ein Alarm wird ausgelöst, wenn er die Schwelle (Standard 75 bps) übersteigt und der günstigste und teuerste Zwilling jeweils mindestens 50.000 $ am Tag handeln, damit dünne, veraltete Kurse keinen Lärm erzeugen. Alarme können an Telegram gesendet werden.'}</p>
    <h3>Twin Score (0–100)</h3>
    <p>45% ${en ? 'price fidelity' : 'Preistreue'} <code>exp(−|dev|/50 bps)</code> · 30% ${en ? 'liquidity (log 24h volume vs. the most liquid twin)' : 'Liquidität (log. 24h-Volumen ggü. dem liquidesten Zwilling)'} · 15% ${en ? 'market-cap share' : 'Marktkap.-Anteil'} · 10% ${en ? 'venue breadth (asset page only)' : 'Börsenbreite (nur Asset-Seite)'}.</p>
    <h3>Issuer Fidelity Score</h3>
    <p>${en ? 'Across every asset with 2+ issuers: 100 × exp(−median |deviation| / 40 bps). It answers: whose tokens track the underlying most faithfully?' : 'Über alle Assets mit 2+ Emittenten: 100 × exp(−Median |Abweichung| / 40 bps). Die Frage dahinter: Wessen Token bilden den Basiswert am treuesten ab?'}</p>
    <h3>${en ? 'Concentration' : 'Konzentration'}</h3>
    <p>${en ? 'Herfindahl-Hirschman index of issuer market-cap shares (10,000 = one issuer holds everything). High concentration means issuer risk is not diversified.' : 'Herfindahl-Hirschman-Index der Marktkap.-Anteile (10.000 = ein Emittent hält alles). Hohe Konzentration bedeutet: Das Emittentenrisiko ist nicht gestreut.'}</p>
    <p class="muted">${en ? 'Parallax is an analytics tool, not financial advice. Tokenized stocks can carry issuer, custody and redemption risk; a spread is not automatically a risk-free trade.' : 'Parallax ist ein Analysewerkzeug, keine Finanzberatung. Tokenisierte Aktien tragen Emittenten-, Verwahr- und Rücknahmerisiken; ein Spread ist nicht automatisch ein risikofreier Trade.'}</p>
  </div>`;
}

// ---------------- router ----------------
async function route() {
  const h = location.hash || '#/radar';
  const [, page, arg] = h.split('/');
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === page || (page === 'asset' && a.dataset.nav === 'radar')));
  tip.hidden = true;
  try {
    if (page === 'asset' && arg) await viewAsset(arg);
    else if (page === 'issuers') await viewIssuers();
    else if (page === 'inspector') await viewInspector();
    else if (page === 'method') viewMethod();
    else await viewRadar();
  } catch (e) {
    $view.innerHTML = `<p class="err">${t('error')}: ${esc(e.message)}</p>`;
  }
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
applyStatic();
loadStatus().then(route);
