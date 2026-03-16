/**
 * sdr.js  v1.0  — HackRF SDR Spectrum Visualization
 * Loaded after ble.js. Extends the WebSocket handler to process
 * SDR spectrum data and render waterfall, channel bars, and overlay.
 */

/* ═══════════════════════════════════
   State
   ═══════════════════════════════════ */
const sdr = {
  active: false,
  waterfallData: [],
  maxRows: 100,
  channelPower: new Float32Array(40),
  prevChannelPower: new Float32Array(40),
  animFrame: null,
};

/* ═══════════════════════════════════
   WebSocket — chain onto existing handler
   ═══════════════════════════════════ */
const _origWsHandle = wsHandle;
wsHandle = function(msg) {
  if (msg.type === 'sdr_spectrum') { onSdrSpectrum(msg); return; }
  if (msg.type === 'sdr_status')   { onSdrStatus(msg);   return; }
  _origWsHandle(msg);
};

/* ═══════════════════════════════════
   Controls
   ═══════════════════════════════════ */
function sdrStart() {
  const simulate = document.getElementById('sdrSimulateChk');
  wsSend({
    type: 'sdr_start',
    simulate: simulate ? simulate.checked : true,
  });
  sdr.active = true;
  const startBtn = document.getElementById('sdrStartBtn');
  const stopBtn  = document.getElementById('sdrStopBtn');
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn)  stopBtn.style.display  = '';
  log('SDR spectrum capture started', 'info');
}

function sdrStop() {
  wsSend({ type: 'sdr_stop' });
  sdr.active = false;
  const startBtn = document.getElementById('sdrStartBtn');
  const stopBtn  = document.getElementById('sdrStopBtn');
  if (startBtn) startBtn.style.display = '';
  if (stopBtn)  stopBtn.style.display  = 'none';
  if (sdr.animFrame) {
    cancelAnimationFrame(sdr.animFrame);
    sdr.animFrame = null;
  }
  log('SDR spectrum capture stopped', 'info');
}

/* ═══════════════════════════════════
   Status handler
   ═══════════════════════════════════ */
function onSdrStatus(msg) {
  const el = document.getElementById('sdrStatusText');
  if (el) el.textContent = msg.status || (msg.running ? 'Running' : 'Stopped');
  log('RX <- sdr_status: ' + (msg.status || ''), 'rx');
}

/* ═══════════════════════════════════
   Spectrum data handler
   ═══════════════════════════════════ */
function onSdrSpectrum(msg) {
  if (!msg.bins) return;

  // Waterfall rows
  sdr.waterfallData.push(msg.bins);
  if (sdr.waterfallData.length > sdr.maxRows) {
    sdr.waterfallData.shift();
  }

  // Channel power with lerp for smooth animation
  if (msg.ble_channels) {
    for (let i = 0; i < 40 && i < msg.ble_channels.length; i++) {
      sdr.prevChannelPower[i] = sdr.channelPower[i];
      sdr.channelPower[i] = msg.ble_channels[i];
    }
  }

  // Schedule render
  if (!sdr.animFrame) {
    sdr.animFrame = requestAnimationFrame(function() {
      sdr.animFrame = null;
      renderWaterfall();
      renderChannelBars();
      renderOverlay(msg);
    });
  }
}

/* ═══════════════════════════════════
   Plasma colormap  -100 dBm .. -30 dBm
   ═══════════════════════════════════ */
const _plasmaStops = [
  { t: 0.00, r: 13,  g: 8,   b: 135 },  // #0d0887  dark navy
  { t: 0.29, r: 126, g: 3,   b: 168 },  // #7e03a8  purple
  { t: 0.57, r: 203, g: 70,  b: 121 },  // #cb4679  magenta-pink
  { t: 0.71, r: 240, g: 114, b: 62  },  // #f0723e  orange
  { t: 1.00, r: 240, g: 249, b: 33  },  // #f0f921  yellow
];

function dBmToColor(dBm) {
  // Clamp to -100 .. -30 and map to 0..1
  var t = (Math.max(-100, Math.min(-30, dBm)) + 100) / 70;
  // Find segment
  var i = 0;
  for (; i < _plasmaStops.length - 1; i++) {
    if (t <= _plasmaStops[i + 1].t) break;
  }
  var a = _plasmaStops[i];
  var b = _plasmaStops[Math.min(i + 1, _plasmaStops.length - 1)];
  var segT = (b.t === a.t) ? 0 : (t - a.t) / (b.t - a.t);
  return [
    Math.round(a.r + (b.r - a.r) * segT),
    Math.round(a.g + (b.g - a.g) * segT),
    Math.round(a.b + (b.b - a.b) * segT),
  ];
}

/* ═══════════════════════════════════
   BLE channel center frequencies (MHz)
   ═══════════════════════════════════ */
function bleChannelFreq(ch) {
  if (ch === 37) return 2402;
  if (ch === 38) return 2426;
  if (ch === 39) return 2480;
  if (ch <= 10)  return 2404 + ch * 2;
  return 2428 + (ch - 11) * 2;  // ch 11..36
}

/* ═══════════════════════════════════
   Waterfall — canvas spectrogram
   ═══════════════════════════════════ */
function renderWaterfall() {
  var canvas = document.getElementById('sdrWaterfall');
  if (!canvas) return;

  var W = 400;
  var H = sdr.maxRows;
  canvas.width  = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  var img = ctx.createImageData(W, H);
  var data = img.data;

  var rows = sdr.waterfallData;
  var numRows = rows.length;

  for (var r = 0; r < H; r++) {
    // Map row index: row 0 = oldest at top, newest at bottom
    var dataIdx = r - (H - numRows);
    var bins = (dataIdx >= 0 && dataIdx < numRows) ? rows[dataIdx] : null;

    for (var c = 0; c < W; c++) {
      var px = (r * W + c) * 4;
      if (!bins) {
        // Empty row — dark background
        data[px]     = 13;
        data[px + 1] = 8;
        data[px + 2] = 135;
        data[px + 3] = 255;
      } else {
        // Map column to bin index
        var binIdx = Math.floor(c * bins.length / W);
        var rgb = dBmToColor(bins[binIdx]);
        data[px]     = rgb[0];
        data[px + 1] = rgb[1];
        data[px + 2] = rgb[2];
        data[px + 3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);

  // Frequency axis markers
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  var freqStart = 2400;
  var freqEnd   = 2484;
  var freqs = [2402, 2426, 2450, 2480];
  for (var f = 0; f < freqs.length; f++) {
    var x = ((freqs[f] - freqStart) / (freqEnd - freqStart)) * W;
    ctx.fillText(freqs[f] + '', x, H - 3);
    // Tick
    ctx.fillRect(x, H - 14, 1, 4);
  }

  // BLE advertising channel markers (37, 38, 39)
  var advChs = [37, 38, 39];
  ctx.fillStyle = '#00e5ff';
  for (var a = 0; a < advChs.length; a++) {
    var freq = bleChannelFreq(advChs[a]);
    var ax = ((freq - freqStart) / (freqEnd - freqStart)) * W;
    // Small triangle marker at top
    ctx.beginPath();
    ctx.moveTo(ax, 0);
    ctx.lineTo(ax - 4, 8);
    ctx.lineTo(ax + 4, 8);
    ctx.closePath();
    ctx.fill();
  }
}

/* ═══════════════════════════════════
   Channel bars — 40-bar chart
   ═══════════════════════════════════ */
function renderChannelBars() {
  var canvas = document.getElementById('sdrChannels');
  if (!canvas) return;

  var W = canvas.clientWidth  || 500;
  var H = canvas.clientHeight || 200;
  canvas.width  = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  var dBmMin = -100;
  var dBmMax = -30;
  var range  = dBmMax - dBmMin;
  var pad    = { top: 10, bottom: 28, left: 36, right: 8 };
  var plotW  = W - pad.left - pad.right;
  var plotH  = H - pad.top - pad.bottom;
  var barW   = plotW / 40;
  var gap    = Math.max(1, barW * 0.15);

  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'right';
  for (var g = dBmMin; g <= dBmMax; g += 10) {
    var gy = pad.top + plotH - ((g - dBmMin) / range) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(W - pad.right, gy);
    ctx.stroke();
    ctx.fillText(g + '', pad.left - 4, gy + 3);
  }

  // Bars
  var advSet = { 37: true, 38: true, 39: true };
  for (var ch = 0; ch < 40; ch++) {
    // Lerp for smooth animation
    var val = sdr.prevChannelPower[ch] + (sdr.channelPower[ch] - sdr.prevChannelPower[ch]) * 0.6;
    var clamped = Math.max(dBmMin, Math.min(dBmMax, val));
    var barH = ((clamped - dBmMin) / range) * plotH;
    var x = pad.left + ch * barW + gap / 2;
    var y = pad.top + plotH - barH;
    var w = barW - gap;

    // Bar color gradient: green (-90) -> orange (-60) -> red (-40)
    var colorT = Math.max(0, Math.min(1, (clamped - (-90)) / 50));
    var r, gv, b;
    if (colorT < 0.5) {
      // green -> orange
      var st = colorT * 2;
      r  = Math.round(0x22 + (0xff - 0x22) * st);
      gv = Math.round(0xcc + (0x99 - 0xcc) * st);
      b  = Math.round(0x88 * (1 - st));
    } else {
      // orange -> red
      var st2 = (colorT - 0.5) * 2;
      r  = 0xff;
      gv = Math.round(0x99 - 0x99 * st2 + 0x44 * st2);
      b  = Math.round(0x55 * st2);
    }
    ctx.fillStyle = 'rgb(' + r + ',' + gv + ',' + b + ')';
    ctx.fillRect(x, y, w, barH);

    // Advertising channels get a glowing outline
    if (advSet[ch]) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur  = 8;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, w, barH);
      ctx.shadowBlur  = 0;
    }

    // Channel labels
    if (barW > 8 || ch % 5 === 0 || advSet[ch]) {
      ctx.fillStyle = advSet[ch] ? '#00e5ff' : 'rgba(255,255,255,0.5)';
      ctx.font = advSet[ch] ? 'bold 8px monospace' : '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch + '', x + w / 2, H - pad.bottom + 12);
    }
  }

  // Y-axis label
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.translate(10, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('dBm', 0, 0);
  ctx.restore();
}

/* ═══════════════════════════════════
   Overlay — spectrum line + WiFi regions
   ═══════════════════════════════════ */
function renderOverlay(msg) {
  var chk = document.getElementById('sdrWifiOverlayChk');
  var canvas = document.getElementById('sdrOverlay');
  if (!canvas) return;
  if (chk && !chk.checked) {
    // Clear the canvas when overlay is off
    canvas.width = canvas.clientWidth || 500;
    canvas.height = canvas.clientHeight || 150;
    return;
  }

  var W = canvas.clientWidth  || 500;
  var H = canvas.clientHeight || 150;
  canvas.width  = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  var freqStart = 2400;
  var freqEnd   = 2484;
  var freqRange = freqEnd - freqStart;
  var dBmMin = -100;
  var dBmMax = -30;
  var dBmRange = dBmMax - dBmMin;
  var pad = { top: 10, bottom: 22, left: 8, right: 8 };
  var plotW = W - pad.left - pad.right;
  var plotH = H - pad.top - pad.bottom;

  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, W, H);

  // WiFi channel shaded regions
  var wifiChannels = [
    { name: 'WiFi 1',  lo: 2401, hi: 2423 },
    { name: 'WiFi 6',  lo: 2426, hi: 2448 },
    { name: 'WiFi 11', lo: 2451, hi: 2473 },
  ];
  ctx.fillStyle = 'rgba(66, 133, 244, 0.18)';
  for (var w = 0; w < wifiChannels.length; w++) {
    var wch = wifiChannels[w];
    var wx1 = pad.left + ((wch.lo - freqStart) / freqRange) * plotW;
    var wx2 = pad.left + ((wch.hi - freqStart) / freqRange) * plotW;
    ctx.fillRect(wx1, pad.top, wx2 - wx1, plotH);
    // Label
    ctx.fillStyle = 'rgba(66, 133, 244, 0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(wch.name, (wx1 + wx2) / 2, pad.top + 12);
    ctx.fillStyle = 'rgba(66, 133, 244, 0.18)';
  }

  // BLE channel dashed lines
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.lineWidth = 1;
  for (var ch = 0; ch < 40; ch++) {
    var freq = bleChannelFreq(ch);
    var lx = pad.left + ((freq - freqStart) / freqRange) * plotW;
    ctx.beginPath();
    ctx.moveTo(lx, pad.top);
    ctx.lineTo(lx, pad.top + plotH);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Spectrum line (use latest bins)
  if (msg && msg.bins && msg.bins.length > 0) {
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    for (var i = 0; i < msg.bins.length; i++) {
      var sx = pad.left + (i / (msg.bins.length - 1)) * plotW;
      var sy = pad.top + plotH - ((Math.max(dBmMin, Math.min(dBmMax, msg.bins[i])) - dBmMin) / dBmRange) * plotH;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Legend
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  // BLE legend
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(W - 160, H - 16, 10, 3);
  ctx.fillText('BLE channels', W - 146, H - 12);
  // WiFi legend
  ctx.fillStyle = 'rgba(66, 133, 244, 0.6)';
  ctx.fillRect(W - 160, H - 8, 10, 3);
  ctx.fillText('WiFi channels', W - 146, H - 4);
}

/* ═══════════════════════════════════
   Init on DOM ready
   ═══════════════════════════════════ */
(function sdrInit() {
  function setup() {
    // Wire checkbox listener for overlay toggle
    var overlayChk = document.getElementById('sdrWifiOverlayChk');
    if (overlayChk) {
      overlayChk.addEventListener('change', function() {
        if (!overlayChk.checked) {
          var c = document.getElementById('sdrOverlay');
          if (c) { c.width = c.clientWidth || 500; c.height = c.clientHeight || 150; }
        }
      });
    }

    // Responsive canvas resize
    function resizeCanvases() {
      // Channel bars and overlay scale to container width
      var chCanvas = document.getElementById('sdrChannels');
      var ovCanvas = document.getElementById('sdrOverlay');
      if (chCanvas && chCanvas.parentElement) {
        chCanvas.style.width = '100%';
      }
      if (ovCanvas && ovCanvas.parentElement) {
        ovCanvas.style.width = '100%';
      }
    }
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // Initialize channel power to floor
    sdr.channelPower.fill(-100);
    sdr.prevChannelPower.fill(-100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
