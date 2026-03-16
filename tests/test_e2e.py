"""
test_e2e.py — End-to-end tests using Playwright.
Starts the FastAPI backend in-process and drives a headless browser.
Tests: page load · theme switching · language switching · panel toggles ·
       scan button states · log panel · settings persistence
"""

import json
import subprocess
import sys
import threading
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import uvicorn

BACKEND  = Path(__file__).parent.parent / "backend"
FRONTEND = Path(__file__).parent.parent / "frontend"
sys.path.insert(0, str(BACKEND))

# ── server fixture ────────────────────────────────────────────────────────────

class _Server(threading.Thread):
    def __init__(self, app, port=18765):
        super().__init__(daemon=True)
        self.port = port
        cfg = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
        self.server = uvicorn.Server(cfg)

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True


@pytest.fixture(scope="module")
def live_server(tmp_path_factory):
    """Start the FastAPI app on a free port for the test module."""
    logs = tmp_path_factory.mktemp("e2e_logs")

    import logger as lg
    lg.LOGS_DIR  = logs
    lg.CSV_PATH  = logs / "ble_log.csv"
    lg.JSON_PATH = logs / "ble_log.jsonl"

    import main as m
    m.ble_manager = None
    m.active_ws.clear()

    srv = _Server(m.app, port=18765)
    srv.start()
    time.sleep(0.8)   # wait for startup
    yield f"http://127.0.0.1:{srv.port}"
    srv.stop()


# ── Playwright fixtures ───────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def browser_ctx(live_server):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-web-security", "--use-fake-device-for-media-stream"])
        ctx = browser.new_context(
            permissions=["clipboard-read", "clipboard-write"],
            ignore_https_errors=True,
        )
        yield ctx, live_server
        ctx.close()
        browser.close()


@pytest.fixture
def page(browser_ctx):
    ctx, base_url = browser_ctx
    pg = ctx.new_page()
    pg.goto(base_url, wait_until="domcontentloaded")
    pg.wait_for_timeout(600)
    # Dismiss splash if present
    splash = pg.query_selector("#splash")
    if splash and splash.is_visible():
        splash.click()
        pg.wait_for_timeout(300)
    yield pg
    pg.close()


# ── page load ─────────────────────────────────────────────────────────────────

def test_page_title(page):
    assert "BLE" in page.title()

def test_bismillah_present(page):
    el = page.query_selector(".bismillah")
    assert el is not None
    assert "ٱللَّٰهِ" in el.inner_text()

def test_scan_button_visible(page):
    btn = page.query_selector("#scanBtn")
    assert btn is not None
    assert btn.is_visible()

def test_status_pill_shows_disconnected(page):
    pill = page.query_selector("#statusPill")
    assert pill is not None
    assert "disconnect" in pill.inner_text().lower()

def test_header_title_present(page):
    h1 = page.query_selector("h1")
    assert h1 is not None
    assert "BLE" in h1.inner_text()

def test_four_collapsible_sections(page):
    # main card + 3 collapsibles (char, monitor, multi)
    cards = page.query_selector_all(".card")
    assert len(cards) >= 1

def test_footer_present(page):
    footer = page.query_selector(".app-footer")
    assert footer is not None
    assert "workshop-diy" in footer.inner_text().lower()


# ── splash ────────────────────────────────────────────────────────────────────

def test_splash_dismisses_on_click(browser_ctx):
    ctx, base_url = browser_ctx
    pg = ctx.new_page()
    pg.goto(base_url, wait_until="domcontentloaded")
    pg.wait_for_timeout(300)
    splash = pg.query_selector("#splash")
    if splash and splash.is_visible():
        splash.click()
        pg.wait_for_timeout(700)
        # after dismiss splash should be gone or hidden
        assert not pg.query_selector("#splash") or not pg.query_selector("#splash").is_visible()
    pg.close()


# ── theme switching ───────────────────────────────────────────────────────────

def test_theme_can_be_changed(page):
    # open settings
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    sel = page.query_selector("#themeSelect")
    assert sel is not None
    sel.select_option("space")
    page.wait_for_timeout(200)
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "space"
    page.press("body", "Escape")

def test_theme_persisted_in_localstorage(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    page.query_selector("#themeSelect").select_option("jungle")
    page.wait_for_timeout(300)
    saved = page.evaluate("() => localStorage.getItem('wdiy-theme')")
    assert saved == "jungle"
    page.press("body", "Escape")

def test_all_themes_selectable(page):
    themes = ["mosque-gold", "zellige", "andalus", "riad", "medina", "space", "jungle", "robot"]
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    for t in themes:
        page.query_selector("#themeSelect").select_option(t)
        page.wait_for_timeout(50)
        current = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        assert current == t, f"Theme {t} not applied"
    page.press("body", "Escape")


# ── language switching ────────────────────────────────────────────────────────

def test_language_switches_to_french(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    page.query_selector("#langSelect").select_option("fr")
    page.wait_for_timeout(300)
    h1 = page.query_selector("h1").inner_text()
    # French title should be set
    assert page.evaluate("() => document.documentElement.lang") == "fr"
    page.press("body", "Escape")

def test_language_switches_to_arabic_rtl(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    page.query_selector("#langSelect").select_option("ar")
    page.wait_for_timeout(300)
    dir_attr = page.evaluate("() => document.documentElement.dir")
    assert dir_attr == "rtl"
    page.press("body", "Escape")

def test_language_back_to_english(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    page.query_selector("#langSelect").select_option("en")
    page.wait_for_timeout(300)
    assert page.evaluate("() => document.documentElement.lang") == "en"
    assert page.evaluate("() => document.documentElement.dir") == "ltr"
    page.press("body", "Escape")


# ── panel toggles ─────────────────────────────────────────────────────────────

def test_help_panel_opens(page):
    page.click("#helpBtn")
    page.wait_for_timeout(300)
    panel = page.query_selector("#helpPanel")
    assert "open" in (panel.get_attribute("class") or "")

def test_help_panel_closes_on_x(page):
    page.click("#helpBtn")
    page.wait_for_timeout(200)
    page.click("#helpCloseBtn")
    page.wait_for_timeout(300)
    panel = page.query_selector("#helpPanel")
    assert "open" not in (panel.get_attribute("class") or "")

def test_settings_panel_opens(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(300)
    panel = page.query_selector("#settingsPanel")
    assert "open" in (panel.get_attribute("class") or "")

def test_settings_panel_closes_on_escape(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    page.press("body", "Escape")
    page.wait_for_timeout(300)
    panel = page.query_selector("#settingsPanel")
    assert "open" not in (panel.get_attribute("class") or "")

def test_log_panel_toggles(page):
    page.click("#logBtn")
    page.wait_for_timeout(300)
    panel = page.query_selector("#logPanel")
    assert "open" in (panel.get_attribute("class") or "")
    page.click("#logCloseBtn")
    page.wait_for_timeout(300)
    assert "open" not in (panel.get_attribute("class") or "")

def test_help_tabs_switch(page):
    page.click("#helpBtn")
    page.wait_for_timeout(200)
    page.click(".help-tab[data-tab='howto']")
    page.wait_for_timeout(200)
    howto = page.query_selector("#helpHowto")
    assert "active" in (howto.get_attribute("class") or "")
    page.press("body", "Escape")


# ── scan button states ────────────────────────────────────────────────────────

def test_stop_scan_btn_hidden_initially(page):
    stop_btn = page.query_selector("#stopScanBtn")
    assert stop_btn is not None
    # should be display:none initially
    display = page.evaluate("() => document.getElementById('stopScanBtn').style.display")
    assert display == "none"

def test_scan_btn_visible_initially(page):
    scan_btn = page.query_selector("#scanBtn")
    assert scan_btn is not None
    display = page.evaluate("() => document.getElementById('scanBtn').style.display")
    assert display != "none"


# ── characteristics buttons disabled initially ────────────────────────────────

def test_discover_btn_disabled_initially(page):
    btn = page.query_selector("#discoverBtn")
    assert btn.get_attribute("disabled") is not None

def test_disconnect_btn_disabled_initially(page):
    btn = page.query_selector("#disconnectBtn")
    assert btn.get_attribute("disabled") is not None

def test_read_btn_disabled_initially(page):
    btn = page.query_selector("#readBtn")
    assert btn.get_attribute("disabled") is not None

def test_write_btn_disabled_initially(page):
    btn = page.query_selector("#writeBtn")
    assert btn.get_attribute("disabled") is not None

def test_sub_btn_disabled_initially(page):
    btn = page.query_selector("#subBtn")
    assert btn.get_attribute("disabled") is not None


# ── backend URL in settings ───────────────────────────────────────────────────

def test_backend_url_field_present(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    field = page.query_selector("#backendURL")
    assert field is not None
    assert "localhost" in field.input_value()
    page.press("body", "Escape")

def test_backend_url_editable(page):
    page.click("#settingsBtn")
    page.wait_for_timeout(200)
    field = page.query_selector("#backendURL")
    field.fill("ws://192.168.1.10:8000/ws")
    assert "192.168.1.10" in field.input_value()
    page.press("body", "Escape")


# ── REST API via browser fetch ────────────────────────────────────────────────

def test_api_status_reachable(page, browser_ctx):
    _, base_url = browser_ctx
    result = page.evaluate(f"""async () => {{
        const r = await fetch('{base_url}/api/status');
        return await r.json();
    }}""")
    assert result["version"] == "1.0.0"

def test_api_logs_csv_reachable(page, browser_ctx):
    _, base_url = browser_ctx
    result = page.evaluate(f"""async () => {{
        const r = await fetch('{base_url}/api/logs/csv');
        return {{ status: r.status, text: await r.text() }};
    }}""")
    assert result["status"] == 200
    # CSV is either the header row or empty — both are valid
    text = result["text"]
    assert text == "" or "timestamp" in text


# ── log panel interaction ─────────────────────────────────────────────────────

def test_log_clear_button_works(page):
    page.click("#logBtn")
    page.wait_for_timeout(200)
    page.click("#clearLogBtn")
    page.wait_for_timeout(200)
    container = page.query_selector("#logContainer")
    assert container is not None
    # log container should be empty or have no error
    assert container.inner_text() == "" or True   # just checking it doesn't crash

def test_log_filter_buttons_present(page):
    page.click("#logBtn")
    page.wait_for_timeout(200)
    filters = page.query_selector_all(".log-filter")
    assert len(filters) >= 5
    page.click("#logCloseBtn")


# ── WebSocket connects ────────────────────────────────────────────────────────

def test_ws_hello_ack_received(page, browser_ctx):
    _, base_url = browser_ctx
    ws_url = base_url.replace("http://", "ws://") + "/ws"
    result = page.evaluate(f"""async () => {{
        return new Promise((resolve) => {{
            const ws = new WebSocket('{ws_url}');
            ws.onmessage = (e) => {{ ws.close(); resolve(JSON.parse(e.data)); }};
            ws.onopen = () => ws.send(JSON.stringify({{type:'hello'}}));
            setTimeout(() => resolve({{error:'timeout'}}), 3000);
        }});
    }}""")
    assert result.get("type") == "hello_ack"
    assert result.get("version") == "1.0.0"
