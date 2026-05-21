"""Service handlers for RF Command Manager."""

from __future__ import annotations

from dataclasses import dataclass

import voluptuous as vol

from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .broadlink_adapter import BroadlinkAdapter
from .const import DEFAULT_LEARN_TIMEOUT, DOMAIN
from .models import CommandModel, DeviceModel
from .storage import RFStorageManager


@dataclass(slots=True)
class RFServiceLayer:
    """Encapsulates all mutable operations on the command library."""

    storage: RFStorageManager
    adapter: BroadlinkAdapter

    async def async_add_device(
        self,
        name: str,
        connection_type: str,
        host: str | None,
        mac: str | None,
        remote_entity_id: str | None,
    ) -> dict:
        device = DeviceModel.create(
            name=name,
            connection_type=connection_type,
            host=host,
            mac=mac,
            remote_entity_id=remote_entity_id,
        )
        self.storage.library.devices[device.id] = device
        await self.storage.async_save()
        return device.to_dict()

    async def async_update_device(
        self,
        device_id: str,
        name: str | None,
        connection_type: str | None,
        host: str | None,
        mac: str | None,
        remote_entity_id: str | None,
    ) -> dict:
        device = self._require_device(device_id)
        if name is not None:
            device.name = name
        if connection_type is not None:
            device.connection_type = connection_type
        if host is not None:
            device.host = host
        if mac is not None:
            device.mac = mac
        if remote_entity_id is not None:
            device.remote_entity_id = remote_entity_id

        await self.storage.async_save()
        return device.to_dict()

    async def async_remove_device(self, device_id: str) -> None:
        device = self._require_device(device_id)
        for command_id in list(device.command_ids):
            self.storage.library.commands.pop(command_id, None)

        self.storage.library.devices.pop(device.id, None)
        await self.storage.async_save()

    async def async_add_command(
        self,
        device_id: str,
        name: str,
        protocol: str,
        payload: str,
        notes: str,
    ) -> dict:
        device = self._require_device(device_id)
        next_order = len(device.command_ids)
        command = CommandModel.create(
            device_id=device_id,
            name=name,
            protocol=protocol,
            payload=payload,
            order=next_order,
            notes=notes,
        )
        self.storage.library.commands[command.id] = command
        device.command_ids.append(command.id)
        await self.storage.async_save()
        return command.to_dict()

    async def async_update_command(
        self,
        command_id: str,
        name: str | None,
        protocol: str | None,
        payload: str | None,
        notes: str | None,
        order: int | None,
    ) -> dict:
        command = self._require_command(command_id)
        device = self._require_device(command.device_id)

        if name is not None:
            command.name = name
        if protocol is not None:
            command.protocol = protocol
        if payload is not None:
            command.payload = payload
        if notes is not None:
            command.notes = notes
        if order is not None:
            self._move_command(device, command_id, order)

        await self.storage.async_save()
        return command.to_dict()

    async def async_remove_command(self, command_id: str) -> None:
        command = self._require_command(command_id)
        device = self._require_device(command.device_id)

        device.command_ids = [item for item in device.command_ids if item != command_id]
        self.storage.library.commands.pop(command_id, None)
        self._renumber_orders(device)
        await self.storage.async_save()

    async def async_send_command(self, command_id: str) -> None:
        command = self._require_command(command_id)
        device = self._require_device(command.device_id)
        await self.adapter.async_send_command(device, command.payload)

    async def async_learn_and_add_command(
        self,
        device_id: str,
        name: str,
        timeout: int,
        notes: str,
    ) -> dict:
        device = self._require_device(device_id)
        learned = await self.adapter.async_learn_command(device=device, timeout=timeout)
        return await self.async_add_command(
            device_id=device.id,
            name=name,
            protocol=learned.protocol,
            payload=learned.payload,
            notes=notes,
        )

    def async_get_library_payload(self) -> dict:
        return self.storage.library.as_sorted_payload()

    def _require_device(self, device_id: str) -> DeviceModel:
        device = self.storage.library.devices.get(device_id)
        if device is None:
            raise HomeAssistantError(f"Unknown device id: {device_id}")
        return device

    def _require_command(self, command_id: str) -> CommandModel:
        command = self.storage.library.commands.get(command_id)
        if command is None:
            raise HomeAssistantError(f"Unknown command id: {command_id}")
        return command

    def _move_command(self, device: DeviceModel, command_id: str, new_order: int) -> None:
        if command_id not in device.command_ids:
            raise HomeAssistantError("Command does not belong to target device")

        current = device.command_ids.index(command_id)
        destination = max(0, min(new_order, len(device.command_ids) - 1))

        if current != destination:
            device.command_ids.pop(current)
            device.command_ids.insert(destination, command_id)
            self._renumber_orders(device)

    def _renumber_orders(self, device: DeviceModel) -> None:
        for idx, command_id in enumerate(device.command_ids):
            if command_id in self.storage.library.commands:
                self.storage.library.commands[command_id].order = idx


SERVICE_ADD_DEVICE = "add_device"
SERVICE_UPDATE_DEVICE = "update_device"
SERVICE_REMOVE_DEVICE = "remove_device"
SERVICE_ADD_COMMAND = "add_command"
SERVICE_UPDATE_COMMAND = "update_command"
SERVICE_REMOVE_COMMAND = "remove_command"
SERVICE_SEND_COMMAND = "send_command"
SERVICE_LEARN_COMMAND = "learn_command"


ADD_DEVICE_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("connection_type", default="broadlink"): cv.string,
        vol.Optional("host"): cv.string,
        vol.Optional("mac"): cv.string,
        vol.Optional("remote_entity_id"): cv.entity_id,
    }
)

UPDATE_DEVICE_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): cv.string,
        vol.Optional("name"): cv.string,
        vol.Optional("connection_type"): cv.string,
        vol.Optional("host"): vol.Any(cv.string, None),
        vol.Optional("mac"): vol.Any(cv.string, None),
        vol.Optional("remote_entity_id"): vol.Any(cv.entity_id, None),
    }
)

REMOVE_DEVICE_SCHEMA = vol.Schema({vol.Required("device_id"): cv.string})

ADD_COMMAND_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): cv.string,
        vol.Required("name"): cv.string,
        vol.Optional("protocol", default="rf"): cv.string,
        vol.Required("payload"): cv.string,
        vol.Optional("notes", default=""): cv.string,
    }
)

UPDATE_COMMAND_SCHEMA = vol.Schema(
    {
        vol.Required("command_id"): cv.string,
        vol.Optional("name"): cv.string,
        vol.Optional("protocol"): cv.string,
        vol.Optional("payload"): cv.string,
        vol.Optional("notes"): cv.string,
        vol.Optional("order"): vol.Coerce(int),
    }
)

REMOVE_COMMAND_SCHEMA = vol.Schema({vol.Required("command_id"): cv.string})
SEND_COMMAND_SCHEMA = vol.Schema({vol.Required("command_id"): cv.string})

LEARN_COMMAND_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): cv.string,
        vol.Required("name"): cv.string,
        vol.Optional("timeout", default=DEFAULT_LEARN_TIMEOUT): vol.Coerce(int),
        vol.Optional("notes", default=""): cv.string,
    }
)


@callback
def _build_response(payload: dict | None = None) -> ServiceResponse:
    """Standard service response payload wrapper."""
    return {
        "ok": True,
        "payload": payload or {},
    }


async def async_register_services(hass: HomeAssistant, layer: RFServiceLayer) -> None:
    """Register Home Assistant services for the domain."""

    async def add_device(call: ServiceCall) -> ServiceResponse:
        payload = await layer.async_add_device(
            name=call.data["name"],
            connection_type=call.data["connection_type"],
            host=call.data.get("host"),
            mac=call.data.get("mac"),
            remote_entity_id=call.data.get("remote_entity_id"),
        )
        return _build_response(payload)

    async def update_device(call: ServiceCall) -> ServiceResponse:
        payload = await layer.async_update_device(
            device_id=call.data["device_id"],
            name=call.data.get("name"),
            connection_type=call.data.get("connection_type"),
            host=call.data.get("host"),
            mac=call.data.get("mac"),
            remote_entity_id=call.data.get("remote_entity_id"),
        )
        return _build_response(payload)

    async def remove_device(call: ServiceCall) -> ServiceResponse:
        await layer.async_remove_device(call.data["device_id"])
        return _build_response()

    async def add_command(call: ServiceCall) -> ServiceResponse:
        payload = await layer.async_add_command(
            device_id=call.data["device_id"],
            name=call.data["name"],
            protocol=call.data["protocol"],
            payload=call.data["payload"],
            notes=call.data["notes"],
        )
        return _build_response(payload)

    async def update_command(call: ServiceCall) -> ServiceResponse:
        payload = await layer.async_update_command(
            command_id=call.data["command_id"],
            name=call.data.get("name"),
            protocol=call.data.get("protocol"),
            payload=call.data.get("payload"),
            notes=call.data.get("notes"),
            order=call.data.get("order"),
        )
        return _build_response(payload)

    async def remove_command(call: ServiceCall) -> ServiceResponse:
        await layer.async_remove_command(call.data["command_id"])
        return _build_response()

    async def send_command(call: ServiceCall) -> ServiceResponse:
        await layer.async_send_command(call.data["command_id"])
        return _build_response()

    async def learn_command(call: ServiceCall) -> ServiceResponse:
        payload = await layer.async_learn_and_add_command(
            device_id=call.data["device_id"],
            name=call.data["name"],
            timeout=call.data["timeout"],
            notes=call.data["notes"],
        )
        return _build_response(payload)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_DEVICE,
        add_device,
        schema=ADD_DEVICE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_DEVICE,
        update_device,
        schema=UPDATE_DEVICE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_DEVICE,
        remove_device,
        schema=REMOVE_DEVICE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_COMMAND,
        add_command,
        schema=ADD_COMMAND_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_COMMAND,
        update_command,
        schema=UPDATE_COMMAND_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_COMMAND,
        remove_command,
        schema=REMOVE_COMMAND_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SEND_COMMAND,
        send_command,
        schema=SEND_COMMAND_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_LEARN_COMMAND,
        learn_command,
        schema=LEARN_COMMAND_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )


async def async_unregister_services(hass: HomeAssistant) -> None:
    """Remove domain services on unload."""
    for service_name in (
        SERVICE_ADD_DEVICE,
        SERVICE_UPDATE_DEVICE,
        SERVICE_REMOVE_DEVICE,
        SERVICE_ADD_COMMAND,
        SERVICE_UPDATE_COMMAND,
        SERVICE_REMOVE_COMMAND,
        SERVICE_SEND_COMMAND,
        SERVICE_LEARN_COMMAND,
    ):
        hass.services.async_remove(DOMAIN, service_name)
