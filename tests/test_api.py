"""
test_api.py — Integration tests for FastAPI REST endpoints + WebSocket protocol.
BLEManager is fully mocked; no Bluetooth hardware required.
"""

import csv
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

BACKEND = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

pytestmark = pytest.mark.asyncio


# ── helpers ───────────────────────────────────────────────────────────────────

async def get_client(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    return AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test")


# ── GET /api/status ───────────────────────────────────────────────────────────

async def test_status_returns_200(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/status")
    assert r.status_code == 200

async def test_status_has_version(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/status")
    assert r.json()["version"] == "1.0.0"

async def test_status_connected_false_initially(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/status")
    assert r.json()["connected"] is False

async def test_status_has_log_format(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/status")
    assert "log_format" in r.json()


# ── GET /api/logs/csv ─────────────────────────────────────────────────────────

async def test_get_csv_returns_200(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/logs/csv")
    assert r.status_code == 200

async def test_get_csv_contains_header(tmp_logs):
    import main as m
    from logger import BLELogger
    import logger as lg
    lg.LOGS_DIR = tmp_logs; lg.CSV_PATH = tmp_logs / "ble_log.csv"; lg.JSON_PATH = tmp_logs / "ble_log.jsonl"
    m.ble_logger = BLELogger("both")
    m.ble_manager = None; m.active_ws.clear()
    async with AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test") as c:
        r = await c.get("/api/logs/csv")
    assert "timestamp" in r.text

async def test_get_csv_after_event_contains_data(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    await m.ble_logger.log_event(direction="rx", event_type="notify", hex_val="AABB")
    async with AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test") as c:
        r = await c.get("/api/logs/csv")
    assert "AABB" in r.text


# ── GET /api/logs/json ────────────────────────────────────────────────────────

async def test_get_json_returns_200(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.get("/api/logs/json")
    assert r.status_code == 200

async def test_get_json_after_event_contains_data(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    await m.ble_logger.log_event(direction="tx", event_type="write_ok", characteristic="abc123")
    async with AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test") as c:
        r = await c.get("/api/logs/json")
    assert "abc123" in r.text


# ── DELETE /api/logs ──────────────────────────────────────────────────────────

async def test_delete_logs_returns_200(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.delete("/api/logs")
    assert r.status_code == 200

async def test_delete_logs_clears_csv(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    await m.ble_logger.log_event(direction="rx", event_type="notify")
    async with AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test") as c:
        await c.delete("/api/logs")
        r = await c.get("/api/logs/csv")
    lines = [l for l in r.text.strip().splitlines() if l]
    assert len(lines) == 1  # only header remains

async def test_delete_logs_clears_json(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    await m.ble_logger.log_event(direction="rx", event_type="notify")
    async with AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test") as c:
        await c.delete("/api/logs")
        r = await c.get("/api/logs/json")
    assert r.text.strip() == ""


# ── POST /api/log_format/{fmt} ────────────────────────────────────────────────

async def test_set_log_format_both(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.post("/api/log_format/both")
    assert r.status_code == 200
    assert r.json()["log_format"] == "both"

async def test_set_log_format_csv(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.post("/api/log_format/csv")
    assert r.json()["log_format"] == "csv"

async def test_set_log_format_json(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.post("/api/log_format/json")
    assert r.json()["log_format"] == "json"

async def test_set_log_format_invalid_returns_400(tmp_logs):
    async with await get_client(tmp_logs) as c:
        r = await c.post("/api/log_format/xml")
    assert r.status_code == 400


# ── WebSocket helpers (starlette TestClient — sync WS API) ───────────────────
# httpx.AsyncClient does not support WebSocket; use starlette's sync TestClient.

def _ws_send_recv(app, payload: str) -> dict:
    """Connect, send one message, return the first reply."""
    from starlette.testclient import TestClient
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(payload)
            return json.loads(ws.receive_text())


# ── WebSocket: hello handshake ────────────────────────────────────────────────

def test_ws_hello_ack(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    msg = _ws_send_recv(m.app, json.dumps({"type": "hello", "version": "1.0"}))
    assert msg["type"] == "hello_ack"
    assert msg["version"] == "1.0.0"

def test_ws_hello_ack_has_connected(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    msg = _ws_send_recv(m.app, json.dumps({"type": "hello"}))
    assert "connected" in msg


# ── WebSocket: invalid JSON ───────────────────────────────────────────────────

def test_ws_invalid_json_returns_error(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    msg = _ws_send_recv(m.app, "not json at all }{")
    assert msg["type"] == "error"
    assert "Invalid JSON" in msg["message"]


# ── WebSocket: unknown type ───────────────────────────────────────────────────

def test_ws_unknown_type_returns_error(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    msg = _ws_send_recv(m.app, json.dumps({"type": "does_not_exist"}))
    assert msg["type"] == "error"


# ── WebSocket: set_log_format ─────────────────────────────────────────────────

def test_ws_set_log_format(tmp_logs):
    import main as m
    m.ble_manager = None
    m.active_ws.clear()
    msg = _ws_send_recv(m.app, json.dumps({"type": "set_log_format", "format": "csv"}))
    assert msg["type"] == "log_format_ok"
    assert msg["format"] == "csv"


# ── WebSocket: scan dispatched ────────────────────────────────────────────────

def test_ws_scan_dispatches_task(tmp_logs):
    import main as m
    import asyncio
    m.ble_manager = None
    m.active_ws.clear()

    from starlette.testclient import TestClient
    with TestClient(m.app) as client:
        with client.websocket_connect("/ws") as ws:
            # patch scan after manager is initialised by WS connection
            async def fake_scan(**kw):
                await m.broadcast({"type": "scan_result", "devices": []})
            m.ble_manager.scan = fake_scan
            ws.send_text(json.dumps({"type": "scan", "duration": 0.01}))
            msg = json.loads(ws.receive_text())
    assert msg["type"] == "scan_result"


# ── broadcast: logging side-effects ──────────────────────────────────────────

def _reset_main(tmp_logs):
    """Reset main module globals and point logger at tmp dir."""
    import main as m
    from logger import BLELogger
    import logger as lg
    lg.LOGS_DIR  = tmp_logs
    lg.CSV_PATH  = tmp_logs / "ble_log.csv"
    lg.JSON_PATH = tmp_logs / "ble_log.jsonl"
    m.ble_logger = BLELogger("both")
    m.ble_manager = None
    m.active_ws.clear()
    return m

async def test_broadcast_logs_notify(tmp_logs):
    m = _reset_main(tmp_logs)
    await m.broadcast({"type": "notify", "characteristic": "uuid1", "hex": "AA", "str": "", "num": 1.0})
    assert "uuid1" in m.ble_logger.read_json()

async def test_broadcast_logs_write_ok(tmp_logs):
    m = _reset_main(tmp_logs)
    await m.broadcast({"type": "write_ok", "characteristic": "uuid2", "bytes": 4})
    assert "write_ok" in m.ble_logger.read_json()

async def test_broadcast_logs_connected(tmp_logs):
    m = _reset_main(tmp_logs)
    await m.broadcast({"type": "connected", "name": "MyDevice", "address": "AA:BB:CC:DD:EE:FF"})
    assert "MyDevice" in m.ble_logger.read_json()

async def test_broadcast_removes_dead_ws(tmp_logs):
    m = _reset_main(tmp_logs)
    dead = MagicMock()
    dead.send_text = AsyncMock(side_effect=Exception("closed"))
    m.active_ws.append(dead)
    await m.broadcast({"type": "scan_result", "devices": []})
    assert dead not in m.active_ws
