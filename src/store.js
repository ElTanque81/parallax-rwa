// Tiny JSON time-series store. CMC's RWA historical endpoint is not released
// yet, so Parallax records its own spread history from each radar scan.
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_POINTS = 2016; // one week at 5-minute intervals

class HistoryStore {
  constructor(file) {
    this.file = file;
    this.series = {};
    try {
      this.series = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      this.series = {};
    }
  }

  record(analyzed, at = new Date().toISOString()) {
    for (const a of analyzed) {
      if (a.issuer_count < 2) continue;
      const s = (this.series[a.rwa_id] ||= []);
      const last = s[s.length - 1];
      if (last && Date.parse(at) - Date.parse(last.t) < 60_000) continue;
      const point = { t: at, spread: round(a.spread_bps), c: a.consensus_price };
      for (const tw of a.twins) point[tw.key || tw.symbol] = round(tw.deviation_bps);
      s.push(point);
      if (s.length > MAX_POINTS) s.splice(0, s.length - MAX_POINTS);
    }
    this.flush();
  }

  get(rwaId) {
    return this.series[rwaId] || [];
  }

  flush() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.series));
  }
}

function round(x) {
  return x == null ? null : Math.round(x * 100) / 100;
}

module.exports = { HistoryStore };
