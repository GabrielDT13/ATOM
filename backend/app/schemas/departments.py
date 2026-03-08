from __future__ import annotations

from pydantic import BaseModel


class DepartmentResponse(BaseModel):
    id: str
    name: str
    slug: str
