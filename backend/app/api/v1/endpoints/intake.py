import logging
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from app.core.deps import get_intake_user
from pydantic import BaseModel

from app.schemas.case import (
    SpeechTranscribeResponse,
    TranslationResponse,
    ReportOCRResponse,
)
from app.services.speech_service import speech_service
from app.services.translation_service import translation_service
from app.services.ocr_service import ocr_service

logger = logging.getLogger("clinova")
router = APIRouter(dependencies=[Depends(get_intake_user)])


class TranslationInput(BaseModel):
    text: str
    source_language: str = "or"


@router.post("/speech", response_model=SpeechTranscribeResponse)
async def process_speech_audio(
    file: Optional[UploadFile] = File(None),
    language_hint: str = Form("en"),
):
    """Transcribes patient audio speech with multi-language demo fallback (Odia, Hindi, English)."""
    file_bytes = b""
    filename = "recording.wav"
    if file:
        file_bytes = await file.read()
        filename = file.filename or filename

    result = await speech_service.transcribe_audio(
        audio_bytes=file_bytes,
        filename=filename,
        language_hint=language_hint,
    )
    return result


@router.post("/translate", response_model=TranslationResponse)
async def normalize_regional_text(input_data: TranslationInput):
    """Normalizes regional language symptoms (Odia/Hindi) to clinical English while preserving original text."""
    if not input_data.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    result = await translation_service.translate_and_normalize(
        text=input_data.text,
        source_language=input_data.source_language,
    )
    return result


@router.post("/ocr", response_model=ReportOCRResponse)
async def process_medical_report(
    file: Optional[UploadFile] = File(None),
):
    """Extracts lab report parameters using OCR with confidence metrics and reviewer verification status."""
    file_bytes = b""
    filename = "report_sample.png"
    if file:
        file_bytes = await file.read()
        filename = file.filename or filename

    result = await ocr_service.process_report(
        file_bytes=file_bytes,
        filename=filename,
    )
    return result