"""Synthetic product silhouettes drawn with Pillow (placeholder images for the seed dataset)."""
from __future__ import annotations

import math
import random

import numpy as np
from PIL import Image, ImageDraw

BG = (232, 234, 238)
MARK = (1, 2, 3)  # body colour marker replaced by stripes for multicolor items

# polygons in unit coordinates
_SLEEVE_LONG = [(0.3, 0.2), (0.42, 0.17), (0.58, 0.17), (0.7, 0.2), (0.92, 0.62), (0.8, 0.67), (0.7, 0.46),
                (0.7, 0.85), (0.3, 0.85), (0.3, 0.46), (0.2, 0.67), (0.08, 0.62)]
_SLEEVE_SHORT = [(0.3, 0.2), (0.42, 0.17), (0.58, 0.17), (0.7, 0.2), (0.9, 0.38), (0.78, 0.48), (0.7, 0.4),
                 (0.7, 0.85), (0.3, 0.85), (0.3, 0.4), (0.22, 0.48), (0.1, 0.38)]


def _ellipse(cx: float, cy: float, rx: float, ry: float, n: int = 28) -> list[tuple[float, float]]:
    return [(cx + rx * math.cos(2 * math.pi * k / n), cy + ry * math.sin(2 * math.pi * k / n)) for k in range(n)]


def _rect(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def _accent(c: tuple[int, int, int]) -> tuple[int, int, int]:
    if c == MARK:
        return (60, 60, 70)
    lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
    return tuple(min(255, v + 55) for v in c) if lum < 80 else tuple(int(v * 0.72) for v in c)  # type: ignore[return-value]


def _shape(name: str, body, acc) -> list[tuple[list[tuple[float, float]], tuple[int, int, int]]]:
    """Return ordered (polygon, colour) parts in unit coordinates."""
    P = []
    if name in ("sweater", "turtleneck", "puffer", "hoodie"):
        P.append((_SLEEVE_LONG, body))
        if name == "hoodie":
            P.insert(0, (_ellipse(0.5, 0.2, 0.15, 0.11), body))
            P.append((_ellipse(0.5, 0.2, 0.07, 0.05), acc))
            P.append((_rect(0.36, 0.6, 0.64, 0.74), acc))
        elif name == "turtleneck":
            P.append((_rect(0.41, 0.07, 0.59, 0.2), body))
            P.append((_rect(0.41, 0.07, 0.59, 0.09), acc))
        elif name == "puffer":
            P.append((_rect(0.41, 0.09, 0.59, 0.2), body))
            for y in (0.34, 0.5, 0.66):
                P.append((_rect(0.3, y, 0.7, y + 0.015), acc))
            P.append((_rect(0.495, 0.2, 0.505, 0.85), acc))
        else:
            P.append((_ellipse(0.5, 0.19, 0.08, 0.035), acc))
        P.append((_rect(0.3, 0.8, 0.7, 0.85), acc))
    elif name in ("tshirt", "shirt"):
        P.append((_SLEEVE_SHORT if name == "tshirt" else _SLEEVE_LONG, body))
        if name == "tshirt":
            P.append((_ellipse(0.5, 0.19, 0.08, 0.035), acc))
        else:
            P += [([(0.42, 0.17), (0.5, 0.3), (0.46, 0.2)], acc), ([(0.58, 0.17), (0.5, 0.3), (0.54, 0.2)], acc),
                  (_rect(0.495, 0.3, 0.505, 0.85), acc)]
    elif name == "pants":
        P.append(([(0.3, 0.1), (0.7, 0.1), (0.74, 0.9), (0.54, 0.9), (0.5, 0.35), (0.46, 0.9), (0.26, 0.9)], body))
        P.append((_rect(0.3, 0.1, 0.7, 0.15), acc))
    elif name == "shorts":
        P.append(([(0.28, 0.25), (0.72, 0.25), (0.78, 0.62), (0.54, 0.62), (0.5, 0.44), (0.46, 0.62), (0.22, 0.62)], body))
        P.append((_rect(0.28, 0.25, 0.72, 0.3), acc))
    elif name == "dress":
        P.append(([(0.4, 0.1), (0.6, 0.1), (0.58, 0.35), (0.8, 0.9), (0.2, 0.9), (0.42, 0.35)], body))
        P.append((_rect(0.42, 0.33, 0.58, 0.37), acc))
    elif name == "skirt":
        P.append(([(0.33, 0.25), (0.67, 0.25), (0.84, 0.8), (0.16, 0.8)], body))
        P.append((_rect(0.33, 0.25, 0.67, 0.3), acc))
    elif name == "running_shoe":
        P.append(([(0.12, 0.55), (0.12, 0.4), (0.35, 0.35), (0.45, 0.25), (0.6, 0.3), (0.72, 0.5), (0.9, 0.6),
                   (0.9, 0.7), (0.12, 0.7)], body))
        P.append((_rect(0.1, 0.7, 0.92, 0.78), acc))
        P += [(_rect(0.42 + 0.06 * k, 0.3 + 0.03 * k, 0.45 + 0.06 * k, 0.4 + 0.03 * k), acc) for k in range(3)]
    elif name == "sneaker":
        P.append(([(0.1, 0.5), (0.1, 0.4), (0.3, 0.38), (0.42, 0.32), (0.55, 0.4), (0.9, 0.52), (0.9, 0.68),
                   (0.1, 0.68)], body))
        P.append((_rect(0.1, 0.68, 0.9, 0.78), (245, 245, 245) if body != (250, 250, 250) else (170, 170, 170)))
        P.append((_ellipse(0.8, 0.58, 0.1, 0.07), acc))
    elif name == "dress_shoe":
        P.append(([(0.12, 0.5), (0.12, 0.42), (0.3, 0.42), (0.5, 0.45), (0.75, 0.55), (0.9, 0.62), (0.9, 0.7),
                   (0.12, 0.7)], body))
        P.append((_rect(0.12, 0.7, 0.3, 0.8), acc))
        P.append((_rect(0.12, 0.7, 0.9, 0.73), acc))
    elif name == "sandal":
        P.append((_rect(0.1, 0.62, 0.9, 0.72), acc))
        P.append(([(0.3, 0.62), (0.5, 0.4), (0.7, 0.62)], body))
        P.append((_rect(0.3, 0.5, 0.7, 0.56), body))
    elif name == "tote":
        P.append((_ellipse(0.5, 0.36, 0.2, 0.24), body))
        P.append((_ellipse(0.5, 0.36, 0.16, 0.2), BG))
        P.append(([(0.2, 0.38), (0.8, 0.38), (0.86, 0.88), (0.14, 0.88)], body))
        P.append((_rect(0.2, 0.38, 0.8, 0.42), acc))
    elif name == "crossbody":
        P.append((_ellipse(0.5, 0.32, 0.3, 0.3), body))
        P.append((_ellipse(0.5, 0.32, 0.27, 0.27), BG))
        P.append((_rect(0.0, 0.47, 1.0, 1.0), BG))
        P.append((_rect(0.25, 0.47, 0.75, 0.82), body))
        P.append(([(0.25, 0.47), (0.75, 0.47), (0.5, 0.66)], acc))
    elif name == "backpack":
        P.append((_ellipse(0.5, 0.2, 0.09, 0.1), body))
        P.append((_ellipse(0.5, 0.2, 0.05, 0.06), BG))
        P.append(([(0.25, 0.26), (0.75, 0.26), (0.8, 0.88), (0.2, 0.88)], body))
        P.append((_rect(0.32, 0.58, 0.68, 0.8), acc))
    elif name == "phone":
        P.append((_rect(0.35, 0.1, 0.65, 0.9), body))
        P.append((_rect(0.38, 0.14, 0.62, 0.86), acc))
    elif name == "laptop":
        P.append((_rect(0.18, 0.2, 0.82, 0.62), body))
        P.append((_rect(0.22, 0.24, 0.78, 0.58), acc))
        P.append(([(0.08, 0.64), (0.92, 0.64), (0.98, 0.74), (0.02, 0.74)], body))
    elif name == "headphones":
        P.append((_ellipse(0.5, 0.45, 0.31, 0.34), body))
        P.append((_ellipse(0.5, 0.45, 0.25, 0.28), BG))
        P.append((_rect(0.0, 0.5, 1.0, 1.0), BG))
        P.append((_ellipse(0.2, 0.6, 0.1, 0.16), body))
        P.append((_ellipse(0.8, 0.6, 0.1, 0.16), body))
        P.append((_ellipse(0.2, 0.6, 0.05, 0.1), acc))
        P.append((_ellipse(0.8, 0.6, 0.05, 0.1), acc))
    elif name == "speaker":
        P.append((_rect(0.2, 0.35, 0.8, 0.7), body))
        P.append((_ellipse(0.2, 0.525, 0.06, 0.175), body))
        P.append((_ellipse(0.8, 0.525, 0.06, 0.175), body))
        P += [(_ellipse(0.35 + 0.1 * k, 0.525, 0.035, 0.09), acc) for k in range(4)]
    elif name == "airfryer":
        P.append((_rect(0.2, 0.2, 0.8, 0.82), body))
        P.append((_rect(0.26, 0.26, 0.74, 0.52), acc))
        P.append((_rect(0.8, 0.45, 0.9, 0.55), acc))
        P.append((_ellipse(0.5, 0.67, 0.07, 0.07), acc))
    elif name == "blender":
        P.append(([(0.33, 0.1), (0.67, 0.1), (0.6, 0.6), (0.4, 0.6)], body))
        P.append((_rect(0.3, 0.6, 0.7, 0.88), acc))
        P.append((_rect(0.35, 0.07, 0.65, 0.12), acc))
    elif name == "bottle":
        P.append((_rect(0.4, 0.25, 0.6, 0.88), body))
        P.append((_ellipse(0.5, 0.25, 0.1, 0.05), body))
        P.append((_rect(0.44, 0.12, 0.56, 0.25), body))
        P.append((_rect(0.43, 0.07, 0.57, 0.14), acc))
    elif name == "vacuum":
        P.append((_ellipse(0.5, 0.5, 0.36, 0.36), body))
        P.append((_ellipse(0.5, 0.5, 0.12, 0.12), acc))
        P.append((_ellipse(0.5, 0.2, 0.05, 0.03), acc))
    else:
        raise ValueError(f"unknown shape {name}")
    return P


def render(shape: str, colors: list[tuple[int, int, int]], size: int = 256, seed: int = 0) -> Image.Image:
    """Draw one product silhouette with small deterministic jitter (scale, shift, rotation)."""
    rng = random.Random(seed)
    scale = rng.uniform(0.82, 0.98)
    dx, dy = rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04)
    ang = math.radians(rng.uniform(-4, 4))
    body = colors[0]
    acc = colors[1] if len(colors) > 1 else _accent(body)

    def tf(p: tuple[float, float]) -> tuple[float, float]:
        x, y = p[0] - 0.5, p[1] - 0.5
        x, y = x * math.cos(ang) - y * math.sin(ang), x * math.sin(ang) + y * math.cos(ang)
        return ((x * scale + 0.5 + dx) * size, (y * scale + 0.5 + dy) * size)

    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    for poly, col in _shape(shape, body, acc):
        d.polygon([tf(p) for p in poly], fill=col)
    if body == MARK:
        arr = np.asarray(img).copy()
        stripes = np.array([(210, 40, 50), (240, 200, 40), (50, 150, 70), (50, 110, 210)], dtype=np.uint8)
        xs = (np.arange(size) // max(size // 10, 1)) % 4
        sel = np.all(arr == MARK, axis=2)
        arr[sel] = stripes[np.broadcast_to(xs, (size, size))[sel]]
        img = Image.fromarray(arr)
    return img
