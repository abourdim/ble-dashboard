"""
test_logger.py — Unit tests for BLELogger (CSV + JSON Lines dual logging)
"""

import csv
import json
import pytest

pytestmark = pytest.mark.asyncio


# ── file creation ─────────────────────────────────────────────────────────────

def test_csv_file_created_on_init(tmp_logs, logger_both):
    from logger import CSV_PATH
    assert CSV_PATH.exists(), "CSV file should be created on init"

def test_json_file_created_on_init(tmp_logs, logger_both):
    from logger import JSON_PATH
    assert JSON_PATH.exists(), "JSONL file should be created on init"

def test_csv_only_mode_no_jsonl(tmp_logs, logger_csv):
    from logger import JSON_PATH
    assert not JSON_PATH.exists(), "JSONL should NOT be created in csv-only mode"

def test_json_only_mode_no_csv(tmp_logs, logger_json):
    from logger import CSV_PATH
    assert not CSV_PATH.exists(), "CSV should NOT be created in json-only mode"

def test_csv_has_header(tmp_logs, logger_both):
    from logger import CSV_PATH, CSV_FIELDS
    with open(CSV_PATH, newline="") as f:
        reader = csv.DictReader(f)
        assert reader.fieldnames == CSV_FIELDS


# ── log_event: both mode ──────────────────────────────────────────────────────

async def test_log_event_writes_csv(tmp_logs, logger_both):
    from logger import CSV_PATH
    await logger_both.log_event(
        direction="rx", event_type="read_result",
        characteristic="00002a37", hex_val="01 02", str_val="AB", num_val=1.5,
    )
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 1
    r = rows[0]
    assert r["direction"] == "rx"
    assert r["type"] == "read_result"
    assert r["hex"] == "01 02"
    assert r["str_val"] == "AB"
    assert r["num_val"] == "1.5"

async def test_log_event_writes_jsonl(tmp_logs, logger_both):
    from logger import JSON_PATH
    await logger_both.log_event(
        direction="tx", event_type="write_ok",
        characteristic="00002a37", extra={"bytes": 4},
    )
    lines = JSON_PATH.read_text().strip().splitlines()
    assert len(lines) == 1
    rec = json.loads(lines[0])
    assert rec["dir"] == "tx"
    assert rec["type"] == "write_ok"
    assert rec["bytes"] == 4

async def test_log_event_multiple_entries(tmp_logs, logger_both):
    from logger import JSON_PATH
    for i in range(5):
        await logger_both.log_event(direction="info", event_type="connected", device=f"dev{i}")
    lines = JSON_PATH.read_text().strip().splitlines()
    assert len(lines) == 5

async def test_num_val_none_stored_as_empty_in_csv(tmp_logs, logger_both):
    from logger import CSV_PATH
    await logger_both.log_event(direction="info", event_type="connected")
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    assert rows[0]["num_val"] == ""

async def test_timestamp_present_in_csv(tmp_logs, logger_both):
    from logger import CSV_PATH
    await logger_both.log_event(direction="rx", event_type="notify")
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    assert rows[0]["timestamp"]  # non-empty ISO timestamp


# ── csv-only mode ─────────────────────────────────────────────────────────────

async def test_csv_only_writes_csv_not_json(tmp_logs, logger_csv):
    from logger import CSV_PATH, JSON_PATH
    await logger_csv.log_event(direction="rx", event_type="notify")
    with open(CSV_PATH, newline="") as f:
        assert len(list(csv.DictReader(f))) == 1
    assert not JSON_PATH.exists()


# ── json-only mode ────────────────────────────────────────────────────────────

async def test_json_only_writes_json_not_csv(tmp_logs, logger_json):
    from logger import CSV_PATH, JSON_PATH
    await logger_json.log_event(direction="rx", event_type="notify")
    lines = JSON_PATH.read_text().strip().splitlines()
    assert len(lines) == 1
    assert not CSV_PATH.exists()


# ── read helpers ──────────────────────────────────────────────────────────────

async def test_read_csv_returns_text(tmp_logs, logger_both):
    await logger_both.log_event(direction="rx", event_type="notify", hex_val="FF")
    content = logger_both.read_csv()
    assert "FF" in content
    assert "timestamp" in content

async def test_read_json_returns_text(tmp_logs, logger_both):
    await logger_both.log_event(direction="rx", event_type="notify", hex_val="AA BB")
    content = logger_both.read_json()
    assert "AA BB" in content

def test_read_csv_returns_empty_when_no_file(tmp_logs):
    from logger import BLELogger, CSV_PATH
    CSV_PATH.unlink(missing_ok=True)
    lg = BLELogger.__new__(BLELogger)
    lg.log_format = "csv"
    assert lg.read_csv() == ""

def test_read_json_returns_empty_when_no_file(tmp_logs):
    from logger import BLELogger, JSON_PATH
    JSON_PATH.unlink(missing_ok=True)
    lg = BLELogger.__new__(BLELogger)
    assert lg.read_json() == ""


# ── set_format ────────────────────────────────────────────────────────────────

def test_set_format_changes_mode(tmp_logs, logger_both):
    logger_both.set_format("csv")
    assert logger_both.log_format == "csv"

async def test_set_format_csv_then_log_no_json(tmp_logs, logger_both):
    from logger import JSON_PATH
    logger_both.set_format("csv")
    JSON_PATH.unlink(missing_ok=True)
    await logger_both.log_event(direction="rx", event_type="notify")
    assert not JSON_PATH.exists()


# ── unicode + special chars ───────────────────────────────────────────────────

async def test_unicode_str_val(tmp_logs, logger_both):
    from logger import JSON_PATH
    await logger_both.log_event(direction="rx", event_type="notify", str_val="مرحبا")
    rec = json.loads(JSON_PATH.read_text().strip())
    assert rec["str"] == "مرحبا"

async def test_extra_dict_stored_as_json(tmp_logs, logger_both):
    from logger import CSV_PATH
    await logger_both.log_event(direction="tx", event_type="write_ok", extra={"bytes": 8, "uuid": "abc"})
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    extra = json.loads(rows[0]["extra"])
    assert extra["bytes"] == 8
    assert extra["uuid"] == "abc"
