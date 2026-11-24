import httpx
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth
from app.auth import CurrentUser, require_roles
from app.main import app, http_error
from starlette.exceptions import HTTPException as StarletteHTTPException

USER_ID = "11111111-1111-1111-1111-111111111111"


def fake_supabase(role="patient", doctor_status=None, token_ok=True, profile=True):
    """Stand-in for app.auth.supabase_get: answers like Supabase would."""

    async def fake(path, token, params=None):
        if path == "/auth/v1/user":
            if not token_ok:
                return httpx.Response(401, json={"msg": "bad jwt"})
            return httpx.Response(200, json={"id": USER_ID, "email": "a@b.test"})
        if path == "/rest/v1/profiles":
            rows = [{"full_name": "Test User", "role": role, "hospital_id": None}] if profile else []
            return httpx.Response(200, json=rows)
        if path == "/rest/v1/doctors":
            rows = [{"status": doctor_status}] if doctor_status else []
            return httpx.Response(200, json=rows)
        raise AssertionError(f"unexpected call {path}")

    return fake


@pytest.fixture
def client():
    return TestClient(app)


AUTH = {"Authorization": "Bearer abc"}


def test_health_is_public(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_me_without_token_is_401_with_error_envelope(client):
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_me_with_bad_token_is_401(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(token_ok=False))
    assert client.get("/auth/me", headers=AUTH).status_code == 401


def test_me_returns_role_and_never_the_token(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(role="patient"))
    r = client.get("/auth/me", headers=AUTH)
    assert r.status_code == 200
    assert r.json()["role"] == "patient"
    assert "token" not in r.json()


def test_account_without_profile_is_403(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(profile=False))
    assert client.get("/auth/me", headers=AUTH).status_code == 403


def test_pending_doctor_can_see_status_via_me(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(role="doctor", doctor_status="pending"))
    assert client.get("/auth/me", headers=AUTH).json()["doctor_status"] == "pending"


# --- role guard, tested on a tiny throwaway app ---------------------------------

guard_app = FastAPI()
guard_app.add_exception_handler(StarletteHTTPException, http_error)


@guard_app.get("/doctor-only")
def doctor_only(user: CurrentUser = Depends(require_roles("doctor"))):
    return {"ok": True}


@pytest.mark.parametrize(
    "role,status,expected",
    [
        ("doctor", "approved", 200),
        ("doctor", "pending", 403),   # unapproved doctors get no clinical access
        ("doctor", "rejected", 403),
        ("patient", None, 403),       # wrong role
        ("nurse", None, 403),
    ],
)
def test_require_roles(monkeypatch, role, status, expected):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(role=role, doctor_status=status))
    r = TestClient(guard_app).get("/doctor-only", headers=AUTH)
    assert r.status_code == expected
