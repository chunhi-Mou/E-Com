"""Small httpx wrapper shared by all remote clients: timeout, one retry on 5xx/timeout, clear errors."""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Mapping

import httpx


class RemoteError(RuntimeError):
    """A provider call failed; the message never contains credentials."""

    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class HttpClient:
    def __init__(self, base_url: str, headers: Mapping[str, str], timeout: float = 30.0, retries: int = 1,
                 backoff: float = 0.3, transport: httpx.BaseTransport | None = None, name: str = "remote") -> None:
        self.name, self.retries, self.backoff = name, retries, backoff
        self._client = httpx.Client(base_url=base_url.rstrip("/"), headers=dict(headers),
                                    timeout=httpx.Timeout(timeout), transport=transport)

    def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        last = "unknown error"
        for attempt in range(self.retries + 1):
            if attempt:
                time.sleep(self.backoff)
            try:
                resp = self._client.request(method, path, **kwargs)
            except httpx.TimeoutException:
                last = "timeout"
                continue
            except httpx.TransportError as e:
                last = f"network error ({type(e).__name__})"
                continue
            if resp.status_code >= 500:
                last = f"HTTP {resp.status_code}"
                if attempt == self.retries:
                    raise RemoteError(f"{self.name}: {last}: {_snippet(resp)}", resp.status_code)
                continue
            if resp.status_code >= 400:
                raise RemoteError(f"{self.name}: HTTP {resp.status_code}: {_snippet(resp)}", resp.status_code)
            return resp
        raise RemoteError(f"{self.name}: {last} after {self.retries + 1} attempt(s)")

    def json(self, method: str, path: str, **kwargs: Any) -> Any:
        resp = self.request(method, path, **kwargs)
        try:
            return resp.json()
        except ValueError:
            raise RemoteError(f"{self.name}: response is not JSON") from None


def _snippet(resp: httpx.Response) -> str:
    return resp.text[:200].replace("\n", " ")


def require(env: Mapping[str, str], key: str, why: str) -> str:
    val = (env.get(key) or "").strip()
    if not val:
        raise ValueError(f"{key} is required for {why}; set it in the environment or .env")
    return val


def load_dotenv(paths: list[Path]) -> None:
    """Tiny KEY=VALUE parser; real environment variables win over the file."""
    for path in paths:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip().removeprefix("export ").strip(), val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            if key and val and key not in os.environ:
                os.environ[key] = val
