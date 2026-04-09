# Arquitectura propuesta para ejecuciones asíncronas de proyectos

## Objetivo

Permitir que un proyecto se ejecute en segundo plano aunque el usuario cambie de pantalla, recargue la página o navegue por la aplicación, y permitir además varias ejecuciones simultáneas para distintos proyectos.

La solución también debe dejar preparada la base para:

- mostrar estado en tiempo real en dashboard y detalle de proyecto
- reintentar ejecuciones fallidas
- conservar logs e historial
- emitir notificaciones dentro de la app
- añadir correo más adelante sin rehacer la arquitectura

## Situación actual en ATOM

Hoy la ejecución está acoplada a la petición HTTP abierta por el navegador:

- El frontend abre un `EventSource` contra [`backend/app/api/routes/analysis.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/api/routes/analysis.py).
- Esa ruta llama a `stream_analysis(...)` en [`backend/app/services/analysis.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/services/analysis.py).
- Dentro de esa función se lanza `subprocess.Popen(...)` con `Rscript` y se van emitiendo eventos SSE línea a línea.
- El estado del proyecto no se persiste como "job"; solo se calcula por archivos existentes en [`backend/app/services/project_inventory.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/services/project_inventory.py).

## Problemas del enfoque actual

1. La ejecución depende de una conexión activa del navegador.
2. No existe una cola de trabajos ni un identificador de ejecución persistente.
3. No hay un estado real de "queued", "running", "failed" o "completed".
4. El dashboard solo conoce estados derivados de archivos (`empty`, `configured`, `results`), no procesos en curso.
5. No hay un worker separado del servidor web.
6. La futura notificación por app o correo no tiene todavía una fuente de verdad estable.

## Qué significa cada pieza

### FastAPI

Es solo la API web. Debe recibir la petición de "ejecutar proyecto", validarla, registrar el trabajo y devolver respuesta rápida. No debería quedarse ejecutando el análisis pesado dentro de la propia request.

### Redis

Es un almacén en memoria muy usado para colas y mensajería. Sirve para guardar trabajos pendientes y repartirlos a workers. Es rápido, pero añade otra infraestructura al despliegue.

### RQ

`RQ` significa `Redis Queue`. Es una librería Python sencilla que usa Redis como backend de cola. Permite hacer:

- enqueue de trabajos
- workers separados
- reintentos
- consulta básica de estado

Es bastante más simple que Celery.

### Worker separado

Es un proceso independiente del backend web. Su única función es recoger trabajos pendientes y ejecutarlos. Si el usuario cierra el navegador, el worker sigue trabajando porque no depende de la sesión web.

## Recomendación para ATOM

### Recomendación corta

Sí a separar `API` y `worker`.

No empezaría con `Redis + RQ` en la primera iteración de ATOM.

Empezaría con:

- `FastAPI`
- `PostgreSQL`
- tabla propia de ejecuciones
- worker Python separado
- SSE o polling para refrescar estado y logs

### Por qué no empezaría por Redis + RQ

Porque ahora mismo ATOM ya tiene:

- PostgreSQL montado
- Docker Compose preparado
- persistencia de actividad y proyectos
- una carga funcional que parece de laboratorio interno, no de alto volumen masivo

Meter Redis desde el primer paso añade:

- un servicio más en `docker-compose`
- configuración nueva
- persistencia adicional de jobs
- más puntos de fallo

Y, aun con Redis, seguiríais necesitando persistir en PostgreSQL el historial, el estado visible en UI y las notificaciones. Es decir, Redis no sustituye vuestro modelo de datos; solo añade un transporte de cola.

### Cuándo sí tendría sentido Redis + RQ

Tiene sentido si esperáis:

- muchas ejecuciones concurrentes
- prioridad de colas
- workers distribuidos en varios nodos
- retries más sofisticados
- aislamiento fuerte entre tipos de trabajo

Si ATOM llega a ese punto, la migración será razonable siempre que primero diseñéis bien el modelo de `analysis_runs`.

## Arquitectura recomendada v1

### Componentes

1. `FastAPI API`
2. `PostgreSQL` como fuente de verdad
3. `Analysis worker` como proceso independiente
4. `Frontend` consultando estado y logs por job

### Flujo

1. El usuario pulsa "Ejecutar proyecto".
2. El backend crea un registro `analysis_run` con estado `queued`.
3. El backend devuelve `202 Accepted` con `run_id`.
4. El frontend redirige a la vista de ejecución usando ese `run_id`.
5. El worker detecta el job pendiente, lo bloquea y lo pasa a `running`.
6. El worker ejecuta los análisis R Markdown y va guardando progreso y logs.
7. El frontend consulta el estado o se suscribe a eventos SSE del `run_id`.
8. Al terminar, el worker marca `completed` o `failed`.
9. El dashboard y el detalle del proyecto reflejan el estado persistido.

## Modelo de datos propuesto

### Tabla `internal.analysis_runs`

Campos mínimos recomendados:

- `id uuid primary key`
- `project_id uuid not null`
- `requested_by_user_id uuid not null`
- `status text not null`
- `queue_position integer null`
- `total_designs integer not null default 0`
- `processed_designs integer not null default 0`
- `successful_designs integer not null default 0`
- `failed_designs integer not null default 0`
- `current_design_id text null`
- `current_analysis_type text null`
- `started_at timestamptz null`
- `finished_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `error_message text null`
- `trigger_source text not null default 'manual'`

Estados:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

### Tabla `internal.analysis_run_logs`

Campos mínimos:

- `id bigint generated always as identity primary key`
- `run_id uuid not null`
- `level text not null`
- `message text not null`
- `design_id text null`
- `analysis_type text null`
- `created_at timestamptz not null default now()`

Esta tabla evita perder la salida cuando el usuario cambia de página.

### Opcional: tabla `internal.analysis_notifications`

No hace falta para la primera fase si reutilizáis `dashboard_activity`, pero sí puede ser útil si luego queréis:

- notificaciones no leídas
- bandeja de notificaciones
- email pendiente/enviado/error

## API propuesta

### `POST /api/analysis/runs`

Responsabilidad:

- validar que el usuario puede ejecutar el proyecto
- impedir duplicados si ya hay una ejecución activa para ese proyecto
- crear el job
- devolver `run_id`

Respuesta:

```json
{
  "run_id": "uuid",
  "status": "queued"
}
```

### `GET /api/analysis/runs/{run_id}`

Devuelve:

- estado actual
- contadores
- timestamps
- diseño activo
- error si lo hubo

### `GET /api/analysis/runs/{run_id}/logs`

Devuelve logs persistidos. Puede paginarse.

### `GET /api/analysis/runs/{run_id}/stream`

Opcional. SSE por `run_id`, ya no para ejecutar, sino solo para observar.

### `GET /api/projects/{ref}/analysis-runs`

Sirve para:

- mostrar historial en el proyecto
- mostrar si hay una ejecución activa al volver a entrar

## Worker propuesto

### Responsabilidades

- buscar jobs `queued`
- bloquear uno de forma segura
- ejecutar el pipeline
- escribir logs y progreso
- actualizar el estado final

### Cómo reclamar jobs en PostgreSQL

La forma correcta es usar una operación tipo:

- `SELECT ... FOR UPDATE SKIP LOCKED`

Con eso varios workers pueden coexistir sin cogerse el mismo job.

### Bucle conceptual del worker

1. Buscar un `analysis_run` en `queued`.
2. Marcarlo como `running` con `started_at`.
3. Ejecutar cada fila válida del Excel.
4. Insertar logs en `analysis_run_logs`.
5. Actualizar progreso tras cada `designID`.
6. Limpiar resultados.
7. Marcar el job como `completed` o `failed`.

## Cambios de frontend

### Dashboard derecho

Ahora mismo el panel de proyectos usa `status` basado en archivos. Habría que extenderlo para mostrar también:

- `queued`
- `running`
- `last_run_status`
- `last_run_updated_at`

Comportamiento deseado:

- si hay un job en `queued`, badge "En cola"
- si hay un job en `running`, badge "Procesando" y animación de loading
- si terminó bien, mantener "Resultados listos"
- si falló, badge "Error"

### Página de detalle de proyecto

Antes de lanzar una ejecución:

- botón "Ejecutar proyecto"

Durante ejecución:

- botón deshabilitado o "Ejecutándose"
- barra de progreso real
- acceso a logs
- referencia al `run_id`

Si el usuario vuelve más tarde:

- la página debe reconstruirse desde `GET /api/projects/{ref}/analysis-runs`
- no desde estado local del navegador

### Página de ejecución

La ruta actual puede mantenerse, pero debería abrirse con `run_id`, no disparar la ejecución por sí misma.

Mejor:

- crear el job desde el botón del proyecto
- navegar luego a `/dashboard/project-execution/{runId}`

Así la página representa una ejecución ya existente, no una request viva.

## Cómo encaja con notificaciones futuras

Cuando el worker cambia a `completed` o `failed`, se puede:

1. insertar un evento en `dashboard_activity`
2. insertar una notificación interna
3. disparar un proceso de email si el usuario lo tiene activo

Eso deja la arquitectura lista para:

- campana de notificaciones en la app
- toast al volver a la aplicación
- email de finalización o error

## Propuesta de fases

### Fase 1

Objetivo: desacoplar ejecución del navegador.

Cambios:

- crear tabla `analysis_runs`
- crear tabla `analysis_run_logs`
- crear `POST /api/analysis/runs`
- crear worker separado
- mover la lógica de `stream_analysis` a una función reutilizable por el worker
- convertir el SSE actual en stream de observación de `run_id`

### Fase 2

Objetivo: reflejar estado real en UI.

Cambios:

- extender tipos de proyecto y dashboard
- mostrar `queued/running/failed/completed`
- permitir reabrir ejecución en curso
- historial de ejecuciones por proyecto

### Fase 3

Objetivo: notificaciones.

Cambios:

- notificaciones internas persistidas
- contador de no leídas
- preferencias por usuario
- email en finalización/error

### Fase 4

Objetivo: escalado.

Si la carga crece, valorar:

- Redis
- RQ o Dramatiq
- colas por prioridad
- más de un worker

## Decisión recomendada

### Opción A: FastAPI + PostgreSQL + Worker propio

Pros:

- encaja con el stack actual
- menos infraestructura
- persistencia real desde el primer día
- más fácil de integrar con dashboard, historial y notificaciones

Contras:

- hay que implementar la mecánica de cola y worker
- menos "plug and play" que RQ

### Opción B: FastAPI + Redis + RQ + Worker

Pros:

- sencilla de entender
- workers y retries ya resueltos
- buena separación entre web y trabajos

Contras:

- añade Redis
- el estado visible al usuario seguirá teniendo que vivir en PostgreSQL
- mete complejidad operativa antes de validar la necesidad

### Mi recomendación

Para ATOM, empezaría con la opción A.

Es la mejor relación entre complejidad, robustez y encaje con el código actual.

Si en unas semanas veis que:

- hay mucha concurrencia
- necesitáis colas con prioridad
- queréis más workers
- queréis scheduling más avanzado

entonces tiene sentido introducir Redis y mover la capa de despacho, pero no antes.

## Impacto técnico en el código actual

Las piezas que tocaría en una primera implementación serían:

- [`backend/app/services/analysis.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/services/analysis.py)
- [`backend/app/api/routes/analysis.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/api/routes/analysis.py)
- [`backend/app/services/project_inventory.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/services/project_inventory.py)
- [`backend/app/services/dashboard.py`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/backend/app/services/dashboard.py)
- [`frontend/hooks/use-project-analysis-stream.ts`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/frontend/hooks/use-project-analysis-stream.ts)
- [`frontend/components/projects/project-execution-page.tsx`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/frontend/components/projects/project-execution-page.tsx)
- [`frontend/components/dashboard/project-explorer.tsx`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/frontend/components/dashboard/project-explorer.tsx)
- [`docker-compose.yml`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/docker-compose.yml)
- [`docker/postgres/initdb/001_atom_base.sql`](/Users/gabrieldt/Desktop/University/TFG/z_GabrielDT/ATOM/docker/postgres/initdb/001_atom_base.sql)

## Siguiente paso recomendado

No implementaría todavía Redis ni RQ.

El siguiente paso correcto es preparar un primer cambio técnico con este alcance:

1. añadir tablas `analysis_runs` y `analysis_run_logs`
2. crear un worker Python separado del backend web
3. cambiar el botón de ejecución para crear un job en vez de lanzar directamente el análisis
4. hacer que la página de ejecución lea un `run_id` persistente
5. mostrar `queued` y `running` en dashboard y detalle de proyecto

Con eso ya tendréis ejecución en segundo plano real y una base limpia para notificaciones posteriores.
