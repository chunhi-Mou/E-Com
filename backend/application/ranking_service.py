"""RANKING: S = alpha*S_text + beta*S_image + gamma*S_business + delta*S_soft, with a per-component breakdown."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from application.reranker import Reranker
from application.search_service import DocumentBuilder
from domain.models import Product, QueryRepresentation, SearchCandidate, SearchResult


@dataclass
class RankingConfig:
    business: float = 0.10   # gamma
    soft: float = 0.20       # delta (only when the query has soft preferences)
    relaxed: float = 0.35    # delta when explicit filters were relaxed: closeness to them matters more
    text_keyword: float = 0.45
    text_dense: float = 0.25
    text_rerank: float = 0.30


class RankingService:
    def __init__(self, doc_builder: DocumentBuilder, reranker: Reranker | None = None,
                 config: RankingConfig | None = None) -> None:
        self.doc_builder, self.reranker = doc_builder, reranker
        self.config = config or RankingConfig()

    def rank(self, rep: QueryRepresentation, candidates: list[SearchCandidate],
             extra_soft: dict[str, list[str]] | None = None) -> list[SearchResult]:
        if not candidates:
            return []
        cfg = self.config
        soft_prefs = {k: list(v) for k, v in rep.soft_preferences.items()}
        price_limits = {k: v for k, v in (extra_soft or {}).items() if k in ("price_min", "price_max")}
        for k, v in (extra_soft or {}).items():  # relaxed filters still count as preferences
            if isinstance(v, list):
                soft_prefs.setdefault(k, [])
                soft_prefs[k] += [x for x in v if x not in soft_prefs[k]]
        has_soft = bool(soft_prefs or price_limits)

        s_text = self._text_scores(rep, candidates)
        max_sold = max(math.log1p(c.product.sold_count) for c in candidates) or 1.0
        lam_t, lam_i = rep.weights.get("text", 0.0), rep.weights.get("image", 0.0)
        delta = (cfg.relaxed if extra_soft else cfg.soft) if has_soft and cfg.soft > 0 else 0.0
        modal = 1.0 - cfg.business - delta
        alpha, beta, gamma = modal * lam_t, modal * lam_i, cfg.business

        results = []
        for c, st in zip(candidates, s_text):
            s_img = max(c.image_score, 0.0) if lam_i > 0 else 0.0
            s_biz = self._business(c.product, max_sold)
            s_soft, matched = self._soft(c.product, soft_prefs, price_limits)
            final = alpha * st + beta * s_img + gamma * s_biz + delta * s_soft
            results.append(SearchResult(
                product=c.product, rank=0,
                scores={"text": round(st, 4), "image": round(s_img, 4), "business": round(s_biz, 4),
                        "soft": round(s_soft, 4), "final": round(final, 4)},
                details={"bm25": round(c.keyword_score, 4), "dense": round(c.dense_score, 4),
                         "rrf": round(c.rrf_score, 5), "sources": c.sources, "soft_matched": matched,
                         "weights": {"alpha": round(alpha, 3), "beta": round(beta, 3),
                                     "gamma": round(gamma, 3), "delta": round(delta, 3)}}))
        results.sort(key=lambda r: (-r.scores["final"], -r.product.sold_count, r.product.id))
        for i, r in enumerate(results, start=1):
            r.rank = i
        return results

    def _text_scores(self, rep: QueryRepresentation, cands: list[SearchCandidate]) -> list[float]:
        if rep.weights.get("text", 0) <= 0:
            return [0.0] * len(cands)
        cfg = self.config
        kw_max = max(c.keyword_score for c in cands) or 1.0
        dense = [c.dense_score for c in cands]
        lo, hi = min(dense), max(dense)
        dense_n = [(d - lo) / (hi - lo) if hi > lo else (1.0 if hi > 0 else 0.0) for d in dense]
        parts = [(cfg.text_keyword, [c.keyword_score / kw_max for c in cands]), (cfg.text_dense, dense_n)]
        if self.reranker is not None and rep.normalized_text:
            q = " ".join([rep.normalized_text, *rep.expansion_terms])
            parts.append((cfg.text_rerank, self.reranker.score(q, [self.doc_builder.build(c.product) for c in cands])))
        total_w = sum(w for w, _ in parts)
        return [sum(w * s[i] for w, s in parts) / total_w for i in range(len(cands))]

    @staticmethod
    def _business(p: Product, max_log_sold: float) -> float:
        if p.stock <= 0:
            return 0.0
        return 0.5 * math.log1p(p.sold_count) / max_log_sold + 0.3 * min(p.rating / 5.0, 1.0) + 0.2

    @staticmethod
    def _soft(p: Product, prefs: dict[str, list[str]],
              price_limits: dict[str, int]) -> tuple[float, dict[str, Any]]:
        total = len(prefs) + len(price_limits)
        if total == 0:
            return 0.0, {}
        matched: dict[str, Any] = {a: sorted(p.values_of(a) & set(v)) for a, v in prefs.items()
                                   if p.values_of(a) & set(v)}
        for k, limit in price_limits.items():
            if (p.price <= limit) if k == "price_max" else (p.price >= limit):
                matched[k] = limit
        return len(matched) / total, matched
