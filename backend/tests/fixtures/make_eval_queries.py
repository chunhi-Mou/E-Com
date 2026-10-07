"""Create eval/query_images/ and eval/queries.json. Labels come from product fields, not from search tags.

Labels refer to the synthetic fixture catalog (fixtures/dataset), not to the crawled data.
Run from backend/: python tests/fixtures/make_eval_queries.py
"""
from __future__ import annotations

import json
from pathlib import Path

from render import render
from seed_data import COLOR_RGB, build_products

ROOT = Path(__file__).resolve().parents[2]
EVAL = ROOT / "eval"
WARM_MATERIALS = {"wool", "down", "fleece", "knit"}


def main() -> None:
    products = build_products()
    shape = {p["id"]: p.pop("_shape") for p in products}
    by_name = {p["name"]: p["id"] for p in products}

    def ids(pred) -> list[str]:
        return [p["id"] for p in products if pred(p)]

    def cat(*prefixes: str):
        return lambda p: p["category"].startswith(prefixes)

    def color(c: str):
        return lambda p: c in p["attributes"]["color"]

    def names(*ns: str) -> list[str]:
        return [by_name[n] for n in ns]

    is_top = lambda p: p["category"].startswith("ao-")  # noqa: E731
    both = lambda *fs: (lambda p: all(f(p) for f in fs))  # noqa: E731

    img_dir = EVAL / "query_images"
    img_dir.mkdir(parents=True, exist_ok=True)
    image_specs = {  # file -> (shape, color); rendered with seeds/size unused by the catalog
        "navy_sweater": ("sweater", "navy"), "black_running_shoe": ("running_shoe", "black"),
        "red_crossbody": ("crossbody", "red"), "white_tshirt": ("tshirt", "white"),
        "silver_laptop": ("laptop", "silver"),
    }
    for i, (name, (shp, col)) in enumerate(image_specs.items()):
        render(shp, [COLOR_RGB[col]], 224, seed=9000 + i).save(img_dir / f"{name}.jpg", quality=88)

    def same_look(shp: str, col: str) -> list[str]:
        return [pid for pid, s in shape.items()
                if s == shp and next(p for p in products if p["id"] == pid)["attributes"]["color"][0] == col]

    Q: list[dict] = []

    def add(group: str, modality: str, text: str | None, relevant: list[str], lang: str, image: str | None = None,
            order: bool = False) -> None:
        assert relevant, (group, text, image)
        Q.append({"id": f"q{len(Q) + 1:02d}", "group": group, "modality": modality, "text": text, "image": image,
                  "language": lang, "relevant": relevant, **({"expected_order": relevant[0]} if order else {})})

    add("explicit", "text", "black running shoes", ids(both(cat("giay-chay-bo"), color("black"))), "en")
    add("explicit", "text", "giày Nike dưới 2 triệu",
        ids(lambda p: p["brand"] == "Nike" and p["category"].startswith("giay") and p["price"] < 2_000_000), "vi")
    add("explicit", "text", "áo thun trắng", ids(both(cat("ao-thun"), color("white"))), "vi")
    add("explicit", "text", "quần jeans nam", ids(cat("quan-jeans")), "vi")
    add("explicit", "text", "túi đeo chéo nữ màu đỏ", ids(both(cat("tui-deo-cheo"), color("red"))), "vi")
    add("explicit", "text", "laptop dưới 20 triệu", ids(lambda p: p["category"] == "laptop" and p["price"] < 20_000_000), "vi")

    add("implicit", "text", "áo mùa đông",
        ids(lambda p: is_top(p) and set(p["attributes"]["material"]) & WARM_MATERIALS), "vi")
    add("implicit", "text", "đồ đi biển",
        names("Quần short kaki nam", "Áo sơ mi linen nam", "Đầm maxi hoa đi biển", "Dép xỏ ngón nam đi biển",
              "Sandal nữ quai ngang đi biển", "Túi tote vải canvas", "Loa Bluetooth JBL Flip 6"), "vi")
    add("implicit", "text", "outfit đi phỏng vấn",
        names("Áo sơ mi nam trắng dài tay công sở", "Quần tây nam công sở", "Giày da nam công sở Oxford",
              "Áo sơ mi nữ lụa", "Đầm công sở nữ dáng chữ A", "Chân váy chữ A nữ", "Túi tote da nữ"), "vi")
    add("implicit", "text", "áo giữ ấm cho nữ",
        ids(lambda p: is_top(p) and p["attributes"]["gender"] == ["female"]
            and set(p["attributes"]["material"]) & WARM_MATERIALS), "vi")
    add("implicit", "text", "áo khoác cho trời lạnh", ids(cat("ao-khoac-phao")), "vi")
    add("implicit", "text", "đồ thể thao",
        ids(lambda p: p["category"].startswith("giay-chay-bo") or p["name"] == "Quần short thể thao nam"), "vi")
    add("implicit", "text", "đồ dùng nhà bếp", ids(lambda p: p["category"] in (
        "noi-chien-khong-dau", "may-xay-sinh-to", "binh-giu-nhiet")), "vi")
    add("implicit", "text", "cold weather clothes for women",
        ids(lambda p: is_top(p) and p["attributes"]["gender"] == ["female"]
            and set(p["attributes"]["material"]) & WARM_MATERIALS), "en")

    add("bilingual", "text", "áo hoodie màu be", ids(both(cat("ao-hoodie"), color("beige"))), "vi")
    add("bilingual", "text", "sneaker trắng", ids(both(cat("giay-sneaker"), color("white"))), "vi")
    add("bilingual", "text", "women's turtleneck", ids(cat("ao-co-lo-nu")), "en")
    add("bilingual", "text", "áo sweater xanh navy", ids(both(cat("ao-len"), color("navy"))), "vi")
    add("bilingual", "text", "winter jacket for men", ids(cat("ao-khoac-phao-nam")), "en")

    add("unaccented", "text", "ao len co lo", ids(cat("ao-co-lo")), "vi")
    add("unaccented", "text", "giay chay bo", ids(cat("giay-chay-bo")), "vi")
    add("unaccented", "text", "tui deo cheo", ids(cat("tui-deo-cheo")), "vi")
    add("unaccented", "text", "quan short di bien", names("Quần short kaki nam"), "vi")

    add("voice", "voice", "find me black running shoes", ids(both(cat("giay-chay-bo"), color("black"))), "en")
    add("voice", "voice", "tôi muốn mua túi tote vải", names("Túi tote vải canvas"), "vi")
    add("voice", "voice", "show me headphones under 6 million", names("Tai nghe AirPods Pro 2"), "en")

    for name, (shp, col) in image_specs.items():
        add("image", "image", None, same_look(shp, col), "-", image=f"eval/query_images/{name}.jpg")
    add("multimodal", "multimodal", "màu đen", ids(both(cat("ao-thun"), color("black"))), "vi",
        image="eval/query_images/white_tshirt.jpg")

    add("order", "text", "đơn 20261001", ["20261001"], "vi", order=True)
    add("order", "text", "where is my latest order?", ["20261005"], "en", order=True)
    add("order", "text", "đơn hàng 20260928 đã giao chưa", ["20260928"], "vi", order=True)
    add("order", "text", "order 20261002", ["20261002"], "en", order=True)

    (EVAL / "queries.json").write_text(json.dumps(Q, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(Q)} queries, {len(image_specs)} query images -> {EVAL}")


if __name__ == "__main__":
    main()
