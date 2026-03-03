from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.app.api.routes.analysis import router as analysis_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.navigation import router as navigation_router
from backend.app.api.routes.projects import router as projects_router
from backend.app.api.routes.users import router as users_router
from backend.app.core.config import get_settings

settings = get_settings()
allowed_origins = {settings.frontend_url}
if "localhost" in settings.frontend_url:
    allowed_origins.add(settings.frontend_url.replace("localhost", "127.0.0.1"))
if "127.0.0.1" in settings.frontend_url:
    allowed_origins.add(settings.frontend_url.replace("127.0.0.1", "localhost"))

app = FastAPI(
    title="ATOM Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
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
app.include_router(navigation_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(analysis_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
