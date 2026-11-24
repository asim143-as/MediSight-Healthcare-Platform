from typing import Optional, Union

import httpx
from fastapi import HTTPException

from .config import get_settings


async def _send(method: str, path: str, token: str, params: Optional[dict] = None,
                json: Union[dict, list, None] = None, content: Optional[bytes] = None,
                extra_headers: Optional[dict] = None, apikey: Optional[str] = None) -> httpx.Response:
    s = get_settings()
    headers = {"apikey": apikey or s.supabase_anon_key, "Authorization": f"Bearer {token}",
               **(extra_headers or {})}
    # ponytail: new client per call; share one via app lifespan if throughput matters.
    async with httpx.AsyncClient(base_url=s.supabase_url, timeout=30) as client:
        try:
            return await client.request(method, path, headers=headers, params=params,
                                        json=json, content=content)
        except httpx.HTTPError:
            raise HTTPException(502, "Could not reach the database service")


# ---- As the logged-in user: Row Level Security decides what is visible/allowed ----------

async def supabase_get(path: str, token: str, params: Optional[dict] = None) -> httpx.Response:
    """GET a Supabase endpoint *as the logged-in user*.

    We send the user's own token, so Postgres Row Level Security decides what
    rows come back. The backend never uses a master key for patient data reads.
    """
    return await _send("GET", path, token, params)


async def supabase_post(path: str, token: str, json: dict) -> httpx.Response:
    """INSERT a row as the logged-in user (RLS checks the insert) and return it."""
    return await _send("POST", path, token, json=json, extra_headers={"Prefer": "return=representation"})


async def supabase_patch(path: str, token: str, params: dict, json: dict) -> httpx.Response:
    """UPDATE rows as the logged-in user. RLS limits which rows match; no match returns []."""
    return await _send("PATCH", path, token, params, json, extra_headers={"Prefer": "return=representation"})


# ---- As the system: service-role key bypasses RLS. Use ONLY for narrow, deliberate jobs ----
# (private file storage, OCR results, report status). Never to read patient data for a user.

async def service_request(method: str, path: str, params: Optional[dict] = None,
                          json: Union[dict, list, None] = None, content: Optional[bytes] = None,
                          headers: Optional[dict] = None) -> httpx.Response:
    key = get_settings().supabase_service_role_key
    if not key:
        raise HTTPException(503, "File storage is not configured")
    return await _send(method, path, key, params, json, content, headers, apikey=key)


async def storage_upload(path: str, data: bytes, content_type: str) -> None:
    r = await service_request("POST", f"/storage/v1/object/reports/{path}", content=data,
                              headers={"Content-Type": content_type})
    if r.status_code >= 400:
        raise HTTPException(502, "Could not store the file")


async def storage_delete(path: str) -> None:
    await service_request("DELETE", f"/storage/v1/object/reports/{path}")


async def storage_signed_url(path: str, seconds: int = 300) -> str:
    """A temporary download link. It stops working after `seconds`."""
    r = await service_request("POST", f"/storage/v1/object/sign/reports/{path}", json={"expiresIn": seconds})
    if r.status_code != 200:
        raise HTTPException(502, "Could not create a download link")
    signed = r.json()["signedURL"]
    return signed if signed.startswith("http") else f"{get_settings().supabase_url}/storage/v1{signed}"
