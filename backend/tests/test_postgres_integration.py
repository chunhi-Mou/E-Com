"""Postgres repositories vs the JSON/numpy ones: same inputs must give the same outputs."""
import numpy as np
import pytest

pytest.importorskip("psycopg")  # optional dependency (see db/README.md)
pytest.importorskip("pgvector")
from test_postgres_support import requires_pg, state

from application.text_encoder import HashingTextEncoder
from data.order_repository import JsonOrderRepository
from data.postgres import PgVectorIndex, PostgresProductRepository
from data.product_repository import JsonProductRepository
from data.vocabulary_repository import JsonVocabularyRepository
from data.vector_index import NumpyVectorIndex
from domain.models import Intent, Modality, QueryRepresentation, SearchResult

pytestmark = requires_pg


@pytest.fixture(scope="module")
def pg():
    return state()


@pytest.fixture(scope="module")
def js(pg):
    return JsonProductRepository(pg.dataset_dir)


def test_load_counts(pg, js):
    assert pg.counts["products"] == len(js.all()) == 59
    assert pg.counts["text_embeddings"] == 59 and pg.counts["image_embeddings"] == 59


def test_products_identical_including_order_and_types(pg, js):
    products = pg.layer[0]
    assert products.all() == js.all()  # dataclass equality: every field, same order
    p = products.get("P000001")
    assert p == js.get("P000001") and isinstance(p.price, int) and isinstance(p.rating, float)
    assert products.get("nope") is None
    ids = ["P000003", "P000001", "missing", "P000003"]
    assert products.get_many(ids) == js.get_many(ids)


def test_uncached_repository_gives_same_results(pg, js):
    raw = PostgresProductRepository(pg.layer.db, pg.dataset_dir, cache_ttl=0)
    assert raw.all() == js.all()
    assert raw.get("P000010") == js.get("P000010") and raw.get("nope") is None
    assert raw.get_many(["P000002", "P000001"]) == js.get_many(["P000002", "P000001"])
    assert raw.categories() == js.categories() and raw.category("ao-nam") == js.category("ao-nam")


def test_categories_and_subtree_via_materialized_path(pg, js):
    products = pg.layer[0]
    assert products.categories() == js.categories()
    assert products.category("ao-len-nam").path == "/thoi-trang-nam/ao-nam/ao-len-nam"
    assert products.category("nope") is None
    for c in js.categories():
        assert products.subtree_slugs(c.slug) == js.subtree_slugs(c.slug), c.slug
    assert products.subtree_slugs("nope") == {"nope"} == js.subtree_slugs("nope")
    assert products.brands() == js.brands()
    assert products.resolve_image("images/P000001_0.jpg") == js.resolve_image("images/P000001_0.jpg")


def test_list_by_category_pagination(pg, js):
    products = pg.layer[0]
    for slug, page, size in [(None, 1, 20), (None, 3, 20), ("ao-nam", 1, 5), ("ao-nam", 2, 5), ("thoi-trang-nu", 1, 100),
                             ("nope", 1, 20), ("giay-chay-bo", 1, 20)]:
        assert products.list_by_category(slug, page, size) == js.list_by_category(slug, page, size), (slug, page)


FILTERS = [
    {},
    {"category": ["ao-nam"]},
    {"category": ["ao-len-nam", "giay-chay-bo"]},
    {"category": ["nope"]},
    {"price_min": 200_000}, {"price_max": 250_000}, {"price_min": 100_000, "price_max": 400_000},
    {"brand": ["uniqlo"]}, {"brand": ["Uniqlo", "NIKE"]},
    {"color": ["black"]}, {"color": ["black", "white"], "gender": ["male", "unisex"]},
    {"season": ["winter"], "category": ["ao-nam", "ao-nu"]},        # a tag, not an attribute
    {"occasion": ["beach"]}, {"warmth": ["high"], "material": ["wool"]},
    {"color": ["unobtainium"]}, {"nope": ["x"]},
    {"category": ["giay-chay-bo"], "color": ["black"], "price_max": 2_000_000, "brand": ["nike"]},
    {"color": [], "category": None, "price_min": None},
    {"price_max": 0},
]


@pytest.mark.parametrize("filters", FILTERS, ids=lambda f: str(f)[:60])
def test_find_ids_matches_json(pg, js, filters):
    assert pg.layer[0].find_ids(filters) == js.find_ids(filters)


def test_find_ids_finds_something_for_real_filters(pg):
    assert len(pg.layer[0].find_ids({"category": ["ao-nam"], "color": ["black"]})) > 0


def test_vocabulary_identical(pg):
    pgv, jsv = pg.layer[2].load(), JsonVocabularyRepository(pg.dataset_dir).load()
    assert pgv == jsv
    assert list(pgv.attributes) == list(jsv.attributes)
    assert all(list(pgv.attributes[c].values) == list(jsv.attributes[c].values) for c in jsv.attributes)
    assert pgv.attributes["gender"].values["male"].also_match == ("unisex",)


def test_orders_identical(pg):
    orders, js = pg.layer[1], JsonOrderRepository(pg.dataset_dir)
    for code in ("20261001", "20260915", "20261005", "99999999"):
        assert orders.find_by_code(code) == js.find_by_code(code)
    for cust in ("C001", "C002", "C404"):
        assert orders.find_latest_by_customer(cust) == js.find_latest_by_customer(cust)
        assert orders.find_by_customer(cust) == js.find_by_customer(cust)
        assert orders.find_by_customer(cust, "DELIVERED") == js.find_by_customer(cust, "DELIVERED")
    o = orders.find_by_code("20261001")
    assert o.created_at == "2026-10-01T09:30:00+07:00" and isinstance(o.total, int)


# -- vector indexes ----------------------------------------------------------------------------
def _numpy_twin(pg, kind):
    """A NumpyVectorIndex holding exactly the vectors that were loaded into Postgres."""
    c = pg.container
    return c.search.text_index if kind == "text" else c.search.image_index


def test_vector_index_len_and_models(pg):
    text, image = pg.layer[3], pg.layer[4]
    assert (len(text), len(image)) == (59, 59)
    assert text.model == "hashing" and image.model == "color_histogram"
    assert len(PgVectorIndex(pg.layer.db, "text", "some-other-model")) == 0


def test_text_knn_matches_numpy(pg, js):
    products = js.all()
    enc = HashingTextEncoder()
    from application.search_service import DocumentBuilder
    vocab = JsonVocabularyRepository(pg.dataset_dir).load()
    builder = DocumentBuilder(js, vocab)
    docs = [builder.build(p) for p in products]
    enc.fit(docs)
    ref = NumpyVectorIndex()
    ref.add([p.id for p in products], enc.encode(docs))
    text = pg.layer[3]
    for q in ("áo len mùa đông", "giày chạy bộ màu đen", "nồi chiên không dầu"):
        qv = enc.encode([q])[0]
        got, want = text.search(qv, k=10), ref.search(qv, k=10)
        assert got[0][0] == want[0][0]
        assert len({i for i, _ in got} & {i for i, _ in want}) >= 9
        assert dict(got)[want[0][0]] == pytest.approx(want[0][1], abs=5e-3)  # halfvec storage: ~1e-3 error
        assert [s for _, s in got] == sorted((s for _, s in got), reverse=True)
        allowed = {i for i, _ in want[:20]}
        res = text.search(qv, k=50, allowed_ids=allowed)
        assert {i for i, _ in res} <= allowed and len(res) == len(allowed)


def test_filtered_knn_in_one_statement(pg, js):
    text, products = pg.layer[3], pg.layer[0]
    enc = HashingTextEncoder()
    qv = enc.encode(["áo len"])[0]
    filters = {"category": ["ao-nam"], "color": ["black", "navy"]}
    expected = products.find_ids(filters)
    assert expected
    res = text.search(qv, k=100, filters=filters)
    assert {i for i, _ in res} == expected
    res2 = text.search(qv, k=100, allowed_ids=expected, filters={"price_max": 300_000})
    assert {i for i, _ in res2} == {i for i in expected if js.get(i).price <= 300_000}


def test_image_knn_returns_product_ids_matching_numpy(pg):
    img_pg, img_np = pg.layer[4], _numpy_twin(pg, "image")
    v = np.random.default_rng(0).random(174).astype(np.float32)
    got, want = img_pg.search(v, k=8), img_np.search(v, k=8)
    assert [i for i, _ in got][:3] == [i for i, _ in want][:3]
    assert all(i.startswith("P") for i, _ in got)
    assert dict(got)[want[0][0]] == pytest.approx(want[0][1], abs=1e-4)  # vector(174): float32, tight
    assert img_pg.search(v, k=8, allowed_ids={"P000001"})[0][0] == "P000001"


def test_degenerate_queries_like_numpy(pg):
    text = pg.layer[3]
    assert text.search(None) == [] and text.search(np.zeros(2048, dtype=np.float32)) == []
    assert text.search(np.ones(2048, dtype=np.float32), allowed_ids=set()) == []
    with pytest.raises(ValueError):
        text.search(np.ones(7, dtype=np.float32))


def test_hnsw_index_exists_and_is_used(pg):
    db = pg.layer.db
    idx = {r[0]: r[1] for r in db.query("SELECT indexname, indexdef FROM pg_indexes "
                                        "WHERE tablename IN ('product_text_embedding','product_image_embedding')")}
    assert any("USING hnsw" in d and "cosine_ops" in d for d in idx.values()) and len(
        [d for d in idx.values() if "USING hnsw" in d]) == 2
    with db.transaction():
        db.execute("SET LOCAL enable_seqscan = off")
        plan = "\n".join(r[0] for r in db.query(
            "EXPLAIN SELECT product_id FROM product_text_embedding ORDER BY embedding <=> "
            "(SELECT embedding FROM product_text_embedding LIMIT 1) LIMIT 5"))
    assert "product_text_embedding_hnsw" in plan


def test_embeddings_store_model_and_dimension_comes_from_encoder(pg):
    db = pg.layer.db
    assert db.query("SELECT DISTINCT model FROM product_text_embedding") == [("hashing",)]
    assert db.query("SELECT format_type(atttypid, atttypmod) FROM pg_attribute "
                    "WHERE attrelid = 'product_image_embedding'::regclass AND attname = 'embedding'") == [("vector(174)",)]
    text, db_ = pg.layer[3], pg.layer.db
    other = PgVectorIndex(db_, "text", "model-b")
    with pytest.raises(ValueError, match="dim"):
        other.add(["P000001"], np.ones((1, 8), dtype=np.float32))  # table is halfvec(2048)
    other.add(["P000001"], np.ones((1, 2048), dtype=np.float32))
    assert len(other) == 1 and len(text) == 59  # models live side by side
    db_.execute("DELETE FROM product_text_embedding WHERE model = 'model-b'")


# -- idempotent load, search log ---------------------------------------------------------------
def test_load_is_idempotent(pg):
    from db.load import load
    db = pg.layer.db
    tables = ["category", "brand", "product", "product_image", "product_attribute", "attribute", "attribute_value",
              '"order"', "order_item", "product_text_embedding", "product_image_embedding"]
    before = [db.query(f"SELECT count(*) FROM {t}")[0][0] for t in tables]
    assert load(pg.dsn, pg.dataset_dir)["products"] == 59
    assert [db.query(f"SELECT count(*) FROM {t}")[0][0] for t in tables] == before
    pg.layer[0].invalidate()
    assert pg.layer[0].all() == JsonProductRepository(pg.dataset_dir).all()


def test_search_log_repository(pg):
    log, db = pg.layer.search_log, pg.layer.db
    resp = pg.container.orchestrator.search(text="áo mùa đông", limit=3)
    qid = log.log(resp.representation, resp.results, 12.5, customer_id="C001")
    row = db.query("SELECT modality, raw_text, latency_ms, customer_id, representation->>'intent' "
                   "FROM search_query WHERE id = %s", [qid])[0]
    assert row == ("text", "áo mùa đông", 12.5, "C001", Intent.PRODUCT_SEARCH.value)
    rows = db.query("SELECT rank, product_id, final_score, scores->>'final' FROM search_result "
                    "WHERE query_id = %s ORDER BY rank", [qid])
    assert [r[0] for r in rows] == [1, 2, 3] and [r[1] for r in rows] == [r.product.id for r in resp.results]
    assert rows[0][2] == pytest.approx(resp.results[0].scores["final"])
    # no results (e.g. an order query) is fine too
    rep = QueryRepresentation(Modality.TEXT, raw_text="đơn 1")
    assert log.log(rep, [], 1.0) > qid
    assert db.query("SELECT count(*) FROM search_result WHERE query_id = %s", [qid])[0][0] == 3
