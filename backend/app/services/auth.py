from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from backend.app.core.config import get_settings
from backend.app.core.jwt import JwtValidationError, decode_and_validate_hs256_jwt, encode_hs256_jwt
from backend.app.services.database import execute, fetch_one, hash_token


class AuthenticationError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 401) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class AuthenticatedSession:
    access_token: str
    refresh_token: str | None
    user: dict[str, str | None]


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if not normalized:
        raise AuthenticationError("El email es obligatorio", status_code=400)
    return normalized


def _resolve_role(roles: Any) -> str:
    if isinstance(roles, list) and "admin" in roles:
        return "admin"
    return "user"


def build_session_user_from_profile(profile: dict[str, Any]) -> dict[str, str | None]:
    username = str(profile.get("username") or "").strip()
    email = str(profile.get("email") or "").strip().lower()
    profile_id = str(profile.get("id") or "").strip()
    full_name = str(profile.get("full_name") or "").strip() or None

    if not username or not email or not profile_id:
        raise AuthenticationError(
            "El perfil del usuario no está completo",
            status_code=500,
        )

    if profile.get("is_active") is False:
        raise AuthenticationError("Tu cuenta está desactivada", status_code=403)

    return {
        "id": profile_id,
        "email": email,
        "username": username,
        "role": _resolve_role(profile.get("roles")),
        "first_name": None,
        "last_name": None,
        "department": str(profile.get("department") or "").strip() or None,
        "display_name": full_name or username,
    }


def _get_profile_by_user_id(user_id: str) -> dict[str, Any]:
    profile = fetch_one(
        """
        SELECT
          id,
          email,
          username,
          full_name,
          department,
          is_active,
          roles
        FROM public.vw_profiles
        WHERE id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    if not profile:
        raise AuthenticationError(
            "No se encontró el perfil del usuario autenticado",
            status_code=500,
        )
    return profile


def get_session_user_by_id(user_id: str) -> dict[str, str | None]:
    return build_session_user_from_profile(_get_profile_by_user_id(user_id))


def _build_access_token(*, user_id: str) -> str:
    settings = get_settings()
    if not settings.jwt_secret:
        raise AuthenticationError("Falta configurar JWT_SECRET", status_code=500)
    now = int(time.time())
    payload = {
        "sub": user_id,
        "aud": settings.jwt_audience,
        "role": "authenticated",
        "exp": now + settings.access_token_ttl_seconds,
        "iat": now,
    }
    return encode_hs256_jwt(payload, secret=settings.jwt_secret)


def _store_refresh_token(*, user_id: str) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=get_settings().refresh_token_ttl_seconds)
    execute(
        """
        INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at)
        VALUES (%s, %s, %s)
        """,
        (user_id, hash_token(raw_token), expires_at),
    )
    return raw_token


def _build_local_authenticated_session(user_id: str) -> AuthenticatedSession:
    session_user = get_session_user_by_id(user_id)
    return AuthenticatedSession(
        access_token=_build_access_token(user_id=user_id),
        refresh_token=_store_refresh_token(user_id=user_id),
        user=session_user,
    )


def authenticate_email_password(email: str, password: str) -> AuthenticatedSession:
    normalized_email = _normalize_email(email)
    user_record = fetch_one(
        """
        SELECT
          u.id,
          u.is_active,
          COALESCE(p.is_active, true) AS profile_is_active,
          (u.encrypted_password = crypt(%s, u.encrypted_password)) AS password_valid
        FROM auth.users u
        LEFT JOIN internal.profiles p
          ON p.id = u.id
        WHERE lower(u.email) = lower(%s)
        LIMIT 1
        """,
        (password, normalized_email),
    )
    if not user_record or not bool(user_record.get("password_valid")):
        raise AuthenticationError(
            "Email o contraseña incorrectos",
            status_code=401,
        )

    if user_record.get("is_active") is False or user_record.get("profile_is_active") is False:
        raise AuthenticationError("Tu cuenta está desactivada", status_code=403)

    user_id = str(user_record.get("id") or "").strip()
    if not user_id:
        raise AuthenticationError("No se pudo resolver el usuario autenticado", status_code=502)

    return _build_local_authenticated_session(user_id)


def refresh_authenticated_session(refresh_token: str) -> AuthenticatedSession:
    normalized_refresh_token = refresh_token.strip()
    if not normalized_refresh_token:
        raise AuthenticationError("La sesión no tiene refresh token", status_code=401)

    token_hash = hash_token(normalized_refresh_token)
    token_record = fetch_one(
        """
        SELECT user_id, expires_at, revoked_at
        FROM auth.refresh_tokens
        WHERE token_hash = %s
        LIMIT 1
        """,
        (token_hash,),
    )
    if not token_record:
        raise AuthenticationError("No se pudo renovar la sesión", status_code=401)

    if token_record.get("revoked_at") is not None:
        raise AuthenticationError("No se pudo renovar la sesión", status_code=401)

    expires_at = token_record.get("expires_at")
    if not isinstance(expires_at, datetime) or expires_at <= datetime.now(timezone.utc):
        execute(
            """
            UPDATE auth.refresh_tokens
            SET revoked_at = COALESCE(revoked_at, now())
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        raise AuthenticationError("No se pudo renovar la sesión", status_code=401)

    execute(
        """
        UPDATE auth.refresh_tokens
        SET revoked_at = now()
        WHERE token_hash = %s
        """,
        (token_hash,),
    )

    user_id = str(token_record.get("user_id") or "").strip()
    if not user_id:
        raise AuthenticationError("No se pudo renovar la sesión", status_code=401)
    return _build_local_authenticated_session(user_id)


def logout_session(access_token: str, *, scope: str = "local") -> None:
    if not access_token.strip():
        return

    try:
        claims = validate_access_token(access_token)
    except AuthenticationError:
        return

    user_id = str(claims.get("sub") or "").strip()
    if not user_id:
        return

    execute(
        """
        UPDATE auth.refresh_tokens
        SET revoked_at = now()
        WHERE user_id = %s
          AND revoked_at IS NULL
        """,
        (user_id,),
    )


def validate_access_token(access_token: str) -> dict[str, Any]:
    try:
        claims = decode_and_validate_hs256_jwt(
            access_token,
            secret=get_settings().jwt_secret,
            audience=get_settings().jwt_audience,
        )
    except JwtValidationError as exc:
        raise AuthenticationError(str(exc), status_code=401) from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise AuthenticationError("El token no contiene un subject válido", status_code=401)

    return claims


def get_session_user_from_access_token(access_token: str) -> dict[str, str | None]:
    claims = validate_access_token(access_token)
    return get_session_user_by_id(str(claims["sub"]))
