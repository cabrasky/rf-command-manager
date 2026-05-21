from custom_components.rf_command_manager.models import CommandModel, DeviceModel, LibraryModel


def test_library_payload_is_sorted_by_name_and_order():
    library = LibraryModel()

    device_a = DeviceModel.create(name="TV", connection_type="broadlink")
    device_b = DeviceModel.create(name="AC", connection_type="broadlink")
    library.devices[device_a.id] = device_a
    library.devices[device_b.id] = device_b

    cmd_1 = CommandModel.create(device_id=device_a.id, name="Power", protocol="rf", payload="A", order=1)
    cmd_2 = CommandModel.create(device_id=device_a.id, name="Volume Down", protocol="rf", payload="B", order=2)
    cmd_3 = CommandModel.create(device_id=device_a.id, name="Mute", protocol="rf", payload="C", order=0)

    library.commands[cmd_1.id] = cmd_1
    library.commands[cmd_2.id] = cmd_2
    library.commands[cmd_3.id] = cmd_3
    device_a.command_ids = [cmd_1.id, cmd_2.id, cmd_3.id]

    payload = library.as_sorted_payload()

    assert payload["devices"][0]["name"] == "AC"
    assert payload["devices"][1]["name"] == "TV"
    assert [item["name"] for item in payload["devices"][1]["commands"]] == [
        "Mute",
        "Power",
        "Volume Down",
    ]


def test_library_round_trip():
    library = LibraryModel()
    device = DeviceModel.create(name="Projector", connection_type="broadlink", host="192.168.1.10")
    library.devices[device.id] = device

    command = CommandModel.create(
        device_id=device.id,
        name="Input HDMI",
        protocol="ir",
        payload="base64payload",
        order=0,
    )
    library.commands[command.id] = command
    device.command_ids = [command.id]

    restored = LibraryModel.from_dict(library.to_dict())

    assert restored.devices[device.id].host == "192.168.1.10"
    assert restored.commands[command.id].protocol == "ir"
    assert restored.devices[device.id].command_ids == [command.id]
