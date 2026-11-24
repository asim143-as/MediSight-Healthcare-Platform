# Backend Viva Guide (Member 2: Yashasvi Chauhan)

Study sheet for explaining and demonstrating the backend, APIs and database. Everything here is
true of the code in this repository. Section 9 lists what **not** to claim.

---

## 1. The 30-second pitch

> "I built the **backend gateway** of MediSight: a FastAPI service that sits between the frontend, the
> ML/OCR/RAG services and the Supabase PostgreSQL database. It authenticates every user, enforces roles,
> validates every request, and records an audit trail. Its most important job is **privacy**: one patient
> must never see another patient's data. It has **24 endpoints**, a 6-part database migration, and
> **159 automated tests**."

## 2. Architecture

```
 Frontend (Rishit)  ──►  FASTAPI BACKEND (me)  ──►  Supabase PostgreSQL  (tables + Row Level Security)
   Next.js                 auth, roles,        │      Supabase Storage     (private reports bucket)
                           validation, audit   ├──►  ML service     (Shubham: Diabetes / Heart / CKD)
                                               └──►  OCR + RAG      (Kanishk: extract values, evidence)
```

Why a gateway? One place that checks identity and rules before anything touches the database or a model,
instead of every page talking to the database directly.

## 3. How a request is processed

1. **Middleware** starts (it will write the audit row at the end).
2. **Authentication:** the Bearer token is validated by asking Supabase Auth; the user's role is read from `profiles`.
3. **Role check** (`require_roles`). Doctors must also be *approved*.
4. **Pydantic validation** of the body (types, ranges, required fields, no unknown fields).
5. **Business rules** (patient visible? measurements verified? file real?).
6. **Database call made AS THE USER**, so Row Level Security applies.
7. **Response**, then the **audit row** is written (success, denied or error).

## 4. Where everything is

| File | Job |
|---|---|
| `backend/app/main.py` | App, CORS, the single error format, audit middleware, routers |
| `backend/app/auth.py` | `get_current_user`, `require_roles` |
| `backend/app/config.py` | Settings from environment variables |
| `backend/app/supabase.py` | Database calls as the user, and the limited service-role helpers |
| `backend/app/dbutil.py` | Shared helpers (patient visible? turn a failed write into the right error) |
| `backend/app/schemas.py` | Every request/response shape and validation rule |
| `backend/app/patients.py` | Patient records, dated measurements, linking a patient login |
| `backend/app/predictions.py`, `ml.py` | Diabetes / Heart / CKD predictions, history |
| `backend/app/reports.py`, `ocr.py` | Report upload, storage, OCR hand-off |
| `backend/app/reviews.py` | Clinician review and the traceability view |
| `backend/app/audit.py` | Audit trail |
| `supabase/migrations/20261125120000_backend_gateway_schema.sql` | My database changes (6 parts) |
| `docs/API.md` | Full API reference with examples |

## 5. Mapping your role to what exists

| Role requirement | Delivered |
|---|---|
| FastAPI backend, validated schemas | `schemas.py`; invalid input returns 422 naming the field |
| Patient and doctor auth, role-based access | `auth.py`; roles + doctor approval; role matrix in `docs/API.md` |
| Tables: patients, reports, predictions, explanations, dated measurements | Existing tables + my migration (`reports`, `report_measurements`, `prediction_evidence`, `clinical_reviews`, `api_audit_logs`); timeline endpoint over `vitals` + `lab_results` |
| Separate Diabetes / Heart / CKD endpoints | `POST /predict/diabetes`, `/heart`, `/ckd` |
| Secure report upload, OCR/RAG coordination | `POST /reports` + OCR contract |
| History, audit logging, error handling, tests | `GET /patients/{id}/predictions`, `audit.py`, error envelope, 159 tests |
| Documented endpoints, schema, integration points, `/docs` | `docs/API.md`, migration file, contracts, FastAPI `/docs` |
| Completion: no patient sees another's data | Row Level Security + 404-instead-of-403 + isolation tests (see section 9 for what is proven) |

## 6. Key concepts (know these cold)

**JWT / Bearer token.** A signed login ticket. The backend never sees passwords; it asks Supabase "is this token valid, and who is it?".

**Row Level Security (RLS).** Rules *inside the database* that filter rows per user. A doctor's query returns only their hospital's patients even if the Python code has a bug. This is the main privacy guarantee.

**Why query as the user and not with the master key?** The master ("service role") key bypasses RLS. If every query used it, a bug in my code could leak everything. So user data is read and written with the user's own token; the service role is used for only four narrow system jobs: private file storage, saving OCR results and report status, the audit trail, and checking an account exists when linking a patient.

**404 instead of 403 for hidden data.** If a doctor asks for another hospital's patient, the answer is the same as for a nonexistent ID, so nobody can probe which IDs exist.

**Pydantic validation.** Types and ranges are enforced before any logic runs (BMI 10 to 100, gender from a fixed list, MRN pattern). On patient, measurement and link requests unknown fields are rejected, so a client cannot send `hospital_id` to create records in another hospital.

**No silent defaults.** The old `ml-service` and edge function fill missing inputs with guesses (BMI 25, "no stroke"). The team rule forbids that, so every model input is required.

**Human-in-the-loop.** Model prediction, retrieved evidence and the clinician's decision are three separate records. OCR values start `extracted` and only `verified` ones may feed a model. Overriding a prediction requires a new severity and written notes.

**Triggers.** Database code that runs automatically. `log_phi_access` audits data changes; my trigger creates a `pending` review for every new prediction; another blocks any edit or delete of audit rows.

**Two audit layers.** Triggers record *changes* (old and new values). The API audit records *reads, downloads and refused requests*, which triggers cannot see.

## 7. Likely questions, with answers

**Q: How do you stop patient A seeing patient B's data?**
Three layers. (1) Role checks in the API. (2) RLS in the database, because queries run as the user: a patient's policy is `patient_id = their own record`. (3) Hidden records return 404. Tests assert both the success and the refusal paths.

**Q: Why FastAPI?**
Automatic validation with Pydantic, automatic interactive docs at `/docs`, async I/O, and it matches the existing `ml-service`.

**Q: What happens if the audit write fails?**
It is **fail-open**: the request still succeeds and the failure is logged. I chose availability over strictness for this project; a production healthcare system might fail closed. It is a documented, deliberate trade-off.

**Q: Why store the exact model inputs?**
Reproducibility and traceability: you can always answer "why did the model say High risk?". The trace endpoint shows inputs, the verified report values they came from, the explanation, evidence and the doctor's decision.

**Q: How do you make sure uploaded files are safe?**
Size cap (10 MB) enforced while reading; the real type is checked from the file's first bytes, not the filename or header; the stored name is generated by the server; the bucket is private and access is by 5-minute signed links; if the database insert is refused, the stored file is removed.

**Q: Why are Heart and CKD "stub-0"?**
Those models belong to Shubham and don't exist yet. I defined the API contract now and put a clearly labelled placeholder behind it (`model_version: stub-0`, plus a warning in every response). When the real model arrives, only `ml.py` changes. Saying so openly is better than faking results.

**Q: What is SQL injection and are you protected?**
Yes. All database access goes through PostgREST with typed parameters, not string-built SQL. The one place user text enters a filter (patient search) is restricted to a safe character set, and a test tries `,` `)` `*` `%` and quotes.

**Q: Why does linking a patient login use the service role?**
An admin cannot read other users' profiles under RLS, but we must verify the target exists and is a `patient` account. It is a narrow lookup whose result is never returned to the caller.

**Q: How did you test it?**
159 tests with fake Supabase/ML/OCR services. After writing tests I also did **mutation checks**: I deliberately broke each safety rule (e.g. allow any file type, skip the patient-visibility check, stop recording the reviewer) and confirmed a test failed each time. That found two weak tests of my own, which I fixed. CI runs the suite on every push.

**Q: What would you do next?**
Run the migration and the RLS rules against a real Supabase project with two patient accounts (the true isolation test), connect the real OCR/RAG services, make prediction + explanation one transaction, and add a retry queue for OCR.

**Q: Difference between authentication and authorization?**
Authentication = who are you (the token). Authorization = what may you do (role check + RLS).

**Q: Why are audit rows append-only?**
So evidence can't be altered. RLS has no update/delete policy, and a trigger blocks update/delete even for the service role.

## 8. Demo plan (works without live credentials)

1. **Show the tests:**
   ```bash
   cd backend
   .venv/bin/python -m pytest -q
   ```
   Expect `159 passed`.
2. **Start the server and open `/docs`:**
   ```bash
   SUPABASE_URL=http://localhost SUPABASE_ANON_KEY=x .venv/bin/uvicorn app.main:app --port 8010
   ```
   Open <http://localhost:8010/docs>. Show the 24 endpoints and the request schemas (for example `/predict/diabetes`).
3. **Show authentication refusing a stranger:**
   ```bash
   curl -i http://localhost:8010/auth/me
   ```
   Expect `401` with the single error format.
4. **Show validation:** in `/docs`, the schemas list every field and range; mention a missing field returns 422 naming it.
5. **Show the docs-test idea:** `docs/API.md` examples are validated against the code by `tests/test_docs.py`.
6. **Show the migration:** open `supabase/migrations/20261125120000_backend_gateway_schema.sql`, walk the 6 parts.

With real Supabase credentials in `backend/.env` and a test account you can also do a live prediction and report upload,
but **do not apply the new migration to the team's shared database right before the practical** unless it has been tried
on a separate project first.

## 9. Be honest about the limits (do NOT claim these)

* Do **not** say it was tested against a live Supabase: it was tested with fakes. The migration has been syntax-checked by a SQL parser but never applied, and the RLS rules are verified only by their design and by fake-based tests.
* Heart and CKD are **placeholders**; their input fields are a proposal to confirm with Shubham.
* OCR and RAG services are **not connected yet** (the contract exists); evidence stays empty until they are.
* OCR processing is a background task with no retry queue.
* A prediction and its explanation are two inserts, not one transaction.
* Docker image and CI job were written but the Docker build was not run on this machine.

## 10. Glossary

| Term | Meaning |
|---|---|
| **API endpoint** | A URL that does one job, e.g. `POST /predict/diabetes` |
| **JWT** | Signed login token |
| **RLS** | Row Level Security: database rules per user |
| **PostgREST** | Supabase's way to read/write tables over HTTP |
| **Service role key** | Master key that bypasses RLS; server-side only |
| **MRN** | Medical record number |
| **OCR** | Reading text/values out of a scanned report |
| **RAG** | Retrieval-augmented generation: finding medical evidence for an answer |
| **SHAP** | A method that explains which inputs pushed a prediction up or down |
| **Fail-open / fail-closed** | If a safety step fails, allow the request / refuse it |
| **Mutation testing** | Deliberately breaking code to prove tests would catch it |
