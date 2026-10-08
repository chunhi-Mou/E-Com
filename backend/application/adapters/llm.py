"""OpenAI-compatible chat completions client (OpenAI, Gemini, DeepSeek, Groq, ... via LLM_BASE_URL).

Doc: https://platform.openai.com/docs/api-reference/chat/create.
POST {LLM_BASE_URL}/chat/completions, Bearer auth, JSON {"model", "messages", "temperature",
"response_format": {"type": "json_object"}}; the answer is choices[0].message.content.
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
from collections import OrderedDict
from typing import Any, Mapping

import httpx

from application.adapters.http import HttpClient, RemoteError, require


CACHE_SIZE = 256   # answers kept per process (temperature is 0, so the same question gets the same answer)
TRIP_AFTER = 3     # consecutive failures that pause the model; a 429 (quota or rate limit) pauses it at once
COOLDOWN_S = 60.0  # while paused every call fails instantly, so callers fall back to rules/templates without waiting


class OpenAICompatibleLLM:
    def __init__(self, base_url: str, model: str, api_key: str, timeout: float = 30.0, retries: int = 1,
                 json_mode: bool = True, transport: httpx.BaseTransport | None = None,
                 cooldown_s: float = COOLDOWN_S, clock=time.monotonic) -> None:
        self.model, self.json_mode = model, json_mode
        self.cooldown_s, self._clock = cooldown_s, clock
        self._lock = threading.Lock()
        self._cache: OrderedDict[tuple, str] = OrderedDict()
        self._fails, self._paused_until = 0, 0.0
        self.http = HttpClient(base_url, {"Authorization": f"Bearer {api_key}"}, timeout, retries=retries,
                               transport=transport, name="llm")

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None, timeout: float = 30.0,
                 retries: int = 1) -> "OpenAICompatibleLLM":
        env = os.environ if env is None else env
        return cls(require(env, "LLM_BASE_URL", "the LLM adapter"), require(env, "LLM_MODEL", "the LLM adapter"),
                   require(env, "LLM_API_KEY", "the LLM adapter"), timeout, retries,
                   json_mode=(env.get("LLM_JSON_MODE", "1").lower() not in ("0", "false", "no")))

    @staticmethod
    def configured(env: Mapping[str, str]) -> bool:
        return all((env.get(k) or "").strip() for k in ("LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY"))

    def _record(self, ok: bool, status: int | None = None) -> None:
        with self._lock:
            if ok:
                self._fails = 0
                return
            self._fails += 1
            if status == 429 or self._fails >= TRIP_AFTER:
                self._paused_until = self._clock() + self.cooldown_s
                self._fails = 0

    def chat(self, system: str, user: str, json_output: bool = False, max_tokens: int = 600) -> str:
        key = (system, user, json_output, max_tokens)
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            if self._clock() < self._paused_until:
                raise RemoteError("llm: paused after repeated failures or quota exhaustion", 503)
        text = self._request(system, user, json_output, max_tokens)
        with self._lock:
            self._cache[key] = text
            while len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return text

    def _request(self, system: str, user: str, json_output: bool, max_tokens: int) -> str:
        body: dict[str, Any] = {"model": self.model, "temperature": 0, "max_tokens": max_tokens,
                                "messages": [{"role": "system", "content": system},
                                             {"role": "user", "content": user}]}
        if json_output and self.json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            try:
                j = self.http.json("POST", "/chat/completions", json=body)
            except RemoteError as e:
                if "response_format" in body and e.status in (400, 422):  # provider without JSON mode
                    del body["response_format"]
                    j = self.http.json("POST", "/chat/completions", json=body)
                else:
                    raise
        except RemoteError as e:
            self._record(False, e.status)
            raise
        self._record(True)
        try:
            content = j["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise RemoteError("llm: unexpected response shape") from None
        if not isinstance(content, str) or not content.strip():
            raise RemoteError("llm: empty completion")
        return content.strip()

    def chat_json(self, system: str, user: str, max_tokens: int = 600) -> dict[str, Any]:
        text = self.chat(system, user, json_output=True, max_tokens=max_tokens)
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())  # some providers wrap JSON in a fence
        try:
            out = json.loads(text)
        except ValueError:
            raise RemoteError("llm: completion is not valid JSON") from None
        if not isinstance(out, dict):
            raise RemoteError("llm: JSON completion is not an object")
        return out
