"""Broadlink execution and learning adapter."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import DEFAULT_LEARN_TIMEOUT
from .models import DeviceModel


@dataclass(slots=True)
class LearnResult:
    """Result payload for a learned command."""

    payload: str
    protocol: str


class BroadlinkAdapter:
    """Adapter for sending and learning commands through Broadlink."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def async_send_command(self, device: DeviceModel, payload: str) -> None:
        """Send command through a linked remote entity or direct Broadlink connection."""
        if device.remote_entity_id:
            await self._hass.services.async_call(
                "remote",
                "send_command",
                {
                    "entity_id": device.remote_entity_id,
                    "command": payload,
                },
                blocking=True,
            )
            return

        await self._hass.async_add_executor_job(self._send_direct, device, payload)

    async def async_learn_command(
        self,
        device: DeviceModel,
        timeout: int = DEFAULT_LEARN_TIMEOUT,
    ) -> LearnResult:
        """Learn command payload from a linked remote entity or direct Broadlink."""
        if device.remote_entity_id:
            raise HomeAssistantError(
                "Learning through Home Assistant remote entities is not implemented yet. "
                "Use direct Broadlink host and mac for learning."
            )

        payload = await self._hass.async_add_executor_job(self._learn_direct, device, timeout)
        return LearnResult(payload=payload, protocol="rf")

    @staticmethod
    def _build_device(device: DeviceModel) -> Any:
        """Instantiate broadlink device object from model attributes."""
        if not device.host or not device.mac:
            raise HomeAssistantError("Device host and mac are required for direct Broadlink mode")

        try:
            import broadlink
        except ImportError as err:
            raise HomeAssistantError("Broadlink python dependency is not available") from err

        mac_bytes = bytes.fromhex(device.mac.replace(":", ""))
        broadlink_device = broadlink.hello(device.host)
        if broadlink_device is None:
            broadlink_device = broadlink.gendevice(0x272a, (device.host, 80), mac_bytes)

        broadlink_device.auth()
        return broadlink_device

    @classmethod
    def _send_direct(cls, device: DeviceModel, payload: str) -> None:
        """Send command directly to a Broadlink device."""
        broadlink_device = cls._build_device(device)
        broadlink_device.send_data(base64.b64decode(payload))

    @classmethod
    def _learn_direct(cls, device: DeviceModel, timeout: int) -> str:
        """Learn command directly from a Broadlink device."""
        import time

        broadlink_device = cls._build_device(device)
        broadlink_device.enter_learning()

        end_time = time.time() + timeout
        while time.time() < end_time:
            data = broadlink_device.check_data()
            if data:
                return base64.b64encode(data).decode("utf-8")
            time.sleep(0.5)

        raise HomeAssistantError("Timed out waiting for learned RF/IR payload")
