"""ElevenLabs Scribe speech-to-text behind the SpeechToText interface.

Doc (request shape not yet verified against the live API; see tools.smoke_remote):
https://elevenlabs.io/docs/api-reference/speech-to-text/convert
POST https://api.elevenlabs.io/v1/speech-to-text, header xi-api-key, multipart: file, model_id, language_code?
Response: {"text", "language_code", "language_probability", "words": [...]}.
"""
from __future__ import annotations

import os
from typing import Mapping

import httpx

from application.adapters.http import HttpClient, RemoteError, require
from application.query_rules import detect_language
from application.speech_service import SpeechToText, Transcript

_LANG = {"vi": "vi", "vie": "vi", "en": "en", "eng": "en"}


class ElevenLabsSpeechToText(SpeechToText):
    def __init__(self, api_key: str, model: str = "scribe_v2", base_url: str = "https://api.elevenlabs.io",
                 timeout: float = 30.0, transport: httpx.BaseTransport | None = None) -> None:
        self.model = model
        self.http = HttpClient(base_url, {"xi-api-key": api_key}, timeout, transport=transport, name="elevenlabs-stt")

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "ElevenLabsSpeechToText":
        env = os.environ if env is None else env
        return cls(require(env, "ELEVENLABS_API_KEY", "STT_ADAPTER=elevenlabs"),
                   env.get("ELEVENLABS_STT_MODEL") or "scribe_v2")

    def transcribe(self, audio: bytes | str, lang_hint: str | None = None) -> Transcript:
        if isinstance(audio, str):
            # the orchestrator re-passes text that the client already transcribed via /api/speech/transcribe
            text = audio.strip()
            return Transcript(text=text, language=lang_hint or detect_language(text), simulated=False)
        data = {"model_id": self.model, "tag_audio_events": "false"}
        if lang_hint:
            data["language_code"] = lang_hint
        j = self.http.json("POST", "/v1/speech-to-text", data=data,
                           files={"file": ("audio", audio, "application/octet-stream")})
        text = j.get("text") if isinstance(j, dict) else None
        if not isinstance(text, str):
            raise RemoteError("elevenlabs-stt: response has no 'text'")
        text = text.strip()
        lang = _LANG.get(str(j.get("language_code") or "").lower()) or lang_hint or detect_language(text)
        conf = j.get("language_probability")
        return Transcript(text=text, language=lang, simulated=False,
                          confidence=float(conf) if isinstance(conf, (int, float)) else 1.0)
