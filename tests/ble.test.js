/**
 * test_frontend.js — Frontend JS unit tests (vitest + jsdom)
 * Tests: encodeValue · _decode equivalent · DOM helpers · chart utils
 * ble.js logic is tested in isolation via extracted pure functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Pure functions extracted from ble.js for testing ─────────────────────────
// (We test the logic directly — no need to load the full DOM app)

function encodeValue(raw, fmt) {
  if (fmt === 'hex') {
    const c = raw.replace(/0x/gi, '').replace(/\s/g, '');
    if (!/^[0-9a-fA-F]*$/.test(c) || c.length % 2 !== 0) throw new Error('Invalid hex');
    const a = [];
    for (let i = 0; i < c.length; i += 2) a.push(parseInt(c.slice(i, i + 2), 16));
    return new Uint8Array(a);
  }
  if (fmt === 'utf8') return new TextEncoder().encode(raw);
  if (fmt === 'int') {
    const b = new ArrayBuffer(4);
    new DataView(b).setInt32(0, parseInt(raw, 10), true);
    return new Uint8Array(b);
  }
  if (fmt === 'float') {
    const b = new ArrayBuffer(4);
    new DataView(b).setFloat32(0, parseFloat(raw), true);
    return new Uint8Array(b);
  }
  return new TextEncoder().encode(raw);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeRaw(rawArray) {
  const bytes = new Uint8Array(rawArray);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
  let str = '';
  try { str = new TextDecoder().decode(bytes); } catch {}
  const dv = new DataView(bytes.buffer);
  let num = null;
  if (bytes.length >= 4) num = dv.getInt32(0, true);
  else if (bytes.length >= 2) num = dv.getInt16(0, true);
  else if (bytes.length === 1) num = bytes[0];
  return { hex, str, num };
}

function rssiPercent(rssi) {
  return Math.max(0, Math.min(100, (rssi + 100) * 2));
}


// ── encodeValue ───────────────────────────────────────────────────────────────

describe('encodeValue', () => {
  it('encodes hex string 0x01 0x02', () => {
    const r = encodeValue('0x01 0x02', 'hex');
    expect(Array.from(r)).toEqual([1, 2]);
  });

  it('encodes hex without 0x prefix', () => {
    const r = encodeValue('AABB', 'hex');
    expect(Array.from(r)).toEqual([0xAA, 0xBB]);
  });

  it('encodes hex with spaces', () => {
    const r = encodeValue('01 02 03', 'hex');
    expect(Array.from(r)).toEqual([1, 2, 3]);
  });

  it('throws on odd-length hex', () => {
    expect(() => encodeValue('ABC', 'hex')).toThrow('Invalid hex');
  });

  it('throws on non-hex characters', () => {
    expect(() => encodeValue('ZZZZ', 'hex')).toThrow('Invalid hex');
  });

  it('encodes utf8 string', () => {
    const r = encodeValue('hello', 'utf8');
    expect(new TextDecoder().decode(r)).toBe('hello');
  });

  it('encodes utf8 arabic string', () => {
    const r = encodeValue('مرحبا', 'utf8');
    expect(new TextDecoder().decode(r)).toBe('مرحبا');
  });

  it('encodes int32 little-endian', () => {
    const r = encodeValue('1000', 'int');
    const val = new DataView(r.buffer).getInt32(0, true);
    expect(val).toBe(1000);
  });

  it('encodes negative int32', () => {
    const r = encodeValue('-500', 'int');
    const val = new DataView(r.buffer).getInt32(0, true);
    expect(val).toBe(-500);
  });

  it('encodes float32', () => {
    const r = encodeValue('3.14', 'float');
    const val = new DataView(r.buffer).getFloat32(0, true);
    expect(val).toBeCloseTo(3.14, 2);
  });

  it('falls back to utf8 for unknown format', () => {
    const r = encodeValue('test', 'unknown');
    expect(new TextDecoder().decode(r)).toBe('test');
  });

  it('encodes zero int', () => {
    const r = encodeValue('0', 'int');
    const val = new DataView(r.buffer).getInt32(0, true);
    expect(val).toBe(0);
  });

  it('encodes single byte hex', () => {
    const r = encodeValue('FF', 'hex');
    expect(Array.from(r)).toEqual([0xFF]);
  });
});


// ── decodeRaw ─────────────────────────────────────────────────────────────────

describe('decodeRaw', () => {
  it('decodes single byte', () => {
    const r = decodeRaw([42]);
    expect(r.num).toBe(42);
    expect(r.hex).toBe('2A');
  });

  it('decodes two bytes as int16', () => {
    const buf = new ArrayBuffer(2);
    new DataView(buf).setInt16(0, 1000, true);
    const r = decodeRaw(Array.from(new Uint8Array(buf)));
    expect(r.num).toBe(1000);
  });

  it('decodes four bytes as int32', () => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setInt32(0, 99999, true);
    const r = decodeRaw(Array.from(new Uint8Array(buf)));
    expect(r.num).toBe(99999);
  });

  it('decodes utf8 string', () => {
    const bytes = Array.from(new TextEncoder().encode('hi'));
    const r = decodeRaw(bytes);
    expect(r.str).toBe('hi');
  });

  it('hex is uppercase', () => {
    const r = decodeRaw([0xab, 0xcd]);
    expect(r.hex).toBe('AB CD');
  });

  it('empty array returns null num', () => {
    const r = decodeRaw([]);
    expect(r.num).toBeNull();
    expect(r.hex).toBe('');
  });
});


// ── esc (HTML escaping) ───────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quote', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  it('leaves safe text untouched', () => {
    expect(esc('Hello World 123')).toBe('Hello World 123');
  });

  it('coerces non-string to string', () => {
    expect(esc(42)).toBe('42');
  });

  it('escapes XSS attempt', () => {
    const input = '<img src=x onerror="alert(1)">';
    expect(esc(input)).not.toContain('<img');
    expect(esc(input)).toContain('&lt;img');
  });
});


// ── rssiPercent ───────────────────────────────────────────────────────────────

describe('rssiPercent', () => {
  it('-50 dBm = 100%', () => {
    expect(rssiPercent(-50)).toBe(100);
  });

  it('-100 dBm = 0%', () => {
    expect(rssiPercent(-100)).toBe(0);
  });

  it('-75 dBm = 50%', () => {
    expect(rssiPercent(-75)).toBe(50);
  });

  it('clamps above 100', () => {
    expect(rssiPercent(0)).toBe(100);
  });

  it('clamps below 0', () => {
    expect(rssiPercent(-200)).toBe(0);
  });
});


// ── chart stats accumulation ──────────────────────────────────────────────────

describe('chart stats', () => {
  let stats;
  beforeEach(() => { stats = { min: null, max: null, sum: 0, count: 0 }; });

  function pushStat(n) {
    stats.count++;
    stats.sum += n;
    if (stats.min === null || n < stats.min) stats.min = n;
    if (stats.max === null || n > stats.max) stats.max = n;
  }

  it('first value sets min and max', () => {
    pushStat(5);
    expect(stats.min).toBe(5);
    expect(stats.max).toBe(5);
  });

  it('avg is correct', () => {
    [10, 20, 30].forEach(pushStat);
    expect(stats.sum / stats.count).toBe(20);
  });

  it('min tracks lowest', () => {
    [5, 3, 8, 1].forEach(pushStat);
    expect(stats.min).toBe(1);
  });

  it('max tracks highest', () => {
    [5, 3, 8, 1].forEach(pushStat);
    expect(stats.max).toBe(8);
  });

  it('count increments correctly', () => {
    [1, 2, 3, 4, 5].forEach(pushStat);
    expect(stats.count).toBe(5);
  });

  it('handles negative values', () => {
    [-10, -5, -20].forEach(pushStat);
    expect(stats.min).toBe(-20);
    expect(stats.max).toBe(-5);
  });
});


// ── chart window sliding ──────────────────────────────────────────────────────

describe('chart window', () => {
  function slide(data, point, maxWindow) {
    data.push(point);
    if (data.length > maxWindow) data.shift();
    return data;
  }

  it('keeps at most maxWindow points', () => {
    let d = [];
    for (let i = 0; i < 10; i++) slide(d, i, 5);
    expect(d.length).toBe(5);
  });

  it('oldest points are dropped first', () => {
    let d = [];
    for (let i = 0; i < 5; i++) slide(d, i, 3);
    expect(d[0]).toBe(2);
    expect(d[2]).toBe(4);
  });

  it('does not drop when under window', () => {
    let d = [];
    for (let i = 0; i < 3; i++) slide(d, i, 10);
    expect(d.length).toBe(3);
  });
});


// ── WS message routing (logic only) ──────────────────────────────────────────

describe('WS message routing', () => {
  function route(type) {
    const routes = ['scan_result','notify','read_result','connected','disconnected','services','characteristics','error'];
    return routes.includes(type) ? type : 'unknown';
  }

  it('routes scan_result', () => expect(route('scan_result')).toBe('scan_result'));
  it('routes notify',      () => expect(route('notify')).toBe('notify'));
  it('routes read_result', () => expect(route('read_result')).toBe('read_result'));
  it('routes connected',   () => expect(route('connected')).toBe('connected'));
  it('routes disconnected',() => expect(route('disconnected')).toBe('disconnected'));
  it('returns unknown for garbage type', () => expect(route('bananas')).toBe('unknown'));
});


// ── device list filtering ─────────────────────────────────────────────────────

describe('device list filtering', () => {
  const devices = [
    { name: 'HeartRate', address: 'AA:BB:CC:DD:EE:FF', rssi: -55 },
    { name: 'TempSensor', address: '11:22:33:44:55:66', rssi: -80 },
    { name: '(unknown)', address: '00:00:00:00:00:00', rssi: -95 },
  ];

  function filterDevices(devs, nameFilter, rssiMin) {
    return devs.filter(d => {
      if (d.rssi < rssiMin) return false;
      if (nameFilter && !d.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }

  it('no filter returns all', () => {
    expect(filterDevices(devices, '', -100)).toHaveLength(3);
  });

  it('rssi filter removes weak devices', () => {
    expect(filterDevices(devices, '', -90)).toHaveLength(2);
  });

  it('name filter is case-insensitive', () => {
    expect(filterDevices(devices, 'heart', -100)).toHaveLength(1);
    expect(filterDevices(devices, 'HEART', -100)).toHaveLength(1);
  });

  it('combined filter works', () => {
    expect(filterDevices(devices, 'sensor', -85)).toHaveLength(1);
  });

  it('no match returns empty', () => {
    expect(filterDevices(devices, 'xyz', -100)).toHaveLength(0);
  });
});
