// Optional Telegram alerts when two issuer tokens of the same asset drift apart.
'use strict';

class Alerter {
  constructor({ botToken, chatId, cooldownMs = 60 * 60 * 1000, fetchImpl } = {}) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.cooldownMs = cooldownMs;
    this.fetch = fetchImpl || globalThis.fetch;
    this.lastSent = new Map();
    this.sent = [];
  }

  get enabled() {
    return Boolean(this.botToken && this.chatId);
  }

  format(a) {
    const buy = a.twins.find((t) => t.symbol === a.arb.buy);
    const sell = a.twins.find((t) => t.symbol === a.arb.sell);
    return [
      `Parallax alert: ${a.name} (${a.symbol})`,
      `Issuer spread ${a.arb.spread_bps.toFixed(0)} bps`,
      `Cheapest: ${buy.symbol} (${buy.issuer_name}) $${buy.price.toFixed(2)}`,
      `Richest: ${sell.symbol} (${sell.issuer_name}) $${sell.price.toFixed(2)}`,
      'Data: CoinMarketCap RWA API. Not financial advice.',
    ].join('\n');
  }

  async check(analyzed) {
    const fired = [];
    for (const a of analyzed) {
      if (!a.arb) continue;
      const key = `${a.rwa_id}:${a.arb.buy}:${a.arb.sell}`;
      const last = this.lastSent.get(key) || 0;
      if (Date.now() - last < this.cooldownMs) continue;
      this.lastSent.set(key, Date.now());
      const text = this.format(a);
      fired.push({ at: new Date().toISOString(), rwa_id: a.rwa_id, text });
      if (this.enabled) {
        try {
          await this.fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: this.chatId, text }),
          });
        } catch (e) {
          console.warn('[alerts] telegram send failed:', e.message);
        }
      }
    }
    this.sent = [...fired, ...this.sent].slice(0, 50);
    return fired;
  }
}

module.exports = { Alerter };
