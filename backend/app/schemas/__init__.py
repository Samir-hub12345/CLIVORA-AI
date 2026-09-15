"""Pydantic data schemas package."""

from app.schemas.health import HealthCheckResponse
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    Token,
    TokenPayload,
    LoginRequest,
)
from app.schemas.patient import (
    PatientBase,
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListResponse,
)
from app.schemas.consultation import (
    ConsultationBase,
    ConsultationCreate,
    ConsultationUpdate,
    ConsultationResponse,
    ConsultationListResponse,
    SOAPNotesUpdate,
)
from app.schemas.ai import (
    VitalsInput,
    TriageRequest,
    DifferentialDiagnosisItem,
    TriageResponse,
    SOAPGenerateRequest,
    SOAPGenerateResponse,
)
from app.schemas.audit import (
    AuditLogBase,
    AuditLogCreate,
    AuditLogResponse,
    AuditLogListResponse,
)

__all__ = [
    "HealthCheckResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "Token",
    "TokenPayload",
    "LoginRequest",
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    "PatientListResponse",
    "ConsultationBase",
    "ConsultationCreate",
    "ConsultationUpdate",
    "ConsultationResponse",
    "ConsultationListResponse",
    "SOAPNotesUpdate",
    "VitalsInput",
    "TriageRequest",
    "DifferentialDiagnosisItem",
    "TriageResponse",
    "SOAPGenerateRequest",
    "SOAPGenerateResponse",
    "AuditLogBase",
    "AuditLogCreate",
    "AuditLogResponse",
    "AuditLogListResponse",
]
