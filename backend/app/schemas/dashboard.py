from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

DashboardProjectStatus = Literal["configured", "empty", "results"]
DashboardActivityKind = Literal["project", "result", "sample"]
DashboardSampleKind = Literal["template", "counts", "other"]


class DashboardSummaryResponse(BaseModel):
    total_projects: int
    results_ready: int
    pending_analysis: int
    empty_projects: int
    total_files: int
    sample_files: int
    workflow_count: int
    distinct_owners: int
    completion_rate: int


class DashboardTimelinePointResponse(BaseModel):
    label: str
    total_projects: int
    results_ready: int


class DashboardStatusBreakdownResponse(BaseModel):
    status: DashboardProjectStatus
    label: str
    value: int


class DashboardProjectHighlightResponse(BaseModel):
    access_role: str | None = None
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
    title: str
    description: str
    created_at: str


class DashboardWorkflowCardResponse(BaseModel):
    key: str
    title: str
    description: str
    image_path: str
    script_name: str
    project_matches: int


class DashboardSampleFileResponse(BaseModel):
    kind: DashboardSampleKind
    name: str
    relative_path: str
    size_bytes: int
    updated_at: str


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
    activity_timeline: list[DashboardTimelinePointResponse]
    file_breakdown: DashboardFileBreakdownResponse
    status_breakdown: list[DashboardStatusBreakdownResponse]
    featured_projects: list[DashboardProjectHighlightResponse]
    recent_activity: list[DashboardActivityItemResponse]
    quick_start_steps: list[DashboardQuickStartStepResponse]
    workflows: list[DashboardWorkflowCardResponse]
    sample_library: list[DashboardSampleFileResponse]
