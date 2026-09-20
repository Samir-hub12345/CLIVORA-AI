# CLINOVA AI — OBJECT STORAGE ARCHITECTURE

> **Document Version:** 1.0.0  
> **Phase:** 3 — Medical Documents & Object Storage  
> **Standard:** Cloud-Native Object Storage Specification (S3 API / POSIX Local Abstraction)  
> **Status:** Production-Grade / Active  

---

## 1. Architectural Mission

Healthcare systems handle diverse, high-volume unstructured data including high-resolution radiographs, surgical videos, pathology whole-slide images, and multi-page discharge summaries. Storing these raw binary payloads directly inside relational database tables (such as PostgreSQL `BYTEA` or `BLOB`) degrades database performance, bloats transaction logs (WAL), exhausts connection pools, and limits horizontal scalability.

Clinova AI implements an **Abstracted Object Storage Layer** that completely decouples raw payload persistence from relational clinical metadata.

---

## 2. Storage Abstraction Architecture

The application defines a unified interface (`BaseStorageBackend`) that enables seamless switching between local disk storage (for development, on-premise appliances, edge deployments) and Amazon S3 / MinIO / Google Cloud Storage (for cloud production environments) without changing application or endpoint code.

```mermaid
classDiagram
    class BaseStorageBackend {
        <<interface>>
        +save_stream(file_stream, destination_key, bucket) StorageResult
        +get_stream(storage_key, bucket) AsyncIterator[bytes]
        +delete_file(storage_key, bucket) bool
        +file_exists(storage_key, bucket) bool
        +generate_presigned_url(storage_key, expires_in, bucket) str
    }

    class LocalStorageBackend {
        -str base_dir
        -str quarantine_dir
        +save_stream(file_stream, destination_key, bucket) StorageResult
        +get_stream(storage_key, bucket) AsyncIterator[bytes]
        +delete_file(storage_key, bucket) bool
        +file_exists(storage_key, bucket) bool
        +generate_presigned_url(storage_key, expires_in, bucket) str
        +quarantine_file(storage_key, quarantine_key) str
    }

    class S3StorageBackend {
        -str endpoint_url
        -str aws_access_key_id
        -str aws_secret_access_key
        -str default_bucket
        +save_stream(file_stream, destination_key, bucket) StorageResult
        +get_stream(storage_key, bucket) AsyncIterator[bytes]
        +delete_file(storage_key, bucket) bool
        +file_exists(storage_key, bucket) bool
        +generate_presigned_url(storage_key, expires_in, bucket) str
    }

    BaseStorageBackend <|-- LocalStorageBackend
    BaseStorageBackend <|-- S3StorageBackend
```

---

## 3. Storage Hierarchy & Tenant Key Isolation

All stored objects are organized into a strict, tenant-isolated path convention. This design guarantees that documents from different facilities or patients cannot collide or leak across tenant boundaries at the filesystem or bucket level:

```
{storage_bucket}/
  └── facilities/
      └── {facility_id}/
          └── patients/
              └── {patient_id or 'unassigned'}/
                  └── documents/
                      └── {document_id}/
                          └── v{version}/
                              └── {safe_filename}
```

### Example Real-World Storage Keys
```
medical-documents/facilities/f47ac10b-58cc-4372-a567-0e02b2c3d479/patients/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/99e2b104-33d1-419b-a3be-53f7cbb1399e/v1/discharge_summary.pdf
medical-documents/facilities/f47ac10b-58cc-4372-a567-0e02b2c3d479/patients/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/99e2b104-33d1-419b-a3be-53f7cbb1399e/v2/discharge_summary_amended.pdf
```

---

## 4. Large-File Streaming Pipeline (10MB – 500MB)

Traditional web applications buffer entire uploaded files into server memory (`await file.read()`), causing immediate out-of-memory (OOM) crashes under concurrent clinical loads or when handling 50MB–500MB multi-frame CT scans.

Clinova AI employs a **Zero-Buffering Chunked Streaming Architecture**:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant FastAPI as API Router
    participant StreamBuffer as 64KB Chunk Streamer
    participant SHA256 as Streaming Hash Engine
    participant MagicBytes as Signature Inspector
    participant Storage as Object Storage Writer

    Client->>FastAPI: POST /api/v1/documents/upload (Chunked Transfer)
    FastAPI->>StreamBuffer: Read initial 1KB chunk
    StreamBuffer->>MagicBytes: Inspect file signature & detect MIME
    alt Invalid Signature or Executable detected
        MagicBytes-->>FastAPI: Raise HTTP 400 Bad Request
        FastAPI-->>Client: Rejection Response
    else Valid File Signature
        MagicBytes-->>FastAPI: Signature Verified
        loop While Chunks Available (64KB at a time)
            FastAPI->>StreamBuffer: Read next 64KB chunk
            StreamBuffer->>SHA256: update(chunk)
            StreamBuffer->>Storage: write(chunk)
        end
        SHA256->>FastAPI: Return hexdigest (SHA-256)
        FastAPI->>Client: HTTP 201 Created (Metadata + SHA-256)
    end
```

### Key Performance Benefits
- **Constant Memory Footprint:** Memory utilization remains bounded (<2MB per upload worker) regardless of whether the file is 100KB or 500MB.
- **Simultaneous Hash Calculation:** SHA-256 integrity digests are calculated in-flight as chunks are written, eliminating the need to re-read files from disk.
- **Downstream Streaming Downloads:** Downloads utilize `StreamingResponse` with `application/octet-stream` chunk iterators, preventing memory spikes during clinician reads.

---

## 5. Security Architecture & Presigned URLs

### 5.1 Private Storage Enforcement
Storage buckets and directories are strictly private. No public HTTP directory indexing, anonymous S3 policies, or direct URL mapping exists. All access must be mediated through Clinova AI's authentication and authorization barrier.

### 5.2 HMAC-Signed Presigned URL Protocol
For secure, ephemeral clinical file viewing without exposing permanent URLs or persistent bearer tokens in query parameters, the application provides an **HMAC-SHA256 Signed Access Token Protocol**:

```
1. Clinician requests:
   GET /api/v1/documents/{id}/presigned-url?expires_in_minutes=15

2. Server generates:
   - Expiration timestamp: T_exp = now + 900s
   - Signature: HMAC_SHA256(secret_key, "{doc_id}:{T_exp}")
   - Returns token: "{T_exp}:{signature}"
   - URL: /api/v1/documents/{id}/access?token={token}

3. Clinician / Client accesses URL:
   GET /api/v1/documents/{id}/access?token={token}

4. Server verifies:
   - Expiration check: if now > T_exp -> HTTP 401 "Token expired"
   - Cryptographic check: constant_time_compare(signature, expected_signature)
   - If invalid -> HTTP 401 "Invalid or forged token"
   - If valid -> Streams document content
```

---

## 6. S3 & MinIO Environment Configuration

When switching from local development storage to cloud S3 or self-hosted MinIO, the following environment variables configure the backend:

| Environment Variable | Default (Local) | Cloud / MinIO Production | Description |
| :--- | :--- | :--- | :--- |
| `STORAGE_PROVIDER` | `local` | `s3` | Storage backend driver (`local` or `s3`) |
| `STORAGE_LOCAL_DIR` | `/app/storage_data/documents` | N/A | Base directory for local disk backend |
| `STORAGE_QUARANTINE_DIR` | `/app/storage_data/quarantine` | N/A | Base directory for isolated quarantine vault |
| `S3_ENDPOINT_URL` | None | `https://s3.us-east-1.amazonaws.com` | S3 API endpoint |
| `S3_ACCESS_KEY_ID` | None | `AKIAIOSFODNN7EXAMPLE` | IAM access key |
| `S3_SECRET_ACCESS_KEY` | None | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | IAM secret key |
| `S3_BUCKET_NAME` | `medical-documents` | `clinova-production-medical-docs` | Target S3 bucket name |
| `S3_REGION` | `us-east-1` | `us-east-1` | AWS region |
| `STORAGE_MAX_FILE_SIZE_MB`| `500` | `500` | Maximum allowed upload size in megabytes |

---

## 7. Storage Reliability & Auditability

Every operation across the storage layer produces an immutable audit event in the `audit_logs` table:
- `DOCUMENT_UPLOADED`: Logged when a file stream completes verification and writing.
- `DOCUMENT_METADATA_READ`: Logged when document metadata is inspected.
- `DOCUMENT_DOWNLOADED`: Logged when a clinician streams or accesses a document.
- `DOCUMENT_QUARANTINED`: Logged when a security threat triggers isolation.
- `DOCUMENT_AMENDED`: Logged when a new version supersedes an existing document.
- `DOCUMENT_DELETED`: Logged when a document is soft-deleted / archived.
- `DOCUMENT_ACCESS_DENIED`: Logged on IDOR or cross-tenant authorization failures.

---

*Clinova AI — Engineering Architecture Documentation*
