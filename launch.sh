#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║              BLE Dashboard — Launcher  v1.0                             ║
# ║  bash launch.sh                                                            ║
# ║  Cross-platform: Linux · macOS · Raspberry Pi                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGS="$ROOT/logs"
VENV="$ROOT/.venv"
PID_FILE="$ROOT/.server.pid"
PORT="${BLE_PORT:-8000}"
HOST="${BLE_HOST:-localhost}"

# ── colours ───────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R='\033[0;31m'  G='\033[0;32m'  Y='\033[1;33m'
  B='\033[0;34m'  C='\033[0;36m'  M='\033[0;35m'
  W='\033[1;37m'  D='\033[2m'     N='\033[0m'
  BOLD='\033[1m'  DIM='\033[2m'
else
  R='' G='' Y='' B='' C='' M='' W='' D='' N='' BOLD='' DIM=''
fi

# ── helpers ───────────────────────────────────────────────────────────────────
println()  { printf "%b\n" "$*"; }
ok()       { println "  ${G}✔${N}  $*"; }
warn()     { println "  ${Y}⚠${N}  $*"; }
err()      { println "  ${R}✘${N}  $*" >&2; }
info()     { println "  ${C}→${N}  $*"; }
section()  { println "\n${BOLD}${B}── $* ${N}"; }
hr()       { println "${DIM}──────────────────────────────────────────────────${N}"; }

ask() {
  # ask "question" → returns 0 for yes, 1 for no
  local msg="$1"
  [[ -t 0 ]] || return 0   # non-interactive → default yes
  printf "%b" "  ${W}?${N}  ${msg} ${D}[Y/n]${N} "
  read -r ans < /dev/tty
  [[ "${ans:-y}" =~ ^[Yy]$ ]]
}

pause() {
  [[ -t 0 ]] || return 0   # skip in non-interactive mode
  printf "%b" "\n  ${D}Press Enter to continue…${N}"
  read -r _ < /dev/tty
}

detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      if grep -qi "raspberry" /proc/device-tree/model 2>/dev/null \
      || grep -qi "raspberry" /etc/os-release 2>/dev/null; then
        echo "rpi"
      else
        echo "linux"
      fi ;;
    *) echo "unknown" ;;
  esac
}

OS=$(detect_os)

os_label() {
  case "$OS" in
    macos) echo "macOS" ;;
    rpi)   echo "Raspberry Pi" ;;
    linux) echo "Linux" ;;
    *)     echo "Unknown OS" ;;
  esac
}

# ── server state ──────────────────────────────────────────────────────────────
server_pid() {
  [[ -f "$PID_FILE" ]] && cat "$PID_FILE" || echo ""
}

server_running() {
  local pid; pid=$(server_pid)
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

server_url() { echo "http://${HOST}:${PORT}"; }

# ── python resolver ───────────────────────────────────────────────────────────
find_python() {
  # prefer venv, then python3, then python
  if [[ -x "$VENV/bin/python" ]]; then
    echo "$VENV/bin/python"
  elif command -v python3 &>/dev/null; then
    echo "python3"
  elif command -v python &>/dev/null; then
    echo "python"
  else
    echo ""
  fi
}

find_pip() {
  if [[ -x "$VENV/bin/pip" ]]; then
    echo "$VENV/bin/pip"
  elif command -v pip3 &>/dev/null; then
    echo "pip3"
  elif command -v pip &>/dev/null; then
    echo "pip"
  else
    echo ""
  fi
}

# ── open browser ──────────────────────────────────────────────────────────────
open_browser() {
  local url="$1"
  info "Opening ${url} …"
  case "$OS" in
    macos)  open "$url" 2>/dev/null || true ;;
    linux|rpi)
      for cmd in xdg-open sensible-browser x-www-browser firefox chromium chromium-browser; do
        if command -v "$cmd" &>/dev/null; then
          "$cmd" "$url" &>/dev/null & disown
          return 0
        fi
      done
      warn "No browser found — open manually: ${W}${url}${N}"
      ;;
  esac
}

# ══════════════════════════════════════════════════════════════════════════════
#  SCREEN: HEADER
# ══════════════════════════════════════════════════════════════════════════════
draw_header() {
  clear
  println "${BOLD}${C}"
  println "  ╔══════════════════════════════════════════════════╗"
  println "  ║     📡  BLE Dashboard  —  Launcher  v1.0        ║"
  println "  ╚══════════════════════════════════════════════════╝${N}"
  println "  ${D}Platform: $(os_label)   Root: ${ROOT}${N}"

  if server_running; then
    println "  ${G}● Server running${N}  pid=$(server_pid)  $(server_url)"
  else
    println "  ${R}○ Server stopped${N}"
  fi
  hr
}

# ══════════════════════════════════════════════════════════════════════════════
#  SCREEN: MAIN MENU
# ══════════════════════════════════════════════════════════════════════════════
main_menu() {
  while true; do
    draw_header
    println "  ${BOLD}Main Menu${N}\n"
    println "  ${W}1${N}  Check installation"
    println "  ${W}2${N}  Install / update dependencies"
    println "  ${W}3${N}  Start server"
    println "  ${W}4${N}  Stop server"
    println "  ${W}5${N}  Open web dashboard"
    println "  ${W}6${N}  TUI monitor  ${D}(live log tail)${N}"
    println "  ${W}7${N}  Run tests"
    println "  ${W}8${N}  View logs"
    println "  ${W}9${N}  Configuration"
    println "  ${W}0${N}  About"
    println "  ${W}q${N}  Quit\n"
    printf "  %b " "${G}▶${N} Choice:"
    read -r choice < /dev/tty
    case "$choice" in
      1) menu_check_install ;;
      2) menu_install ;;
      3) menu_start_server ;;
      4) menu_stop_server ;;
      5) menu_open_web ;;
      6) menu_tui_monitor ;;
      7) menu_tests ;;
      8) menu_logs ;;
      9) menu_config ;;
      0) menu_about ;;
      q|Q) println "\n  ${C}Goodbye!${N}\n"; exit 0 ;;
      *) warn "Unknown option: $choice" ; sleep 0.8 ;;
    esac
  done
}

# ══════════════════════════════════════════════════════════════════════════════
#  1 — CHECK INSTALLATION
# ══════════════════════════════════════════════════════════════════════════════
menu_check_install() {
  draw_header
  section "Check Installation"

  local all_ok=true

  # Python
  local py; py=$(find_python)
  if [[ -n "$py" ]]; then
    local ver; ver=$("$py" --version 2>&1)
    ok "Python: ${ver}  (${py})"
  else
    err "Python not found — install python3"; all_ok=false
  fi

  # pip
  local pip; pip=$(find_pip)
  if [[ -n "$pip" ]]; then
    ok "pip: $("$pip" --version 2>&1 | cut -d' ' -f1-2)  (${pip})"
  else
    warn "pip not found"
  fi

  # venv
  if [[ -d "$VENV" ]]; then
    ok "Virtual env: ${VENV}"
  else
    info "No venv yet (will be created on install)"
  fi

  # Python packages
  section "Python packages"
  local py_check; py_check=$(find_python)
  if [[ -n "$py_check" ]]; then
    for pkg in fastapi uvicorn bleak aiofiles; do
      if "$py_check" -c "import ${pkg//-/_}" 2>/dev/null; then
        local ver; ver=$("$py_check" -c "import ${pkg//-/_}; print(getattr(${pkg//-/_},'__version__','?'))" 2>/dev/null || echo "?")
        ok "${pkg}  ${D}${ver}${N}"
      else
        err "${pkg} not installed"; all_ok=false
      fi
    done
  fi

  # Node / npm
  section "Node.js (for JS tests)"
  if command -v node &>/dev/null; then
    ok "node: $(node --version)"
  else
    warn "node not found — JS tests won't run"
  fi
  if command -v npm &>/dev/null; then
    ok "npm: $(npm --version)"
  else
    warn "npm not found"
  fi
  if [[ -d "$ROOT/node_modules" ]]; then
    ok "node_modules present"
  else
    info "node_modules missing — run Install to set up"
  fi

  # Bluetooth system check
  section "Bluetooth system"
  case "$OS" in
    linux|rpi)
      if command -v bluetoothctl &>/dev/null; then
        ok "bluetoothctl found"
        local bt_state; bt_state=$(bluetoothctl show 2>/dev/null | grep "Powered" | awk '{print $2}' || echo "unknown")
        if [[ "$bt_state" == "yes" ]]; then
          ok "Bluetooth adapter: powered on"
        else
          warn "Bluetooth adapter: ${bt_state} — run 'bluetoothctl power on'"
        fi
      else
        warn "bluetoothctl not found — install: sudo apt install bluetooth bluez"
      fi
      if command -v rfkill &>/dev/null; then
        local blocked; blocked=$(rfkill list bluetooth 2>/dev/null | grep -c "Soft blocked: yes" || echo 0)
        if [[ "$blocked" -gt 0 ]]; then
          warn "Bluetooth is rfkill-blocked — run: sudo rfkill unblock bluetooth"
        else
          ok "rfkill: Bluetooth not blocked"
        fi
      fi
      ;;
    macos)
      ok "macOS: CoreBluetooth used natively via bleak"
      ;;
  esac

  # Frontend files
  section "Frontend files"
  for f in index.html style.css ble.css script.js ble.js; do
    if [[ -f "$FRONTEND/$f" ]]; then
      ok "$f"
    else
      err "$f missing from frontend/"; all_ok=false
    fi
  done

  # Logs dir
  section "Logs"
  if [[ -d "$LOGS" ]]; then
    ok "logs/ directory exists"
    local ncsv; ncsv=$(wc -l < "$LOGS/ble_log.csv" 2>/dev/null || echo 0)
    local njson; njson=$(wc -l < "$LOGS/ble_log.jsonl" 2>/dev/null || echo 0)
    info "ble_log.csv:   ${ncsv} lines"
    info "ble_log.jsonl: ${njson} lines"
  else
    info "logs/ will be created on first run"
  fi

  hr
  if $all_ok; then
    ok "${G}${BOLD}All checks passed ✔${N}"
  else
    warn "${Y}Some checks failed — run Install (option 2)${N}"
  fi

  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  2 — INSTALL / UPDATE
# ══════════════════════════════════════════════════════════════════════════════
menu_install() {
  draw_header
  section "Install / Update Dependencies"

  local py; py=$(find_python)
  if [[ -z "$py" ]]; then
    err "Python3 not found. Install it first:"
    case "$OS" in
      linux|rpi) info "sudo apt install python3 python3-pip python3-venv" ;;
      macos)     info "brew install python3" ;;
    esac
    pause; return
  fi

  # ── create venv ────────────────────────────────────────────────────────────
  if [[ ! -d "$VENV" ]]; then
    info "Creating virtual environment at ${VENV} …"
    "$py" -m venv "$VENV"
    ok "Virtual environment created"
  else
    ok "Virtual environment already exists"
  fi

  local vpy="$VENV/bin/python"
  local vpip="$VENV/bin/pip"

  # ── upgrade pip ────────────────────────────────────────────────────────────
  info "Upgrading pip …"
  "$vpy" -m pip install --upgrade pip -q
  ok "pip upgraded"

  # ── install python deps ────────────────────────────────────────────────────
  info "Installing Python dependencies …"
  "$vpip" install -r "$BACKEND/requirements.txt" -q
  ok "Python packages installed"

  # ── test deps ─────────────────────────────────────────────────────────────
  if ask "Install test dependencies (pytest, playwright, etc.)?"; then
    info "Installing test dependencies …"
    "$vpip" install pytest pytest-asyncio pytest-cov httpx playwright -q
    info "Installing Playwright Chromium …"
    "$vpy" -m playwright install chromium --with-deps 2>&1 | tail -3
    ok "Test dependencies installed"
  fi

  # ── node modules ──────────────────────────────────────────────────────────
  if command -v npm &>/dev/null; then
    if ask "Install Node.js test dependencies (vitest)?"; then
      info "Running npm install …"
      cd "$ROOT" && npm install -q
      ok "Node modules installed"
    fi
  else
    warn "npm not found — skipping JS test deps"
  fi

  # ── linux BT system packages ───────────────────────────────────────────────
  if [[ "$OS" == "linux" || "$OS" == "rpi" ]]; then
    if ! command -v bluetoothctl &>/dev/null; then
      if ask "Install system Bluetooth tools (requires sudo)?"; then
        sudo apt-get install -y bluetooth bluez python3-dbus
        ok "Bluetooth tools installed"
      fi
    fi
    # DBus permissions for non-root BLE access
    info "Tip: to use BLE without sudo, add yourself to the bluetooth group:"
    info "  sudo usermod -aG bluetooth \$USER  && newgrp bluetooth"
  fi

  ok "${G}${BOLD}Installation complete ✔${N}"
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  3 — START SERVER
# ══════════════════════════════════════════════════════════════════════════════
menu_start_server() {
  draw_header
  section "Start Server"

  if server_running; then
    warn "Server already running  pid=$(server_pid)  $(server_url)"
    pause; return
  fi

  local py
  if [[ -x "$VENV/bin/python" ]]; then
    py="$VENV/bin/python"
  else
    py=$(find_python)
  fi

  if [[ -z "$py" ]]; then
    err "Python not found — run Install first"
    pause; return
  fi

  # Check port free
  if command -v lsof &>/dev/null && lsof -i ":${PORT}" &>/dev/null; then
    warn "Port ${PORT} is already in use"
    if ask "Try port $((PORT+1)) instead?"; then
      PORT=$((PORT+1))
    else
      pause; return
    fi
  fi

  info "Starting BLE Dashboard backend …"
  info "  python: ${py}"
  info "  host:   ${HOST}:${PORT}"
  info "  logs:   ${LOGS}/"

  mkdir -p "$LOGS"

  # Launch in background, capture PID
  BLE_LOG_FORMAT="${BLE_LOG_FORMAT:-both}" \
  BLE_PORT="$PORT" \
    "$py" "$BACKEND/main.py" \
    > "$ROOT/server.log" 2>&1 &

  local pid=$!
  echo "$pid" > "$PID_FILE"
  sleep 1.2

  if kill -0 "$pid" 2>/dev/null; then
    ok "${G}${BOLD}Server started${N}  pid=${pid}"
    ok "URL: ${W}$(server_url)${N}"
    info "Log: ${ROOT}/server.log"

    if ask "Open browser now?"; then
      open_browser "$(server_url)"
    fi
  else
    err "Server failed to start — check server.log:"
    tail -20 "$ROOT/server.log" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi

  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  4 — STOP SERVER
# ══════════════════════════════════════════════════════════════════════════════
menu_stop_server() {
  draw_header
  section "Stop Server"

  if ! server_running; then
    warn "Server is not running"
    pause; return
  fi

  local pid; pid=$(server_pid)
  info "Stopping server  pid=${pid} …"
  kill "$pid" 2>/dev/null || true
  sleep 0.8
  if kill -0 "$pid" 2>/dev/null; then
    warn "Still running — sending SIGKILL …"
    kill -9 "$pid" 2>/dev/null || true
    sleep 0.4
  fi
  rm -f "$PID_FILE"
  ok "Server stopped"
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  5 — OPEN WEB DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
menu_open_web() {
  draw_header
  section "Open Web Dashboard"

  if ! server_running; then
    warn "Server is not running"
    if ask "Start server first?"; then
      menu_start_server
      return
    fi
    pause; return
  fi

  local url; url=$(server_url)
  open_browser "$url"
  ok "Browser opened → ${W}${url}${N}"
  println ""
  info "Use ${W}Chrome${N} or ${W}Edge${N} for full Web Bluetooth support"
  info "For BLE scanning the page must be served over http://localhost"
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  6 — TUI MONITOR
# ══════════════════════════════════════════════════════════════════════════════
menu_tui_monitor() {
  while true; do
    draw_header
    section "TUI Monitor"
    println "  ${W}1${N}  Live server log  ${D}(tail -f server.log)${N}"
    println "  ${W}2${N}  Live BLE event log  ${D}(tail -f ble_log.jsonl)${N}"
    println "  ${W}3${N}  CSV log viewer"
    println "  ${W}4${N}  Bluetooth adapters  ${D}(system info)${N}"
    println "  ${W}5${N}  API status  ${D}(curl /api/status)${N}"
    println "  ${W}6${N}  Live API status  ${D}(watch every 2s)${N}"
    println "  ${W}b${N}  Back\n"
    printf "  %b " "${G}▶${N} Choice:"
    read -r choice < /dev/tty
    case "$choice" in
      1) tui_server_log ;;
      2) tui_ble_log ;;
      3) tui_csv_viewer ;;
      4) tui_bt_adapters ;;
      5) tui_api_status ;;
      6) tui_api_watch ;;
      b|B) return ;;
      *) warn "Unknown option"; sleep 0.5 ;;
    esac
  done
}

tui_server_log() {
  if [[ ! -f "$ROOT/server.log" ]]; then
    warn "server.log not found — start the server first"
    pause; return
  fi
  println "\n  ${D}Tailing server.log — press Ctrl+C to stop${N}\n"
  tail -f "$ROOT/server.log" || true
  pause
}

tui_ble_log() {
  local jsonl="$LOGS/ble_log.jsonl"
  if [[ ! -f "$jsonl" ]]; then
    warn "ble_log.jsonl not found — start the server and connect a device"
    pause; return
  fi
  println "\n  ${D}Tailing ble_log.jsonl — press Ctrl+C to stop${N}\n"
  # Pretty-print JSON if python available
  local py; py=$(find_python)
  if [[ -n "$py" ]]; then
    tail -f "$jsonl" | while IFS= read -r line; do
      echo "$line" | "$py" -c "
import sys, json
try:
    d=json.loads(sys.stdin.read())
    ts=d.get('ts','')[-8:] if d.get('ts') else ''
    dir_=d.get('dir','?')
    t=d.get('type','?')
    char=d.get('char','')[:16]
    hex_=d.get('hex','')[:24]
    num=d.get('num','')
    print(f'  {ts}  [{dir_:3}]  {t:<14}  char={char}  hex={hex_}  num={num}')
except: print(sys.stdin.read())
" 2>/dev/null || echo "$line"
    done || true
  else
    tail -f "$jsonl" || true
  fi
  pause
}

tui_csv_viewer() {
  local csv="$LOGS/ble_log.csv"
  if [[ ! -f "$csv" ]]; then
    warn "ble_log.csv not found"
    pause; return
  fi
  println "\n  ${D}Last 30 CSV log entries${N}\n"
  local py; py=$(find_python)
  if [[ -n "$py" ]]; then
    "$py" - <<'PYEOF'
import csv, sys, os
path = os.environ.get('BLE_CSV', '')
if not path:
    import pathlib
    path = str(pathlib.Path(__file__).parent.parent / 'logs' / 'ble_log.csv') if False else ''
PYEOF
    # simpler: just column -t
    tail -30 "$csv" | column -t -s, 2>/dev/null || tail -30 "$csv"
  else
    tail -30 "$csv" | column -t -s, 2>/dev/null || tail -30 "$csv"
  fi
  pause
}

tui_bt_adapters() {
  draw_header
  section "Bluetooth Adapters"
  case "$OS" in
    linux|rpi)
      if command -v bluetoothctl &>/dev/null; then
        println "\n${D}bluetoothctl show:${N}\n"
        bluetoothctl show 2>/dev/null || warn "bluetoothctl failed"
      else
        warn "bluetoothctl not found"
      fi
      if command -v hciconfig &>/dev/null; then
        println "\n${D}hciconfig:${N}\n"
        hciconfig 2>/dev/null || true
      fi
      if command -v rfkill &>/dev/null; then
        println "\n${D}rfkill list bluetooth:${N}\n"
        rfkill list bluetooth 2>/dev/null || true
      fi
      ;;
    macos)
      println "\n${D}system_profiler SPBluetoothDataType:${N}\n"
      system_profiler SPBluetoothDataType 2>/dev/null | head -20 || warn "system_profiler not available"
      ;;
    *)
      warn "Bluetooth adapter info not available on this platform"
      ;;
  esac
  pause
}

tui_api_status() {
  draw_header
  section "API Status"
  local url; url="$(server_url)/api/status"
  if ! server_running; then
    warn "Server not running"
    pause; return
  fi
  println "\n  ${D}GET ${url}${N}\n"
  local py; py=$(find_python)
  if [[ -n "$py" ]]; then
    "$py" -c "
import urllib.request, json
try:
    with urllib.request.urlopen('$url', timeout=3) as r:
        d = json.load(r)
    print('  connected  :', d.get('connected'))
    print('  log_format :', d.get('log_format'))
    print('  version    :', d.get('version'))
except Exception as e:
    print('  Error:', e)
"
  elif command -v curl &>/dev/null; then
    curl -s "$url" | python3 -m json.tool 2>/dev/null || curl -s "$url"
  else
    warn "curl/python not found"
  fi
  pause
}

tui_api_watch() {
  if ! server_running; then
    warn "Server not running"; pause; return
  fi
  println "\n  ${D}Watching API status every 2s — press Ctrl+C to stop${N}\n"
  local url; url="$(server_url)/api/status"
  local py; py=$(find_python)
  while true; do
    local ts; ts=$(date '+%H:%M:%S')
    if [[ -n "$py" ]]; then
      local result
      result=$("$py" -c "
import urllib.request, json
try:
    with urllib.request.urlopen('$url', timeout=2) as r:
        d=json.load(r)
    conn='${G}YES${N}' if d.get('connected') else '${R}NO${N}'
    print(f'  connected={conn}  fmt={d.get(\"log_format\")}  ver={d.get(\"version\")}')
except Exception as e:
    print(f'  ${R}Error: {e}${N}')
" 2>/dev/null || echo "  error")
      printf "\r  ${D}%s${N}  %b          " "$ts" "$result"
    else
      printf "\r  %s  (python not found)" "$ts"
    fi
    sleep 2
  done
}

# ══════════════════════════════════════════════════════════════════════════════
#  7 — RUN TESTS
# ══════════════════════════════════════════════════════════════════════════════
menu_tests() {
  while true; do
    draw_header
    section "Run Tests"
    println "  ${W}1${N}  All Python tests  ${D}(unit + integration + E2E)${N}"
    println "  ${W}2${N}  Unit tests only   ${D}(logger + BLE manager)${N}"
    println "  ${W}3${N}  Integration tests ${D}(FastAPI REST + WebSocket)${N}"
    println "  ${W}4${N}  E2E tests         ${D}(Playwright browser)${N}"
    println "  ${W}5${N}  JS tests          ${D}(vitest)${N}"
    println "  ${W}6${N}  Full suite        ${D}(Python + JS + E2E)${N}"
    println "  ${W}7${N}  Coverage report   ${D}(open HTML in browser)${N}"
    println "  ${W}b${N}  Back\n"
    printf "  %b " "${G}▶${N} Choice:"
    read -r choice < /dev/tty
    case "$choice" in
      1) run_pytest "../tests/test_logger.py ../tests/test_ble_manager.py ../tests/test_api.py" ;;
      2) run_pytest "../tests/test_logger.py ../tests/test_ble_manager.py" ;;
      3) run_pytest "../tests/test_api.py" ;;
      4) run_pytest "../tests/test_e2e.py" ;;
      5) run_js_tests ;;
      6) run_full_suite ;;
      7) open_coverage ;;
      b|B) return ;;
      *) warn "Unknown option"; sleep 0.5 ;;
    esac
  done
}

run_pytest() {
  local targets="$1"
  local py
  if [[ -x "$VENV/bin/python" ]]; then
    py="$VENV/bin/python"
  else
    py=$(find_python)
  fi
  if [[ -z "$py" ]]; then
    err "Python not found"; pause; return
  fi
  println "\n  ${D}Running pytest ${targets}…${N}\n"
  cd "$BACKEND"
  "$py" -m pytest $targets -v \
    --tb=short \
    --cov=. \
    --cov-report=term-missing \
    --cov-report="html:${ROOT}/coverage_html/python" \
    2>&1 || true
  cd "$ROOT"
  pause
}

run_js_tests() {
  if ! command -v npx &>/dev/null; then
    err "npx not found — install Node.js"; pause; return
  fi
  println "\n  ${D}Running vitest…${N}\n"
  cd "$ROOT"
  npx vitest run tests/ble.test.js --reporter=verbose 2>&1 || true
  pause
}

run_full_suite() {
  draw_header
  section "Full Test Suite"
  local py
  if [[ -x "$VENV/bin/python" ]]; then py="$VENV/bin/python"; else py=$(find_python); fi

  println "\n${BOLD}▶ Python: unit + integration${N}"
  hr
  if [[ -n "$py" ]]; then
    cd "$BACKEND"
    "$py" -m pytest ../tests/test_logger.py ../tests/test_ble_manager.py ../tests/test_api.py \
      -v --tb=short \
      --cov=. --cov-report=term-missing \
      --cov-report="html:${ROOT}/coverage_html/python" 2>&1 || true
    cd "$ROOT"
  else
    err "Python not found"
  fi

  println "\n${BOLD}▶ JavaScript: vitest${N}"
  hr
  if command -v npx &>/dev/null; then
    cd "$ROOT"
    npx vitest run tests/ble.test.js --reporter=verbose 2>&1 || true
  else
    warn "npx not found — skipping JS tests"
  fi

  if ask "Also run E2E browser tests? (slow ~90s)"; then
    println "\n${BOLD}▶ E2E: Playwright${N}"
    hr
    if [[ -n "$py" ]]; then
      cd "$BACKEND"
      "$py" -m pytest ../tests/test_e2e.py -v --tb=short 2>&1 || true
      cd "$ROOT"
    fi
  fi

  println "\n${BOLD}${G}═══ Test suite complete ═══${N}"
  pause
}

open_coverage() {
  local report="$ROOT/coverage_html/python/index.html"
  if [[ -f "$report" ]]; then
    open_browser "file://${report}"
    ok "Opened coverage report"
  else
    warn "No coverage report yet — run tests first"
  fi
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  8 — VIEW LOGS
# ══════════════════════════════════════════════════════════════════════════════
menu_logs() {
  while true; do
    draw_header
    section "View Logs"

    # sizes
    local csv_lines=0 json_lines=0 srv_lines=0
    [[ -f "$LOGS/ble_log.csv"   ]] && csv_lines=$(wc -l  < "$LOGS/ble_log.csv")
    [[ -f "$LOGS/ble_log.jsonl" ]] && json_lines=$(wc -l < "$LOGS/ble_log.jsonl")
    [[ -f "$ROOT/server.log"    ]] && srv_lines=$(wc -l  < "$ROOT/server.log")

    println "  ${W}1${N}  ble_log.csv    ${D}(${csv_lines} lines)${N}"
    println "  ${W}2${N}  ble_log.jsonl  ${D}(${json_lines} lines)${N}"
    println "  ${W}3${N}  server.log     ${D}(${srv_lines} lines)${N}"
    println "  ${W}4${N}  Clear BLE logs"
    println "  ${W}5${N}  Export BLE logs  ${D}(copy to Desktop)${N}"
    println "  ${W}b${N}  Back\n"
    printf "  %b " "${G}▶${N} Choice:"
    read -r choice < /dev/tty
    case "$choice" in
      1) less "$LOGS/ble_log.csv" 2>/dev/null || cat "$LOGS/ble_log.csv" 2>/dev/null || warn "No CSV log" ;;
      2) less "$LOGS/ble_log.jsonl" 2>/dev/null || cat "$LOGS/ble_log.jsonl" 2>/dev/null || warn "No JSONL log" ;;
      3) less "$ROOT/server.log" 2>/dev/null || cat "$ROOT/server.log" 2>/dev/null || warn "No server log" ;;
      4) log_clear ;;
      5) log_export ;;
      b|B) return ;;
      *) warn "Unknown option"; sleep 0.5 ;;
    esac
  done
}

log_clear() {
  if ask "Clear ble_log.csv and ble_log.jsonl?"; then
    local py; py=$(find_python)
    if [[ -n "$py" ]]; then
      BLE_LOGS="$LOGS" "$py" - << 'PYEOF'
import csv, pathlib, os
logs = pathlib.Path(os.environ['BLE_LOGS'])
fields = ["timestamp","direction","type","device","characteristic","hex","str_val","num_val","extra"]
with open(logs/'ble_log.csv','w',newline='') as f:
    csv.DictWriter(f,fieldnames=fields).writeheader()
(logs/'ble_log.jsonl').write_text('')
print('  Logs cleared')
PYEOF
    else
      > "$LOGS/ble_log.jsonl"
      echo "timestamp,direction,type,device,characteristic,hex,str_val,num_val,extra" > "$LOGS/ble_log.csv"
    fi
    ok "Logs cleared"
    pause
  fi
}

log_export() {
  local dest
  case "$OS" in
    macos) dest="$HOME/Desktop" ;;
    *)     dest="$HOME" ;;
  esac
  local ts; ts=$(date '+%Y%m%d_%H%M%S')
  local out="$dest/ble_logs_${ts}"
  mkdir -p "$out"
  [[ -f "$LOGS/ble_log.csv"   ]] && cp "$LOGS/ble_log.csv"   "$out/"
  [[ -f "$LOGS/ble_log.jsonl" ]] && cp "$LOGS/ble_log.jsonl" "$out/"
  ok "Logs exported to: ${W}${out}${N}"
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  9 — CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════
menu_config() {
  while true; do
    draw_header
    section "Configuration"
    println "  Current settings:\n"
    println "  ${D}HOST${N}            ${W}${HOST}${N}"
    println "  ${D}PORT${N}            ${W}${PORT}${N}"
    println "  ${D}LOG_FORMAT${N}      ${W}${BLE_LOG_FORMAT:-both}${N}"
    println "  ${D}VENV${N}            ${W}${VENV}${N}"
    println "  ${D}LOGS DIR${N}        ${W}${LOGS}${N}"
    println ""
    println "  ${W}1${N}  Change port         ${D}(current: ${PORT})${N}"
    println "  ${W}2${N}  Change host         ${D}(current: ${HOST})${N}"
    println "  ${W}3${N}  Change log format   ${D}(current: ${BLE_LOG_FORMAT:-both})${N}"
    println "  ${W}4${N}  Toggle venv         ${D}(current: $([ -d "$VENV" ] && echo exists || echo missing))${N}"
    println "  ${W}5${N}  Create .env file    ${D}(persist settings)${N}"
    println "  ${W}6${N}  Show .env file"
    println "  ${W}b${N}  Back\n"
    printf "  %b " "${G}▶${N} Choice:"
    read -r choice < /dev/tty
    case "$choice" in
      1) printf "%b" "  New port [${PORT}]: "; read -r v < /dev/tty; [[ -n "$v" ]] && PORT="$v" && ok "Port set to ${PORT}" ;;
      2) printf "%b" "  New host [${HOST}]: "; read -r v < /dev/tty; [[ -n "$v" ]] && HOST="$v" && ok "Host set to ${HOST}" ;;
      3) printf "%b" "  Log format (csv/json/both) [${BLE_LOG_FORMAT:-both}]: "
         read -r v < /dev/tty
         if [[ "$v" =~ ^(csv|json|both)$ ]]; then BLE_LOG_FORMAT="$v"; ok "Format set to ${BLE_LOG_FORMAT}"
         else warn "Invalid — use csv, json, or both"; fi ;;
      4) if [[ -d "$VENV" ]]; then
           if ask "Remove virtual environment?"; then rm -rf "$VENV"; ok "Venv removed"; fi
         else
           info "Run Install (option 2) to create venv"; fi ;;
      5) create_env_file ;;
      6) [[ -f "$ROOT/.env" ]] && cat "$ROOT/.env" || warn "No .env file yet" ; pause ;;
      b|B) return ;;
      *) warn "Unknown option"; sleep 0.5 ;;
    esac
  done
}

create_env_file() {
  cat > "$ROOT/.env" << ENVEOF
# BLE Dashboard — environment configuration
# Source this file or it is loaded automatically by launch.sh

BLE_HOST=${HOST}
BLE_PORT=${PORT}
BLE_LOG_FORMAT=${BLE_LOG_FORMAT:-both}
ENVEOF
  ok ".env file created at ${ROOT}/.env"
  info "To load it: source ${ROOT}/.env"
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  0 — ABOUT
# ══════════════════════════════════════════════════════════════════════════════
menu_about() {
  draw_header
  section "About BLE Dashboard"
  println ""
  println "  ${BOLD}BLE Dashboard  v1.0${N}"
  println "  ${D}Built on Workshop-DIY template v1.2${N}"
  println ""
  println "  ${C}Frontend${N}  HTML + CSS + JS  (vanilla, no framework)"
  println "  ${C}Backend${N}   FastAPI + bleak  (Python 3.10+)"
  println "  ${C}BLE${N}       bleak cross-platform library"
  println "  ${C}Logging${N}   CSV + JSON Lines  →  logs/"
  println "  ${C}Tests${N}     pytest + vitest + Playwright"
  println ""
  println "  ${BOLD}Platform support:${N}"
  println "   Linux  ·  Raspberry Pi  ·  macOS"
  println ""
  println "  ${BOLD}Quick start:${N}"
  println "   ${D}bash launch.sh${N}  →  Install  →  Start server  →  Open web"
  println ""
  println "  ${BOLD}API:${N}"
  println "   WS   ws://localhost:8000/ws"
  println "   REST http://localhost:8000/api/"
  println ""
  println "  ${D}Workshop-DIY — abourdim${N}"
  hr
  pause
}

# ══════════════════════════════════════════════════════════════════════════════
#  CLI MODE  (non-interactive / flags)
# ══════════════════════════════════════════════════════════════════════════════
cli_usage() {
  cat << EOF
Usage: bash launch.sh [command]

Commands:
  check       Check installation
  install     Install dependencies
  start       Start backend server
  stop        Stop backend server
  status      Show server status + API status
  open        Open web dashboard in browser
  logs        Tail BLE event log
  test        Run all Python tests
  test:js     Run JS tests
  test:e2e    Run E2E Playwright tests
  test:all    Run full test suite
  (no args)   Interactive TUI menu

Options:
  --port N    Override server port  (default: 8000)
  --host H    Override server host  (default: 127.0.0.1)

Environment:
  BLE_PORT         Server port
  BLE_HOST         Server host
  BLE_LOG_FORMAT   csv | json | both
EOF
}

# load .env if present
[[ -f "$ROOT/.env" ]] && source "$ROOT/.env" 2>/dev/null || true

# parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --help|-h) cli_usage; exit 0 ;;
    *) break ;;
  esac
done

# dispatch
case "${1:-}" in
  check)     menu_check_install ;;
  install)   menu_install ;;
  start)     menu_start_server ;;
  stop)      menu_stop_server ;;
  status)    tui_api_status ;;
  open)      menu_open_web ;;
  logs)      tui_ble_log ;;
  test)      run_pytest "../tests/test_logger.py ../tests/test_ble_manager.py ../tests/test_api.py" ;;
  test:js)   run_js_tests ;;
  test:e2e)  run_pytest "../tests/test_e2e.py" ;;
  test:all)  run_full_suite ;;
  "")        main_menu ;;
  *)         err "Unknown command: $1"; cli_usage; exit 1 ;;
esac
