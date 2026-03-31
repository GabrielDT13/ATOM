from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from backend.app.core.config import get_settings


@dataclass(frozen=True)
class SupabaseCredentials:
    base_url: str
    anon_key: str
    service_role_key: str


class SupabaseError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        payload: Any = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def get_supabase_credentials() -> SupabaseCredentials:
    settings = get_settings()
    if not settings.supabase_url:
        raise SupabaseError("Falta configurar SUPABASE_URL o SUPABASE_URL_INTERNAL")
    if not settings.supabase_anon_key:
        raise SupabaseError("Falta configurar SUPABASE_ANON_KEY")
    if not settings.supabase_service_role_key:
        raise SupabaseError("Falta configurar SUPABASE_SERVICE_ROLE_KEY")

    return SupabaseCredentials(
        base_url=settings.supabase_url.rstrip("/"),
        anon_key=settings.supabase_anon_key,
        service_role_key=settings.supabase_service_role_key,
    )


def build_query_string(params: dict[str, str | int | None]) -> str:
    compact_params = {
        key: str(value)
        for key, value in params.items()
        if value is not None
    }
    return urlencode(compact_params)


def _extract_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for field in ("msg", "message", "error_description", "error", "detail"):
            value = payload.get(field)
            if isinstance(value, str) and value.strip():
                return value.strip()
    if fallback.strip():
        return fallback.strip()
    return "Error inesperado al comunicarse con Supabase"


def _request_json(
    method: str,
    path: str,
    *,
    api_key: str,
    bearer_token: str | None = None,
    json_body: Any = None,
    schema: str | None = None,
) -> Any:
    credentials = get_supabase_credentials()
    headers = {
        "Accept": "application/json",
        "apikey": api_key,
    }
    if schema:
        headers["Accept-Profile"] = schema
        if method.upper() in {"PATCH", "POST", "PUT"}:
            headers["Content-Profile"] = schema
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    request_body = None
    if json_body is not None:
        headers["Content-Type"] = "application/json"
        request_body = json.dumps(json_body).encode("utf-8")

    request = Request(
        url=f"{credentials.base_url}{path}",
        data=request_body,
        headers=headers,
        method=method.upper(),
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw_payload = response.read().decode("utf-8")
    except HTTPError as exc:
        raw_payload = exc.read().decode("utf-8")
        payload = None
        if raw_payload:
            try:
                payload = json.loads(raw_payload)
            except json.JSONDecodeError:
                payload = raw_payload
        raise SupabaseError(
            _extract_error_message(payload, raw_payload),
            status_code=exc.code,
            payload=payload,
        ) from exc
    except URLError as exc:
        raise SupabaseError("No se pudo conectar con Supabase") from exc

    if not raw_payload:
        return None

    try:
        return json.loads(raw_payload)
    except json.JSONDecodeError as exc:
        raise SupabaseError("Supabase devolvió una respuesta no JSON válida") from exc


def request_with_anon_key(
    method: str,
    path: str,
    *,
    json_body: Any = None,
    bearer_token: str | None = None,
    schema: str | None = None,
) -> Any:
    credentials = get_supabase_credentials()
    return _request_json(
        method,
        path,
        api_key=credentials.anon_key,
        bearer_token=bearer_token,
        json_body=json_body,
        schema=schema,
    )


def request_with_service_role(
    method: str,
    path: str,
    *,
    json_body: Any = None,
    schema: str | None = None,
) -> Any:
    credentials = get_supabase_credentials()
    return _request_json(
        method,
        path,
        api_key=credentials.service_role_key,
        bearer_token=credentials.service_role_key,
        json_body=json_body,
        schema=schema,
    )


def call_rpc_with_service_role(
    function_name: str,
    *,
    json_body: Any = None,
    schema: str | None = None,
) -> Any:
    return request_with_service_role(
        "POST",
        f"/rest/v1/rpc/{function_name}",
        json_body=json_body,
        schema=schema,
    )
