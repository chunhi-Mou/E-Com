"""Pure SQL builders (no DB access), so they can be unit-tested without Postgres."""
from __future__ import annotations

from typing import Any, Collection, Literal

Kind = Literal["text", "image"]

# Default hard-filter policy (02-search-design 5.2): trusted sources, or a confident machine label.
HARD_SOURCES = ["scraped", "manual"]
HARD_MIN_CONFIDENCE = 0.8

HNSW_MAX_DIM = 2000        # pgvector: HNSW on `vector` is limited to 2000 dims
HALFVEC_MAX_DIM = 4000     # ... and to 4000 on `halfvec`

TABLES = {
    "text": "product_text_embedding",
    "image": "product_image_embedding",
}


def column_type(dim: int) -> str:
    """vector(n) when HNSW supports it, else halfvec(n) (e.g. the 2048-dim hashing encoder)."""
    if dim <= 0 or dim > HALFVEC_MAX_DIM:
        raise ValueError(f"unsupported embedding dimension {dim} (HNSW max {HALFVEC_MAX_DIM})")
    return f"vector({dim})" if dim <= HNSW_MAX_DIM else f"halfvec({dim})"


def embedding_ddl(kind: Kind, dim: int) -> list[str]:
    """CREATE statements for one embedding table; the dimension comes from the encoder at load time."""
    col = column_type(dim)
    ops = "vector_cosine_ops" if col.startswith("vector") else "halfvec_cosine_ops"
    table = TABLES[kind]
    if kind == "text":
        key = "product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE"
        pk = "product_id"
    else:
        key = "product_image_id BIGINT NOT NULL REFERENCES product_image(id) ON DELETE CASCADE"
        pk = "product_image_id"
    return [
        f"CREATE TABLE IF NOT EXISTS {table} ({key}, model TEXT NOT NULL, embedding {col} NOT NULL, "
        f"PRIMARY KEY ({pk}, model))",
        f"CREATE INDEX IF NOT EXISTS {table}_hnsw ON {table} USING hnsw (embedding {ops})",
    ]


def _values(filters: dict[str, Any], key: str) -> list[str]:
    v = filters.get(key)
    return list(v) if isinstance(v, (list, tuple, set)) and v else []


def build_product_conditions(filters: dict[str, Any], alias: str = "p") -> tuple[list[str], list[Any]]:
    """Hard filters as SQL conditions on product `alias`; same semantics as JsonProductRepository.find_ids."""
    conds: list[str] = []
    params: list[Any] = []
    cats = _values(filters, "category")
    if cats:
        # materialized path: the subtree of a category is every row whose path starts with its path
        conds.append("EXISTS (SELECT 1 FROM category r JOIN category c "
                     "ON (c.path = r.path OR c.path LIKE r.path || %s) "
                     f"WHERE r.slug = ANY(%s) AND c.id = {alias}.category_id)")
        params += ["/%", cats]
    if filters.get("price_min") is not None:
        conds.append(f"{alias}.price >= %s")
        params.append(filters["price_min"])
    if filters.get("price_max") is not None:
        conds.append(f"{alias}.price <= %s")
        params.append(filters["price_max"])
    brands = [b.lower() for b in _values(filters, "brand")]
    if brands:
        conds.append(f"{alias}.brand_id IN (SELECT id FROM brand WHERE lower(name) = ANY(%s))")
        params.append(brands)
    for code, raw in filters.items():
        if code in ("category", "brand") or not isinstance(raw, (list, tuple, set)) or not raw:
            continue
        # one EXISTS per attribute code (AND across codes, OR within the values of a code)
        conds.append(f"EXISTS (SELECT 1 FROM product_attribute pa "
                     "JOIN attribute_value av ON av.id = pa.attribute_value_id "
                     "JOIN attribute att ON att.id = av.attribute_id "
                     f"WHERE pa.product_id = {alias}.id AND att.code = %s AND av.code = ANY(%s) "
                     "AND (pa.source = ANY(%s) OR pa.confidence >= %s))")
        params += [code, list(raw), HARD_SOURCES, HARD_MIN_CONFIDENCE]
    return conds, params


def build_find_ids(filters: dict[str, Any]) -> tuple[str, list[Any]]:
    conds, params = build_product_conditions(filters)
    where = f" WHERE {' AND '.join(conds)}" if conds else ""
    return f"SELECT p.id FROM product p{where}", params


def build_knn(kind: Kind, col_type: str, vector: Any, model: str, k: int,
              allowed_ids: Collection[str] | None = None,
              filters: dict[str, Any] | None = None) -> tuple[str, list[Any]]:
    """Cosine kNN with the hard filters in the same statement (filtered vector search).

    The HNSW index is walked in the inner query; the outer ORDER BY re-sorts because
    iterative scans (relaxed_order) may return rows slightly out of order.
    """
    table = TABLES[kind]
    if kind == "text":
        from_, pid = f"{table} e", "e.product_id"
    else:
        from_, pid = f"{table} e JOIN product_image pi ON pi.id = e.product_image_id", "pi.product_id"
    q = f"%s::{col_type}"
    where, params = ["e.model = %s"], [vector, model]
    if allowed_ids is not None:
        where.append(f"{pid} = ANY(%s)")
        params.append(list(allowed_ids))
    if filters:
        conds, fparams = build_product_conditions(filters)
        if conds:
            where.append(f"{pid} IN (SELECT p.id FROM product p WHERE {' AND '.join(conds)})")
            params += fparams
    sql = (f"WITH hits AS MATERIALIZED (SELECT {pid} AS product_id, e.embedding <=> {q} AS dist "
           f"FROM {from_} WHERE {' AND '.join(where)} ORDER BY e.embedding <=> {q} LIMIT %s) "
           "SELECT product_id, 1 - dist AS score FROM hits ORDER BY dist, product_id")
    # placeholder order: select-list vector, model, allowed/filters, order-by vector, limit
    return sql, [*params, vector, k]
