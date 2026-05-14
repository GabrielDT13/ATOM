from __future__ import annotations

from backend.app.services.database import fetch_all


def list_departments() -> list[dict[str, str]]:
    payload = fetch_all(
        """
        SELECT id, name, slug
        FROM public.vw_departments
        ORDER BY name ASC
        """
    )

    departments: list[dict[str, str]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        department_id = str(item.get("id") or "").strip()
        name = item.get("name")
        slug = item.get("slug")
        if department_id and isinstance(name, str) and isinstance(slug, str):
            departments.append({"id": department_id, "name": name, "slug": slug})

    return departments
