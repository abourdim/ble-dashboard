"""
main.py — BLE Dashboard Backend  v1.0
FastAPI + WebSocket + bleak + dual logger

Usage:
    cd backend
    pip install -r requirements.txt
    python main.py

Open http://localhost:8000 in Chrome or Edge.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from ble_manager import BLEManager
from hackrf_manager import HackRFManager
from logger import BLELogger, CSV_FIELDS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="BLE Dashboard", version="1.0.0")

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
LOG_FORMAT   = os.environ.get("BLE_LOG_FORMAT", "both")   # csv | json | both

ble_logger  = BLELogger(LOG_FORMAT)
ble_manager: BLEManager = None       # created once on first WS connection
hackrf_mgr: HackRFManager = None     # created on first SDR request
active_ws: List[WebSocket] = []      # all connected browser clients


# ── broadcast ─────────────────────────────────────────────────────────────────
async def broadcast(event: dict):
    """Forward BLE event to all WS clients and persist to log."""
    etype = event.get("type", "")

    # selective logging
    if etype in ("notify", "read_result"):
        await ble_logger.log_event(
            direction="rx", event_type=etype,
            characteristic=event.get("characteristic", ""),
            hex_val=event.get("hex", ""),
            str_val=event.get("str", ""),
            num_val=event.get("num"),
        )
    elif etype == "write_ok":
        await ble_logger.log_event(
            direction="tx", event_type=etype,
            characteristic=event.get("characteristic", ""),
            extra={"bytes": event.get("bytes", 0)},
        )
    elif etype in ("connected", "disconnected"):
        await ble_logger.log_event(
            direction="info", event_type=etype,
            device=event.get("name") or event.get("address", ""),
        )

    # send to browsers
    dead = []
    msg  = json.dumps(event)
    for ws in active_ws:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_ws:
            active_ws.remove(ws)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    active_ws.append(ws)
    logger.info("WS client connected  (total: %d)", len(active_ws))

    global ble_manager
    if ble_manager is None:
        ble_manager = BLEManager(notify_callback=broadcast)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue
            await _handle(msg, ws)

    except WebSocketDisconnect:
        if ws in active_ws:
            active_ws.remove(ws)
        logger.info("WS client disconnected (total: %d)", len(active_ws))


async def _handle(msg: dict, ws: WebSocket):
    t = msg.get("type", "")

    if t == "hello":
        await ws.send_text(json.dumps({
            "type": "hello_ack",
            "server": "BLE Dashboard",
            "version": "1.0.0",
            "connected": ble_manager.connected,
        }))

    elif t == "scan":
        asyncio.create_task(ble_manager.scan(
            duration=float(msg.get("duration", 5)),
            name_filter=msg.get("name_filter", ""),
            rssi_min=int(msg.get("rssi_min", -100)),
        ))

    elif t == "scan_stop":
        await ble_manager.stop_scan()

    elif t == "connect":
        asyncio.create_task(ble_manager.connect(
            address=msg.get("address", ""),
            name=msg.get("name", ""),
        ))

    elif t == "disconnect":
        asyncio.create_task(ble_manager.disconnect())

    elif t == "discover":
        asyncio.create_task(ble_manager.discover_services())

    elif t == "get_characteristics":
        asyncio.create_task(ble_manager.get_characteristics(msg.get("service", "")))

    elif t == "read":
        asyncio.create_task(ble_manager.read(msg.get("characteristic", "")))

    elif t == "write":
        asyncio.create_task(ble_manager.write(
            char_uuid=msg.get("characteristic", ""),
            value=bytes(msg.get("value", [])),
            no_response=bool(msg.get("no_response", False)),
        ))

    elif t == "subscribe":
        asyncio.create_task(ble_manager.subscribe(msg.get("characteristic", "")))

    elif t == "unsubscribe":
        asyncio.create_task(ble_manager.unsubscribe(msg.get("characteristic", "")))

    elif t == "conn_info":
        asyncio.create_task(ble_manager.get_conn_info())

    elif t == "read_descriptors":
        asyncio.create_task(ble_manager.read_descriptors(msg.get("characteristic", "")))

    elif t == "set_log_format":
        fmt = msg.get("format", "both")
        ble_logger.set_format(fmt)
        await ws.send_text(json.dumps({"type": "log_format_ok", "format": fmt}))

    # ── SDR / HackRF ──
    elif t == "sdr_start":
        global hackrf_mgr
        if hackrf_mgr is None:
            hackrf_mgr = HackRFManager(notify_callback=broadcast)
        asyncio.create_task(hackrf_mgr.start_sweep(
            simulate=bool(msg.get("simulate", True)),
        ))

    elif t == "sdr_stop":
        if hackrf_mgr:
            asyncio.create_task(hackrf_mgr.stop_sweep())

    else:
        logger.warning("Unknown WS type: %s", t)
        await ws.send_text(json.dumps({"type": "error", "message": f"Unknown: {t}"}))


# ── REST API ──────────────────────────────────────────────────────────────────
@app.get("/api/status")
async def api_status():
    return {
        "connected": ble_manager.connected if ble_manager else False,
        "log_format": LOG_FORMAT,
        "version": "1.0.0",
    }

@app.get("/api/logs/csv", response_class=PlainTextResponse)
async def get_csv():
    return ble_logger.read_csv()

@app.get("/api/logs/json", response_class=PlainTextResponse)
async def get_json():
    return ble_logger.read_json()

@app.delete("/api/logs")
async def clear_logs():
    import csv as _csv
    from logger import CSV_PATH, JSON_PATH
    if CSV_PATH.exists():
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            _csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()
    if JSON_PATH.exists():
        JSON_PATH.write_text("")
    return {"status": "cleared"}

@app.post("/api/log_format/{fmt}")
async def set_log_format(fmt: str):
    if fmt not in ("csv", "json", "both"):
        return JSONResponse({"error": "Use: csv | json | both"}, status_code=400)
    ble_logger.set_format(fmt)
    return {"log_format": fmt}


# ── static frontend ───────────────────────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    @app.get("/")
    async def root():
        return {"message": "Frontend not found. Place frontend/ next to backend/."}


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("BLE_PORT", 8000)), reload=False, log_level="info")
