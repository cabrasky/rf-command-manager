# RF Command Manager

RF Command Manager is a Home Assistant custom integration with a dedicated sidebar app to manage Broadlink RF/IR command libraries from one place.

## What is included

- Sidebar panel in Home Assistant for:
  - Adding, renaming, deleting devices.
  - Adding, renaming, deleting, reordering commands.
  - Sending commands immediately.
  - Learning commands directly from Broadlink devices (direct mode).
- Home Assistant services for all device and command actions.
- Websocket API used by the panel.
- Persistent local storage for the full command library.

## Installation (HACS)

1. Open HACS in Home Assistant.
2. Go to Integrations.
3. Open the menu and choose Custom repositories.
4. Add this repository URL as type Integration:
  - `https://github.com/cabrasky/rf-command-manager`
5. Find `RF Command Manager` in HACS and install it.
6. Restart Home Assistant.
7. Go to Settings > Devices & services > Add integration.
8. Search for `RF Command Manager`.
9. Open the new sidebar item `RF Command Manager`.

## Installation (Manual)

1. Copy `custom_components/rf_command_manager` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Go to Settings > Devices & services > Add integration.
4. Search for `RF Command Manager`.
5. Open the new sidebar item `RF Command Manager`.

## Modes

### Broadlink Direct mode

Set these fields when creating a device:

- `connection_type`: `broadlink`
- `host`: device IP address
- `mac`: device MAC address

This mode supports command send and command learn.

### Home Assistant Remote mode

Set these fields when creating a device:

- `connection_type`: `home_assistant_remote`
- `remote_entity_id`: an entity from the `remote` domain

This mode supports command send through `remote.send_command`.

## Services

Domain: `rf_command_manager`

- `add_device`
- `update_device`
- `remove_device`
- `add_command`
- `update_command`
- `remove_command`
- `send_command`
- `learn_command`

## Websocket commands

- `rf_command_manager/list`
- `rf_command_manager/device/add`
- `rf_command_manager/device/update`
- `rf_command_manager/device/remove`
- `rf_command_manager/command/add`
- `rf_command_manager/command/update`
- `rf_command_manager/command/remove`
- `rf_command_manager/command/send`
- `rf_command_manager/command/learn`

## Notes

- Learned command payloads are stored as base64 strings.
- Broadlink learning in this version is implemented for direct Broadlink mode only.
