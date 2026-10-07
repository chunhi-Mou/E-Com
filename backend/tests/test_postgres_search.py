"""The existing search / order / image assertions, run against the Postgres data layer.

The test functions are imported from the JSON-backed test modules; the `container` and `search`
fixtures below shadow the conftest ones, so each assertion runs on Postgres + pgvector instead.
"""
import pytest

pytest.importorskip("psycopg")  # optional dependency (see db/README.md)
pytest.importorskip("pgvector")
from test_image import *   # noqa: F401,F403
from test_orders import *  # noqa: F401,F403
from test_postgres_support import requires_pg, state
from test_search import *  # noqa: F401,F403

pytestmark = requires_pg


@pytest.fixture(scope="module")
def container():
    return state().container


@pytest.fixture(scope="module")
def search(container):
    return container.orchestrator.search


def test_pg_results_match_json_results(container):
    """Same ranked product ids as the JSON/numpy stack for a spread of queries."""
    from container import Settings, build_container
    json_search = build_container(Settings(profile="full")).orchestrator.search
    pg_search = container.orchestrator.search
    for text in ("áo mùa đông", "giày trắng", "áo thun dưới 250k", "đồ đi biển", "nồi chiên không dầu",
                 "headphones under 6 million", "giay chay bo", "áo len màu xanh lá dưới 100k"):
        a, b = json_search(text=text, limit=10), pg_search(text=text, limit=10)
        assert [r.product.id for r in a.results][:5] == [r.product.id for r in b.results][:5], text
        assert a.relaxed_filters == b.relaxed_filters and a.total == b.total, text
