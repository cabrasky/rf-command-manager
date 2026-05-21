# RF Command Manager

RF Command Manager is a Home Assistant custom integration for organizing Broadlink RF and IR commands in one local library.

## Current status

This repository currently contains the backend scaffold for a Home Assistant extension and a first sidebar tab UI:

- Config entry setup
- Local storage for devices, commands, and macros
- Home Assistant services for add, update, delete, and send actions
- A Home Assistant sidebar panel at `rf-command-manager`

The UI layer is now a working first pass with device grouping, command lists, send/delete/favorite actions, and add forms.

## Services

- `rf_command_manager.add_command`
- `rf_command_manager.update_command`
- `rf_command_manager.remove_command`
- `rf_command_manager.add_device`
- `rf_command_manager.add_macro`
- `rf_command_manager.send_command`

## Installation

### HACS

1. Open HACS in Home Assistant.
2. Add this repository as a custom repository if it is not already listed.
3. Install RF Command Manager as a custom integration.
4. Restart Home Assistant.
5. Go to Settings > Devices & services and add RF Command Manager.
6. Open the new RF Command Manager sidebar tab.

### Manual install

1. Copy `custom_components/rf_command_manager` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Go to Settings > Devices & services and add RF Command Manager.
4. Open the RF Command Manager sidebar tab from the Home Assistant menu.

### Notes

- This integration stores your RF and IR library locally inside Home Assistant.
- The first version provides a management dashboard for devices, commands, favorites, and macros.
- RF learning and capture flows can be added on top of this base later.
