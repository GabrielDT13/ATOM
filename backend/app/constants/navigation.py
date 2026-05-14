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
    SidebarLinkConfig(name="Públicos", url="/dashboard/public-projects"),
    SidebarLinkConfig(name="Informes", url="/dashboard/reports"),
    SidebarLinkConfig(name="Equipos", url="/dashboard/teams"),
    SidebarLinkConfig(name="Entidades", url="/dashboard/entities", admin_only=True),
    SidebarLinkConfig(name="Perfil", url="/dashboard/profile"),
    SidebarLinkConfig(name="Usuarios", url="/dashboard/users"),
)
