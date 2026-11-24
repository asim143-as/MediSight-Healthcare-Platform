from typing import Optional

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import audit
from .auth import CurrentUser, get_current_user
from .config import get_settings
from .patients import router as patients_router
from .predictions import router as predictions_router
from .reports import router as reports_router
from .reviews import router as reviews_router

app = FastAPI(
    title="MediSight AI Backend",
    description="Gateway between the frontend, the ML/OCR/RAG services and the Supabase database.",
    version="0.1.0",
)

# The frontend sends the token in a header (not cookies), so credentials stay off.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_CODES = {401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "conflict", 413: "file_too_large",
          415: "unsupported_file_type", 502: "upstream_error", 503: "service_unavailable"}


# One error shape for every failure: {"error": {"code", "message"}}.
# The frontend only needs to handle a single format.
@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    audit.note(request, reason=exc.detail)
    body = {"error": {"code": _CODES.get(exc.status_code, "error"), "message": exc.detail}}
    return JSONResponse(body, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    audit.note(request, reason="invalid request data")
    details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
    body = {"error": {"code": "validation_error", "message": "Invalid request data", "details": details}}
    return JSONResponse(body, status_code=422)


@app.middleware("http")
async def audit_requests(request: Request, call_next):
    """Runs around EVERY request. Records the outcome after the endpoint (and any denial) has run."""
    try:
        response = await call_next(request)
    except Exception:
        await audit.record(request, 500)     # an unhandled crash is still an auditable event
        raise
    await audit.record(request, response.status_code)
    return response


app.include_router(audit.router)
app.include_router(patients_router)
app.include_router(predictions_router)
app.include_router(reports_router)
app.include_router(reviews_router)


class MeResponse(BaseModel):
    id: str
    email: Optional[str]
    full_name: str
    role: str
    hospital_id: Optional[str]
    doctor_status: Optional[str]


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


@app.get("/auth/me", response_model=MeResponse, tags=["auth"])
async def me(user: CurrentUser = Depends(get_current_user)):
    """Who am I? Returns the caller's role so the UI can pick the right dashboard."""
    return user  # response_model drops `token`, which must never be echoed back
