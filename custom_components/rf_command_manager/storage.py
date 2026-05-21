"""Storage management for RF Command Manager."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .models import LibraryModel


class RFStorageManager:
    """Manages persisted library state."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._library = LibraryModel()

    @property
    def library(self) -> LibraryModel:
        """Return current in-memory library."""
        return self._library

    async def async_load(self) -> None:
        """Load stored library state."""
        data = await self._store.async_load()
        self._library = LibraryModel.from_dict(data)

    async def async_save(self) -> None:
        """Persist current library state."""
        await self._store.async_save(self._library.to_dict())
