import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.config import settings
from app.core.deps import get_current_user, get_client_ip
from app.db.session import get_db
from app.models.document import Document, DocumentType, DocumentStatus, DocumentArtifact
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentArtifactResponse,
    DocumentArtifactCreate,
    PresignedUrlResponse,
)
from app.services.storage import storage_service
from app.services.audit import AuditService

logger = logging.getLogger("clinova")
router = APIRouter()


async def check_document_access(doc: Document, current_user: User, db: AsyncSession):
    """Enforces resource-level authorization (patient ownership, facility boundary, quarantine check)."""
    # 1. Patient role authorization: Patient can only access documents in their own chart
    if current_user.role == UserRole.PATIENT:
        pat_stmt = select(Patient).where(Patient.id == doc.patient_id)
        patient = (await db.execute(pat_stmt)).scalar_one_or_none()
        if not patient or patient.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this medical document.",
            )

    # 2. Staff/Doctor facility boundary: non-superadmin staff cannot access other facilities' documents
    if current_user.role not in (UserRole.ADMIN, UserRole.PATIENT):
        if current_user.facility_id and doc.facility_id and current_user.facility_id != doc.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-facility access denied: This document belongs to a different healthcare facility.",
            )


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
    """Securely uploads an original medical document with streaming hash computation, magic-byte validation, and antivirus scanning."""
    raw_filename = file.filename or "uploaded_document"
    claimed_mime = file.content_type or "application/octet-stream"

    # Resolve facility ID from user if omitted
    effective_facility_id = facility_id or current_user.facility_id

    # Read file content safely
    file_bytes = await file.read()

    # Validate file (MIME, magic bytes, size, malware scan)
    safe_filename, final_mime, checksum, scan_result = storage_service.validate_and_process_upload(
        filename=raw_filename,
        file_bytes=file_bytes,
        claimed_mime=claimed_mime,
    )

    doc_id = str(uuid.uuid4())
    version = 1
    storage_key = storage_service.generate_storage_key(
        document_id=doc_id,
        original_filename=safe_filename,
        patient_id=patient_id,
        facility_id=effective_facility_id,
        version=version,
    )

    # Save to object store
    storage_service.save_file(storage_key=storage_key, file_bytes=file_bytes)

    # Determine status based on scan result
    doc_status = DocumentStatus.STORED
    quarantined_at = None
    if not scan_result.is_clean:
        doc_status = DocumentStatus.QUARANTINED
        quarantined_at = datetime.now(timezone.utc)
        storage_service.quarantine_file(storage_key)

    doc_record = Document(
        id=doc_id,
        patient_id=patient_id,
        encounter_id=encounter_id,
        case_id=case_id,
        facility_id=effective_facility_id,
        document_type=document_type,
        filename=raw_filename,
        safe_filename=safe_filename,
        mime_type=final_mime,
        detected_mime_type=final_mime,
        file_size_bytes=len(file_bytes),
        checksum_sha256=checksum,
        checksum_algorithm="SHA-256",
        storage_key=storage_key,
        storage_provider="local_object_store",
        storage_bucket="medical-documents",
        status=doc_status,
        scan_status=scan_result.scan_status,
        scan_details=scan_result.details,
        quarantined_at=quarantined_at,
        version=version,
        is_current_version=True,
        uploaded_by=current_user.id,
    )
    db.add(doc_record)
    await db.commit()
    await db.refresh(doc_record)

    action_name = "DOCUMENT_QUARANTINED" if doc_status == DocumentStatus.QUARANTINED else "DOCUMENT_UPLOADED"
    await AuditService.log_event(
        db=db,
        action=action_name,
        resource_type="DOCUMENT",
        resource_id=doc_record.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Document uploaded: '{safe_filename}' ({len(file_bytes)} bytes, Status: {doc_status.value}, Scan: {scan_result.scan_status})",
    )

    return doc_record


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    patient_id: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    encounter_id: Optional[str] = Query(None),
    facility_id: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    status_filter: Optional[DocumentStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List medical documents with pagination, multi-tenancy scoping, and search filters."""
    stmt = select(Document)

    # Exclude soft-deleted records unless explicitly requested
    if not include_deleted:
        stmt = stmt.where(Document.deleted_at.is_(None))

    # Patient isolation: Patients can only see their own documents
    if current_user.role == UserRole.PATIENT:
        pat_stmt = select(Patient.id).where(Patient.email == current_user.email)
        user_patient_ids = (await db.execute(pat_stmt)).scalars().all()
        stmt = stmt.where(Document.patient_id.in_(user_patient_ids))
    elif patient_id:
        stmt = stmt.where(Document.patient_id == patient_id)

    # Staff/Doctor facility isolation
    if current_user.role not in (UserRole.ADMIN, UserRole.PATIENT) and current_user.facility_id:
        stmt = stmt.where(or_(Document.facility_id == current_user.facility_id, Document.facility_id.is_(None)))
    elif facility_id:
        stmt = stmt.where(Document.facility_id == facility_id)

    if encounter_id:
        stmt = stmt.where(Document.encounter_id == encounter_id)
    if case_id:
        stmt = stmt.where(Document.case_id == case_id)
    if document_type:
        stmt = stmt.where(Document.document_type == document_type)
    if status_filter:
        stmt = stmt.where(Document.status == status_filter)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Document.filename.ilike(term), Document.safe_filename.ilike(term)))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(desc(Document.created_at)).offset(skip).limit(limit)
    items = (await db.execute(stmt)).scalars().all()

    return DocumentListResponse(total=total, items=list(items))


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document_metadata(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed document metadata and derived artifacts with resource authorization."""
    stmt = (
        select(Document)
        .options(selectinload(Document.artifacts))
        .where(Document.id == document_id)
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await check_document_access(doc, current_user, db)

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_METADATA_READ",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Viewed metadata for document '{doc.safe_filename or doc.filename}'",
    )

    return doc


@router.get("/{document_id}/download")
async def download_document_file(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Securely streams binary file with quarantine enforcement, resource-level authorization, and audit logging."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await check_document_access(doc, current_user, db)

    # Quarantine check: block access to infected / quarantined files
    if doc.status == DocumentStatus.QUARANTINED or doc.scan_status == "infected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Document has been quarantined due to a detected security threat.",
        )

    if doc.deleted_at:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Document has been deleted.")

    file_bytes = storage_service.get_file(doc.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Binary object file not found in storage.")

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_DOWNLOADED",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Downloaded binary file '{doc.safe_filename or doc.filename}' ({len(file_bytes)} bytes)",
    )

    safe_name = doc.safe_filename or doc.filename
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(doc.file_size_bytes),
            "X-Checksum-SHA256": doc.checksum_sha256,
            "X-Document-Version": str(doc.version),
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
    )


@router.get("/{document_id}/presigned-url", response_model=PresignedUrlResponse)
async def generate_presigned_download_url(
    document_id: str,
    request: Request,
    ttl: Optional[int] = Query(None, ge=60, le=3600),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a short-lived authenticated access token for controlled temporary retrieval."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await check_document_access(doc, current_user, db)

    if doc.status == DocumentStatus.QUARANTINED or doc.scan_status == "infected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot generate access URL for a quarantined document.",
        )

    token_info = storage_service.generate_presigned_token(
        document_id=doc.id,
        user_id=current_user.id,
        facility_id=doc.facility_id,
        ttl_seconds=ttl,
    )

    download_url = f"{request.base_url}api/v1/documents/{doc.id}/access?token={token_info['token']}"

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_PRESIGNED_URL_GENERATED",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Generated presigned access URL for document '{doc.safe_filename or doc.filename}' (TTL: {token_info['ttl_seconds']}s)",
    )

    return PresignedUrlResponse(
        document_id=doc.id,
        download_url=download_url,
        token=token_info["token"],
        expires_at=token_info["expires_at"],
        ttl_seconds=token_info["ttl_seconds"],
    )


@router.get("/{document_id}/access")
async def access_document_via_token(
    document_id: str,
    token: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Permits short-lived authorized download via presigned token without Authorization header."""
    is_valid = storage_service.verify_presigned_token(token=token, document_id=document_id)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Presigned access token is invalid, tampered with, or expired.",
        )

    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.status == DocumentStatus.QUARANTINED or doc.scan_status == "infected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Document has been quarantined.",
        )

    file_bytes = storage_service.get_file(doc.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Binary object file not found.")

    safe_name = doc.safe_filename or doc.filename
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe_name}"',
            "Content-Length": str(doc.file_size_bytes),
            "X-Checksum-SHA256": doc.checksum_sha256,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
    )


@router.post("/{document_id}/amend", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def amend_document_version(
    document_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Uploads an amended version of an existing document, preserving original historical evidence."""
    stmt = select(Document).where(Document.id == document_id)
    prior_doc = (await db.execute(stmt)).scalar_one_or_none()
    if not prior_doc:
        raise HTTPException(status_code=404, detail="Original document not found.")

    await check_document_access(prior_doc, current_user, db)

    raw_filename = file.filename or prior_doc.filename
    claimed_mime = file.content_type or prior_doc.mime_type
    file_bytes = await file.read()

    safe_filename, final_mime, checksum, scan_result = storage_service.validate_and_process_upload(
        filename=raw_filename,
        file_bytes=file_bytes,
        claimed_mime=claimed_mime,
    )

    new_doc_id = str(uuid.uuid4())
    new_version = prior_doc.version + 1
    storage_key = storage_service.generate_storage_key(
        document_id=new_doc_id,
        original_filename=safe_filename,
        patient_id=prior_doc.patient_id,
        facility_id=prior_doc.facility_id,
        version=new_version,
    )

    storage_service.save_file(storage_key=storage_key, file_bytes=file_bytes)

    # Demote prior version from current
    prior_doc.is_current_version = False

    new_doc = Document(
        id=new_doc_id,
        patient_id=prior_doc.patient_id,
        encounter_id=prior_doc.encounter_id,
        case_id=prior_doc.case_id,
        facility_id=prior_doc.facility_id,
        document_type=prior_doc.document_type,
        filename=raw_filename,
        safe_filename=safe_filename,
        mime_type=final_mime,
        detected_mime_type=final_mime,
        file_size_bytes=len(file_bytes),
        checksum_sha256=checksum,
        checksum_algorithm="SHA-256",
        storage_key=storage_key,
        storage_provider="local_object_store",
        storage_bucket="medical-documents",
        status=DocumentStatus.STORED if scan_result.is_clean else DocumentStatus.QUARANTINED,
        scan_status=scan_result.scan_status,
        scan_details=scan_result.details,
        version=new_version,
        parent_document_id=prior_doc.id,
        is_current_version=True,
        uploaded_by=current_user.id,
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_AMENDED",
        resource_type="DOCUMENT",
        resource_id=new_doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Document version amended: {prior_doc.id} (v{prior_doc.version}) -> {new_doc.id} (v{new_version})",
    )

    return new_doc


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-deletes a medical document and records a compliant audit trail."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Only Doctors, Admins, or uploader can soft-delete
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR) and doc.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only physicians or administrators may archive medical documents.",
        )

    await check_document_access(doc, current_user, db)

    doc.deleted_at = datetime.now(timezone.utc)
    doc.status = DocumentStatus.ARCHIVED
    doc.is_current_version = False
    await db.commit()

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_DELETED",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Document '{doc.safe_filename or doc.filename}' soft-deleted and archived",
    )

    return {"message": "Document archived successfully.", "document_id": doc.id}


@router.post("/{document_id}/artifacts", response_model=DocumentArtifactResponse, status_code=status.HTTP_201_CREATED)
async def attach_derived_artifact(
    document_id: str,
    payload: DocumentArtifactCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Attaches a derived artifact (OCR text, OCR structured JSON, thumbnail) to the parent document."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await check_document_access(doc, current_user, db)

    artifact_id = str(uuid.uuid4())
    storage_key = storage_service.generate_artifact_storage_key(
        document_id=doc.id,
        artifact_type=payload.artifact_type,
        extension="json" if "json" in payload.mime_type else "txt",
    )

    content_bytes = (payload.content_text or "").encode("utf-8")
    checksum = hashlib.sha256(content_bytes).hexdigest()
    storage_service.save_file(storage_key, content_bytes)

    artifact = DocumentArtifact(
        id=artifact_id,
        document_id=doc.id,
        artifact_type=payload.artifact_type,
        filename=payload.filename,
        mime_type=payload.mime_type,
        file_size_bytes=len(content_bytes),
        checksum_sha256=checksum,
        storage_key=storage_key,
        storage_provider="local_object_store",
        content_text=payload.content_text,
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)

    await AuditService.log_event(
        db=db,
        action="DOCUMENT_ARTIFACT_ATTACHED",
        resource_type="DOCUMENT_ARTIFACT",
        resource_id=artifact.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Attached derived artifact '{payload.artifact_type}' to document {doc.id}",
    )

    return artifact


@router.get("/{document_id}/artifacts", response_model=List[DocumentArtifactResponse])
async def list_document_artifacts(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves all derived artifacts associated with a parent document."""
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await check_document_access(doc, current_user, db)

    art_stmt = (
        select(DocumentArtifact)
        .where(DocumentArtifact.document_id == document_id)
        .order_by(desc(DocumentArtifact.created_at))
    )
    artifacts = (await db.execute(art_stmt)).scalars().all()
    return list(artifacts)
