"""Unit tests of the SQL builders. No database needed."""
import numpy as np
import pytest

pytest.importorskip("psycopg")  # optional dependency (see db/README.md)
pytest.importorskip("pgvector")

from data.postgres.sql import (HARD_MIN_CONFIDENCE, HARD_SOURCES, build_find_ids, build_knn, column_type,
                               embedding_ddl)


def placeholders(sql: str) -> int:
    return sql.count("%s")


def test_column_type_picks_hnsw_compatible_type_from_dimension():
    assert column_type(174) == "vector(174)"
    assert column_type(1024) == "vector(1024)"
    assert column_type(2000) == "vector(2000)"
    assert column_type(2048) == "halfvec(2048)"  # HNSW on vector stops at 2000 dims
    for bad in (0, -1, 4001):
        with pytest.raises(ValueError):
            column_type(bad)


def test_embedding_ddl_uses_given_dimension_cosine_hnsw_and_model_column():
    text = " ".join(embedding_ddl("text", 1024))
    assert "vector(1024)" in text and "hnsw (embedding vector_cosine_ops)" in text
    assert "model TEXT NOT NULL" in text and "PRIMARY KEY (product_id, model)" in text
    image = " ".join(embedding_ddl("image", 3000))
    assert "halfvec(3000)" in image and "halfvec_cosine_ops" in image and "product_image(id)" in image


def test_no_filters_selects_everything():
    sql, params = build_find_ids({})
    assert "WHERE" not in sql and params == []


def test_find_ids_pushes_every_hard_filter_into_where():
    filters = {"category": ["ao-nam"], "price_min": 100, "price_max": 500_000, "brand": ["Uniqlo", "Zara"],
               "color": ["black"], "gender": ["male", "unisex"]}
    sql, params = build_find_ids(filters)
    assert sql.startswith("SELECT p.id FROM product p WHERE ")
    assert placeholders(sql) == len(params)
    assert "c.path LIKE r.path || %s" in sql                      # materialized-path subtree
    assert "p.price >= %s" in sql and "p.price <= %s" in sql
    assert sql.count("EXISTS") == 3                                # category + two attribute codes
    assert ["uniqlo", "zara"] in params                            # brands compared lowercased
    assert ["black"] in params and ["male", "unisex"] in params
    assert HARD_SOURCES in params and HARD_MIN_CONFIDENCE in params


def test_find_ids_ignores_empty_or_unknown_shapes_like_the_json_repo():
    sql, params = build_find_ids({"color": [], "category": None, "brand": [], "sort": "price_asc", "price_min": None})
    assert "WHERE" not in sql and params == []
    sql, params = build_find_ids({"price_min": 0})  # 0 is a real bound
    assert "p.price >= %s" in sql and params == [0]


def test_knn_text_has_filters_in_same_statement():
    q = np.array([1.0, 0.0])
    sql, params = build_knn("text", "vector(2)", q, "m1", 7, allowed_ids={"a", "b"}, filters={"color": ["black"]})
    assert placeholders(sql) == len(params)
    assert "<=> %s::vector(2)" in sql and "LIMIT %s" in sql and "e.model = %s" in sql
    assert "e.product_id = ANY(%s)" in sql and "SELECT p.id FROM product p WHERE" in sql
    assert params[1] == "m1" and params[-1] == 7 and params[0] is q and params[-2] is q
    assert sorted(params[2]) == ["a", "b"]


def test_knn_image_joins_primary_image_and_casts_halfvec():
    sql, params = build_knn("image", "halfvec(2048)", np.zeros(2048), "m", 3)
    assert "JOIN product_image pi ON pi.id = e.product_image_id" in sql and "pi.product_id AS product_id" in sql
    assert "::halfvec(2048)" in sql and placeholders(sql) == len(params) == 4
    assert "ANY" not in sql  # no restriction requested


def test_load_module_does_not_pull_application_layer_at_import():
    import ast
    import pathlib
    import db.load as load
    mods = {n.module for n in ast.walk(ast.parse(pathlib.Path(load.__file__).read_text())) if
            isinstance(n, ast.ImportFrom) and n.col_offset == 0}
    assert not any(m and m.startswith("application") for m in mods)  # lazily imported inside functions
