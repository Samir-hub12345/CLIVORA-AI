import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_client_ip
from app.db.session import get_db
from app.models.document import Document, DocumentType, DocumentStatus
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services.storage import storage_service
from app.services.audit import AuditService

logger = logging.getLogger("clinova")
router = APIRouter()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(DocumentType.PATHOLOGY_REPORT),
    patient_id: Optional[str] = Form(None),
    case_id: Optional[str] = Form(None),
    encounter_id: Optional[str] = Form(None),
    facility_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Securely uploads an original medical document to object storage and preserves metadata in PostgreSQL."""
    file_bytes = await file.read()
    filename = file.filename or "uploaded_document"
    mime_type = file.content_type or "application/octet-stream"

    # Validate file (MIME, size, checksum)
    checksum = storage_service.validate_file(
        filename=filename,
        file_bytes=file_bytes,
        mime_type=mime_type,
    )

    doc_id = str(uuid.uuid4())
    storage_key = storage_service.generate_storage_key(
        document_id=doc_id,
        original_filename=filename,
        patient_id=patient_id,
        facility_id=facility_id,
    )

    # Save to object store
    storage_service.save_file(storage_key=storage_key, file_bytes=file_bytes)

    # Save metadata in PostgreSQL
    doc_record = Document(
        id=doc_id,
        patient_id=patient_id,
        encounter_id=encounter_id,
        case_id=case_id,
        facility_id=facility_id,
        document_type=document_type,
        filename=filename,
        mime_type=mime_type,
        file_size_bytes=len(file_bytes),
        checksum_sha256=checksum,
        storage_key=storage_key,
        storage_provider="local_object_store",
        status=DocumentStatus.STORED,
        uploaded_by=current_user.id,
    )
    db.add(doc_record)
    await db.commit()
    await db.refresh(doc_record)

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_UPLOADED",
        resource_type="DOCUMENT",
        resource_id=doc_record.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Document uploaded: '{filename}' ({len(file_bytes)} bytes, SHA-256: {checksum[:12]}...)",
    )

    return doc_record


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    patient_id: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List documents with authorization filtering."""
    stmt = select(Document)

    # Patient isolation: Patients can only see their own documents
    if current_user.role == UserRole.PATIENT:
        # Lookup patient records belonging to current user
        pat_stmt = select(Patient.id).where(Patient.email == current_user.email)
        user_patient_ids = (await db.execute(pat_stmt)).scalars().all()
        stmt = stmt.where(Document.patient_id.in_(user_patient_ids))
    elif patient_id:
        stmt = stmt.where(Document.patient_id == patient_id)

    if case_id:
        stmt = stmt.where(Document.case_id == case_id)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(desc(Document.created_at)).offset(skip).limit(limit)
    items = (await db.execute(stmt)).scalars().all()

    return DocumentListResponse(total=total, items=list(items))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document_metadata(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve document metadata with resource-level authorization."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Patient role authorization check
    if current_user.role == UserRole.PATIENT:
        pat_stmt = select(Patient).where(Patient.id == doc.patient_id)
        patient = (await db.execute(pat_stmt)).scalar_one_or_none()
        if not patient or patient.email != current_user.email:
            raise HTTPException(status_code=403, detail="Access denied to this document.")

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_METADATA_READ",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Viewed metadata for document '{doc.filename}'",
    )

    return doc


@router.get("/{document_id}/download")
async def download_document_file(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Downloads original binary file with resource-level authorization and audit trail."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Patient role authorization check
    if current_user.role == UserRole.PATIENT:
        pat_stmt = select(Patient).where(Patient.id == doc.patient_id)
        patient = (await db.execute(pat_stmt)).scalar_one_or_none()
        if not patient or patient.email != current_user.email:
            raise HTTPException(status_code=403, detail="Access denied to download this document.")

    file_bytes = storage_service.get_file(doc.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Underlying binary object file not found in storage.")

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_DOWNLOADED",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Downloaded binary file '{doc.filename}' ({len(file_bytes)} bytes)",
    )

    return Response(
        content=file_bytes,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )
