"""Regenerate the synthetic test catalog in fixtures/dataset/ (JSON files + drawn images).

Run from backend/: python tests/fixtures/generate_seed.py
"""
from __future__ import annotations

import json
from pathlib import Path

from render import render
from seed_data import (CATEGORIES, COLOR_RGB, ORDERS, VOCABULARY, build_products)

DATASET = Path(__file__).resolve().parent / "dataset"


def write_json(name: str, obj) -> None:
    (DATASET / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def product_shapes() -> dict[str, str]:
    return {p["id"]: p["_shape"] for p in build_products()}


def main() -> None:
    DATASET.mkdir(exist_ok=True)
    (DATASET / "images").mkdir(exist_ok=True)

    cats = [{"slug": s, "parent": p, "name": vi, "synonyms": list(dict.fromkeys([en, *al]))}
            for s, p, vi, en, al in CATEGORIES]
    write_json("categories.json", cats)

    vocab = {code: {"is_hard_filterable": hard, "values": {
        v: {"label": vi, "synonyms": [x for x in dict.fromkeys([en, *syn]) if x != vi],
            **({"also_match": am} if am else {})}
        for v, (vi, en, syn, am) in values.items()}} for code, (hard, values) in VOCABULARY.items()}
    write_json("vocabulary.json", vocab)

    products = build_products()
    for p in products:
        shape = p.pop("_shape")
        colors = [COLOR_RGB[c] for c in p["attributes"]["color"]]
        render(shape, colors, 256, seed=int(p["id"][1:])).save(DATASET / p["images"][0], quality=90)
    write_json("products.json", products)

    by_idx = {i: p for i, p in enumerate(products, start=1)}
    orders = []
    for code, cust, status, at, items in ORDERS:
        lines = [{"product_id": by_idx[i]["id"], "quantity": q, "unit_price": by_idx[i]["price"]} for i, q in items]
        orders.append({"order_code": code, "customer_id": cust, "status": status, "created_at": at,
                       "total": sum(x["quantity"] * x["unit_price"] for x in lines), "items": lines})
    write_json("orders.json", orders)
    print(f"{len(cats)} categories, {len(products)} products, {len(orders)} orders -> {DATASET}")


if __name__ == "__main__":
    main()
