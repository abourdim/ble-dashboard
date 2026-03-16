"""
test_ble_manager.py — BLEManager tests with bleak fully mocked.
No real Bluetooth hardware required.
"""

import asyncio
import struct
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio

# ── _decode helper ────────────────────────────────────────────────────────────

def test_decode_empty():
    from ble_manager import _decode
    r = _decode(b"")
    assert r["hex"] == ""
    assert r["str"] == ""
    assert r["num"] is None

def test_decode_single_byte():
    from ble_manager import _decode
    r = _decode(bytes([42]))
    assert r["num"] == 42
    assert "2A" in r["hex"]

def test_decode_two_bytes_int16():
    from ble_manager import _decode
    data = struct.pack("<h", 1000)
    r = _decode(data)
    assert r["num"] == 1000

def test_decode_four_bytes_float():
    from ble_manager import _decode
    data = struct.pack("<f", 3.14)
    r = _decode(data)
    assert abs(r["num"] - 3.14) < 0.001

def test_decode_utf8_string():
    from ble_manager import _decode
    data = "hello".encode("utf-8")
    r = _decode(data)
    assert r["str"] == "hello"

def test_decode_non_utf8_fallback():
    from ble_manager import _decode
    r = _decode(bytes([0xFF, 0xFE]))
    assert r["str"] == ""      # invalid UTF-8 → empty string

def test_decode_hex_format():
    from ble_manager import _decode
    r = _decode(bytes([0xAB, 0xCD]))
    assert "AB" in r["hex"]
    assert "CD" in r["hex"]

def test_decode_large_bytes_uses_int32():
    from ble_manager import _decode
    data = struct.pack("<i", -500) + b"\x00"   # 5 bytes → falls to >=4 branch
    r = _decode(data)
    assert r["num"] == -500


# ── BLEManager.connected ──────────────────────────────────────────────────────

async def test_connected_false_when_no_client(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    assert mgr.connected is False

async def test_connected_true_when_client_connected(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    assert mgr.connected is True

async def test_connected_false_when_client_disconnected(cb, mock_client):
    from ble_manager import BLEManager
    mock_client.is_connected = False
    mgr = BLEManager(cb)
    mgr._client = mock_client
    assert mgr.connected is False


# ── BLEManager.scan ───────────────────────────────────────────────────────────

async def test_scan_returns_devices(cb, mock_scanner):
    from ble_manager import BLEManager
    from bleak.backends.device import BLEDevice

    dev = MagicMock(spec=BLEDevice)
    dev.name = "TestSensor"
    dev.address = "AA:BB:CC:DD:EE:FF"

    adv = MagicMock()
    adv.rssi = -60
    adv.local_name = "TestSensor"

    FakeScanner = mock_scanner([(dev, adv)])
    with patch("ble_manager.BleakScanner", FakeScanner):
        mgr = BLEManager(cb)
        result = await mgr.scan(duration=0.01)

    assert len(result) == 1
    assert result[0]["name"] == "TestSensor"
    assert result[0]["rssi"] == -60

async def test_scan_emits_scan_result_callback(cb, mock_scanner):
    from ble_manager import BLEManager
    dev = MagicMock(); dev.name = "Dev1"; dev.address = "11:22:33:44:55:66"
    adv = MagicMock(); adv.rssi = -70; adv.local_name = "Dev1"
    with patch("ble_manager.BleakScanner", mock_scanner([(dev, adv)])):
        mgr = BLEManager(cb)
        await mgr.scan(duration=0.01)
    assert any(e["type"] == "scan_result" for e in cb.calls)

async def test_scan_filters_by_rssi(cb, mock_scanner):
    from ble_manager import BLEManager
    dev = MagicMock(); dev.name = "Weak"; dev.address = "AA:AA:AA:AA:AA:AA"
    adv = MagicMock(); adv.rssi = -95; adv.local_name = "Weak"
    with patch("ble_manager.BleakScanner", mock_scanner([(dev, adv)])):
        mgr = BLEManager(cb)
        result = await mgr.scan(duration=0.01, rssi_min=-90)
    assert result == []

async def test_scan_filters_by_name(cb, mock_scanner):
    from ble_manager import BLEManager
    dev = MagicMock(); dev.name = "HeartRate"; dev.address = "BB:BB:BB:BB:BB:BB"
    adv = MagicMock(); adv.rssi = -60; adv.local_name = "HeartRate"
    with patch("ble_manager.BleakScanner", mock_scanner([(dev, adv)])):
        mgr = BLEManager(cb)
        result = await mgr.scan(duration=0.01, name_filter="temp")
    assert result == []

async def test_scan_no_filter_returns_all(cb, mock_scanner):
    from ble_manager import BLEManager
    devs = []
    for i in range(3):
        dev = MagicMock(); dev.name = f"Dev{i}"; dev.address = f"0{i}:00:00:00:00:00"
        adv = MagicMock(); adv.rssi = -50; adv.local_name = f"Dev{i}"
        devs.append((dev, adv))
    with patch("ble_manager.BleakScanner", mock_scanner(devs)):
        mgr = BLEManager(cb)
        result = await mgr.scan(duration=0.01)
    assert len(result) == 3

async def test_scan_deduplicates_by_address(cb, mock_scanner):
    from ble_manager import BLEManager
    dev = MagicMock(); dev.name = "Dup"; dev.address = "AA:BB:CC:DD:EE:FF"
    adv = MagicMock(); adv.rssi = -60; adv.local_name = "Dup"
    with patch("ble_manager.BleakScanner", mock_scanner([(dev, adv), (dev, adv)])):
        mgr = BLEManager(cb)
        result = await mgr.scan(duration=0.01)
    assert len(result) == 1


# ── BLEManager.connect ────────────────────────────────────────────────────────

async def test_connect_success(cb, mock_client):
    from ble_manager import BLEManager
    with patch("ble_manager.BleakClient", return_value=mock_client):
        mgr = BLEManager(cb)
        ok = await mgr.connect("AA:BB:CC:DD:EE:FF", "TestDev")
    assert ok is True
    assert any(e["type"] == "connected" for e in cb.calls)

async def test_connect_sets_client(cb, mock_client):
    from ble_manager import BLEManager
    with patch("ble_manager.BleakClient", return_value=mock_client):
        mgr = BLEManager(cb)
        await mgr.connect("AA:BB:CC:DD:EE:FF")
    assert mgr._client is mock_client

async def test_connect_failure_emits_error(cb):
    from ble_manager import BLEManager
    bad_client = MagicMock()
    bad_client.connect = AsyncMock(side_effect=Exception("No device"))
    with patch("ble_manager.BleakClient", return_value=bad_client):
        mgr = BLEManager(cb)
        ok = await mgr.connect("AA:BB:CC:DD:EE:FF")
    assert ok is False
    assert any(e["type"] == "error" for e in cb.calls)

async def test_connect_connected_property_true_after(cb, mock_client):
    from ble_manager import BLEManager
    with patch("ble_manager.BleakClient", return_value=mock_client):
        mgr = BLEManager(cb)
        await mgr.connect("AA:BB:CC:DD:EE:FF")
    assert mgr.connected is True


# ── BLEManager.disconnect ─────────────────────────────────────────────────────

async def test_disconnect_calls_client(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.disconnect()
    mock_client.disconnect.assert_called_once()

async def test_disconnect_clears_client(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.disconnect()
    assert mgr._client is None

async def test_disconnect_when_not_connected_safe(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    await mgr.disconnect()   # no error expected


# ── BLEManager.discover_services ─────────────────────────────────────────────

async def test_discover_not_connected_emits_error(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    result = await mgr.discover_services()
    assert result == []
    assert any(e["type"] == "error" for e in cb.calls)

async def test_discover_returns_services(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    result = await mgr.discover_services()
    assert len(result) == 1
    assert result[0]["uuid"] == "0000180d-0000-1000-8000-00805f9b34fb"
    assert any(e["type"] == "services" for e in cb.calls)

async def test_discover_includes_characteristics(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    result = await mgr.discover_services()
    assert len(result[0]["characteristics"]) == 1
    assert result[0]["characteristics"][0]["uuid"] == "00002a37-0000-1000-8000-00805f9b34fb"


# ── BLEManager.read ───────────────────────────────────────────────────────────

async def test_read_not_connected_returns_none(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    result = await mgr.read("00002a37")
    assert result is None

async def test_read_returns_bytes(cb, mock_client):
    from ble_manager import BLEManager
    mock_client.read_gatt_char = AsyncMock(return_value=bytes([0x01, 0x02]))
    mgr = BLEManager(cb)
    mgr._client = mock_client
    result = await mgr.read("00002a37")
    assert result == bytes([0x01, 0x02])

async def test_read_emits_read_result(cb, mock_client):
    from ble_manager import BLEManager
    mock_client.read_gatt_char = AsyncMock(return_value=bytes([0x2A]))
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.read("00002a37")
    events = [e for e in cb.calls if e["type"] == "read_result"]
    assert len(events) == 1
    assert events[0]["raw"] == [0x2A]

async def test_read_error_emits_error_event(cb, mock_client):
    from ble_manager import BLEManager
    mock_client.read_gatt_char = AsyncMock(side_effect=Exception("GATT error"))
    mgr = BLEManager(cb)
    mgr._client = mock_client
    result = await mgr.read("00002a37")
    assert result is None
    assert any(e["type"] == "error" for e in cb.calls)


# ── BLEManager.write ──────────────────────────────────────────────────────────

async def test_write_not_connected_returns_false(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    result = await mgr.write("uuid", b"\x01")
    assert result is False

async def test_write_success(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    ok = await mgr.write("00002a37", b"\xAA\xBB")
    assert ok is True
    mock_client.write_gatt_char.assert_called_once()

async def test_write_emits_write_ok(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.write("00002a37", b"\x01\x02\x03")
    events = [e for e in cb.calls if e["type"] == "write_ok"]
    assert len(events) == 1
    assert events[0]["bytes"] == 3

async def test_write_no_response_flag(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.write("uuid", b"\x01", no_response=True)
    call_kwargs = mock_client.write_gatt_char.call_args
    assert call_kwargs.kwargs.get("response") is False or call_kwargs.args[-1] is False

async def test_write_error_emits_error(cb, mock_client):
    from ble_manager import BLEManager
    mock_client.write_gatt_char = AsyncMock(side_effect=Exception("write fail"))
    mgr = BLEManager(cb)
    mgr._client = mock_client
    ok = await mgr.write("uuid", b"\x01")
    assert ok is False
    assert any(e["type"] == "error" for e in cb.calls)


# ── BLEManager.subscribe ─────────────────────────────────────────────────────

async def test_subscribe_not_connected_safe(cb):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    await mgr.subscribe("uuid")   # no error expected

async def test_subscribe_calls_start_notify(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.subscribe("00002a37")
    mock_client.start_notify.assert_called_once()

async def test_subscribe_emits_subscribed(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.subscribe("00002a37")
    assert any(e["type"] == "subscribed" for e in cb.calls)

async def test_subscribe_tracks_in_subs(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.subscribe("00002a37")
    assert "00002a37" in mgr._subs


# ── BLEManager.unsubscribe ────────────────────────────────────────────────────

async def test_unsubscribe_calls_stop_notify(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    mgr._subs["00002a37"] = True
    await mgr.unsubscribe("00002a37")
    mock_client.stop_notify.assert_called_once()

async def test_unsubscribe_removes_from_subs(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    mgr._subs["00002a37"] = True
    await mgr.unsubscribe("00002a37")
    assert "00002a37" not in mgr._subs

async def test_unsubscribe_emits_unsubscribed(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    mgr._subs["00002a37"] = True
    await mgr.unsubscribe("00002a37")
    assert any(e["type"] == "unsubscribed" for e in cb.calls)

async def test_unsubscribe_not_subscribed_safe(cb, mock_client):
    from ble_manager import BLEManager
    mgr = BLEManager(cb)
    mgr._client = mock_client
    await mgr.unsubscribe("unknown-uuid")   # no error
    mock_client.stop_notify.assert_not_called()
