import json
import shutil

from data.product_repository import DATASET_DIR, JsonProductRepository


def test_enrichment_adds_confident_tags_without_overriding(tmp_path):
    for name in ("products.json", "categories.json"):
        shutil.copy(DATASET_DIR / name, tmp_path / name)
    p = next(x for x in JsonProductRepository(tmp_path).all() if x.tags)
    existing = next(iter(p.tags))
    enrichment = {p.id: {"tags": {
        "new_code": [{"value": "a", "confidence": 0.9}, {"value": "b", "confidence": 0.3}],
        existing: [{"value": "overridden", "confidence": 1.0}],
    }}}
    (tmp_path / "enrichment.json").write_text(json.dumps(enrichment), encoding="utf-8")

    merged = JsonProductRepository(tmp_path).get(p.id)
    assert merged.tags["new_code"] == ["a"]  # low-confidence value dropped
    assert merged.tags[existing] == p.tags[existing]  # dataset tags win
