"""RF Command Manager Home Assistant integration."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, ServiceCall, callback

from .const import (
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_STATIC_PATH,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PLATFORMS,
)
from .manager import CommandManager


ServiceHandler = Callable[[ServiceCall], Any]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the integration from YAML if needed."""
    hass.data.setdefault(DOMAIN, {})

    @websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/get_library"})
    @websocket_api.async_response
    async def websocket_get_library(
        _hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
    ) -> None:
        """Return the current library snapshot."""
        entries = _hass.data.get(DOMAIN, {})
        if not entries:
            connection.send_result(msg["id"], {"version": 1, "devices": {}, "commands": {}, "macros": {}})
            return

        manager = next(iter(entries.values()))
        connection.send_result(msg["id"], manager.async_library_snapshot())

    websocket_api.async_register_command(hass, websocket_get_library)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up RF Command Manager from a config entry."""
    manager = CommandManager(hass, entry.entry_id)
    await manager.async_load()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = manager

    static_path = Path(__file__).parent / "static"
    if not frontend.async_panel_exists(hass, PANEL_URL_PATH):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_STATIC_PATH, static_path, cache_headers=False)]
        )
        await panel_custom.async_register_panel(
            hass=hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=PANEL_COMPONENT,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=f"{PANEL_STATIC_PATH}/rf_command_manager_panel.js",
            embed_iframe=False,
            require_admin=False,
        )

    async def handle_add_command(call: ServiceCall) -> None:
        await manager.async_add_command(
            name=call.data["name"],
            command_type=call.data["command_type"],
            payload=call.data["payload"],
            device_id=call.data.get("device_id"),
            favorite=call.data.get("favorite", False),
        )

    async def handle_update_command(call: ServiceCall) -> None:
        await manager.async_update_command(
            command_id=call.data["command_id"],
            name=call.data.get("name"),
            payload=call.data.get("payload"),
            device_id=call.data.get("device_id"),
            favorite=call.data.get("favorite"),
        )

    async def handle_remove_command(call: ServiceCall) -> None:
        await manager.async_remove_command(call.data["command_id"])

    async def handle_add_device(call: ServiceCall) -> None:
        await manager.async_add_device(call.data["name"], call.data.get("notes"))

    async def handle_add_macro(call: ServiceCall) -> None:
        await manager.async_add_macro(
            name=call.data["name"],
            command_ids=call.data["command_ids"],
        )

    async def handle_send_command(call: ServiceCall) -> None:
        await manager.async_record_send(call.data["command_id"])

    services: dict[str, tuple[ServiceHandler, vol.Schema]] = {
        "add_command": (
            handle_add_command,
            vol.Schema(
                {
                    vol.Required("name"): str,
                    vol.Required("command_type"): vol.In(["rf", "ir", "macro"]),
                    vol.Required("payload"): str,
                    vol.Optional("device_id"): str,
                    vol.Optional("favorite", default=False): bool,
                }
            ),
        ),
        "update_command": (
            handle_update_command,
            vol.Schema(
                {
                    vol.Required("command_id"): str,
                    vol.Optional("name"): str,
                    vol.Optional("payload"): str,
                    vol.Optional("device_id"): str,
                    vol.Optional("favorite"): bool,
                }
            ),
        ),
        "remove_command": (
            handle_remove_command,
            vol.Schema({vol.Required("command_id"): str}),
        ),
        "add_device": (
            handle_add_device,
            vol.Schema(
                {
                    vol.Required("name"): str,
                    vol.Optional("notes"): str,
                }
            ),
        ),
        "add_macro": (
            handle_add_macro,
            vol.Schema(
                {
                    vol.Required("name"): str,
                    vol.Required("command_ids"): [str],
                }
            ),
        ),
        "send_command": (
            handle_send_command,
            vol.Schema({vol.Required("command_id"): str}),
        ),
    }

    for service_name, (handler, schema) in services.items():
        hass.services.async_register(
            DOMAIN,
            service_name,
            handler,
            schema=schema,
        )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the config entry and service handlers."""
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False

    manager = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if manager is not None:
        await manager.async_close()

    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)

    for service_name in (
        "add_command",
        "update_command",
        "remove_command",
        "add_device",
        "add_macro",
        "send_command",
    ):
        if hass.services.has_service(DOMAIN, service_name):
            hass.services.async_remove(DOMAIN, service_name)

    return True


@callback
def get_manager(hass: HomeAssistant, entry_id: str) -> CommandManager:
    """Return the active command manager for an entry."""
    return hass.data[DOMAIN][entry_id]