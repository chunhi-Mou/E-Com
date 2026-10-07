"""Phrase lexicon built from data (vocabulary, category tree, brands); no product knowledge in code."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from domain.models import Category, Vocabulary
from domain.text_utils import has_diacritics, singularize, strip_accents, tokenize

KIND_PRIORITY = {"category": 0, "attribute": 1, "brand": 2}


@dataclass(frozen=True)
class Entry:
    kind: str          # category | attribute | brand
    key: str           # attribute code, or "" for category/brand
    value: str         # value code, category slug, or brand name
    raw: tuple[str, ...]  # accented lowercase tokens of the term


@dataclass(frozen=True)
class Match:
    start: int
    end: int
    entries: tuple[Entry, ...]


def _key(tokens: list[str]) -> tuple[str, ...]:
    return tuple(singularize(strip_accents(t)) for t in tokens)


class Lexicon:
    def __init__(self, vocabulary: Vocabulary, categories: list[Category], brands: list[str]) -> None:
        self.vocabulary = vocabulary
        self.categories = {c.slug: c for c in categories}
        self._terms: dict[tuple[str, ...], list[Entry]] = defaultdict(list)
        self._single_value_tokens: dict[str, set[str]] = defaultdict(set)  # unaccented token -> attr codes
        self.category_phrases: dict[str, str] = {}  # slug -> name without boundary attribute token
        self._add_vocabulary()
        self._add_categories()
        for b in brands:
            self._add(Entry("brand", "", b, tuple(tokenize(b))))
        self.max_len = max((len(k) for k in self._terms), default=1)

    def _add(self, entry: Entry) -> None:
        if not entry.raw:
            return
        k = _key(list(entry.raw))
        if entry not in self._terms[k]:
            self._terms[k].append(entry)

    def _add_vocabulary(self) -> None:
        for code, attr in self.vocabulary.attributes.items():
            for vcode, v in attr.values.items():
                for phrase in {v.label, *v.synonyms}:
                    toks = tokenize(phrase)
                    if not toks:
                        continue
                    self._add(Entry("attribute", code, vcode, tuple(toks)))
                    if len(toks) == 1:
                        self._single_value_tokens[_key(toks)[0]].add(code)

    def _add_categories(self) -> None:
        # A boundary token (e.g. "nam" in "Ao len nam") is stripped from a name only if other
        # names carry a different value of the same attribute at that position ("nu"),
        # so a name like "Ao len" is never cut down to "Ao".
        names: dict[str, list[list[str]]] = {
            c.slug: [tokenize(n) for n in (c.name, *c.synonyms) if tokenize(n)] for c in self.categories.values()}
        boundary: dict[tuple[str, str], set[str]] = defaultdict(set)  # (pos, attr) -> distinct tokens
        for variants in names.values():
            for toks in variants:
                if len(toks) < 2:
                    continue
                for pos, tok in (("tail", toks[-1]), ("head", toks[0])):
                    k = _key([tok])[0]
                    for attr in self._single_value_tokens.get(k, ()):
                        boundary[(pos, attr)].add(k)

        def strippable(pos: str, tok: str) -> bool:
            k = _key([tok])[0]
            return any(len(boundary[(pos, a)]) >= 2 for a in self._single_value_tokens.get(k, ()))

        def strip(toks: list[str]) -> list[str]:
            if len(toks) >= 2:
                if strippable("tail", toks[-1]):
                    return toks[:-1]
                if strippable("head", toks[0]):
                    return toks[1:]
            return toks

        for slug, variants in names.items():
            for i, toks in enumerate(variants):
                phrase = strip(toks)
                if i == 0:
                    self.category_phrases[slug] = " ".join(phrase)
                for variant in (toks, phrase):
                    self._add(Entry("category", "", slug, tuple(variant)))

    def find(self, tokens: list[str]) -> list[Match]:
        """Greedy longest-match over tokens. Accented input tokens must match accents exactly."""
        keys = _key(tokens)
        used = [False] * len(tokens)
        found: list[Match] = []
        for n in range(min(self.max_len, len(tokens)), 0, -1):
            for i in range(len(tokens) - n + 1):
                if any(used[i:i + n]):
                    continue
                cands = self._terms.get(keys[i:i + n])
                if not cands:
                    continue
                ok = [e for e in cands if all(
                    not has_diacritics(tokens[i + j]) or tokens[i + j] == e.raw[j] for j in range(n))]
                if not ok:
                    continue
                best = min(KIND_PRIORITY[e.kind] for e in ok)
                ok = [e for e in ok if KIND_PRIORITY[e.kind] == best]
                found.append(Match(i, i + n, tuple(ok)))
                for j in range(i, i + n):
                    used[j] = True
        return sorted(found, key=lambda m: m.start)

    def minimal_categories(self, slugs: list[str]) -> list[str]:
        """Drop categories whose ancestor is also selected (subtree filter covers them)."""
        paths = {s: self.categories[s].path for s in slugs if s in self.categories}
        return [s for s, p in paths.items()
                if not any(o != s and p.startswith(op + "/") for o, op in paths.items())]

    def category_phrase(self, slug: str) -> str:
        return self.category_phrases.get(slug, slug)
