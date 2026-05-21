"""Sidebar panel registration for RF Command Manager."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN, PANEL_FRONTEND_URL, PANEL_ICON, PANEL_TITLE

STATIC_URL = f"/{DOMAIN}"


async def async_setup_panel(hass: HomeAssistant) -> None:
    """Register static assets and the HA sidebar panel."""
    frontend_path = Path(__file__).parent / "frontend"

    if hasattr(hass.http, "async_register_static_paths"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(frontend_path),
                    cache_headers=False,
                )
            ]
        )
    else:
        hass.http.register_static_path(STATIC_URL, str(frontend_path), cache_headers=False)

    panel_custom.async_register_panel(
        hass,
        webcomponent_name="rf-command-manager-panel",
        frontend_url_path=PANEL_FRONTEND_URL,
        module_url=f"{STATIC_URL}/rf-command-manager-panel.js",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        require_admin=False,
        config={},
    )


async def async_unload_panel(hass: HomeAssistant) -> None:
    """Remove panel from sidebar when unloading integration."""
    panel_custom.async_remove_panel(hass, PANEL_FRONTEND_URL)
