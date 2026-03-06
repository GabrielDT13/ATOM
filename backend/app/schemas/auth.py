from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class SessionUser(BaseModel):
    username: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    display_name: str | None = None


class SessionResponse(BaseModel):
    authenticated: bool
    user: SessionUser | None = None
