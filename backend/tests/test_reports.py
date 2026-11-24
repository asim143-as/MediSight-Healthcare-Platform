from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app import ocr, reports
from app import supabase as sb
from app.auth import CurrentUser, get_current_user
from app.main import app

PATIENT = "22222222-2222-2222-2222-222222222222"
REPORT_ID = "88888888-8888-8888-8888-888888888888"
USER_ID = "u-doctor"
PDF = b"%PDF-1.4\n%fake pdf bytes for testing"
PNG = b"\x89PNG\r\n\x1a\n" + b"x" * 20


class FakeDB:
    def __init__(self):
        self.patient_visible, self.insert_status = True, 201
        self.stored, self.deleted = {}, []
        self.reports_rows = []          # what a GET on /rest/v1/reports returns
        self.inserted = []
        self.service_calls = []         # (method, path, params, json)

    async def get(self, path, token, params=None):
        if path == "/rest/v1/patients":
            return httpx.Response(200, json=[{"id": PATIENT}] if self.patient_visible else [])
        if path == "/rest/v1/reports":
            return httpx.Response(200, json=self.reports_rows)
        raise AssertionError(path)

    async def post(self, path, token, json):
        self.inserted.append((path, json))
        if self.insert_status >= 400:
            return httpx.Response(self.insert_status, json={"code": "42501"})
        return httpx.Response(201, json=[{**json, "id": REPORT_ID, "status": "uploaded", "error_message": None,
                                          "created_at": "2026-11-25T10:00:00+00:00", "processed_at": None}])

    async def upload(self, path, data, content_type):
        self.stored[path] = (data, content_type)

    async def delete(self, path):
        self.deleted.append(path)

    async def signed(self, path, seconds=300):
        return f"https://files.test/{path}?token=abc"

    async def service(self, method, path, params=None, json=None, content=None, headers=None):
        self.service_calls.append((method, path, params, json))
        return httpx.Response(200, json=[])

    def statuses(self):
        return [c[3]["status"] for c in self.service_calls if c[0] == "PATCH"]

    def last_patch(self):
        return [c for c in self.service_calls if c[0] == "PATCH"][-1][3]


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(sb, "supabase_get", fake.get)
    monkeypatch.setattr(sb, "supabase_post", fake.post)
    monkeypatch.setattr(sb, "storage_upload", fake.upload)
    monkeypatch.setattr(sb, "storage_delete", fake.delete)
    monkeypatch.setattr(sb, "storage_signed_url", fake.signed)
    monkeypatch.setattr(sb, "service_request", fake.service)
    monkeypatch.setattr(reports, "get_settings", lambda: SimpleNamespace(ocr_service_url=""))
    return fake


@pytest.fixture
def ocr_on(monkeypatch):
    monkeypatch.setattr(reports, "get_settings", lambda: SimpleNamespace(ocr_service_url="http://ocr.test"))


def login(role="doctor", status="approved"):
    user = CurrentUser(USER_ID, "d@x.test", "Dr X", role, None, status if role == "doctor" else None, "tok")
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture(autouse=True)
def reset_login():
    login()
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def upload(data=PDF, filename="lab.pdf", content_type="application/pdf", patient=PATIENT):
    return client.post("/reports", data={"patient_id": patient}, files={"file": (filename, data, content_type)})


def test_upload_stores_file_under_generated_path_and_saves_record(db):
    r = upload()
    assert r.status_code == 201
    assert r.json()["status"] == "uploaded"
    assert "storage_path" not in r.json()                      # internal path never exposed
    (path, (data, mime)), = db.stored.items()
    assert path.startswith(f"{PATIENT}/") and path.endswith(".pdf") and mime == "application/pdf"
    _, row = db.inserted[0]
    assert row["uploaded_by"] == USER_ID and row["size_bytes"] == len(PDF) and row["storage_path"] == path


def test_png_is_accepted(db):
    assert upload(PNG, "scan.png", "image/png").status_code == 201


def test_file_pretending_to_be_pdf_is_rejected(db):
    r = upload(b"#!/bin/sh\nrm -rf /", "evil.pdf", "application/pdf")   # lies about its type
    assert r.status_code == 415
    assert db.stored == {} and db.inserted == []


def test_oversized_file_is_rejected_before_storing(db):
    r = upload(b"%PDF-" + b"0" * (reports.MAX_BYTES + 1))
    assert r.status_code == 413 and db.stored == {}


def test_hostile_filename_is_reduced_to_a_plain_name(db):
    upload(PDF, "../../etc/passwd.pdf")
    assert db.inserted[0][1]["original_filename"] == "passwd.pdf"
    assert ".." not in list(db.stored)[0]


def test_patient_not_visible_is_404_and_nothing_stored(db):
    db.patient_visible = False
    assert upload().status_code == 404
    assert db.stored == {} and db.inserted == []


def test_rls_denied_insert_is_403_and_file_is_cleaned_up(db):
    db.insert_status = 403
    assert upload().status_code == 403
    (path,) = db.stored
    assert db.deleted == [path]                                 # no orphan file left in storage


@pytest.mark.parametrize("role", ["nurse", "data_scientist"])
def test_other_roles_cannot_upload(db, role):
    login(role)
    assert upload().status_code == 403 and db.stored == {}


def test_patient_can_upload_own_report(db):
    login("patient")
    assert upload().status_code == 201


def test_without_ocr_configured_report_stays_uploaded(db):
    upload()
    assert db.service_calls == []


def test_ocr_success_saves_extracted_measurements(db, ocr_on, monkeypatch):
    async def fake_extract(data, filename, mime):
        return [{"name": "HbA1c", "value": 7.2, "unit": "%", "confidence": 0.9, "source_text": "HbA1c 7.2 %"}]
    monkeypatch.setattr(ocr, "extract", fake_extract)
    assert upload().status_code == 201
    assert db.statuses() == ["processing", "processed"]
    (_, path, _, rows), = [c for c in db.service_calls if c[0] == "POST"]
    assert path == "/rest/v1/report_measurements"
    assert rows[0]["report_id"] == REPORT_ID and rows[0]["value"] == 7.2 and "status" not in rows[0]
    # status is left to the DB default 'extracted': OCR can never self-verify a value


def test_invalid_ocr_rows_are_skipped_not_fatal(db, ocr_on, monkeypatch):
    async def fake_extract(data, filename, mime):
        return [{"name": "Hb", "value": 13.5, "unit": "g/dL"}, {"name": "bad", "value": "NaN-ish", "unit": ""}]
    monkeypatch.setattr(ocr, "extract", fake_extract)
    upload()
    assert db.last_patch()["status"] == "processed"
    assert db.last_patch()["error_message"] == "1 unreadable rows skipped"


def test_ocr_failure_marks_report_failed_with_generic_message(db, ocr_on, monkeypatch):
    async def boom(data, filename, mime):
        raise RuntimeError("secret internal stack detail")
    monkeypatch.setattr(ocr, "extract", boom)
    r = upload()
    assert r.status_code == 201                                  # the upload itself succeeded
    assert db.last_patch()["status"] == "failed"
    assert "secret" not in db.last_patch()["error_message"]


def test_list_reports(db):
    db.reports_rows = [{"id": REPORT_ID, "patient_id": PATIENT, "original_filename": "lab.pdf",
                        "content_type": "application/pdf", "size_bytes": 10, "status": "processed",
                        "error_message": None, "created_at": "2026-11-25T10:00:00+00:00", "processed_at": None}]
    r = client.get(f"/reports?patient_id={PATIENT}")
    assert r.status_code == 200 and r.json()[0]["status"] == "processed"


def test_report_detail_includes_measurements(db):
    db.reports_rows = [{"id": REPORT_ID, "patient_id": PATIENT, "original_filename": "lab.pdf",
                        "content_type": "application/pdf", "size_bytes": 10, "status": "processed",
                        "error_message": None, "created_at": "2026-11-25T10:00:00+00:00", "processed_at": None,
                        "report_measurements": [{"id": "99999999-9999-9999-9999-999999999999", "name": "HbA1c",
                                                 "value": 7.2, "unit": "%", "status": "extracted"}]}]
    r = client.get(f"/reports/{REPORT_ID}")
    assert r.status_code == 200 and r.json()["measurements"][0]["status"] == "extracted"


def test_hidden_or_missing_report_is_404(db):
    assert client.get(f"/reports/{REPORT_ID}").status_code == 404
    assert client.get(f"/reports/{REPORT_ID}/download").status_code == 404


def test_download_returns_short_lived_signed_url(db):
    db.reports_rows = [{"storage_path": f"{PATIENT}/abc.pdf"}]
    r = client.get(f"/reports/{REPORT_ID}/download")
    assert r.status_code == 200 and "token=" in r.json()["url"] and r.json()["expires_in"] == 300
