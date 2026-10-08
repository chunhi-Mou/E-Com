"""Short spoken answer for the voice assistant: LLM if configured, else a template, then optional TTS."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Mapping

from application.adapters.llm import OpenAICompatibleLLM
from application.adapters.synthesizer import SpeechSynthesizer
from application.query_rules import detect_language

log = logging.getLogger(__name__)

# The answer is read aloud next to a results page that already lists everything, so it stays under MAX_WORDS.
MAX_WORDS = 7

_TEMPLATES = {
    "vi": {
        "none": "Chưa có kết quả, bạn thử lại nhé.",
        "some": "Mình tìm được {total} sản phẩm đây.",
        "count": "Mình tìm được {total} sản phẩm đây.",
        "order": "Đơn hàng của bạn đây.",
        "and": " và ",
    },
    "en": {
        "none": "No results, try other words.",
        "some": "Found {total} products for you.",
        "count": "Found {total} products for you.",
        "order": "Here is your order.",
        "and": " and ",
    },
}


@dataclass
class AssistantReply:
    text: str
    language: str
    audio_file: str | None = None  # file name inside the synthesizer's public directory


class AssistantReplier:
    def __init__(self, llm: OpenAICompatibleLLM | None = None, synthesizer: SpeechSynthesizer | None = None) -> None:
        self.llm, self.synthesizer = llm, synthesizer

    def reply(self, representation: Mapping[str, Any], total: int, top_names: list[str]) -> AssistantReply:
        query = str(representation.get("normalized_text") or representation.get("raw_text") or "").strip()
        lang = representation.get("language")
        if lang not in _TEMPLATES:
            lang = detect_language(str(representation.get("raw_text") or query))
        names = [n.strip() for n in top_names if isinstance(n, str) and n.strip()][:2]
        intent = str(representation.get("intent") or "PRODUCT_SEARCH")

        text = self._llm_text(query, lang, intent, total, names) if self.llm else None
        text = text or self._template(query, lang, intent, total, names)
        audio = None
        if self.synthesizer:
            try:
                audio = self.synthesizer.synthesize_to_file(text, lang)
            except Exception as e:  # the text answer is still useful without audio
                log.warning("TTS failed (%s); replying without audio", e)
        return AssistantReply(text, lang, audio)

    @staticmethod
    def _template(query: str, lang: str, intent: str, total: int, names: list[str]) -> str:
        t = _TEMPLATES[lang]
        if intent.startswith("ORDER"):
            return t["order"]
        if total <= 0:
            return t["none"].format(q=query)
        if not names:
            return t["count"].format(total=total, q=query)
        return t["some"].format(total=total, q=query, top=t["and"].join(names))

    def _llm_text(self, query: str, lang: str, intent: str, total: int, names: list[str]) -> str | None:
        language = "Vietnamese" if lang == "vi" else "English"
        system = (f"You are a voice shopping assistant. Answer in {language} with exactly ONE very short, friendly "
                  f"sentence of at most {MAX_WORDS} words, plain text, no markdown, no emojis. Say how many products "
                  "were found; do not list product names. Use only the facts given.")
        user = f"query: {query}\nintent: {intent}\ntotal_results: {total}\ntop_products: {'; '.join(names) or 'none'}"
        try:
            text = " ".join(self.llm.chat(system, user, max_tokens=800).split())  # type: ignore[union-attr]
        except Exception as e:
            log.warning("LLM reply failed (%s); using template", e)
            return None
        return text if 0 < len(text.split()) <= MAX_WORDS else None
