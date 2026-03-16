# CHANGES — BLE Dashboard

## v1.0.0

Initial release. Full BLE dashboard with scanner, service explorer, packet analyzer, SDR spectrum analyzer, and debug tools.

**Scanner**
- Name/RSSI filtering, auto-reconnect, radar view
- RSSI sparkline signal graph per device
- Advertisement data decoder with company ID lookup and iBeacon auto-decode
- Device list CSV export, demo mode with simulated devices

**Service Explorer (nRF Connect style)**
- Expandable service/characteristic tree with property badges
- Read, Write, Subscribe per characteristic
- Read All, Subscribe All, Watch Mode
- GATT descriptor reader, 12 known characteristic formatters
- Value diff highlighting, data rate monitor, Packet Inspector modal

**Real-time Chart**
- Multi-series Chart.js with KEY:VALUE auto-parsing
- Configurable window, pause, grid, CSV export

**Packet Analyzer (Wireshark-inspired)**
- 3-pane layout: packet list, detail tree, hex dump
- Source/Destination columns with MAC addresses
- Display filters, color-coded rows, delta time, mark packets
- Export capture as JSON

**nRF Tools**
- Connection Parameters panel (MTU, address, subscriptions)
- Macro Recorder (record, play, save, export)

**Debug Tools**
- Connection Timeline, Read Latency Report
- Debug Snapshot Export, Log search

**SDR Spectrum Analyzer (HackRF One)**
- 2.4 GHz waterfall spectrogram with plasma colormap
- BLE channel activity bar chart (40 channels)
- BLE vs WiFi comparison overlay
- Demo mode with realistic RF simulation
- Real hardware mode via hackrf_sweep

**Backend**
- FastAPI + uvicorn, WebSocket + REST API
- bleak BLE manager with scan, connect, discover, read, write, subscribe
- HackRF manager with spectrum sweep and simulator
- Dual logger: CSV + JSON Lines

**Platform**
- Linux / BlueZ, macOS / CoreBluetooth, Raspberry Pi, Windows / WinRT

**Launcher**
- Interactive TUI: install, start, stop, tests, config, logs, about
- CLI mode with flags (--port, --host)
