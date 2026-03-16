/**
 * ble.js  v1.0  — BLE Dashboard frontend logic
 * Loaded after script.js (Workshop-DIY template).
 * Provides: i18n extension · WebSocket ↔ backend · Web Bluetooth ·
 *           Chart.js monitor · multi-device management
 */

/* ═══════════════════════════════════
   i18n — extend template LANG at parse time
   so template init() picks up BLE keys
   ═══════════════════════════════════ */
(function extendLang() {
  if (typeof LANG === 'undefined') return;
  const ext = {
    en: {
      title:'BLE Dashboard', subtitle:'📡 scan · 🔗 connect · 📊 monitor',
      scanTitle:'BLE Scanner', scanDesc:'Discover nearby Bluetooth Low Energy devices',
      scanStart:'Scan', scanStop:'Stop',
      filterLabel:'Filter by name', rssiLabel:'Min RSSI', autoReconnect:'Auto-reconnect',
      noDevices:'No devices found. Press Scan to start.',
      charTitle:'Characteristics', charSubTitle:'Read · Write · Subscribe',
      noDevConn:'No device connected',
      discoverBtn:'Discover', disconnectBtn:'Disconnect',
      serviceUUID:'Service UUID', charUUID:'Characteristic UUID',
      selectService:'— select service —', selectChar:'— select characteristic —',
      readBtn:'Read', readResult:'Value',
      writeLabel:'Write value', writeBtn:'Write', writeNoResp:'No resp.',
      subBtn:'Subscribe', unsubBtn:'Unsubscribe',
      monitorTitle:'Monitor', chartTitle:'Real-time Chart', chartDesc:'Live values over time',
      clearChart:'Clear', exportChart:'Export',
      chartWindow:'Window (pts)', chartPause:'Pause', chartGrid:'Grid',
      statMin:'Min', statMax:'Max', statAvg:'Avg', statCount:'Points',
      multiTitle:'Connected Devices', multiSubTitle:'Simultaneous connections', multiDesc:'Up to 5 parallel BLE connections',
      noConnected:'No active connections.',
      backendURL:'Backend URL', logFormat:'Log format', logBoth:'CSV + JSON',
      exportLogs:'Export logs from backend',
      faq_q1:'What is BLE?', faq_a1:'Bluetooth Low Energy — wireless protocol for sensors, wearables, IoT.',
      faq_q2:"Why can't I scan?", faq_a2:'Chrome or Edge required. HTTPS or localhost. Accept Bluetooth permission.',
      faq_q3:'What is a characteristic?', faq_a3:'A data slot in a BLE service. Read, write, or subscribe.',
      faq_q4:'Is data logged?', faq_a4:'Yes — Python backend logs to /logs/ as CSV and JSON Lines.',
      faq_q5:'How to start backend?', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'Start backend: cd backend && python main.py',
      howto_2:'Open http://localhost:8000 in Chrome or Edge.',
      howto_3:'Click Scan. Filter by name or RSSI if needed.',
      howto_4:'Click Connect, then Discover for services.',
      howto_5:'Select service + characteristic → Read / Write / Subscribe.',
      howto_6:'Watch the chart. Export logs from Settings.',
      wiki_ble_title:'📡 BLE Protocol', wiki_ble:'GATT-based. Services group Characteristics: read, write, notify, indicate.',
      wiki_uuid_title:'🔑 UUIDs', wiki_uuid:'16-bit standard (0x2A37) or 128-bit custom. Both supported.',
      wiki_backend_title:'🐍 Backend', wiki_backend:'FastAPI + bleak. WS: ws://localhost:8000/ws. REST: /api/. Linux · macOS · RPi.',
      wiki_log_title:'📜 Log', wiki_log:'TX (blue) = sent, RX (cyan) = received. Filter by type, export.',
    },
    fr: {
      title:'Tableau BLE', subtitle:'📡 scan · 🔗 connexion · 📊 surveillance',
      scanTitle:'Scanner BLE', scanDesc:'Découvrir les appareils BLE à proximité',
      scanStart:'Scanner', scanStop:'Arrêter',
      filterLabel:'Filtrer par nom', rssiLabel:'RSSI min', autoReconnect:'Reconnexion auto',
      noDevices:'Aucun appareil. Appuie sur Scanner.',
      charTitle:'Caractéristiques', charSubTitle:'Lire · Écrire · S\'abonner',
      noDevConn:'Aucun appareil connecté',
      discoverBtn:'Découvrir', disconnectBtn:'Déconnecter',
      serviceUUID:'UUID Service', charUUID:'UUID Caractéristique',
      selectService:'— choisir service —', selectChar:'— choisir caractéristique —',
      readBtn:'Lire', readResult:'Valeur',
      writeLabel:'Écrire une valeur', writeBtn:'Écrire', writeNoResp:'Sans rép.',
      subBtn:"S'abonner", unsubBtn:'Se désabonner',
      monitorTitle:'Moniteur', chartTitle:'Graphique temps réel', chartDesc:'Valeurs en direct',
      clearChart:'Effacer', exportChart:'Exporter',
      chartWindow:'Fenêtre (pts)', chartPause:'Pause', chartGrid:'Grille',
      statMin:'Min', statMax:'Max', statAvg:'Moy', statCount:'Points',
      multiTitle:'Appareils connectés', multiSubTitle:'Connexions simultanées', multiDesc:"Jusqu'à 5 connexions BLE",
      noConnected:'Aucune connexion active.',
      backendURL:'URL Backend', logFormat:'Format de log', logBoth:'CSV + JSON',
      exportLogs:'Exporter les logs',
      faq_q1:'C\'est quoi BLE?', faq_a1:'Bluetooth Low Energy — protocole sans fil pour capteurs, wearables, IoT.',
      faq_q2:'Pourquoi je ne peux pas scanner?', faq_a2:'Chrome/Edge requis. HTTPS ou localhost. Permission Bluetooth.',
      faq_q3:'C\'est quoi une caractéristique?', faq_a3:'Slot de données dans un service BLE. Lire, écrire, s\'abonner.',
      faq_q4:'Les données sont loguées?', faq_a4:'Oui — backend logue dans /logs/ en CSV et JSON Lines.',
      faq_q5:'Comment démarrer le backend?', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'Démarrer backend: cd backend && python main.py',
      howto_2:'Ouvrir http://localhost:8000 dans Chrome ou Edge.',
      howto_3:'Cliquer Scanner. Filtrer si besoin.',
      howto_4:'Cliquer Connecter, puis Découvrir.',
      howto_5:'Sélectionner service + caractéristique → Lire / Écrire / S\'abonner.',
      howto_6:'Surveiller le graphique. Exporter les logs.',
      wiki_ble_title:'📡 Protocole BLE', wiki_ble:'Basé GATT. Services → Caractéristiques: lire, écrire, notifier.',
      wiki_uuid_title:'🔑 UUIDs', wiki_uuid:'16-bit standard ou 128-bit personnalisé. Les deux supportés.',
      wiki_backend_title:'🐍 Backend', wiki_backend:'FastAPI + bleak. WS: ws://localhost:8000/ws. Multiplateforme.',
      wiki_log_title:'📜 Journal', wiki_log:'TX (bleu) = envoyé, RX (cyan) = reçu.',
    },
    ar: {
      title:'لوحة BLE', subtitle:'📡 مسح · 🔗 اتصال · 📊 مراقبة',
      scanTitle:'ماسح BLE', scanDesc:'اكتشاف أجهزة BLE القريبة',
      scanStart:'مسح', scanStop:'إيقاف',
      filterLabel:'تصفية بالاسم', rssiLabel:'RSSI أدنى', autoReconnect:'إعادة اتصال تلقائي',
      noDevices:'لا أجهزة. اضغط مسح.',
      charTitle:'الخصائص', charSubTitle:'قراءة · كتابة · اشتراك',
      noDevConn:'لا جهاز متصل',
      discoverBtn:'استكشاف', disconnectBtn:'قطع الاتصال',
      serviceUUID:'UUID الخدمة', charUUID:'UUID الخاصية',
      selectService:'— اختر خدمة —', selectChar:'— اختر خاصية —',
      readBtn:'قراءة', readResult:'القيمة',
      writeLabel:'كتابة قيمة', writeBtn:'كتابة', writeNoResp:'بدون رد',
      subBtn:'اشتراك', unsubBtn:'إلغاء اشتراك',
      monitorTitle:'المراقبة', chartTitle:'رسم بياني حي', chartDesc:'قيم في الوقت الحقيقي',
      clearChart:'مسح', exportChart:'تصدير',
      chartWindow:'نافذة (نقاط)', chartPause:'إيقاف مؤقت', chartGrid:'شبكة',
      statMin:'أدنى', statMax:'أقصى', statAvg:'متوسط', statCount:'نقاط',
      multiTitle:'الأجهزة المتصلة', multiSubTitle:'اتصالات متزامنة', multiDesc:'حتى 5 اتصالات BLE',
      noConnected:'لا اتصالات نشطة.',
      backendURL:'رابط الخادم', logFormat:'تنسيق السجل', logBoth:'CSV + JSON',
      exportLogs:'تصدير السجلات',
      faq_q1:'ما هو BLE؟', faq_a1:'Bluetooth Low Energy — بروتوكول لاسلكي للمستشعرات وإنترنت الأشياء.',
      faq_q2:'لماذا لا يمكنني المسح؟', faq_a2:'Chrome/Edge مطلوب. HTTPS أو localhost. إذن Bluetooth.',
      faq_q3:'ما هي الخاصية؟', faq_a3:'فتحة بيانات في خدمة BLE. قراءة، كتابة، اشتراك.',
      faq_q4:'هل يتم تسجيل البيانات؟', faq_a4:'نعم — الخادم يسجل في /logs/ بتنسيق CSV وJSON.',
      faq_q5:'كيف أشغّل الخادم؟', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'شغّل الخادم: cd backend && python main.py',
      howto_2:'افتح http://localhost:8000 في Chrome أو Edge.',
      howto_3:'اضغط مسح. صفّ بالاسم أو RSSI.',
      howto_4:'اضغط اتصال ثم استكشاف.',
      howto_5:'اختر خدمة + خاصية → قراءة / كتابة / اشتراك.',
      howto_6:'راقب الرسم البياني. صدّر السجلات.',
      wiki_ble_title:'📡 بروتوكول BLE', wiki_ble:'مبني على GATT. الخدمات تجمع الخصائص.',
      wiki_uuid_title:'🔑 معرفات UUID', wiki_uuid:'16-bit قياسية أو 128-bit مخصصة.',
      wiki_backend_title:'🐍 الخادم', wiki_backend:'FastAPI + bleak. متعدد المنصات.',
      wiki_log_title:'📜 السجل', wiki_log:'TX (أزرق) = مُرسَل، RX (سماوي) = مُستقبَل.',
    },
  };
  ['en','fr','ar'].forEach(l => Object.assign(LANG[l], ext[l]));
})();

/* ═══════════════════════════════════
   STATE
   ═══════════════════════════════════ */
const ble = {
  ws:           null,
  wsConnected:  false,
  device:       null,
  server:       null,
  services:     [],
  chars:        {},
  activeNotify: null,
  notifyHandler:null,
  multiDevices: [],
  autoReconnect:false,
  chartData:    [],
  chartPaused:  false,
  stats:        { min:null, max:null, sum:0, count:0 },
  watchMode:    false,
  watchTimer:   null,
};

/* ═══════════════════════════════════
   DEBUG STATE
   ═══════════════════════════════════ */
const _debug = {
  timeline:     [],          // {ts, event, detail, type}
  prevValues:   {},          // charId → previous raw bytes (for diff)
  dataRate:     {},          // charId → {count, bytes, lastReset}
  pendingReads: {},          // charId → timestamp (for latency)
  latencyLog:   {},          // charId → [ms, ms, ...]
};
const DATA_RATE_WINDOW = 5000; // 5s rolling window

/* ═══════════════════════════════════
   WIRESHARK-STYLE PACKET ANALYZER
   ═══════════════════════════════════ */
const _capture = {
  packets:      [],       // all captured packets
  filtered:     [],       // after display filter
  startTime:    null,     // capture start
  selected:     -1,       // selected packet index
  filter:       '',       // current display filter
  running:      true,     // capture on/off
  marked:       new Set(),// marked packet indices
  followChar:   null,     // follow one characteristic UUID
  deltaMode:    'prev',   // 'prev' or 'first'
  maxPackets:   2000,
  localAddr:    'localhost',  // our side
  remoteAddr:   null,         // {name, mac} of connected device
  remoteName:   null,
  colorRules: {
    notify:    '#22cc88',
    read:      '#5599ff',
    write:     '#ff9900',
    subscribe: '#aa55ff',
    error:     '#ff4455',
    connect:   '#00ddcc',
    scan:      '#7a8aaa',
  },
};

function _capturePacket(pkt) {
  if (!_capture.running) return;
  if (!_capture.startTime) _capture.startTime = performance.now();
  const now = performance.now();
  const prev = _capture.packets.length ? _capture.packets[_capture.packets.length-1]._absTime : now;
  const dir = pkt.dir || 'RX';
  const localLabel = _capture.localAddr;
  const remoteLabel = _capture.remoteAddr || '(none)';
  const remoteName = _capture.remoteName || '';
  const entry = {
    _no:       _capture.packets.length + 1,
    _absTime:  now,
    _delta:    ((now - prev) / 1000),            // seconds since prev
    _relTime:  ((now - _capture.startTime) / 1000), // seconds since start
    ts:        new Date(),
    dir:       dir,
    src:       dir === 'TX' ? localLabel : remoteLabel,
    dst:       dir === 'TX' ? remoteLabel : localLabel,
    srcName:   dir === 'TX' ? 'Dashboard' : remoteName,
    dstName:   dir === 'TX' ? remoteName : 'Dashboard',
    type:      pkt.type || '?',                  // notify, read_result, write, etc.
    uuid:      pkt.uuid || '',
    name:      pkt.name || '',
    raw:       pkt.raw || null,                   // Uint8Array or array
    length:    pkt.raw ? pkt.raw.length : 0,
    info:      pkt.info || '',
    decoded:   pkt.decoded || null,               // {hex, str, num, key}
    error:     pkt.error || false,
  };
  _capture.packets.push(entry);
  if (_capture.packets.length > _capture.maxPackets) {
    _capture.packets.splice(0, _capture.packets.length - _capture.maxPackets);
  }
  _applyFilter();
  _renderPacketList();
  _updateCaptureStats();
}

// Display filter: match against type, uuid, name, info, hex
function _applyFilter() {
  const q = _capture.filter.toLowerCase().trim();
  let list = _capture.packets;
  if (_capture.followChar) {
    list = list.filter(p => p.uuid === _capture.followChar);
  }
  if (!q) { _capture.filtered = list; return; }
  // Support field filters like "type:notify" or "uuid:e95d" or "len>10"
  const fieldMatch = q.match(/^(\w+)\s*([><=!:]+)\s*(.+)$/);
  if (fieldMatch) {
    const [, field, op, val] = fieldMatch;
    _capture.filtered = list.filter(p => {
      const fv = String(p[field] || p.decoded?.[field] || '').toLowerCase();
      if (op === ':' || op === '=' || op === '==') return fv.includes(val);
      if (op === '!=') return !fv.includes(val);
      if (op === '>') return parseFloat(fv) > parseFloat(val);
      if (op === '<') return parseFloat(fv) < parseFloat(val);
      return fv.includes(val);
    });
  } else {
    _capture.filtered = list.filter(p =>
      (p.type + ' ' + p.uuid + ' ' + p.name + ' ' + p.info + ' ' +
       (p.src||'') + ' ' + (p.dst||'') + ' ' + (p.srcName||'') + ' ' + (p.dstName||'') + ' ' +
       (p.decoded?.hex||'') + ' ' + (p.decoded?.str||'')).toLowerCase().includes(q)
    );
  }
}

function _renderPacketList() {
  const tbody = document.getElementById('ws-pkt-tbody');
  if (!tbody) return;
  const packets = _capture.filtered;
  // Only render the last visible rows (virtual scroll: show last 200)
  const visible = packets.slice(-200);
  // Only re-render if new packets arrived (check length)
  if (tbody._lastLen === visible.length && tbody._lastNo === (visible[visible.length-1]?._no||0)) return;
  tbody._lastLen = visible.length;
  tbody._lastNo = visible[visible.length-1]?._no || 0;

  tbody.innerHTML = '';
  visible.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'ws-pkt-row ws-pkt-' + p.type + (_capture.marked.has(p._no) ? ' ws-pkt-marked' : '');
    if (_capture.selected === p._no) tr.classList.add('ws-pkt-selected');
    const delta = _capture.deltaMode === 'prev' ? p._delta.toFixed(4) : p._relTime.toFixed(3);
    const color = _capture.colorRules[p.type] || '#7a8aaa';
    const srcDisplay = p.srcName ? p.srcName + (p.src && p.src !== 'localhost' && p.src !== '(none)' ? ' [' + p.src + ']' : '') : (p.src || '—');
    const dstDisplay = p.dstName ? p.dstName + (p.dst && p.dst !== 'localhost' && p.dst !== '(none)' ? ' [' + p.dst + ']' : '') : (p.dst || '—');
    tr.innerHTML =
      '<td class="ws-col-no">' + p._no + '</td>' +
      '<td class="ws-col-time">' + delta + '</td>' +
      '<td class="ws-col-addr" title="' + esc(p.src||'') + '">' + esc(srcDisplay) + '</td>' +
      '<td class="ws-col-dir"><span class="ws-dir-badge ws-dir-' + p.dir + '">' + p.dir + '</span></td>' +
      '<td class="ws-col-addr" title="' + esc(p.dst||'') + '">' + esc(dstDisplay) + '</td>' +
      '<td class="ws-col-proto"><span style="color:' + color + '">' + esc(p.type) + '</span></td>' +
      '<td class="ws-col-len">' + p.length + '</td>' +
      '<td class="ws-col-info">' + esc(p.info) + '</td>';
    tr.onclick = () => _selectPacket(p);
    tr.ondblclick = () => { _capture.marked.has(p._no) ? _capture.marked.delete(p._no) : _capture.marked.add(p._no); _renderPacketList(); };
    tbody.appendChild(tr);
  });
  // Auto-scroll to bottom
  const container = tbody.closest('.ws-pkt-list');
  if (container) container.scrollTop = container.scrollHeight;
}

function _selectPacket(pkt) {
  _capture.selected = pkt._no;
  _renderPacketList();
  _renderPacketDetail(pkt);
  _renderHexDump(pkt);
}

function _renderPacketDetail(pkt) {
  const el = document.getElementById('ws-pkt-detail');
  if (!el) return;
  const bytes = pkt.raw ? (pkt.raw instanceof Uint8Array ? pkt.raw : new Uint8Array(pkt.raw)) : new Uint8Array([]);

  let html = '<div class="ws-tree">';

  // Frame info
  html += '<details open class="ws-tree-node">' +
    '<summary class="ws-tree-label ws-tree-frame">Frame ' + pkt._no + ': ' + pkt.length + ' bytes on BLE</summary>' +
    '<div class="ws-tree-children">' +
      _treeField('Arrival Time', pkt.ts.toISOString()) +
      _treeField('Time delta from previous', pkt._delta.toFixed(6) + ' seconds') +
      _treeField('Time since capture start', pkt._relTime.toFixed(6) + ' seconds') +
      _treeField('Frame Length', pkt.length + ' bytes') +
      (_capture.marked.has(pkt._no) ? _treeField('Frame is marked', 'True') : '') +
    '</div></details>';

  // BLE Link Layer (addresses)
  html += '<details open class="ws-tree-node">' +
    '<summary class="ws-tree-label ws-tree-link">BLE Link Layer</summary>' +
    '<div class="ws-tree-children">' +
      _treeField('Source', (pkt.srcName || pkt.src || '?')) +
      _treeField('Source Address', pkt.src || '(unknown)') +
      _treeField('Destination', (pkt.dstName || pkt.dst || '?')) +
      _treeField('Destination Address', pkt.dst || '(unknown)') +
      _treeField('Direction', pkt.dir) +
    '</div></details>';

  // BLE GATT layer
  html += '<details open class="ws-tree-node">' +
    '<summary class="ws-tree-label ws-tree-gatt">Bluetooth Low Energy GATT</summary>' +
    '<div class="ws-tree-children">' +
      _treeField('Operation', pkt.type) +
      _treeField('Characteristic UUID', pkt.uuid || '(none)') +
      _treeField('Characteristic Name', pkt.name || friendlyName(pkt.uuid) || '(unknown)') +
      (pkt.error ? _treeField('Error', pkt.info, 'ws-field-error') : '') +
    '</div></details>';

  // Value decode layer
  if (pkt.decoded && bytes.length) {
    const d = pkt.decoded;
    html += '<details open class="ws-tree-node">' +
      '<summary class="ws-tree-label ws-tree-value">Value Decode (' + bytes.length + ' bytes)</summary>' +
      '<div class="ws-tree-children">' +
        _treeField('Hex', d.hex || '(empty)') +
        (d.str ? _treeField('UTF-8 String', '"' + d.str + '"') : '') +
        (d.key ? _treeField('Key', d.key) : '') +
        (d.num != null ? _treeField('Numeric Value', d.num) : '');

    // Integer interpretations
    if (bytes.length >= 1) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      html += '<details class="ws-tree-node"><summary class="ws-tree-label">Integer Interpretations</summary><div class="ws-tree-children">';
      html += _treeField('uint8', bytes[0]);
      html += _treeField('int8', bytes[0] > 127 ? bytes[0]-256 : bytes[0]);
      if (bytes.length >= 2) {
        html += _treeField('uint16 LE', dv.getUint16(0,true)) + _treeField('uint16 BE', dv.getUint16(0,false));
        html += _treeField('int16 LE', dv.getInt16(0,true)) + _treeField('int16 BE', dv.getInt16(0,false));
      }
      if (bytes.length >= 4) {
        html += _treeField('uint32 LE', dv.getUint32(0,true)) + _treeField('uint32 BE', dv.getUint32(0,false));
        html += _treeField('int32 LE', dv.getInt32(0,true)) + _treeField('int32 BE', dv.getInt32(0,false));
        html += _treeField('float32 LE', dv.getFloat32(0,true).toFixed(6));
      }
      html += '</div></details>';
    }
    html += '</div></details>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function _treeField(label, value, cls) {
  return '<div class="ws-tree-field ' + (cls||'') + '"><span class="ws-field-label">' + esc(label) + ':</span> <span class="ws-field-value">' + esc(String(value)) + '</span></div>';
}

function _renderHexDump(pkt) {
  const el = document.getElementById('ws-pkt-hex');
  if (!el) return;
  const bytes = pkt.raw ? (pkt.raw instanceof Uint8Array ? pkt.raw : new Uint8Array(pkt.raw)) : new Uint8Array([]);
  if (!bytes.length) { el.innerHTML = '<span class="ws-hex-empty">(no data)</span>'; return; }

  let html = '';
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    // Offset
    html += '<span class="ws-hex-offset">' + off.toString(16).padStart(4,'0') + '</span>  ';
    // Hex bytes with grouping (8+8)
    const hexParts = Array.from(chunk).map((b, i) => {
      const cls = 'ws-hex-byte' + (i < 8 ? '' : ' ws-hex-byte-hi');
      return '<span class="' + cls + '">' + b.toString(16).padStart(2,'0') + '</span>';
    });
    // Pad to 16 bytes
    while (hexParts.length < 16) hexParts.push('<span class="ws-hex-byte ws-hex-pad">  </span>');
    html += hexParts.slice(0,8).join(' ') + '  ' + hexParts.slice(8).join(' ') + '  ';
    // ASCII
    html += '<span class="ws-hex-ascii">';
    Array.from(chunk).forEach(b => {
      const ch = b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.';
      const cls = b >= 0x20 && b <= 0x7e ? 'ws-hex-printable' : 'ws-hex-dot';
      html += '<span class="' + cls + '">' + esc(ch) + '</span>';
    });
    html += '</span>\n';
  }
  el.innerHTML = html;
}

function _updateCaptureStats() {
  const el = document.getElementById('ws-stats');
  if (!el) return;
  const total = _capture.packets.length;
  const displayed = _capture.filtered.length;
  const elapsed = _capture.startTime ? ((performance.now() - _capture.startTime)/1000).toFixed(1) : '0.0';
  const rate = _capture.startTime && total > 1 ? (total / ((performance.now() - _capture.startTime)/1000)).toFixed(1) : '0.0';
  const marked = _capture.marked.size;
  const byType = {};
  _capture.packets.forEach(p => { byType[p.type] = (byType[p.type]||0) + 1; });
  const breakdown = Object.entries(byType).map(([t,c]) => t+':'+c).join('  ');
  el.innerHTML =
    '<span class="ws-stat">Packets: <b>' + displayed + '</b>' + (displayed !== total ? ' / ' + total : '') + '</span>' +
    '<span class="ws-stat">Time: <b>' + elapsed + 's</b></span>' +
    '<span class="ws-stat">Rate: <b>' + rate + ' pkt/s</b></span>' +
    (marked ? '<span class="ws-stat">Marked: <b>' + marked + '</b></span>' : '') +
    '<span class="ws-stat-breakdown">' + breakdown + '</span>';
}

function _wsFilterApply() {
  const input = document.getElementById('ws-filter-input');
  if (input) _capture.filter = input.value;
  _applyFilter();
  _renderPacketList();
  // Color the filter bar
  const bar = document.getElementById('ws-filter-bar');
  if (bar) {
    bar.className = 'ws-filter-bar' + (_capture.filter ? (_capture.filtered.length ? ' ws-filter-match' : ' ws-filter-nomatch') : '');
  }
}

function _wsClearCapture() {
  _capture.packets = [];
  _capture.filtered = [];
  _capture.selected = -1;
  _capture.marked.clear();
  _capture.startTime = null;
  _capture.followChar = null;
  const tbody = document.getElementById('ws-pkt-tbody');
  if (tbody) { tbody.innerHTML = ''; tbody._lastLen = 0; }
  const detail = document.getElementById('ws-pkt-detail');
  if (detail) detail.innerHTML = '<span class="ws-hex-empty">Select a packet to inspect</span>';
  const hex = document.getElementById('ws-pkt-hex');
  if (hex) hex.innerHTML = '';
  _updateCaptureStats();
}

function _wsToggleCapture() {
  _capture.running = !_capture.running;
  const btn = document.getElementById('ws-capture-toggle');
  if (btn) {
    btn.textContent = _capture.running ? '⏸ Stop' : '▶ Start';
    btn.className = 'button btn-sm' + (_capture.running ? ' fire-btn' : ' primary');
  }
}

function _wsFollowChar(uuid) {
  _capture.followChar = _capture.followChar === uuid ? null : uuid;
  const btn = document.getElementById('ws-follow-btn');
  if (btn) btn.textContent = _capture.followChar ? '✕ Unfollow' : '⟿ Follow';
  _wsFilterApply();
}

function _wsToggleDelta() {
  _capture.deltaMode = _capture.deltaMode === 'prev' ? 'first' : 'prev';
  const btn = document.getElementById('ws-delta-btn');
  if (btn) btn.textContent = _capture.deltaMode === 'prev' ? 'Δt prev' : 'Δt start';
  _renderPacketList();
}

function _wsExportCapture() {
  const data = {
    captureInfo: { startTime: _capture.startTime ? new Date(_capture.startTime).toISOString() : null, totalPackets: _capture.packets.length },
    packets: _capture.filtered.map(p => ({
      no: p._no, time: p.ts.toISOString(), delta: p._delta, relTime: p._relTime,
      dir: p.dir, src: p.src, dst: p.dst, srcName: p.srcName, dstName: p.dstName,
      type: p.type, uuid: p.uuid, name: p.name, length: p.length,
      info: p.info, marked: _capture.marked.has(p._no),
      hex: p.decoded?.hex || '', str: p.decoded?.str || '',
      raw: p.raw ? Array.from(p.raw instanceof Uint8Array ? p.raw : new Uint8Array(p.raw)) : [],
    })),
  };
  const json = JSON.stringify(data, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], {type:'application/json'}));
  a.download = 'ble_capture_' + Date.now() + '.json';
  a.click();
  log('📸 Exported ' + data.packets.length + ' packets (' + (json.length/1024).toFixed(1) + ' KB)', 'success');
}

/* ═══════════════════════════════════
   CONNECTION TIMELINE
   ═══════════════════════════════════ */
function _timelineEvent(event, detail, type) {
  const entry = { ts: new Date(), event, detail: detail||'', type: type||'info' };
  _debug.timeline.push(entry);
  if (_debug.timeline.length > 200) _debug.timeline.shift();
  _renderTimeline();
}

function _renderTimeline() {
  const el = document.getElementById('timelineBody');
  if (!el) return;
  el.innerHTML = '';
  const recent = _debug.timeline.slice(-30).reverse();
  recent.forEach(e => {
    const row = document.createElement('div');
    row.className = 'tl-entry tl-' + e.type;
    const t = e.ts.toLocaleTimeString() + '.' + String(e.ts.getMilliseconds()).padStart(3,'0');
    row.innerHTML = '<span class="tl-time">' + t + '</span>' +
      '<span class="tl-dot"></span>' +
      '<span class="tl-event">' + esc(e.event) + '</span>' +
      (e.detail ? '<span class="tl-detail">' + esc(e.detail) + '</span>' : '');
    el.appendChild(row);
  });
}

/* ═══════════════════════════════════
   PACKET INSPECTOR (click value to see full decode)
   ═══════════════════════════════════ */
function _showPacketInspector(msg) {
  const bytes = msg.raw instanceof Uint8Array ? msg.raw : msg.raw ? new Uint8Array(msg.raw) : new Uint8Array([]);
  if (!bytes.length) return;
  const cName = friendlyName(msg.characteristic) || msg.characteristic?.slice(0,8) || '?';

  // Build hex dump (16 bytes per line, offset + hex + ASCII)
  let hexDump = '';
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    const hexPart = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join(' ');
    const asciiPart = Array.from(chunk).map(b => b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.').join('');
    hexDump += String(off).padStart(4,'0') + '  ' + hexPart.padEnd(48) + '  ' + asciiPart + '\n';
  }

  // All possible integer interpretations
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let intTable = '';
  if (bytes.length >= 1) intTable += 'uint8:  ' + bytes[0] + '  |  int8:  ' + (bytes[0] > 127 ? bytes[0]-256 : bytes[0]) + '\n';
  if (bytes.length >= 2) intTable += 'uint16 LE: ' + dv.getUint16(0,true) + '  |  BE: ' + dv.getUint16(0,false) + '\n'
    + 'int16  LE: ' + dv.getInt16(0,true) + '  |  BE: ' + dv.getInt16(0,false) + '\n';
  if (bytes.length >= 4) intTable += 'uint32 LE: ' + dv.getUint32(0,true) + '  |  BE: ' + dv.getUint32(0,false) + '\n'
    + 'int32  LE: ' + dv.getInt32(0,true) + '  |  BE: ' + dv.getInt32(0,false) + '\n'
    + 'float32 LE: ' + dv.getFloat32(0,true).toFixed(6) + '  |  BE: ' + dv.getFloat32(0,false).toFixed(6) + '\n';

  // Binary representation
  const binStr = Array.from(bytes).map(b => b.toString(2).padStart(8,'0')).join(' ');

  // UTF-8 string
  let utf8 = '';
  try { utf8 = new TextDecoder().decode(bytes); } catch {}

  // Diff vs previous
  const charId = (msg.characteristic||'').replace(/[^a-zA-Z0-9]/g,'');
  const prev = _debug.prevValues[charId];
  let diffHtml = '';
  if (prev && prev.length === bytes.length) {
    const changed = [];
    for (let i = 0; i < bytes.length; i++) {
      if (prev[i] !== bytes[i]) changed.push('byte[' + i + ']: ' + prev[i].toString(16).padStart(2,'0') + ' → ' + bytes[i].toString(16).padStart(2,'0'));
    }
    diffHtml = changed.length ? changed.join(', ') : '(no change)';
  } else if (prev) {
    diffHtml = 'length changed: ' + prev.length + ' → ' + bytes.length;
  }

  // Latency info
  const latencies = _debug.latencyLog[charId];
  let latencyInfo = '';
  if (latencies && latencies.length) {
    const last = latencies[latencies.length - 1];
    const avg = (latencies.reduce((a,b) => a+b, 0) / latencies.length).toFixed(1);
    latencyInfo = 'Last: ' + last + 'ms  |  Avg: ' + avg + 'ms  (' + latencies.length + ' samples)';
  }

  // Show modal
  let modal = document.getElementById('packetInspector');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'packetInspector';
    modal.className = 'pkt-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="pkt-modal">' +
    '<div class="pkt-header"><span>Packet Inspector — ' + esc(cName) + '</span><button class="btn-icon-only" onclick="document.getElementById(\'packetInspector\').style.display=\'none\'">✕</button></div>' +
    '<div class="pkt-body">' +
      '<div class="pkt-section"><div class="pkt-label">UUID</div><div class="pkt-mono">' + esc(msg.characteristic||'') + '</div></div>' +
      '<div class="pkt-section"><div class="pkt-label">Hex Dump (' + bytes.length + ' bytes)</div><pre class="pkt-mono">' + esc(hexDump) + '</pre></div>' +
      '<div class="pkt-section"><div class="pkt-label">Binary</div><div class="pkt-mono pkt-wrap">' + esc(binStr) + '</div></div>' +
      '<div class="pkt-section"><div class="pkt-label">Integer Interpretations</div><pre class="pkt-mono">' + esc(intTable) + '</pre></div>' +
      '<div class="pkt-section"><div class="pkt-label">UTF-8 String</div><div class="pkt-mono">"' + esc(utf8) + '"</div></div>' +
      (diffHtml ? '<div class="pkt-section"><div class="pkt-label">Diff vs Previous</div><div class="pkt-mono pkt-diff">' + esc(diffHtml) + '</div></div>' : '') +
      (latencyInfo ? '<div class="pkt-section"><div class="pkt-label">Read Latency</div><div class="pkt-mono">' + esc(latencyInfo) + '</div></div>' : '') +
    '</div>' +
    '<div class="pkt-footer"><button class="button btn-sm" onclick="_copyInspectorText()">📋 Copy All</button></div>' +
  '</div>';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

function _copyInspectorText() {
  const body = document.querySelector('.pkt-body');
  if (body) navigator.clipboard.writeText(body.innerText).then(() => showToast('Copied!', 1500));
}

/* ═══════════════════════════════════
   DATA RATE MONITOR
   ═══════════════════════════════════ */
function _trackDataRate(charId, byteCount) {
  if (!_debug.dataRate[charId]) _debug.dataRate[charId] = { count:0, bytes:0, lastReset: Date.now(), history:[] };
  const dr = _debug.dataRate[charId];
  dr.count++;
  dr.bytes += byteCount;
  const elapsed = Date.now() - dr.lastReset;
  if (elapsed >= DATA_RATE_WINDOW) {
    dr.history.push({ rate: (dr.count / elapsed * 1000).toFixed(1), bps: (dr.bytes / elapsed * 1000).toFixed(0) });
    if (dr.history.length > 20) dr.history.shift();
    dr.count = 0; dr.bytes = 0; dr.lastReset = Date.now();
  }
}

function _getDataRate(charId) {
  const dr = _debug.dataRate[charId];
  if (!dr) return null;
  const elapsed = Math.max(1, Date.now() - dr.lastReset);
  return { nps: (dr.count / elapsed * 1000).toFixed(1), bps: (dr.bytes / elapsed * 1000).toFixed(0) };
}

/* ═══════════════════════════════════
   READ LATENCY
   ═══════════════════════════════════ */
function _startLatencyTimer(charUuid) {
  const charId = charUuid.replace(/[^a-zA-Z0-9]/g,'');
  _debug.pendingReads[charId] = performance.now();
}

function _stopLatencyTimer(charUuid) {
  const charId = charUuid.replace(/[^a-zA-Z0-9]/g,'');
  const start = _debug.pendingReads[charId];
  if (!start) return null;
  delete _debug.pendingReads[charId];
  const ms = Math.round(performance.now() - start);
  if (!_debug.latencyLog[charId]) _debug.latencyLog[charId] = [];
  _debug.latencyLog[charId].push(ms);
  if (_debug.latencyLog[charId].length > 50) _debug.latencyLog[charId].shift();
  return ms;
}

/* ═══════════════════════════════════
   DEBUG SNAPSHOT EXPORT
   ═══════════════════════════════════ */
function exportDebugSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    wsConnected: ble.wsConnected,
    backendURL: (document.getElementById('backendURL')||{}).value,
    watchMode: ble.watchMode,
    chartPoints: ble.chartData.length,
    stats: { ...ble.stats, avg: ble.stats.count ? (ble.stats.sum/ble.stats.count).toFixed(2) : null },
    timeline: _debug.timeline.map(e => ({ ts: e.ts.toISOString(), event: e.event, detail: e.detail, type: e.type })),
    dataRates: Object.fromEntries(Object.entries(_debug.dataRate).map(([k,v]) => {
      const r = _getDataRate(k);
      return [k, { notifPerSec: r?.nps, bytesPerSec: r?.bps, totalPackets: v.count + v.history.reduce((a,h) => a + parseFloat(h.rate), 0) }];
    })),
    latency: Object.fromEntries(Object.entries(_debug.latencyLog).map(([k,v]) => {
      const avg = v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
      const max = v.length ? Math.max(...v) : null;
      return [k, { samples: v.length, avgMs: avg, maxMs: max, recent: v.slice(-10) }];
    })),
    services: _discoveredServices.map(s => ({
      uuid: s.uuid, name: friendlyName(s.uuid),
      chars: (s.characteristics||[]).map(c => ({ uuid: c.uuid, name: friendlyName(c.uuid), props: c.properties }))
    })),
    chartSeries: Object.keys(_chartSeries),
    errors: _debug.timeline.filter(e => e.type === 'error').slice(-20),
  };
  const json = JSON.stringify(snapshot, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], {type:'application/json'}));
  a.download = 'ble_debug_' + Date.now() + '.json';
  a.click();
  log('📸 Debug snapshot exported (' + (json.length/1024).toFixed(1) + ' KB)', 'success');
}

/* ═══════════════════════════════════
   WEBSOCKET
   ═══════════════════════════════════ */
let _wsRetries = 0;
const _WS_FALLBACK_PORTS = [8000, 8001, 8002]; // common backend ports

function wsConnect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const customUrl = (document.getElementById('backendURL')||{}).value;
  // If custom URL is set and differs from default, use it directly
  const defaultUrl = proto + '//' + location.host + '/ws';
  const url = customUrl && customUrl !== 'ws://localhost:8000/ws' ? customUrl : defaultUrl;
  if (ble.ws && ble.ws.readyState < 2) return;
  try {
    ble.ws = new WebSocket(url);
    ble.ws.onopen = () => {
      ble.wsConnected=true; _wsRetries=0;
      _timelineEvent('WS Connected', url, 'success');
      log('🔌 Backend connected ('+url+')','success');
      wsSend({type:'hello',version:'1.0'});
    };
    ble.ws.onclose = () => {
      ble.wsConnected=false;
      _wsRetries++;
      _timelineEvent('WS Disconnected', 'retry #'+_wsRetries, 'error');
      // After 2 failures on current host, try fallback ports
      if (_wsRetries >= 2) {
        const hostname = location.hostname || 'localhost';
        const currentPort = parseInt(location.port) || 80;
        const fallback = _WS_FALLBACK_PORTS.find(p => p !== currentPort);
        if (fallback && _wsRetries <= 4) {
          const fallbackUrl = proto + '//' + hostname + ':' + fallback + '/ws';
          log('⚠️ Port mismatch? Trying backend on :'+fallback+'…','error');
          setTimeout(() => _wsConnectTo(fallbackUrl), 1000);
          return;
        }
      }
      log('⚠️ Backend disconnected — retrying…','error');
      setTimeout(wsConnect, 3000);
    };
    ble.ws.onerror = () => {};
    ble.ws.onmessage = (ev) => wsHandle(JSON.parse(ev.data));
  } catch(e) { log('WS init failed: '+e.message,'error'); }
}

function _wsConnectTo(url) {
  try {
    ble.ws = new WebSocket(url);
    ble.ws.onopen = () => {
      ble.wsConnected=true; _wsRetries=0;
      log('🔌 Backend connected ('+url+')','success');
      // Update the backendURL field so subsequent reconnects use this URL
      const field = document.getElementById('backendURL');
      if (field) field.value = url;
      wsSend({type:'hello',version:'1.0'});
    };
    ble.ws.onclose = () => { ble.wsConnected=false; _wsRetries++; setTimeout(wsConnect, 3000); };
    ble.ws.onerror = () => {};
    ble.ws.onmessage = (ev) => wsHandle(JSON.parse(ev.data));
  } catch(e) { setTimeout(wsConnect, 3000); }
}

function wsSend(obj) {
  if (ble.ws && ble.ws.readyState===1) {
    ble.ws.send(JSON.stringify(obj)); log('TX → '+obj.type,'tx');
    _macroCapture(obj);
    if (obj.type === 'read' && obj.characteristic) _startLatencyTimer(obj.characteristic);
    // Capture TX packets
    _capturePacket({
      dir:'TX', type:obj.type, uuid:obj.characteristic||'',
      name: friendlyName(obj.characteristic) || obj.name || '',
      raw: obj.value ? new Uint8Array(obj.value) : null,
      info: obj.type === 'write' ? (obj.value?.length||0)+' bytes' : obj.type === 'scan' ? 'duration='+obj.duration+'s' : '',
    });
  }
}

function wsHandle(msg) {
  // Verbose RX logging per type
  switch(msg.type) {
    case 'scan_result': {
      const devs = msg.devices||[];
      const named = devs.filter(d => d.name && d.name !== '(unknown)');
      log('RX ← scan_result: '+devs.length+' device(s)' + (named.length ? ' — named: '+named.map(d=>d.name).join(', ') : ''),'rx');
      renderDeviceList(devs); toggleScanBtns(false); hideToast();
      break;
    }
    case 'notify':
    case 'read_result':
      // logged in showReadResult with full details
      showReadResult(msg);
      break;
    case 'connected':
      _capture.remoteAddr = msg.address || null;
      _capture.remoteName = msg.name || '';
      _updateConnInfo(msg);
      log('RX ← connected: '+msg.name+' ['+msg.address+']' + (msg.mtu ? ' MTU:'+msg.mtu : ''),'rx');
      _timelineEvent('Connected', msg.name+' ['+msg.address+']' + (msg.mtu ? ' MTU:'+msg.mtu : ''), 'success');
      _capturePacket({dir:'RX',type:'connect',name:msg.name,info:msg.name+' ['+msg.address+']' + (msg.mtu ? ' MTU:'+msg.mtu : '')});
      onConnected(msg.name||msg.address);
      // Request connection info
      setTimeout(() => wsSend({type:'conn_info'}), 500);
      break;
    case 'disconnected':
      log('RX ← disconnected','rx');
      _timelineEvent('Disconnected', '', 'error');
      _capturePacket({dir:'RX',type:'connect',info:'Disconnected'});
      _capture.remoteAddr = null;
      _capture.remoteName = null;
      onDisconnected();
      break;
    case 'services': {
      _logServices(msg.services||[]);
      const sc = msg.services||[];
      const tc = sc.reduce((n,s) => n+(s.characteristics||[]).length, 0);
      _timelineEvent('Services', sc.length+' svc, '+tc+' chars', 'info');
      populateServices(sc);
      break;
    }
    case 'characteristics':
      populateChars(msg.characteristics||[]);
      break;
    case 'subscribed': {
      const sName = friendlyName(msg.characteristic) || msg.characteristic?.slice(0,8);
      log('RX ← subscribed: '+sName+' ['+msg.characteristic+']','rx');
      _timelineEvent('Subscribed', sName, 'success');
      _capturePacket({dir:'RX',type:'subscribe',uuid:msg.characteristic,name:sName,info:'Subscribed'});
      break;
    }
    case 'unsubscribed': {
      const uName = friendlyName(msg.characteristic) || msg.characteristic?.slice(0,8);
      log('RX ← unsubscribed: '+uName,'rx');
      _timelineEvent('Unsubscribed', uName, 'info');
      _capturePacket({dir:'RX',type:'subscribe',uuid:msg.characteristic,name:uName,info:'Unsubscribed'});
      break;
    }
    case 'write_ok': {
      const wName = friendlyName(msg.characteristic)||msg.characteristic?.slice(0,8);
      log('RX ← write_ok: '+wName+' ('+msg.bytes+' bytes)','rx');
      _timelineEvent('Write OK', wName+' ('+msg.bytes+'B)', 'success');
      _capturePacket({dir:'RX',type:'write',uuid:msg.characteristic,name:wName,info:'Write OK ('+msg.bytes+'B)'});
      break;
    }
    case 'conn_info':
      _updateConnInfo(msg);
      _renderConnInfoPanel(msg);
      log('RX ← conn_info: MTU='+(msg.mtu||'?')+' subs='+((msg.subscribed||[]).length),'rx');
      break;
    case 'descriptors': {
      const dCharName = friendlyName(msg.characteristic)||msg.characteristic?.slice(0,8);
      log('RX ← descriptors for '+dCharName+': '+(msg.descriptors||[]).length+' descriptor(s)','rx');
      (msg.descriptors||[]).forEach(d => {
        log('    ├─ '+d.description+' ['+d.uuid+']'+(d.hex ? ' = '+d.hex : ''),'info');
      });
      _showDescriptorsInline(msg.characteristic, msg.descriptors||[]);
      break;
    }
    case 'error':
      log('⚠️ '+msg.message,'error');
      _timelineEvent('Error', msg.message, 'error');
      _capturePacket({dir:'RX',type:'error',info:msg.message,error:true});
      break;
    default:
      log('RX ← '+(msg.type||'?'),'rx');
  }
}

function _logServices(services) {
  const totalChars = services.reduce((n,s) => n + (s.characteristics||[]).length, 0);
  log('RX ← services: '+services.length+' service(s), '+totalChars+' characteristic(s)','rx');
  services.forEach(svc => {
    const svcName = friendlyName(svc.uuid) || svc.description || svc.uuid.slice(0,8);
    const chars = svc.characteristics || [];
    log('  📦 '+svcName+' ('+chars.length+' chars) — '+svc.uuid,'info');
    chars.forEach(c => {
      const cName = friendlyName(c.uuid) || c.description || c.uuid.slice(0,8);
      const props = (c.properties||[]).join(', ');
      log('    ├─ '+cName+' ['+props+'] — '+c.uuid,'info');
    });
  });
}

/* ═══════════════════════════════════
   SCAN
   ═══════════════════════════════════ */
let _scanTimer = null;

async function bleScan() {
  toggleScanBtns(true);
  showToast('Scanning…',0);
  _doScan();
}

function _doScan() {
  const nameFilter = (document.getElementById('deviceNameFilter')||{}).value||'';
  const rssiMin    = parseInt((document.getElementById('rssiFilter')||{}).value||'-90',10);
  wsSend({type:'scan', duration:4, name_filter:nameFilter, rssi_min:rssiMin});
  // Continuous scan — re-scan every 5s until stopped
  _scanTimer = setTimeout(() => {
    if (document.getElementById('stopScanBtn').style.display !== 'none') _doScan();
  }, 5000);
}

function bleStopScan() {
  clearTimeout(_scanTimer); _scanTimer = null;
  toggleScanBtns(false); hideToast();
  wsSend({type:'scan_stop'});
  log('⛔ Scan stopped','info');
}

function toggleScanBtns(scanning) {
  const s=document.getElementById('scanBtn'), t=document.getElementById('stopScanBtn');
  if(s) s.style.display = scanning?'none':'';
  if(t) t.style.display = scanning?'':'none';
}

/* ═══════════════════════════════════
   DEVICE LIST
   ═══════════════════════════════════ */
const _reg = {};   // index → device object
let   _idx = 0;
let   _showAllDevices = true;
const MAX_VISIBLE_DEVICES = 5;

/* Get vendor name from a device's advertisement data */
function _deviceVendor(d) {
  if (d.adv && d.adv.manufacturer_data) {
    const ids = Object.keys(d.adv.manufacturer_data);
    if (ids.length) {
      const name = _companyName(parseInt(ids[0]));
      if (name) return name;
    }
  }
  // Derive from device name
  if (d.name && d.name !== '(unknown)') {
    const n = d.name.toLowerCase();
    if (n.includes('samsung')) return 'Samsung';
    if (n.includes('micro:bit')) return 'BBC micro:bit';
  }
  return null;
}

/* ═══════════════════════════════════
   DEVICE HISTORY & FAVORITES
   ═══════════════════════════════════ */
const _deviceHistory = new Map(); // address → {device, firstSeen, lastSeen}
const _favorites = new Set(JSON.parse(localStorage.getItem('ble-favorites') || '[]'));

function toggleFavorite(address) {
  if (_favorites.has(address)) _favorites.delete(address);
  else _favorites.add(address);
  localStorage.setItem('ble-favorites', JSON.stringify([..._favorites]));
  renderDeviceList(); // re-render to update stars and sort order
}

function _updateHistory(devices) {
  const now = Date.now();
  devices.forEach(d => {
    const addr = d.address || d.id;
    if (!addr) return;
    const existing = _deviceHistory.get(addr);
    if (existing) {
      existing.device = d;
      existing.lastSeen = now;
    } else {
      _deviceHistory.set(addr, { device: d, firstSeen: now, lastSeen: now });
    }
  });
  // Update badge
  const badge = document.getElementById('historyBadge');
  if (badge) {
    badge.textContent = _deviceHistory.size + ' seen';
    badge.style.display = '';
  }
}

/* Keep track of last rendered devices for re-render on filter change */
let _lastDevices = [];

function renderDeviceList(devices) {
  const list = document.getElementById('deviceList');
  if (!list) return;
  if (devices) _lastDevices = devices;
  else devices = _lastDevices;

  // Track device history
  if (devices.length) _updateHistory(devices);

  const hideUnknown = (document.getElementById('hideUnknownChk') || {}).checked;

  if (!devices.length) { list.innerHTML='<div class="ble-empty">No devices found.</div>'; return; }

  // Filter unknown if checkbox is checked
  let filtered = hideUnknown
    ? devices.filter(d => d.name && d.name !== '(unknown)')
    : devices;

  if (!filtered.length) { list.innerHTML='<div class="ble-empty">All devices hidden by filter.</div>'; return; }

  // Sort: favorites first, then by RSSI (strongest first)
  filtered.sort((a,b) => {
    const aFav = _favorites.has(a.address||a.id) ? 1 : 0;
    const bFav = _favorites.has(b.address||b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (b.rssi||-999) - (a.rssi||-999);
  });

  // Group by vendor
  const groups = {};
  filtered.forEach(d => {
    const vendor = _deviceVendor(d) || 'Unknown';
    if (!groups[vendor]) groups[vendor] = [];
    groups[vendor].push(d);
  });

  // Order groups: named vendors alphabetically, "Unknown" last
  const vendorNames = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return a.localeCompare(b);
  });

  list.innerHTML = '';

  const vendorColors = {
    'Apple': '#a1a1aa', 'Samsung': '#3b82f6', 'Microsoft': '#22d3ee',
    'Google': '#f97316', 'BBC micro:bit': '#fbbf24', 'Nordic Semiconductor': '#38bdf8',
    'Xiaomi': '#fb923c', 'Huawei': '#ef4444', 'Amazon': '#f59e0b',
    'Espressif': '#a78bfa', 'Intel': '#60a5fa', 'Qualcomm': '#e879f9',
    'Texas Instruments': '#34d399', 'Garmin': '#4ade80', 'Unknown': '#6b7280',
  };

  vendorNames.forEach(vendor => {
    const devs = groups[vendor];
    const vColor = vendorColors[vendor] || 'var(--accent)';
    const details = document.createElement('details');
    details.className = 'collapsible vendor-group';
    details.open = true;
    details.style.setProperty('--vendor-color', vColor);

    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="icon">${vendor === 'Unknown' ? '❓' : '📱'}</span> ${esc(vendor)} <span class="badge"><strong>${devs.length}</strong></span>`;
    details.appendChild(summary);

    const groupBody = document.createElement('div');
    groupBody.className = 'vendor-group-body';

    devs.forEach(d => {
      const i      = _idx++;
      _reg[i]      = d;
      const rssi   = d.rssi!=null ? d.rssi : '—';
      const bars   = d.rssi!=null ? rssiToBars(d.rssi) : '░░░░';
      const color  = d.rssi!=null ? rssiColor(d.rssi) : 'var(--text-dim)';

      const row = document.createElement('div');
      row.className = 'ble-device-row';

      const rssiHist = d.rssi_history || [d.rssi || -100];
      const sparkSvg = _rssiSparkline(rssiHist);
      const advSummary = d.adv ? _advSummaryLine(d.adv) : '';

      const addr = d.address||d.id||'';
      const isFav = _favorites.has(addr);
      row.innerHTML = `
        <button class="ble-fav-btn ${isFav?'fav-active':''}" onclick="event.stopPropagation();toggleFavorite('${esc(addr)}')" title="Favorite">${isFav?'★':'☆'}</button>
        <div style="flex:1;min-width:0">
          <div class="ble-device-name">${esc(d.name||'(unknown)')}</div>
          <div class="ble-device-addr">${esc(addr)}</div>
          ${advSummary ? '<div class="nrf-adv-summary">' + advSummary + '</div>' : ''}
        </div>
        <div class="nrf-rssi-col">
          <div class="nrf-rssi-spark">${sparkSvg}</div>
          <div class="ble-rssi" style="color:${color}" title="${rssi} dBm">${bars} ${rssi}</div>
        </div>`;

      if (d.adv && Object.keys(d.adv).length) {
        const advBtn = document.createElement('button');
        advBtn.className = 'button btn-sm nrf-adv-btn';
        advBtn.textContent = 'ADV';
        advBtn.title = 'View advertisement data';
        advBtn.onclick = (e) => { e.stopPropagation(); _showAdvDataModal(d); };
        row.appendChild(advBtn);
      }

      const btn = document.createElement('button');
      btn.className='button btn-sm primary';
      btn.textContent = '🔗 Connect';
      btn.onclick = (e) => { e.stopPropagation(); bleConnectDevice(_reg[i]); };
      row.onclick = () => bleConnectDevice(_reg[i]);
      row.appendChild(btn);
      groupBody.appendChild(row);
    });

    details.appendChild(groupBody);
    list.appendChild(details);
  });

  // Update radar if active
  if (_radarMode) renderRadarBlips(devices);

  // Verbose device log
  const named = devices.filter(d => d.name && d.name !== '(unknown)');
  log('📡 '+devices.length+' device(s) found' + (named.length ? ' — '+named.length+' named' : ''),'success');
  named.forEach(d => {
    log('  📱 '+d.name+' ['+d.address+'] '+rssiToBars(d.rssi)+' '+d.rssi+' dBm','info');
  });
}

/* ═══════════════════════════════════
   RADAR VIEW
   ═══════════════════════════════════ */

let _radarMode = false;

function toggleRadarView() {
  _radarMode = !_radarMode;
  const list = document.getElementById('deviceList');
  const radar = document.getElementById('radarView');
  const btn = document.getElementById('radarToggleBtn');
  const proxBtn = document.getElementById('proxSoundBtn');
  if (list) list.style.display = _radarMode ? 'none' : '';
  if (radar) radar.style.display = _radarMode ? '' : 'none';
  if (btn) btn.classList.toggle('active', _radarMode);
  if (proxBtn) proxBtn.style.display = _radarMode ? '' : 'none';
  if (!_radarMode) {
    // Hide radar detail and stop proximity sound when leaving radar
    const detail = document.getElementById('radarDetail');
    if (detail) detail.style.display = 'none';
    if (_proxSoundActive) toggleProximitySound();
  }
  if (_radarMode && _lastDevices.length) renderRadarBlips(_lastDevices);
  playSound('click');
}

function _hashAngle(addr) {
  // Deterministic angle from device address so blips don't jump on rescan
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

function _rssiToRadius(rssi) {
  // Map RSSI to 0..1 where 0=center, 1=edge
  // -30 dBm → 0.05 (very close), -100 dBm → 0.92 (far edge)
  const clamped = Math.max(-100, Math.min(-30, rssi || -100));
  return 0.05 + ((clamped + 30) / -70) * 0.87;
}

function renderRadarBlips(devices) {
  const container = document.getElementById('radarBlips');
  if (!container) return;

  const hideUnknown = (document.getElementById('hideUnknownChk') || {}).checked;
  let filtered = hideUnknown
    ? devices.filter(d => d.name && d.name !== '(unknown)')
    : devices;

  container.innerHTML = '';

  const vendorColors = {
    'Apple': '#a1a1aa', 'Samsung': '#3b82f6', 'Microsoft': '#22d3ee',
    'Google': '#f97316', 'BBC micro:bit': '#fbbf24', 'Nordic Semiconductor': '#38bdf8',
    'Xiaomi': '#fb923c', 'Huawei': '#ef4444', 'Amazon': '#f59e0b',
    'Espressif': '#a78bfa', 'Intel': '#60a5fa', 'Qualcomm': '#e879f9',
    'Texas Instruments': '#34d399', 'Garmin': '#4ade80', 'Unknown': '#6b7280',
  };

  filtered.forEach((d, idx) => {
    const addr = d.address || d.id || String(idx);
    const angle = _hashAngle(addr) * (Math.PI / 180);
    const radius = _rssiToRadius(d.rssi);
    const rssi = d.rssi || -100;

    // Convert polar to % position (center is 50%,50%)
    const x = 50 + radius * 50 * Math.cos(angle);
    const y = 50 + radius * 50 * Math.sin(angle);

    // Determine dot size by signal strength
    let dotClass = 'ble-radar-dot';
    if (rssi > -50) dotClass += ' dot-strong';
    else if (rssi < -75) dotClass += ' dot-weak';

    // Proximity color based on RSSI
    let proxColor;
    if (rssi > -50) proxColor = '#22c55e';
    else if (rssi >= -70) proxColor = '#eab308';
    else if (rssi >= -85) proxColor = '#f97316';
    else proxColor = '#ef4444';

    // Get vendor color for outline ring
    const vendor = _deviceVendor(d) || 'Unknown';
    const vendorColor = vendorColors[vendor] || 'var(--accent)';

    const name = d.name && d.name !== '(unknown)'
      ? d.name.replace(/^\[.*?\]\s*/, '').substring(0, 14)
      : '?';

    const blip = document.createElement('div');
    blip.className = 'ble-radar-blip';
    blip.style.left = x + '%';
    blip.style.top = y + '%';
    blip.style.animationDelay = (idx * 0.08) + 's';
    blip.title = (d.name || 'unknown') + ' — ' + rssi + ' dBm';
    blip.onclick = (e) => { e.stopPropagation(); showRadarDetail(d); };

    blip.innerHTML =
      '<div class="' + dotClass + '" style="background:' + proxColor + ';color:' + proxColor + ';border:2px solid ' + vendorColor + '"></div>' +
      '<div class="ble-radar-blip-name">' + esc(name) + '</div>' +
      '<div class="ble-radar-blip-rssi">' + rssi + '</div>';

    container.appendChild(blip);
  });
}

/* ═══════════════════════════════════
   nRF Connect — RSSI SPARKLINE
   ═══════════════════════════════════ */
function _rssiSparkline(history) {
  if (!history || !history.length) return '';
  const w = 60, h = 20;
  const min = -100, max = -30;
  const points = history.map((v, i) => {
    const x = (i / Math.max(1, history.length - 1)) * w;
    const y = h - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * h;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const lastRssi = history[history.length - 1];
  const color = rssiColor(lastRssi);
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" class="nrf-spark-svg">' +
    '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
}

/* ═══════════════════════════════════
   nRF Connect — ADV DATA SUMMARY
   ═══════════════════════════════════ */
function _advSummaryLine(adv) {
  const parts = [];
  if (adv.tx_power != null) parts.push('TX:' + adv.tx_power + 'dBm');
  if (adv.service_uuids && adv.service_uuids.length) {
    const count = adv.service_uuids.length;
    const first = adv.service_uuids[0].slice(0,8);
    parts.push(count + ' svc' + (count > 1 ? 's' : '') + ' (' + first + '…)');
  }
  if (adv.manufacturer_data) {
    const ids = Object.keys(adv.manufacturer_data);
    ids.forEach(id => {
      const name = _companyName(parseInt(id)) || '0x' + parseInt(id).toString(16).toUpperCase().padStart(4,'0');
      parts.push(name);
    });
  }
  return parts.map(p => '<span class="nrf-adv-tag">' + esc(p) + '</span>').join(' ');
}

/* ═══════════════════════════════════
   nRF Connect — ADV DATA MODAL
   ═══════════════════════════════════ */
function _showAdvDataModal(device) {
  const adv = device.adv || {};
  let html = '<div class="nrf-adv-modal-content">';

  // Device header
  html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Device</div>' +
    '<div class="nrf-adv-value">' + esc(device.name) + ' [' + esc(device.address) + ']</div></div>';

  // RSSI + TX Power
  html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Signal</div>' +
    '<div class="nrf-adv-value">RSSI: ' + (device.rssi||'?') + ' dBm' +
    (adv.tx_power != null ? '  |  TX Power: ' + adv.tx_power + ' dBm  |  Path Loss: ~' + ((adv.tx_power||0) - (device.rssi||0)) + ' dB' : '') +
    '</div></div>';

  // RSSI history graph
  if (device.rssi_history && device.rssi_history.length > 1) {
    html += '<div class="nrf-adv-section"><div class="nrf-adv-label">RSSI History</div>' +
      '<div class="nrf-rssi-graph">' + _rssiGraph(device.rssi_history) + '</div></div>';
  }

  // Service UUIDs
  if (adv.service_uuids && adv.service_uuids.length) {
    html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Advertised Services (' + adv.service_uuids.length + ')</div>';
    adv.service_uuids.forEach(uuid => {
      const name = friendlyName(uuid);
      html += '<div class="nrf-adv-uuid">' + esc(uuid) + (name ? ' <span class="nrf-adv-name">(' + esc(name) + ')</span>' : '') + '</div>';
    });
    html += '</div>';
  }

  // Manufacturer data
  if (adv.manufacturer_data) {
    html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Manufacturer Specific Data</div>';
    Object.entries(adv.manufacturer_data).forEach(([cid, bytes]) => {
      const name = _companyName(parseInt(cid)) || 'Unknown';
      const hex = bytes.map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
      html += '<div class="nrf-adv-mfr">' +
        '<span class="nrf-adv-mfr-name">' + esc(name) + ' (0x' + parseInt(cid).toString(16).toUpperCase().padStart(4,'0') + ')</span>' +
        '<pre class="nrf-adv-hex">' + esc(hex) + '</pre>' +
        '<div class="nrf-adv-decoded">' + _decodeMfrData(parseInt(cid), bytes) + '</div>' +
        '</div>';
    });
    html += '</div>';
  }

  // Service data
  if (adv.service_data) {
    html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Service Data</div>';
    Object.entries(adv.service_data).forEach(([uuid, bytes]) => {
      const name = friendlyName(uuid);
      const hex = bytes.map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
      html += '<div class="nrf-adv-svcdata">' +
        '<span>' + esc(uuid) + (name ? ' (' + esc(name) + ')' : '') + '</span>' +
        '<pre class="nrf-adv-hex">' + esc(hex) + '</pre>' +
        '</div>';
    });
    html += '</div>';
  }

  // Local name
  if (adv.local_name) {
    html += '<div class="nrf-adv-section"><div class="nrf-adv-label">Complete Local Name</div>' +
      '<div class="nrf-adv-value">' + esc(adv.local_name) + '</div></div>';
  }

  html += '</div>';

  // Show modal
  let modal = document.getElementById('advDataModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'advDataModal';
    modal.className = 'pkt-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="pkt-modal nrf-adv-modal">' +
    '<div class="pkt-header"><span>Advertisement Data — ' + esc(device.name) + '</span>' +
    '<button class="btn-icon-only" onclick="document.getElementById(\'advDataModal\').style.display=\'none\'">✕</button></div>' +
    '<div class="pkt-body">' + html + '</div></div>';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

function _rssiGraph(history) {
  const w = 200, h = 50;
  const min = -100, max = -30;
  const points = history.map((v, i) => {
    const x = (i / Math.max(1, history.length - 1)) * w;
    const y = h - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * h;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  // Gradient fill
  const fillPoints = '0,' + h + ' ' + points + ' ' + w + ',' + h;
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#22cc88" stop-opacity="0.3"/>' +
    '<stop offset="100%" stop-color="#22cc88" stop-opacity="0.02"/>' +
    '</linearGradient></defs>' +
    '<polygon points="' + fillPoints + '" fill="url(#rssiGrad)"/>' +
    '<polyline points="' + points + '" fill="none" stroke="#22cc88" stroke-width="2" stroke-linecap="round"/>' +
    '<text x="' + w + '" y="12" text-anchor="end" fill="#7a8aaa" font-size="10">' + history[history.length-1] + ' dBm</text>' +
    '<text x="2" y="' + (h-2) + '" fill="#7a8aaa55" font-size="8">-100</text>' +
    '<text x="2" y="10" fill="#7a8aaa55" font-size="8">-30</text>' +
    '</svg>';
}

/* ═══════════════════════════════════
   nRF Connect — COMPANY ID LOOKUP
   ═══════════════════════════════════ */
function _companyName(id) {
  const companies = {
    0x0059: 'Nordic Semiconductor', 0x004C: 'Apple', 0x0006: 'Microsoft',
    0x000D: 'Texas Instruments', 0x0075: 'Samsung', 0x00E0: 'Google',
    0x0046: 'MediaTek', 0x000A: 'Qualcomm', 0x0002: 'Intel',
    0x0131: 'Cypress', 0x0171: 'Amazon', 0x038F: 'Xiaomi',
    0x0157: 'Huawei', 0x0310: 'Espressif', 0x0822: 'Adafruit',
    0x0077: 'Laird', 0x0087: 'Garmin', 0x00D2: 'Dialog Semi',
    0x02FF: 'BBC micro:bit', 0x0003: 'Broadcom', 0x001D: 'Ericsson',
  };
  return companies[id] || null;
}

/* ═══════════════════════════════════
   nRF Connect — MANUFACTURER DATA DECODER
   ═══════════════════════════════════ */
function _decodeMfrData(companyId, bytes) {
  // Apple iBeacon
  if (companyId === 0x004C && bytes.length >= 23 && bytes[0] === 0x02 && bytes[1] === 0x15) {
    const uuid = Array.from(bytes.slice(2,18)).map(b => b.toString(16).padStart(2,'0')).join('');
    const major = (bytes[18] << 8) | bytes[19];
    const minor = (bytes[20] << 8) | bytes[21];
    const txPow = bytes[22] > 127 ? bytes[22] - 256 : bytes[22];
    return 'iBeacon UUID: ' + uuid.slice(0,8) + '-' + uuid.slice(8,12) + '-' + uuid.slice(12,16) + '-' + uuid.slice(16,20) + '-' + uuid.slice(20) +
      ' Major: ' + major + ' Minor: ' + minor + ' TX: ' + txPow + 'dBm';
  }
  // Eddystone (Google 0x00E0) — not standard mfr data but service data, skip
  // Generic: show ASCII if printable
  const ascii = bytes.filter(b => b >= 0x20 && b <= 0x7e).map(b => String.fromCharCode(b)).join('');
  return ascii.length > 3 ? 'ASCII: "' + esc(ascii) + '"' : '';
}

function rssiToBars(rssi) {
  if (rssi >= -50) return '▓▓▓▓';
  if (rssi >= -60) return '▓▓▓░';
  if (rssi >= -70) return '▓▓░░';
  if (rssi >= -80) return '▓░░░';
  return '░░░░';
}

function rssiColor(rssi) {
  if (rssi >= -50) return '#22cc88';
  if (rssi >= -65) return '#88cc22';
  if (rssi >= -80) return '#ffaa00';
  return '#ff4455';
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ═══════════════════════════════════
   nRF Connect — KNOWN CHARACTERISTIC FORMATTERS
   Auto-format standard BLE values like nRF Connect does
   ═══════════════════════════════════ */
const _charFormatters = {
  // Battery Level (0x2A19) — uint8 percentage
  '00002a19': (bytes) => {
    if (bytes.length >= 1) return { display: bytes[0] + '%', unit: '%', value: bytes[0], icon: '🔋' };
    return null;
  },
  // Heart Rate Measurement (0x2A37)
  '00002a37': (bytes) => {
    if (bytes.length < 2) return null;
    const flags = bytes[0];
    const is16bit = flags & 0x01;
    const hr = is16bit ? (bytes[1] | (bytes[2] << 8)) : bytes[1];
    return { display: hr + ' BPM', unit: 'BPM', value: hr, icon: '❤️' };
  },
  // Temperature Measurement (0x2A1C) — IEEE 11073 FLOAT
  '00002a1c': (bytes) => {
    if (bytes.length < 5) return null;
    const flags = bytes[0];
    const mantissa = bytes[1] | (bytes[2] << 8) | (bytes[3] << 16);
    const exponent = bytes[4] > 127 ? bytes[4] - 256 : bytes[4];
    const temp = (mantissa > 0x7FFFFF ? mantissa - 0x1000000 : mantissa) * Math.pow(10, exponent);
    const unit = flags & 0x01 ? '°F' : '°C';
    return { display: temp.toFixed(1) + unit, unit, value: temp, icon: '🌡️' };
  },
  // Temperature (micro:bit e95d9250) — sint16 / 256
  'e95d9250': (bytes) => {
    if (bytes.length < 1) return null;
    const temp = bytes.length >= 2 ? new DataView(new Uint8Array(bytes).buffer).getInt16(0, true) : bytes[0];
    return { display: temp + '°C', unit: '°C', value: temp, icon: '🌡️' };
  },
  // Accelerometer Data (micro:bit e95dca4b) — 3x int16
  'e95dca4b': (bytes) => {
    if (bytes.length < 6) return null;
    const dv = new DataView(new Uint8Array(bytes).buffer);
    const x = dv.getInt16(0, true), y = dv.getInt16(2, true), z = dv.getInt16(4, true);
    return { display: 'X:'+x+' Y:'+y+' Z:'+z, unit: 'mg', value: Math.sqrt(x*x+y*y+z*z), icon: '📐' };
  },
  // Button State (micro:bit e95dda90, e95dda91) — uint8
  'e95dda90': (bytes) => {
    if (!bytes.length) return null;
    const states = ['Released', 'Pressed', 'Long press'];
    return { display: 'Button A: ' + (states[bytes[0]] || bytes[0]), unit: '', value: bytes[0], icon: '🔘' };
  },
  'e95dda91': (bytes) => {
    if (!bytes.length) return null;
    const states = ['Released', 'Pressed', 'Long press'];
    return { display: 'Button B: ' + (states[bytes[0]] || bytes[0]), unit: '', value: bytes[0], icon: '🔘' };
  },
  // Manufacturer Name (0x2A29) — UTF-8 string
  '00002a29': (bytes) => {
    const s = new TextDecoder().decode(new Uint8Array(bytes));
    return { display: s, unit: '', value: null, icon: '🏭' };
  },
  // Model Number (0x2A24)
  '00002a24': (bytes) => {
    const s = new TextDecoder().decode(new Uint8Array(bytes));
    return { display: s, unit: '', value: null, icon: '📋' };
  },
  // Firmware Revision (0x2A26)
  '00002a26': (bytes) => {
    const s = new TextDecoder().decode(new Uint8Array(bytes));
    return { display: 'FW: ' + s, unit: '', value: null, icon: '💾' };
  },
  // Magnetometer Data (micro:bit e95dd889) — 3x int16
  'e95dd889': (bytes) => {
    if (bytes.length < 6) return null;
    const dv = new DataView(new Uint8Array(bytes).buffer);
    const x = dv.getInt16(0, true), y = dv.getInt16(2, true), z = dv.getInt16(4, true);
    return { display: 'X:'+x+' Y:'+y+' Z:'+z+' μT', unit: 'μT', value: Math.sqrt(x*x+y*y+z*z), icon: '🧭' };
  },
  // Magnetometer Bearing (micro:bit e95db358)
  'e95db358': (bytes) => {
    if (bytes.length < 2) return null;
    const bearing = new DataView(new Uint8Array(bytes).buffer).getUint16(0, true);
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const dir = dirs[Math.round(bearing / 45) % 8];
    return { display: bearing + '° ' + dir, unit: '°', value: bearing, icon: '🧭' };
  },
};

function _formatCharValue(uuid, bytes) {
  const short = (uuid||'').replace(/-.*$/,'').toLowerCase();
  const formatter = _charFormatters[short];
  if (formatter) {
    try { return formatter(bytes); } catch { return null; }
  }
  return null;
}

/* ═══════════════════════════════════
   nRF Connect — CONNECTION INFO PANEL
   ═══════════════════════════════════ */
let _connInfo = {};  // stores MTU, address, etc.

function _updateConnInfo(msg) {
  if (msg.mtu) _connInfo.mtu = msg.mtu;
  _connInfo.address = msg.address || _connInfo.address;
  _connInfo.name = msg.name || _connInfo.name;
  _renderConnInfoBadge();
}

function _renderConnInfoBadge() {
  let badge = document.getElementById('nrf-conn-badge');
  if (!badge) {
    const header = document.querySelector('#mainCard')?.closest('.collapsible')?.querySelector('.card-header') ||
                   document.getElementById('connectedDeviceName')?.parentElement;
    if (!header) return;
    badge = document.createElement('div');
    badge.id = 'nrf-conn-badge';
    badge.className = 'nrf-conn-badge';
    header.appendChild(badge);
  }
  const parts = [];
  if (_connInfo.mtu) parts.push('MTU: ' + _connInfo.mtu);
  if (_connInfo.address) parts.push(_connInfo.address);
  badge.innerHTML = parts.map(p => '<span class="nrf-conn-tag">' + esc(p) + '</span>').join(' ');
  badge.style.display = parts.length ? '' : 'none';
}

function _renderConnInfoPanel(msg) {
  const el = document.getElementById('nrf-conn-info');
  if (!el) return;
  const subs = msg.subscribed || [];
  el.innerHTML =
    '<div class="nrf-ci-grid">' +
      '<div class="nrf-ci-item"><span class="nrf-ci-label">Address</span><span class="nrf-ci-value">' + esc(msg.address||'?') + '</span></div>' +
      '<div class="nrf-ci-item"><span class="nrf-ci-label">MTU</span><span class="nrf-ci-value">' + (msg.mtu||'?') + ' bytes</span></div>' +
      '<div class="nrf-ci-item"><span class="nrf-ci-label">Subscriptions</span><span class="nrf-ci-value">' + subs.length + ' active</span></div>' +
    '</div>' +
    (subs.length ? '<div class="nrf-ci-subs">' + subs.map(u => {
      const name = friendlyName(u) || u.slice(0,8);
      return '<span class="nrf-ci-sub-tag" title="'+esc(u)+'">' + esc(name) + '</span>';
    }).join(' ') + '</div>' : '');
}

/* ═══════════════════════════════════
   nRF Connect — MACRO RECORDER
   Record & replay sequences of BLE operations
   ═══════════════════════════════════ */
const _macro = {
  recording: false,
  steps: [],       // {type, characteristic, value, delay}
  playing: false,
  saved: [],       // [{name, steps}]
};

function _macroRecord() {
  if (_macro.recording) {
    _macro.recording = false;
    log('🎬 Macro recorded: ' + _macro.steps.length + ' steps', 'success');
    _renderMacroUI();
    return;
  }
  _macro.steps = [];
  _macro.recording = true;
  _macro._lastTs = performance.now();
  log('🔴 Macro recording started…', 'info');
  _renderMacroUI();
}

function _macroCapture(msg) {
  if (!_macro.recording) return;
  const now = performance.now();
  const delay = Math.round(now - (_macro._lastTs || now));
  _macro._lastTs = now;
  _macro.steps.push({
    type: msg.type,
    characteristic: msg.characteristic || null,
    value: msg.value || null,
    delay: delay,
  });
}

async function _macroPlay() {
  if (_macro.playing || !_macro.steps.length) return;
  _macro.playing = true;
  log('▶ Playing macro (' + _macro.steps.length + ' steps)…', 'info');
  _renderMacroUI();
  for (const step of _macro.steps) {
    if (!_macro.playing) break;
    if (step.delay > 50) await new Promise(r => setTimeout(r, step.delay));
    wsSend(step);
  }
  _macro.playing = false;
  log('✅ Macro playback complete', 'success');
  _renderMacroUI();
}

function _macroStop() {
  _macro.playing = false;
}

function _macroSave() {
  if (!_macro.steps.length) return;
  const name = 'Macro ' + (_macro.saved.length + 1) + ' (' + _macro.steps.length + ' steps)';
  _macro.saved.push({ name, steps: [..._macro.steps] });
  log('💾 Saved: ' + name, 'success');
  _renderMacroUI();
}

function _macroLoad(idx) {
  const m = _macro.saved[idx];
  if (!m) return;
  _macro.steps = [...m.steps];
  log('📂 Loaded: ' + m.name, 'info');
  _renderMacroUI();
}

function _macroExport() {
  if (!_macro.steps.length) return;
  const json = JSON.stringify({ macro: _macro.steps, saved: _macro.saved }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], {type:'application/json'}));
  a.download = 'ble_macro_' + Date.now() + '.json';
  a.click();
}

function _renderMacroUI() {
  const el = document.getElementById('nrf-macro-body');
  if (!el) return;
  let html = '<div class="nrf-macro-status">';
  if (_macro.recording) html += '<span class="nrf-badge-rec">REC</span> ' + _macro.steps.length + ' steps';
  else if (_macro.playing) html += '<span class="nrf-badge-play">PLAY</span>';
  else html += _macro.steps.length + ' steps recorded';
  html += '</div>';

  if (_macro.saved.length) {
    html += '<div class="nrf-macro-saved">';
    _macro.saved.forEach((m, i) => {
      html += '<div class="nrf-macro-item" onclick="_macroLoad('+i+')">' + esc(m.name) + '</div>';
    });
    html += '</div>';
  }
  el.innerHTML = html;
}

/* ═══════════════════════════════════
   CONNECT / DISCONNECT
   ═══════════════════════════════════ */
async function bleConnectDevice(d) {
  if (ble.multiDevices.length >= 5) { log('Max 5 connections reached','error'); return; }
  // Auto-stop scan when connecting
  if (_scanTimer) bleStopScan();
  showToast('Connecting…',0);
  log('🔗 Connecting to '+(d.name||'(unknown)')+'…','info');
  wsSend({type:'connect', address:d.address||d.id, name:d.name});
}

function onConnected(name) {
  hideToast(); setStatus(true); playSound('success');
  log('✅ Connected to '+name,'success');
  const el=document.getElementById('connectedDeviceName');
  if(el) el.textContent=name;
  ['discoverBtn','disconnectBtn'].forEach(id=>{ const b=document.getElementById(id); if(b) b.disabled=false; });
  // Auto-open Characteristics section on connect
  const explorerDet = document.getElementById('explorerDetails');
  if (explorerDet && !explorerDet.open) explorerDet.open = true;
  // Collapse device list after connecting
  const card = document.getElementById('mainCard');
  if (card) {
    const list = document.getElementById('deviceList');
    if (list) { list.style.maxHeight='0'; list.style.overflow='hidden'; list.style.transition='max-height .3s ease'; }
    // Add a small "Show scanner" toggle
    let showBtn = document.getElementById('showScannerBtn');
    if (!showBtn) {
      showBtn = document.createElement('button');
      showBtn.id = 'showScannerBtn';
      showBtn.className = 'button btn-sm';
      showBtn.style.cssText = 'margin:8px 14px';
      showBtn.textContent = '📡 Show scanner';
      showBtn.onclick = () => {
        if (list) { list.style.maxHeight = list.style.maxHeight==='0px'||list.style.maxHeight==='0' ? '2000px' : '0'; }
        showBtn.textContent = list.style.maxHeight==='0' ? '📡 Show scanner' : '📡 Hide scanner';
      };
      card.appendChild(showBtn);
    }
  }
  // Auto-discover services after connecting
  setTimeout(()=> bleDiscoverServices(), 500);
}

function onDisconnected() {
  setStatus(false); playSound('error');
  stopWatchMode();
  const el=document.getElementById('connectedDeviceName');
  if(el) { el.textContent=''; el.setAttribute('data-i18n','noDevConn'); }
  ['discoverBtn','disconnectBtn'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.disabled=true;
  });
  const tree = document.getElementById('serviceTree');
  if(tree) tree.innerHTML = '<div class="ble-empty">Connect to a device to explore its services.</div>';
  // Restore device list visibility
  const list = document.getElementById('deviceList');
  if(list) { list.style.maxHeight=''; list.style.overflow=''; }
  const showBtn = document.getElementById('showScannerBtn');
  if(showBtn) showBtn.remove();
}

async function bleDisconnect() {
  stopWatchMode();
  wsSend({type:'disconnect'});
  ble.device=null; ble.server=null; ble.services=[]; ble.chars={};
  onDisconnected();
  log('🔌 Disconnected','info');
}

/* ═══════════════════════════════════
   FRIENDLY NAME MAP
   ═══════════════════════════════════ */
const BLE_NAMES = {
  // Standard services
  '00001800':'Generic Access','00001801':'Generic Attribute','0000180a':'Device Info',
  '0000180f':'Battery','0000180d':'Heart Rate','00001809':'Thermometer',
  // micro:bit services
  'e95d0753':'Accelerometer','e95d9882':'Buttons','e95d6100':'Temperature',
  'e95dd91d':'LED','e95d93af':'Events','e95d127b':'IO Pin',
  'e95d6100':'Temperature','e95df2d8':'Magnetometer',
  // Nordic UART
  '6e400001':'UART',
  // micro:bit characteristics
  'e95dca4b':'Accel Data','e95dfb24':'Accel Period',
  'e95dda90':'Button A','e95dda91':'Button B',
  'e95d9250':'Temperature','e95d1b25':'Temp Period',
  'e95d7b77':'LED Matrix','e95d93ee':'LED Text','e95d0d2d':'Scrolling Delay',
  'e95d9775':'Event','e95d5404':'Client Event','e95d23c4':'Client Req',
  'e95db9fe':'Pin Data','e95d5899':'Pin AD Config','e95dd822':'Pin IO Config',
  'e95dd889':'Magnetometer Data','e95d386c':'Mag Period','e95db358':'Mag Bearing',
  '6e400002':'UART TX','6e400003':'UART RX',
  // Standard characteristics
  '00002a19':'Battery Level','00002a29':'Manufacturer','00002a24':'Model',
  '00002a25':'Serial Number','00002a26':'Firmware','00002a27':'Hardware Rev',
  '00002a28':'Software Rev',
};

function friendlyName(uuid) {
  const short = (uuid||'').replace(/-.*$/,'').toLowerCase();
  return BLE_NAMES[short] || '';
}

function labelFor(uuid, fallback) {
  const name = friendlyName(uuid);
  const shortUuid = (uuid||'').slice(0,8);
  return name ? name + '  (' + shortUuid + ')' : (fallback || uuid);
}

/* ═══════════════════════════════════
   DISCOVER — nRF Connect style tree
   ═══════════════════════════════════ */
let _discoveredServices = [];

async function bleDiscoverServices() {
  showToast('Discovering…',0); log('🔎 Discovering services…','info');
  wsSend({type:'discover'});
}

function populateServices(services) {
  _discoveredServices = services;
  const tree = document.getElementById('serviceTree');
  tree.innerHTML = '';

  if (!services.length) {
    tree.innerHTML = '<div class="ble-empty">No services found.</div>';
    hideToast(); return;
  }

  services.forEach((svc, si) => {
    const group = document.createElement('div');
    group.className = 'ble-svc-group open';

    // Service header
    const header = document.createElement('div');
    header.className = 'ble-svc-header';
    const svcName = friendlyName(svc.uuid) || svc.description || 'Unknown Service';
    const charCount = (svc.characteristics||[]).length;
    header.innerHTML =
      '<span class="ble-svc-arrow">&#9654;</span>' +
      '<span class="ble-svc-name">' + esc(svcName) + ' <span style="font-weight:400;font-size:.7rem;color:var(--text-dim)">(' + charCount + ')</span></span>' +
      '<span class="ble-svc-uuid ble-clickable-uuid" title="Click to copy">' + esc(svc.uuid) + '</span>';
    header.querySelector('.ble-svc-arrow').onclick = (e) => { e.stopPropagation(); group.classList.toggle('open'); };
    header.querySelector('.ble-svc-name').onclick = (e) => { e.stopPropagation(); group.classList.toggle('open'); };
    header.querySelector('.ble-clickable-uuid').onclick = (e) => { e.stopPropagation(); copyUUID(svc.uuid); };
    group.appendChild(header);

    // Characteristics body
    const body = document.createElement('div');
    body.className = 'ble-svc-body';

    (svc.characteristics || []).forEach(c => {
      const row = document.createElement('div');
      row.className = 'ble-char-row';
      const props = c.properties || [];

      // Info line: name + property badges
      const info = document.createElement('div');
      info.className = 'ble-char-info';
      const charName = friendlyName(c.uuid) || c.description || c.uuid.slice(0,8);
      info.innerHTML =
        '<span class="ble-char-name">' + esc(charName) + '</span>' +
        '<span class="ble-char-uuid ble-clickable-uuid" title="Click to copy">' + esc(c.uuid) + '</span>' +
        '<span class="ble-prop-badges">' +
          props.map(p => '<span class="ble-prop-badge ' + p.replace('write-without-response','write') + '">' + esc(p) + '</span>').join('') +
        '</span>';
      info.querySelector('.ble-clickable-uuid').onclick = () => copyUUID(c.uuid);
      row.appendChild(info);

      // Actions line
      const actions = document.createElement('div');
      actions.className = 'ble-char-actions';

      const hasRead = props.includes('read');
      const hasWrite = props.includes('write') || props.includes('write-without-response');
      const hasNotify = props.includes('notify') || props.includes('indicate');

      if (hasRead) {
        const readBtn = document.createElement('button');
        readBtn.className = 'button btn-sm';
        readBtn.textContent = 'Read';
        readBtn.onclick = () => { wsSend({type:'read', characteristic:c.uuid}); log('📥 Reading '+charName+'…','info'); };
        actions.appendChild(readBtn);
      }

      // Descriptors button (nRF Connect style)
      const descBtn = document.createElement('button');
      descBtn.className = 'button btn-sm nrf-desc-btn';
      descBtn.textContent = 'D';
      descBtn.title = 'Read descriptors';
      descBtn.onclick = () => { wsSend({type:'read_descriptors', characteristic:c.uuid}); };
      actions.appendChild(descBtn);

      // Value display
      const valSpan = document.createElement('span');
      valSpan.className = 'ble-char-value';
      valSpan.id = 'val-' + c.uuid.replace(/[^a-zA-Z0-9]/g,'');
      valSpan.textContent = '—';
      actions.appendChild(valSpan);

      if (hasWrite) {
        const writeInput = document.createElement('input');
        writeInput.type = 'text'; writeInput.className = 'ble-input';
        writeInput.placeholder = 'hex / text';
        writeInput.id = 'wr-' + c.uuid.replace(/[^a-zA-Z0-9]/g,'');
        actions.appendChild(writeInput);

        const writeBtn = document.createElement('button');
        writeBtn.className = 'button primary btn-sm';
        writeBtn.textContent = 'Write';
        writeBtn.onclick = () => {
          const raw = writeInput.value.trim(); if(!raw) return;
          let bytes;
          try { bytes = smartEncode(raw); } catch(e) { log('Encode error: '+e.message,'error'); return; }
          wsSend({type:'write', characteristic:c.uuid, value:Array.from(bytes), no_response:props.includes('write-without-response')});
          log('📤 Write → '+charName,'tx');
        };
        actions.appendChild(writeBtn);
      }

      // Data rate indicator
      const rateSpan = document.createElement('span');
      rateSpan.className = 'ble-data-rate';
      rateSpan.id = 'rate-' + c.uuid.replace(/[^a-zA-Z0-9]/g,'');
      actions.appendChild(rateSpan);

      if (hasNotify) {
        const subBtn = document.createElement('button');
        subBtn.className = 'button btn-sm';
        subBtn.textContent = 'Subscribe';
        const liveTag = document.createElement('span');
        liveTag.className = 'ble-char-live'; liveTag.style.display='none';
        liveTag.innerHTML = '<span class="ble-badge">LIVE</span> <span class="ble-notify-count">0</span>';

        let subscribed = false;
        subBtn.onclick = () => {
          if (!subscribed) {
            wsSend({type:'subscribe', characteristic:c.uuid});
            subBtn.textContent = 'Unsubscribe'; subBtn.classList.add('fire-btn');
            liveTag.style.display = ''; subscribed = true;
            log('🔔 Subscribed → '+charName,'success');
          } else {
            wsSend({type:'unsubscribe', characteristic:c.uuid});
            subBtn.textContent = 'Subscribe'; subBtn.classList.remove('fire-btn');
            liveTag.style.display = 'none'; subscribed = false;
            log('🔕 Unsubscribed → '+charName,'info');
          }
        };
        actions.appendChild(subBtn);
        actions.appendChild(liveTag);
      }

      row.appendChild(actions);
      body.appendChild(row);
    });

    group.appendChild(body);
    tree.appendChild(group);
  });

  // Toolbar: Read All, Subscribe All, Watch Mode
  const allReadable = services.flatMap(s => (s.characteristics||[]).filter(c => (c.properties||[]).includes('read')));
  const allNotify = services.flatMap(s => (s.characteristics||[]).filter(c => {
    const p = c.properties||[];
    return p.includes('notify') || p.includes('indicate');
  }));

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid var(--border,rgba(255,255,255,.08))';

  if (allReadable.length > 0) {
    const readAllBtn = document.createElement('button');
    readAllBtn.className = 'button primary btn-sm';
    readAllBtn.textContent = '📥 Read All (' + allReadable.length + ')';
    readAllBtn.onclick = () => {
      allReadable.forEach((c,i) => setTimeout(() => wsSend({type:'read', characteristic:c.uuid}), i*200));
      log('📥 Reading all '+allReadable.length+' characteristics…','info');
    };
    toolbar.appendChild(readAllBtn);
  }

  if (allNotify.length > 0) {
    const subAllBtn = document.createElement('button');
    subAllBtn.className = 'button btn-sm';
    subAllBtn.textContent = '🔔 Subscribe All (' + allNotify.length + ')';
    let allSubbed = false;
    subAllBtn.onclick = () => {
      if (!allSubbed) {
        allNotify.forEach((c,i) => setTimeout(() => wsSend({type:'subscribe', characteristic:c.uuid}), i*150));
        // Update individual subscribe buttons
        allNotify.forEach(c => {
          const charId = c.uuid.replace(/[^a-zA-Z0-9]/g,'');
          const row = document.getElementById('val-'+charId)?.closest('.ble-char-row');
          if (row) {
            const btn = row.querySelector('.ble-char-actions button:last-of-type');
            if (btn && btn.textContent==='Subscribe') { btn.textContent='Unsubscribe'; btn.classList.add('fire-btn'); }
            const live = row.querySelector('.ble-char-live');
            if (live) live.style.display='';
          }
        });
        subAllBtn.textContent = '🔕 Unsubscribe All';
        subAllBtn.classList.add('fire-btn');
        allSubbed = true;
        log('🔔 Subscribed to all '+allNotify.length+' notify characteristics','success');
      } else {
        allNotify.forEach((c,i) => setTimeout(() => wsSend({type:'unsubscribe', characteristic:c.uuid}), i*150));
        subAllBtn.textContent = '🔔 Subscribe All (' + allNotify.length + ')';
        subAllBtn.classList.remove('fire-btn');
        allSubbed = false;
        log('🔕 Unsubscribed from all','info');
      }
    };
    toolbar.appendChild(subAllBtn);
  }

  // Watch Mode button — auto-read polling for readable chars + subscribe all notify
  const watchBtn = document.createElement('button');
  watchBtn.className = 'button btn-sm' + (ble.watchMode ? ' fire-btn' : '');
  watchBtn.textContent = ble.watchMode ? '👁 Stop Watch' : '👁 Watch Mode';
  watchBtn.id = 'watchModeBtn';
  watchBtn.onclick = () => {
    if (!ble.watchMode) {
      startWatchMode(allReadable, allNotify);
      watchBtn.textContent = '👁 Stop Watch';
      watchBtn.classList.add('fire-btn');
    } else {
      stopWatchMode();
      watchBtn.textContent = '👁 Watch Mode';
      watchBtn.classList.remove('fire-btn');
    }
  };
  toolbar.appendChild(watchBtn);

  tree.appendChild(toolbar);

  hideToast(); log('✅ '+services.length+' service(s), ' + services.reduce((n,s)=>n+(s.characteristics||[]).length,0) + ' characteristic(s)','success');
}

function copyUUID(uuid) {
  navigator.clipboard.writeText(uuid).then(() => {
    showToast('Copied: '+uuid.slice(0,13)+'…', 1500);
  }).catch(() => {});
}

// Keep for backward compat
function populateChars() {}
function bleLoadCharacteristics() {}
function updateCharButtons() {}

/* ═══════════════════════════════════
   WATCH MODE — auto-read + subscribe all
   ═══════════════════════════════════ */
const WATCH_POLL_INTERVAL = 3000; // ms between auto-read cycles

function startWatchMode(readableChars, notifyChars) {
  ble.watchMode = true;
  // Subscribe to all notify/indicate characteristics
  if (notifyChars && notifyChars.length) {
    notifyChars.forEach((c,i) => setTimeout(() => wsSend({type:'subscribe', characteristic:c.uuid}), i*150));
    log('👁 Watch: subscribed to '+notifyChars.length+' notify chars','success');
  }
  // Poll readable (non-notify) characteristics periodically
  const pollable = readableChars ? readableChars.filter(c => {
    const p = c.properties||[];
    return !p.includes('notify') && !p.includes('indicate');
  }) : [];
  if (pollable.length) {
    log('👁 Watch: polling '+pollable.length+' readable chars every '+(WATCH_POLL_INTERVAL/1000)+'s','info');
    _pollOnce(pollable);
    ble.watchTimer = setInterval(() => _pollOnce(pollable), WATCH_POLL_INTERVAL);
  }
  log('👁 Watch mode ON','success');
}

function _pollOnce(chars) {
  chars.forEach((c,i) => setTimeout(() => wsSend({type:'read', characteristic:c.uuid}), i*200));
}

function stopWatchMode() {
  if (!ble.watchMode) return;
  ble.watchMode = false;
  if (ble.watchTimer) { clearInterval(ble.watchTimer); ble.watchTimer = null; }
  log('👁 Watch mode OFF','info');
  const btn = document.getElementById('watchModeBtn');
  if (btn) { btn.textContent = '👁 Watch Mode'; btn.classList.remove('fire-btn'); }
}

/* ═══════════════════════════════════
   READ / NOTIFY — update inline values
   ═══════════════════════════════════ */
function _decodeRaw(msg) {
  const bytes = msg.raw instanceof Uint8Array ? msg.raw : msg.raw ? new Uint8Array(msg.raw) : new Uint8Array([]);
  const hex = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join(' ').toUpperCase();
  const str = (() => { try { return new TextDecoder().decode(bytes).replace(/\0/g,'').replace(/\r?\n$/,''); } catch{ return ''; } })();
  let num = null;
  let key = null; // for KEY:VALUE format

  // If data is printable text, try to parse KEY:VALUE or plain number
  if (str && /^[\x20-\x7e\r\n]+$/.test(str)) {
    const kvMatch = str.match(/^([A-Za-z_][A-Za-z0-9_ ]*)\s*[:=]\s*(-?[\d.]+)/);
    if (kvMatch) {
      key = kvMatch[1].trim();
      num = parseFloat(kvMatch[2]);
    } else {
      const plainNum = parseFloat(str);
      if (!isNaN(plainNum) && /^-?[\d.]+$/.test(str.trim())) num = plainNum;
    }
  } else if (bytes.length) {
    // Binary data — interpret as integer
    const dv = new DataView(bytes.buffer);
    if (bytes.length === 4) num = dv.getInt32(0, true);
    else if (bytes.length === 2) num = dv.getInt16(0, true);
    else if (bytes.length === 1) num = bytes[0];
  }

  return {hex, str, num, key};
}

const _notifyCounts = {};

function showReadResult(msg) {
  const {hex, str, num, key} = _decodeRaw(msg);
  const bytes = msg.raw instanceof Uint8Array ? msg.raw : msg.raw ? new Uint8Array(msg.raw) : new Uint8Array([]);
  const charId = (msg.characteristic||'').replace(/[^a-zA-Z0-9]/g,'');
  const cName = friendlyName(msg.characteristic) || msg.characteristic?.slice(0,8) || '?';

  // nRF Connect auto-format for known characteristics
  const formatted = _formatCharValue(msg.characteristic, Array.from(bytes));

  // Display: prefer nRF formatter, then KEY:NUM, then "string", then num, then hex
  const display = formatted ? (formatted.icon + ' ' + formatted.display)
    : key && num!=null ? key+': '+num
    : str && /^[\x20-\x7e\r\n]+$/.test(str) ? '"'+str.trim()+'"'
    : num!=null ? num : hex;

  // Use formatted value for chart if available
  if (formatted && formatted.value != null && typeof formatted.value === 'number') {
    num = formatted.value;
    if (!key) key = formatted.unit || friendlyName(msg.characteristic) || cName;
  }

  // Value diff — detect changed bytes
  const prev = _debug.prevValues[charId];
  let diffCount = 0;
  if (prev) {
    if (prev.length !== bytes.length) diffCount = -1; // length changed
    else for (let i = 0; i < bytes.length; i++) { if (prev[i] !== bytes[i]) diffCount++; }
  }
  _debug.prevValues[charId] = new Uint8Array(bytes); // store copy

  // Data rate tracking
  _trackDataRate(charId, bytes.length);
  const rate = _getDataRate(charId);

  // Latency (for read_result)
  let latencyMs = null;
  if (msg.type === 'read_result') latencyMs = _stopLatencyTimer(msg.characteristic);

  // Update inline value — make clickable for packet inspector
  const el = document.getElementById('val-'+charId);
  if (el) {
    el.textContent = display;
    el.title = 'Click to inspect packet';
    el.style.cursor = 'pointer';
    el.onclick = () => _showPacketInspector(msg);
    // Diff highlight: green=same, yellow=partial change, red=full change
    if (prev) {
      const diffClass = diffCount === 0 ? 'ble-val-same' : diffCount > 0 && diffCount < bytes.length ? 'ble-val-partial' : 'ble-val-changed';
      el.classList.remove('ble-val-same','ble-val-partial','ble-val-changed');
      el.classList.add(diffClass);
      setTimeout(() => el.classList.remove(diffClass), 1500);
    }
    el.classList.add('ble-value-flash');
    setTimeout(() => el.classList.remove('ble-value-flash'), 300);
  }

  // Update data rate display
  const rateEl = document.getElementById('rate-'+charId);
  if (rateEl && rate) rateEl.textContent = rate.nps + '/s  ' + rate.bps + ' B/s';

  // Update notification counter
  if (msg.type === 'notify') {
    _notifyCounts[charId] = (_notifyCounts[charId]||0) + 1;
    const countEl = el && el.closest('.ble-char-row')?.querySelector('.ble-notify-count');
    if (countEl) countEl.textContent = _notifyCounts[charId];
  }

  // Verbose log with latency + diff info
  const tag = msg.type === 'notify' ? '🔔 NOTIFY' : '📥 READ';
  const rawLen = msg.raw ? msg.raw.length : 0;
  let details = cName + ' (' + rawLen + ' bytes)';
  details += '\n    HEX: ' + (hex || '(empty)');
  if (str && /^[\x20-\x7e\r\n]+$/.test(str)) details += '\n    STR: "' + str.trim() + '"';
  if (key) details += '\n    KEY: ' + key + ' = ' + num;
  else if (num != null) details += '\n    NUM: ' + num;
  if (latencyMs != null) details += '\n    LATENCY: ' + latencyMs + 'ms';
  if (diffCount === 0 && prev) details += '\n    DIFF: unchanged';
  else if (diffCount > 0) details += '\n    DIFF: ' + diffCount + '/' + bytes.length + ' bytes changed';
  if (rate) details += '\n    RATE: ' + rate.nps + ' pkt/s, ' + rate.bps + ' B/s';
  log(tag + ' ← ' + details, 'rx');

  // Chart: only push parsed numbers (KEY:VALUE or pure numeric)
  if (typeof num === 'number' && isFinite(num)) pushChartPoint(num, key);

  // Capture packet for Wireshark pane
  _capturePacket({
    dir:'RX', type: msg.type === 'notify' ? 'notify' : 'read',
    uuid: msg.characteristic, name: cName,
    raw: bytes, decoded: {hex, str, num, key},
    info: key && num!=null ? key+'='+num : str ? '"'+str.trim()+'"' : num!=null ? String(num) : hex,
  });
}

/* ═══════════════════════════════════
   WRITE — smart encode (auto-detect hex vs text)
   ═══════════════════════════════════ */
function smartEncode(raw) {
  // If starts with 0x or looks like hex pairs, treat as hex
  if (/^(0x)?[0-9a-fA-F]{2}(\s+[0-9a-fA-F]{2})*$/.test(raw.trim()) || /^0x[0-9a-fA-F]+$/i.test(raw.trim())) {
    const c = raw.replace(/0x/gi,'').replace(/\s/g,'');
    if(c.length%2!==0) throw new Error('Odd hex length');
    const a=[]; for(let i=0;i<c.length;i+=2) a.push(parseInt(c.slice(i,i+2),16));
    return new Uint8Array(a);
  }
  // Otherwise treat as UTF-8 text
  return new TextEncoder().encode(raw);
}

function onNotification(dataView, uuid) {
  const bytes=new Uint8Array(dataView.buffer);
  showReadResult({ raw:Array.from(bytes), characteristic:uuid });
  const hex=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join(' ').toUpperCase();
  const line=document.createElement('div');
  line.innerHTML='<span style="opacity:.5">'+new Date().toLocaleTimeString()+'</span> '+esc(hex);
  const stream=document.getElementById('notifyStream');
  if(stream){ stream.appendChild(line); stream.scrollTop=stream.scrollHeight; while(stream.children.length>200) stream.removeChild(stream.firstChild); }
}

/* ═══════════════════════════════════
   CHART
   ═══════════════════════════════════ */
let bleChart=null;
const _chartSeries = {};  // key → [{ts, n}]
const _seriesColors = ['#00aaff','#ff9900','#22cc88','#ff4455','#aa55ff','#ffcc00','#00ddcc','#ff66aa'];
let _colorIdx = 0;

function initChart() {
  const canvas=document.getElementById('bleChart');
  if (!canvas||typeof Chart==='undefined') return;
  const cs=getComputedStyle(document.documentElement);
  const textDim = cs.getPropertyValue('--text-dim').trim() || '#7a8aaa';
  bleChart=new Chart(canvas,{
    type:'line',
    data:{ labels:[], datasets:[] },
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins:{ legend:{ labels:{ color:textDim }, display:true } },
      scales:{
        x:{ ticks:{color:textDim,maxTicksLimit:10}, grid:{color:textDim+'33'} },
        y:{ ticks:{color:textDim},                  grid:{color:textDim+'33'} },
      }
    }
  });
}

function _getOrCreateSeries(key) {
  if (!key) key = '_default';
  if (!_chartSeries[key]) {
    const color = _seriesColors[_colorIdx % _seriesColors.length];
    _colorIdx++;
    _chartSeries[key] = { data:[], color };
    if (bleChart) {
      bleChart.data.datasets.push({
        label: key === '_default' ? 'BLE Value' : key,
        data: [],
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        pointRadius: 2,
        tension: .3,
        fill: false,
      });
    }
  }
  return _chartSeries[key];
}

function pushChartPoint(value, key) {
  if (ble.chartPaused) return;
  const n = typeof value==='number' ? value : parseFloat(value);
  if (isNaN(n) || !isFinite(n)) return;
  const win = parseInt((document.getElementById('chartWindow')||{}).value||'60',10);
  const ts = new Date().toLocaleTimeString();

  // Add to the right series
  const series = _getOrCreateSeries(key);
  series.data.push({ts, n});
  if (series.data.length > win) series.data.shift();

  // Also track in global chartData for stats
  ble.chartData.push({ts, n, key: key||'_default'});
  if (ble.chartData.length > win * Object.keys(_chartSeries).length) ble.chartData.shift();

  // Update stats
  const s = ble.stats;
  s.count++; s.sum += n;
  if (s.min===null || n < s.min) s.min = n;
  if (s.max===null || n > s.max) s.max = n;
  ['statMin','statMax','statAvg','statCount'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.textContent = id==='statMin' ? s.min.toFixed(1)
                   : id==='statMax' ? s.max.toFixed(1)
                   : id==='statAvg' ? (s.sum/s.count).toFixed(1)
                   : s.count;
  });

  if (!bleChart) return;
  const showGrid = (document.getElementById('chartGrid')||{}).checked !== false;

  // Build unified time labels from all series
  const allTs = new Set();
  Object.values(_chartSeries).forEach(s => s.data.forEach(p => allTs.add(p.ts)));
  const labels = [...allTs].sort();
  bleChart.data.labels = labels;

  // Update each dataset
  const keys = Object.keys(_chartSeries);
  keys.forEach((k, i) => {
    const ds = bleChart.data.datasets[i];
    if (!ds) return;
    const dataMap = {};
    _chartSeries[k].data.forEach(p => dataMap[p.ts] = p.n);
    ds.data = labels.map(t => dataMap[t] ?? null);
  });

  bleChart.options.scales.x.grid.display = showGrid;
  bleChart.options.scales.y.grid.display = showGrid;
  bleChart.options.plugins.legend.display = keys.length > 1;
  bleChart.update('none');
}

function clearChart() {
  ble.chartData=[]; ble.stats={min:null,max:null,sum:0,count:0};
  // Clear all series
  Object.keys(_chartSeries).forEach(k => delete _chartSeries[k]);
  _colorIdx = 0;
  ['statMin','statMax','statAvg'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='—'; });
  const c=document.getElementById('statCount'); if(c) c.textContent='0';
  if(bleChart){ bleChart.data.labels=[]; bleChart.data.datasets=[]; bleChart.update(); }
  log('🧹 Chart cleared','info');
}

function exportChartData() {
  if (!ble.chartData.length) { log('No chart data','error'); return; }
  const csv='timestamp,value\n'+ble.chartData.map(p=>p.ts+','+p.n).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='ble_chart_'+Date.now()+'.csv'; a.click();
  log('💾 Chart exported','success');
}

/* ═══════════════════════════════════
   MULTI-DEVICE
   ═══════════════════════════════════ */
function addMultiDevice(device, server, name) {
  if (ble.multiDevices.find(d=>d.device.id===device.id)) return;
  ble.multiDevices.push({device,server,name});
  renderMultiDevices();
}

function removeMultiDevice(device) {
  if (!device) return;
  ble.multiDevices=ble.multiDevices.filter(d=>d.device.id!==device.id);
  renderMultiDevices();
}

function renderMultiDevices() {
  const list=document.getElementById('multiDeviceList'); if(!list) return;
  if (!ble.multiDevices.length) { list.innerHTML='<div class="ble-empty">No active connections.</div>'; return; }
  list.innerHTML='';
  ble.multiDevices.forEach((d,i)=>{
    const row=document.createElement('div'); row.className='ble-multi-row';
    row.innerHTML=`<div class="ble-multi-name">${esc(d.name||'(unknown)')}</div>
      <div class="ble-multi-status ${d.device.gatt.connected?'ok':'err'}">${d.device.gatt.connected?'● CONNECTED':'○ DISCONNECTED'}</div>`;
    const btn=document.createElement('button'); btn.className='button fire-btn btn-sm'; btn.textContent='🔌';
    btn.onclick=()=>{ if(d.device.gatt.connected) d.device.gatt.disconnect(); ble.multiDevices.splice(i,1); renderMultiDevices(); log('🔌 Disconnected '+d.name,'info'); };
    row.appendChild(btn); list.appendChild(row);
  });
}

/* ═══════════════════════════════════
   EXPORT LOGS FROM BACKEND
   ═══════════════════════════════════ */
async function exportLogsFromBackend() {
  const base=((document.getElementById('backendURL')||{}).value||'ws://localhost:8000/ws')
             .replace('ws://','http://').replace('wss://','https://').replace('/ws','');
  const fmt=(document.getElementById('logFormatSel')||{}).value||'both';
  showToast('Downloading logs…',3000);
  const targets=[];
  if(fmt==='csv'||fmt==='both')  targets.push({url:base+'/api/logs/csv',  name:'ble_log.csv'  });
  if(fmt==='json'||fmt==='both') targets.push({url:base+'/api/logs/json', name:'ble_log.jsonl'});
  for(const {url,name} of targets) {
    try {
      const res=await fetch(url); const text=await res.text();
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
      a.download=name; a.click();
      log('✅ Downloaded '+name,'success');
    } catch(e) { log('Error downloading '+name+': '+e.message,'error'); }
  }
  hideToast();
}

/* ═══════════════════════════════════
   AUTO-RECONNECT SYNC
   ═══════════════════════════════════ */
function syncAutoReconnect() {
  ['autoReconnectChk'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', e=>{ ble.autoReconnect=e.target.checked; });
  });
  const hideChk = document.getElementById('hideUnknownChk');
  if (hideChk) hideChk.addEventListener('change', () => renderDeviceList(null));
}

/* ═══════════════════════════════════
   CLEAR CACHE & RELOAD
   ═══════════════════════════════════ */
function clearCacheReload() {
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  location.reload(true);
}

/* ═══════════════════════════════════
   INIT (after template init())
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Re-apply language to pick up BLE i18n keys on dynamic elements
  const saved=(()=>{ try{ return localStorage.getItem('wdiy-lang')||'en'; }catch{ return 'en'; } })();
  if (typeof setLanguage==='function') setLanguage(saved);

  initChart();
  wsConnect();
  syncAutoReconnect();
  _initDebugUI();

  // Pause chart on checkbox
  const pc=document.getElementById('chartPause');
  if(pc) pc.addEventListener('change', e=>{ ble.chartPaused=e.target.checked; });

  log('📡 BLE Dashboard v1.0 ready','success');
  _timelineEvent('Dashboard Ready', 'v1.0', 'success');
});

/* ═══════════════════════════════════
   nRF Connect — DESCRIPTORS INLINE DISPLAY
   ═══════════════════════════════════ */
function _showDescriptorsInline(charUuid, descriptors) {
  const charId = charUuid.replace(/[^a-zA-Z0-9]/g,'');
  const valEl = document.getElementById('val-'+charId);
  if (!valEl) return;
  const row = valEl.closest('.ble-char-row');
  if (!row) return;
  // Remove existing descriptor display
  const existing = row.querySelector('.nrf-descriptors');
  if (existing) existing.remove();
  if (!descriptors.length) return;
  const descDiv = document.createElement('div');
  descDiv.className = 'nrf-descriptors';
  descriptors.forEach(d => {
    const line = document.createElement('div');
    line.className = 'nrf-desc-line';
    line.innerHTML = '<span class="nrf-desc-uuid">' + esc(d.uuid) + '</span>' +
      '<span class="nrf-desc-name">' + esc(d.description||'') + '</span>' +
      (d.hex ? '<span class="nrf-desc-val">' + esc(d.hex) + '</span>' : '');
    descDiv.appendChild(line);
  });
  row.appendChild(descDiv);
}

/* ═══════════════════════════════════
   DEBUG UI INIT
   ═══════════════════════════════════ */
function _initDebugUI() {
  // Add Log Search bar to log panel header
  const logFilters = document.getElementById('logFilters');
  if (logFilters) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'log-search-wrap';
    searchWrap.innerHTML = '<input id="logSearch" type="text" class="ble-input" placeholder="Search logs…" style="font-size:.72rem;padding:3px 8px;max-width:180px" />';
    logFilters.appendChild(searchWrap);
    const searchInput = document.getElementById('logSearch');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const entries = document.querySelectorAll('#logContainer .log-entry');
      entries.forEach(e => {
        e.style.display = !q || e.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // Add Wireshark + Debug Tools section
  const rowsContainer = document.querySelector('.rows-container');
  if (rowsContainer) {
    // ── Wireshark-style Packet Analyzer ──
    const wsSection = document.createElement('details');
    wsSection.className = 'collapsible';
    wsSection.innerHTML =
      '<summary><span class="icon">🦈</span> Packet Analyzer</summary>' +
      '<div class="card ws-card">' +
        // Filter bar
        '<div id="ws-filter-bar" class="ws-filter-bar">' +
          '<span class="ws-filter-icon">🔍</span>' +
          '<input id="ws-filter-input" type="text" class="ws-filter-input" placeholder="Display filter… (e.g. notify, SOUND, type:read, uuid:e95d, len>5)" oninput="_wsFilterApply()" />' +
          '<button class="ws-filter-clear" onclick="document.getElementById(\'ws-filter-input\').value=\'\';_wsFilterApply()">✕</button>' +
        '</div>' +
        // Toolbar
        '<div class="ws-toolbar">' +
          '<button id="ws-capture-toggle" class="button btn-sm fire-btn" onclick="_wsToggleCapture()">⏸ Stop</button>' +
          '<button class="button btn-sm" onclick="_wsClearCapture()">🧹 Clear</button>' +
          '<button id="ws-delta-btn" class="button btn-sm" onclick="_wsToggleDelta()">Δt prev</button>' +
          '<button id="ws-follow-btn" class="button btn-sm" onclick="_wsFollowChar(_capture.selected!==-1?_capture.packets.find(p=>p._no===_capture.selected)?.uuid:null)">⟿ Follow</button>' +
          '<button class="button btn-sm" onclick="_wsExportCapture()">💾 Export</button>' +
          '<button class="button btn-sm" onclick="exportDebugSnapshot()">📸 Snapshot</button>' +
        '</div>' +
        // Stats bar
        '<div id="ws-stats" class="ws-stats"></div>' +
        // Packet list (top pane)
        '<div class="ws-pkt-list">' +
          '<table class="ws-pkt-table">' +
            '<thead><tr>' +
              '<th class="ws-col-no">No.</th>' +
              '<th class="ws-col-time">Time</th>' +
              '<th class="ws-col-addr">Source</th>' +
              '<th class="ws-col-dir"></th>' +
              '<th class="ws-col-addr">Destination</th>' +
              '<th class="ws-col-proto">Protocol</th>' +
              '<th class="ws-col-len">Len</th>' +
              '<th class="ws-col-info">Info</th>' +
            '</tr></thead>' +
            '<tbody id="ws-pkt-tbody"></tbody>' +
          '</table>' +
        '</div>' +
        // Bottom panes: detail tree + hex dump
        '<div class="ws-bottom-panes">' +
          '<div class="ws-detail-pane"><div id="ws-pkt-detail" class="ws-pkt-detail"><span class="ws-hex-empty">Select a packet to inspect</span></div></div>' +
          '<div class="ws-hex-pane"><pre id="ws-pkt-hex" class="ws-pkt-hex"></pre></div>' +
        '</div>' +
      '</div>';
    rowsContainer.appendChild(wsSection);

    // ── nRF Tools (Macro Recorder) ──
    const nrfSection = document.createElement('details');
    nrfSection.className = 'collapsible';
    nrfSection.innerHTML =
      '<summary><span class="icon">📱</span> nRF Tools</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">Macro Recorder</div><div class="card-subtitle">Record and replay BLE operation sequences</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="button btn-sm fire-btn" onclick="_macroRecord()" id="nrf-macro-rec-btn">🔴 Record</button>' +
            '<button class="button btn-sm" onclick="_macroPlay()">▶ Play</button>' +
            '<button class="button btn-sm" onclick="_macroStop()">⏹ Stop</button>' +
            '<button class="button btn-sm" onclick="_macroSave()">💾 Save</button>' +
            '<button class="button btn-sm" onclick="_macroExport()">📤 Export</button>' +
          '</div>' +
        '</div>' +
        '<div id="nrf-macro-body" class="nrf-macro-body"><div class="nrf-macro-status">No macro recorded</div></div>' +
        // Connection Info panel
        '<div class="card-header" style="border-top:1px solid var(--border,rgba(255,255,255,.08))">' +
          '<div><div class="card-title">Connection Parameters</div><div class="card-subtitle">MTU, address, subscriptions</div></div>' +
          '<button class="button btn-sm" onclick="wsSend({type:\'conn_info\'})">Refresh</button>' +
        '</div>' +
        '<div id="nrf-conn-info" class="nrf-conn-info">' +
          '<div class="ble-empty">Connect to a device to see parameters</div>' +
        '</div>' +
      '</div>';
    rowsContainer.appendChild(nrfSection);

    // ── Debug Tools (Timeline + Latency) ──
    const debugSection = document.createElement('details');
    debugSection.className = 'collapsible';
    debugSection.innerHTML =
      '<summary><span class="icon">🔬</span> Debug Tools</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">Connection Timeline</div><div class="card-subtitle">Visual event history with timestamps</div></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="button btn-sm" onclick="_debug.timeline=[];_renderTimeline()">🧹 Clear</button>' +
          '</div>' +
        '</div>' +
        '<div id="timelineBody" class="tl-body"></div>' +
        '<div class="card-header" style="border-top:1px solid var(--border,rgba(255,255,255,.08))">' +
          '<div><div class="card-title">Latency Report</div><div class="card-subtitle">Read round-trip times per characteristic</div></div>' +
          '<button class="button btn-sm" onclick="_renderLatencyReport()">Refresh</button>' +
        '</div>' +
        '<div id="latencyReport" class="latency-report"></div>' +
      '</div>';
    rowsContainer.appendChild(debugSection);
  }
}

function _renderLatencyReport() {
  const el = document.getElementById('latencyReport');
  if (!el) return;
  const entries = Object.entries(_debug.latencyLog);
  if (!entries.length) { el.innerHTML = '<div class="ble-empty">No latency data yet. Read some characteristics.</div>'; return; }
  el.innerHTML = '';
  entries.forEach(([charId, samples]) => {
    const avg = (samples.reduce((a,b) => a+b, 0) / samples.length).toFixed(1);
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const last = samples[samples.length - 1];
    // Find the UUID from the charId
    let uuid = charId;
    for (const svc of _discoveredServices) {
      for (const c of (svc.characteristics||[])) {
        if (c.uuid.replace(/[^a-zA-Z0-9]/g,'') === charId) { uuid = c.uuid; break; }
      }
    }
    const name = friendlyName(uuid) || uuid.slice(0,8);
    const row = document.createElement('div');
    row.className = 'latency-row';
    // Bar visualization (max 500ms scale)
    const barWidth = Math.min(100, avg / 5);
    const barColor = avg < 100 ? '#22cc88' : avg < 300 ? '#ffaa00' : '#ff4455';
    row.innerHTML =
      '<span class="latency-name">' + esc(name) + '</span>' +
      '<span class="latency-bar"><span class="latency-fill" style="width:'+barWidth+'%;background:'+barColor+'"></span></span>' +
      '<span class="latency-stats">avg:'+avg+'ms  min:'+min+'  max:'+max+'  last:'+last+'ms  ('+samples.length+')</span>';
    el.appendChild(row);
  });
}

/* ═══════════════════════════════════
   FEATURE: Radar detail on blip click
   ═══════════════════════════════════ */
function showRadarDetail(d) {
  const el = document.getElementById('radarDetail');
  if (!el) return;
  const rssi = d.rssi != null ? d.rssi : '?';
  const vendor = _deviceVendor(d) || 'Unknown';
  const rssiHist = d.rssi_history || [d.rssi || -100];
  const spark = _rssiSparkline(rssiHist);
  const bars = d.rssi != null ? rssiToBars(d.rssi) : '░░░░';
  const color = d.rssi != null ? rssiColor(d.rssi) : 'var(--text-dim)';
  el.style.display = '';
  el.innerHTML =
    '<div class="detail-name">' + esc(d.name || '(unknown)') + '</div>' +
    '<div class="detail-addr">' + esc(d.address || d.id || '') + '</div>' +
    '<div class="detail-vendor">' + esc(vendor) + '</div>' +
    '<div class="detail-row">' +
      '<span class="ble-rssi" style="color:' + color + '">' + bars + ' ' + rssi + ' dBm</span>' +
      '<span class="nrf-rssi-spark">' + spark + '</span>' +
      '<button class="button btn-sm primary" onclick="bleConnectDevice(_lastDevices.find(x=>(x.address||x.id)===\'' + esc(d.address||d.id||'') + '\'))">🔗 Connect</button>' +
    '</div>';
}

/* ═══════════════════════════════════
   FEATURE: Audio proximity feedback
   ═══════════════════════════════════ */
let _proxSoundActive = false;
let _proxSoundTimer = null;
let _proxAudioCtx = null;

function toggleProximitySound() {
  _proxSoundActive = !_proxSoundActive;
  const btn = document.getElementById('proxSoundBtn');
  if (btn) btn.classList.toggle('active', _proxSoundActive);

  if (_proxSoundActive) {
    if (!_proxAudioCtx) _proxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _scheduleProxBeep();
  } else {
    if (_proxSoundTimer) { clearTimeout(_proxSoundTimer); _proxSoundTimer = null; }
  }
}

function _proxBeep() {
  if (!_proxAudioCtx || !_proxSoundActive) return;
  const osc = _proxAudioCtx.createOscillator();
  const gain = _proxAudioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(_proxAudioCtx.destination);
  osc.start();
  osc.stop(_proxAudioCtx.currentTime + 0.1);
}

function _scheduleProxBeep() {
  if (!_proxSoundActive) return;
  // Find strongest RSSI among current devices
  let strongest = -999;
  _lastDevices.forEach(d => { if (d.rssi != null && d.rssi > strongest) strongest = d.rssi; });

  let interval;
  if (strongest > -40) interval = 200;
  else if (strongest > -60) interval = 400;
  else if (strongest > -80) interval = 800;
  else interval = 1500;

  _proxBeep();
  _proxSoundTimer = setTimeout(_scheduleProxBeep, interval);
}

/* ═══════════════════════════════════
   FEATURE: Export devices to CSV
   ═══════════════════════════════════ */
function exportDevicesCSV() {
  if (!_lastDevices.length) { log('No devices to export.','error'); return; }
  const rows = [['Name','Address','RSSI','Vendor','FirstSeen','LastSeen']];
  _lastDevices.forEach(d => {
    const addr = d.address || d.id || '';
    const hist = _deviceHistory.get(addr);
    rows.push([
      d.name || '(unknown)',
      addr,
      d.rssi != null ? d.rssi : '',
      _deviceVendor(d) || 'Unknown',
      hist ? new Date(hist.firstSeen).toISOString() : '',
      hist ? new Date(hist.lastSeen).toISOString() : '',
    ]);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ble_devices_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  log('Exported ' + _lastDevices.length + ' devices to CSV.', 'success');
}

/* ═══════════════════════════════════
   FEATURE: Simulate fake devices (demo mode)
   ═══════════════════════════════════ */
function simulateDevices() {
  const fakeNames = [
    'HeartRate-Sensor', 'Xiaomi-Band7', 'AirPods-Pro', 'ESP32-Temp',
    'BBC-microbit', 'Galaxy-Buds', 'Tile-Tracker', 'Fitbit-Charge5',
    'SmartLock-01', 'iBeacon-Demo', 'Nordic-DK', 'Arduino-BLE'
  ];
  const fakeVendors = [
    [0x4C, 0x00], // Apple
    [0x57, 0x01], // Xiaomi
    [0x75, 0x00], // Samsung
    [0x59, 0x00], // Nordic
    [0xE0, 0x00], // Google
  ];
  const count = 5 + Math.floor(Math.random() * 6); // 5-10 devices
  const devices = [];
  for (let i = 0; i < count; i++) {
    const rssi = -30 - Math.floor(Math.random() * 70); // -30 to -100
    const hist = [];
    for (let h = 0; h < 10; h++) hist.push(rssi + Math.floor(Math.random() * 10 - 5));
    const mfr = fakeVendors[Math.floor(Math.random() * fakeVendors.length)];
    devices.push({
      name: fakeNames[i % fakeNames.length],
      address: 'DE:MO:' + String(i).padStart(2,'0') + ':' +
        Math.floor(Math.random()*256).toString(16).toUpperCase().padStart(2,'0') + ':' +
        Math.floor(Math.random()*256).toString(16).toUpperCase().padStart(2,'0') + ':' +
        Math.floor(Math.random()*256).toString(16).toUpperCase().padStart(2,'0'),
      rssi: rssi,
      rssi_history: hist,
      adv: {
        tx_power: -12,
        manufacturer_data: { [mfr[0] * 256 + mfr[1]]: [0x01, 0x02, 0x03] },
      },
    });
  }
  log('🎲 Simulated ' + count + ' demo devices.', 'info');
  renderDeviceList(devices);
}
