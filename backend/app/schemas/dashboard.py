from __future__ import annotations

from typing import Literal

from backend.app.schemas.analysis import AnalysisRunResponse
from pydantic import BaseModel

DashboardProjectStatus = Literal["configured", "empty", "results"]
DashboardActivityKind = Literal["analysis", "project", "result"]
DashboardActivityStatus = Literal["info", "running", "success", "warning"]
DashboardExampleKind = Literal["template", "counts", "other"]


class DashboardSummaryResponse(BaseModel):
    total_projects: int
    results_ready: int
    pending_analysis: int
    empty_projects: int
    total_files: int
    example_files: int
    workflow_count: int
    distinct_owners: int
    completion_rate: int


class DashboardTimelinePointResponse(BaseModel):
    bucket_start: str
    label: str
    completed_analyses: int
    total_events: int


class DashboardActivitySummaryResponse(BaseModel):
    total_events: int
    analyses_started: int
    analyses_completed: int
    analyses_failed: int
    project_events: int
    last_event_at: str | None = None


class DashboardStatusBreakdownResponse(BaseModel):
    status: DashboardProjectStatus
    label: str
    value: int


class DashboardProjectHighlightResponse(BaseModel):
    access_role: str | None = None
    active_run: AnalysisRunResponse | None = None
    file_count: int
    highlight_files: list[str]
    name: str
    owner: str
    result_count: int
    status: DashboardProjectStatus
    template_file: str | None = None
    updated_at: str


class DashboardActivityItemResponse(BaseModel):
    kind: DashboardActivityKind
    status: DashboardActivityStatus
    title: str
    description: str
    created_at: str
    project_name: str | None = None
    owner: str | None = None
    analysis_type: str | None = None
    design_id: str | None = None


class DashboardWorkflowCardResponse(BaseModel):
    key: str
    title: str
    description: str
    image_path: str
    script_name: str
    project_matches: int


class DashboardExampleFileResponse(BaseModel):
    title: str
    description: str
    kind: DashboardExampleKind
    name: str
    relative_path: str
    size_bytes: int
    updated_at: str
    public_url: str


class DashboardFileBreakdownResponse(BaseModel):
    additional: int
    results: int
    templates: int


class DashboardAccessSummaryResponse(BaseModel):
    editable_projects: int
    owned_projects: int
    shared_projects: int


class DashboardQuickStartStepResponse(BaseModel):
    description: str
    step: int
    title: str


class DashboardOverviewResponse(BaseModel):
    summary: DashboardSummaryResponse
    access_summary: DashboardAccessSummaryResponse
    activity_summary: DashboardActivitySummaryResponse
    activity_timeline: list[DashboardTimelinePointResponse]
    file_breakdown: DashboardFileBreakdownResponse
    status_breakdown: list[DashboardStatusBreakdownResponse]
    featured_projects: list[DashboardProjectHighlightResponse]
    recent_activity: list[DashboardActivityItemResponse]
    quick_start_steps: list[DashboardQuickStartStepResponse]
    workflows: list[DashboardWorkflowCardResponse]
    example_library: list[DashboardExampleFileResponse]
