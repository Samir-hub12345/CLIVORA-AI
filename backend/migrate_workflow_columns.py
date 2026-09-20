import asyncio
from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        res = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'triage_cases';"
        ))
        cols = [r[0] for r in res.fetchall()]
        print("Existing columns in triage_cases:", len(cols))
        
        needed = {
            "patient_id": "VARCHAR(36)",
            "assigned_doctor_id": "VARCHAR(36)",
            "assigned_doctor_name": "VARCHAR(100)",
            "assigned_department": "VARCHAR(100)",
            "intake_verified": "BOOLEAN DEFAULT FALSE NOT NULL",
            "vitals": "TEXT"
        }
        for col, col_type in needed.items():
            if col not in cols:
                print(f"Adding column: {col} ({col_type})")
                await conn.execute(text(f"ALTER TABLE triage_cases ADD COLUMN {col} {col_type};"))
            else:
                print(f"Column already exists: {col}")
        print("Column migration check successful.")

if __name__ == "__main__":
    asyncio.run(migrate())
