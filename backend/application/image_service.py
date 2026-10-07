"""Image encoder interface and a CPU colour-histogram + silhouette encoder."""
from __future__ import annotations

import io
from abc import ABC, abstractmethod
from pathlib import Path

import numpy as np
from PIL import Image

ImageSource = bytes | str | Path


class ImageEncoder(ABC):
    @abstractmethod
    def encode(self, images: list[ImageSource]) -> np.ndarray:
        """Return an (n, dim) float32 array of L2-normalized vectors."""


def load_image(src: ImageSource) -> Image.Image:
    img = Image.open(io.BytesIO(src)) if isinstance(src, bytes) else Image.open(src)
    return img.convert("RGB")


class ColorHistogramEncoder(ImageEncoder):
    """Foreground colour histogram (HSV) + coarse silhouette grid.

    Assumes a roughly uniform background (catalog-style photos); it is a baseline, not CLIP.
    """
    GRID = 12
    HUE_BINS = 12

    def __init__(self, color_weight: float = 0.45, shape_weight: float = 0.55) -> None:
        self.cw, self.sw = color_weight ** 0.5, shape_weight ** 0.5

    def encode(self, images: list[ImageSource]) -> np.ndarray:
        return np.vstack([self._one(load_image(i)) for i in images]) if images else np.zeros((0, 1), np.float32)

    def _one(self, img: Image.Image) -> np.ndarray:
        img = img.resize((96, 96))
        rgb = np.asarray(img, dtype=np.float32)
        bg = np.median(np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]), axis=0)
        mask = np.abs(rgb - bg).sum(axis=2) > 30
        if mask.sum() < 20:
            mask = np.ones(mask.shape, dtype=bool)
        return np.concatenate([self.cw * self._color(img, mask), self.sw * self._shape(mask)]).astype(np.float32)

    def _color(self, img: Image.Image, mask: np.ndarray) -> np.ndarray:
        hsv = np.asarray(img.convert("HSV"), dtype=np.float32)[mask] / 255.0
        h, s, v = hsv[:, 0], hsv[:, 1], hsv[:, 2]
        chroma = s >= 0.25
        gray = np.histogram(v[~chroma], bins=[0, 0.25, 0.5, 0.78, 1.01])[0].astype(np.float32)
        hb = np.minimum((h[chroma] * self.HUE_BINS).astype(int), self.HUE_BINS - 1)
        dark = v[chroma] < 0.5
        hue = np.zeros(self.HUE_BINS * 2, dtype=np.float32)
        np.add.at(hue, hb * 2 + dark.astype(int), 1.0)
        vec = np.concatenate([gray, hue])
        vec = np.sqrt(vec / max(vec.sum(), 1.0))
        return vec / max(np.linalg.norm(vec), 1e-9)

    def _shape(self, mask: np.ndarray) -> np.ndarray:
        ys, xs = np.where(mask)
        crop = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        h, w = crop.shape
        side = max(h, w)
        sq = np.zeros((side, side), dtype=np.float32)
        sq[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = crop
        g = np.asarray(Image.fromarray((sq * 255).astype(np.uint8)).resize((self.GRID, self.GRID), Image.BILINEAR),
                       dtype=np.float32) / 255.0
        g = g - g.mean()  # centre so that unrelated blobs are not all similar
        vec = np.concatenate([g.ravel(), [h / side - 0.8, w / side - 0.8]]).astype(np.float32)
        return vec / max(np.linalg.norm(vec), 1e-9)
