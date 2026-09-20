from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.document import DocumentType, DocumentStatus, ScanStatus, ArtifactType


class DocumentResponse(BaseModel):
    id: str
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    consultation_id: Optional[str] = None
    case_id: Optional[str] = None
    facility_id: Optional[str] = None
    document_type: DocumentType
    filename: str
    safe_filename: Optional[str] = None
    mime_type: str
    detected_mime_type: Optional[str] = None
    file_size_bytes: int
    checksum_sha256: str
    checksum_algorithm: str = "SHA-256"
    storage_key: str
    storage_provider: str
    storage_bucket: str = "medical-documents"
    status: DocumentStatus
    scan_status: str = "clean"
    scan_details: Optional[str] = None
    quarantined_at: Optional[datetime] = None
    version: int = 1
    parent_document_id: Optional[str] = None
    is_current_version: bool = True
    deleted_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentArtifactResponse(BaseModel):
    id: str
    document_id: str
    artifact_type: str
    filename: str
    mime_type: str
    file_size_bytes: int
    checksum_sha256: str
    storage_key: str
    storage_provider: str = "local_object_store"
    content_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    artifacts: List[DocumentArtifactResponse] = []


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentResponse]


class PresignedUrlResponse(BaseModel):
    document_id: str
    download_url: str
    token: str
    expires_at: int
    ttl_seconds: int


class DocumentArtifactCreate(BaseModel):
    artifact_type: str
    filename: str
    mime_type: str = "application/json"
    content_text: Optional[str] = None
