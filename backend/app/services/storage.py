import os
import re
import hmac
import time
import base64
import hashlib
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple, AsyncIterator, Dict, Any
from dataclasses import dataclass
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("clinova")

# Controlled medical document MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
    "application/dicom",
    "text/plain",
}

# Dangerous executable magic headers that must always be blocked
DISALLOWED_MAGIC_SIGNATURES = [
    (b"MZ", "DOS/Windows Executable (PE)"),
    (b"\x7fELF", "Linux ELF Executable"),
    (b"\xca\xfe\xba\xbe", "Mach-O / Java Class Binary"),
    (b"<!DOCTYPE html", "HTML/Web Script Document"),
    (b"<script", "JavaScript Active Content"),
]

# Standard EICAR Antivirus Test String for verification
EICAR_SIGNATURE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


@dataclass
class MalwareScanResult:
    is_clean: bool
    scan_status: str  # "clean", "infected", "scan_failed", "skipped"
    engine_name: str
    details: str


class MalwareScanner:
    """Security scanner integration point with ClamAV support and safe local fallback."""

    def __init__(self, enabled: bool = True, clamav_host: Optional[str] = None, clamav_port: int = 3310):
        self.enabled = enabled
        self.clamav_host = clamav_host
        self.clamav_port = clamav_port

    def scan_bytes(self, data_sample: bytes, file_path: Optional[str] = None) -> MalwareScanResult:
        """Inspects sample and file for known malicious signatures or invokes ClamAV."""
        if not self.enabled:
            return MalwareScanResult(
                is_clean=True,
                scan_status="skipped",
                engine_name="ScannerDisabled",
                details="Antivirus scanning disabled in environment configuration.",
            )

        # 1. EICAR Standard Antivirus Test Pattern check
        if EICAR_SIGNATURE in data_sample:
            logger.warning("MALWARE ALERT: EICAR test signature detected in uploaded document.")
            return MalwareScanResult(
                is_clean=False,
                scan_status="infected",
                engine_name="ClinovaAntivirusCore-v2",
                details="EICAR standard antivirus test signature detected. File quarantined.",
            )

        # 2. Check for embedded executable or script payloads
        for sig, desc in DISALLOWED_MAGIC_SIGNATURES:
            if data_sample.startswith(sig):
                logger.warning(f"SECURITY ALERT: Prohibited executable signature '{desc}' detected.")
                return MalwareScanResult(
                    is_clean=False,
                    scan_status="infected",
                    engine_name="ClinovaAntivirusCore-v2",
                    details=f"Prohibited executable format ({desc}) detected in medical document upload.",
                )

        # 3. Optional remote ClamAV scan if configured
        if self.clamav_host:
            try:
                import socket
                with socket.create_connection((self.clamav_host, self.clamav_port), timeout=5) as s:
                    s.sendall(b"zINSTREAM\0")
                    # Send size prefix and chunk
                    s.sendall(len(data_sample).to_bytes(4, byteorder="big") + data_sample)
                    s.sendall(b"\x00\x00\x00\x00")
                    response = s.recv(1024).decode("utf-8", errors="ignore")
                    if "FOUND" in response:
                        return MalwareScanResult(
                            is_clean=False,
                            scan_status="infected",
                            engine_name="ClamAV Daemon",
                            details=f"Threat detected by ClamAV: {response.strip()}",
                        )
            except Exception as e:
                logger.error(f"ClamAV scanner connection failed: {e}. Failing safely.")
                return MalwareScanResult(
                    is_clean=False,
                    scan_status="scan_failed",
                    engine_name="ClamAV Daemon",
                    details=f"Security scanner unavailable ({str(e)}). File withheld pending scan.",
                )

        return MalwareScanResult(
            is_clean=True,
            scan_status="clean",
            engine_name="ClinovaAntivirusCore-v2",
            details="Zero threat signatures detected. File cleared for clinical storage.",
        )


def detect_file_signature(header_bytes: bytes) -> Optional[str]:
    """Inspects magic bytes to identify true underlying MIME type and reject disguised executables."""
    if len(header_bytes) == 0:
        return None

    # Prohibited executable checks
    for sig, desc in DISALLOWED_MAGIC_SIGNATURES:
        if header_bytes.startswith(sig):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Security violation: Executable or script format '{desc}' is strictly prohibited.",
            )

    # Standard clinical document magic signatures
    if header_bytes.startswith(b"%PDF-"):
        return "application/pdf"
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header_bytes.startswith(b"II*\x00") or header_bytes.startswith(b"MM\x00*"):
        return "image/tiff"
    if header_bytes.startswith(b"RIFF") and len(header_bytes) >= 12 and header_bytes[8:12] == b"WEBP":
        return "image/webp"
    if len(header_bytes) >= 132 and header_bytes[128:132] == b"DICM":
        return "application/dicom"

    # Plain text detection: check for valid printable ASCII/UTF-8
    try:
        sample_text = header_bytes[:512].decode("utf-8")
        if all(c.isprintable() or c in "\r\n\t" for c in sample_text):
            return "text/plain"
    except UnicodeDecodeError:
        pass

    return None


class BaseStorageBackend(ABC):
    """Abstract object storage contract supporting pluggable local, S3, MinIO, or cloud providers."""

    @abstractmethod
    def save_bytes(self, storage_key: str, data: bytes) -> str:
        pass

    @abstractmethod
    def get_bytes(self, storage_key: str) -> Optional[bytes]:
        pass

    @abstractmethod
    def delete_object(self, storage_key: str) -> bool:
        pass

    @abstractmethod
    def exists(self, storage_key: str) -> bool:
        pass

    @abstractmethod
    def quarantine_object(self, storage_key: str) -> str:
        """Moves an infected or suspicious object to the quarantine partition."""
        pass


class LocalStorageBackend(BaseStorageBackend):
    """Local filesystem and Docker volume backed object storage implementation."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.normpath(base_dir or os.path.join(os.getcwd(), "storage_data", "documents"))
        self.quarantine_dir = os.path.normpath(
            os.path.join(os.path.dirname(self.base_dir), "quarantine")
        )
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.quarantine_dir, exist_ok=True)

    def _resolve_path(self, storage_key: str, is_quarantine: bool = False) -> str:
        root = self.quarantine_dir if is_quarantine else self.base_dir
        clean_key = os.path.normpath(storage_key).lstrip("\\/.")
        full_path = os.path.normpath(os.path.join(root, clean_key))
        if not full_path.startswith(root):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: Invalid storage path traversal attempt detected.",
            )
        return full_path

    def save_bytes(self, storage_key: str, data: bytes) -> str:
        full_path = self._resolve_path(storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(data)
        return full_path

    def get_bytes(self, storage_key: str) -> Optional[bytes]:
        full_path = self._resolve_path(storage_key)
        if not os.path.isfile(full_path):
            return None
        with open(full_path, "rb") as f:
            return f.read()

    def delete_object(self, storage_key: str) -> bool:
        full_path = self._resolve_path(storage_key)
        if os.path.isfile(full_path):
            try:
                os.remove(full_path)
                return True
            except OSError:
                return False
        return False

    def exists(self, storage_key: str) -> bool:
        full_path = self._resolve_path(storage_key)
        return os.path.isfile(full_path)

    def quarantine_object(self, storage_key: str) -> str:
        orig_path = self._resolve_path(storage_key, is_quarantine=False)
        quar_path = self._resolve_path(storage_key, is_quarantine=True)
        os.makedirs(os.path.dirname(quar_path), exist_ok=True)
        if os.path.isfile(orig_path):
            os.replace(orig_path, quar_path)
            logger.info(f"Document object quarantined: {storage_key} -> {quar_path}")
        return quar_path


class ObjectStorageService:
    """Enterprise medical document storage service with streaming validation, antivirus scanning, and secure retrieval."""

    def __init__(self):
        self.backend = LocalStorageBackend(
            base_dir=os.path.join(os.getcwd(), settings.STORAGE_LOCAL_DIR, "documents")
        )
        self.scanner = MalwareScanner(
            enabled=settings.SCAN_ENABLED,
            clamav_host=settings.CLAMAV_HOST,
            clamav_port=settings.CLAMAV_PORT,
        )

    def sanitize_filename(self, raw_filename: str) -> str:
        """Sanitizes user-provided filename, eliminating path traversal, control chars, and reserved names."""
        if not raw_filename or not raw_filename.strip():
            return "unnamed_document.pdf"
        # Extract basename only
        base = os.path.basename(raw_filename.strip())
        # Replace non-alphanumeric (except dots, underscores, hyphens) with underscores
        clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
        # Limit length to 100 chars
        return clean[:100]

    def generate_storage_key(
        self,
        document_id: str,
        original_filename: str,
        patient_id: Optional[str] = None,
        facility_id: Optional[str] = None,
        version: int = 1,
    ) -> str:
        """Generates a non-user-controlled, deterministic, collision-safe storage path."""
        safe_name = self.sanitize_filename(original_filename)
        fac_segment = f"facilities/{facility_id}" if facility_id else "facilities/default"
        pat_segment = f"patients/{patient_id}" if patient_id else "patients/unassigned"
        return f"{fac_segment}/{pat_segment}/documents/{document_id}/v{version}/{safe_name}"

    def generate_artifact_storage_key(
        self,
        document_id: str,
        artifact_type: str,
        extension: str = "json",
    ) -> str:
        """Generates storage key for derived processing artifacts (OCR text, thumbnails)."""
        clean_ext = extension.lstrip(".")
        return f"artifacts/documents/{document_id}/{artifact_type}.{clean_ext}"

    def validate_and_process_upload(
        self,
        filename: str,
        file_bytes: bytes,
        claimed_mime: str,
    ) -> Tuple[str, str, str, MalwareScanResult]:
        """Validates file size, extension, magic bytes signature, and scans for malware.
        
        Returns:
            (safe_filename, detected_mime, checksum_sha256, scan_result)
        """
        # 1. Non-empty filename check
        if not filename or not filename.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename cannot be empty.",
            )

        safe_filename = self.sanitize_filename(filename)

        # 2. File size boundary validation
        file_size = len(file_bytes)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {max_mb}MB.",
            )

        # 3. MIME type boundary check
        norm_claimed = claimed_mime.lower().strip()
        if norm_claimed not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type '{claimed_mime}'. Allowed types: PDF, PNG, JPEG, WEBP, TIFF, DICOM, TXT.",
            )

        # 4. Inspect magic bytes signature
        detected_mime = detect_file_signature(file_bytes[:1024])
        if detected_mime is None and norm_claimed != "text/plain":
            # If magic bytes cannot be identified and claimed is not plain text, reject
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"MIME verification failed: File content does not match claimed type '{claimed_mime}'.",
            )

        final_mime = detected_mime or norm_claimed

        # 5. Compute cryptographic SHA-256 digest
        checksum = hashlib.sha256(file_bytes).hexdigest()

        # 6. Perform Antivirus & Malware Security Scan
        scan_result = self.scanner.scan_bytes(file_bytes)

        return safe_filename, final_mime, checksum, scan_result

    def save_file(self, storage_key: str, file_bytes: bytes) -> str:
        return self.backend.save_bytes(storage_key, file_bytes)

    def get_file(self, storage_key: str) -> Optional[bytes]:
        return self.backend.get_bytes(storage_key)

    def delete_file(self, storage_key: str) -> bool:
        return self.backend.delete_object(storage_key)

    def quarantine_file(self, storage_key: str) -> str:
        return self.backend.quarantine_object(storage_key)

    # -------------------------------------------------------------
    # Presigned Time-Limited Access Token Architecture
    # -------------------------------------------------------------
    def generate_presigned_token(
        self,
        document_id: str,
        user_id: str,
        facility_id: Optional[str] = None,
        ttl_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generates an HMAC-SHA256 authenticated, time-bounded URL token for secure document retrieval."""
        ttl = ttl_seconds or settings.PRESIGNED_URL_TTL_SECONDS
        expires_at = int(time.time()) + ttl
        payload = f"{document_id}:{user_id}:{facility_id or 'none'}:{expires_at}"
        signature = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        token = base64.urlsafe_b64encode(f"{payload}:{signature}".encode("utf-8")).decode("utf-8")
        return {
            "token": token,
            "expires_at": expires_at,
            "ttl_seconds": ttl,
        }

    def verify_presigned_token(self, token: str, document_id: str) -> bool:
        """Verifies integrity and expiration of a presigned access token."""
        try:
            raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
            parts = raw.split(":")
            if len(parts) != 5:
                return False
            token_doc_id, token_user_id, token_facility_id, token_expires_at, token_signature = parts
            if token_doc_id != document_id:
                return False
            if int(token_expires_at) < int(time.time()):
                logger.warning(f"Presigned document token expired for doc {document_id}")
                return False
            expected_payload = f"{token_doc_id}:{token_user_id}:{token_facility_id}:{token_expires_at}"
            expected_sig = hmac.new(
                settings.SECRET_KEY.encode("utf-8"),
                expected_payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(token_signature, expected_sig)
        except Exception as e:
            logger.warning(f"Invalid presigned token format: {e}")
            return False


# Singleton instance
storage_service = ObjectStorageService()
