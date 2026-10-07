import pytest

from container import Settings, build_container


@pytest.fixture(scope="session")
def container():
    return build_container(Settings(profile="full"))


@pytest.fixture(scope="session")
def search(container):
    return container.orchestrator.search


@pytest.fixture(scope="session")
def parser(container):
    return container.queries.parser
