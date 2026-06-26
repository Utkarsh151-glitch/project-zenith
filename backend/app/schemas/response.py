"""Standard API response schemas.

These models keep successful and error responses predictable across the API.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel


DataT = TypeVar("DataT")


class APIResponse(BaseModel, Generic[DataT]):
    """Generic response envelope returned by API endpoints."""

    success: bool
    message: str
    data: DataT | None = None
    errors: list[str] | None = None
    request_id: str | None = None
