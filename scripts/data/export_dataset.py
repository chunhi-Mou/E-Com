"""Copy the normalized crawl (out/) into backend/dataset/: products, categories, images and demo orders.

    python export_dataset.py                      # writes ../../backend/dataset
    python export_dataset.py --dataset-dir DIR

Run after crawl.py, normalize.py, download_images.py and normalize.py --require-images.
vocabulary.json in the dataset directory is hand-maintained and left untouched.
"""
from __future__ import annotations

import argparse
import random
import shutil
import sys
from pathlib import Path

from common import DATA_DIR, load_json, save_json

# order_code, customer, status, created_at, number of lines
ORDERS = [
    ("20260915", "C001", "DELIVERED", "2026-09-15T10:12:00+07:00", 2),
    ("20260928", "C001", "DELIVERED", "2026-09-28T19:40:00+07:00", 1),
    ("20261001", "C001", "SHIPPING", "2026-10-01T09:30:00+07:00", 1),
    ("20261005", "C001", "CONFIRMED", "2026-10-05T21:05:00+07:00", 2),
    ("20260920", "C002", "CANCELLED", "2026-09-20T08:00:00+07:00", 1),
    ("20261002", "C002", "PENDING", "2026-10-02T14:25:00+07:00", 2),
]


def build_orders(products: list[dict], seed: int) -> list[dict]:
    """Demo orders over random catalog products (fixed seed, so reruns give the same orders)."""
    rng = random.Random(seed)
    orders = []
    for code, customer, status, created_at, n_lines in ORDERS:
        lines = [{"product_id": p["id"], "quantity": rng.choice([1, 1, 2]), "unit_price": p["price"]}
                 for p in rng.sample(products, n_lines)]
        orders.append({"order_code": code, "customer_id": customer, "status": status, "created_at": created_at,
                       "total": sum(x["quantity"] * x["unit_price"] for x in lines), "items": lines})
    return orders


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workdir", default=str(DATA_DIR), help="folder holding out/ (default: scripts/data)")
    ap.add_argument("--dataset-dir", default=str(DATA_DIR.parent.parent / "backend" / "dataset"))
    args = ap.parse_args()

    out = Path(args.workdir) / "out"
    dest = Path(args.dataset_dir)
    products = load_json(out / "products.json")
    cats = load_json(out / "categories.json")
    if not products or not cats:
        print("out/products.json or out/categories.json missing: run the pipeline first", file=sys.stderr)
        return 1
    missing = [p["id"] for p in products if not all((out / x).exists() for x in p["images"])]
    if missing:
        print(f"{len(missing)} products reference images that were not downloaded; "
              "run download_images.py and normalize.py --require-images", file=sys.stderr)
        return 1

    dest.mkdir(parents=True, exist_ok=True)
    shutil.rmtree(dest / "images", ignore_errors=True)
    shutil.copytree(out / "images", dest / "images")

    categories = [{"slug": c["slug"], "parent": c["parent"], "name": c["name_vi"],
                   "synonyms": list(dict.fromkeys([c["name_en"], *c.get("synonyms", [])]))} for c in cats]
    save_json(dest / "categories.json", categories)
    save_json(dest / "products.json", products)
    cfg = load_json(DATA_DIR / "config.json")
    save_json(dest / "orders.json", build_orders(products, cfg["random_seed"]))
    n_img = sum(len(p["images"]) for p in products)
    print(f"{len(categories)} categories, {len(products)} products, {n_img} images -> {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
