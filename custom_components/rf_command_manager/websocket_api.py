"""Websocket API for RF Command Manager panel UI."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import ActiveConnection
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN
from .services import RFServiceLayer

TYPE_LIST = f"{DOMAIN}/list"
TYPE_ADD_DEVICE = f"{DOMAIN}/device/add"
TYPE_UPDATE_DEVICE = f"{DOMAIN}/device/update"
TYPE_REMOVE_DEVICE = f"{DOMAIN}/device/remove"
TYPE_ADD_COMMAND = f"{DOMAIN}/command/add"
TYPE_UPDATE_COMMAND = f"{DOMAIN}/command/update"
TYPE_REMOVE_COMMAND = f"{DOMAIN}/command/remove"
TYPE_SEND_COMMAND = f"{DOMAIN}/command/send"
TYPE_LEARN_COMMAND = f"{DOMAIN}/command/learn"


@callback
def async_register_websocket_api(hass: HomeAssistant, layer: RFServiceLayer) -> None:
    """Register websocket commands exposed to the panel app."""

    websocket_api.async_register_command(hass, handle_list)
    websocket_api.async_register_command(hass, handle_add_device)
    websocket_api.async_register_command(hass, handle_update_device)
    websocket_api.async_register_command(hass, handle_remove_device)
    websocket_api.async_register_command(hass, handle_add_command)
    websocket_api.async_register_command(hass, handle_update_command)
    websocket_api.async_register_command(hass, handle_remove_command)
    websocket_api.async_register_command(hass, handle_send_command)
    websocket_api.async_register_command(hass, handle_learn_command)

    hass.data.setdefault(DOMAIN, {})["service_layer"] = layer


@callback
def async_unregister_websocket_api(hass: HomeAssistant) -> None:
    """No-op placeholder for symmetry with integration unload."""


def _layer(hass: HomeAssistant) -> RFServiceLayer:
    """Return active service layer instance."""
    return hass.data[DOMAIN]["service_layer"]


def _success(connection: ActiveConnection, msg: dict, payload: dict | None = None) -> None:
    connection.send_result(msg["id"], payload or {})


def _error(connection: ActiveConnection, msg: dict, err: Exception) -> None:
    connection.send_error(msg["id"], "rf_command_manager_error", str(err))


@websocket_api.websocket_command({vol.Required("type"): TYPE_LIST})
@websocket_api.async_response
async def handle_list(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict,
) -> None:
    """Return current device and command library."""
    payload = _layer(hass).async_get_library_payload()
    _success(connection, msg, payload)


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_ADD_DEVICE,
        vol.Required("name"): str,
        vol.Optional("connection_type", default="broadlink"): str,
        vol.Optional("host"): str,
        vol.Optional("mac"): str,
        vol.Optional("remote_entity_id"): str,
    }
)
@websocket_api.async_response
async def handle_add_device(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Create a device and return the refreshed library."""
    try:
        await _layer(hass).async_add_device(
            name=msg["name"],
            connection_type=msg["connection_type"],
            host=msg.get("host"),
            mac=msg.get("mac"),
            remote_entity_id=msg.get("remote_entity_id"),
        )
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_UPDATE_DEVICE,
        vol.Required("device_id"): str,
        vol.Optional("name"): str,
        vol.Optional("connection_type"): str,
        vol.Optional("host"): vol.Any(str, None),
        vol.Optional("mac"): vol.Any(str, None),
        vol.Optional("remote_entity_id"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def handle_update_device(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Update a device and return the refreshed library."""
    try:
        await _layer(hass).async_update_device(
            device_id=msg["device_id"],
            name=msg.get("name"),
            connection_type=msg.get("connection_type"),
            host=msg.get("host"),
            mac=msg.get("mac"),
            remote_entity_id=msg.get("remote_entity_id"),
        )
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_REMOVE_DEVICE,
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
async def handle_remove_device(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Remove a device and return the refreshed library."""
    try:
        await _layer(hass).async_remove_device(device_id=msg["device_id"])
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_ADD_COMMAND,
        vol.Required("device_id"): str,
        vol.Required("name"): str,
        vol.Optional("protocol", default="rf"): str,
        vol.Required("payload"): str,
        vol.Optional("notes", default=""): str,
    }
)
@websocket_api.async_response
async def handle_add_command(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Create a command and return the refreshed library."""
    try:
        await _layer(hass).async_add_command(
            device_id=msg["device_id"],
            name=msg["name"],
            protocol=msg["protocol"],
            payload=msg["payload"],
            notes=msg["notes"],
        )
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_UPDATE_COMMAND,
        vol.Required("command_id"): str,
        vol.Optional("name"): str,
        vol.Optional("protocol"): str,
        vol.Optional("payload"): str,
        vol.Optional("notes"): str,
        vol.Optional("order"): int,
    }
)
@websocket_api.async_response
async def handle_update_command(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Update a command and return the refreshed library."""
    try:
        await _layer(hass).async_update_command(
            command_id=msg["command_id"],
            name=msg.get("name"),
            protocol=msg.get("protocol"),
            payload=msg.get("payload"),
            notes=msg.get("notes"),
            order=msg.get("order"),
        )
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_REMOVE_COMMAND,
        vol.Required("command_id"): str,
    }
)
@websocket_api.async_response
async def handle_remove_command(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Remove a command and return the refreshed library."""
    try:
        await _layer(hass).async_remove_command(command_id=msg["command_id"])
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_SEND_COMMAND,
        vol.Required("command_id"): str,
    }
)
@websocket_api.async_response
async def handle_send_command(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Send a command and return success indicator."""
    try:
        await _layer(hass).async_send_command(command_id=msg["command_id"])
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, {"sent": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): TYPE_LEARN_COMMAND,
        vol.Required("device_id"): str,
        vol.Required("name"): str,
        vol.Optional("timeout", default=15): int,
        vol.Optional("notes", default=""): str,
    }
)
@websocket_api.async_response
async def handle_learn_command(hass: HomeAssistant, connection: ActiveConnection, msg: dict) -> None:
    """Learn and store a command, then return the refreshed library."""
    try:
        await _layer(hass).async_learn_and_add_command(
            device_id=msg["device_id"],
            name=msg["name"],
            timeout=msg["timeout"],
            notes=msg["notes"],
        )
    except HomeAssistantError as err:
        _error(connection, msg, err)
        return

    _success(connection, msg, _layer(hass).async_get_library_payload())
