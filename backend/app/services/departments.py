from __future__ import annotations

from backend.app.services.supabase import SupabaseError, build_query_string, request_with_service_role


def list_departments() -> list[dict[str, str]]:
    payload = request_with_service_role(
        "GET",
        f"/rest/v1/vw_departments?{build_query_string({'select': 'id,name,slug', 'order': 'name.asc'})}",
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de departamentos inválida")

    departments: list[dict[str, str]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        department_id = item.get("id")
        name = item.get("name")
        slug = item.get("slug")
        if isinstance(department_id, str) and isinstance(name, str) and isinstance(slug, str):
            departments.append({"id": department_id, "name": name, "slug": slug})

    return departments
