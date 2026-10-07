"""CLI presenter: prints input, processing, results and ranking scores for each query."""
from __future__ import annotations

from typing import TextIO
import sys

from application.order_service import OrderDetail
from application.search_orchestrator import SearchOrchestrator, SearchResponse
from domain.models import Intent


def _vnd(v: int) -> str:
    return f"{v:,}".replace(",", ".") + "d"


class SearchUI:
    def __init__(self, orchestrator: SearchOrchestrator, out: TextIO | None = None) -> None:
        self.orchestrator = orchestrator
        self.out = out or sys.stdout

    def _p(self, text: str = "") -> None:
        print(text, file=self.out)

    def text(self, query: str, limit: int = 5) -> SearchResponse:
        self._header("TEXT SEARCH", f'text = "{query}"')
        return self._show(self.orchestrator.search(text=query, modality="text", limit=limit), limit)

    def voice(self, utterance: str, limit: int = 5) -> SearchResponse:
        self._header("VOICE SEARCH", f'voice input = "{utterance}"  (simulated: the audio is given as text)')
        return self._show(self.orchestrator.search(text=utterance, modality="voice", limit=limit), limit)

    def image(self, path: str, text: str | None = None, limit: int = 5) -> SearchResponse:
        extra = f' + text = "{text}"' if text else ""
        self._header("IMAGE SEARCH" if not text else "MULTIMODAL SEARCH", f"image = {path}{extra}")
        return self._show(self.orchestrator.search(text=text, image=path, limit=limit), limit)

    def _header(self, title: str, inp: str) -> None:
        self._p("=" * 78)
        self._p(f"[{title}]")
        self._p(f"INPUT       {inp}")

    def _show(self, resp: SearchResponse, limit: int) -> SearchResponse:
        rep = resp.representation
        self._p("PROCESSING")
        if resp.transcript:
            self._p(f'  1. speech-to-text  -> "{resp.transcript.text}" (language={resp.transcript.language}, '
                    f"simulated={resp.transcript.simulated})")
        self._p(f"  query representation: modality={rep.modality.value} intent={rep.intent.value} "
                f"language={rep.language} parser={rep.parser}")
        if rep.normalized_text:
            self._p(f'    normalized_text : "{rep.normalized_text}"')
        if rep.hard_filters:
            self._p(f"    hard_filters    : {rep.hard_filters}")
        if rep.soft_preferences:
            self._p(f"    soft_preferences: {rep.soft_preferences}")
        if rep.expansion_terms:
            self._p(f"    expansion_terms : {rep.expansion_terms}")
        if rep.image_embedding is not None:
            self._p(f"    image_embedding : dim={rep.image_embedding.shape[0]}  weights={rep.weights}")
        if rep.intent != Intent.PRODUCT_SEARCH:
            self._p("  retrieval: order repository lookup")
            self._order(resp.order)
        else:
            pr = resp.processing
            self._p(f"  retrieval: eligible after hard filters={pr['eligible_products']}, "
                    f"candidates={pr['candidates']}, by retriever={pr['retrievers']}")
            if resp.relaxed_filters:
                self._p(f"  relaxed filters (too few matches): {resp.relaxed_filters}")
            self._p("  ranking: S = a*S_text + b*S_image + g*S_business + d*S_soft")
            self._results(resp, limit)
        self._p(f"  latency: {resp.latency_ms} ms")
        return resp

    def _results(self, resp: SearchResponse, limit: int) -> None:
        self._p(f"RESULTS (top {len(resp.results)} of {resp.total})")
        if not resp.results:
            self._p("  no result")
            return
        self._p(f"  {'#':>2} {'id':<8} {'name':<44} {'price':>11}  {'text':>5} {'img':>5} {'biz':>5} {'soft':>5} {'FINAL':>6}")
        for r in resp.results:
            s = r.scores
            self._p(f"  {r.rank:>2} {r.product.id:<8} {r.product.name[:44]:<44} {_vnd(r.product.price):>11}  "
                    f"{s['text']:>5.2f} {s['image']:>5.2f} {s['business']:>5.2f} {s['soft']:>5.2f} {s['final']:>6.3f}")
        w = resp.results[0].details["weights"]
        self._p(f"  weights: alpha={w['alpha']} beta={w['beta']} gamma={w['gamma']} delta={w['delta']}")

    def _order(self, detail: OrderDetail | None) -> None:
        self._p("RESULT")
        if detail is None:
            self._p("  order not found")
            return
        o = detail.order
        self._p(f"  order {o.order_code}  customer={o.customer_id}  status={o.status}  created={o.created_at}")
        for it in o.items:
            name = detail.products[it.product_id].name if it.product_id in detail.products else it.product_id
            self._p(f"    - {name} x{it.quantity} @ {_vnd(it.unit_price)}")
        self._p(f"  total: {_vnd(o.total)}")

    def order(self, query: str) -> SearchResponse:
        self._header("ORDER SEARCH", f'text = "{query}"')
        return self._show(self.orchestrator.search(text=query, modality="text"), 1)
