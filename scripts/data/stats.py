#!/usr/bin/env python3
"""In thống kê out/products.json: số sp theo danh mục, tỉ lệ có color/material/gender, phân bố giá."""
from __future__ import annotations

import argparse
import statistics
import sys
from collections import Counter

from common import Paths, add_workdir_arg, load_json

BUCKETS = [(0, 100_000), (100_000, 300_000), (300_000, 500_000), (500_000, 1_000_000),
           (1_000_000, 3_000_000), (3_000_000, float("inf"))]


def pct(a: int, b: int) -> str:
    return f"{100 * a / b:5.1f}%" if b else "  n/a"


def main() -> int:
    ap = argparse.ArgumentParser()
    add_workdir_arg(ap)
    args = ap.parse_args()
    paths = Paths(args.workdir)
    products = load_json(paths.out / "products.json")
    if not products:
        print("Không có out/products.json (hoặc rỗng).")
        return 1
    cats = {c["slug"]: c for c in load_json(paths.out / "categories.json", [])}
    n = len(products)
    print(f"Tổng sản phẩm: {n}")
    print(f"Tổng ảnh tham chiếu: {sum(len(p['images']) for p in products)}\n")

    print("== Theo danh mục ==")
    by = Counter(p["category"] for p in products)
    print(f"{'danh mục':<18}{'sp':>5}{'color':>8}{'material':>10}{'gender':>8}")
    for slug, c in by.most_common():
        ps = [p for p in products if p["category"] == slug]
        has = lambda a: sum(1 for p in ps if p["attributes"].get(a))
        print(f"{slug:<18}{c:>5}{pct(has('color'), c):>8}{pct(has('material'), c):>10}{pct(has('gender'), c):>8}")

    print("\n== Tỉ lệ có thuộc tính (toàn bộ) ==")
    for a in ("color", "material", "gender"):
        k = sum(1 for p in products if p["attributes"].get(a))
        print(f"{a:<9}{k:>5}/{n}  {pct(k, n)}")
        cnt = Counter(v for p in products for v in p["attributes"].get(a, []))
        print("   " + ", ".join(f"{v}:{c}" for v, c in cnt.most_common()))

    print("\n== Phân bố giá (VND) ==")
    prices = sorted(p["price"] for p in products)
    q = lambda f: prices[min(n - 1, int(f * n))]
    print(f"min={prices[0]:,} p25={q(.25):,} median={int(statistics.median(prices)):,} "
          f"p75={q(.75):,} p95={q(.95):,} max={prices[-1]:,}")
    for lo, hi in BUCKETS:
        c = sum(1 for x in prices if lo <= x < hi)
        label = f"{lo:,}-{hi:,}" if hi != float("inf") else f">={lo:,}"
        print(f"  {label:<22}{c:>5} {pct(c, n)}")

    print("\n== Khác ==")
    print(f"có brand: {pct(sum(1 for p in products if p['brand']), n)}   "
          f"có mô tả: {pct(sum(1 for p in products if p['description']), n)}   "
          f"rating>0: {pct(sum(1 for p in products if p['rating'] > 0), n)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
