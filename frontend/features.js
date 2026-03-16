/**
 * features.js — Radar Styles, Leaderboard, Missions, Device DNA,
 * Signal Heatmap, Co-Location Graph, Sound Signatures, Scan Analytics,
 * Device Nicknames, Threat Detector, Export Report
 * Loaded after badges.js.
 */

/* ═══════════════════════════════════
   RADAR STYLE SWITCHING (5 styles)
   ═══════════════════════════════════ */
const RADAR_STYLES = ['military','tactical','thermal','sonar','constellation','matrix','submarine'];
const RADAR_STYLE_KEY = 'ble-radar-style';

function _getRadarStyle() {
  try { return localStorage.getItem(RADAR_STYLE_KEY) || 'military'; } catch { return 'military'; }
}

function setRadarStyle(style) {
  if (!RADAR_STYLES.includes(style)) return;
  try { localStorage.setItem(RADAR_STYLE_KEY, style); } catch {}
  const container = document.querySelector('.ble-radar-container');
  if (!container) return;
  // Remove old style classes
  RADAR_STYLES.forEach(s => container.classList.remove('radar-' + s));
  container.classList.add('radar-' + style);
  // Update style buttons
  document.querySelectorAll('.radar-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === style);
  });
  // Add/remove style-specific DOM elements
  _applyRadarStyleExtras(container, style);
}

function _applyRadarStyleExtras(container, style) {
  // Clean up previous extras
  container.querySelectorAll('.compass-n,.compass-s,.compass-e,.compass-w,.hud-corner,.hud-threat,.sonar-pulse,.star-field,.constellation-lines,.matrix-rain-overlay,.matrix-readout,.sub-depth,.sub-bubble').forEach(e => e.remove());
  // Stop matrix rain if switching away
  if (_matrixRainInterval) { clearInterval(_matrixRainInterval); _matrixRainInterval = null; }
  const circle = container.querySelector('.ble-radar-circle');
  if (!circle) return;

  if (style === 'tactical') {
    // Add compass marks
    ['N','S','E','W'].forEach(dir => {
      const el = document.createElement('span');
      el.className = 'compass-' + dir.toLowerCase();
      el.textContent = dir;
      circle.appendChild(el);
    });
    // Add HUD corners
    ['tl','tr','bl','br'].forEach(pos => {
      const el = document.createElement('div');
      el.className = 'hud-corner ' + pos;
      circle.appendChild(el);
    });
    // Threat level indicator
    const threat = document.createElement('div');
    threat.className = 'hud-threat green';
    threat.id = 'hudThreat';
    threat.textContent = 'CLEAR';
    circle.appendChild(threat);
  }

  if (style === 'sonar') {
    // Add pulse rings
    for (let i = 0; i < 3; i++) {
      const pulse = document.createElement('div');
      pulse.className = 'sonar-pulse';
      circle.appendChild(pulse);
    }
  }

  if (style === 'matrix') {
    // Matrix rain canvas overlay
    const rainCanvas = document.createElement('canvas');
    rainCanvas.className = 'matrix-rain-overlay';
    rainCanvas.width = 200;
    rainCanvas.height = 200;
    circle.appendChild(rainCanvas);
    _startMatrixRain(rainCanvas);
    // Digital readout
    const readout = document.createElement('div');
    readout.className = 'matrix-readout';
    readout.id = 'matrixReadout';
    readout.textContent = 'SYS.ONLINE // SCAN.ACTIVE';
    circle.appendChild(readout);
  }

  if (style === 'submarine') {
    // Depth gauge
    const depth = document.createElement('div');
    depth.className = 'sub-depth';
    depth.textContent = 'DEPTH 2.4GHz';
    circle.appendChild(depth);
    // Bubbles
    for (let i = 0; i < 5; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'sub-bubble';
      bubble.style.left = (15 + Math.random() * 70) + '%';
      bubble.style.animationDelay = (Math.random() * 4) + 's';
      bubble.style.animationDuration = (3 + Math.random() * 3) + 's';
      circle.appendChild(bubble);
    }
  }

  if (style === 'constellation') {
    // Add star field background
    const field = document.createElement('div');
    field.className = 'star-field';
    for (let i = 0; i < 40; i++) {
      const star = document.createElement('div');
      star.className = 'micro-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 4) + 's';
      star.style.opacity = (0.2 + Math.random() * 0.5);
      field.appendChild(star);
    }
    circle.appendChild(field);
    // SVG overlay for constellation lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('constellation-lines');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    circle.appendChild(svg);
  }
}

function _initRadarStyles() {
  const style = _getRadarStyle();
  setRadarStyle(style);
}

/* Update constellation lines when blips render */
function _updateConstellationLines() {
  const svg = document.querySelector('.constellation-lines');
  if (!svg) return;
  const blips = document.querySelectorAll('#radarBlips .ble-radar-blip');
  svg.innerHTML = '';
  const positions = [];
  blips.forEach(b => {
    positions.push({ x: parseFloat(b.style.left), y: parseFloat(b.style.top) });
  });
  // Connect nearby blips (distance < 30%)
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 30) {
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', positions[i].x);
        line.setAttribute('y1', positions[i].y);
        line.setAttribute('x2', positions[j].x);
        line.setAttribute('y2', positions[j].y);
        svg.appendChild(line);
      }
    }
  }
}

/* Update tactical HUD threat level */
function _updateHudThreat(deviceCount) {
  const el = document.getElementById('hudThreat');
  if (!el) return;
  if (deviceCount > 15) {
    el.className = 'hud-threat red'; el.textContent = 'HIGH';
  } else if (deviceCount > 5) {
    el.className = 'hud-threat yellow'; el.textContent = 'MEDIUM';
  } else {
    el.className = 'hud-threat green'; el.textContent = 'CLEAR';
  }
}

/* ═══════════════════════════════════
   6. DEVICE DNA FINGERPRINT
   ═══════════════════════════════════ */
function generateDeviceDNA(addr) {
  if (!addr) return '';
  // Generate unique color pattern from MAC address bytes
  const clean = addr.replace(/[^a-fA-F0-9]/g, '');
  const colors = [
    '#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6',
    '#38bdf8','#6366f1','#a855f7','#ec4899','#64748b',
    '#2dd4bf','#fb923c','#34d399','#0ea5e9','#e879f9','#fbbf24'
  ];
  let html = '<div class="device-dna">';
  for (let i = 0; i < Math.min(clean.length, 12); i++) {
    const val = parseInt(clean[i], 16);
    const color = colors[val] || '#64748b';
    const height = 40 + (val / 15) * 60;
    html += '<div class="dna-seg" style="background:' + color + ';height:' + height + '%;align-self:center"></div>';
  }
  html += '</div>';
  return html;
}

/* ═══════════════════════════════════
   7. SIGNAL HEATMAP TIMELINE
   ═══════════════════════════════════ */
const _heatmapData = []; // [{ts, devices:[{name,rssi}]}]
const HEATMAP_MAX_COLS = 60;

function _addHeatmapSample(devices) {
  const sample = {
    ts: Date.now(),
    devices: (devices || []).slice(0, 20).map(d => ({
      name: d.name || '?',
      addr: d.address || d.id || '',
      rssi: d.rssi || -100
    }))
  };
  _heatmapData.push(sample);
  if (_heatmapData.length > HEATMAP_MAX_COLS) _heatmapData.shift();
}

function _renderHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas || !_heatmapData.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Collect all unique device addrs
  const allAddrs = new Set();
  _heatmapData.forEach(s => s.devices.forEach(d => allAddrs.add(d.addr)));
  const addrs = Array.from(allAddrs).slice(0, 15); // max 15 rows

  const colW = w / HEATMAP_MAX_COLS;
  const rowH = addrs.length ? h / addrs.length : h;

  _heatmapData.forEach((sample, col) => {
    addrs.forEach((addr, row) => {
      const dev = sample.devices.find(d => d.addr === addr);
      const rssi = dev ? dev.rssi : -110;
      const norm = Math.max(0, Math.min(1, (rssi + 100) / 70));
      // Color: deep blue → cyan → yellow → red
      let r, g, b;
      if (norm < 0.33) {
        const t = norm / 0.33;
        r = 13; g = Math.round(27 + t * 180); b = Math.round(42 + t * 150);
      } else if (norm < 0.66) {
        const t = (norm - 0.33) / 0.33;
        r = Math.round(45 * (1-t) + 251 * t); g = Math.round(207 * (1-t) + 146 * t); b = Math.round(191 * (1-t) + 60 * t);
      } else {
        const t = (norm - 0.66) / 0.34;
        r = Math.round(251 * (1-t) + 239 * t); g = Math.round(146 * (1-t) + 68 * t); b = Math.round(60 * (1-t) + 68 * t);
      }
      ctx.fillStyle = dev ? `rgb(${r},${g},${b})` : 'rgba(0,0,0,.3)';
      ctx.fillRect(col * colW, row * rowH, colW + 0.5, rowH + 0.5);
    });
  });

  // Draw device name labels on the left
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '6px monospace';
  ctx.textAlign = 'left';
  addrs.forEach((addr, row) => {
    const lastSample = _heatmapData[_heatmapData.length - 1];
    const dev = lastSample?.devices.find(d => d.addr === addr);
    const label = dev?.name?.substring(0, 10) || addr.substring(0, 8);
    ctx.fillText(label, 2, row * rowH + rowH / 2 + 3);
  });
}

/* ═══════════════════════════════════
   8. BLE LEADERBOARD
   ═══════════════════════════════════ */
function _renderLeaderboard() {
  const container = document.getElementById('leaderboardBody');
  if (!container) return;
  const cards = typeof _loadCards === 'function' ? _loadCards() : {};
  const arr = Object.values(cards).sort((a, b) => b.visits - a.visits).slice(0, 10);

  if (!arr.length) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:12px">Scan to populate leaderboard</td></tr>';
    return;
  }

  container.innerHTML = '';
  const medals = ['👑','🥈','🥉'];
  arr.forEach((c, i) => {
    const nickname = _getNickname(c.addr);
    const displayName = nickname || c.name || '?';
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="lb-rank ' + (i < 3 ? 'lb-rank-' + (i+1) : '') + '">' +
        (i < 3 ? '<span class="lb-medal">' + medals[i] + '</span>' : (i + 1)) +
      '</td>' +
      '<td class="lb-name" title="' + _escH(c.addr) + '">' + _escH(displayName) + '</td>' +
      '<td class="lb-stat">' + c.visits + '</td>' +
      '<td class="lb-stat">' + (c.bestRssi || '—') + '</td>' +
      '<td>' + generateDeviceDNA(c.addr) + '</td>';
    container.appendChild(tr);
  });
}

/* ═══════════════════════════════════
   9. MISSION MODE
   ═══════════════════════════════════ */
const MISSIONS_KEY = 'ble-missions';
const MISSIONS = [
  { id:'m_5apple',     icon:'🍎', name:'Apple Spotter',      desc:'Find 5 Apple devices',                  target:5,  stat:'apple_count',    difficulty:2, xp:50 },
  { id:'m_strong',     icon:'💪', name:'Close Encounter',    desc:'Find a device with RSSI > -30 dBm',     target:1,  stat:'strong_signal',  difficulty:1, xp:30 },
  { id:'m_10vendors',  icon:'🏭', name:'Vendor Explorer',    desc:'Discover devices from 10 different vendors', target:10, stat:'vendor_count', difficulty:3, xp:100 },
  { id:'m_50devices',  icon:'📡', name:'Signal Hunter',      desc:'Find 50 unique devices total',           target:50, stat:'total_unique',   difficulty:3, xp:100 },
  { id:'m_connect3',   icon:'🔗', name:'Triple Link',        desc:'Connect to 3 different devices',         target:3,  stat:'unique_connects', difficulty:2, xp:60 },
  { id:'m_5scans',     icon:'🔄', name:'Scan Warrior',       desc:'Complete 5 scan cycles',                 target:5,  stat:'scan_count',     difficulty:1, xp:20 },
  { id:'m_read10',     icon:'📖', name:'Data Reader',        desc:'Read 10 characteristics',                target:10, stat:'read_count',     difficulty:2, xp:50 },
  { id:'m_write5',     icon:'✏️', name:'Data Writer',        desc:'Write to 5 characteristics',             target:5,  stat:'write_count',    difficulty:2, xp:50 },
  { id:'m_subscribe5', icon:'📡', name:'Notification Master', desc:'Subscribe to 5 notifications',          target:5,  stat:'sub_count',      difficulty:2, xp:60 },
  { id:'m_marathon',   icon:'🏃', name:'BLE Marathon',       desc:'Keep scanning for 10 minutes straight',  target:10, stat:'scan_minutes',   difficulty:3, xp:120 },
];

function _loadMissions() {
  try { return JSON.parse(localStorage.getItem(MISSIONS_KEY)) || {}; } catch { return {}; }
}
function _saveMissions(data) {
  try { localStorage.setItem(MISSIONS_KEY, JSON.stringify(data)); } catch {}
}

function _getMissionProgress(mission) {
  const data = _loadMissions();
  return data[mission.stat] || 0;
}

function _incMission(stat, val) {
  const data = _loadMissions();
  data[stat] = (data[stat] || 0) + (val || 1);
  _saveMissions(data);
}
function _setMission(stat, val) {
  const data = _loadMissions();
  data[stat] = val;
  _saveMissions(data);
}

function _getTotalXP() {
  let xp = 0;
  MISSIONS.forEach(m => {
    if (_getMissionProgress(m) >= m.target) xp += m.xp;
  });
  return xp;
}

function _getLevel(xp) {
  if (xp >= 500) return { level: 5, name: 'BLE Master', next: 999, prev: 500 };
  if (xp >= 300) return { level: 4, name: 'BLE Expert', next: 500, prev: 300 };
  if (xp >= 150) return { level: 3, name: 'BLE Specialist', next: 300, prev: 150 };
  if (xp >= 50)  return { level: 2, name: 'BLE Apprentice', next: 150, prev: 50 };
  return { level: 1, name: 'BLE Rookie', next: 50, prev: 0 };
}

function _renderMissions() {
  const container = document.getElementById('missionGrid');
  if (!container) return;

  // XP bar
  const xp = _getTotalXP();
  const lvl = _getLevel(xp);
  const xpBar = document.getElementById('xpBarFill');
  const xpLevel = document.getElementById('xpLevel');
  const xpText = document.getElementById('xpText');
  if (xpBar) xpBar.style.width = Math.min(100, ((xp - lvl.prev) / (lvl.next - lvl.prev)) * 100) + '%';
  if (xpLevel) xpLevel.textContent = 'Lv.' + lvl.level + ' ' + lvl.name;
  if (xpText) xpText.textContent = xp + ' / ' + lvl.next + ' XP';

  container.innerHTML = '';
  MISSIONS.forEach(m => {
    const progress = _getMissionProgress(m);
    const completed = progress >= m.target;
    const pct = Math.min(100, (progress / m.target) * 100);

    const el = document.createElement('div');
    el.className = 'mission-card' + (completed ? ' completed' : ' active');
    el.innerHTML =
      '<div class="mission-header">' +
        '<span class="mission-icon">' + m.icon + '</span>' +
        '<span class="mission-name">' + m.name + '</span>' +
        '<span class="mission-difficulty">' + _stars(m.difficulty) + '</span>' +
      '</div>' +
      '<div class="mission-desc">' + m.desc + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<span class="mission-xp">+' + m.xp + ' XP</span>' +
        '<span style="font-family:\'Orbitron\',monospace;font-size:.55rem;color:var(--text-dim)">' + Math.min(progress, m.target) + '/' + m.target + '</span>' +
      '</div>' +
      '<div class="mission-progress-bar"><div class="mission-progress-fill" style="width:' + pct + '%"></div></div>' +
      (completed ? '<span class="mission-check">✅</span>' : '');
    container.appendChild(el);
  });
}

function _stars(n) {
  let s = '';
  for (let i = 0; i < 3; i++) s += '<span class="mission-star' + (i >= n ? ' empty' : '') + '">★</span>';
  return s;
}

/* ═══════════════════════════════════
   10. CO-LOCATION GRAPH
   ═══════════════════════════════════ */
const _colocData = {}; // { "addrA|addrB": count }

function _trackCoLocation(devices) {
  if (!devices || devices.length < 2) return;
  const addrs = devices.slice(0, 15).map(d => d.address || d.id).filter(Boolean);
  for (let i = 0; i < addrs.length; i++) {
    for (let j = i + 1; j < addrs.length; j++) {
      const key = [addrs[i], addrs[j]].sort().join('|');
      _colocData[key] = (_colocData[key] || 0) + 1;
    }
  }
}

function _renderCoLocationGraph() {
  const canvas = document.getElementById('colocCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Get unique nodes from co-location data
  const nodes = new Set();
  const edges = [];
  Object.entries(_colocData).forEach(([key, count]) => {
    if (count < 2) return; // Only show strong co-locations
    const [a, b] = key.split('|');
    nodes.add(a);
    nodes.add(b);
    edges.push({ a, b, weight: count });
  });

  const nodeArr = Array.from(nodes).slice(0, 20);
  if (!nodeArr.length) {
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan multiple times to build co-location graph', w/2, h/2);
    return;
  }

  // Simple circular layout
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  const positions = {};
  nodeArr.forEach((addr, i) => {
    const angle = (i / nodeArr.length) * Math.PI * 2 - Math.PI / 2;
    positions[addr] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  });

  // Draw edges
  const maxWeight = Math.max(...edges.map(e => e.weight), 1);
  edges.forEach(e => {
    if (!positions[e.a] || !positions[e.b]) return;
    const alpha = Math.min(0.6, (e.weight / maxWeight) * 0.6);
    const lineWidth = 1 + (e.weight / maxWeight) * 3;
    ctx.beginPath();
    ctx.moveTo(positions[e.a].x, positions[e.a].y);
    ctx.lineTo(positions[e.b].x, positions[e.b].y);
    ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  });

  // Draw nodes
  const cards = typeof _loadCards === 'function' ? _loadCards() : {};
  nodeArr.forEach(addr => {
    const pos = positions[addr];
    const card = cards[addr];
    const nickname = _getNickname(addr);
    const label = nickname || card?.name?.substring(0, 8) || addr.substring(0, 6);

    // Node circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, pos.x, pos.y + 16);
  });
}

/* ═══════════════════════════════════
   11. SOUND SIGNATURES
   ═══════════════════════════════════ */
let _soundscapeActive = false;
let _soundscapeCtx = null;

function toggleSoundscape() {
  _soundscapeActive = !_soundscapeActive;
  const btn = document.getElementById('soundscapeBtn');
  if (btn) btn.classList.toggle('active', _soundscapeActive);
  const viz = document.getElementById('soundViz');
  if (viz) viz.style.display = _soundscapeActive ? 'flex' : 'none';

  if (!_soundscapeActive && _soundscapeCtx) {
    _soundscapeCtx.close();
    _soundscapeCtx = null;
  }
}

function _playSoundSignature(devices) {
  if (!_soundscapeActive || !devices?.length) return;
  try {
    if (!_soundscapeCtx) _soundscapeCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _soundscapeCtx;
    if (ctx.state === 'suspended') ctx.resume();

    // Play a tone for up to 5 strongest devices
    const sorted = devices.slice().sort((a, b) => (b.rssi||0) - (a.rssi||0)).slice(0, 5);
    sorted.forEach((d, i) => {
      const rssi = d.rssi || -100;
      // Map RSSI to frequency: -100=-low pitch, -30=high pitch
      const freq = 200 + ((rssi + 100) / 70) * 600;
      // Map vendor to waveform
      const vendor = (d.vendor || d.name || '').toLowerCase();
      let type = 'sine';
      if (vendor.includes('apple')) type = 'triangle';
      else if (vendor.includes('samsung')) type = 'square';
      else if (vendor.includes('nordic')) type = 'sawtooth';

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.3 + i * 0.08);
    });
  } catch {}
}

/* ═══════════════════════════════════
   12. SCAN ANALYTICS MINI-DASHBOARD
   ═══════════════════════════════════ */
let _scanStartTime = Date.now();
let _scanHistory = []; // [{ts, count}]

function _updateAnalytics(devices) {
  const now = Date.now();
  _scanHistory.push({ ts: now, count: devices?.length || 0 });
  // Keep last 60 entries
  if (_scanHistory.length > 60) _scanHistory.shift();

  // Devices/minute
  const recentScans = _scanHistory.filter(s => s.ts > now - 60000);
  const devPerMin = recentScans.length ? Math.round(recentScans.reduce((s, e) => s + e.count, 0) / recentScans.length) : 0;

  // Session duration
  const sessionMin = Math.round((now - _scanStartTime) / 60000);

  // Peak
  const peak = _scanHistory.length ? Math.max(..._scanHistory.map(s => s.count)) : 0;

  // Update DOM
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('analyticsDevPerMin', devPerMin);
  el('analyticsSession', sessionMin + 'm');
  el('analyticsPeak', peak);
  el('analyticsTotalScans', _scanHistory.length);

  // Vendor pie chart
  _renderVendorPie(devices);
  // RSSI histogram
  _renderRssiHistogram(devices);
}

function _renderVendorPie(devices) {
  const canvas = document.getElementById('vendorPieCanvas');
  if (!canvas || !devices?.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Count vendors
  const vendors = {};
  devices.forEach(d => {
    const v = d.vendor || (typeof _deviceVendor === 'function' ? _deviceVendor(d) : null) || 'Unknown';
    vendors[v] = (vendors[v] || 0) + 1;
  });
  const entries = Object.entries(vendors).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((s, e) => s + e[1], 0);

  const colors = ['#38bdf8','#22c55e','#f59e0b','#ef4444','#a855f7','#2dd4bf','#fb923c','#64748b'];
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.4;
  let startAngle = -Math.PI / 2;

  entries.forEach(([name, count], i) => {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // Label
    const midAngle = startAngle + slice / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    if (slice > 0.3) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name.substring(0, 6), lx, ly);
    }
    startAngle += slice;
  });
}

function _renderRssiHistogram(devices) {
  const canvas = document.getElementById('rssiHistCanvas');
  if (!canvas || !devices?.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Bucket RSSI values: -100 to -20, 10dBm buckets
  const buckets = new Array(8).fill(0);
  const labels = ['-100','-90','-80','-70','-60','-50','-40','-30'];
  devices.forEach(d => {
    const rssi = Math.max(-100, Math.min(-30, d.rssi || -100));
    const idx = Math.min(7, Math.floor((rssi + 100) / 10));
    buckets[idx]++;
  });

  const maxVal = Math.max(...buckets, 1);
  const barW = (w - 20) / buckets.length;
  const colors = ['#ef4444','#ef4444','#f97316','#f97316','#eab308','#22c55e','#22c55e','#38bdf8'];

  buckets.forEach((count, i) => {
    const barH = (count / maxVal) * (h - 20);
    const x = 10 + i * barW + 2;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, h - 14 - barH, barW - 4, barH);
    // Label
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + (barW - 4) / 2, h - 4);
  });
}

/* ═══════════════════════════════════
   13. DEVICE NICKNAMES & NOTES
   ═══════════════════════════════════ */
const NICKNAMES_KEY = 'ble-nicknames';

function _loadNicknames() {
  try { return JSON.parse(localStorage.getItem(NICKNAMES_KEY)) || {}; } catch { return {}; }
}
function _saveNicknames(data) {
  try { localStorage.setItem(NICKNAMES_KEY, JSON.stringify(data)); } catch {}
}
function _getNickname(addr) {
  return _loadNicknames()[addr] || '';
}
function setNickname(addr, name) {
  const data = _loadNicknames();
  if (name) data[addr] = name;
  else delete data[addr];
  _saveNicknames(data);
}

/* Global nickname prompt — called from device list / radar detail */
function promptNickname(addr) {
  const current = _getNickname(addr);
  const name = prompt('Set nickname for ' + addr + ':', current);
  if (name !== null) {
    setNickname(addr, name.trim());
    // Re-render relevant views
    if (typeof renderDeviceList === 'function' && typeof _lastDevices !== 'undefined') {
      renderDeviceList();
    }
    _renderLeaderboard();
  }
}

/* ═══════════════════════════════════
   14. THREAT DETECTOR
   ═══════════════════════════════════ */
const _threatHistory = {}; // addr -> [{ts, rssi}]
let _threats = [];

function _analyzeThreats(devices) {
  if (!devices?.length) return;
  _threats = [];
  const now = Date.now();

  devices.forEach(d => {
    const addr = d.address || d.id;
    if (!addr) return;
    if (!_threatHistory[addr]) _threatHistory[addr] = [];
    _threatHistory[addr].push({ ts: now, rssi: d.rssi || -100, name: d.name });
    // Keep last 20 entries
    if (_threatHistory[addr].length > 20) _threatHistory[addr].shift();
  });

  // Check 1: Unusually strong signal (possible close tracker)
  devices.forEach(d => {
    if ((d.rssi || -100) > -25) {
      _threats.push({
        type: 'warning',
        icon: '📡',
        title: 'Very Strong Signal',
        desc: (d.name || d.address) + ' at ' + d.rssi + ' dBm — device is very close',
        ts: now
      });
    }
  });

  // Check 2: Rapid MAC rotation (many new addresses in short time)
  const recentNew = Object.keys(_threatHistory).filter(addr => {
    const entries = _threatHistory[addr];
    return entries.length === 1 && entries[0].ts > now - 30000;
  });
  if (recentNew.length > 8) {
    _threats.push({
      type: 'danger',
      icon: '🔄',
      title: 'MAC Address Rotation Detected',
      desc: recentNew.length + ' new addresses in 30s — possible privacy-randomizing device or tracker',
      ts: now
    });
  }

  // Check 3: Persistent follower (same device seen many times with consistent signal)
  Object.entries(_threatHistory).forEach(([addr, entries]) => {
    if (entries.length >= 10) {
      const avgRssi = entries.reduce((s, e) => s + e.rssi, 0) / entries.length;
      const variance = entries.reduce((s, e) => s + Math.pow(e.rssi - avgRssi, 2), 0) / entries.length;
      if (variance < 25 && avgRssi > -60) {
        _threats.push({
          type: 'info',
          icon: '👁️',
          title: 'Persistent Device',
          desc: (entries[0].name || addr) + ' — consistent signal, seen ' + entries.length + ' times',
          ts: now
        });
      }
    }
  });

  // Check 4: AirTag-like pattern (unnamed device, Apple vendor, consistent presence)
  devices.forEach(d => {
    const name = (d.name || '').toLowerCase();
    const vendor = (d.vendor || '').toLowerCase();
    if ((!name || name === '(unknown)') && vendor.includes('apple')) {
      _threats.push({
        type: 'warning',
        icon: '🏷️',
        title: 'Possible AirTag/Tracker',
        desc: 'Unnamed Apple device ' + (d.address || '') + ' — could be an AirTag',
        ts: now
      });
    }
  });

  _renderThreats();
}

function _renderThreats() {
  const container = document.getElementById('threatPanel');
  if (!container) return;

  // Update threat count badge
  const badge = document.getElementById('threatCountBadge');
  if (badge) {
    const dangerCount = _threats.filter(t => t.type === 'danger').length;
    const warnCount = _threats.filter(t => t.type === 'warning').length;
    const total = _threats.length;
    badge.textContent = total;
    badge.className = 'threat-count-badge ' + (dangerCount ? 'red' : warnCount ? 'yellow' : 'green');
    badge.style.display = total ? '' : 'none';
  }

  if (!_threats.length) {
    container.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:.7rem">✅ No threats detected — all clear!</div>';
    return;
  }

  container.innerHTML = '';
  _threats.forEach(t => {
    const el = document.createElement('div');
    el.className = 'threat-alert ' + t.type;
    el.innerHTML =
      '<span class="threat-icon">' + t.icon + '</span>' +
      '<div class="threat-text">' +
        '<div class="threat-title">' + t.title + '</div>' +
        '<div class="threat-desc">' + t.desc + '</div>' +
      '</div>' +
      '<span class="threat-time">' + new Date(t.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   15. EXPORT SCAN REPORT
   ═══════════════════════════════════ */
function exportScanReport() {
  const cards = typeof _loadCards === 'function' ? _loadCards() : {};
  const stats = typeof _getStats === 'function' ? _getStats() : {};
  const missions = _loadMissions();
  const xp = _getTotalXP();
  const lvl = _getLevel(xp);
  const now = new Date();

  const cardArr = Object.values(cards).sort((a, b) => b.visits - a.visits);

  let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>BLE Scan Report — ${now.toLocaleDateString()}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0e27;color:#e0e8ff;padding:20px;max-width:900px;margin:0 auto}
h1{color:#38bdf8;border-bottom:2px solid #38bdf8;padding-bottom:8px}
h2{color:#f59e0b;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:8px 0}
th{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1);color:#7a8aaa;font-size:.8rem;text-transform:uppercase}
td{padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem}
.stat{display:inline-block;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 16px;margin:4px;text-align:center}
.stat-value{font-size:1.4rem;font-weight:700;color:#38bdf8}
.stat-label{font-size:.7rem;color:#7a8aaa;margin-top:2px}
.rarity{font-size:.7rem;padding:1px 6px;border-radius:3px}
.common{background:rgba(100,116,139,.15);color:#94a3b8}
.uncommon{background:rgba(52,211,153,.15);color:#34d399}
.rare{background:rgba(56,189,248,.15);color:#38bdf8}
.epic{background:rgba(251,146,60,.15);color:#fb923c}
.legendary{background:rgba(245,158,11,.15);color:#f59e0b}
footer{margin-top:30px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);color:#556;font-size:.75rem;text-align:center}
</style></head><body>
<h1>📡 BLE Scan Report</h1>
<p style="color:#7a8aaa">${now.toLocaleString()} — Level ${lvl.level} ${lvl.name} (${xp} XP)</p>

<div style="display:flex;flex-wrap:wrap;gap:4px">
<div class="stat"><div class="stat-value">${stats.scans || 0}</div><div class="stat-label">Scans</div></div>
<div class="stat"><div class="stat-value">${stats.uniqueDevices || 0}</div><div class="stat-label">Unique Devices</div></div>
<div class="stat"><div class="stat-value">${stats.connects || 0}</div><div class="stat-label">Connects</div></div>
<div class="stat"><div class="stat-value">${stats.reads || 0}</div><div class="stat-label">Reads</div></div>
<div class="stat"><div class="stat-value">${stats.writes || 0}</div><div class="stat-label">Writes</div></div>
<div class="stat"><div class="stat-value">${(stats.unlocked || []).length}/${typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS.length : 20}</div><div class="stat-label">Badges</div></div>
</div>

<h2>🏆 Device Leaderboard</h2>
<table>
<tr><th>#</th><th>Device</th><th>Vendor</th><th>Visits</th><th>Best RSSI</th><th>Rarity</th><th>First Seen</th></tr>
${cardArr.map((c, i) => {
  const rarity = typeof _getRarity === 'function' ? _getRarity(c) : 'common';
  const nickname = _getNickname(c.addr);
  return `<tr><td>${i+1}</td><td>${_escH(nickname || c.name)}</td><td>${_escH(c.vendor || 'Unknown')}</td><td>${c.visits}</td><td>${c.bestRssi} dBm</td><td><span class="rarity ${rarity}">${rarity}</span></td><td>${new Date(c.firstSeen).toLocaleDateString()}</td></tr>`;
}).join('')}
</table>

<h2>🎯 Missions</h2>
<table>
<tr><th>Mission</th><th>Progress</th><th>XP</th><th>Status</th></tr>
${MISSIONS.map(m => {
  const p = _getMissionProgress(m);
  const done = p >= m.target;
  return `<tr><td>${m.icon} ${m.name}</td><td>${Math.min(p, m.target)}/${m.target}</td><td>+${m.xp}</td><td>${done ? '✅' : '⏳'}</td></tr>`;
}).join('')}
</table>

<h2>🛡️ Threat Summary</h2>
<p>${_threats.length ? _threats.map(t => t.icon + ' ' + t.title + ': ' + t.desc).join('<br>') : '✅ No threats detected'}</p>

<footer>BLE Dashboard v1.0 — Scan Report generated ${now.toLocaleString()}</footer>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ble-report-' + now.toISOString().slice(0, 10) + '.html';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof log === 'function') log('📊 Scan report exported', 'success');
}

/* ═══════════════════════════════════
   16. MATRIX RAIN (for radar style)
   ═══════════════════════════════════ */
let _matrixRainInterval = null;
function _startMatrixRain(canvas) {
  if (_matrixRainInterval) clearInterval(_matrixRainInterval);
  const ctx = canvas.getContext('2d');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコ0123456789@#$%';
  const columns = Math.floor(canvas.width / 8);
  const drops = new Array(columns).fill(0);
  _matrixRainInterval = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = '8px monospace';
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 8, drops[i] * 8);
      if (drops[i] * 8 > canvas.height && Math.random() > 0.95) drops[i] = 0;
      drops[i]++;
    }
  }, 80);
}

/* ═══════════════════════════════════
   17. DEVICE AUTOPSY
   ═══════════════════════════════════ */
function showDeviceAutopsy(device) {
  const panel = document.getElementById('autopsyPanel');
  if (!panel || !device) return;
  const addr = device.address || device.id || '??:??:??:??:??:??';
  const rssi = device.rssi || -100;
  const name = device.name || '(unknown)';
  const vendor = (typeof _deviceVendor === 'function' ? _deviceVendor(device) : null) || device.vendor || 'Unknown';

  // MAC byte analysis
  const macBytes = addr.split(':');
  const oui = macBytes.slice(0, 3).join(':').toUpperCase();
  const isRandom = macBytes.length >= 1 && (parseInt(macBytes[0], 16) & 0x02) !== 0;

  // Signal physics calculation
  const txPower = -59; // assumed typical BLE TX power
  const n = 2.0; // path loss exponent
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));

  // Free Space Path Loss
  const freq = 2440; // MHz
  const fspl = 20 * Math.log10(distance) + 20 * Math.log10(freq) + 32.44;

  const byteColors = ['#ef4444','#f97316','#f59e0b','#22c55e','#2dd4bf','#38bdf8'];

  panel.innerHTML =
    '<div class="autopsy-card">' +
      '<div class="autopsy-header">' +
        '<span style="font-size:1.2rem">🔬</span>' +
        '<span class="autopsy-title">' + _escH(name) + '</span>' +
      '</div>' +
      '<div class="autopsy-grid">' +
        '<div class="autopsy-field"><div class="autopsy-label">MAC Address</div><div class="autopsy-value">' + _escH(addr) + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">OUI Prefix</div><div class="autopsy-value">' + oui + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Vendor</div><div class="autopsy-value">' + _escH(vendor) + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">MAC Type</div><div class="autopsy-value">' + (isRandom ? '🎲 Random' : '🏭 Public') + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">RSSI</div><div class="autopsy-value">' + rssi + ' dBm</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Est. Distance</div><div class="autopsy-value">' + distance.toFixed(2) + ' m</div></div>' +
      '</div>' +
      '<div class="autopsy-mac-bytes">' +
        macBytes.map((b, i) => '<span class="autopsy-byte" style="color:' + byteColors[i % 6] + ';border-color:' + byteColors[i % 6] + '30">' + b.toUpperCase() + '</span>').join('') +
      '</div>' +
      generateDeviceDNA(addr) +
      '<div class="autopsy-signal-physics">' +
        '// SIGNAL PHYSICS ANALYSIS\n' +
        'TX Power (assumed): ' + txPower + ' dBm\n' +
        'Received (RSSI):    ' + rssi + ' dBm\n' +
        'Path Loss:          ' + (txPower - rssi) + ' dB\n' +
        'FSPL @ 2.44GHz:     ' + fspl.toFixed(1) + ' dB\n' +
        'Est. Distance:      ' + distance.toFixed(2) + ' m\n' +
        'Formula: d = 10^((TxPow - RSSI) / (10*n))' +
      '</div>' +
    '</div>';
}

/* ═══════════════════════════════════
   18. PACKET STORM VISUALIZER
   ═══════════════════════════════════ */
const _packets = []; // {x, y, vx, vy, life, color, size}
let _packetAnimFrame = null;
let _packetCount = 0;

function _addPacketBurst(count) {
  const canvas = document.getElementById('packetStormCanvas');
  if (!canvas) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const colors = ['#38bdf8','#22c55e','#f59e0b','#ef4444','#2dd4bf','#0ea5e9'];
  for (let i = 0; i < count; i++) {
    _packets.push({
      x: w / 2 + (Math.random() - 0.5) * 40,
      y: h / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 60 + Math.random() * 60,
      maxLife: 120,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1.5 + Math.random() * 2
    });
  }
  _packetCount += count;
}

function _renderPacketStorm() {
  const canvas = document.getElementById('packetStormCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Draw origin glow
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 30);
  grad.addColorStop(0, 'rgba(56,189,248,.15)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(w/2 - 30, h/2 - 30, 60, 60);

  // Update and draw particles
  for (let i = _packets.length - 1; i >= 0; i--) {
    const p = _packets[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
      _packets.splice(i, 1);
      continue;
    }
    const alpha = Math.min(1, p.life / 30);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
    // Trail
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
    ctx.strokeStyle = p.color + Math.round(alpha * 80).toString(16).padStart(2, '0');
    ctx.lineWidth = p.size * 0.5;
    ctx.stroke();
  }

  // Stats overlay
  const statsEl = document.getElementById('packetStormStats');
  if (statsEl) statsEl.textContent = _packetCount + ' pkts | ' + _packets.length + ' active';

  _packetAnimFrame = requestAnimationFrame(_renderPacketStorm);
}

/* ═══════════════════════════════════
   19. TIME TRAVEL SCANNER
   ═══════════════════════════════════ */
const _timeTravelSnapshots = []; // [{ts, devices:[{name,addr,rssi,vendor}]}]
const TIMETRAVEL_MAX = 30;

function _addTimeTravelSnapshot(devices) {
  if (!devices?.length) return;
  _timeTravelSnapshots.push({
    ts: Date.now(),
    devices: devices.slice(0, 20).map(d => ({
      name: d.name || '?',
      addr: d.address || d.id || '',
      rssi: d.rssi || -100,
      vendor: d.vendor || (typeof _deviceVendor === 'function' ? _deviceVendor(d) : '') || ''
    }))
  });
  if (_timeTravelSnapshots.length > TIMETRAVEL_MAX) _timeTravelSnapshots.shift();
  // Update slider max
  const slider = document.getElementById('timeTravelSlider');
  if (slider) {
    slider.max = _timeTravelSnapshots.length - 1;
    slider.value = _timeTravelSnapshots.length - 1;
  }
  _renderTimeTravelSnapshot(_timeTravelSnapshots.length - 1);
}

function onTimeTravelSlide(val) {
  _renderTimeTravelSnapshot(parseInt(val));
}

function _renderTimeTravelSnapshot(idx) {
  const container = document.getElementById('timeTravelView');
  const timeLabel = document.getElementById('timeTravelTime');
  if (!container) return;

  if (idx < 0 || idx >= _timeTravelSnapshots.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:8px">No snapshots yet — start scanning</div>';
    return;
  }

  const snap = _timeTravelSnapshots[idx];
  if (timeLabel) timeLabel.textContent = new Date(snap.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  container.innerHTML = '';
  snap.devices.forEach(d => {
    const rssiColor = d.rssi > -50 ? '#22c55e' : d.rssi > -70 ? '#eab308' : '#ef4444';
    const el = document.createElement('div');
    el.className = 'timetravel-device';
    el.innerHTML =
      '<span>' + _escH(d.name) + '</span>' +
      '<span class="tt-rssi" style="color:' + rssiColor + '">' + d.rssi + '</span>';
    el.onclick = () => showDeviceAutopsy({ name: d.name, address: d.addr, rssi: d.rssi, vendor: d.vendor });
    el.style.cursor = 'pointer';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   20. DEVICE GRAVEYARD
   ═══════════════════════════════════ */
const _graveyard = []; // [{name, addr, lastSeen, rssi, vendor}]
const _currentAliveAddrs = new Set();

function _updateGraveyard(devices) {
  const nowAlive = new Set();
  (devices || []).forEach(d => {
    const addr = d.address || d.id;
    if (addr) nowAlive.add(addr);
  });

  // Devices that were alive but now gone
  _currentAliveAddrs.forEach(addr => {
    if (!nowAlive.has(addr) && !_graveyard.some(g => g.addr === addr)) {
      const cards = typeof _loadCards === 'function' ? _loadCards() : {};
      const card = cards[addr];
      _graveyard.push({
        name: card?.name || addr.substring(0, 8),
        addr: addr,
        lastSeen: Date.now(),
        rssi: card?.bestRssi || -100,
        vendor: card?.vendor || ''
      });
      if (_graveyard.length > 20) _graveyard.shift();
    }
  });

  _currentAliveAddrs.clear();
  nowAlive.forEach(a => _currentAliveAddrs.add(a));
  _renderGraveyard();
}

function _renderGraveyard() {
  const container = document.getElementById('graveyardGrid');
  if (!container) return;

  if (!_graveyard.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:12px;grid-column:1/-1">No departed devices yet...</div>';
    return;
  }

  container.innerHTML = '';
  _graveyard.slice().reverse().forEach(g => {
    const ago = Math.round((Date.now() - g.lastSeen) / 60000);
    const el = document.createElement('div');
    el.className = 'tombstone';
    el.innerHTML =
      '<div class="tombstone-icon">🪦</div>' +
      '<div class="tombstone-name">' + _escH(g.name) + '</div>' +
      '<div class="tombstone-date">' + ago + 'm ago</div>' +
      '<div class="tombstone-rip">Last: ' + g.rssi + ' dBm</div>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   21. RF SPECTRUM MINI-WATERFALL
   ═══════════════════════════════════ */
const _rfWaterfallData = []; // rows of 40 channel values
const RF_WATERFALL_ROWS = 50;

function _addRfWaterfallRow(devices) {
  // Simulate BLE channel activity from device count and RSSI
  const row = new Array(40).fill(-100);
  // Advertising channels (37, 38, 39)
  const devCount = (devices || []).length;
  [37, 38, 39].forEach(ch => {
    row[ch] = -90 + Math.min(40, devCount * 3) + Math.random() * 10;
  });
  // Data channels — distribute devices across them
  (devices || []).forEach((d, i) => {
    const ch = i % 37; // channels 0-36
    const rssi = d.rssi || -100;
    row[ch] = Math.max(row[ch], rssi + Math.random() * 5);
  });
  _rfWaterfallData.push(row);
  if (_rfWaterfallData.length > RF_WATERFALL_ROWS) _rfWaterfallData.shift();
  _renderRfWaterfall();
}

function _renderRfWaterfall() {
  const canvas = document.getElementById('rfMiniCanvas');
  if (!canvas || !_rfWaterfallData.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const cellW = w / 40;
  const cellH = h / RF_WATERFALL_ROWS;

  _rfWaterfallData.forEach((row, rowIdx) => {
    row.forEach((val, ch) => {
      const norm = Math.max(0, Math.min(1, (val + 100) / 70));
      // Color: dark blue → cyan → yellow → red
      let r, g, b;
      if (norm < 0.5) {
        r = 0; g = Math.round(norm * 2 * 200); b = Math.round(180 - norm * 2 * 80);
      } else {
        const t = (norm - 0.5) * 2;
        r = Math.round(t * 255); g = Math.round(200 - t * 130); b = Math.round(100 - t * 100);
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(ch * cellW, rowIdx * cellH, cellW + 0.5, cellH + 0.5);
    });
  });

  // Highlight advertising channels
  [37, 38, 39].forEach(ch => {
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ch * cellW, 0, cellW, h);
  });
}

/* ═══════════════════════════════════
   22. STEALTH METER
   ═══════════════════════════════════ */
function _renderStealthMeter(devices) {
  const container = document.getElementById('stealthList');
  if (!container || !devices?.length) return;

  const scored = devices.map(d => {
    let score = 0;
    const tactics = [];
    const addr = d.address || d.id || '';
    const name = d.name || '';
    const rssi = d.rssi || -100;

    // No name = stealthy
    if (!name || name === '(unknown)') { score += 30; tactics.push('No Name'); }
    // Random MAC
    if (addr && (parseInt(addr.split(':')[0], 16) & 0x02)) { score += 25; tactics.push('Random MAC'); }
    // Weak signal (hiding far away)
    if (rssi < -80) { score += 20; tactics.push('Low Power'); }
    // No manufacturer data
    if (!d.adv?.manufacturer_data || !Object.keys(d.adv.manufacturer_data).length) { score += 15; tactics.push('No MFG Data'); }
    // Minimal advertisement
    if (!d.adv?.service_uuids?.length) { score += 10; tactics.push('No Services'); }

    return { ...d, stealthScore: Math.min(100, score), tactics };
  }).sort((a, b) => b.stealthScore - a.stealthScore).slice(0, 10);

  container.innerHTML = '';
  scored.forEach(d => {
    const color = d.stealthScore > 70 ? '#ef4444' : d.stealthScore > 40 ? '#eab308' : '#22c55e';
    const el = document.createElement('div');
    el.className = 'stealth-row';
    el.innerHTML =
      '<span class="stealth-name">' + _escH(d.name || d.address || '?') + '</span>' +
      '<div class="stealth-bar-wrap"><div class="stealth-bar" style="width:' + d.stealthScore + '%;background:' + color + '"></div></div>' +
      '<span class="stealth-score" style="color:' + color + '">' + d.stealthScore + '</span>' +
      '<div class="stealth-tactics">' + d.tactics.map(t => '<span class="stealth-tag">' + t + '</span>').join('') + '</div>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   23. TERMINAL HACKER VIEW
   ═══════════════════════════════════ */
const _terminalLines = [];
const TERMINAL_MAX = 100;

function _termLog(type, msg) {
  const ts = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  _terminalLines.push({ ts, type, msg });
  if (_terminalLines.length > TERMINAL_MAX) _terminalLines.shift();
  _renderTerminal();
}

function _renderTerminal() {
  const body = document.getElementById('terminalBody');
  if (!body) return;
  const wasAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 20;

  body.innerHTML = '';
  _terminalLines.forEach(l => {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML =
      '<span class="t-time">[' + l.ts + ']</span> ' +
      '<span class="t-type ' + l.type + '">[' + l.type.toUpperCase() + ']</span> ' +
      l.msg;
    body.appendChild(line);
  });

  // Cursor
  const cursor = document.createElement('div');
  cursor.className = 'terminal-line';
  cursor.innerHTML = '<span class="t-time">root@ble</span>:~$ <span class="terminal-cursor"></span>';
  body.appendChild(cursor);

  if (wasAtBottom) body.scrollTop = body.scrollHeight;
}

/* ═══════════════════════════════════
   24. SCAN DIFF MODE
   ═══════════════════════════════════ */
let _previousScanDevices = [];

function _renderScanDiff(currentDevices) {
  const container = document.getElementById('diffView');
  if (!container) return;

  const prev = new Map(_previousScanDevices.map(d => [d.addr, d]));
  const curr = new Map((currentDevices || []).map(d => [d.address || d.id, {
    name: d.name || '?',
    addr: d.address || d.id || '',
    rssi: d.rssi || -100
  }]));

  const added = [];
  const removed = [];
  const changed = [];
  const same = [];

  curr.forEach((d, addr) => {
    if (!prev.has(addr)) added.push(d);
    else {
      const p = prev.get(addr);
      const rssiDiff = d.rssi - p.rssi;
      if (Math.abs(rssiDiff) > 5) changed.push({ ...d, rssiDiff });
      else same.push(d);
    }
  });
  prev.forEach((d, addr) => {
    if (!curr.has(addr)) removed.push(d);
  });

  // Update summary
  const summary = document.getElementById('diffSummary');
  if (summary) {
    summary.innerHTML =
      '<span class="diff-stat added">+' + added.length + ' new</span>' +
      '<span class="diff-stat removed">-' + removed.length + ' gone</span>' +
      '<span class="diff-stat changed">~' + changed.length + ' changed</span>' +
      '<span class="diff-stat same">=' + same.length + ' same</span>';
  }

  container.innerHTML = '';
  added.forEach(d => {
    container.innerHTML += '<div class="diff-item add"><span class="diff-marker">+</span>' + _escH(d.name) + ' <span style="opacity:.5">' + d.rssi + ' dBm</span></div>';
  });
  removed.forEach(d => {
    container.innerHTML += '<div class="diff-item rem"><span class="diff-marker">-</span>' + _escH(d.name) + '</div>';
  });
  changed.forEach(d => {
    const arrow = d.rssiDiff > 0 ? '▲' : '▼';
    const color = d.rssiDiff > 0 ? '#22c55e' : '#ef4444';
    container.innerHTML += '<div class="diff-item chg"><span class="diff-marker">~</span>' + _escH(d.name) + ' <span style="color:' + color + '">' + arrow + Math.abs(d.rssiDiff) + 'dB</span></div>';
  });

  // Save current as previous for next diff
  _previousScanDevices = Array.from(curr.values());
}

/* ═══════════════════════════════════
   UTILITY
   ═══════════════════════════════════ */
function _escH(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

/* ═══════════════════════════════════
   HOOKS — intercept scan results to feed all features
   ═══════════════════════════════════ */
function _initFeatureHooks() {
  // Hook directly into WebSocket messages (badges.js uses local ref so monkey-patch won't work)
  const wsCheck = setInterval(() => {
    if (typeof ble !== 'undefined' && ble.ws && ble.ws.onmessage) {
      const origHandler = ble.ws.onmessage;
      ble.ws.onmessage = function(ev) {
        try {
          const msg = JSON.parse(ev.data);
          _handleFeatureEvent(msg);
        } catch {}
        return origHandler.call(this, ev);
      };
      clearInterval(wsCheck);
    }
  }, 500);
  setTimeout(() => clearInterval(wsCheck), 10000);

  // Also hook bleScan for mission counting
  const origScan = window.bleScan;
  if (origScan) {
    const currentScan = window.bleScan; // might already be wrapped by badges.js
    window.bleScan = async function() {
      _incMission('scan_count');
      return currentScan.apply(this, arguments);
    };
  }

  // Hook into renderRadarBlips to update constellation lines and HUD
  const origRender = window.renderRadarBlips;
  if (origRender) {
    window.renderRadarBlips = function(devices) {
      const result = origRender.apply(this, arguments);
      setTimeout(() => {
        _updateConstellationLines();
        _updateHudThreat(devices ? devices.length : 0);
      }, 100);
      return result;
    };
  }

  // Scan minute tracker for marathon mission
  setInterval(() => {
    // Check if scanning is active
    const stopBtn = document.getElementById('stopScanBtn');
    if (stopBtn && stopBtn.style.display !== 'none') {
      _incMission('scan_minutes');
    }
  }, 60000);
}

function _handleFeatureEvent(msg) {
  const t = msg.type;
  if (t === 'scan_result') {
    const devices = msg.devices || [];
    // Feed all feature systems
    _addHeatmapSample(devices);
    _renderHeatmap();
    _trackCoLocation(devices);
    _updateAnalytics(devices);
    _analyzeThreats(devices);
    _playSoundSignature(devices);
    // New features v2
    _addPacketBurst(devices.length * 2);
    _addTimeTravelSnapshot(devices);
    _updateGraveyard(devices);
    _addRfWaterfallRow(devices);
    _renderStealthMeter(devices);
    _renderScanDiff(devices);
    // Terminal log
    _termLog('scan', devices.length + ' devices found — ' + devices.map(d => d.name || '?').slice(0,5).join(', ') + (devices.length > 5 ? '...' : ''));

    // Mission tracking
    const data = _loadMissions();
    // Apple count
    const appleCount = devices.filter(d => {
      const v = (d.vendor || '').toLowerCase();
      const n = (d.name || '').toLowerCase();
      return v.includes('apple') || n.includes('apple') || n.includes('iphone') || n.includes('ipad');
    }).length;
    data.apple_count = (data.apple_count || 0) + appleCount;

    // Strong signal
    if (devices.some(d => (d.rssi || -100) > -30)) {
      data.strong_signal = (data.strong_signal || 0) + 1;
    }

    // Vendor count
    const vendors = new Set();
    devices.forEach(d => {
      const v = d.vendor || (typeof _deviceVendor === 'function' ? _deviceVendor(d) : null) || '';
      if (v && v !== 'Unknown') vendors.add(v);
    });
    const prevVendors = new Set(data._vendors || []);
    vendors.forEach(v => prevVendors.add(v));
    data._vendors = Array.from(prevVendors);
    data.vendor_count = prevVendors.size;

    // Total unique
    const stats = typeof _getStats === 'function' ? _getStats() : {};
    data.total_unique = stats.uniqueDevices || 0;
    data.unique_connects = stats.uniqueConnects || 0;

    _saveMissions(data);
  } else if (t === 'read_result') {
    _incMission('read_count');
    _termLog('conn', 'READ characteristic — ' + (msg.value || '').substring(0, 40));
  } else if (t === 'write_ok') {
    _incMission('write_count');
    _termLog('conn', 'WRITE ok — ' + (msg.char || ''));
  } else if (t === 'subscribed') {
    _incMission('sub_count');
    _termLog('conn', 'SUBSCRIBED to notifications — ' + (msg.char || ''));
  } else if (t === 'connected') {
    _termLog('conn', 'CONNECTED to ' + (msg.name || msg.device || '?'));
  } else if (t === 'disconnected') {
    _termLog('warn', 'DISCONNECTED from ' + (msg.name || msg.device || '?'));
  }
}

/* ═══════════════════════════════════
   INIT
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    _initFeatureHooks();
    _initRadarStyles();
    _renderLeaderboard();
    _renderMissions();
    _renderHeatmap();
    _renderCoLocationGraph();
    _renderThreats();
    _renderGraveyard();
    _renderTerminal();

    // Start packet storm animation
    _renderPacketStorm();

    // Terminal boot sequence
    _termLog('scan', 'BLE Dashboard v1.0 initialized');
    _termLog('scan', 'Radar styles: ' + RADAR_STYLES.length + ' loaded');
    _termLog('scan', 'Systems online — awaiting scan...');

    // Periodic refresh
    setInterval(() => {
      _renderLeaderboard();
      _renderMissions();
      _renderCoLocationGraph();
    }, 10000);

    // Resize handlers
    window.addEventListener('resize', () => {
      _renderHeatmap();
      _renderCoLocationGraph();
      _renderRfWaterfall();
    });
  }, 800);
});
