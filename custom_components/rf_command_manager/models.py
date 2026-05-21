"""Data models for RF Command Manager."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4


@dataclass(slots=True)
class CommandModel:
    """Represents a single RF or IR command."""

    id: str
    device_id: str
    name: str
    protocol: str
    payload: str
    order: int = 0
    notes: str = ""

    @classmethod
    def create(
        cls,
        device_id: str,
        name: str,
        protocol: str,
        payload: str,
        order: int = 0,
        notes: str = "",
    ) -> "CommandModel":
        """Build a new command model with a generated id."""
        return cls(
            id=str(uuid4()),
            device_id=device_id,
            name=name,
            protocol=protocol,
            payload=payload,
            order=order,
            notes=notes,
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize model for storage and API payloads."""
        return {
            "id": self.id,
            "device_id": self.device_id,
            "name": self.name,
            "protocol": self.protocol,
            "payload": self.payload,
            "order": self.order,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CommandModel":
        """Build model from storage payload."""
        return cls(
            id=data["id"],
            device_id=data["device_id"],
            name=data["name"],
            protocol=data.get("protocol", "rf"),
            payload=data["payload"],
            order=int(data.get("order", 0)),
            notes=data.get("notes", ""),
        )


@dataclass(slots=True)
class DeviceModel:
    """Represents a physical remote-controlled device."""

    id: str
    name: str
    connection_type: str
    host: str | None = None
    mac: str | None = None
    remote_entity_id: str | None = None
    command_ids: list[str] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        name: str,
        connection_type: str,
        host: str | None = None,
        mac: str | None = None,
        remote_entity_id: str | None = None,
    ) -> "DeviceModel":
        """Build a new device model with a generated id."""
        return cls(
            id=str(uuid4()),
            name=name,
            connection_type=connection_type,
            host=host,
            mac=mac,
            remote_entity_id=remote_entity_id,
            command_ids=[],
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize model for storage and API payloads."""
        return {
            "id": self.id,
            "name": self.name,
            "connection_type": self.connection_type,
            "host": self.host,
            "mac": self.mac,
            "remote_entity_id": self.remote_entity_id,
            "command_ids": list(self.command_ids),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "DeviceModel":
        """Build model from storage payload."""
        return cls(
            id=data["id"],
            name=data["name"],
            connection_type=data.get("connection_type", "broadlink"),
            host=data.get("host"),
            mac=data.get("mac"),
            remote_entity_id=data.get("remote_entity_id"),
            command_ids=list(data.get("command_ids", [])),
        )


@dataclass(slots=True)
class LibraryModel:
    """Persistent root structure for devices and commands."""

    devices: dict[str, DeviceModel] = field(default_factory=dict)
    commands: dict[str, CommandModel] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize full library."""
        return {
            "devices": {device_id: device.to_dict() for device_id, device in self.devices.items()},
            "commands": {
                command_id: command.to_dict()
                for command_id, command in self.commands.items()
            },
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "LibraryModel":
        """Build full library from storage payload."""
        if not data:
            return cls()

        devices = {
            device_id: DeviceModel.from_dict(device_data)
            for device_id, device_data in data.get("devices", {}).items()
        }
        commands = {
            command_id: CommandModel.from_dict(command_data)
            for command_id, command_data in data.get("commands", {}).items()
        }
        return cls(devices=devices, commands=commands)

    def as_sorted_payload(self) -> dict[str, Any]:
        """Return a frontend-friendly payload with commands grouped by device."""
        devices_payload: list[dict[str, Any]] = []
        for device in self.devices.values():
            command_payload = [
                self.commands[command_id].to_dict()
                for command_id in device.command_ids
                if command_id in self.commands
            ]
            command_payload.sort(key=lambda item: (item.get("order", 0), item["name"].lower()))

            device_item = device.to_dict()
            device_item["commands"] = command_payload
            devices_payload.append(device_item)

        devices_payload.sort(key=lambda item: item["name"].lower())
        return {"devices": devices_payload}
