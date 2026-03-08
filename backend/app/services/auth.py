from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.app.core.config import get_settings
from backend.app.core.jwt import JwtValidationError, decode_and_validate_hs256_jwt
from backend.app.services.supabase import (
    SupabaseError,
    build_query_string,
    request_with_anon_key,
    request_with_service_role,
)


class AuthenticationError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 401) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class AuthenticatedSession:
    access_token: str
    refresh_token: str | None
    user: dict[str, str | None]


def _build_authenticated_session(payload: Any) -> AuthenticatedSession:
    if not isinstance(payload, dict):
        raise AuthenticationError("Respuesta inválida del proveedor de autenticación", status_code=502)

    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token")
    user_payload = payload.get("user")
    if not isinstance(access_token, str) or not isinstance(user_payload, dict):
        raise AuthenticationError("La sesión devuelta por Supabase es inválida", status_code=502)

    user_id = user_payload.get("id")
    if not isinstance(user_id, str) or not user_id.strip():
        raise AuthenticationError("No se pudo resolver el usuario autenticado", status_code=502)

    return AuthenticatedSession(
        access_token=access_token,
        refresh_token=refresh_token if isinstance(refresh_token, str) else None,
        user=get_session_user_by_id(user_id),
    )


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
            "El perfil de Supabase no está completo",
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
    query = build_query_string(
        {
            "select": "id,email,username,full_name,department,is_active,roles",
            "id": f"eq.{user_id}",
            "limit": 1,
        }
    )
    payload = request_with_service_role("GET", f"/rest/v1/vw_profiles?{query}")
    if not isinstance(payload, list) or not payload:
        raise AuthenticationError(
            "No se encontró el perfil del usuario autenticado",
            status_code=500,
        )
    profile = payload[0]
    if not isinstance(profile, dict):
        raise AuthenticationError("Supabase devolvió un perfil inválido", status_code=500)
    return profile


def get_session_user_by_id(user_id: str) -> dict[str, str | None]:
    return build_session_user_from_profile(_get_profile_by_user_id(user_id))


def authenticate_email_password(email: str, password: str) -> AuthenticatedSession:
    normalized_email = _normalize_email(email)
    try:
        payload = request_with_anon_key(
            "POST",
            "/auth/v1/token?grant_type=password",
            json_body={"email": normalized_email, "password": password},
        )
    except SupabaseError as exc:
        if exc.status_code in {400, 401}:
            raise AuthenticationError(
                "Email o contraseña incorrectos",
                status_code=401,
            ) from exc
        raise AuthenticationError(
            "No se pudo autenticar contra Supabase",
            status_code=502,
        ) from exc

    return _build_authenticated_session(payload)


def refresh_authenticated_session(refresh_token: str) -> AuthenticatedSession:
    normalized_refresh_token = refresh_token.strip()
    if not normalized_refresh_token:
        raise AuthenticationError("La sesión no tiene refresh token", status_code=401)

    try:
        payload = request_with_anon_key(
            "POST",
            "/auth/v1/token?grant_type=refresh_token",
            json_body={"refresh_token": normalized_refresh_token},
        )
    except SupabaseError as exc:
        if exc.status_code in {400, 401}:
            raise AuthenticationError("No se pudo renovar la sesión", status_code=401) from exc
        raise AuthenticationError(
            "No se pudo renovar la sesión contra Supabase",
            status_code=502,
        ) from exc

    return _build_authenticated_session(payload)


def logout_session(access_token: str, *, scope: str = "local") -> None:
    if not access_token.strip():
        return

    try:
        request_with_anon_key(
            "POST",
            "/auth/v1/logout",
            bearer_token=access_token,
            json_body={"scope": scope},
        )
    except SupabaseError:
        # El frontend debe poder cerrar la sesión local aunque Supabase no
        # responda; el siguiente paso será validar JWT en cada request.
        return


def validate_access_token(access_token: str) -> dict[str, Any]:
    try:
        claims = decode_and_validate_hs256_jwt(
            access_token,
            secret=get_settings().jwt_secret,
            audience=get_settings().supabase_jwt_aud,
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
