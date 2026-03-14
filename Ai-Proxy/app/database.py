from contextlib import asynccontextmanager
from typing import AsyncIterator

import aiomysql

from app.config import settings

_pool: aiomysql.Pool | None = None


async def init_db_pool() -> None:
    global _pool
    if _pool is None:
        _pool = await aiomysql.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            db=settings.db_name,
            charset="utf8mb4",
            autocommit=True,
            minsize=2,
            maxsize=10,
        )


async def close_db_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
        _pool = None


@asynccontextmanager
async def get_db_connection() -> AsyncIterator[aiomysql.Connection]:
    if _pool is None:
        await init_db_pool()
    async with _pool.acquire() as conn:
        yield conn


async def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    async with get_db_connection() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, params)
            return await cur.fetchone()


async def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    async with get_db_connection() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, params)
            return await cur.fetchall()
