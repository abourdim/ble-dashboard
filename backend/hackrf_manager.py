"""
hackrf_manager.py — SDR spectrum sweep using HackRF One.
Provides real-time 2.4 GHz spectrum data with BLE channel mapping.
"""

import asyncio
import logging
import math
import random
import time
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

log = logging.getLogger("hackrf_manager")

# ── BLE channel center frequencies (MHz) ──────────────────────────────────────
# Advertising channels
#   Ch 37: 2402   Ch 38: 2426   Ch 39: 2480
# Data channels
#   Ch 0–10:  2404–2424 (2 MHz spacing)
#   Ch 11–36: 2428–2478 (2 MHz spacing)

BLE_CHANNEL_FREQ: Dict[int, float] = {}
BLE_CHANNEL_FREQ[37] = 2402.0
for i in range(11):                       # channels 0–10
    BLE_CHANNEL_FREQ[i] = 2404.0 + i * 2
BLE_CHANNEL_FREQ[38] = 2426.0
for i in range(26):                       # channels 11–36
    BLE_CHANNEL_FREQ[11 + i] = 2428.0 + i * 2
BLE_CHANNEL_FREQ[39] = 2480.0


class HackRFManager:
    """Manages HackRF One spectrum sweeps across the 2.4 GHz BLE band."""

    def __init__(self, notify_callback: Callable):
        self._cb = notify_callback          # async fn(event: dict)
        self.running: bool = False
        self.simulate: bool = False
        self._sweep_task: Optional[asyncio.Task] = None
        self._process: Optional[asyncio.subprocess.Process] = None

    # ── start / stop ──────────────────────────────────────────────────

    async def start_sweep(self, simulate: bool = False) -> None:
        """Begin a spectrum sweep (real hardware or simulated)."""
        if self.running:
            log.warning("Sweep already running")
            return

        self.simulate = simulate
        self.running = True

        if simulate:
            log.info("Starting simulated spectrum sweep")
            self._sweep_task = asyncio.create_task(self._simulate_loop())
        else:
            log.info("Starting hackrf_sweep subprocess")
            try:
                self._process = await asyncio.create_subprocess_exec(
                    "hackrf_sweep",
                    "-f", "2400:2500",
                    "-w", "250000",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                self._sweep_task = asyncio.create_task(self._read_sweep_output())
            except FileNotFoundError:
                log.error("hackrf_sweep not found — is HackRF tools installed?")
                self.running = False
                await self._cb({
                    "type": "error",
                    "message": "hackrf_sweep binary not found. Install HackRF tools.",
                })
                return
            except Exception as exc:
                log.error("Failed to start hackrf_sweep: %s", exc)
                self.running = False
                await self._cb({"type": "error", "message": f"hackrf_sweep start failed: {exc}"})
                return

        await self._cb({"type": "sdr_status", "running": True, "simulate": simulate})

    async def stop_sweep(self) -> None:
        """Stop the running sweep (subprocess or simulation)."""
        if not self.running:
            return

        self.running = False

        # Kill subprocess if present
        if self._process is not None:
            try:
                self._process.kill()
                await self._process.wait()
            except ProcessLookupError:
                pass
            except Exception as exc:
                log.warning("Error killing hackrf_sweep: %s", exc)
            self._process = None

        # Cancel asyncio task
        if self._sweep_task is not None:
            self._sweep_task.cancel()
            try:
                await self._sweep_task
            except asyncio.CancelledError:
                pass
            self._sweep_task = None

        log.info("Sweep stopped")
        await self._cb({"type": "sdr_status", "running": False, "simulate": self.simulate})

    # ── real hardware reader ──────────────────────────────────────────

    async def _read_sweep_output(self) -> None:
        """Read CSV lines from the hackrf_sweep stdout stream."""
        assert self._process and self._process.stdout
        accumulated_bins: List[float] = []
        current_freq_start: Optional[float] = None
        current_timestamp: Optional[str] = None

        try:
            while self.running:
                raw = await self._process.stdout.readline()
                if not raw:
                    break
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                parsed = self._parse_sweep_line(line)
                if parsed is None:
                    continue

                ts, freq_low, freq_high, bin_width_hz, samples = parsed[:5]
                db_values = parsed[5]

                freq_low_mhz = freq_low / 1e6
                freq_high_mhz = freq_high / 1e6
                bin_width_mhz = bin_width_hz / 1e6

                # hackrf_sweep outputs partial rows; accumulate until full
                if current_freq_start is None or freq_low_mhz <= (current_freq_start + 0.001):
                    # New sweep frame
                    if accumulated_bins:
                        await self._emit_spectrum(
                            current_timestamp, current_freq_start,
                            bin_width_mhz, accumulated_bins,
                        )
                    accumulated_bins = list(db_values)
                    current_freq_start = freq_low_mhz
                    current_timestamp = ts
                else:
                    accumulated_bins.extend(db_values)

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error("Error reading hackrf_sweep output: %s", exc)
        finally:
            # Emit any remaining data
            if accumulated_bins and current_freq_start is not None:
                await self._emit_spectrum(
                    current_timestamp, current_freq_start,
                    0.25, accumulated_bins,
                )

    @staticmethod
    def _parse_sweep_line(line: str):
        """
        Parse a single hackrf_sweep CSV line.

        Format: date, time, freq_low_hz, freq_high_hz, bin_width_hz,
                num_samples, dB1, dB2, …
        Returns (timestamp_str, freq_low, freq_high, bin_width, num_samples, [dBm…])
        or None on failure.
        """
        try:
            parts = line.split(",")
            if len(parts) < 7:
                return None
            parts = [p.strip() for p in parts]
            timestamp = f"{parts[0]} {parts[1]}"
            freq_low = float(parts[2])
            freq_high = float(parts[3])
            bin_width = float(parts[4])
            num_samples = int(parts[5])
            db_values = [float(v) for v in parts[6:] if v]
            return (timestamp, freq_low, freq_high, bin_width, num_samples, db_values)
        except (ValueError, IndexError) as exc:
            log.debug("Skipping malformed sweep line: %s", exc)
            return None

    async def _emit_spectrum(
        self,
        timestamp: Optional[str],
        freq_start: float,
        bin_width: float,
        bins: List[float],
    ) -> None:
        """Build and broadcast an sdr_spectrum event."""
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        freq_end = freq_start + len(bins) * bin_width
        ble_channels = self._compute_ble_channels(bins, freq_start, bin_width)

        await self._cb({
            "type": "sdr_spectrum",
            "timestamp": ts,
            "freq_start": freq_start,
            "freq_end": freq_end,
            "bin_width": bin_width,
            "bins": bins,
            "ble_channels": ble_channels,
        })

    # ── simulation ────────────────────────────────────────────────────

    async def _simulate_loop(self) -> None:
        """Generate synthetic 2.4 GHz spectrum data at ~10 Hz."""
        freq_start = 2400.0
        freq_end = 2500.0
        bin_width = 0.25            # MHz → 400 bins
        num_bins = int((freq_end - freq_start) / bin_width)

        # WiFi channel definitions (center_mhz, bandwidth_mhz)
        wifi_channels = [
            (2412.0, 22.0),         # channel 1
            (2437.0, 22.0),         # channel 6
            (2462.0, 22.0),         # channel 11
        ]

        # Advertising channel indices
        adv_freqs = [2402.0, 2426.0, 2480.0]

        # Persistent state for fade-in/fade-out BLE bursts
        ble_adv_amplitude = {f: 0.0 for f in adv_freqs}
        data_spike_channel: Optional[float] = None
        data_spike_amplitude = 0.0

        try:
            while self.running:
                t = time.time()
                bins: List[float] = []

                for i in range(num_bins):
                    freq = freq_start + (i + 0.5) * bin_width

                    # Base noise floor: -85 to -90 dBm with small jitter
                    noise = random.uniform(-90.0, -85.0) + random.gauss(0, 0.5)

                    # WiFi humps — Gaussian shape around channel center
                    wifi_power = -120.0
                    for center, bw in wifi_channels:
                        sigma = bw / 4.0     # ~95 % energy within bandwidth
                        peak = random.uniform(-55.0, -45.0)
                        atten = -30.0 * (1.0 - math.exp(-0.5 * ((freq - center) / sigma) ** 2))
                        wifi_power = max(wifi_power, peak + atten)

                    # BLE advertising bursts (fade in/out)
                    ble_power = -120.0
                    for af in adv_freqs:
                        if abs(freq - af) < bin_width:
                            ble_power = max(ble_power, ble_adv_amplitude[af])

                    # BLE data channel spike
                    if data_spike_channel is not None and abs(freq - data_spike_channel) < bin_width:
                        ble_power = max(ble_power, data_spike_amplitude)

                    # Combine: take loudest signal
                    signal = max(noise, wifi_power, ble_power)

                    # Small time-varying ripple for realism
                    signal += 0.3 * math.sin(t * 2.0 + i * 0.05)

                    bins.append(round(signal, 2))

                # Update BLE advertising burst state (random fade in/out)
                for af in adv_freqs:
                    if ble_adv_amplitude[af] < -100:
                        # Maybe start a burst
                        if random.random() < 0.15:
                            ble_adv_amplitude[af] = random.uniform(-60.0, -40.0)
                    else:
                        # Fade out
                        ble_adv_amplitude[af] -= random.uniform(3.0, 8.0)

                # Update data channel spike
                if data_spike_channel is None or data_spike_amplitude < -100:
                    if random.random() < 0.10:
                        ch = random.randint(0, 36)
                        data_spike_channel = BLE_CHANNEL_FREQ[ch]
                        data_spike_amplitude = random.uniform(-65.0, -45.0)
                elif data_spike_amplitude > -100:
                    data_spike_amplitude -= random.uniform(5.0, 12.0)

                ble_channels = self._compute_ble_channels(bins, freq_start, bin_width)

                await self._cb({
                    "type": "sdr_spectrum",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "freq_start": freq_start,
                    "freq_end": freq_end,
                    "bin_width": bin_width,
                    "bins": bins,
                    "ble_channels": ble_channels,
                })

                await asyncio.sleep(0.1)        # ~10 Hz

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error("Simulation loop error: %s", exc)

    # ── BLE channel mapping ───────────────────────────────────────────

    @staticmethod
    def _compute_ble_channels(
        bins: List[float],
        freq_start: float,
        bin_width: float,
    ) -> Dict[int, float]:
        """
        Map 400 spectrum bins to 40 BLE channels by finding the bin
        closest to each channel's center frequency.

        Returns {channel_index: dBm_value}.
        """
        result: Dict[int, float] = {}
        num_bins = len(bins)

        for ch, center_mhz in BLE_CHANNEL_FREQ.items():
            # Bin index closest to this channel's center
            idx = round((center_mhz - freq_start) / bin_width - 0.5)
            if 0 <= idx < num_bins:
                result[ch] = bins[idx]

        return result
