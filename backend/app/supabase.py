from typing import Optional

import httpx
from fastapi import HTTPException

from .config import get_settings


async def _send(method: str, path: str, token: str, params: Optional[dict], json: Optional[dict],
                extra_headers: Optional[dict] = None) -> httpx.Response:
    s = get_settings()
    headers = {"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}", **(extra_headers or {})}
    # ponytail: new client per call; share one via app lifespan if throughput matters.
    async with httpx.AsyncClient(base_url=s.supabase_url, timeout=10) as client:
        try:
            return await client.request(method, path, headers=headers, params=params, json=json)
        except httpx.HTTPError:
            raise HTTPException(502, "Could not reach the database service")


async def supabase_get(path: str, token: str, params: Optional[dict] = None) -> httpx.Response:
    """GET a Supabase endpoint *as the logged-in user*.

    We send the user's own token, so Postgres Row Level Security decides what
    rows come back. The backend never uses a master key for patient data.
    """
    return await _send("GET", path, token, params, None)


async def supabase_post(path: str, token: str, json: dict) -> httpx.Response:
    """INSERT a row as the logged-in user (RLS checks the insert) and return it."""
    return await _send("POST", path, token, None, json, {"Prefer": "return=representation"})
