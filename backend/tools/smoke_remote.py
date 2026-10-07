"""Live check of every remote provider. Run on a machine with internet and keys in .env / the environment.

    python -m tools.smoke_remote                     all checks, missing keys are skipped
    python -m tools.smoke_remote --only llm,jina     subset: stt tts llm parser text clip rerank assistant
    python -m tools.smoke_remote --audio sample.wav  audio for STT (default: round trip through TTS)

Prints OK / FAIL / SKIP per provider and never prints keys. Exit code 1 if any check FAILs.
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Callable

from application.adapters.assistant import AssistantReplier
from application.adapters.http import load_dotenv
from application.adapters.jina import JinaClipImageEncoder, JinaReranker, JinaTextEncoder
from application.adapters.llm import OpenAICompatibleLLM
from application.adapters.llm_query_parser import LlmQueryParser
from application.adapters.speech_to_text import ElevenLabsSpeechToText
from application.adapters.synthesizer import ElevenLabsSynthesizer
from data.product_repository import DATASET_DIR, JsonProductRepository
from data.vocabulary_repository import JsonVocabularyRepository
from application.lexicon import Lexicon

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_IMAGE = ROOT / "eval" / "query_images" / "navy_sweater.jpg"


class Skip(Exception):
    pass


def need(*keys: str) -> None:
    missing = [k for k in keys if not os.environ.get(k)]
    if missing:
        raise Skip("missing " + ", ".join(missing))


def run(name: str, fn: Callable[[], str]) -> bool:
    t0 = time.perf_counter()
    try:
        detail = fn()
        status, ok = "OK  ", True
    except Skip as e:
        detail, status, ok = str(e), "SKIP", True
    except Exception as e:
        detail, status, ok = f"{type(e).__name__}: {e}", "FAIL", False
    print(f"[{status}] {name:<10} {(time.perf_counter() - t0) * 1000:7.0f} ms  {detail}")
    return ok


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", default="", help="comma separated check names")
    ap.add_argument("--audio", default=None)
    args = ap.parse_args(argv)
    load_dotenv([ROOT / ".env", ROOT.parent / ".env"])

    repo = JsonProductRepository(DATASET_DIR)
    lexicon = Lexicon(JsonVocabularyRepository(DATASET_DIR).load(), repo.categories(), repo.brands())
    tmp = Path(tempfile.mkdtemp(prefix="smoke_tts_"))
    state: dict[str, bytes] = {}

    def tts() -> str:
        need("ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID")
        audio = ElevenLabsSynthesizer.from_env(tmp).synthesize("Show me black running shoes", "en")
        state["audio"] = audio
        return f"{len(audio)} bytes of audio"

    def stt() -> str:
        need("ELEVENLABS_API_KEY")
        if args.audio:
            data = Path(args.audio).read_bytes()
        elif "audio" in state or (tts() and "audio" in state):
            data = state["audio"]
        else:
            raise Skip("no --audio and TTS not available")
        t = ElevenLabsSpeechToText.from_env().transcribe(data)
        return f"text={t.text!r} language={t.language}"

    def llm() -> str:
        need("LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY")
        return repr(OpenAICompatibleLLM.from_env().chat("Reply with one word.", "Say ok"))[:80]

    def parser() -> str:
        need("LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY")
        rep = LlmQueryParser(lexicon, OpenAICompatibleLLM.from_env(retries=0), timeout_s=10.0).parse("áo mùa đông dưới 500k")
        return f"parser={rep.parser} hard={rep.hard_filters} soft={rep.soft_preferences} exp={rep.expansion_terms}"

    def text() -> str:
        need("JINA_API_KEY")
        enc = JinaTextEncoder.from_env()
        v = enc.encode(["áo mùa đông", "winter sweater", "quần jean"])
        sims = (v @ v.T).round(3)
        return f"shape={v.shape} sim(vi,en)={sims[0, 1]} sim(vi,jeans)={sims[0, 2]}"

    def clip() -> str:
        need("JINA_API_KEY")
        enc = JinaClipImageEncoder.from_env()
        img = enc.encode([SAMPLE_IMAGE])
        txt = enc.encode_text(["a navy blue sweater", "a red handbag"])
        sims = (txt @ img.T).ravel().round(3)
        return f"image={img.shape} sim(sweater)={sims[0]} sim(handbag)={sims[1]} (first should be higher)"

    def rerank() -> str:
        need("JINA_API_KEY")
        rr = JinaReranker.from_env()
        s = rr.score("áo len mùa đông", ["Áo len cổ lọ giữ ấm", "Quần short đi biển"])
        if rr.last_error:
            raise RuntimeError(rr.last_error)
        return f"scores={[round(x, 3) for x in s]} (first should be higher)"

    def assistant() -> str:
        synth = ElevenLabsSynthesizer.from_env(tmp) if os.environ.get("ELEVENLABS_API_KEY") and \
            os.environ.get("ELEVENLABS_VOICE_ID") else None
        llm_ = OpenAICompatibleLLM.from_env() if OpenAICompatibleLLM.configured(os.environ) else None
        if not synth and not llm_:
            raise Skip("neither LLM nor TTS configured (template reply only)")
        r = AssistantReplier(llm_, synth).reply({"normalized_text": "áo mùa đông", "language": "vi"}, 12,
                                                ["Áo len cổ lọ", "Áo khoác phao"])
        return f"text={r.text!r} audio={'yes' if r.audio_file else 'no'}"

    checks = {"tts": tts, "stt": stt, "llm": llm, "parser": parser, "text": text, "clip": clip,
              "rerank": rerank, "assistant": assistant}
    chosen = [c for c in args.only.split(",") if c] or list(checks)
    unknown = [c for c in chosen if c not in checks]
    if unknown:
        print(f"unknown check(s): {unknown}; available: {list(checks)}", file=sys.stderr)
        return 2
    results = [run(n, checks[n]) for n in chosen]
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
