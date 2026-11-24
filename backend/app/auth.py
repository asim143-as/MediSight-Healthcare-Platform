from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase import supabase_get

bearer = HTTPBearer(auto_error=False)  # we raise our own 401 so the error format is consistent


@dataclass
class CurrentUser:
    id: str
    email: Optional[str]
    full_name: str
    role: str
    hospital_id: Optional[str]
    doctor_status: Optional[str]  # only set for doctors: pending / approved / rejected
    token: str                    # the caller's own token, reused to query the DB as them


async def get_current_user(request: Request,
                           creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> CurrentUser:
    """Who is calling? Ask Supabase Auth to validate the token, then load their profile."""
    if creds is None:
        raise HTTPException(401, "Missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    token = creds.credentials

    # 1. Is the token genuine and unexpired? Supabase Auth is the authority.
    r = await supabase_get("/auth/v1/user", token)
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    user = r.json()

    # 2. What role do they have? Read it from `profiles` (RLS lets users read their own row).
    r = await supabase_get(
        "/rest/v1/profiles", token,
        {"id": f"eq.{user['id']}", "select": "full_name,role,hospital_id"},
    )
    rows = r.json() if r.status_code == 200 else []
    if not rows:
        raise HTTPException(403, "No profile exists for this account")
    profile = rows[0]

    # 3. Doctors must be approved by an admin before they get clinical access.
    doctor_status = None
    if profile["role"] == "doctor":
        r = await supabase_get(
            "/rest/v1/doctors", token,
            {"user_id": f"eq.{user['id']}", "select": "status"},
        )
        drows = r.json() if r.status_code == 200 else []
        doctor_status = drows[0]["status"] if drows else "pending"

    current = CurrentUser(
        id=user["id"],
        email=user.get("email"),
        full_name=profile.get("full_name") or "",
        role=profile["role"],
        hospital_id=profile.get("hospital_id"),
        doctor_status=doctor_status,
        token=token,
    )
    request.state.user = current   # lets the audit middleware name the actor, even if a later check denies them
    return current


def require_roles(*roles: str):
    """Dependency factory: `Depends(require_roles("doctor", "hospital_admin"))`."""

    async def check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(403, "Your role cannot access this resource")
        if user.role == "doctor" and user.doctor_status != "approved":
            raise HTTPException(403, "Doctor account is not approved yet")
        return user

    return check
