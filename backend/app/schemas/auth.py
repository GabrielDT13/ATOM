from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class SessionUser(BaseModel):
    username: str
    role: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: SessionUser | None = None
