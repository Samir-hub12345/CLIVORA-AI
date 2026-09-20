from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.document import DocumentType, DocumentStatus


class DocumentResponse(BaseModel):
    id: str
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    case_id: Optional[str] = None
    facility_id: Optional[str] = None
    document_type: DocumentType
    filename: str
    mime_type: str
    file_size_bytes: int
    checksum_sha256: str
    storage_key: str
    storage_provider: str
    status: DocumentStatus
    uploaded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentResponse]
