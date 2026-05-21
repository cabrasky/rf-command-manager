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

Copy `custom_components/rf_command_manager` into your Home Assistant `custom_components` folder, then add the integration through the Home Assistant UI.