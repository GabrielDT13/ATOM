from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any


class JwtValidationError(RuntimeError):
    pass


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(f"{value}{padding}")
    except (ValueError, TypeError) as exc:
        raise JwtValidationError("El token no tiene una codificación base64url válida") from exc


def _load_json_segment(value: str) -> dict[str, Any]:
    try:
        payload = json.loads(_decode_base64url(value))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise JwtValidationError("El token no contiene JSON válido") from exc

    if not isinstance(payload, dict):
        raise JwtValidationError("El token no contiene un objeto JSON válido")
    return payload


def decode_and_validate_hs256_jwt(
    token: str,
    *,
    secret: str,
    audience: str,
    leeway_seconds: int = 30,
) -> dict[str, Any]:
    if not secret:
        raise JwtValidationError("Falta configurar JWT_SECRET")

    parts = token.strip().split(".")
    if len(parts) != 3:
        raise JwtValidationError("El token no tiene un formato JWT válido")

    encoded_header, encoded_payload, encoded_signature = parts
    header = _load_json_segment(encoded_header)
    payload = _load_json_segment(encoded_payload)

    if header.get("alg") != "HS256":
        raise JwtValidationError("Solo se admiten tokens firmados con HS256")

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    provided_signature = _decode_base64url(encoded_signature)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise JwtValidationError("La firma del token no es válida")

    now = int(time.time())
    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and now > int(exp) + leeway_seconds:
        raise JwtValidationError("El token ha expirado")

    nbf = payload.get("nbf")
    if isinstance(nbf, (int, float)) and now + leeway_seconds < int(nbf):
        raise JwtValidationError("El token todavía no es válido")

    aud = payload.get("aud")
    if isinstance(aud, str):
        allowed_audiences = {aud}
    elif isinstance(aud, list):
        allowed_audiences = {item for item in aud if isinstance(item, str)}
    else:
        allowed_audiences = set()

    if audience and audience not in allowed_audiences:
        raise JwtValidationError("La audiencia del token no es válida")

    return payload
