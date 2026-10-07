import os
import sys
from pathlib import Path

import pytest

FIXTURES = Path(__file__).resolve().parent / "fixtures"
# Tests run on the small synthetic catalog in fixtures/, not on the crawled data in dataset/.
os.environ["DATASET_DIR"] = str(FIXTURES / "dataset")
sys.path.insert(0, str(FIXTURES))

from container import Settings, build_container  # noqa: E402


@pytest.fixture(scope="session")
def container():
    return build_container(Settings(profile="full"))


@pytest.fixture(scope="session")
def search(container):
    return container.orchestrator.search


@pytest.fixture(scope="session")
def parser(container):
    return container.queries.parser
