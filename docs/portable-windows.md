# Windows y modo portable

## Scripts disponibles

En Linux/macOS los scripts actuales son:

- `./scripts/up.sh`: levanta contenedores
- `./scripts/down.sh`: detiene contenedores
- `./scripts/rebuild.sh`: reconstruye imagenes
- `./scripts/logs.sh`: muestra logs
- `./scripts/test.sh`: ejecuta checks
- `./scripts/frontend-local.sh`: frontend fuera de Docker

En Windows hay equivalentes en PowerShell:

- `.\scripts\windows\up.ps1`
- `.\scripts\windows\down.ps1`
- `.\scripts\windows\rebuild.ps1`
- `.\scripts\windows\logs.ps1`
- `.\scripts\windows\test.ps1`
- `.\scripts\windows\frontend-local.ps1`

Aliases equivalentes:

- `.\scripts\windows\start.ps1`: igual que `up.ps1`
- `.\scripts\windows\stop.ps1`: igual que `down.ps1`

Tambien hay wrappers `.cmd` para evitar problemas de execution policy:

```bat
scripts\windows\up.cmd
scripts\windows\start.cmd
scripts\windows\down.cmd
scripts\windows\stop.cmd
scripts\windows\rebuild.cmd
scripts\windows\logs.cmd
scripts\windows\test.cmd
scripts\windows\frontend-local.cmd
```

## Uso normal en Windows

1. Instalar Docker Desktop.
2. Copiar `.env.example` a `.env.local`.
3. Editar `.env.local`.
4. Levantar:

```powershell
.\scripts\windows\up.ps1
```

Modo frontend local:

```powershell
$env:ATOM_FRONTEND_MODE = "local"
.\scripts\windows\rebuild.ps1
.\scripts\windows\up.ps1
.\scripts\windows\frontend-local.ps1
```

## Estudio de portabilidad en disco externo

Conclusion corta: el proyecto puede vivir en un disco externo, pero no es una aplicacion 100% portable por si sola. Cada equipo sigue necesitando Docker Desktop instalado y configurado. Sin Docker en el equipo anfitrion, la app no arranca.

Lo que si puede ser portable:

- Codigo fuente del proyecto.
- `.env.local`.
- Datos generados dentro del repo (`data/`, `projects/`) si estan en el disco externo.
- Base PostgreSQL y caches Docker si se usa modo portable.

Lo que no viaja automaticamente:

- Docker Desktop.
- WSL2 o backend de virtualizacion de Docker en Windows.
- Imagenes Docker ya descargadas o construidas, salvo que se exporten/importen.
- Volumenes nombrados normales de Docker (`atom_postgres_data`, `frontend_node_modules`, `frontend_next_cache`), porque viven dentro del almacenamiento local de Docker Desktop.

## Modo portable

Para guardar PostgreSQL y caches de frontend dentro del proyecto, usa:

```powershell
.\scripts\windows\up.ps1 -Portable
```

Esto activa `docker-compose.portable.yml` y guarda datos en:

```text
.atom-portable/
```

Para parar el mismo stack:

```powershell
.\scripts\windows\down.ps1 -Portable
```

Recomendacion para disco externo:

- Mantener ruta corta, por ejemplo `E:\ATOM`.
- Intentar que Windows mantenga misma letra de unidad.
- No desconectar disco con contenedores arrancados.
- Excluir `.atom-portable/` de Git.
- Si hay errores raros de permisos o lentitud, copiar temporalmente a disco interno para desarrollo y usar disco externo solo para transporte.

## Riesgos detectados

- Rendimiento: Docker con bind mounts desde USB puede ir mucho mas lento, sobre todo Next.js y PostgreSQL.
- Unidad cambiante: si el disco pasa de `E:` a `F:`, Docker puede perder referencias hasta relanzar desde la ruta nueva.
- Base de datos: PostgreSQL no tolera desconexiones bruscas del disco.
- Credenciales: `.env.local` contiene secretos; si viaja en disco externo, debe tratarse como dato sensible.

## Alternativa mas segura para compartir

Para trabajo entre companeros, opcion mas estable:

1. Llevar codigo en Git.
2. Cada equipo instala Docker Desktop.
3. Cada equipo crea su `.env.local`.
4. Datos importantes se exportan/importan con backups de PostgreSQL, no copiando volumenes vivos.

El modo portable sirve para demo o transporte controlado. Para desarrollo diario compartido, Git + Docker local sigue siendo mejor.
