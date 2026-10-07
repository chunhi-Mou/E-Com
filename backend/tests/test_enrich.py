"""Offline enrichment tool: vocabulary-only tags, resumable cache, dry-run."""
import json

import pytest

from tools import enrich


class FakeLlm:
    def __init__(self, answers):
        self.answers, self.calls = answers, []

    def chat_json(self, system, user, max_tokens=600):
        self.calls.append((system, user))
        a = self.answers[min(len(self.calls), len(self.answers)) - 1]
        if isinstance(a, Exception):
            raise a
        return a


@pytest.fixture()
def products(container):
    return container.search.products.all()[:3]


def paths(slug):
    return ["Root", slug]


GOOD = {"tags": {"season": [{"value": "winter", "confidence": 0.9}, {"value": "monsoon", "confidence": 0.9}],
                 "warmth": [{"value": "high", "confidence": "0.8"}, {"value": "high", "confidence": 0.1}],
                 "color": [{"value": "black", "confidence": 1}],        # hard attribute: not a tag
                 "bogus": [{"value": "x", "confidence": 1}],
                 "style": [{"value": "basic", "confidence": 7}, "junk", {"confidence": 1}]}}


def test_tag_codes_come_from_vocabulary(container):
    assert set(enrich.tag_codes(container.vocabulary)) == {"season", "occasion", "style", "warmth"}
    prompt = enrich.system_prompt(container.vocabulary)
    assert "winter=" in prompt and "black=" not in prompt  # only soft attributes are offered


def test_sanitize_drops_unknown_codes_values_and_clamps(container):
    out = enrich.sanitize(GOOD, container.vocabulary)
    assert out == {"season": [{"value": "winter", "confidence": 0.9}],
                   "warmth": [{"value": "high", "confidence": 0.8}],
                   "style": [{"value": "basic", "confidence": 1.0}]}
    assert enrich.sanitize("nonsense", container.vocabulary) == {}


def test_enrich_is_resumable_and_skips_failures(container, products):
    existing, saved = {}, []
    llm = FakeLlm([GOOD, RuntimeError("boom"), GOOD])
    stats = enrich.enrich_products(products, container.vocabulary, llm, existing, paths, "m1",
                                   on_progress=lambda d: saved.append(len(d)))
    assert stats == {"done": 2, "cached": 0, "failed": 1, "planned": 0} and saved == [1, 2]
    assert set(existing) == {products[0].id, products[2].id}
    assert existing[products[0].id]["tags"]["season"][0]["value"] == "winter"
    # second run only retries the failed product
    llm2 = FakeLlm([GOOD])
    stats = enrich.enrich_products(products, container.vocabulary, llm2, existing, paths, "m1")
    assert stats["cached"] == 2 and stats["done"] == 1 and len(llm2.calls) == 1
    # a different model invalidates the cache
    llm3 = FakeLlm([GOOD])
    enrich.enrich_products(products[:1], container.vocabulary, llm3, existing, paths, "m2")
    assert len(llm3.calls) == 1


def test_dry_run_makes_no_calls(container, products, capsys):
    llm = FakeLlm([GOOD])
    existing = {}
    stats = enrich.enrich_products(products, container.vocabulary, llm, existing, paths, "m", dry_run=True)
    assert stats["planned"] == 3 and not llm.calls and not existing
    assert products[0].name in capsys.readouterr().out


def test_main_dry_run_does_not_write_and_requires_llm_env(tmp_path, monkeypatch, capsys):
    out = tmp_path / "enrichment.json"
    assert enrich.main(["--dry-run", "--limit", "2", "--out", str(out)]) == 0
    assert not out.exists()
    for k in ("LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setattr(enrich, "load_dotenv", lambda paths: None)
    assert enrich.main(["--limit", "1", "--out", str(out)]) == 2
    assert "LLM_BASE_URL" in capsys.readouterr().err and not out.exists()


def test_main_never_touches_products_json(tmp_path, monkeypatch, container):
    import shutil
    from data.product_repository import DATASET_DIR
    ds = tmp_path / "ds"
    shutil.copytree(DATASET_DIR, ds, ignore=shutil.ignore_patterns("images"))
    before = (ds / "products.json").read_bytes()
    monkeypatch.setattr(enrich, "load_dotenv", lambda paths: None)
    for k, v in (("LLM_BASE_URL", "https://llm.invalid/v1"), ("LLM_MODEL", "m"), ("LLM_API_KEY", "dummy")):
        monkeypatch.setenv(k, v)

    class Stub:
        model = "m"
        calls = 0

        def chat_json(self, system, user, max_tokens=600):
            Stub.calls += 1
            return GOOD

    monkeypatch.setattr(enrich.OpenAICompatibleLLM, "from_env", classmethod(lambda cls, **kw: Stub()))
    assert enrich.main(["--dataset-dir", str(ds), "--limit", "2"]) == 0
    data = json.loads((ds / "enrichment.json").read_text(encoding="utf-8"))
    assert len(data) == 2 and Stub.calls == 2 and (ds / "products.json").read_bytes() == before
    assert enrich.main(["--dataset-dir", str(ds), "--limit", "2"]) == 0 and Stub.calls == 2  # resumed from cache
