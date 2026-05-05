from __future__ import annotations

import shutil
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.services.database import execute, fetch_all, fetch_one
from backend.app.services.errors import ServiceError


def _normalize_entity_name(value: str | None) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise ServiceError("El nombre de la entidad es obligatorio")
    return normalized


def _build_entity_response(item: dict[str, object]) -> dict[str, object] | None:
    entity_id = str(item.get("id") or "").strip()
    name = str(item.get("name") or "").strip()
    slug = str(item.get("slug") or "").strip()
    if not entity_id or not name or not slug:
        return None
    return {
        "created_at": str(item.get("created_at") or "").strip() or None,
        "id": entity_id,
        "logo_url": build_entity_logo_url(entity_id) if str(item.get("logo_path") or "").strip() else None,
        "name": name,
        "project_count": int(item.get("project_count") or 0),
        "slug": slug,
        "team_count": int(item.get("team_count") or 0),
        "user_count": int(item.get("user_count") or 0),
    }


def build_entity_logo_url(entity_id: str) -> str:
    return f"/api/entities/{entity_id}/logo"


def get_entity_logo_path(entity_id: str) -> Path:
    settings = get_settings()
    settings.entity_logos_dir.mkdir(parents=True, exist_ok=True)
    return settings.entity_logos_dir / f"{entity_id}.webp"


def _get_entity_record(entity_id: str) -> dict[str, object] | None:
    item = fetch_one(
        """
        SELECT
          e.id,
          e.name,
          e.slug,
          e.logo_path,
          e.created_at,
          (SELECT count(*) FROM internal.profiles p WHERE p.entity_id = e.id)::bigint AS user_count,
          (SELECT count(*) FROM internal.projects p WHERE p.entity_id = e.id)::bigint AS project_count,
          (SELECT count(*) FROM internal.teams t WHERE t.entity_id = e.id)::bigint AS team_count
        FROM internal.entities e
        WHERE e.id = %s
        LIMIT 1
        """,
        (entity_id,),
    )
    if not isinstance(item, dict):
        return None
    return _build_entity_response(item)


def _find_entity_by_name(name: str) -> dict[str, object] | None:
    item = fetch_one(
        """
        SELECT id, name, slug, created_at
        , logo_path
        FROM internal.entities
        WHERE name = %s
        LIMIT 1
        """,
        (name,),
    )
    if not isinstance(item, dict):
        return None
    return {
        "created_at": str(item.get("created_at") or "").strip() or None,
        "id": str(item.get("id") or "").strip(),
        "logo_url": build_entity_logo_url(str(item.get("id") or "").strip())
        if str(item.get("logo_path") or "").strip()
        else None,
        "name": str(item.get("name") or "").strip(),
        "project_count": 0,
        "slug": str(item.get("slug") or "").strip(),
        "team_count": 0,
        "user_count": 0,
    }


def _generate_entity_slug(name: str, *, current_entity_id: str | None = None) -> str:
    payload = fetch_one("SELECT internal.normalize_entity_slug(%s) AS slug", (name,))
    base_slug = str((payload or {}).get("slug") or "").strip() or "entity"
    candidate_slug = base_slug
    suffix = 1

    while True:
        existing = fetch_one(
            "SELECT id FROM internal.entities WHERE slug = %s LIMIT 1",
            (candidate_slug,),
        )
        existing_id = str((existing or {}).get("id") or "").strip()
        if not existing_id or existing_id == (current_entity_id or ""):
            return candidate_slug
        suffix += 1
        candidate_slug = f"{base_slug}-{suffix}"


def list_entities() -> list[dict[str, object]]:
    payload = fetch_all(
        """
        SELECT
          e.id,
          e.name,
          e.slug,
          e.logo_path,
          e.created_at,
          (SELECT count(*) FROM internal.profiles p WHERE p.entity_id = e.id)::bigint AS user_count,
          (SELECT count(*) FROM internal.projects p WHERE p.entity_id = e.id)::bigint AS project_count,
          (SELECT count(*) FROM internal.teams t WHERE t.entity_id = e.id)::bigint AS team_count
        FROM internal.entities e
        ORDER BY lower(e.name) ASC
        """
    )

    entities: list[dict[str, object]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        entity = _build_entity_response(item)
        if entity:
            entities.append(entity)
    return entities


def create_entity(name: str) -> tuple[bool, str, dict[str, object] | None]:
    normalized_name = _normalize_entity_name(name)
    if _find_entity_by_name(normalized_name):
        return False, "Ya existe una entidad con ese nombre", None

    slug = _generate_entity_slug(normalized_name)
    execute(
        """
        INSERT INTO internal.entities (name, slug)
        VALUES (%s, %s)
        """,
        (normalized_name, slug),
    )
    entity = _find_entity_by_name(normalized_name)
    if not entity:
        raise ServiceError("No se pudo crear la entidad")
    return True, "Entidad creada correctamente", _get_entity_record(str(entity["id"]))


def update_entity(entity_id: str, name: str) -> tuple[bool, str, dict[str, object] | None]:
    current = _get_entity_record(entity_id)
    if not current:
        return False, "Entidad no encontrada", None

    normalized_name = _normalize_entity_name(name)
    existing = _find_entity_by_name(normalized_name)
    if existing and str(existing["id"]) != entity_id:
        return False, "Ya existe una entidad con ese nombre", None

    slug = _generate_entity_slug(normalized_name, current_entity_id=entity_id)
    execute(
        """
        UPDATE internal.entities
        SET name = %s, slug = %s
        WHERE id = %s
        """,
        (normalized_name, slug, entity_id),
    )
    return True, "Entidad actualizada correctamente", _get_entity_record(entity_id)


def update_entity_logo(entity_id: str, logo_bytes: bytes | None) -> dict[str, object] | None:
    current = _get_entity_record(entity_id)
    if not current:
        raise ServiceError("Entidad no encontrada")

    logo_path = get_entity_logo_path(entity_id)
    if logo_bytes:
      logo_path.write_bytes(logo_bytes)
      execute(
          """
          UPDATE internal.entities
          SET logo_path = %s
          WHERE id = %s
          """,
          (logo_path.name, entity_id),
      )
    else:
      if logo_path.exists():
          logo_path.unlink()
      execute(
          """
          UPDATE internal.entities
          SET logo_path = NULL
          WHERE id = %s
          """,
          (entity_id,),
      )

    return _get_entity_record(entity_id)


def delete_entity(entity_id: str) -> tuple[bool, str]:
    current = _get_entity_record(entity_id)
    if not current:
        return False, "Entidad no encontrada"

    execute("DELETE FROM internal.entities WHERE id = %s", (entity_id,))
    logo_path = get_entity_logo_path(entity_id)
    if logo_path.exists():
        if logo_path.is_dir():
            shutil.rmtree(logo_path)
        else:
            logo_path.unlink()
    return True, "Entidad eliminada correctamente"


def ensure_entity(entity_name: str | None) -> str | None:
    normalized = str(entity_name or "").strip()
    if not normalized:
        return None

    payload = fetch_one("SELECT internal.ensure_entity(%s) AS id", (normalized,))
    entity_id = str((payload or {}).get("id") or "").strip()
    if not entity_id:
        raise ServiceError("No se pudo registrar la entidad seleccionada")
    return entity_id
