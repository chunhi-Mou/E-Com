from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from application.adapters.http import RemoteError
from presentation.api.deps import get_container

router = APIRouter(prefix="/api/speech", tags=["speech"])
MAX_AUDIO_BYTES = 25 * 1024 * 1024


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), lang: Literal["vi", "en"] | None = Form(None),
                     c=Depends(get_container)):
    data = await audio.read()
    if not data:
        raise HTTPException(400, "empty audio file")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "audio file too large")
    try:
        t = c.orchestrator.stt.transcribe(data, lang)
    except NotImplementedError:
        raise HTTPException(501, "speech-to-text adapter not configured (set STT_ADAPTER=elevenlabs); "
                                 "the web client can use the browser Web Speech API instead")
    except RemoteError as e:
        raise HTTPException(502, f"speech provider error: {e}")
    return {"text": t.text, "language": t.language if t.language in ("vi", "en") else "vi"}
