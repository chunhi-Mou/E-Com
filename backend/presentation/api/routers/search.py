from __future__ import annotations

import io
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from presentation.api.deps import get_container, get_serializer
from presentation.api.serializers import Serializer

router = APIRouter(prefix="/api/search", tags=["search"])
Sort = Literal["relevance", "price_asc", "price_desc", "best_selling"]


class Filters(BaseModel):
    category: str | list[str] | None = None
    price_min: int | None = Field(None, ge=0)
    price_max: int | None = Field(None, ge=0)
    sort: Sort = "relevance"


class SearchBody(BaseModel):
    text: str = ""
    modality: Literal["text", "voice"] = "text"
    limit: int = Field(10, ge=1, le=100)
    filters: Filters | None = None


@router.post("")
def search(body: SearchBody, c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    if not body.text.strip():
        raise HTTPException(422, "text must not be empty")
    filters = body.filters.model_dump(exclude_none=True) if body.filters else None
    resp = c.orchestrator.search(text=body.text, modality=body.modality, limit=body.limit, filters=filters)
    return ser.search_response(resp)


@router.post("/image")
async def search_image(image: UploadFile = File(...), text: str | None = Form(None), limit: int = Form(10),
                       c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    data = await image.read()
    try:
        Image.open(io.BytesIO(data)).verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "uploaded file is not a valid image")
    resp = c.orchestrator.search(text=text or None, image=data, limit=max(1, min(limit, 100)))
    return ser.search_response(resp)
