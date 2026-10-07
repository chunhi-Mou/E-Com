"""Adding data (not code) must make new kinds of products searchable."""
import json
import shutil

from container import Settings, build_container
from data.product_repository import DATASET_DIR as DATASET


def test_new_category_and_product_without_code_change(tmp_path):
    shutil.copytree(DATASET, tmp_path / "ds")
    d = tmp_path / "ds"
    cats = json.loads((d / "categories.json").read_text(encoding="utf-8"))
    cats.append({"slug": "khan-quang-co", "parent": "thoi-trang-nu", "name": "Khăn quàng cổ", "synonyms": ["scarf"]})
    (d / "categories.json").write_text(json.dumps(cats, ensure_ascii=False), encoding="utf-8")
    prods = json.loads((d / "products.json").read_text(encoding="utf-8"))
    prods.append({"id": "P999999", "source": "seed", "name": "Khăn len kẻ sọc", "description": "Khăn dệt dày.",
                  "brand": None, "category": "khan-quang-co", "price": 120000, "stock": 5, "rating": 4.5,
                  "rating_count": 3, "sold_count": 1, "attributes": {"color": ["red"], "material": ["wool"]},
                  "tags": {"season": ["winter"], "warmth": ["high"]}, "images": ["images/P000001_0.jpg"]})
    (d / "products.json").write_text(json.dumps(prods, ensure_ascii=False), encoding="utf-8")

    c = build_container(Settings(dataset_dir=d))
    for text in ("khăn mùa đông", "winter scarf", "khan quang co"):
        resp = c.orchestrator.search(text=text, limit=3)
        assert resp.results[0].product.id == "P999999", text
