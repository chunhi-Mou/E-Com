# PostgreSQL + pgvector (optional vector-database mode)

A second implementation of the Data layer (Repository pattern).
The default mode (`python main.py`, JSON + numpy) needs none of this.

## Run

```bash
docker compose up -d --wait                       # repo root: pgvector/pgvector:pg16, user/pass/db = ecom
.venv/bin/pip install "psycopg[binary]" pgvector  # not yet in requirements.txt
.venv/bin/python -m db.load                       # schema + dataset + embeddings (idempotent; --reset to rebuild)
PG_DSN=postgresql://ecom:ecom@localhost:5432/ecom .venv/bin/python -m pytest tests/test_postgres_*.py
```

Without `PG_DSN` the integration tests skip; the SQL-builder unit tests always run.
The test role needs `CREATEDB` (each run uses a throw-away database).

## Wiring

```python
from data.postgres import build_postgres_data_layer
layer = build_postgres_data_layer(dsn)
products, orders, vocabulary_repo, text_index, image_index = layer   # drop-in for Json*/NumpyVectorIndex
layer.search_log.log(representation, results, latency_ms)           # optional search log
```

`SearchService.build_index()` still works unchanged: it re-encodes and upserts the same vectors
(needed anyway to fit the query-side text encoder). Use the same model names as the loader
(defaults `hashing` / `color_histogram`, see `--text-model`, `--image-model`).

## Schema (`schema.sql`)

| Table | Purpose |
|---|---|
| `category` | tree with materialized `path`; subtree = `path = X OR path LIKE X || '/%'` |
| `brand`, `product`, `product_image` | catalog; `product.search_document*` hold the keyword-index text |
| `attribute`, `attribute_value` | controlled vocabulary (synonyms, `also_match`) |
| `product_attribute` | value per product with `source` and `confidence`; `is_tag` separates tags from attributes |
| `product_text_embedding`, `product_image_embedding` | `(id, model, embedding)`, HNSW cosine; created by `PgVectorIndex` |
| `"order"`, `order_item` | orders |
| `search_query`, `search_result` | search log |

- The embedding dimension is read from the encoder output at load time. `vector(n)` is used up to 2000 dims;
  above that (the 2048-dim hashing encoder) the column is `halfvec(n)`, because HNSW does not index
  `vector` beyond 2000 dims. Changing encoder dimension needs `--reset`.
- Hard filters (`find_ids`) and the kNN query share one SQL builder (`data/postgres/sql.py`), so
  `PgVectorIndex.search(..., filters=...)` filters inside the vector query. The session sets
  `hnsw.iterative_scan = relaxed_order` (pgvector 0.8+) so selective filters still return k rows.
- Hard filters trust `source IN ('scraped','manual')` or `confidence >= 0.8`; the loader writes confidence 1.0.

## Differences from the JSON implementation

- Product/category entities are cached in-process (`cache_ttl`, default 300 s) because `SearchService`
  calls `get()` per candidate. `find_ids`, `list_by_category`, `subtree_slugs` always query SQL.
  Call `PostgresProductRepository.invalidate()` after reloading data.
- Vector scores are cosine similarities, identical in meaning; text vectors are stored as `halfvec`
  so scores differ from numpy by about 1e-3. Image vectors (`vector(174)`) match to float32.
- `PgVectorIndex.add` is an upsert (numpy appends); image vectors attach to the primary image.
- `load.py` does not delete rows that disappeared from the dataset unless `--reset`.
