"""Speech-to-text interface. The default is a simulation (the assignment allows text input)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from application.query_rules import detect_language


@dataclass
class Transcript:
    text: str
    language: str
    simulated: bool = False
    confidence: float = 1.0


class SpeechToText(ABC):
    @abstractmethod
    def transcribe(self, audio: bytes | str, lang_hint: str | None = None) -> Transcript: ...


class SimulatedSpeechToText(SpeechToText):
    """Treats the 'voice input' as already-transcribed text. Real audio is not supported."""

    def transcribe(self, audio: bytes | str, lang_hint: str | None = None) -> Transcript:
        if isinstance(audio, bytes):
            raise NotImplementedError("SimulatedSpeechToText accepts text only; plug a real STT adapter for audio")
        return Transcript(text=audio.strip(), language=lang_hint or detect_language(audio), simulated=True)
