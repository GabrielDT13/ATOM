from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from backend.app.core.config import get_settings
from pydantic import BaseModel, ConfigDict, ValidationError

FALLBACK_QUICK_START_STEPS = [
    {
        "description": "Descarga la plantilla pública y súbela al proyecto con el nombre template.xlsx.",
        "step": 1,
        "title": "Cargar plantilla base",
    },
    {
        "description": "Adjunta el fichero de conteos o los recursos asociados que correspondan al análisis.",
        "step": 2,
        "title": "Añadir datos de entrada",
    },
    {
        "description": "Ejecuta el flujo desde la plataforma y revisa el informe HTML generado al finalizar.",
        "step": 3,
        "title": "Lanzar y revisar resultados",
    },
]

ALLOWED_EXAMPLE_KINDS = {"template", "counts", "other"}


class ExampleManifestResource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: str = ""
    kind: Literal["template", "counts", "other"] | None = None
    name: str = ""
    relative_path: str
    title: str = ""


class ExampleManifestStep(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: str
    step: int | None = None
    title: str


class ExampleManifest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    quick_start_steps: list[ExampleManifestStep] = []
    resources: list[ExampleManifestResource] = []


def _classify_example_file(file_path: Path) -> str:
    name = file_path.name.lower()
    if name.endswith((".xls", ".xlsx")):
        return "template"
    if "count" in name:
        return "counts"
    return "other"


def _read_manifest(examples_dir: Path) -> ExampleManifest | None:
    manifest_path = examples_dir / "manifest.json"
    if not manifest_path.exists():
        return None

    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        return ExampleManifest.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValidationError):
        return None


def _build_example_item_from_file(file_path: Path, examples_dir: Path) -> dict[str, object]:
    relative_path = file_path.relative_to(examples_dir).as_posix()
    stats = file_path.stat()
    return {
        "description": "Recurso público disponible para descargar y reutilizar en nuevos proyectos.",
        "kind": _classify_example_file(file_path),
        "name": file_path.name,
        "public_url": f"/examples/{relative_path}",
        "relative_path": relative_path,
        "size_bytes": stats.st_size,
        "title": file_path.stem.replace("_", " ").strip() or file_path.name,
        "updated_at": datetime.fromtimestamp(stats.st_mtime, timezone.utc).isoformat(),
    }


def _normalize_example_kind(raw_kind: object, file_path: Path) -> str:
    candidate = str(raw_kind or "").strip().lower()
    if candidate in ALLOWED_EXAMPLE_KINDS:
        return candidate
    return _classify_example_file(file_path)


def _list_examples_from_manifest(
    examples_dir: Path,
    manifest: ExampleManifest,
) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for resource in manifest.resources:
        relative_path = resource.relative_path.strip()
        if not relative_path:
            continue

        file_path = (examples_dir / relative_path).resolve()
        try:
            file_path.relative_to(examples_dir.resolve())
        except ValueError:
            continue

        if not file_path.exists() or not file_path.is_file():
            continue

        stats = file_path.stat()
        item = {
            "description": resource.description.strip()
            or "Recurso público disponible para descargar y reutilizar en nuevos proyectos.",
            "kind": _normalize_example_kind(resource.kind, file_path),
            "name": resource.name.strip() or file_path.name,
            "public_url": f"/examples/{relative_path}",
            "relative_path": relative_path,
            "size_bytes": stats.st_size,
            "title": resource.title.strip() or file_path.stem,
            "updated_at": datetime.fromtimestamp(stats.st_mtime, timezone.utc).isoformat(),
        }
        items.append(item)

    return items


def _list_examples_from_directory(examples_dir: Path) -> list[dict[str, object]]:
    files = sorted(
        [path for path in examples_dir.rglob("*") if path.is_file() and path.name != "manifest.json"],
        key=lambda path: path.relative_to(examples_dir).as_posix().lower(),
    )
    return [_build_example_item_from_file(file_path, examples_dir) for file_path in files]


def _build_quick_start_steps_from_manifest(manifest: ExampleManifest) -> list[dict[str, object]]:
    steps: list[dict[str, object]] = []
    for index, item in enumerate(manifest.quick_start_steps, start=1):
        title = item.title.strip()
        description = item.description.strip()
        if not title or not description:
            continue

        step = item.step if isinstance(item.step, int) else index
        steps.append(
            {
                "description": description,
                "step": step,
                "title": title,
            }
        )

    return steps


def load_public_examples_catalog() -> dict[str, list[dict[str, object]]]:
    examples_dir = get_settings().public_examples_dir
    if not examples_dir.exists():
        return {
            "example_library": [],
            "quick_start_steps": FALLBACK_QUICK_START_STEPS,
        }

    manifest = _read_manifest(examples_dir)
    example_library = _list_examples_from_manifest(examples_dir, manifest) if manifest else []
    if not example_library:
        example_library = _list_examples_from_directory(examples_dir)

    quick_start_steps = _build_quick_start_steps_from_manifest(manifest) if manifest else []
    if not quick_start_steps:
        quick_start_steps = FALLBACK_QUICK_START_STEPS

    return {
        "example_library": example_library,
        "quick_start_steps": quick_start_steps,
    }
