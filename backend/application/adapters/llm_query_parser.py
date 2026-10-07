"""LLM query parser: the model only chooses from vocabulary/category data; rules stay authoritative."""
from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from typing import Any

from application.adapters.llm import OpenAICompatibleLLM
from application.lexicon import Lexicon
from application.query_service import ConceptExpander, QueryParser, RuleQueryParser
from domain.models import Intent, QueryRepresentation

log = logging.getLogger(__name__)
_POOL = ThreadPoolExecutor(max_workers=4, thread_name_prefix="llm-parse")
MAX_EXPANSION = 8


class LlmQueryParser(QueryParser):
    def __init__(self, lexicon: Lexicon, llm: OpenAICompatibleLLM, timeout_s: float = 2.5,
                 rules: QueryParser | None = None) -> None:
        self.lexicon, self.llm, self.timeout_s = lexicon, llm, timeout_s
        self.rules = rules or RuleQueryParser(lexicon)
        self._system = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        voc = self.lexicon.vocabulary
        attrs = "\n".join(f"- {code}: " + ", ".join(f"{vc}={v.label}" for vc, v in a.values.items())
                          for code, a in voc.attributes.items())
        cats = "\n".join(f"- {c.slug}={c.name}" for c in self.lexicon.categories.values())
        return (
            "You turn an e-commerce search query (Vietnamese or English) into JSON.\n"
            "Reply with one JSON object with keys:\n"
            '  "intent": "PRODUCT_SEARCH" or "ORDER_LATEST" (user asks about their latest order),\n'
            '  "category": list of category slugs the user clearly wants (may be empty),\n'
            '  "soft_preferences": object {attribute_code: [value_code, ...]} for implied needs '
            '(season, occasion, style, warmth, ...),\n'
            '  "expansion_terms": up to 6 short product phrases that would satisfy the query.\n'
            "Use ONLY the attribute codes, value codes and category slugs listed below; never invent any.\n"
            "Do not output prices or order numbers.\n\n"
            f"Attributes (code: value_code=label):\n{attrs}\n\nCategories (slug=name):\n{cats}")

    def parse(self, text: str) -> QueryRepresentation:
        rep = self.rules.parse(text)
        if rep.intent != Intent.PRODUCT_SEARCH:
            return rep  # order lookups are deterministic; no model call needed
        try:
            fut = _POOL.submit(self.llm.chat_json, self._system, text)
            raw = fut.result(timeout=self.timeout_s)
        except FutureTimeout:
            log.warning("LLM parse exceeded %.2fs; using rules", self.timeout_s)
            return rep
        except Exception as e:  # network, HTTP, bad JSON: never break search
            log.warning("LLM parse failed (%s); using rules", e)
            return rep
        if self._merge(rep, raw):
            rep.parser = "llm"
        return rep

    # --- validation + merge ---
    def _merge(self, rep: QueryRepresentation, raw: dict[str, Any]) -> bool:
        used = False
        if raw.get("intent") == "ORDER_LATEST":  # ORDER_LOOKUP needs a code, which only rules may extract
            rep.intent = Intent.ORDER_LATEST
            rep.normalized_text = " ".join(rep.raw_text.split())
            return True

        # Inferred categories only steer retrieval; hard filters come from explicit user words (rules).
        slugs = [s for s in self._strings(raw.get("category")) if s in self.lexicon.categories]
        for slug in dict.fromkeys(slugs):
            phrase = self.lexicon.category_phrase(slug)
            if phrase and phrase not in rep.expansion_terms:
                rep.expansion_terms.append(phrase)
                rep.matches.append({"text": "", "type": "category", "value": slug,
                                    "mode": "soft", "source": "llm"})
                used = True

        voc = self.lexicon.vocabulary.attributes
        prefs = raw.get("soft_preferences")
        for code, values in (prefs.items() if isinstance(prefs, dict) else []):
            if code not in voc or code in rep.hard_filters:
                continue
            valid = [v for v in self._strings(values) if v in voc[code].values]
            fresh = [v for v in dict.fromkeys(valid) if v not in rep.soft_preferences.get(code, [])]
            if fresh:
                rep.soft_preferences.setdefault(code, []).extend(fresh)
                rep.matches.append({"text": "", "type": code, "value": ",".join(fresh),
                                    "mode": "soft", "source": "llm"})
                used = True

        terms = []
        for t in self._strings(raw.get("expansion_terms")):
            t = re.sub(r"\s+", " ", t).strip()
            if 0 < len(t) <= 60 and t.lower() not in (x.lower() for x in terms):
                terms.append(t)
        for t in terms[:MAX_EXPANSION]:
            if t not in rep.expansion_terms:
                rep.expansion_terms.append(t)
                used = True
        return used

    @staticmethod
    def _strings(v: Any) -> list[str]:
        if isinstance(v, str):
            v = [v]
        return [x.strip() for x in v if isinstance(x, str) and x.strip()] if isinstance(v, list) else []


class MergingExpander(ConceptExpander):
    """QueryService overwrites expansion_terms with the expander output; keep the parser's terms too."""

    def expand(self, rep: QueryRepresentation) -> list[str]:
        out = list(rep.expansion_terms)
        for t in super().expand(rep):
            if t not in out:
                out.append(t)
        return out[:self.max_terms + MAX_EXPANSION]
