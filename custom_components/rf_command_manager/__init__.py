"""RF Command Manager integration setup."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .broadlink_adapter import BroadlinkAdapter
from .const import DATA_RUNTIME, DOMAIN
from .panel import async_setup_panel, async_unload_panel
from .services import RFServiceLayer, async_register_services, async_unregister_services
from .storage import RFStorageManager
from .websocket_api import async_register_websocket_api, async_unregister_websocket_api


@dataclass(slots=True)
class RuntimeData:
    """Runtime objects shared across service and API handlers."""

    storage: RFStorageManager
    service_layer: RFServiceLayer


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up RF Command Manager from config entry."""
    hass.data.setdefault(DOMAIN, {})

    storage = RFStorageManager(hass)
    await storage.async_load()

    service_layer = RFServiceLayer(storage=storage, adapter=BroadlinkAdapter(hass))
    runtime = RuntimeData(storage=storage, service_layer=service_layer)

    hass.data[DOMAIN][DATA_RUNTIME] = runtime
    hass.data[DOMAIN][entry.entry_id] = runtime

    await async_register_services(hass, service_layer)
    async_register_websocket_api(hass, service_layer)
    await async_setup_panel(hass)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload RF Command Manager config entry."""
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)

    await async_unregister_services(hass)
    async_unregister_websocket_api(hass)
    await async_unload_panel(hass)

    if DOMAIN in hass.data:
        hass.data[DOMAIN].pop(DATA_RUNTIME, None)

    return True
