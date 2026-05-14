from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ProfilePreferencesPayload(BaseModel):
    email_notifications: bool = True
    security_alerts: bool = True
    dark_mode: bool = False
    dark_mode_auto: bool = True
    interface_language: str = "es"
    interface_language_auto: bool = True

    @field_validator("interface_language")
    @classmethod
    def validate_interface_language(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"es", "en"}:
            raise ValueError("El idioma de la interfaz no es válido")
        return normalized


class ProfileUpdateRequest(BaseModel):
    username: str
    display_name: str | None = None
    email: str
    department: str | None = None
    bio: str | None = None
    preferences: ProfilePreferencesPayload = Field(default_factory=ProfilePreferencesPayload)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
        return normalized

    @field_validator("display_name", "department", "bio")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class ProfilePreferencesUpdateRequest(BaseModel):
    preferences: ProfilePreferencesPayload = Field(default_factory=ProfilePreferencesPayload)


class ProfilePasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return normalized


class ProfileRequiredPasswordChangeRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return normalized


class ProfileActivityResponse(BaseModel):
    kind: str
    title: str
    description: str
    created_at: str


class ProfileOwnedProjectResponse(BaseModel):
    id: str
    name: str
    status: str
    updated_at: str
    member_count: int


class ProfileCollaborationProjectResponse(BaseModel):
    project_id: str
    project_name: str
    project_status: str
    member_role: str
    member_created_at: str


class ProfileProjectsPreviewResponse(BaseModel):
    owned: list[ProfileOwnedProjectResponse]
    collaborations: list[ProfileCollaborationProjectResponse]


class ProfileSummaryResponse(BaseModel):
    active_projects: int
    collaborations: int
    pending_reviews: int


class PublicProfileSummaryResponse(BaseModel):
    public_projects: int
    results_ready: int
    member_connections: int


class ProfileResponse(BaseModel):
    id: str
    email: str
    username: str
    display_name: str
    role: str
    department: str | None = None
    bio: str | None = None
    joined_at: str
    updated_at: str
    preferences: ProfilePreferencesPayload
    summary: ProfileSummaryResponse
    activity: list[ProfileActivityResponse]
    projects_preview: ProfileProjectsPreviewResponse


class PublicProfileProjectResponse(BaseModel):
    id: str
    name: str
    slug: str | None = None
    status: str
    updated_at: str
    member_count: int


class PublicProfileResponse(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    department: str | None = None
    bio: str | None = None
    joined_at: str
    updated_at: str
    summary: PublicProfileSummaryResponse
    activity: list[ProfileActivityResponse]
    public_projects: list[PublicProfileProjectResponse]


class ProfileMutationResponse(BaseModel):
    success: bool
    message: str
    profile: ProfileResponse | None = None
