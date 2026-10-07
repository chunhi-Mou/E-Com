"""Request-scoped helpers shared by routers."""
from __future__ import annotations

from fastapi import Request

from presentation.api.serializers import Serializer


def get_container(request: Request):
    return request.app.state.container


def get_serializer(request: Request) -> Serializer:
    base = request.app.state.public_base_url or str(request.base_url)
    return Serializer(request.app.state.container.catalog, base)
