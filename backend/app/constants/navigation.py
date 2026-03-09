from __future__ import annotations

from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True, slots=True)
class SidebarLinkConfig:
    name: str
    url: str
    admin_only: bool = False


SIDEBAR_LEFT_TITLE: Final[str] = "Navegación"

SIDEBAR_LEFT_LINKS: Final[tuple[SidebarLinkConfig, ...]] = (
    SidebarLinkConfig(name="Dashboard", url="/dashboard"),
    SidebarLinkConfig(name="Proyectos", url="/dashboard/projects"),
    SidebarLinkConfig(name="Perfil", url="/dashboard/profile"),
    SidebarLinkConfig(name="Usuarios", url="/dashboard/users"),
)
