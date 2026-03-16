# BLE Dashboard v1.0

Full Bluetooth Low Energy dashboard — scan, connect, read, write, subscribe, monitor, log, debug, and analyze the 2.4 GHz spectrum.

Built on the **Workshop-DIY template** (9 themes, trilingual EN/FR/AR).

## Quick Start

```bash
bash launch.sh          # interactive TUI launcher
```

Or manually:

```bash
cd backend
pip install -r requirements.txt
python main.py
# open http://localhost:8000 in Chrome or Edge
```

**Linux / Raspberry Pi:** `sudo apt install bluetooth bluez`

> Open `docs/start-here.html` in your browser for a visual step-by-step guide.

## Features

### BLE Scanner
- Name and RSSI filtering, auto-reconnect
- RSSI sparkline signal graph per device
- Radar view with distance estimation
- Advertisement data decoder: manufacturer data, service UUIDs, TX power, path loss
- Company ID lookup (Apple, Nordic, Google, Espressif, micro:bit, etc.)
- iBeacon auto-decode (UUID, Major, Minor, TX Power)
- Export device list as CSV
- Demo mode with simulated devices

### Service Explorer (nRF Connect style)
- Expandable service/characteristic tree with property badges
- Read, Write (hex/text auto-detect), Subscribe per characteristic
- Read All, Subscribe All, Watch Mode (auto-poll + subscribe)
- GATT descriptor reader
- 12 known characteristic auto-formatters (Battery, Heart Rate, Temperature, micro:bit sensors, etc.)
- Value diff highlighting (byte-level change detection)
- Data rate monitor (packets/sec, bytes/sec)
- Clickable values open Packet Inspector modal

### Real-time Chart
- Multi-series Chart.js with dynamic dataset creation per sensor key
- KEY:VALUE text format auto-parsing from BLE UART notifications
- Configurable window, pause, grid toggle
- Min/Max/Avg/Count stats, CSV export

### Packet Analyzer (Wireshark-inspired)
- 3-pane layout: packet list, detail tree, hex dump
- Source/Destination with device names and MAC addresses
- Display filters: free-text or field queries (`type:notify`, `uuid:e95d`, `len>5`)
- Color-coded rows by packet type
- Delta time modes, mark packets, follow characteristic
- Export capture as JSON
- Hex dump: 16-byte-per-line with offset, grouped hex, ASCII sidebar

### nRF Tools
- Connection Parameters — MTU, address, active subscriptions
- Macro Recorder — record, play, save, export BLE operation sequences

### Debug Tools
- Connection Timeline — visual event history
- Read Latency Report — round-trip times with bar visualization
- Debug Snapshot Export — one-click JSON export of full state
- Log search with real-time filtering

### SDR Spectrum Analyzer (HackRF One)
- 2.4 GHz waterfall spectrogram (plasma colormap)
- BLE channel activity bar chart (40 channels)
- BLE vs WiFi comparison overlay
- Demo mode with realistic RF simulation
- Real hardware mode via `hackrf_sweep`

## Project Structure

```
ble-dashboard/
├── frontend/
│   ├── index.html          ← dashboard UI
│   ├── style.css           ← Workshop-DIY template (9 themes)
│   ├── ble.css             ← BLE + Wireshark + nRF styles
│   ├── sdr.css             ← SDR spectrum analyzer styles
│   ├── script.js           ← Workshop-DIY template JS
│   ├── ble.js              ← BLE logic: scanner, explorer, debug, nRF
│   └── sdr.js              ← SDR waterfall, channel bars, overlay
├── backend/
│   ├── main.py             ← FastAPI: WebSocket /ws + REST /api/
│   ├── ble_manager.py      ← bleak: scan, connect, GATT ops
│   ├── hackrf_manager.py   ← HackRF One: spectrum sweep + simulator
│   ├── logger.py           ← CSV + JSON Lines dual logger
│   └── requirements.txt
├── docs/
│   ├── start-here.html     ← visual getting-started guide
│   ├── howto.html          ← step-by-step tutorials
│   └── help.html           ← FAQ + troubleshooting
├── tests/                  ← pytest + vitest + Playwright
├── launch.sh               ← TUI launcher (install, start, stop, tests)
├── logs/                   ← auto-created: ble_log.csv + ble_log.jsonl
└── README.md
```

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Connection status + version |
| GET | `/api/logs/csv` | Download CSV log |
| GET | `/api/logs/json` | Download JSON Lines log |
| DELETE | `/api/logs` | Clear all logs |
| POST | `/api/log_format/{fmt}` | Set format: `csv` \| `json` \| `both` |

## WebSocket Protocol — `ws://localhost:8000/ws`

**Client → Server:**
`hello` · `scan` · `scan_stop` · `connect` · `disconnect` · `discover` · `get_characteristics` · `read` · `write` · `subscribe` · `unsubscribe` · `conn_info` · `read_descriptors` · `sdr_start` · `sdr_stop`

**Server → Client:**
`hello_ack` · `scan_result` · `connected` · `disconnected` · `services` · `characteristics` · `read_result` · `notify` · `write_ok` · `subscribed` · `unsubscribed` · `conn_info` · `descriptors` · `sdr_spectrum` · `error`

## Platform Support

| Platform | BLE Adapter | Notes |
|----------|-------------|-------|
| Linux | BlueZ | Add user to `bluetooth` group or run with `sudo` |
| Raspberry Pi | BlueZ (built-in) | Same as Linux |
| macOS | CoreBluetooth | Accept Bluetooth permission popup |
| Windows | WinRT | Windows 10+ with BT 4.0+ adapter |

## Documentation

Open `docs/start-here.html` in your browser for a visual guide, or see:
- `docs/howto.html` — step-by-step tutorials
- `docs/help.html` — FAQ and troubleshooting

## License

Workshop-DIY — abourdim
