from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from presentation.api.deps import get_container

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/suggest")
def suggest(q: str = Query("", max_length=100), c=Depends(get_container)):
    return {"suggestions": c.suggestions.suggest(q) if c.suggestions else []}
