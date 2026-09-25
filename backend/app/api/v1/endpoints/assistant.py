from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.deps import get_current_user_optional, get_client_ip
from app.schemas.assistant import (
    AssistantCapabilities,
    AssistantPreference,
    AssistantMessageRequest,
    AssistantMessageResponse,
    AssistantToolExecuteRequest,
    AssistantToolExecuteResponse,
)
from app.services.assistant_service import AssistantService
from app.services.audit import AuditService

router = APIRouter()

# In-memory preference store keyed by user_id
_USER_PREFERENCES: Dict[str, AssistantPreference] = {}


def _resolve_user(current_user: Optional[User]) -> User:
    if current_user:
        return current_user
    return User(
        id="guest_patient",
        email="guest@clinova.local",
        full_name="Guest Patient",
        role=UserRole.PATIENT,
        is_active=True,
    )


@router.get("/capabilities", response_model=AssistantCapabilities)
async def get_capabilities(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieve assistant capabilities, available tools, and supported languages for current role."""
    user = _resolve_user(current_user)
    return AssistantService.get_capabilities(user)


@router.get("/preferences", response_model=AssistantPreference)
async def get_preferences(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieve assistant display and voice preferences."""
    user = _resolve_user(current_user)
    return _USER_PREFERENCES.get(user.id, AssistantPreference())


@router.put("/preferences", response_model=AssistantPreference)
async def update_preferences(
    pref: AssistantPreference,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update assistant display and voice preferences."""
    user = _resolve_user(current_user)
    _USER_PREFERENCES[user.id] = pref
    return pref


@router.post("/message", response_model=AssistantMessageResponse)
async def send_message(
    req: AssistantMessageRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Processes an assistant message query with prompt injection defense, RBAC, and clinical safety."""
    user = _resolve_user(current_user)
    response = await AssistantService.process_message(req, user, db)

    # Audit log if consequential
    if response.requires_confirmation or (user.id != "guest_patient"):
        try:
            await AuditService.log_event(
                db=db,
                action="ASSISTANT_QUERY",
                resource_type="ASSISTANT",
                resource_id=req.context_resource_id or "session",
                user=current_user,
                ip_address=get_client_ip(request),
                details=f"Query lang={req.language}, role={user.role.value}, source={response.source_label}",
            )
        except Exception:
            pass

    return response


@router.post("/tools/execute", response_model=AssistantToolExecuteResponse)
async def execute_tool(
    req: AssistantToolExecuteRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Execute an allowlisted deterministic tool with role re-authorization and audit logging."""
    user = _resolve_user(current_user)
    result = await AssistantService.execute_tool(req, user, db)

    # Always log tool execution attempt in audit log
    try:
        await AuditService.log_event(
            db=db,
            action=f"ASSISTANT_TOOL_{req.tool_name.upper()}",
            resource_type="ASSISTANT_TOOL",
            resource_id=req.tool_name,
            user=current_user,
            ip_address=get_client_ip(request),
            details=f"Success={result.success}, confirmed={req.confirmed}, role={user.role.value}",
        )
    except Exception:
        pass

    return result
