"""Config flow for RF Command Manager."""

from __future__ import annotations

from homeassistant import config_entries

from .const import DOMAIN


class RfCommandManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create a single config entry for the local library."""

    VERSION = 1

    async def async_step_user(self, user_input=None):  # noqa: ANN001
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        return self.async_create_entry(title="RF Command Manager", data={})