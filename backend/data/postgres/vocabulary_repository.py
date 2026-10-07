"""VocabularyRepository on PostgreSQL."""
from __future__ import annotations

from domain.models import AttributeDef, AttributeValueDef, Vocabulary

from data.postgres.connection import PgDatabase
from data.vocabulary_repository import VocabularyRepository


class PostgresVocabularyRepository(VocabularyRepository):
    def __init__(self, db: PgDatabase) -> None:
        self.db = db

    def load(self) -> Vocabulary:
        values: dict[str, dict[str, AttributeValueDef]] = {}
        for attr, code, label, synonyms, also in self.db.query(
                "SELECT att.code, av.code, av.label, av.synonyms, av.also_match "
                "FROM attribute_value av JOIN attribute att ON att.id = av.attribute_id "
                "ORDER BY att.position, att.id, av.position, av.id"):
            values.setdefault(attr, {})[code] = AttributeValueDef(code, label, tuple(synonyms or ()),
                                                                  tuple(also or ()))
        attrs = {
            code: AttributeDef(code, bool(hard), values.get(code, {}))
            for code, hard in self.db.query("SELECT code, is_hard_filterable FROM attribute "
                                            "ORDER BY position, id")
        }
        return Vocabulary(attrs)
