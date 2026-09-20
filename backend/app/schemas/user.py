from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.user import UserRole


class UserBase(BaseModel):
    email: str = Field(..., max_length=255, description="Email address")
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.PATIENT
    facility_id: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Minimum 8 character secure password")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    facility_id: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class LoginRequest(BaseModel):
    email: str
    password: str
