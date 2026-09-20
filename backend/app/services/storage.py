import os
import re
import hashlib
from typing import Optional, Tuple
from fastapi import HTTPException, status
from app.core.config import settings

# Allowed MIME types for clinical and diagnostic documents
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
}

# Maximum file size: 50 MB
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


class ObjectStorageService:
    """Manages secure object storage for medical documents, preserving original files and separating binary data from PostgreSQL metadata."""

    def __init__(self, base_storage_dir: Optional[str] = None):
        self.base_dir = base_storage_dir or os.path.join(os.getcwd(), "storage_data", "documents")
        os.makedirs(self.base_dir, exist_ok=True)

    def validate_file(self, filename: str, file_bytes: bytes, mime_type: str) -> str:
        """Validates file size, MIME type, and safe filename. Returns SHA-256 checksum."""
        if not filename or not filename.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename cannot be empty.",
            )

        # 1. Size Validation
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
            )

        # 2. MIME Validation
        normalized_mime = mime_type.lower().strip()
        if normalized_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type '{mime_type}'. Allowed types: PDF, PNG, JPEG, WEBP, TIFF.",
            )

        # 3. Compute SHA-256 Checksum
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        return sha256

    def generate_storage_key(
        self,
        document_id: str,
        original_filename: str,
        patient_id: Optional[str] = None,
        facility_id: Optional[str] = None,
    ) -> str:
        """Generates a secure, predictable, non-user-controlled storage key."""
        # Sanitize filename slug (remove path traversal, keep alphanumeric, dots, hyphens)
        clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", os.path.basename(original_filename))
        fac_segment = f"facilities/{facility_id}" if facility_id else "facilities/default"
        pat_segment = f"patients/{patient_id}" if patient_id else "patients/unassigned"
        return f"{fac_segment}/{pat_segment}/documents/{document_id}/{clean_name}"

    def save_file(self, storage_key: str, file_bytes: bytes) -> str:
        """Saves binary file bytes to object store at storage_key. Prevents path traversal."""
        full_path = os.path.normpath(os.path.join(self.base_dir, storage_key))
        if not full_path.startswith(os.path.normpath(self.base_dir)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage path traversal attempt detected.",
            )

        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_bytes)

        return full_path

    def get_file(self, storage_key: str) -> Optional[bytes]:
        """Retrieves binary bytes from object storage."""
        full_path = os.path.normpath(os.path.join(self.base_dir, storage_key))
        if not full_path.startswith(os.path.normpath(self.base_dir)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage path.")
        if not os.path.isfile(full_path):
            return None
        with open(full_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_key: str) -> bool:
        """Deletes file from object storage."""
        full_path = os.path.normpath(os.path.join(self.base_dir, storage_key))
        if not full_path.startswith(os.path.normpath(self.base_dir)):
            return False
        if os.path.isfile(full_path):
            os.remove(full_path)
            return True
        return False


# Singleton instance
storage_service = ObjectStorageService()
