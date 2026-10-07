-- PostgreSQL 16 + pgvector schema (02-search-design 5.2, only the tables the code uses).
-- Idempotent: every statement is IF NOT EXISTS. The two embedding tables are NOT here:
-- their vector dimension comes from the encoder, so PgVectorIndex creates them on first add().

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Category tree with a materialized path ("/thoi-trang-nam/ao-nam/ao-len-nam").
-- Subtree = path = X OR path LIKE X || '/%'. Slugs may not contain LIKE wildcards.
CREATE TABLE IF NOT EXISTS category (
    id        SERIAL PRIMARY KEY,
    parent_id INT REFERENCES category(id) ON DELETE SET NULL,
    slug      TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    name      TEXT NOT NULL,
    synonyms  TEXT[] NOT NULL DEFAULT '{}',
    path      TEXT NOT NULL,
    ord       INT NOT NULL DEFAULT 0            -- dataset order, keeps list results identical to JSON
);
CREATE INDEX IF NOT EXISTS category_path_idx ON category (path text_pattern_ops);

CREATE TABLE IF NOT EXISTS brand (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS product (
    id             TEXT PRIMARY KEY,            -- dataset id, e.g. P000001
    ord            INT NOT NULL DEFAULT 0,
    source         TEXT NOT NULL DEFAULT 'seed',
    source_id      TEXT,
    source_url     TEXT,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    brand_id       INT REFERENCES brand(id),
    category_id    INT NOT NULL REFERENCES category(id),
    price          BIGINT NOT NULL,             -- VND
    original_price BIGINT,
    stock          INT NOT NULL DEFAULT 0,
    rating_avg     NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count   INT NOT NULL DEFAULT 0,
    sold_count     INT NOT NULL DEFAULT 0,
    search_document          TEXT NOT NULL DEFAULT '',   -- text fed to the keyword index
    search_document_unaccent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS product_category_price_idx ON product (category_id, price);
CREATE INDEX IF NOT EXISTS product_ord_idx ON product (ord);
CREATE INDEX IF NOT EXISTS product_search_trgm_idx ON product USING gin (search_document_unaccent gin_trgm_ops);

CREATE TABLE IF NOT EXISTS product_image (
    id         BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,                   -- path relative to backend/dataset/
    position   INT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,  -- the image that is embedded
    UNIQUE (product_id, position)
);

-- Controlled vocabulary
CREATE TABLE IF NOT EXISTS attribute (
    id                 SERIAL PRIMARY KEY,
    code               TEXT NOT NULL UNIQUE,
    name               TEXT NOT NULL,
    is_hard_filterable BOOLEAN NOT NULL DEFAULT FALSE,
    position           INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attribute_value (
    id           SERIAL PRIMARY KEY,
    attribute_id INT NOT NULL REFERENCES attribute(id) ON DELETE CASCADE,
    code         TEXT NOT NULL,
    label        TEXT NOT NULL,
    synonyms     TEXT[] NOT NULL DEFAULT '{}',
    also_match   TEXT[] NOT NULL DEFAULT '{}',  -- e.g. male also matches unisex (not in 5.2, needed by Vocabulary)
    position     INT NOT NULL DEFAULT 0,
    UNIQUE (attribute_id, code)
);

-- Attributes and tags of a product. is_tag separates Product.tags from Product.attributes.
-- Hard filters only trust source IN ('scraped','manual') or confidence >= 0.8.
CREATE TABLE IF NOT EXISTS product_attribute (
    product_id         TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    attribute_value_id INT NOT NULL REFERENCES attribute_value(id) ON DELETE CASCADE,
    is_tag             BOOLEAN NOT NULL DEFAULT FALSE,
    source             TEXT NOT NULL DEFAULT 'scraped'
                       CHECK (source IN ('scraped', 'llm_text', 'vlm_image', 'manual')),
    confidence         NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    position           INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, attribute_value_id, is_tag)
);
CREATE INDEX IF NOT EXISTS product_attribute_value_idx ON product_attribute (attribute_value_id);

-- Orders
CREATE TABLE IF NOT EXISTS "order" (
    id             SERIAL PRIMARY KEY,
    order_code     TEXT NOT NULL UNIQUE,
    customer_id    TEXT NOT NULL,
    status         TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED')),
    total          BIGINT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL,        -- used for ordering
    created_at_iso TEXT NOT NULL                -- original string, returned as-is (Order.created_at is a str)
);
CREATE INDEX IF NOT EXISTS order_customer_idx ON "order" (customer_id, created_at DESC);
CREATE TABLE IF NOT EXISTS order_item (
    order_id   INT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    position   INT NOT NULL,
    product_id TEXT NOT NULL,                   -- no FK: an order may outlive its catalog entry
    quantity   INT NOT NULL,
    unit_price BIGINT NOT NULL,
    PRIMARY KEY (order_id, position)
);

-- Search log (output of the system)
CREATE TABLE IF NOT EXISTS search_query (
    id             BIGSERIAL PRIMARY KEY,
    customer_id    TEXT,
    session_id     TEXT,
    modality       TEXT NOT NULL,
    raw_text       TEXT NOT NULL DEFAULT '',
    representation JSONB NOT NULL,
    latency_ms     DOUBLE PRECISION,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS search_result (
    query_id    BIGINT NOT NULL REFERENCES search_query(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    rank        INT NOT NULL,
    scores      JSONB NOT NULL,
    final_score DOUBLE PRECISION,
    PRIMARY KEY (query_id, rank)
);
