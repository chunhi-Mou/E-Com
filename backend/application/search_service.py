"""RETRIEVAL: hard filters (with relaxation) + keyword and vector candidate generation, fused by RRF."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from application.image_service import ImageEncoder
from application.text_encoder import TextEncoder
from data.keyword_index import KeywordIndex
from data.product_repository import ProductRepository
from data.vector_index import VectorIndex
from domain.models import Product, QueryRepresentation, RetrievalResult, SearchCandidate, Vocabulary


class DocumentBuilder:
    """Builds the text indexed for each product."""

    def __init__(self, products: ProductRepository, vocabulary: Vocabulary, enriched: bool = True) -> None:
        self.products, self.vocabulary, self.enriched = products, vocabulary, enriched

    def build(self, p: Product) -> str:
        parts = [p.name, p.brand or "", p.description]
        if not self.enriched:
            return " ".join(parts)
        slug = p.category
        while slug:
            c = self.products.category(slug)
            if c is None:
                break
            parts += [c.name, *c.synonyms]
            slug = c.parent
        for group in (p.attributes, p.tags):
            for code, values in group.items():
                attr = self.vocabulary.attributes.get(code)
                for v in values:
                    d = attr.values.get(v) if attr else None
                    parts += [d.label, *d.synonyms] if d else [v]
        return " ".join(x for x in parts if x)


@dataclass
class RetrievalConfig:
    min_results: int = 3          # relax filters when fewer products match
    max_candidates: int = 200
    dense_min_score: float = 0.15
    rrf_k: int = 60
    use_filters: bool = True
    use_dense: bool = True
    expansion_weight: float = 0.5
    # attributes not listed are relaxed first; "price" covers price_min and price_max; category is never dropped
    relax_order: list[str] = field(default_factory=lambda: ["material", "color", "brand", "gender", "price"])


class SearchService:
    def __init__(self, products: ProductRepository, vocabulary: Vocabulary, keyword_index: KeywordIndex,
                 text_index: VectorIndex, image_index: VectorIndex, text_encoder: TextEncoder,
                 image_encoder: ImageEncoder, doc_builder: DocumentBuilder,
                 config: RetrievalConfig | None = None) -> None:
        self.products, self.vocabulary = products, vocabulary
        self.keyword_index, self.text_index, self.image_index = keyword_index, text_index, image_index
        self.text_encoder, self.image_encoder = text_encoder, image_encoder
        self.doc_builder = doc_builder
        self.config = config or RetrievalConfig()

    def build_index(self) -> None:
        items = self.products.all()
        ids = [p.id for p in items]
        docs = [self.doc_builder.build(p) for p in items]
        self.keyword_index.build(dict(zip(ids, docs)))
        self.text_encoder.fit(docs)
        self.text_index.add(ids, self.text_encoder.encode(docs))
        with_img = [p for p in items if p.images]
        if with_img:
            paths = [self.products.resolve_image(p.images[0]) for p in with_img]
            self.image_index.add([p.id for p in with_img], self.image_encoder.encode(paths))

    def _db_filters(self, hard: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for k, v in hard.items():
            if k == "order_code" or v in (None, [], ""):
                continue
            if isinstance(v, list) and k in self.vocabulary.attributes:
                extra = [a for val in v if (d := self.vocabulary.attributes[k].values.get(val)) for a in d.also_match]
                v = list(dict.fromkeys([*v, *extra]))
            out[k] = v
        return out

    def _relax_priority(self, filters: dict[str, Any]) -> list[str]:
        order = self.config.relax_order
        keys = [k for k in filters if k != "category"]

        def rank(k: str) -> int:
            name = "price" if k.startswith("price_") else k
            return order.index(name) if name in order else -1

        return sorted(keys, key=rank)

    def retrieve(self, rep: QueryRepresentation) -> RetrievalResult:
        cfg = self.config
        filters = self._db_filters(rep.hard_filters) if cfg.use_filters else {}
        eligible = self.products.find_ids(filters) if filters else {p.id for p in self.products.all()}
        relaxed: list[str] = []
        dropped: dict[str, Any] = {}
        for key in self._relax_priority(filters):
            if len(eligible) >= cfg.min_results:
                break
            dropped[key] = filters.pop(key)
            name = "price" if key.startswith("price_") else key
            if name not in relaxed:
                relaxed.append(name)
            eligible = self.products.find_ids(filters) if filters else {p.id for p in self.products.all()}

        n = len(self.products.all())
        kw: dict[str, float] = {}
        dense: dict[str, float] = {}
        img: dict[str, float] = {}
        w = rep.weights
        if w.get("text", 0) > 0 and rep.normalized_text:
            queries = [(rep.normalized_text, 1.0)] + [(t, cfg.expansion_weight) for t in rep.expansion_terms]
            kw = dict(self.keyword_index.search(queries, k=n, allowed_ids=eligible))
        if cfg.use_dense and w.get("text", 0) > 0 and rep.text_embedding is not None:
            dense = dict(self.text_index.search(rep.text_embedding, k=n, allowed_ids=eligible))
        if w.get("image", 0) > 0 and rep.image_embedding is not None:
            img = dict(self.image_index.search(rep.image_embedding, k=n, allowed_ids=eligible))

        rankings = {
            "keyword": [i for i, _ in sorted(kw.items(), key=lambda x: -x[1])],
            "dense": [i for i, s in sorted(dense.items(), key=lambda x: -x[1]) if s >= cfg.dense_min_score],
            "image": [i for i, _ in sorted(img.items(), key=lambda x: -x[1])],
        }
        rrf: dict[str, float] = {}
        sources: dict[str, list[str]] = {}
        for name, ranked in rankings.items():
            for r, pid in enumerate(ranked, start=1):
                rrf[pid] = rrf.get(pid, 0.0) + 1.0 / (cfg.rrf_k + r)
                sources.setdefault(pid, []).append(name)
        if not rrf:  # filter-only query (e.g. just a price): everything eligible is a candidate
            if not (kw or dense or img) and not rep.normalized_text and rep.image_embedding is None:
                rrf = {pid: 0.0 for pid in eligible}
        top = sorted(rrf, key=lambda i: -rrf[i])[:cfg.max_candidates]
        cands = [SearchCandidate(product=self.products.get(pid), keyword_score=kw.get(pid, 0.0),  # type: ignore[arg-type]
                                 dense_score=dense.get(pid, 0.0), image_score=img.get(pid, 0.0),
                                 rrf_score=rrf[pid], sources=sources.get(pid, []))
                 for pid in top]
        return RetrievalResult(cands, filters, relaxed, len(eligible), dropped,
                               {"keyword": len(rankings["keyword"]), "dense": len(rankings["dense"]),
                                "image": len(rankings["image"])})
