"""Phase-2 endpoints, container wiring and offline defaults (no network, no keys)."""
import dataclasses
import types

import pytest
from fastapi.testclient import TestClient

from application.adapters.assistant import AssistantReplier
from application.adapters.http import RemoteError
from application.adapters.jina import JinaClipImageEncoder, JinaReranker, JinaTextEncoder
from application.adapters.llm_query_parser import LlmQueryParser, MergingExpander
from application.adapters.speech_to_text import ElevenLabsSpeechToText
from application.query_service import RuleQueryParser
from application.speech_service import SimulatedSpeechToText, Transcript
from domain.text_utils import strip_accents
from container import STT_ADAPTERS, Settings, build_container
from presentation.api.app import create_app
from tests.test_remote_adapters import FakeSynth

REMOTE_ENV = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY", "JINA_API_KEY"]


@pytest.fixture()
def clean_env(monkeypatch):
    for k in REMOTE_ENV:
        monkeypatch.delenv(k, raising=False)


def test_offline_defaults_unchanged(container, clean_env):
    c = container
    assert isinstance(c.orchestrator.stt, SimulatedSpeechToText)
    assert isinstance(c.queries.parser, RuleQueryParser) and c.queries.parser.__class__ is RuleQueryParser
    assert c.synthesizer is None and isinstance(c.assistant, AssistantReplier) and c.assistant.llm is None


def test_remote_adapters_are_registered_and_need_keys(clean_env):
    assert {"simulated", "elevenlabs"} <= set(STT_ADAPTERS)
    for kw, key in (({"stt": "elevenlabs"}, "ELEVENLABS_API_KEY"), ({"text_encoder": "jina"}, "JINA_API_KEY"),
                    ({"image_encoder": "jina_clip"}, "JINA_API_KEY"), ({"reranker": "jina"}, "JINA_API_KEY"),
                    ({"query_parser": "llm"}, "LLM_BASE_URL")):
        with pytest.raises(ValueError, match=key):
            build_container(Settings(**kw))
    with pytest.raises(ValueError, match="unknown query parser"):
        build_container(Settings(query_parser="nope"))


def test_container_wires_llm_parser_and_remote_factories(monkeypatch, clean_env):
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.invalid/v1")
    monkeypatch.setenv("LLM_MODEL", "m")
    monkeypatch.setenv("LLM_API_KEY", "dummy")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "dummy")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "v")
    c = build_container(Settings(query_parser="llm", llm_timeout_s=0.5))  # no network call at build time
    assert isinstance(c.queries.parser, LlmQueryParser) and c.queries.parser.timeout_s == 0.5
    assert isinstance(c.queries.expander, MergingExpander)
    assert c.assistant.llm is not None and c.synthesizer is not None
    assert c.tts_dir == c.dataset_dir / "cache" / "tts"
    for cls, env in ((JinaTextEncoder, {"JINA_API_KEY": "k"}), (JinaClipImageEncoder, {"JINA_API_KEY": "k"}),
                     (JinaReranker, {"JINA_API_KEY": "k"}), (ElevenLabsSpeechToText, {"ELEVENLABS_API_KEY": "k"})):
        assert isinstance(cls.from_env(env), cls)


def test_settings_reads_llm_timeout():
    assert Settings.from_env({"LLM_TIMEOUT_S": "1.5"}).llm_timeout_s == 1.5
    assert Settings.from_env({}).llm_timeout_s == 2.5


@pytest.fixture()
def client(container):
    return TestClient(create_app(container))


def test_suggest_prefix_and_unaccented(client):
    j = client.get("/api/search/suggest", params={"q": "ao len"}).json()
    assert j["suggestions"] and all("ao len" in strip_accents(s.lower()) for s in j["suggestions"])
    assert len(j["suggestions"]) <= 8
    assert client.get("/api/search/suggest", params={"q": "áo len"}).json() == j
    assert client.get("/api/search/suggest", params={"q": "  "}).json() == {"suggestions": []}
    assert client.get("/api/search/suggest", params={"q": "zzzzqq"}).json() == {"suggestions": []}
    # word-prefix match: "len" finds names containing a word that starts with it
    assert any("len" in s.lower() for s in client.get("/api/search/suggest", params={"q": "len"}).json()["suggestions"])


def test_transcribe_requires_adapter_offline(client):
    r = client.post("/api/speech/transcribe", files={"audio": ("a.webm", b"1234", "audio/webm")})
    assert r.status_code == 501 and "STT_ADAPTER" in r.json()["detail"]
    assert client.post("/api/speech/transcribe", files={"audio": ("a.webm", b"", "audio/webm")}).status_code == 400
    assert client.post("/api/speech/transcribe", files={"audio": ("a.webm", b"1", "audio/webm")},
                       data={"lang": "fr"}).status_code == 422


class FakeStt:
    def __init__(self, error=None):
        self.error, self.calls = error, []

    def transcribe(self, audio, lang_hint=None):
        self.calls.append((audio, lang_hint))
        if self.error:
            raise self.error
        return Transcript("áo len đen", "vi")


def test_transcribe_with_adapter(container):
    stt = FakeStt()
    c = dataclasses.replace(container, orchestrator=types.SimpleNamespace(stt=stt))
    cl = TestClient(create_app(c))
    r = cl.post("/api/speech/transcribe", files={"audio": ("a.webm", b"AUDIO", "audio/webm")}, data={"lang": "vi"})
    assert r.status_code == 200 and r.json() == {"text": "áo len đen", "language": "vi"}
    assert stt.calls == [(b"AUDIO", "vi")]
    c = dataclasses.replace(container, orchestrator=types.SimpleNamespace(stt=FakeStt(RemoteError("down"))))
    r = TestClient(create_app(c)).post("/api/speech/transcribe", files={"audio": ("a.webm", b"A", "audio/webm")})
    assert r.status_code == 502


BODY = {"representation": {"normalized_text": "áo mùa đông", "language": "vi", "intent": "PRODUCT_SEARCH"},
        "total": 5, "top_names": ["Áo len cổ lọ"]}


def test_assistant_reply_without_tts_has_null_audio(client, clean_env):
    j = client.post("/api/assistant/reply", json=BODY).json()
    assert set(j) == {"text", "audio_url"} and j["audio_url"] is None and "5" in j["text"]
    assert client.post("/api/assistant/reply", json={"representation": {}, "total": -1}).status_code == 422


def test_assistant_reply_with_tts_serves_audio_from_static_tts(container, tmp_path):
    (tmp_path / "abc.mp3").write_bytes(b"MP3")
    synth = FakeSynth()
    c = dataclasses.replace(container, assistant=AssistantReplier(None, synth), synthesizer=synth, tts_dir=tmp_path)
    cl = TestClient(create_app(c))
    j = cl.post("/api/assistant/reply", json=BODY).json()
    assert j["audio_url"] == "http://testserver/static/tts/abc.mp3"
    assert cl.get("/static/tts/abc.mp3").content == b"MP3"
    assert cl.get("/static/images/P000001_0.jpg").status_code == 200  # the original /static mount still works


def test_full_pipeline_with_mocked_jina_adapters(monkeypatch, tmp_path, clean_env):
    """Remote encoders/reranker plug into the real index build and search without interface changes."""
    import json
    import zlib

    import httpx

    import container as container_mod

    def handler(request):
        body = json.loads(request.content)
        if request.url.path.endswith("/rerank"):
            return httpx.Response(200, json={"results": [
                {"index": i, "relevance_score": 1.0 / (i + 1)} for i in range(len(body["documents"]))]})
        data = []
        for i, x in enumerate(body["input"]):
            seed = zlib.crc32(json.dumps(x, sort_keys=True).encode())
            data.append({"index": i, "embedding": [((seed >> k) & 7) + 1.0 for k in range(16)]})
        return httpx.Response(200, json={"data": data})

    tr = httpx.MockTransport(handler)
    monkeypatch.setitem(container_mod.TEXT_ENCODERS, "jina", lambda: JinaTextEncoder("k", dim=16, cache_dir=tmp_path / "t", transport=tr))
    monkeypatch.setitem(container_mod.IMAGE_ENCODERS, "jina_clip",
                        lambda: JinaClipImageEncoder("k", dim=16, cache_dir=tmp_path / "i", transport=tr))
    monkeypatch.setitem(container_mod.RERANKERS, "jina", lambda: JinaReranker("k", transport=tr))
    c = build_container(Settings(text_encoder="jina", image_encoder="jina_clip", reranker="jina"))
    resp = c.orchestrator.search(text="áo mùa đông", limit=3)
    assert len(resp.results) == 3 and resp.representation.text_embedding.shape == (16,)
    assert list((tmp_path / "t").glob("*.npy")) and list((tmp_path / "i").glob("*.npy"))
    n_text = len(list((tmp_path / "t").glob("*.npy")))
    build_container(Settings(text_encoder="jina", image_encoder="jina_clip", reranker="jina"))
    assert len(list((tmp_path / "t").glob("*.npy"))) == n_text  # second index build is served from the cache


def test_smoke_tool_skips_without_keys(clean_env, capsys, monkeypatch):
    from tools import smoke_remote
    monkeypatch.setattr(smoke_remote, "load_dotenv", lambda paths: None)
    assert smoke_remote.main([]) == 0
    out = capsys.readouterr().out
    assert out.count("[SKIP]") == 8 and "FAIL" not in out
    assert smoke_remote.main(["--only", "bogus"]) == 2
