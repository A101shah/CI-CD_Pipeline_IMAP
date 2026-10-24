"""Dog API v2 integration, deliberately isolated from financial risk decisions.

Uses the published no-auth JSON:API endpoints. Tests mock all network I/O.
Breeds are cached briefly; random facts are not cached per provider guidance.
"""
from __future__ import annotations

import json
import time
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://dogapi.dog/api/v2"
BREED_CACHE_SECONDS = 300
_CACHE_LOCK = Lock()
_BREED_CACHE: tuple[float, dict] | None = None


class DogAPIUnavailable(Exception):
    """Dog API could not provide a usable response."""


def _request(path: str, params: dict[str, int] | None = None) -> dict:
    suffix = "?" + urlencode(params) if params else ""
    url = BASE_URL + path + suffix
    request = Request(url, headers={
        "Accept": "application/vnd.api+json, application/json",
        "User-Agent": "FraudGate-Student-CI-DogAPI-Demo/1.0",
    })
    try:
        with urlopen(request, timeout=7) as response:
            body = json.load(response)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, UnicodeError) as exc:
        raise DogAPIUnavailable("Dog API is temporarily unavailable. Retry shortly.") from exc
    if not isinstance(body, dict) or not isinstance(body.get("data"), list):
        raise DogAPIUnavailable("Dog API returned an unexpected response format.")
    return body


def _public_image(images: object) -> tuple[str | None, dict]:
    if not isinstance(images, list):
        return None, {}
    for photo in images:
        if not isinstance(photo, dict):
            continue
        url = photo.get("medium") or photo.get("thumb") or photo.get("url")
        # Never expose arbitrary image protocols in the React UI.
        if not isinstance(url, str) or not url.startswith("https://"):
            continue
        credit = photo.get("attribution") or {}
        return url, credit if isinstance(credit, dict) else {}
    return None, {}


def get_breeds() -> dict:
    """Fetch all breed pages through one approved endpoint and normalize fields."""
    global _BREED_CACHE
    with _CACHE_LOCK:
        if _BREED_CACHE and time.monotonic() - _BREED_CACHE[0] < BREED_CACHE_SECONDS:
            return _BREED_CACHE[1]

    # The Dog API documents max page size 1000 (breeds currently fit one page).
    response = _request("/breeds", {"page[size]": 1000})
    breeds = []
    for item in response["data"]:
        if not isinstance(item, dict):
            continue
        attrs = item.get("attributes") or {}
        if not isinstance(attrs, dict):
            continue
        name = attrs.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        photo, attribution = _public_image(attrs.get("images"))
        life = attrs.get("life")
        life = life if isinstance(life, dict) else {}
        breeds.append({
            "id": str(item.get("id", "")),
            "name": name,
            "description": str(attrs.get("description") or ""),
            "life_min": life.get("min"),
            "life_max": life.get("max"),
            "hypoallergenic": attrs.get("hypoallergenic") is True,
            "image_url": photo,
            "image_credit": {
                "author": str(attribution.get("author") or "Unknown"),
                "license": str(attribution.get("license") or "See source"),
                "source_url": str(attribution.get("source_url") or ""),
            } if photo else None,
        })
    result = {"source": "dogapi.dog", "count": len(breeds), "breeds": breeds}
    with _CACHE_LOCK:
        _BREED_CACHE = (time.monotonic(), result)
    return result


def get_facts(limit: int = 3) -> dict:
    """Retrieve fresh dog facts; the provider specifies no-store behavior."""
    response = _request("/facts", {"limit": limit})
    facts = []
    for item in response["data"]:
        if not isinstance(item, dict):
            continue
        attrs = item.get("attributes") or {}
        if not isinstance(attrs, dict):
            continue
        body = attrs.get("body")
        if isinstance(body, str) and body.strip():
            facts.append({"id": str(item.get("id") or ""), "text": body})
    return {"source": "dogapi.dog", "facts": facts}
