"""
logger.py — Dual CSV + JSON Lines logger for BLE events.
Async-safe. Writes to /logs/ble_log.csv and /logs/ble_log.jsonl
"""

import asyncio
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

LOGS_DIR  = Path(__file__).parent.parent / "logs"
CSV_PATH  = LOGS_DIR / "ble_log.csv"
JSON_PATH = LOGS_DIR / "ble_log.jsonl"

CSV_FIELDS = [
    "timestamp", "direction", "type",
    "device", "characteristic",
    "hex", "str_val", "num_val", "extra",
]


class BLELogger:
    def __init__(self, log_format: str = "both"):
        """log_format: 'csv' | 'json' | 'both'"""
        self.log_format = log_format
        self._lock = asyncio.Lock()
        self._ensure_files()

    def _ensure_files(self):
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        if self.log_format in ("csv", "both") and not CSV_PATH.exists():
            with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
                csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()
        if self.log_format in ("json", "both") and not JSON_PATH.exists():
            JSON_PATH.touch()

    async def log_event(
        self,
        direction: str,
        event_type: str,
        device: str = "",
        characteristic: str = "",
        hex_val: str = "",
        str_val: str = "",
        num_val: Optional[float] = None,
        extra: Optional[dict] = None,
    ):
        ts = datetime.now(timezone.utc).isoformat()
        csv_row = {
            "timestamp": ts, "direction": direction, "type": event_type,
            "device": device, "characteristic": characteristic,
            "hex": hex_val, "str_val": str_val,
            "num_val": "" if num_val is None else str(num_val),
            "extra": json.dumps(extra or {}),
        }
        json_record = {
            "ts": ts, "dir": direction, "type": event_type,
            "device": device, "char": characteristic,
            "hex": hex_val, "str": str_val, "num": num_val,
            **(extra or {}),
        }
        async with self._lock:
            if self.log_format in ("csv", "both"):
                await asyncio.to_thread(self._write_csv, csv_row)
            if self.log_format in ("json", "both"):
                await asyncio.to_thread(self._write_json, json_record)

    def set_format(self, fmt: str):
        self.log_format = fmt
        self._ensure_files()

    def read_csv(self) -> str:
        return CSV_PATH.read_text(encoding="utf-8") if CSV_PATH.exists() else ""

    def read_json(self) -> str:
        return JSON_PATH.read_text(encoding="utf-8") if JSON_PATH.exists() else ""

    def _write_csv(self, row: dict):
        with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=CSV_FIELDS).writerow(row)

    def _write_json(self, record: dict):
        with open(JSON_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
