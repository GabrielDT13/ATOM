from __future__ import annotations

from contextlib import contextmanager
from hashlib import sha256
from typing import Any, Iterator
from urllib.parse import quote_plus

from backend.app.core.config import get_settings


def _build_database_dsn() -> str:
    settings = get_settings()
    if settings.database_url:
        return settings.database_url

    user = quote_plus(settings.postgres_user)
    password = quote_plus(settings.postgres_password)
    host = settings.postgres_host
    port = settings.postgres_port
    database = settings.postgres_db
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


@contextmanager
def get_db_connection(*, autocommit: bool = False) -> Iterator[Any]:
    from psycopg import connect
    from psycopg.rows import dict_row

    connection = connect(_build_database_dsn(), row_factory=dict_row, autocommit=autocommit)
    try:
        yield connection
    finally:
        connection.close()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        connection.commit()
    return [dict(row) for row in rows]


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    rows = fetch_all(query, params)
    return rows[0] if rows else None


def execute(query: str, params: tuple[Any, ...] = ()) -> None:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
        connection.commit()


def fetch_value(query: str, params: tuple[Any, ...] = ()) -> Any:
    row = fetch_one(query, params)
    if not row:
        return None
    return next(iter(row.values()))


def execute_returning(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        connection.commit()
    return [dict(row) for row in rows]


def execute_rowcount(query: str, params: tuple[Any, ...] = ()) -> int:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rowcount = cursor.rowcount
        connection.commit()
    return rowcount


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
