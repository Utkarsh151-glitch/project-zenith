"""Compatibility entrypoint for application configuration.

Import `settings` from this module when callers need a short, stable path.
The actual Settings definition lives in `app.core.settings`.
"""

from app.core.settings import Settings, settings

__all__ = ["Settings", "settings"]
