"""Query understanding: any input becomes a QueryRepresentation."""
from __future__ import annotations

import unicodedata
from abc import ABC, abstractmethod
from collections import Counter

from application.image_service import ImageEncoder, ImageSource
from application.lexicon import Lexicon
from application.query_rules import STOPWORDS, detect_language, detect_order, extract_price, strip_fillers
from application.text_encoder import TextEncoder
from data.product_repository import ProductRepository
from domain.models import Intent, Modality, QueryRepresentation
from domain.text_utils import strip_accents, tokenize


class QueryParser(ABC):
    @abstractmethod
    def parse(self, text: str) -> QueryRepresentation: ...


class RuleQueryParser(QueryParser):
    """Regex for price/order/fillers plus lexicon matching; always available offline."""

    def __init__(self, lexicon: Lexicon) -> None:
        self.lexicon = lexicon

    def parse(self, text: str) -> QueryRepresentation:
        raw = text
        text = unicodedata.normalize("NFC", text.lower())
        u = strip_accents(text)
        lang = detect_language(raw)
        rep = QueryRepresentation(modality=Modality.TEXT, raw_text=raw, language=lang, parser="rules")

        pmin, pmax, u_nop = extract_price(u, lang)
        code, mentions_order = detect_order(u_nop)
        if code or mentions_order:
            rep.intent = Intent.ORDER_LOOKUP if code else Intent.ORDER_LATEST
            if code:
                rep.hard_filters["order_code"] = code
            rep.normalized_text = " ".join(raw.split())
            return rep

        # blank price spans in the accented text using the same offsets
        text_nop = "".join(t if a == b else " " for t, a, b in zip(text, u, u_nop)) if len(u) == len(text) else text
        norm, _ = strip_fillers(text_nop, u_nop)
        rep.normalized_text = norm
        if pmin is not None:
            rep.hard_filters["price_min"] = pmin
        if pmax is not None:
            rep.hard_filters["price_max"] = pmax

        tokens = tokenize(norm)
        cats: list[str] = []
        found = self.lexicon.find(tokens)
        covered = {i for m in found for i in range(m.start, m.end)}
        rep.residual_text = " ".join(t for i, t in enumerate(tokens)
                                     if i not in covered and strip_accents(t) not in STOPWORDS)
        for m in found:
            phrase = " ".join(tokens[m.start:m.end])
            for e in m.entries:
                if e.kind == "category":
                    cats.append(e.value)
                    rep.matches.append({"text": phrase, "type": "category", "value": e.value, "mode": "hard"})
                elif e.kind == "brand":
                    self._add(rep.hard_filters, "brand", e.value)
                    rep.matches.append({"text": phrase, "type": "brand", "value": e.value, "mode": "hard"})
                else:
                    hard = self.lexicon.vocabulary.is_hard(e.key)
                    self._add(rep.hard_filters if hard else rep.soft_preferences, e.key, e.value)
                    rep.matches.append({"text": phrase, "type": e.key, "value": e.value,
                                        "mode": "hard" if hard else "soft"})
        if cats:
            rep.hard_filters["category"] = self.lexicon.minimal_categories(list(dict.fromkeys(cats)))
        return rep

    @staticmethod
    def _add(target: dict, key: str, value: str) -> None:
        lst = target.setdefault(key, [])
        if value not in lst:
            lst.append(value)


class PassthroughParser(QueryParser):
    """No understanding at all: the raw text is the query (keyword baseline for the ablation)."""

    def parse(self, text: str) -> QueryRepresentation:
        return QueryRepresentation(modality=Modality.TEXT, raw_text=text, normalized_text=" ".join(text.split()),
                                   language=detect_language(text), parser="none")


class ConceptExpander:
    """Data-driven expansion: which categories carry the soft-preference tags the user implied."""

    def __init__(self, products: ProductRepository, lexicon: Lexicon, max_terms: int = 6) -> None:
        self.products, self.lexicon, self.max_terms = products, lexicon, max_terms

    def expand(self, rep: QueryRepresentation) -> list[str]:
        if not rep.soft_preferences:
            return []
        scope: set[str] | None = None
        if rep.hard_filters.get("category"):
            scope = set()
            for slug in rep.hard_filters["category"]:
                scope |= self.products.subtree_slugs(slug)
        counts: Counter[str] = Counter()
        for p in self.products.all():
            if scope is not None and p.category not in scope:
                continue
            if any(p.values_of(a) & set(v) for a, v in rep.soft_preferences.items()):
                counts[p.category] += 1
        terms: list[str] = []
        for slug, _ in counts.most_common():
            phrase = self.lexicon.category_phrase(slug)
            if phrase and phrase not in terms:
                terms.append(phrase)
            if len(terms) >= self.max_terms:
                break
        return terms


class QueryService:
    """Builds the common representation from text and/or image."""

    def __init__(self, parser: QueryParser, expander: ConceptExpander | None,
                 text_encoder: TextEncoder, image_encoder: ImageEncoder, text_weight: float = 0.4) -> None:
        self.parser, self.expander = parser, expander
        self.text_encoder, self.image_encoder = text_encoder, image_encoder
        self.text_weight = text_weight  # lambda_t when text and image are combined

    def build(self, text: str | None = None, image: ImageSource | None = None,
              voice: bool = False) -> QueryRepresentation:
        has_text = bool(text and text.strip())
        if has_text:
            rep = self.parser.parse(text)  # type: ignore[arg-type]
        else:
            rep = QueryRepresentation(modality=Modality.IMAGE, language="vi")
        if rep.intent != Intent.PRODUCT_SEARCH:
            rep.modality = Modality.VOICE if voice else Modality.TEXT
            return rep
        if has_text and image is not None:
            rep.modality = Modality.MULTIMODAL
            # text fully explained by filters ("same look but black") adds nothing beyond them
            tw = 0.1 if (not rep.residual_text and rep.hard_filters) else self.text_weight
            rep.weights = {"text": tw, "image": round(1 - tw, 3)}
        elif image is not None:
            rep.modality = Modality.IMAGE
            rep.weights = {"text": 0.0, "image": 1.0}
        else:
            rep.modality = Modality.VOICE if voice else Modality.TEXT
            rep.weights = {"text": 1.0, "image": 0.0}
        if has_text and self.expander is not None:
            rep.expansion_terms = self.expander.expand(rep)
        if has_text:
            doc = " ".join([rep.normalized_text, *rep.expansion_terms]).strip()
            rep.text_embedding = self.text_encoder.encode([doc])[0]
        if image is not None:
            rep.image_embedding = self.image_encoder.encode([image])[0]
        return rep
