import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from app.db.migrations import upgrade_ownership

def test_existing_database_upgrade_preserves_unlinked_records(tmp_path):
    engine = create_engine("sqlite:///" + str(tmp_path / "old.db"))
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE patients (id VARCHAR(36) PRIMARY KEY, email TEXT)"))
        conn.execute(text("CREATE TABLE triage_cases (id VARCHAR(36) PRIMARY KEY, raw_symptoms TEXT)"))
        conn.execute(text("INSERT INTO patients VALUES ('old-patient', 'legacy@example.invalid')"))
        conn.execute(text("INSERT INTO triage_cases VALUES ('old-case', 'Legacy intake')"))
        upgrade_ownership(conn)
        upgrade_ownership(conn)  # Safe on subsequent application starts.
        assert "user_id" in {c["name"] for c in inspect(conn).get_columns("patients")}
        assert conn.execute(text("SELECT user_id FROM patients")).scalar_one() is None
        assert conn.execute(text("SELECT raw_symptoms FROM triage_cases")).scalar_one() == "Legacy intake"
        assert conn.execute(text("SELECT owner_user_id FROM triage_cases")).scalar_one() is None
    engine.dispose()