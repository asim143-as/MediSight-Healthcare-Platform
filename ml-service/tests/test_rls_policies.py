"""
RLS Policy Contract Tests for MediSight AI
==========================================
These tests verify the database schema structure, RLS enforcement intent,
and Row-Level Security policy existence via the Supabase Management API
or by checking migration SQL content.

For live RLS enforcement tests, see: supabase/tests/database/rls.test.sql
Run those with: supabase test db

These Python tests validate:
1. The migration SQL contains all required RLS-enabled tables.
2. The migration SQL defines policies for each protected table.
3. Schema integrity: all required tables and columns exist.
4. Feature engineering helper functions produce correct security assumptions.
"""

import os
import re
import pytest

# Path to the initial schema migration
MIGRATIONS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations"
)
INITIAL_MIGRATION = os.path.join(
    MIGRATIONS_DIR, "20260723110308_initial_schema.sql"
)


@pytest.fixture(scope="module")
def migration_sql() -> str:
    """Load the initial schema SQL content."""
    if not os.path.exists(INITIAL_MIGRATION):
        pytest.skip("Initial migration file not found — skipping schema tests.")
    with open(INITIAL_MIGRATION, "r", encoding="utf-8") as f:
        return f.read()


# ── RLS: Enable Row Level Security ────────────────────────────────────────────

TABLES_REQUIRING_RLS = [
    "hospitals",
    "profiles",
    "patients",
    "vitals",
    "lab_results",
    "medications",
    "diagnoses",
    "predictions",
    "explanations",
    "doctor_patient_assignments",
    "alerts",
    "ai_chat_sessions",
    "ai_messages",
    "model_registry",
    "audit_logs",
]

# The migration may include an additional RLS enable for an extra table/view.
# We allow for count >= len(TABLES_REQUIRING_RLS) to be forward-compatible.
MIN_RLS_ENABLES = len(TABLES_REQUIRING_RLS)


class TestRLSEnabled:
    """Verify that every PHI-relevant table has RLS explicitly enabled."""

    def test_all_rls_tables_enabled(self, migration_sql):
        """All 15 core tables must have 'enable row level security'."""
        for table in TABLES_REQUIRING_RLS:
            pattern = rf"alter\s+table\s+public\.{re.escape(table)}\s+enable\s+row\s+level\s+security"
            assert re.search(pattern, migration_sql, re.IGNORECASE), (
                f"Table '{table}' is missing 'ENABLE ROW LEVEL SECURITY' in the migration."
            )

    def test_rls_count_matches_expected(self, migration_sql):
        """Count of 'enable row level security' must be >= the number of listed tables."""
        count = len(re.findall(r"enable row level security", migration_sql, re.IGNORECASE))
        assert count >= MIN_RLS_ENABLES, (
            f"Expected at least {MIN_RLS_ENABLES} RLS enables, found only {count}."
        )


# ── RLS: Policy Existence ─────────────────────────────────────────────────────

class TestRLSPolicies:
    """Verify that critical RLS policies exist for sensitive tables."""

    def test_patients_super_admin_policy_exists(self, migration_sql):
        assert "Patients: super_admin full access" in migration_sql

    def test_patients_doctor_policy_exists(self, migration_sql):
        assert "Patients: doctor read/write assigned or same hospital" in migration_sql

    def test_patients_nurse_read_only_policy_exists(self, migration_sql):
        assert "Patients: nurse read scoped" in migration_sql

    def test_predictions_doctor_insert_policy_exists(self, migration_sql):
        assert "Predictions: doctor insert same hospital" in migration_sql

    def test_predictions_data_scientist_read_policy_exists(self, migration_sql):
        assert "Predictions: data_scientist read all" in migration_sql

    def test_audit_logs_no_insert_policy(self, migration_sql):
        """Audit logs must NOT have a direct INSERT policy for authenticated users."""
        # Only super_admin/hospital_admin SELECT should exist for audit_logs
        insert_policy_pattern = r"create\s+policy\s+\"[^\"]+\"\s+on\s+public\.audit_logs\s+for\s+insert"
        matches = re.findall(insert_policy_pattern, migration_sql, re.IGNORECASE)
        assert len(matches) == 0, (
            "audit_logs should have NO direct INSERT policy — "
            "inserts are only allowed via SECURITY DEFINER trigger."
        )

    def test_ai_chat_sessions_user_scoped_policy(self, migration_sql):
        assert "ChatSessions: user full" in migration_sql

    def test_alerts_staff_update_policy(self, migration_sql):
        assert "Alerts: staff update alert status same hospital" in migration_sql

    def test_model_registry_staff_view_policy(self, migration_sql):
        assert "ModelRegistry: staff view" in migration_sql


# ── Schema Integrity ─────────────────────────────────────────────────────────

class TestSchemaIntegrity:
    """Verify that core tables are created with required columns."""

    def test_patients_table_created(self, migration_sql):
        assert "create table public.patients" in migration_sql

    def test_patients_has_mrn(self, migration_sql):
        # After patients table creation line
        idx = migration_sql.find("create table public.patients")
        snippet = migration_sql[idx:idx + 500]
        assert "mrn" in snippet.lower()

    def test_patients_has_demographics_jsonb(self, migration_sql):
        idx = migration_sql.find("create table public.patients")
        snippet = migration_sql[idx:idx + 500]
        assert "demographics" in snippet.lower()
        assert "jsonb" in snippet.lower()

    def test_predictions_probability_check_constraint(self, migration_sql):
        idx = migration_sql.find("create table public.predictions")
        snippet = migration_sql[idx:idx + 500]
        assert "probability" in snippet.lower()
        assert "check" in snippet.lower()

    def test_predictions_references_patients(self, migration_sql):
        idx = migration_sql.find("create table public.predictions")
        snippet = migration_sql[idx:idx + 400]
        assert "references public.patients" in snippet.lower()

    def test_explanations_1_to_1_with_predictions(self, migration_sql):
        idx = migration_sql.find("create table public.explanations")
        snippet = migration_sql[idx:idx + 400]
        assert "unique" in snippet.lower()
        assert "references public.predictions" in snippet.lower()

    def test_audit_logs_append_only_design(self, migration_sql):
        """Audit logs use trigger, not direct application inserts."""
        assert "log_phi_access" in migration_sql
        assert "audit_patients" in migration_sql
        assert "audit_predictions" in migration_sql

    def test_profiles_extends_auth_users(self, migration_sql):
        idx = migration_sql.find("create table public.profiles")
        snippet = migration_sql[idx:idx + 400]
        assert "references auth.users" in snippet.lower()

    def test_auto_profile_trigger_exists(self, migration_sql):
        assert "on_auth_user_created" in migration_sql
        assert "handle_new_user" in migration_sql

    def test_updated_at_triggers_exist(self, migration_sql):
        assert "update_hospitals_updated_at" in migration_sql
        assert "update_profiles_updated_at" in migration_sql
        assert "update_patients_updated_at" in migration_sql


# ── Security Helper Functions ────────────────────────────────────────────────

class TestSecurityHelperFunctions:
    """Verify that RLS helper functions are defined as SECURITY DEFINER."""

    def test_get_my_role_security_definer(self, migration_sql):
        idx = migration_sql.find("function public.get_my_role()")
        snippet = migration_sql[idx:idx + 300]
        assert "security definer" in snippet.lower()

    def test_get_my_hospital_id_security_definer(self, migration_sql):
        idx = migration_sql.find("function public.get_my_hospital_id()")
        snippet = migration_sql[idx:idx + 300]
        assert "security definer" in snippet.lower()

    def test_log_phi_access_security_definer(self, migration_sql):
        idx = migration_sql.find("function public.log_phi_access()")
        # The function body is ~30 lines; use 1500 chars to capture the trailing SECURITY DEFINER
        snippet = migration_sql[idx:idx + 1500]
        assert "security definer" in snippet.lower(), (
            "log_phi_access must be declared SECURITY DEFINER so it can write audit_logs "
            "even when called from a row-trigger context."
        )


# ── Role Enum Verification ───────────────────────────────────────────────────

class TestRoleEnum:
    """Verify the user_role enum contains all required roles."""

    EXPECTED_ROLES = ["super_admin", "hospital_admin", "doctor", "nurse", "data_scientist"]

    def test_user_role_enum_contains_all_roles(self, migration_sql):
        idx = migration_sql.find("create type public.user_role as enum")
        snippet = migration_sql[idx:idx + 200]
        for role in self.EXPECTED_ROLES:
            assert role in snippet, f"Role '{role}' missing from user_role enum."

    def test_severity_level_enum(self, migration_sql):
        assert "create type public.severity_level as enum" in migration_sql
        for level in ["Low", "Moderate", "High", "Critical"]:
            assert level in migration_sql

    def test_alert_status_enum(self, migration_sql):
        assert "create type public.alert_status as enum" in migration_sql
        for status in ["New", "Acknowledged", "Resolved"]:
            assert status in migration_sql
