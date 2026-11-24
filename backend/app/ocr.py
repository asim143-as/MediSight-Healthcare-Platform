"""Client for the OCR / report-processing service (owned by Kanishk).

CONTRACT the OCR service must provide
-------------------------------------
POST {OCR_SERVICE_URL}/extract            (multipart/form-data, field name "file")
  -> 200 application/json
     {"measurements": [
        {"name": "HbA1c",              # required, e.g. test name
         "value": 7.2,                  # required, number
         "unit": "%",                   # required
         "measured_at": "2026-11-20T08:30:00Z",   # optional, date on the report
         "source_text": "HbA1c 7.2 %",  # optional, raw OCR line (lets a doctor double-check)
         "confidence": 0.93}            # optional, 0..1
     ]}
Anything else (non-200, bad JSON) marks the report as failed. Rows that don't match
the shape above are skipped individually; they never fail the whole report.
"""
from typing import List

import httpx

from .config import get_settings


async def extract(data: bytes, filename: str, content_type: str) -> List[dict]:
    url = get_settings().ocr_service_url.rstrip("/") + "/extract"
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, files={"file": (filename, data, content_type)})
    r.raise_for_status()
    return list(r.json()["measurements"])
