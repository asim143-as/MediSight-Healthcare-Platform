"""Small helpers shared by every router that reads/writes through Supabase."""
from typing import Any

import httpx
from fastapi import HTTPException

from . import supabase as sb


def first(x: Any) -> Any:
    """PostgREST returns a 1:1 embed as an object, but be tolerant of a list."""
    return (x[0] if x else None) if isinstance(x, list) else x


def ok_rows(r: httpx.Response) -> list:
    if r.status_code != 200:
        raise HTTPException(502, "Could not read from the database")
    return r.json()


async def require_patient(patient_id: str, token: str) -> None:
    """RLS only returns patients this user may see; empty means 'not yours' OR 'doesn't exist'.
    We answer 404 in both cases so nobody can probe which patient IDs exist."""
    rows = ok_rows(await sb.supabase_get("/rest/v1/patients", token, {"id": f"eq.{patient_id}", "select": "id"}))
    if not rows:
        raise HTTPException(404, "Patient not found")


def write_failed(r: httpx.Response) -> None:
    """Turn a failed insert into the right API error (RLS denial -> 403)."""
    if r.status_code in (401, 403):
        raise HTTPException(403, "You are not allowed to save this record")
    if r.status_code >= 400:
        raise HTTPException(502, "Could not save to the database")
