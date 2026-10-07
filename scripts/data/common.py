"""Tiện ích dùng chung: đường dẫn, rate limit, HTTP fetcher có cache/retry, log request.

Quy tắc lịch sự:
- tối đa 1 request mỗi 2 giây cho API, 2 request/giây cho ảnh (CDN);
- retry + backoff chỉ cho lỗi tạm thời (5xx, timeout, lỗi mạng);
- gặp 403/429/captcha hoặc proxy từ chối => dừng hẳn (Blocked), KHÔNG lách.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx

DATA_DIR = Path(__file__).resolve().parent
USER_AGENT = "ecom-multimodal-search-student-project/0.1 (educational, low-rate)"
MIN_INTERVAL = 0.5  # giây giữa 2 request ảnh => <= 2 req/s
MIN_INTERVAL_API = 2.0  # giây giữa 2 request API => <= 0.5 req/s


class Blocked(RuntimeError):
    """Nguồn (hoặc proxy chính sách) chặn truy cập. Phải dừng và báo cáo."""


def add_workdir_arg(ap: argparse.ArgumentParser) -> None:
    ap.add_argument(
        "--workdir",
        default=str(DATA_DIR),
        help="thư mục gốc chứa raw/ và out/ (mặc định: scripts/data). Dùng để chạy thử với mock.",
    )


class Paths:
    def __init__(self, workdir: str | Path):
        self.root = Path(workdir).resolve()
        self.raw = self.root / "raw"
        self.out = self.root / "out"
        self.images = self.out / "images"
        for d in (self.raw, self.out):
            d.mkdir(parents=True, exist_ok=True)


def load_json(path: Path | str, default: Any = None) -> Any:
    path = Path(path)
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def slugify_filename(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "_", s)[:80]


class Fetcher:
    """httpx client có rate limit, retry, log. Proxy/CA lấy từ biến môi trường (trust_env)."""

    def __init__(self, paths: Paths, timeout: float = 30.0, max_retries: int = 3):
        self.paths = paths
        self.max_retries = max_retries
        self._last = 0.0
        self.n_requests = 0
        self.client = httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json, image/*;q=0.8, */*;q=0.5"},
            trust_env=True,  # đọc HTTPS_PROXY và SSL_CERT_FILE/REQUESTS_CA_BUNDLE; KHÔNG tắt verify
        )
        self.log_path = paths.raw / "request_log.jsonl"

    def close(self) -> None:
        self.client.close()

    def _wait(self, interval: float) -> None:
        dt = time.monotonic() - self._last
        if dt < interval:
            time.sleep(interval - dt)
        self._last = time.monotonic()

    def _log(self, url: str, status: int | str, note: str = "") -> None:
        rec = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "url": url, "status": status, "note": note}
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    def get(self, url: str, params: dict | None = None, expect: str = "json") -> httpx.Response | None:
        """Trả Response (2xx) hoặc None nếu 404/410. Ném Blocked nếu bị chặn."""
        interval = MIN_INTERVAL_API if expect == "json" else MIN_INTERVAL
        for attempt in range(self.max_retries + 1):
            self._wait(interval)
            try:
                r = self.client.get(url, params=params)
            except httpx.ProxyError as e:
                self._log(url, "PROXY_DENIED", str(e)[:200])
                raise Blocked(f"kết nối bị từ chối {url}: {e}") from e
            except (httpx.TimeoutException, httpx.TransportError) as e:
                self._log(url, "NETERR", repr(e)[:200])
                if attempt == self.max_retries:
                    raise
                time.sleep(2 ** (attempt + 1))
                continue
            self.n_requests += 1
            self._log(str(r.url), r.status_code)
            if r.status_code in (401, 403, 407, 429):
                raise Blocked(f"HTTP {r.status_code} từ {r.url} - dừng, không lách")
            if r.status_code in (404, 410):
                return None
            if r.status_code >= 500:
                if attempt == self.max_retries:
                    r.raise_for_status()
                time.sleep(2 ** (attempt + 1))
                continue
            r.raise_for_status()
            if expect == "json" and "captcha" in r.text[:2000].lower():
                raise Blocked(f"nghi ngờ captcha tại {r.url} - dừng")
            return r
        return None
