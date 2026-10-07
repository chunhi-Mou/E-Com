"""Pipeline: input -> (STT) -> QueryService -> SearchService (retrieval) -> RankingService, or OrderService."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from application.catalog_service import SORTS, sort_products
from application.image_service import ImageSource
from application.order_service import OrderDetail, OrderService
from application.query_service import QueryService
from application.ranking_service import RankingService
from application.search_service import SearchService
from application.speech_service import SpeechToText, Transcript
from domain.models import Intent, QueryRepresentation, SearchResult


@dataclass
class SearchResponse:
    representation: QueryRepresentation
    results: list[SearchResult]
    total: int
    relaxed_filters: list[str]
    order: OrderDetail | None
    latency_ms: float
    transcript: Transcript | None = None
    processing: dict[str, Any] = field(default_factory=dict)


class SearchOrchestrator:
    def __init__(self, stt: SpeechToText, queries: QueryService, retrieval: SearchService,
                 ranking: RankingService, orders: OrderService, default_customer_id: str = "C001") -> None:
        self.stt, self.queries, self.retrieval = stt, queries, retrieval
        self.ranking, self.orders = ranking, orders
        self.default_customer_id = default_customer_id

    def search(self, text: str | None = None, image: ImageSource | None = None, modality: str = "text",
               limit: int = 10, filters: dict[str, Any] | None = None,
               customer_id: str | None = None) -> SearchResponse:
        t0 = time.perf_counter()
        transcript = None
        voice = modality == "voice"
        if voice and text:
            transcript = self.stt.transcribe(text)
            text = transcript.text
        rep = self.queries.build(text=text, image=image, voice=voice)
        proc: dict[str, Any] = {"transcript": transcript.text if transcript else None}

        if rep.intent != Intent.PRODUCT_SEARCH:
            if rep.intent == Intent.ORDER_LOOKUP:
                order = self.orders.lookup(rep.hard_filters["order_code"])
            else:
                order = self.orders.latest(customer_id or self.default_customer_id)
            proc["order_found"] = order is not None
            return SearchResponse(rep, [], 0, [], order, self._ms(t0), transcript, proc)

        sort = (filters or {}).get("sort") or "relevance"
        if sort not in SORTS:
            raise ValueError(f"invalid sort: {sort}")
        self._apply_overrides(rep, filters or {})
        retrieved = self.retrieval.retrieve(rep)
        ranked = self.ranking.rank(rep, retrieved.candidates, retrieved.dropped_filters)
        total = len(ranked)
        if sort != "relevance":
            order_by = {p.product.id: p for p in ranked}
            ranked = [order_by[p.id] for p in sort_products([r.product for r in ranked], sort)]
            for i, r in enumerate(ranked, start=1):
                r.rank = i
        proc.update({"applied_filters": retrieved.applied_filters, "eligible_products": retrieved.eligible_count,
                     "candidates": len(retrieved.candidates), "retrievers": retrieved.stats})
        return SearchResponse(rep, ranked[:limit], total, retrieved.relaxed_filters, None,
                              self._ms(t0), transcript, proc)

    @staticmethod
    def _apply_overrides(rep: QueryRepresentation, filters: dict[str, Any]) -> None:
        """Explicit UI filters take precedence over what the parser inferred."""
        cat = filters.get("category")
        if cat:
            rep.hard_filters["category"] = [cat] if isinstance(cat, str) else list(cat)
        for key in ("price_min", "price_max"):
            if filters.get(key) is not None:
                rep.hard_filters[key] = int(filters[key])

    @staticmethod
    def _ms(t0: float) -> float:
        return round((time.perf_counter() - t0) * 1000, 2)
