"""Data models for RF Command Manager."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass(slots=True)
class DeviceItem:
    id: str
    name: str
    notes: str | None = None
    created_at: str | None = None


@dataclass(slots=True)
class CommandItem:
    id: str
    name: str
    command_type: str
    payload: str
    device_id: str | None = None
    favorite: bool = False
    send_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None
    last_sent_at: str | None = None


@dataclass(slots=True)
class MacroItem:
    id: str
    name: str
    command_ids: list[str] = field(default_factory=list)
    created_at: str | None = None


@dataclass(slots=True)
class StoragePayload:
    devices: dict[str, DeviceItem] = field(default_factory=dict)
    commands: dict[str, CommandItem] = field(default_factory=dict)
    macros: dict[str, MacroItem] = field(default_factory=dict)
    version: int = 1

    def to_dict(self) -> dict[str, object]:
        return {
            "version": self.version,
            "devices": {item_id: asdict(item) for item_id, item in self.devices.items()},
            "commands": {item_id: asdict(item) for item_id, item in self.commands.items()},
            "macros": {item_id: asdict(item) for item_id, item in self.macros.items()},
        }

    @classmethod
    def from_dict(cls, raw: dict[str, object]) -> "StoragePayload":
        devices = {
            item_id: DeviceItem(**item)
            for item_id, item in (raw.get("devices", {}) or {}).items()
        }
        commands = {
            item_id: CommandItem(**item)
            for item_id, item in (raw.get("commands", {}) or {}).items()
        }
        macros = {
            item_id: MacroItem(**item)
            for item_id, item in (raw.get("macros", {}) or {}).items()
        }
        return cls(
            devices=devices,
            commands=commands,
            macros=macros,
            version=int(raw.get("version", 1)),
        )