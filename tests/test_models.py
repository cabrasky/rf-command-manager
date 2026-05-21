"""Tests for the RF Command Manager storage models."""

from custom_components.rf_command_manager.models import CommandItem, DeviceItem, MacroItem, StoragePayload


def test_storage_payload_round_trip() -> None:
    payload = StoragePayload(
        devices={
            "device-1": DeviceItem(id="device-1", name="Living Room", notes="TV shelf"),
        },
        commands={
            "command-1": CommandItem(
                id="command-1",
                name="Power",
                command_type="ir",
                payload="deadbeef",
                device_id="device-1",
                favorite=True,
            ),
        },
        macros={
            "macro-1": MacroItem(id="macro-1", name="Movie Night", command_ids=["command-1"]),
        },
    )

    restored = StoragePayload.from_dict(payload.to_dict())

    assert restored.version == 1
    assert restored.devices["device-1"].name == "Living Room"
    assert restored.commands["command-1"].favorite is True
    assert restored.macros["macro-1"].command_ids == ["command-1"]