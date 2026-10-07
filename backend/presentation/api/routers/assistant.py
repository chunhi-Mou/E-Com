from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from presentation.api.deps import get_container

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ReplyBody(BaseModel):
    representation: dict[str, Any]
    total: int = Field(0, ge=0)
    top_names: list[str] = Field(default_factory=list, max_length=10)


@router.post("/reply")
def reply(body: ReplyBody, request: Request, c=Depends(get_container)):
    r = c.assistant.reply(body.representation, body.total, body.top_names)
    audio_url = None
    if r.audio_file:
        base = (request.app.state.public_base_url or str(request.base_url)).rstrip("/")
        audio_url = f"{base}/static/tts/{r.audio_file}"
    return {"text": r.text, "audio_url": audio_url}
