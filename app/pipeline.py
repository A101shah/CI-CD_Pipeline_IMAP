"""Public read-only GitHub Actions status, with graceful outage handling."""
from __future__ import annotations

import json
import time
from threading import Lock
from urllib.request import Request, urlopen

REPOSITORY = "A101shah/CI-CD_Pipeline_IMAP"
ENDPOINT = f"https://api.github.com/repos/{REPOSITORY}/actions/runs?per_page=12"
_LOCK = Lock()
_CACHE: tuple[float, dict] | None = None


def get_pipeline() -> dict:
    global _CACHE
    with _LOCK:
        if _CACHE and time.monotonic() - _CACHE[0] < 75:
            return _CACHE[1]
    try:
        request = Request(
            ENDPOINT,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "FraudGate-Learning-Dashboard/2.0",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urlopen(request, timeout=4) as response:
            raw = json.load(response)
        runs = [
            {
                "id": r["id"],
                "name": r.get("name", "GitHub Actions"),
                "branch": r.get("head_branch") or "",
                "status": r.get("status", "unknown"),
                "conclusion": r.get("conclusion"),
                "event": r.get("event", ""),
                "commit": (r.get("head_sha") or "")[:7],
                "created_at": r.get("created_at", ""),
                "url": r.get("html_url", ""),
                "title": (r.get("display_title") or "Workflow run")[:120],
            }
            for r in raw.get("workflow_runs", [])
        ]
        result = {"source": "github", "repository": REPOSITORY, "runs": runs, "message": None}
    except (OSError, ValueError, KeyError, TypeError) as exc:
        result = {
            "source": "unavailable",
            "repository": REPOSITORY,
            "runs": [],
            "message": "GitHub status is temporarily unavailable. Open Actions for live information.",
        }
    with _LOCK:
        _CACHE = (time.monotonic(), result)
    return result
