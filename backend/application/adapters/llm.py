"""OpenAI-compatible chat completions client (OpenAI, Gemini, DeepSeek, Groq, ... via LLM_BASE_URL).

Doc: https://platform.openai.com/docs/api-reference/chat/create.
POST {LLM_BASE_URL}/chat/completions, Bearer auth, JSON {"model", "messages", "temperature",
"response_format": {"type": "json_object"}}; the answer is choices[0].message.content.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Mapping

import httpx

from application.adapters.http import HttpClient, RemoteError, require


class OpenAICompatibleLLM:
    def __init__(self, base_url: str, model: str, api_key: str, timeout: float = 30.0, retries: int = 1,
                 json_mode: bool = True, transport: httpx.BaseTransport | None = None) -> None:
        self.model, self.json_mode = model, json_mode
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

    def chat(self, system: str, user: str, json_output: bool = False, max_tokens: int = 600) -> str:
        body: dict[str, Any] = {"model": self.model, "temperature": 0, "max_tokens": max_tokens,
                                "messages": [{"role": "system", "content": system},
                                             {"role": "user", "content": user}]}
        if json_output and self.json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            j = self.http.json("POST", "/chat/completions", json=body)
        except RemoteError as e:
            if "response_format" in body and e.status in (400, 422):  # provider without JSON mode
                del body["response_format"]
                j = self.http.json("POST", "/chat/completions", json=body)
            else:
                raise
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
