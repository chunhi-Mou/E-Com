from domain.models import Intent


def test_winter_tops_top5(search, container):
    resp = search(text="áo mùa đông", limit=5)
    assert len(resp.results) == 5
    for r in resp.results:
        assert "winter" in r.product.tags["season"]
        path = container.catalog.category_path(r.product.category)
        assert path[1].slug in ("ao-nam", "ao-nu")  # category subtree "ao"


def test_expansion_is_data_driven(search):
    rep = search(text="áo mùa đông").representation
    assert {"áo len", "áo khoác phao"} <= set(rep.expansion_terms)


def test_category_filter_uses_subtree(search, container):
    resp = search(text="áo", limit=50)
    assert resp.total >= 20
    for r in resp.results:
        assert container.catalog.category_path(r.product.category)[1].slug in ("ao-nam", "ao-nu")


def test_hard_filters_are_respected(search):
    resp = search(text="giày trắng", limit=10)
    assert resp.relaxed_filters == []
    assert resp.results
    for r in resp.results:
        assert r.product.category.startswith(("giay", "dep")) and "white" in r.product.attributes["color"]
    resp = search(text="áo thun dưới 250k", limit=10)
    assert resp.relaxed_filters == [] and resp.results
    assert all(r.product.price <= 250_000 and r.product.category.startswith("ao-thun") for r in resp.results)


def test_relax_filters_when_few_matches(search):
    resp = search(text="áo len màu xanh lá dưới 100k")
    assert resp.relaxed_filters
    assert resp.results  # never empty because of over-filtering


def test_relaxed_price_still_prefers_cheaper(search):
    resp = search(text="headphones under 6 million")
    assert "price" in resp.relaxed_filters
    assert resp.results[0].product.price <= 6_000_000


def test_ranking_breakdown(search):
    resp = search(text="giày chạy bộ", limit=3)
    for r in resp.results:
        assert set(r.scores) == {"text", "image", "business", "soft", "final"}
        assert all(0.0 <= v <= 1.0 for v in r.scores.values())
    finals = [r.scores["final"] for r in resp.results]
    assert finals == sorted(finals, reverse=True)
    assert [r.rank for r in resp.results] == [1, 2, 3]


def test_retrieval_is_separate_from_ranking(container):
    rep = container.queries.build(text="áo mùa đông")
    retrieved = container.search.retrieve(rep)
    assert retrieved.candidates and not hasattr(retrieved.candidates[0], "scores")
    ranked = container.ranking.rank(rep, retrieved.candidates)
    assert len(ranked) == len(retrieved.candidates)


def test_beach_concept_without_product_name(search):
    resp = search(text="đồ đi biển", limit=5)
    assert all("beach" in r.product.tags["occasion"] for r in resp.results)


def test_non_clothing_search(search):
    resp = search(text="nồi chiên không dầu", limit=5)
    assert resp.results[0].product.category == "noi-chien-khong-dau"


def test_unaccented_query(search):
    resp = search(text="giay chay bo", limit=4)
    assert all(r.product.category.startswith("giay-chay-bo") for r in resp.results)


def test_ui_filters_override(search):
    resp = search(text="áo", filters={"category": "ao-len-nam", "sort": "price_asc"}, limit=20)
    assert all(r.product.category == "ao-len-nam" for r in resp.results)
    prices = [r.product.price for r in resp.results]
    assert prices == sorted(prices)


def test_voice_goes_through_stt(search):
    resp = search(text="Show me black running shoes", modality="voice")
    assert resp.transcript.simulated is True
    assert resp.representation.modality.value == "voice"
    assert resp.results[0].product.category.startswith("giay-chay-bo")


def test_order_intent_returns_no_products(search):
    resp = search(text="đơn 20261001")
    assert resp.representation.intent == Intent.ORDER_LOOKUP and resp.results == []
