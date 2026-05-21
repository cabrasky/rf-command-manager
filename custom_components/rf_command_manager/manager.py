"""Local persistence and library management for RF Command Manager."""

from __future__ import annotations

from datetime import UTC, datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .models import CommandItem, DeviceItem, MacroItem, StoragePayload


class CommandManager:
    """Own the local command library and persistence."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data = StoragePayload()

    @property
    def data(self) -> StoragePayload:
        """Return the in-memory library snapshot."""
        return self._data

    async def async_load(self) -> None:
        """Load stored data from Home Assistant storage."""
        raw = await self._store.async_load()
        if raw:
            self._data = StoragePayload.from_dict(raw)

    async def async_close(self) -> None:
        """Persist the latest library snapshot."""
        await self._store.async_save(self._data.to_dict())

    async def async_add_device(self, name: str, notes: str | None = None) -> DeviceItem:
        device = DeviceItem(
            id=self._new_id(),
            name=name,
            notes=notes,
            created_at=self._utc_now(),
        )
        self._data.devices[device.id] = device
        await self.async_close()
        return device

    async def async_add_command(
        self,
        *,
        name: str,
        command_type: str,
        payload: str,
        device_id: str | None = None,
        favorite: bool = False,
    ) -> CommandItem:
        command = CommandItem(
            id=self._new_id(),
            name=name,
            command_type=command_type,
            payload=payload,
            device_id=device_id,
            favorite=favorite,
            send_count=0,
            created_at=self._utc_now(),
            updated_at=self._utc_now(),
        )
        self._data.commands[command.id] = command
        await self.async_close()
        return command

    async def async_update_command(
        self,
        *,
        command_id: str,
        name: str | None = None,
        payload: str | None = None,
        device_id: str | None = None,
        favorite: bool | None = None,
    ) -> CommandItem:
        command = self._require_command(command_id)
        if name is not None:
            command.name = name
        if payload is not None:
            command.payload = payload
        if device_id is not None:
            command.device_id = device_id
        if favorite is not None:
            command.favorite = favorite
        command.updated_at = self._utc_now()
        await self.async_close()
        return command

    async def async_remove_command(self, command_id: str) -> None:
        self._require_command(command_id)
        self._data.commands.pop(command_id)
        for macro in self._data.macros.values():
            macro.command_ids = [item_id for item_id in macro.command_ids if item_id != command_id]
        await self.async_close()

    async def async_add_macro(self, *, name: str, command_ids: list[str]) -> MacroItem:
        macro = MacroItem(
            id=self._new_id(),
            name=name,
            command_ids=command_ids,
            created_at=self._utc_now(),
        )
        self._data.macros[macro.id] = macro
        await self.async_close()
        return macro

    async def async_record_send(self, command_id: str) -> CommandItem:
        command = self._require_command(command_id)
        command.send_count += 1
        command.last_sent_at = self._utc_now()
        command.updated_at = self._utc_now()
        await self.async_close()
        return command

    def async_library_snapshot(self) -> dict[str, object]:
        """Return a serialized snapshot for the frontend."""
        return self._data.to_dict()

    def _require_command(self, command_id: str) -> CommandItem:
        if command_id not in self._data.commands:
            raise KeyError(f"Unknown command: {command_id}")
        return self._data.commands[command_id]

    @staticmethod
    def _new_id() -> str:
        from uuid import uuid4

        return uuid4().hex

    @staticmethod
    def _utc_now() -> str:
        return datetime.now(tz=UTC).isoformat()