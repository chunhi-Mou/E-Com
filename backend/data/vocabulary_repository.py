"""Controlled vocabulary repository."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path

from domain.models import AttributeDef, AttributeValueDef, Vocabulary

from data.product_repository import DATASET_DIR


class VocabularyRepository(ABC):
    @abstractmethod
    def load(self) -> Vocabulary: ...


class JsonVocabularyRepository(VocabularyRepository):
    def __init__(self, dataset_dir: Path | str = DATASET_DIR) -> None:
        self._path = Path(dataset_dir) / "vocabulary.json"

    def load(self) -> Vocabulary:
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        attrs: dict[str, AttributeDef] = {}
        for code, a in raw.items():
            values = {
                vc: AttributeValueDef(vc, v.get("label", vc), tuple(v.get("synonyms", ())),
                                      tuple(v.get("also_match", ())))
                for vc, v in a.get("values", {}).items()
            }
            attrs[code] = AttributeDef(code, bool(a.get("is_hard_filterable", False)), values)
        return Vocabulary(attrs)
