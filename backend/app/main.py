from __future__ import annotations

from backend.app.api.routes.access_requests import router as access_requests_router
from backend.app.api.routes.analysis import router as analysis_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.dashboard import router as dashboard_router
from backend.app.api.routes.departments import router as departments_router
from backend.app.api.routes.entities import router as entities_router
from backend.app.api.routes.navigation import router as navigation_router
from backend.app.api.routes.notifications import router as notifications_router
from backend.app.api.routes.profile import router as profile_router
from backend.app.api.routes.projects import router as projects_router
from backend.app.api.routes.teams import router as teams_router
from backend.app.api.routes.users import router as users_router
from backend.app.core.config import get_settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


def _build_allowed_origins(frontend_url: str) -> list[str]:
    allowed_origins = {frontend_url}
    if "localhost" in frontend_url:
        allowed_origins.add(frontend_url.replace("localhost", "127.0.0.1"))
    if "127.0.0.1" in frontend_url:
        allowed_origins.add(frontend_url.replace("127.0.0.1", "localhost"))
    return sorted(allowed_origins)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ATOM Backend",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_build_allowed_origins(settings.frontend_url),
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site="lax",
        https_only=False,
    )

    app.include_router(auth_router)
    app.include_router(access_requests_router)
    app.include_router(dashboard_router)
    app.include_router(navigation_router)
    app.include_router(notifications_router)
    app.include_router(departments_router)
    app.include_router(entities_router)
    app.include_router(profile_router)
    app.include_router(users_router)
    app.include_router(projects_router)
    app.include_router(teams_router)
    app.include_router(analysis_router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
