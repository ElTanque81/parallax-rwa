# DoraHacks BUIDL submission: Parallax

**Name:** Parallax
**Tagline:** One asset. Many tokens. See the spread.
**Track:** Real World Assets
**Repo:** https://github.com/ElTanque81/parallax-rwa
**Demo video:** https://youtu.be/WVRfNKGDobg
**X post:** _(add link)_

---

## Short description (≤ 200 chars)

RWA issuer spread radar on the CoinMarketCap RWA API: compares every issuer's token of the same stock, ETF or gold, scores which twin to hold and ranks issuers by tracking fidelity.

## Full description

### The problem
Tokenized Nvidia is not one token. It is NVDAX (Backed), NVDAon (Ondo), a Dinari dShare and more. Tokenized gold is PAXG, XAUt, XAUm, KAU, CGO. Each issuer has its own custody, liquidity and venues, so the same asset trades at different prices depending on whose token you hold. Price sites show one blended number, so a buyer cannot tell whether they picked the token that tracks the underlying or the one sitting 80 bps off with thin liquidity.

### What the live data shows
In a live snapshot of the top 59 tokenized assets ($7.9B), 339 issuer tokens are linked; 45 assets have 2+ comparable issuers; the median issuer spread is ~50 bps; 5 liquid spread alerts (SQQQ 334 bps, GME 160, SpaceX 126, AVGO 89, USO 78). Only 246 of 339 tokens are directly comparable: the rest have no price, are derivative proxies, have no volume or are quoted in another unit (gold per gram vs per ounce).

### What Parallax does
Parallax pulls every issuer token for every RWA asset from the CoinMarketCap Pro API v5 RWA endpoints, builds a volume-weighted consensus price per asset and answers three questions:

1. **Where do the twins disagree?** The Spread Radar ranks all tokenized assets by issuer spread (bps), with a bubble chart (spread vs. tokenized market cap) and spread alerts that only fire when both legs are liquid.
2. **Which token should I hold?** The Twin Score (0–100) rates every issuer token on price fidelity to consensus, liquidity, size and venue breadth.
3. **Which issuers track best?** The Issuer Fidelity Leaderboard ranks issuers by the median deviation of their tokens across every asset they share with another issuer.

Before comparing anything, Parallax runs a **feed hygiene** pass that classifies every token (comparable · unit-adjusted · stale · derivative · no price · outlier) and converts units (gold per gram → per troy ounce, share ratios). Plus an asset deep dive (deviation chart, every market pair vs. consensus, cross-venue dispersion), self-recorded spread history, Telegram alerts, CSV export, an English/German UI and an in-app **API Inspector** that shows every CMC call with parameters, credits and the raw response.

### CMC API endpoints used (all 7 RWA endpoints)
- `GET /v5/real-world-assets/assets/list`: rank the universe by tokenized market cap
- `GET /v5/real-world-assets/quotes/latest`: batched issuer tokens per asset (the core of the radar)
- `GET /v5/real-world-assets/market-pairs/list`: venues and per-venue prices
- `GET /v5/real-world-assets/info`: asset metadata
- `GET /v5/real-world-assets/issuers/list`: issuer directory
- `GET /v5/real-world-assets/issuers`: tokens per issuer
- `GET /v5/real-world-assets/map`: symbol search

A full radar refresh of 60 assets costs 2 credits.

### Evidence of a real API call
- `docs/evidence/` in the repo: live request + response for every endpoint (`npm run evidence`)
- API Inspector page in the app (screenshot in the README)
- Client code: `src/cmc.js`

### What the API made possible / where it got in the way
**Made possible:** `quotes/latest` returns every issuer token with price, market cap, volume and `issuer_id` for up to 250 assets in a single call. That one response makes a cross-issuer comparison cheap enough to refresh every minute, and the shared `issuer_id` across endpoints makes issuer-level analytics possible out of the box.

**Got in the way (all seen in real responses):** (1) `tokens[]` mixes units (gold per gram next to per ounce) with no unit field; (2) derivative proxies, null prices and zero-volume tokens sit inside `tokens[]`; (3) duplicate symbols across issuers; (4) `status.error_code` is the string "0" while the docs show a number; (5) `assets/list` returned an entry with `rwa_id: null` that breaks a batched `quotes/latest` call; (6) `market-pairs/list` is refused on the free key although the docs list Basic; (7) no underlying TradFi price and no RWA history yet.

### Tech
Node.js (zero dependencies), vanilla JS front end with hand-rolled SVG charts, 14 unit tests, live / snapshot / demo modes, English and German UI. MIT licensed.

---

## X post (paste the link into the submission form)

> Tokenized stocks aren't one token. Apple alone is linked to 10 tokens on @CoinMarketCap, and they don't trade at the same price.
>
> Median gap between issuers: ~50 bps.
>
> I built Parallax on the CMC RWA API: it cleans the feed, shows where the twins disagree, which token to hold and which issuers track best.
>
> 🎥 https://youtu.be/WVRfNKGDobg
> 🔗 [DoraHacks BUIDL link]
>
> #BuildwithCMC
