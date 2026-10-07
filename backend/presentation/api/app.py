"""FastAPI entry point: `uvicorn presentation.api.app:app`."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from presentation.api.routers import assistant, catalog, orders, search, speech, suggest


def create_app(container=None) -> FastAPI:
    if container is None:
        from container import build_container  # composition root (lazy: only when no container is injected)
        container = build_container()
    app = FastAPI(title="Multimodal E-Commerce Search API")
    app.state.container = container
    app.state.public_base_url = os.environ.get("PUBLIC_BASE_URL")
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])
    for r in (search.router, suggest.router, speech.router, assistant.router, catalog.router, orders.router):
        app.include_router(r)
    if getattr(container, "synthesizer", None) is not None and container.tts_dir is not None:
        container.tts_dir.mkdir(parents=True, exist_ok=True)
        app.mount("/static/tts", StaticFiles(directory=str(container.tts_dir)), name="tts")  # before /static
    app.mount("/static", StaticFiles(directory=str(container.dataset_dir)), name="static")
    return app


app = create_app()
