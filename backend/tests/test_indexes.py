import numpy as np

from data.keyword_index import Bm25KeywordIndex
from data.vector_index import NumpyVectorIndex


def test_bm25_ranks_and_ignores_accents():
    idx = Bm25KeywordIndex()
    idx.build({"a": "Áo len cổ lọ giữ ấm", "b": "Áo thun cotton mùa hè", "c": "Nồi chiên không dầu"})
    assert idx.search([("ao len co lo", 1.0)])[0][0] == "a"
    assert idx.search([("mùa hè", 1.0)])[0][0] == "b"
    assert idx.search([("xyz", 1.0)]) == []
    assert [i for i, _ in idx.search([("áo", 1.0)], allowed_ids={"b"})] == ["b"]


def test_bm25_query_weights():
    idx = Bm25KeywordIndex()
    idx.build({"a": "alpha", "b": "beta"})
    out = dict(idx.search([("alpha", 1.0), ("beta", 0.5)]))
    assert out["a"] > out["b"]


def test_vector_index_cosine_and_filter():
    idx = NumpyVectorIndex()
    idx.add(["x", "y", "z"], np.array([[1, 0], [0, 1], [1, 1]], dtype=float))
    res = idx.search(np.array([1.0, 0.1]), k=2)
    assert res[0][0] == "x"
    assert [i for i, _ in idx.search(np.array([1.0, 0.0]), allowed_ids={"y", "z"})] == ["z", "y"]


def test_hashing_encoder_tolerates_missing_accents(container):
    enc = container.queries.text_encoder
    a, b, c = enc.encode(["áo len cổ lọ", "ao len co lo", "nồi chiên không dầu"])
    assert a @ b > 0.9 > a @ c
