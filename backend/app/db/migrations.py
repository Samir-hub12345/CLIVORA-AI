"""Additive ownership migration for existing prototype databases. Never drops data."""
from sqlalchemy import inspect, text


def upgrade_ownership(connection):
    for table, column, unique in (
        ("patients", "user_id", True),
        ("triage_cases", "owner_user_id", False),
    ):
        columns = {c["name"] for c in inspect(connection).get_columns(table)}
        if column not in columns:
            connection.execute(text(
                f"ALTER TABLE {table} ADD COLUMN {column} VARCHAR(36) REFERENCES users(id)"
            ))
        connection.execute(text(
            f"CREATE {'UNIQUE ' if unique else ''}INDEX IF NOT EXISTS ix_{table}_{column} "
            f"ON {table} ({column})"
        ))