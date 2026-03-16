/**
 * badges.js — Achievements, Trading Cards, Signal Gauge, Academy, Device Diary
 * Loaded after ble.js. Hooks into existing BLE events via monkey-patching.
 */

/* ═══════════════════════════════════
   ACHIEVEMENT DEFINITIONS
   ═══════════════════════════════════ */
const ACHIEVEMENTS = [
  { id:'first_scan',    icon:'🔍', name:'First Scan',     desc:'Start your first BLE scan',           condition: s => s.scans >= 1 },
  { id:'explorer',      icon:'🧭', name:'Explorer',       desc:'Find 5 different devices',            condition: s => s.uniqueDevices >= 5 },
  { id:'collector',     icon:'🏆', name:'Collector',      desc:'Find 15 different devices',           condition: s => s.uniqueDevices >= 15 },
  { id:'hunter',        icon:'🎯', name:'Device Hunter',  desc:'Find 30 different devices',           condition: s => s.uniqueDevices >= 30 },
  { id:'first_connect', icon:'🔗', name:'First Link',     desc:'Connect to a BLE device',             condition: s => s.connects >= 1 },
  { id:'veteran',       icon:'⚡', name:'Veteran',        desc:'Connect 10 times',                    condition: s => s.connects >= 10 },
  { id:'reader',        icon:'📖', name:'Reader',         desc:'Read your first characteristic',      condition: s => s.reads >= 1 },
  { id:'speed_reader',  icon:'🚀', name:'Speed Reader',   desc:'Read 20 characteristics',             condition: s => s.reads >= 20 },
  { id:'writer',        icon:'✏️', name:'Writer',         desc:'Write to a characteristic',           condition: s => s.writes >= 1 },
  { id:'subscriber',    icon:'📡', name:'Subscriber',     desc:'Subscribe to notifications',          condition: s => s.subscribes >= 1 },
  { id:'data_stream',   icon:'🌊', name:'Data Stream',    desc:'Receive 100 notifications',           condition: s => s.notifications >= 100 },
  { id:'flood',         icon:'🌊', name:'Data Flood',     desc:'Receive 1000 notifications',          condition: s => s.notifications >= 1000 },
  { id:'discoverer',    icon:'🔬', name:'Discoverer',     desc:'Discover services on a device',       condition: s => s.discoveries >= 1 },
  { id:'multi_link',    icon:'🔗', name:'Multi-Link',     desc:'Connect to 3 different devices',      condition: s => s.uniqueConnects >= 3 },
  { id:'radar_user',    icon:'📡', name:'Radar Operator', desc:'Use radar view',                      condition: s => s.radarUsed >= 1 },
  { id:'sdr_user',      icon:'📻', name:'Radio Watcher',  desc:'Start the SDR spectrum analyzer',     condition: s => s.sdrUsed >= 1 },
  { id:'exporter',      icon:'💾', name:'Data Scientist', desc:'Export data (CSV, logs, or snapshot)', condition: s => s.exports >= 1 },
  { id:'macro_master',  icon:'🎬', name:'Macro Master',   desc:'Record a macro',                      condition: s => s.macros >= 1 },
  { id:'night_owl',     icon:'🦉', name:'Night Owl',      desc:'Use the dashboard after 10 PM',       condition: s => s.nightOwl >= 1 },
  { id:'early_bird',    icon:'🐦', name:'Early Bird',     desc:'Use the dashboard before 7 AM',       condition: s => s.earlyBird >= 1 },
];

/* ═══════════════════════════════════
   STATE — persisted in localStorage
   ═══════════════════════════════════ */
const STORAGE_KEY = 'ble-dashboard-badges';
const DIARY_KEY   = 'ble-dashboard-diary';
const CARDS_KEY   = 'ble-dashboard-cards';

function _loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function _saveStats(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function _getStats() {
  const d = _loadStats();
  return {
    scans: d.scans || 0,
    uniqueDevices: d.uniqueDevices || 0,
    connects: d.connects || 0,
    uniqueConnects: d.uniqueConnects || 0,
    reads: d.reads || 0,
    writes: d.writes || 0,
    subscribes: d.subscribes || 0,
    notifications: d.notifications || 0,
    discoveries: d.discoveries || 0,
    radarUsed: d.radarUsed || 0,
    sdrUsed: d.sdrUsed || 0,
    exports: d.exports || 0,
    macros: d.macros || 0,
    nightOwl: d.nightOwl || 0,
    earlyBird: d.earlyBird || 0,
    unlocked: d.unlocked || [],
    devicesSeen: d.devicesSeen || [],
    devicesConnected: d.devicesConnected || [],
  };
}
function _incStat(key, val) {
  const d = _loadStats();
  d[key] = (d[key] || 0) + (val || 1);
  _saveStats(d);
  _checkAchievements();
}
function _setStat(key, val) {
  const d = _loadStats();
  d[key] = val;
  _saveStats(d);
}
function _addDevice(addr) {
  if (!addr) return;
  const d = _loadStats();
  if (!d.devicesSeen) d.devicesSeen = [];
  if (!d.devicesSeen.includes(addr)) {
    d.devicesSeen.push(addr);
    d.uniqueDevices = d.devicesSeen.length;
    _saveStats(d);
    _checkAchievements();
  }
}
function _addConnectedDevice(addr) {
  if (!addr) return;
  const d = _loadStats();
  if (!d.devicesConnected) d.devicesConnected = [];
  if (!d.devicesConnected.includes(addr)) {
    d.devicesConnected.push(addr);
    d.uniqueConnects = d.devicesConnected.length;
    _saveStats(d);
  }
}

/* ═══════════════════════════════════
   CHECK & UNLOCK ACHIEVEMENTS
   ═══════════════════════════════════ */
function _checkAchievements() {
  const stats = _getStats();
  let newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!stats.unlocked.includes(a.id) && a.condition(stats)) {
      stats.unlocked.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  if (newlyUnlocked.length) {
    _setStat('unlocked', stats.unlocked);
    newlyUnlocked.forEach(a => _showBadgeToast(a));
    _renderBadges();
  }
}

function _showBadgeToast(achievement) {
  const toast = document.createElement('div');
  toast.className = 'badge-toast';
  toast.innerHTML =
    '<span class="badge-toast-icon">' + achievement.icon + '</span>' +
    '<div>' +
      '<div class="badge-toast-text">ACHIEVEMENT UNLOCKED!</div>' +
      '<div class="badge-toast-name">' + achievement.name + '</div>' +
    '</div>';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'badgeToastOut .4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
  // Play sound if available
  if (typeof playSound === 'function') playSound('success');
}

/* ═══════════════════════════════════
   RENDER BADGES GRID
   ═══════════════════════════════════ */
function _renderBadges() {
  const container = document.getElementById('badgeGrid');
  if (!container) return;
  const stats = _getStats();
  const unlocked = stats.unlocked || [];

  container.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlocked.includes(a.id);
    const card = document.createElement('div');
    card.className = 'badge-card ' + (isUnlocked ? 'unlocked' : 'locked');
    card.title = a.desc;
    card.innerHTML =
      '<span class="badge-icon">' + a.icon + '</span>' +
      '<span class="badge-name">' + a.name + '</span>' +
      '<span class="badge-desc">' + (isUnlocked ? a.desc : '???') + '</span>' +
      (isUnlocked ? '<span class="badge-stamp">&#10003;</span>' : '');
    container.appendChild(card);
  });

  // Update progress bar
  const pFill = document.getElementById('badgeProgressFill');
  const pText = document.getElementById('badgeProgressText');
  if (pFill && pText) {
    const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);
    pFill.style.width = pct + '%';
    pText.textContent = unlocked.length + '/' + ACHIEVEMENTS.length;
  }
}

/* ═══════════════════════════════════
   DEVICE TRADING CARDS
   ═══════════════════════════════════ */
function _loadCards() {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY)) || {}; } catch { return {}; }
}
function _saveCards(cards) {
  try { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch {}
}

function _addTradingCard(device) {
  const addr = device.address || device.id;
  if (!addr) return;
  const cards = _loadCards();
  if (cards[addr]) {
    cards[addr].visits++;
    cards[addr].lastSeen = Date.now();
    cards[addr].bestRssi = Math.max(cards[addr].bestRssi || -100, device.rssi || -100);
  } else {
    cards[addr] = {
      name: device.name || '(unknown)',
      addr: addr,
      vendor: device.vendor || '',
      rssi: device.rssi || -100,
      bestRssi: device.rssi || -100,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      visits: 1,
      services: 0,
    };
  }
  _saveCards(cards);
}

function _getRarity(card) {
  if (card.visits >= 20) return 'legendary';
  if (card.visits >= 10) return 'epic';
  if (card.visits >= 5)  return 'rare';
  if (card.visits >= 2)  return 'uncommon';
  return 'common';
}

function _getDeviceIcon(name, vendor) {
  const n = (name + ' ' + vendor).toLowerCase();
  if (n.includes('phone') || n.includes('samsung') || n.includes('iphone') || n.includes('pixel')) return '📱';
  if (n.includes('watch') || n.includes('band') || n.includes('fitbit'))  return '⌚';
  if (n.includes('headphone') || n.includes('airpod') || n.includes('buds') || n.includes('ear')) return '🎧';
  if (n.includes('speaker') || n.includes('jbl') || n.includes('sonos'))  return '🔊';
  if (n.includes('keyboard'))  return '⌨️';
  if (n.includes('mouse'))     return '🖱️';
  if (n.includes('micro:bit')) return '🤖';
  if (n.includes('sensor') || n.includes('temp'))  return '🌡️';
  if (n.includes('heart'))     return '❤️';
  if (n.includes('light') || n.includes('bulb') || n.includes('led'))   return '💡';
  if (n.includes('lock'))      return '🔒';
  if (n.includes('tv') || n.includes('display'))   return '📺';
  if (n.includes('car'))       return '🚗';
  if (n.includes('apple'))     return '🍎';
  if (n.includes('nordic'))    return '🧊';
  if (n.includes('espressif') || n.includes('esp32')) return '🔧';
  return '📶';
}

function _renderTradingCards() {
  const container = document.getElementById('tradingCards');
  if (!container) return;
  const cards = _loadCards();
  const arr = Object.values(cards).sort((a, b) => b.lastSeen - a.lastSeen);

  if (!arr.length) {
    container.innerHTML = '<div class="ble-empty">Scan to discover devices and collect cards!</div>';
    return;
  }

  container.innerHTML = '';
  const cardKeys = Object.keys(cards);
  arr.forEach((c, cardIdx) => {
    const rarity = _getRarity(c);
    const icon = _getDeviceIcon(c.name, c.vendor);
    const firstDate = new Date(c.firstSeen);
    const dateStr = firstDate.toLocaleDateString() + ' ' + firstDate.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

    const el = document.createElement('div');
    el.className = 'trading-card rarity-' + rarity;
    const nickname = typeof _getNickname === 'function' ? _getNickname(c.addr) : '';
    el.onclick = () => { if (typeof promptNickname === 'function') promptNickname(c.addr); };
    el.title = 'Click to set nickname';
    el.innerHTML =
      '<div class="tc-header">' +
        '<span class="tc-icon">' + icon + '</span>' +
        '<span class="tc-name">' + _esc(nickname || c.name) + '</span>' +
        '<span class="tc-rarity ' + rarity + '">' + rarity + '</span>' +
      '</div>' +
      (nickname ? '<div style="font-size:.55rem;color:#38bdf8;font-weight:600">aka ' + _esc(c.name) + '</div>' : '') +
      '<div class="tc-vendor">' + _esc(c.vendor || 'Unknown vendor') + '</div>' +
      '<div class="tc-stats">' +
        '<div><span class="tc-stat-label">Best Signal</span><span class="tc-stat-value">' + c.bestRssi + ' dBm</span></div>' +
        '<div><span class="tc-stat-label">Visits</span><span class="tc-stat-value">' + c.visits + '</span></div>' +
      '</div>' +
      '<div class="tc-dna">' + (typeof generateDeviceDNA === 'function' ? generateDeviceDNA(c.addr) : '') + '</div>' +
      '<div class="tc-first-seen">First seen: ' + dateStr + '</div>' +
      '<span class="tc-count">#' + (cardIdx + 1) + '</span>';
    container.appendChild(el);
  });

  // Update collection count
  const countEl = document.getElementById('cardCount');
  if (countEl) countEl.textContent = arr.length + ' collected';
}

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* ═══════════════════════════════════
   LIVE SIGNAL GAUGE
   ═══════════════════════════════════ */
let _gaugeInterval = null;

function _initGauge() {
  const wrap = document.getElementById('signalGauge');
  if (!wrap) return;
  wrap.innerHTML =
    '<svg viewBox="0 0 200 110">' +
      '<path class="gauge-bg" d="M 20 100 A 80 80 0 0 1 180 100" />' +
      '<path id="gaugeFill" class="gauge-fill" d="M 20 100 A 80 80 0 0 1 180 100" ' +
        'stroke="#38bdf8" stroke-dasharray="251" stroke-dashoffset="251" />' +
      '<text class="gauge-ticks" x="15" y="108" text-anchor="middle">-100</text>' +
      '<text class="gauge-ticks" x="100" y="22" text-anchor="middle">-50</text>' +
      '<text class="gauge-ticks" x="185" y="108" text-anchor="middle">0</text>' +
    '</svg>' +
    '<div class="gauge-label"><span id="gaugeValue">--</span><span class="gauge-unit">dBm</span></div>';
}

function _updateGauge(rssi) {
  const fill = document.getElementById('gaugeFill');
  const valEl = document.getElementById('gaugeValue');
  if (!fill || !valEl) return;

  const clamped = Math.max(-100, Math.min(0, rssi || -100));
  const pct = (clamped + 100) / 100; // 0..1
  const arcLen = 251;
  fill.setAttribute('stroke-dashoffset', arcLen * (1 - pct));

  // Color: red→yellow→green→cyan
  let color;
  if (pct < 0.25) color = '#ef4444';
  else if (pct < 0.5) color = '#fb923c';
  else if (pct < 0.75) color = '#34d399';
  else color = '#38bdf8';
  fill.setAttribute('stroke', color);

  valEl.textContent = clamped;
  valEl.style.color = color;
}

/* ═══════════════════════════════════
   FREQUENCY MAP (EM Spectrum visual)
   ═══════════════════════════════════ */
function _drawFreqMap() {
  const canvas = document.getElementById('freqMapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width = canvas.clientWidth * 2;
  const h = canvas.height = canvas.clientHeight * 2;
  ctx.scale(2, 2);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  // EM spectrum bands (log scale approximation, visual only)
  const bands = [
    { name: 'AM Radio',    freq: '0.5-1.7 MHz',   color: '#64748b', start: 0,    end: 0.06 },
    { name: 'FM Radio',    freq: '88-108 MHz',     color: '#34d399', start: 0.06, end: 0.18 },
    { name: 'TV',          freq: '470-890 MHz',    color: '#0ea5e9', start: 0.18, end: 0.30 },
    { name: 'Cell/4G/5G',  freq: '700-2600 MHz',   color: '#fb923c', start: 0.30, end: 0.48 },
    { name: 'WiFi 2.4',    freq: '2.4 GHz',        color: '#ef4444', start: 0.48, end: 0.56 },
    { name: 'BLE',         freq: '2.4 GHz',        color: '#38bdf8', start: 0.56, end: 0.64, highlight: true },
    { name: 'WiFi 5',      freq: '5 GHz',          color: '#ef4444', start: 0.64, end: 0.74 },
    { name: 'WiFi 6E',     freq: '6 GHz',          color: '#f59e0b', start: 0.74, end: 0.84 },
    { name: 'Microwave',   freq: '2.45 GHz',       color: '#64748b', start: 0.84, end: 0.92 },
    { name: 'Satellite',   freq: '12+ GHz',        color: '#2dd4bf', start: 0.92, end: 1.0 },
  ];

  ctx.clearRect(0, 0, cw, ch);

  bands.forEach(b => {
    const x = b.start * cw;
    const bw = (b.end - b.start) * cw;
    const alpha = b.highlight ? 0.25 : 0.12;
    ctx.fillStyle = b.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(x, 0, bw, ch);

    // Border
    ctx.strokeStyle = b.color + '40';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, 0, bw, ch);

    // Label
    ctx.fillStyle = b.highlight ? b.color : b.color + 'cc';
    ctx.font = (b.highlight ? 'bold ' : '') + '7px sans-serif';
    ctx.textAlign = 'center';
    const cx = x + bw / 2;
    ctx.fillText(b.name, cx, ch / 2 - 2);
    ctx.font = '5px monospace';
    ctx.fillStyle = b.color + '99';
    ctx.fillText(b.freq, cx, ch / 2 + 8);

    // BLE highlight pulse
    if (b.highlight) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(x + 1, 1, bw - 2, ch - 2);
      ctx.setLineDash([]);
      // Arrow pointing to BLE
      ctx.fillStyle = b.color;
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('▼ YOU ARE HERE', cx, ch - 4);
    }
  });
}

/* ═══════════════════════════════════
   DEVICE DIARY (history)
   ═══════════════════════════════════ */
function _loadDiary() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY)) || []; } catch { return []; }
}
function _saveDiary(diary) {
  try { localStorage.setItem(DIARY_KEY, JSON.stringify(diary.slice(-200))); } catch {} // keep last 200
}
function _addDiaryEntry(device) {
  const diary = _loadDiary();
  diary.push({
    ts: Date.now(),
    name: device.name || '(unknown)',
    addr: device.address || device.id || '',
    rssi: device.rssi || -100,
  });
  _saveDiary(diary);
}

function _renderDiary() {
  const container = document.getElementById('deviceDiary');
  if (!container) return;
  const diary = _loadDiary().slice().reverse().slice(0, 50); // last 50

  if (!diary.length) {
    container.innerHTML = '<div class="ble-empty">No devices in your diary yet.</div>';
    return;
  }

  container.innerHTML = '';
  diary.forEach(e => {
    const d = new Date(e.ts);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const el = document.createElement('div');
    el.className = 'diary-entry';
    el.innerHTML =
      '<span class="diary-time">' + date + ' ' + time + '</span>' +
      '<span class="diary-name">' + _esc(e.name) + '</span>' +
      '<span class="diary-rssi">' + e.rssi + ' dBm</span>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   ACADEMY QUIZ LOGIC
   ═══════════════════════════════════ */
function quizAnswer(btn, correct) {
  const parent = btn.closest('.academy-quiz-options');
  if (!parent) return;
  // Disable all options
  parent.querySelectorAll('.academy-quiz-opt').forEach(o => {
    o.style.pointerEvents = 'none';
    if (o.dataset.correct === 'true') o.classList.add('correct');
  });
  if (!correct) btn.classList.add('wrong');
}

/* ═══════════════════════════════════
   HOOKS — monkey-patch existing functions
   ═══════════════════════════════════ */
function _initBadgeHooks() {
  // Check time-based badges
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) _incStat('nightOwl', 0); // just set to trigger
  if (hour >= 22 || hour < 5) { const d = _loadStats(); d.nightOwl = 1; _saveStats(d); }
  if (hour >= 4 && hour < 7) { const d = _loadStats(); d.earlyBird = 1; _saveStats(d); }

  // Hook bleScan
  const origScan = window.bleScan;
  if (origScan) {
    window.bleScan = async function() {
      _incStat('scans');
      return origScan.apply(this, arguments);
    };
  }

  // Hook toggleRadarView
  const origRadar = window.toggleRadarView;
  if (origRadar) {
    window.toggleRadarView = function() {
      const d = _loadStats(); d.radarUsed = 1; _saveStats(d);
      _checkAchievements();
      return origRadar.apply(this, arguments);
    };
  }

  // Hook sdrStart
  const origSdr = window.sdrStart;
  if (origSdr) {
    window.sdrStart = function() {
      const d = _loadStats(); d.sdrUsed = 1; _saveStats(d);
      _checkAchievements();
      return origSdr.apply(this, arguments);
    };
  }

  // Hook exportDevicesCSV / exportChartData / exportLogsFromBackend
  ['exportDevicesCSV', 'exportChartData', 'exportLogsFromBackend'].forEach(fn => {
    const orig = window[fn];
    if (orig) {
      window[fn] = function() {
        _incStat('exports');
        return orig.apply(this, arguments);
      };
    }
  });

  // Hook into WebSocket messages for event counting
  // We intercept ble.ws.onmessage
  const origWsConnect = window.wsConnect;
  if (origWsConnect) {
    window.wsConnect = function() {
      const result = origWsConnect.apply(this, arguments);
      // After WS connects, hook into message handling
      _hookWsMessages();
      return result;
    };
  }
}

function _hookWsMessages() {
  // Poll until ble.ws is available, then wrap onmessage
  const check = setInterval(() => {
    if (typeof ble !== 'undefined' && ble.ws && ble.ws.onmessage) {
      const origHandler = ble.ws.onmessage;
      ble.ws.onmessage = function(ev) {
        try {
          const msg = JSON.parse(ev.data);
          _handleBadgeEvent(msg);
        } catch {}
        return origHandler.call(this, ev);
      };
      clearInterval(check);
    }
  }, 500);
  // Stop checking after 10s
  setTimeout(() => clearInterval(check), 10000);
}

function _handleBadgeEvent(msg) {
  const t = msg.type;
  if (t === 'scan_result') {
    // Track devices
    const devices = msg.devices || (msg.address ? [msg] : []);
    devices.forEach(d => {
      const addr = d.address || d.id;
      if (addr) {
        _addDevice(addr);
        _addTradingCard(d);
        _addDiaryEntry(d);
      }
    });
    // Update signal gauge with strongest device
    if (devices.length) {
      const strongest = devices.reduce((a, b) => (a.rssi || -100) > (b.rssi || -100) ? a : b);
      _updateGauge(strongest.rssi);
    }
  } else if (t === 'connected') {
    _incStat('connects');
    _addConnectedDevice(msg.address || msg.name);
    _checkAchievements();
  } else if (t === 'read_result') {
    _incStat('reads');
  } else if (t === 'write_ok') {
    _incStat('writes');
  } else if (t === 'subscribed') {
    _incStat('subscribes');
  } else if (t === 'notify') {
    _incStat('notifications');
    // Update gauge with RSSI if available
    if (msg.rssi != null) _updateGauge(msg.rssi);
  } else if (t === 'services') {
    _incStat('discoveries');
  }
}

/* ═══════════════════════════════════
   INIT
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure ble.js has initialized
  setTimeout(() => {
    _initBadgeHooks();
    _initGauge();
    _renderBadges();
    _renderTradingCards();
    _renderDiary();
    _drawFreqMap();
    _checkAchievements();

    // Periodically refresh trading cards and diary
    setInterval(() => {
      _renderTradingCards();
      _renderDiary();
    }, 10000);

    // Resize freq map on window resize
    window.addEventListener('resize', () => _drawFreqMap());
  }, 600);
});
