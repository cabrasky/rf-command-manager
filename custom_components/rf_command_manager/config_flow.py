"""Config flow for RF Command Manager."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN


class RFCommandManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Simple setup flow with a single default entry."""

    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        """Handle the first setup step."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title="RF Command Manager", data={})

        return self.async_show_form(step_id="user", data_schema=vol.Schema({}))
