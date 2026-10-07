"""Text-to-speech interface and the ElevenLabs implementation with a disk cache.

Doc (request shape not yet verified against the live API; Flash v2.5 supports Vietnamese):
https://elevenlabs.io/docs/api-reference/text-to-speech/convert
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128,
header xi-api-key, JSON {"text", "model_id", "language_code"?}; the response body is the audio.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
import os
from typing import Mapping

import httpx

from application.adapters.cache import atomic_write, sha256_hex
from application.adapters.http import HttpClient, RemoteError, require


class SpeechSynthesizer(ABC):
    @abstractmethod
    def synthesize(self, text: str, lang: str) -> bytes: ...

    @abstractmethod
    def synthesize_to_file(self, text: str, lang: str) -> str:
        """Ensure the audio exists in the synthesizer's public directory and return its file name."""


class ElevenLabsSynthesizer(SpeechSynthesizer):
    def __init__(self, api_key: str, voice_id: str, cache_dir: Path, model: str = "eleven_flash_v2_5",
                 output_format: str = "mp3_44100_128", base_url: str = "https://api.elevenlabs.io",
                 timeout: float = 30.0, transport: httpx.BaseTransport | None = None) -> None:
        self.voice_id, self.model, self.cache_dir, self.output_format = voice_id, model, Path(cache_dir), output_format
        self.http = HttpClient(base_url, {"xi-api-key": api_key}, timeout, transport=transport, name="elevenlabs-tts")

    @classmethod
    def from_env(cls, cache_dir: Path, env: Mapping[str, str] | None = None) -> "ElevenLabsSynthesizer":
        env = os.environ if env is None else env
        return cls(require(env, "ELEVENLABS_API_KEY", "text-to-speech"),
                   require(env, "ELEVENLABS_VOICE_ID", "text-to-speech"), cache_dir,
                   env.get("ELEVENLABS_TTS_MODEL") or "eleven_flash_v2_5")

    def _name(self, text: str) -> str:
        return sha256_hex(self.model, self.voice_id, text) + ".mp3"

    def synthesize_to_file(self, text: str, lang: str) -> str:
        name = self._name(text)
        path = self.cache_dir / name
        if not path.exists():
            atomic_write(path, self._fetch(text, lang))
        return name

    def synthesize(self, text: str, lang: str) -> bytes:
        return (self.cache_dir / self.synthesize_to_file(text, lang)).read_bytes()

    def _fetch(self, text: str, lang: str) -> bytes:
        body: dict = {"text": text, "model_id": self.model}
        if lang in ("vi", "en"):
            body["language_code"] = lang
        resp = self.http.request("POST", f"/v1/text-to-speech/{self.voice_id}",
                                 params={"output_format": self.output_format}, json=body)
        if not resp.content:
            raise RemoteError("elevenlabs-tts: empty audio")
        return resp.content


class EdgeTtsSynthesizer(SpeechSynthesizer):
    """Studio-quality Microsoft Edge Neural TTS: free, no API key required, human-grade voice."""

    def __init__(self, cache_dir: Path, vi_voice: str = "vi-VN-HoaiMyNeural",
                 en_voice: str = "en-US-JennyNeural") -> None:
        self.cache_dir = Path(cache_dir)
        self.vi_voice = vi_voice
        self.en_voice = en_voice

    def _name(self, text: str, lang: str) -> str:
        voice = self.vi_voice if lang == "vi" else self.en_voice
        return sha256_hex("edge-tts", voice, text) + ".mp3"

    def synthesize_to_file(self, text: str, lang: str) -> str:
        name = self._name(text, lang)
        path = self.cache_dir / name
        if not path.exists():
            import asyncio
            import edge_tts

            voice = self.vi_voice if lang == "vi" else self.en_voice

            async def _run():
                comm = edge_tts.Communicate(text, voice)
                await comm.save(str(path))

            try:
                asyncio.run(_run())
            except RuntimeError:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(_run())
                loop.close()
        return name

    def synthesize(self, text: str, lang: str) -> bytes:
        return (self.cache_dir / self.synthesize_to_file(text, lang)).read_bytes()

