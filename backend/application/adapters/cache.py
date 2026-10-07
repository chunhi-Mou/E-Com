"""On-disk caches so index builds and repeated answers do not re-call paid APIs."""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

import numpy as np


def sha256_hex(*parts: str | bytes) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p if isinstance(p, bytes) else p.encode("utf-8"))
        h.update(b"\0")
    return h.hexdigest()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


class VectorCache:
    """One .npy per (model tag, input hash); cache=None disables it."""

    def __init__(self, directory: Path | None, model_tag: str) -> None:
        self.dir = directory
        self.tag = re.sub(r"[^\w.-]+", "_", model_tag)

    def _path(self, input_hash: str) -> Path | None:
        return self.dir / f"{self.tag}__{input_hash}.npy" if self.dir else None

    def get(self, input_hash: str) -> np.ndarray | None:
        p = self._path(input_hash)
        if p is None or not p.exists():
            return None
        try:
            return np.load(p, allow_pickle=False)
        except (OSError, ValueError):
            return None  # corrupt entry: treated as a miss and overwritten

    def put(self, input_hash: str, vec: np.ndarray) -> None:
        p = self._path(input_hash)
        if p is None:
            return
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_name(f"{p.name}.{os.getpid()}.tmp.npy")
        np.save(tmp, vec.astype(np.float32), allow_pickle=False)
        os.replace(tmp, p)
