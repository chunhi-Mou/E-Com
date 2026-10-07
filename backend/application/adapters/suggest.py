"""Offline search suggestions from category names, vocabulary labels and product names."""
from __future__ import annotations

from domain.models import Category, Vocabulary
from domain.text_utils import strip_accents


def _norm(s: str) -> str:
    return " ".join(strip_accents(s.lower()).split())


class SuggestService:
    def __init__(self, categories: list[Category], vocabulary: Vocabulary, product_names: list[str]) -> None:
        seen: dict[str, str] = {}
        sources = [c.name for c in categories]
        sources += [v.label for a in vocabulary.attributes.values() for v in a.values.values()]
        sources += product_names
        for s in sources:
            s = " ".join(s.split())
            if s:
                seen.setdefault(_norm(s), s)
        self._items = list(seen.items())

    def suggest(self, q: str, limit: int = 8) -> list[str]:
        nq = _norm(q)
        if not nq:
            return []
        ranked = []
        for norm, shown in self._items:
            if norm.startswith(nq):
                ranked.append((0, len(norm), shown))
            elif f" {nq}" in norm:  # prefix of a later word
                ranked.append((1, len(norm), shown))
        ranked.sort()
        return [s for _, _, s in ranked[:limit]]
