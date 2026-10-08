"""Remote adapters against httpx.MockTransport: request shape, parsing, retries, timeouts, caches, sanitizing."""
import base64
import hashlib
import io
import json
import time
import types

import httpx
import numpy as np
import pytest
from PIL import Image

from application.adapters import http as http_mod
from application.adapters.assistant import AssistantReplier
from application.adapters.http import HttpClient, RemoteError, load_dotenv
from application.adapters.jina import JinaClipImageEncoder, JinaReranker, JinaTextEncoder
from application.adapters.llm import OpenAICompatibleLLM
from application.adapters.llm_query_parser import LlmQueryParser, MergingExpander
from application.adapters.speech_to_text import ElevenLabsSpeechToText
from application.adapters.synthesizer import ElevenLabsSynthesizer, SpeechSynthesizer
from application.reranker import TokenCoverageReranker
from application.query_service import RuleQueryParser


@pytest.fixture(autouse=True)
def no_backoff(monkeypatch):
    monkeypatch.setattr(http_mod, "time", types.SimpleNamespace(sleep=lambda s: None))


class Recorder:
    """MockTransport handler that records requests and replies from a list of responses/exceptions."""

    def __init__(self, *replies):
        self.replies, self.requests = list(replies), []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        r = self.replies[min(len(self.requests), len(self.replies)) - 1]
        if isinstance(r, Exception):
            raise r
        return r if isinstance(r, httpx.Response) else httpx.Response(200, json=r)

    @property
    def transport(self):
        return httpx.MockTransport(self)

    def body(self, i=0):
        return json.loads(self.requests[i].content)


# ---------- shared HTTP client ----------
def test_http_retries_once_on_5xx_then_succeeds():
    rec = Recorder(httpx.Response(503, text="busy"), {"ok": 1})
    c = HttpClient("https://x.test", {}, transport=rec.transport)
    assert c.json("GET", "/a") == {"ok": 1} and len(rec.requests) == 2


def test_http_gives_up_after_one_retry_on_timeout_and_5xx():
    rec = Recorder(httpx.ReadTimeout("slow"))
    with pytest.raises(RemoteError, match="timeout"):
        HttpClient("https://x.test", {}, transport=rec.transport).request("GET", "/a")
    assert len(rec.requests) == 2
    rec = Recorder(httpx.Response(500, text="boom"))
    with pytest.raises(RemoteError) as e:
        HttpClient("https://x.test", {}, transport=rec.transport).request("GET", "/a")
    assert e.value.status == 500 and len(rec.requests) == 2


def test_http_4xx_is_not_retried_and_error_hides_credentials():
    rec = Recorder(httpx.Response(401, text="bad key"))
    c = HttpClient("https://x.test", {"Authorization": "Bearer SECRET"}, transport=rec.transport)
    with pytest.raises(RemoteError) as e:
        c.request("GET", "/a")
    assert e.value.status == 401 and len(rec.requests) == 1 and "SECRET" not in str(e.value)


def test_load_dotenv_does_not_override_environment(tmp_path, monkeypatch):
    f = tmp_path / ".env"
    f.write_text('# c\nFOO_A=1\nFOO_B="two"\nFOO_C=\nexport FOO_D=4\n')
    for k in ("FOO_A", "FOO_B", "FOO_C", "FOO_D"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("FOO_A", "keep")
    load_dotenv([f, tmp_path / "missing"])
    import os
    assert (os.environ["FOO_A"], os.environ["FOO_B"], os.environ["FOO_D"]) == ("keep", "two", "4")
    assert "FOO_C" not in os.environ
    for k in ("FOO_B", "FOO_D"):
        monkeypatch.delenv(k)


# ---------- ElevenLabs STT ----------
def test_stt_request_shape_and_parsing():
    rec = Recorder({"text": " áo len đen ", "language_code": "vie", "language_probability": 0.97})
    stt = ElevenLabsSpeechToText("KEY", model="scribe_x", transport=rec.transport)
    t = stt.transcribe(b"RIFFfakeaudio", lang_hint=None)
    req = rec.requests[0]
    assert req.method == "POST" and req.url.path == "/v1/speech-to-text"
    assert req.headers["xi-api-key"] == "KEY" and req.headers["content-type"].startswith("multipart/form-data")
    for part in (b'name="model_id"', b"scribe_x", b'name="file"', b"RIFFfakeaudio"):
        assert part in req.content
    assert (t.text, t.language, t.simulated) == ("áo len đen", "vi", False) and t.confidence == pytest.approx(0.97)


def test_stt_language_hint_mapping_and_text_passthrough():
    rec = Recorder({"text": "show me shoes", "language_code": "eng"}, {"text": "xin chào"})
    stt = ElevenLabsSpeechToText("KEY", transport=rec.transport)
    assert stt.transcribe(b"a", "en").language == "en" and b'name="language_code"' in rec.requests[0].content
    assert stt.transcribe(b"a").language == "vi"  # unknown code -> detected from text
    n = len(rec.requests)
    t = stt.transcribe("  show me red shoes ")  # orchestrator passes already-transcribed text
    assert (t.text, t.language, len(rec.requests)) == ("show me red shoes", "en", n)


def test_stt_errors():
    stt = ElevenLabsSpeechToText("KEY", transport=Recorder({"nope": 1}).transport)
    with pytest.raises(RemoteError, match="text"):
        stt.transcribe(b"a")
    with pytest.raises(ValueError, match="ELEVENLABS_API_KEY"):
        ElevenLabsSpeechToText.from_env({})
    assert ElevenLabsSpeechToText.from_env({"ELEVENLABS_API_KEY": "k", "ELEVENLABS_STT_MODEL": "m"}).model == "m"


# ---------- ElevenLabs TTS ----------
def test_tts_request_shape_and_cache_hit(tmp_path):
    rec = Recorder(httpx.Response(200, content=b"MP3DATA"))
    tts = ElevenLabsSynthesizer("KEY", "VOICE", tmp_path, model="eleven_flash_v2_5", transport=rec.transport)
    assert tts.synthesize("Xin chào", "vi") == b"MP3DATA"
    req = rec.requests[0]
    assert req.url.path == "/v1/text-to-speech/VOICE" and req.url.params["output_format"] == "mp3_44100_128"
    assert req.headers["xi-api-key"] == "KEY"
    assert rec.body() == {"text": "Xin chào", "model_id": "eleven_flash_v2_5", "language_code": "vi"}
    name = hashlib.sha256(b"eleven_flash_v2_5\0VOICE\0Xin ch\xc3\xa0o\0").hexdigest() + ".mp3"
    assert tts.synthesize_to_file("Xin chào", "vi") == name and (tmp_path / name).read_bytes() == b"MP3DATA"
    assert len(rec.requests) == 1  # cache hit
    tts.synthesize("Another sentence", "en")
    assert len(rec.requests) == 2
    assert isinstance(tts, SpeechSynthesizer)


def test_tts_cache_key_depends_on_voice_and_model(tmp_path):
    rec = Recorder(httpx.Response(200, content=b"x"))
    a = ElevenLabsSynthesizer("K", "V1", tmp_path, transport=rec.transport).synthesize_to_file("hi", "en")
    b = ElevenLabsSynthesizer("K", "V2", tmp_path, transport=rec.transport).synthesize_to_file("hi", "en")
    c = ElevenLabsSynthesizer("K", "V1", tmp_path, model="m2", transport=rec.transport).synthesize_to_file("hi", "en")
    assert len({a, b, c}) == 3


def test_tts_failure_is_not_cached(tmp_path):
    tts = ElevenLabsSynthesizer("K", "V", tmp_path, transport=Recorder(httpx.Response(500, text="x")).transport)
    with pytest.raises(RemoteError):
        tts.synthesize_to_file("hi", "en")
    assert not list(tmp_path.glob("*.mp3"))
    with pytest.raises(ValueError, match="ELEVENLABS_VOICE_ID"):
        ElevenLabsSynthesizer.from_env(tmp_path, {"ELEVENLABS_API_KEY": "k"})


# ---------- OpenAI-compatible LLM ----------
def completion(content):
    return {"choices": [{"message": {"content": content}}]}


def make_llm(rec, **kw):
    return OpenAICompatibleLLM("https://llm.test/v1", "m1", "KEY", transport=rec.transport, **kw)


def test_llm_request_shape_and_fenced_json():
    rec = Recorder(completion('```json\n{"a": 1}\n```'))
    assert make_llm(rec).chat_json("sys", "usr") == {"a": 1}
    req = rec.requests[0]
    assert str(req.url) == "https://llm.test/v1/chat/completions" and req.headers["authorization"] == "Bearer KEY"
    b = rec.body()
    assert b["model"] == "m1" and b["response_format"] == {"type": "json_object"}
    assert [m["role"] for m in b["messages"]] == ["system", "user"]


def test_llm_retries_without_json_mode_when_unsupported():
    rec = Recorder(httpx.Response(400, text="response_format unsupported"), completion('{"ok": true}'))
    assert make_llm(rec).chat_json("s", "u") == {"ok": True}
    assert "response_format" in rec.body(0) and "response_format" not in rec.body(1)


def test_llm_repeated_question_is_answered_from_cache():
    rec = Recorder(completion('{"a": 1}'))
    llm = make_llm(rec)
    assert llm.chat_json("s", "u") == llm.chat_json("s", "u") == {"a": 1} and len(rec.requests) == 1
    llm.chat_json("s", "other")
    assert len(rec.requests) == 2


def test_llm_quota_error_pauses_calls_then_resumes():
    now = [100.0]
    rec = Recorder(httpx.Response(429, text="quota"), completion('{"a": 1}'))
    llm = make_llm(rec, retries=0, cooldown_s=60, clock=lambda: now[0])
    with pytest.raises(RemoteError) as first:
        llm.chat("s", "u1")
    assert first.value.status == 429
    for q in ("u2", "u3"):  # paused: fails at once, no request is sent
        with pytest.raises(RemoteError, match="paused"):
            llm.chat("s", q)
    assert len(rec.requests) == 1
    now[0] += 61
    assert llm.chat_json("s", "u4") == {"a": 1} and len(rec.requests) == 2


def test_llm_pauses_after_three_consecutive_failures_only():
    now = [0.0]
    rec = Recorder(httpx.Response(401, text="no"), httpx.Response(401, text="no"), completion("ok"),
                   httpx.Response(401, text="no"), httpx.Response(401, text="no"), httpx.Response(401, text="no"))
    llm = make_llm(rec, retries=0, clock=lambda: now[0])
    for q in ("a", "b"):
        with pytest.raises(RemoteError):
            llm.chat("s", q)
    assert llm.chat("s", "c") == "ok"  # a success resets the count
    for q in ("d", "e", "f"):
        with pytest.raises(RemoteError):
            llm.chat("s", q)
    with pytest.raises(RemoteError, match="paused"):
        llm.chat("s", "g")
    assert len(rec.requests) == 6


def test_llm_parser_survives_quota_exhaustion(lexicon):
    rec = Recorder(httpx.Response(429, text="quota"))
    p = llm_parser(lexicon, rec)
    for text in ("áo ấm mùa đông", "giày chạy bộ", "túi xách"):
        rep = p.parse(text)
        assert rep.parser == "rules" and rep.normalized_text
    assert len(rec.requests) == 1  # only the first search tried the model


def test_llm_bad_outputs_raise():
    for content in ("not json", "[1, 2]", ""):
        with pytest.raises(RemoteError):
            make_llm(Recorder(completion(content))).chat_json("s", "u")
    with pytest.raises(RemoteError, match="shape"):
        make_llm(Recorder({"choices": []})).chat("s", "u")
    assert not OpenAICompatibleLLM.configured({"LLM_BASE_URL": "x", "LLM_MODEL": "y"})


# ---------- LlmQueryParser ----------
@pytest.fixture()
def lexicon(container):
    return container.lexicon


def llm_parser(lexicon, rec, timeout_s=2.5):
    return LlmQueryParser(lexicon, make_llm(rec, retries=0), timeout_s)


def test_llm_parser_merges_and_sanitizes(lexicon):
    llm_json = {
        "intent": "PRODUCT_SEARCH",
        "category": ["ao-len-nam", "made-up-slug"],
        "soft_preferences": {"season": ["winter", "monsoon"], "invented_attr": ["x"], "warmth": "high"},
        "expansion_terms": ["áo len cổ lọ", " ", "áo len cổ lọ", 7, "x" * 100],
        "price_max": 1, "order_code": "99999999",
    }
    rec = Recorder(completion(json.dumps(llm_json)))
    text = "đồ cho mùa lạnh dưới 500k"
    rules = RuleQueryParser(lexicon).parse(text)
    rep = llm_parser(lexicon, rec).parse(text)
    assert rep.parser == "llm"
    assert rep.hard_filters["price_max"] == rules.hard_filters["price_max"] == 500_000  # rules win on price
    assert "order_code" not in rep.hard_filters and rep.intent.value == "PRODUCT_SEARCH"
    assert "category" not in rep.hard_filters  # inferred category is soft, never a hard filter
    assert rep.soft_preferences["season"] == ["winter"] and rep.soft_preferences["warmth"] == ["high"]
    assert "invented_attr" not in rep.soft_preferences
    cat_phrase = lexicon.category_phrase("ao-len-nam")
    assert rep.expansion_terms == [cat_phrase, "áo len cổ lọ"]  # unknown slug dropped
    assert all(m["value"] != "made-up-slug" for m in rep.matches)


def test_llm_parser_prompt_comes_from_data(lexicon):
    rec = Recorder(completion("{}"))
    llm_parser(lexicon, rec).parse("áo")
    system = rec.body()["messages"][0]["content"]
    assert "winter=" in system and "ao-len-nam=" in system and "season:" in system
    assert rec.body()["messages"][1]["content"] == "áo"


def test_llm_parser_rules_keep_priority_for_category(lexicon):
    rules = RuleQueryParser(lexicon).parse("áo len nam")
    rec = Recorder(completion(json.dumps({"category": ["giay-the-thao-nam"]})))
    rep = llm_parser(lexicon, rec).parse("áo len nam")
    assert rep.hard_filters["category"] == rules.hard_filters["category"]


@pytest.mark.parametrize("reply", [httpx.ReadTimeout("slow"), httpx.Response(500, text="x"),
                                   httpx.Response(200, json=completion("garbage")), httpx.ConnectError("down")])
def test_llm_parser_falls_back_to_rules_on_errors(lexicon, reply):
    rep = llm_parser(lexicon, Recorder(reply)).parse("áo mùa đông dưới 500k")
    assert rep.parser == "rules"
    assert rep.to_dict() == RuleQueryParser(lexicon).parse("áo mùa đông dưới 500k").to_dict()


def test_llm_parser_hard_timeout(lexicon):
    def slow(request):
        time.sleep(0.4)
        return httpx.Response(200, json=completion('{"expansion_terms": ["x"]}'))

    p = LlmQueryParser(lexicon, OpenAICompatibleLLM("https://l.test/v1", "m", "k", retries=0,
                                                    transport=httpx.MockTransport(slow)), timeout_s=0.05)
    t0 = time.perf_counter()
    rep = p.parse("áo mùa đông")
    assert rep.parser == "rules" and time.perf_counter() - t0 < 0.3


def test_llm_parser_order_queries_skip_llm_and_latest_is_accepted(lexicon):
    rec = Recorder(completion("{}"))
    rep = llm_parser(lexicon, rec).parse("đơn 20261001 đâu rồi")
    assert rep.intent.value == "ORDER_LOOKUP" and rep.hard_filters["order_code"] == "20261001" and not rec.requests
    rep = llm_parser(lexicon, Recorder(completion('{"intent": "ORDER_LATEST"}'))).parse("cái thứ tôi mua hôm qua")
    assert rep.intent.value == "ORDER_LATEST" and rep.parser == "llm"
    rep = llm_parser(lexicon, Recorder(completion('{"intent": "ORDER_LOOKUP"}'))).parse("áo len")
    assert rep.intent.value == "PRODUCT_SEARCH"  # a lookup needs a rule-extracted code


def test_merging_expander_keeps_llm_terms(container, lexicon):
    rep = RuleQueryParser(lexicon).parse("áo mùa đông")
    rep.expansion_terms = ["áo len cổ lọ", "custom term"]
    out = MergingExpander(container.search.products, lexicon).expand(rep)
    assert out[:2] == ["áo len cổ lọ", "custom term"] and len(out) > 2 and len(set(out)) == len(out)


# ---------- Jina embeddings ----------
def embeddings(n, dim=4, offset=0):
    return {"data": [{"index": i, "embedding": [float(offset + i + 1)] + [0.0] * (dim - 1)} for i in range(n)]}


class EmbedServer:
    """Echoes a deterministic vector per input so cache/batch behaviour is observable."""

    def __init__(self):
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        inputs = json.loads(request.content)["input"]
        data = [{"index": i, "embedding": [float(len(str(x)) % 7 + 1), float(i), 1.0, 0.0]}
                for i, x in reversed(list(enumerate(inputs)))]  # reversed: client must sort by index
        return httpx.Response(200, json={"data": data})

    @property
    def transport(self):
        return httpx.MockTransport(self)


def test_jina_text_request_shape_batching_and_normalization(tmp_path):
    srv = EmbedServer()
    enc = JinaTextEncoder("KEY", dim=4, cache_dir=tmp_path, batch_size=2, transport=srv.transport)
    v = enc.encode(["a", "bb", "ccc", "dddd", "eeeee"])
    assert len(srv.requests) == 3 and v.shape == (5, 4) and v.dtype == np.float32
    assert np.allclose(np.linalg.norm(v, axis=1), 1.0, atol=1e-5)
    req = srv.requests[0]
    assert str(req.url) == "https://api.jina.ai/v1/embeddings" and req.headers["authorization"] == "Bearer KEY"
    body = json.loads(req.content)
    assert body["model"] == "jina-embeddings-v3" and body["task"] == "text-matching"
    assert body["input"] == ["a", "bb"] and body["dimensions"] == 4 and body["normalized"] is True
    assert v[0, 1] == 0 and v[1, 1] > 0  # index order restored inside a batch


def test_jina_text_cache_hit_and_partial_miss(tmp_path):
    srv = EmbedServer()
    enc = JinaTextEncoder("KEY", dim=4, cache_dir=tmp_path, transport=srv.transport)
    first = enc.encode(["x", "y"])
    assert len(srv.requests) == 1
    again = enc.encode(["y", "x"])
    assert len(srv.requests) == 1 and np.allclose(again, first[::-1])
    fresh = JinaTextEncoder("KEY", dim=4, cache_dir=tmp_path, transport=srv.transport)  # new process, same disk
    fresh.encode(["x", "z"])
    assert len(srv.requests) == 2 and json.loads(srv.requests[1].content)["input"] == ["z"]
    other_model = JinaTextEncoder("KEY", model="other", dim=4, cache_dir=tmp_path, transport=srv.transport)
    other_model.encode(["x"])
    assert len(srv.requests) == 3
    assert enc.encode([]).shape == (0, 4)


def test_jina_text_errors(tmp_path):
    with pytest.raises(RemoteError, match="shape"):
        JinaTextEncoder("K", transport=Recorder({"data": "x"}).transport).encode(["a"])
    with pytest.raises(RemoteError, match="expected 2"):
        JinaTextEncoder("K", transport=Recorder(embeddings(1)).transport).encode(["a", "b"])
    with pytest.raises(RemoteError):
        JinaTextEncoder("K", transport=Recorder(httpx.Response(429, text="rate")).transport).encode(["a"])
    with pytest.raises(ValueError, match="JINA_API_KEY"):
        JinaTextEncoder.from_env({})


def jpeg_bytes(color=(200, 30, 30)):
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color).save(buf, format="PNG")
    return buf.getvalue()


def test_jina_clip_image_and_cross_modal_text(tmp_path):
    srv = EmbedServer()
    enc = JinaClipImageEncoder("KEY", dim=4, cache_dir=tmp_path, transport=srv.transport)
    img = tmp_path / "p.png"
    img.write_bytes(jpeg_bytes())
    v = enc.encode([img, jpeg_bytes((0, 0, 200))])  # path and raw bytes both accepted
    body = json.loads(srv.requests[0].content)
    assert body["model"] == "jina-clip-v2" and v.shape == (2, 4)
    sent = base64.b64decode(body["input"][0]["image"])
    assert Image.open(io.BytesIO(sent)).format == "JPEG"
    t = enc.encode_text(["a red top"])
    assert json.loads(srv.requests[1].content)["input"] == [{"text": "a red top"}] and t.shape == (1, 4)
    n = len(srv.requests)
    enc.encode([img])
    enc.encode_text(["a red top"])
    assert len(srv.requests) == n  # both cached; text and image keys do not collide
    assert hasattr(enc, "encode") and not hasattr(JinaTextEncoder, "encode_text")


# ---------- Jina reranker ----------
def test_reranker_request_shape_and_ordering():
    rec = Recorder({"results": [{"index": 1, "relevance_score": 0.9}, {"index": 0, "relevance_score": 0.1}]})
    rr = JinaReranker("KEY", transport=rec.transport)
    assert rr.score("áo len", ["quần", "áo len cổ lọ"]) == [0.1, 0.9]
    b = rec.body()
    assert str(rec.requests[0].url) == "https://api.jina.ai/v1/rerank"
    assert b["model"] == "jina-reranker-v2-base-multilingual" and b["query"] == "áo len"
    assert b["documents"] == ["quần", "áo len cổ lọ"] and b["top_n"] == 2
    assert rr.last_error is None and rr.score("q", []) == []


@pytest.mark.parametrize("reply", [httpx.Response(500, text="x"), httpx.ReadTimeout("slow"),
                                   {"results": [{"index": 0, "relevance_score": 0.5}]}, {"oops": 1}])
def test_reranker_falls_back_to_local_scores(reply):
    rr = JinaReranker("KEY", transport=Recorder(reply).transport)
    docs = ["áo len cổ lọ", "quần short"]
    assert rr.score("áo len", docs) == TokenCoverageReranker().score("áo len", docs)
    assert rr.last_error


# ---------- Assistant ----------
class FakeSynth(SpeechSynthesizer):
    def __init__(self, fail=False):
        self.calls, self.fail = [], fail

    def synthesize(self, text, lang):
        return b"x"

    def synthesize_to_file(self, text, lang):
        self.calls.append((text, lang))
        if self.fail:
            raise RemoteError("tts down")
        return "abc.mp3"


def test_assistant_template_matches_query_language():
    r = AssistantReplier()
    vi = r.reply({"normalized_text": "áo mùa đông", "language": "vi"}, 12, ["Áo len", "Áo phao", "Áo nỉ"])
    assert "12" in vi.text and "Áo len" not in vi.text and len(vi.text.split()) <= 7 and vi.audio_file is None
    en = r.reply({"raw_text": "black running shoes", "language": "en"}, 3, [])
    assert en.language == "en" and en.text.startswith("Found 3")
    assert "Chưa có kết quả" in r.reply({"raw_text": "xyz", "language": "vi"}, 0, []).text
    assert r.reply({"raw_text": "where is my order", "intent": "ORDER_LATEST"}, 0, []).language == "en"


def test_assistant_uses_llm_then_tts_and_degrades():
    rec = Recorder(completion("Mình tìm được 12 áo ấm đây."))
    synth = FakeSynth()
    r = AssistantReplier(make_llm(rec), synth).reply({"normalized_text": "áo ấm", "language": "vi"}, 12, ["Áo len"])
    assert r.text == "Mình tìm được 12 áo ấm đây." and r.audio_file == "abc.mp3"
    assert synth.calls == [(r.text, "vi")]
    assert "Vietnamese" in rec.body()["messages"][0]["content"]
    assert "total_results: 12" in rec.body()["messages"][1]["content"]
    # LLM failure -> template; TTS failure -> text without audio
    r2 = AssistantReplier(make_llm(Recorder(httpx.Response(500, text="x"))), FakeSynth(fail=True)).reply(
        {"normalized_text": "áo ấm", "language": "vi"}, 2, ["Áo len"])
    assert "2 sản phẩm" in r2.text and r2.audio_file is None
    # an LLM answer longer than the word budget is replaced by the template
    long = AssistantReplier(make_llm(Recorder(completion("Mình tìm thấy 12 sản phẩm áo ấm rất đẹp cho bạn đây."))), None).reply(
        {"normalized_text": "áo ấm", "language": "vi"}, 12, [])
    assert long.text == "Mình tìm được 12 sản phẩm đây."
