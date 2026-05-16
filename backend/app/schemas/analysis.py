from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

AnalysisRunStatus = Literal["queued", "running", "completed", "failed", "cancelled"]
AnalysisRunEventType = Literal[
    "run_started",
    "run_completed",
    "run_failed",
    "design_started",
    "design_completed",
    "design_failed",
    "cleanup_completed",
    "cleanup_failed",
    "log",
]


class AnalysisRunResponse(BaseModel):
    id: str
    project_id: str
    project_name: str
    project_owner_username: str
    requested_by_user_id: str
    requested_by_username: str
    status: AnalysisRunStatus
    total_designs: int
    processed_designs: int
    successful_designs: int
    failed_designs: int
    current_design_id: str | None = None
    current_analysis_type: str | None = None
    error_message: str | None = None
    trigger_source: str
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AnalysisRunMutationResponse(BaseModel):
    created: bool
    run: AnalysisRunResponse


class AnalysisRunCollectionResponse(BaseModel):
    items: list[AnalysisRunResponse]


class AnalysisRunEventResponse(BaseModel):
    id: int
    run_id: str
    event_type: AnalysisRunEventType
    level: str
    message: str
    analysis_type: str | None = None
    design_id: str | None = None
    current_index: int | None = None
    total_designs: int | None = None
    duration_seconds: float | None = None
    exit_code: int | None = None
    created_at: str | None = None


class AnalysisRunEventCollectionResponse(BaseModel):
    items: list[AnalysisRunEventResponse]


class AnalysisRunRequest(BaseModel):
    owner: str | None = None
    project_name: str | None = None
    project_ref: str | None = None
    analysis_variant: str | None = None
    batch_id: str | None = None
    batch_index: int | None = None
    batch_total: int | None = None
    notify_on_completion: bool | None = None

    @model_validator(mode="after")
    def validate_target(self) -> "AnalysisRunRequest":
        if self.project_ref:
            return self
        if self.owner and self.project_name:
            return self
        raise ValueError("Debes indicar project_ref o owner + project_name")
