"""
ble_manager.py — BLE logic using bleak.
Cross-platform: Linux/BlueZ · macOS/CoreBluetooth · Raspberry Pi · Windows/WinRT
"""

import asyncio
import logging
import struct
from typing import Callable, Dict, List, Optional

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

log = logging.getLogger("ble_manager")


class BLEManager:
    def __init__(self, notify_callback: Callable):
        self._cb = notify_callback          # async fn(event: dict)
        self._client: Optional[BleakClient] = None
        self._scanning = False
        self._subs: Dict[str, bool] = {}    # char uuid → subscribed

    # ── properties ───────────────────────────────────────────────────
    @property
    def connected(self) -> bool:
        return bool(self._client and self._client.is_connected)

    # ── scan ─────────────────────────────────────────────────────────
    async def scan(
        self,
        duration: float = 5.0,
        name_filter: str = "",
        rssi_min: int = -100,
    ) -> List[dict]:
        found: Dict[str, dict] = {}

        def _detect(device: BLEDevice, adv: AdvertisementData):
            rssi = adv.rssi if adv.rssi is not None else -999
            if rssi < rssi_min:
                return
            name = device.name or adv.local_name or ""
            if name_filter and name_filter.lower() not in name.lower():
                return
            # Build advertisement data (nRF Connect style)
            adv_data = {}
            if adv.service_uuids:
                adv_data["service_uuids"] = list(adv.service_uuids)
            if adv.manufacturer_data:
                # manufacturer_data: {company_id: bytes}
                adv_data["manufacturer_data"] = {
                    str(cid): list(val) for cid, val in adv.manufacturer_data.items()
                }
            if adv.service_data:
                adv_data["service_data"] = {
                    str(k): list(v) for k, v in adv.service_data.items()
                }
            if adv.tx_power is not None:
                adv_data["tx_power"] = adv.tx_power
            if adv.local_name:
                adv_data["local_name"] = adv.local_name

            entry = {
                "name": name or "(unknown)",
                "address": device.address,
                "rssi": rssi,
            }
            if adv_data:
                entry["adv"] = adv_data

            # Track RSSI history for signal graph
            prev = found.get(device.address)
            if prev and "rssi_history" in prev:
                rssi_hist = prev["rssi_history"]
                rssi_hist.append(rssi)
                if len(rssi_hist) > 20:
                    rssi_hist.pop(0)
                entry["rssi_history"] = rssi_hist
            else:
                entry["rssi_history"] = [rssi]

            if adv_data:
                entry["adv"] = adv_data
            found[device.address] = entry

        self._scanning = True
        try:
            async with BleakScanner(detection_callback=_detect):
                await asyncio.sleep(duration)
        except Exception as e:
            log.error("Scan error: %s", e)
        finally:
            self._scanning = False

        devices = list(found.values())
        await self._cb({"type": "scan_result", "devices": devices})
        return devices

    async def stop_scan(self):
        self._scanning = False

    # ── connect ───────────────────────────────────────────────────────
    async def connect(self, address: str, name: str = "") -> bool:
        try:
            self._client = BleakClient(
                address,
                disconnected_callback=self._on_disconnect,
            )
            await self._client.connect()
            log.info("Connected → %s", address)
            # Gather connection info (nRF Connect style)
            conn_info = {
                "type": "connected",
                "address": address,
                "name": name or address,
            }
            try:
                conn_info["mtu"] = self._client.mtu_size
            except Exception:
                pass
            await self._cb(conn_info)
            return True
        except Exception as e:
            log.error("Connect error: %s", e)
            await self._cb({"type": "error", "message": f"Connect failed: {e}"})
            return False

    def _on_disconnect(self, client: BleakClient):
        log.info("Disconnected ← %s", client.address)
        asyncio.create_task(
            self._cb({"type": "disconnected", "address": client.address})
        )

    async def disconnect(self):
        if self._client and self._client.is_connected:
            await self._client.disconnect()
        self._client = None
        self._subs.clear()

    # ── discover ──────────────────────────────────────────────────────
    async def discover_services(self) -> List[dict]:
        if not self.connected:
            await self._cb({"type": "error", "message": "Not connected"})
            return []
        services = []
        for svc in self._client.services:
            chars = [
                {
                    "uuid": c.uuid,
                    "description": c.description,
                    "properties": list(c.properties),
                }
                for c in svc.characteristics
            ]
            services.append({
                "uuid": svc.uuid,
                "description": svc.description,
                "characteristics": chars,
            })
        await self._cb({"type": "services", "services": services})
        return services

    async def get_characteristics(self, service_uuid: str) -> List[dict]:
        if not self.connected:
            return []
        try:
            svc = self._client.services.get_service(service_uuid)
            chars = [
                {
                    "uuid": c.uuid,
                    "description": c.description,
                    "properties": list(c.properties),
                }
                for c in svc.characteristics
            ]
            await self._cb({"type": "characteristics", "service": service_uuid, "characteristics": chars})
            return chars
        except Exception as e:
            await self._cb({"type": "error", "message": str(e)})
            return []

    # ── read ──────────────────────────────────────────────────────────
    async def read(self, char_uuid: str) -> Optional[bytes]:
        if not self.connected:
            return None
        try:
            data = await self._client.read_gatt_char(char_uuid)
            decoded = _decode(data)
            await self._cb({
                "type": "read_result",
                "characteristic": char_uuid,
                "raw": list(data),
                **decoded,
            })
            return data
        except Exception as e:
            await self._cb({"type": "error", "message": f"Read: {e}"})
            return None

    # ── write ─────────────────────────────────────────────────────────
    async def write(self, char_uuid: str, value: bytes, no_response: bool = False) -> bool:
        if not self.connected:
            return False
        try:
            await self._client.write_gatt_char(char_uuid, value, response=not no_response)
            await self._cb({"type": "write_ok", "characteristic": char_uuid, "bytes": len(value)})
            return True
        except Exception as e:
            await self._cb({"type": "error", "message": f"Write: {e}"})
            return False

    # ── subscribe ─────────────────────────────────────────────────────
    async def subscribe(self, char_uuid: str):
        if not self.connected:
            return
        try:
            def _handler(sender, data: bytearray):
                decoded = _decode(bytes(data))
                asyncio.create_task(self._cb({
                    "type": "notify",
                    "characteristic": char_uuid,
                    "raw": list(data),
                    **decoded,
                }))
            await self._client.start_notify(char_uuid, _handler)
            self._subs[char_uuid] = True
            await self._cb({"type": "subscribed", "characteristic": char_uuid})
        except Exception as e:
            await self._cb({"type": "error", "message": f"Subscribe: {e}"})

    async def unsubscribe(self, char_uuid: str):
        if not self.connected or char_uuid not in self._subs:
            return
        try:
            await self._client.stop_notify(char_uuid)
            del self._subs[char_uuid]
            await self._cb({"type": "unsubscribed", "characteristic": char_uuid})
        except Exception as e:
            await self._cb({"type": "error", "message": f"Unsubscribe: {e}"})

    # ── connection info (nRF Connect style) ────────────────────────────
    async def get_conn_info(self) -> dict:
        """Return connection parameters like nRF Connect does."""
        if not self.connected:
            await self._cb({"type": "error", "message": "Not connected"})
            return {}
        info = {"type": "conn_info", "address": self._client.address}
        try:
            info["mtu"] = self._client.mtu_size
        except Exception:
            pass
        info["subscribed"] = list(self._subs.keys())
        await self._cb(info)
        return info

    # ── read descriptors ───────────────────────────────────────────────
    async def read_descriptors(self, char_uuid: str) -> List[dict]:
        """Read all descriptors for a characteristic (like nRF Connect)."""
        if not self.connected:
            return []
        try:
            svc = None
            char_obj = None
            for s in self._client.services:
                for c in s.characteristics:
                    if c.uuid == char_uuid:
                        svc = s
                        char_obj = c
                        break
                if char_obj:
                    break
            if not char_obj:
                return []
            descriptors = []
            for desc in char_obj.descriptors:
                try:
                    val = await self._client.read_gatt_descriptor(desc.handle)
                    descriptors.append({
                        "uuid": desc.uuid,
                        "description": desc.description,
                        "handle": desc.handle,
                        "value": list(val),
                        "hex": val.hex(" ").upper() if val else "",
                    })
                except Exception:
                    descriptors.append({
                        "uuid": desc.uuid,
                        "description": desc.description,
                        "handle": desc.handle,
                    })
            await self._cb({"type": "descriptors", "characteristic": char_uuid, "descriptors": descriptors})
            return descriptors
        except Exception as e:
            await self._cb({"type": "error", "message": f"Descriptors: {e}"})
            return []


# ── decode helper ─────────────────────────────────────────────────────────────

def _decode(data: bytes) -> dict:
    """Return hex, utf-8 string, and numeric interpretation of raw bytes."""
    hex_val = data.hex(" ").upper() if data else ""

    try:
        str_val = data.decode("utf-8").strip()
    except Exception:
        str_val = ""

    num_val = None
    n = len(data)
    try:
        if n == 4:
            num_val = struct.unpack("<f", data)[0]
        elif n == 2:
            num_val = struct.unpack("<h", data)[0]
        elif n == 1:
            num_val = data[0]
        elif n >= 4:
            num_val = struct.unpack("<i", data[:4])[0]
    except Exception:
        pass

    return {"hex": hex_val, "str": str_val, "num": num_val}
