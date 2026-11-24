from typing import Optional

import httpx
from fastapi import HTTPException

from .config import get_settings


async def supabase_get(path: str, token: str, params: Optional[dict] = None) -> httpx.Response:
    """GET a Supabase endpoint *as the logged-in user*.

    We send the user's own token, so Postgres Row Level Security decides what
    rows come back. The backend never uses a master key for patient data.
    """
    s = get_settings()
    headers = {"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}"}
    # ponytail: new client per call; share one via app lifespan if throughput matters.
    async with httpx.AsyncClient(base_url=s.supabase_url, timeout=10) as client:
        try:
            return await client.get(path, headers=headers, params=params)
        except httpx.HTTPError:
            raise HTTPException(502, "Could not reach the database service")
