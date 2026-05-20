# 🧌 RF Command Manager — Home Assistant Custom Panel

A virtual remote control for Broadlink RM4 Pro RF/IR devices, integrated directly into Home Assistant as a custom panel.

## Features

- **📡 Learn RF/IR codes** — Put your Broadlink in learning mode and capture button presses from physical remotes
- **🎛️ Visual Remote Layout** — Big tappable buttons styled like a physical remote control
- **👆 Tap to Send** — Single tap fires commands instantly, right-click for repeated sends
- **✋ Drag-and-Drop Layout Editor** — Reorder buttons, resize (col × row span), customize grid columns
- **📁 Button Grouping** — Group related buttons with labeled borders (e.g., "Fan Controls", "Lights")
- **🔄 Sync from Broadlink Storage** — Import commands already learned through HA's Developer Tools
- **💾 Export/Import** — Backup and restore your command registry as JSON
- **✏️ Rename** — Rename devices and commands inline

## Installation

### Via HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** → **⋮ Menu** → **Custom repositories**
3. Add `https://github.com/YOUR_USER/rf-command-manager` as type **Lovelace**
4. Find "RF Command Manager" and click **Download**
5. Add to your `configuration.yaml`:

```yaml
panel_custom:
  - name: rf-manager
    sidebar_title: RF Manager
    sidebar_icon: mdi:remote
    url: /hacsfiles/rf-command-manager/rf-command-manager.js
    module_url: /hacsfiles/rf-command-manager/rf-command-manager.js
```

6. Restart Home Assistant

### Manual Installation

1. Copy `rf-command-manager.js` to `<config>/www/rf-command-manager/rf-command-manager.js`
2. Add to `configuration.yaml`:

```yaml
panel_custom:
  - name: rf-manager
    sidebar_title: RF Manager
    sidebar_icon: mdi:remote
    url: /local/rf-command-manager/rf-command-manager.js
    module_url: /local/rf-command-manager/rf-command-manager.js
```

3. Restart Home Assistant

## Requirements

- Home Assistant 2024.1.0 or newer
- Broadlink RM4 Pro (or any Broadlink device with remote capabilities)
- Broadlink integration configured in Home Assistant

## Usage

1. Open **RF Manager** from the sidebar
2. Click **+ Learn** to capture a new RF/IR button press
3. Tap any button to send the command to your Broadlink device
4. Click **✋ Layout** to customize the remote layout:
   - Drag buttons to reorder
   - Use **↔+/↔−** to resize width, **↕+/↕−** for height
   - Select multiple buttons → **📁 Group** to organize
5. Use **📥 Pull from HA** to import commands learned via Developer Tools

## Standalone Version

A standalone HTML version is also available for use outside Home Assistant.
Open `rf-command-manager.html` in any browser and connect with your HA long-lived access token.
