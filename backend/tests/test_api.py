import pytest
from fastapi.testclient import TestClient

from presentation.api.app import create_app

PRODUCT_KEYS = {"id", "name", "description", "brand", "category", "category_path", "price", "original_price",
                "stock", "rating", "rating_count", "sold_count", "attributes", "tags", "images"}
REP_KEYS = {"modality", "raw_text", "normalized_text", "language", "intent", "hard_filters", "soft_preferences",
            "expansion_terms", "parser"}
SEARCH_KEYS = {"representation", "results", "total", "relaxed_filters", "order", "latency_ms"}
ORDER_KEYS = {"order_code", "customer_id", "status", "created_at", "total", "items"}


@pytest.fixture(scope="module")
def client(container):
    return TestClient(create_app(container))


def check_product(p):
    assert PRODUCT_KEYS <= set(p)
    assert all(i.startswith("http") and "/static/images/" in i for i in p["images"])
    assert all(set(c) == {"slug", "name"} for c in p["category_path"])
    assert p["category_path"][-1]["slug"] == p["category"]


def test_search_response_shape(client):
    r = client.post("/api/search", json={"text": "áo mùa đông", "modality": "text", "limit": 4})
    assert r.status_code == 200
    j = r.json()
    assert SEARCH_KEYS <= set(j)
    assert REP_KEYS <= set(j["representation"])
    assert j["order"] is None and len(j["results"]) == 4 and j["total"] >= 4
    for item in j["results"]:
        assert set(item) == {"product", "rank", "scores"}
        assert set(item["scores"]) == {"text", "image", "business", "soft", "final"}
        check_product(item["product"])


def test_search_filters_and_sort(client):
    r = client.post("/api/search", json={"text": "áo", "limit": 5, "filters": {
        "category": "ao-nu", "price_max": 500000, "sort": "price_desc"}})
    prices = [x["product"]["price"] for x in r.json()["results"]]
    assert prices == sorted(prices, reverse=True) and all(p <= 500000 for p in prices)


def test_search_validation(client):
    assert client.post("/api/search", json={"text": "", "modality": "text"}).status_code == 422
    assert client.post("/api/search", json={"text": "x", "filters": {"sort": "bogus"}}).status_code == 422


def test_search_order_intent(client):
    j = client.post("/api/search", json={"text": "đơn 20261001"}).json()
    assert j["results"] == [] and ORDER_KEYS <= set(j["order"])
    assert j["order"]["order_code"] == "20261001"
    assert set(j["order"]["items"][0]) == {"product", "quantity", "unit_price"}
    check_product(j["order"]["items"][0]["product"])


def test_search_image_upload(client):
    from pathlib import Path
    img = Path(__file__).resolve().parent.parent / "eval" / "query_images" / "navy_sweater.jpg"
    with img.open("rb") as f:
        r = client.post("/api/search/image", files={"image": ("q.jpg", f, "image/jpeg")}, data={"text": ""})
    assert r.status_code == 200
    j = r.json()
    assert SEARCH_KEYS <= set(j) and j["representation"]["modality"] == "image"
    assert client.post("/api/search/image", files={"image": ("q.txt", b"nope", "text/plain")}).status_code == 400


def test_products(client):
    j = client.get("/api/products", params={"category": "ao-nam", "page": 1, "page_size": 3, "sort": "price_asc"}).json()
    assert set(j) == {"items", "total"} and len(j["items"]) == 3 and j["total"] > 3
    prices = [p["price"] for p in j["items"]]
    assert prices == sorted(prices)
    check_product(j["items"][0])
    pid = j["items"][0]["id"]
    assert client.get(f"/api/products/{pid}").json()["id"] == pid
    assert client.get("/api/products/NOPE").status_code == 404
    assert client.get("/api/products", params={"sort": "bogus"}).status_code == 422


def test_categories(client):
    cats = client.get("/api/categories").json()
    assert all(set(c) == {"slug", "parent", "name"} for c in cats)
    assert len(cats) >= 6


def test_orders(client):
    assert ORDER_KEYS <= set(client.get("/api/orders/20261001").json())
    assert client.get("/api/orders/00000000").status_code == 404
    assert client.get("/api/orders/latest", params={"customer_id": "C001"}).json()["order_code"] == "20261005"
    assert client.get("/api/orders/latest", params={"customer_id": "nobody"}).status_code == 404


def test_orders_list(client):
    codes = lambda **params: [o["order_code"] for o in client.get("/api/orders", params=params).json()]
    assert codes(customer_id="C001") == ["20261005", "20261001", "20260928", "20260915"]
    assert codes(customer_id="C001", status="SHIPPING") == ["20261001"]
    assert codes(customer_id="nobody") == []
    assert codes()[0] == "20261005"  # default customer is C001
    assert all(ORDER_KEYS <= set(o) for o in client.get("/api/orders").json())
    assert client.get("/api/orders", params={"status": "BOGUS"}).status_code == 422


def test_cors_and_static(client):
    r = client.options("/api/search", headers={"Origin": "http://localhost:3000",
                                               "Access-Control-Request-Method": "POST"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert client.get("/static/images/P000001_0.jpg").status_code == 200
