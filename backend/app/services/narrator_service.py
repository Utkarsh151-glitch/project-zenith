"""Gemini-backed AI narrator service."""

import logging

import httpx


logger = logging.getLogger(__name__)


class NarratorServiceError(Exception):
    """Raised when the narrator cannot generate an answer."""


class NarratorService:
    """Generate concise astronomy answers with Gemini."""

    _endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        timeout_seconds: float = 20.0,
    ) -> None:
        self._api_key = api_key.strip()
        self._model = model
        self._timeout_seconds = timeout_seconds

    async def answer(self, query: str, lat: float, lon: float, timestamp: str) -> str:
        """Return a short narrator answer for the supplied sky context."""
        if not self._api_key:
            raise NarratorServiceError("Gemini API key is not configured.")

        prompt = (
            "You are the Celestial Eye, a concise astronomy narrator for a live observatory app. "
            "Answer in 2 to 4 sentences. Use plain language, mention uncertainty when real "
            "trajectory or weather data is not provided, and avoid inventing exact pass times. "
            "If the user asks a simple test, route check, or non-astronomy question, answer it "
            "directly instead of forcing it into a celestial interpretation. "
            f"Observer latitude: {lat:.4f}, longitude: {lon:.4f}. "
            f"Timestamp: {timestamp}. "
            f"User question: {query}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 420,
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    self._endpoint.format(model=self._model),
                    params={"key": self._api_key},
                    json=payload,
                )
                response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            logger.warning("Failed to generate narrator answer", exc_info=exc)
            raise NarratorServiceError("Unable to generate narrator answer.") from exc

        if not text:
            raise NarratorServiceError("Gemini returned an empty narrator answer.")

        return text
