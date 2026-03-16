"""
conftest.py — shared pytest fixtures for BLE Dashboard tests
"""

import asyncio
import csv
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

# ── make backend importable ───────────────────────────────────────────────────
BACKEND = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

# ── always use asyncio event loop ─────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ── temporary log directory ───────────────────────────────────────────────────
@pytest.fixture
def tmp_logs(tmp_path, monkeypatch):
    """Redirect logger file paths to a temp dir for isolation."""
    import logger as lg
    monkeypatch.setattr(lg, "LOGS_DIR",  tmp_path)
    monkeypatch.setattr(lg, "CSV_PATH",  tmp_path / "ble_log.csv")
    monkeypatch.setattr(lg, "JSON_PATH", tmp_path / "ble_log.jsonl")
    return tmp_path


# ── BLELogger instances ───────────────────────────────────────────────────────
@pytest.fixture
def logger_both(tmp_logs):
    from logger import BLELogger
    return BLELogger("both")

@pytest.fixture
def logger_csv(tmp_logs):
    from logger import BLELogger
    return BLELogger("csv")

@pytest.fixture
def logger_json(tmp_logs):
    from logger import BLELogger
    return BLELogger("json")


# ── mock async callback ───────────────────────────────────────────────────────
@pytest.fixture
def cb():
    """Async callback that records every call."""
    calls = []
    async def _cb(event):
        calls.append(event)
    _cb.calls = calls
    return _cb


# ── mock BleakClient ─────────────────────────────────────────────────────────
@pytest.fixture
def mock_client():
    client = MagicMock()
    client.is_connected = True
    client.address = "AA:BB:CC:DD:EE:FF"
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.read_gatt_char = AsyncMock(return_value=bytes([0x01, 0x02]))
    client.write_gatt_char = AsyncMock()
    client.start_notify = AsyncMock()
    client.stop_notify = AsyncMock()

    # services mock — use MagicMock so we can attach get_service
    svc = MagicMock()
    svc.uuid = "0000180d-0000-1000-8000-00805f9b34fb"
    svc.description = "Heart Rate"
    char = MagicMock()
    char.uuid = "00002a37-0000-1000-8000-00805f9b34fb"
    char.description = "Heart Rate Measurement"
    char.properties = ["read", "notify"]
    svc.characteristics = [char]
    services_mock = MagicMock()
    services_mock.__iter__ = MagicMock(return_value=iter([svc]))
    services_mock.get_service = MagicMock(return_value=svc)
    client.services = services_mock
    return client


# ── mock BleakScanner ────────────────────────────────────────────────────────
@pytest.fixture
def mock_scanner():
    """Returns a factory; call it to get a patched scanner context."""
    def _make(devices):
        class FakeScanner:
            def __init__(self, detection_callback=None, **kw):
                self._cb = detection_callback
                self.devices = devices
            async def __aenter__(self):
                for dev, adv in self.devices:
                    if self._cb:
                        self._cb(dev, adv)
                return self
            async def __aexit__(self, *a): pass
        return FakeScanner
    return _make


# ── FastAPI test client ───────────────────────────────────────────────────────
@pytest.fixture
def api_client(tmp_logs):
    """HTTPX async test client wired to the FastAPI app."""
    from httpx import AsyncClient, ASGITransport
    import main as m
    # reset global state
    m.ble_manager = None
    m.active_ws.clear()
    return AsyncClient(transport=ASGITransport(app=m.app), base_url="http://test")
