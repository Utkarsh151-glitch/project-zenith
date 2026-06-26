"""Pydantic schemas for ISS tracking responses.

These models define the public shape of live ISS location data returned by the
API.
"""

from pydantic import BaseModel, Field


class ISSPosition(BaseModel):
    """Current International Space Station position."""

    latitude: float = Field(..., description="Current ISS latitude in decimal degrees.")
    longitude: float = Field(..., description="Current ISS longitude in decimal degrees.")
    timestamp: int = Field(..., description="Unix timestamp reported by Open Notify.")
