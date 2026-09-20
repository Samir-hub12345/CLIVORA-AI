import argparse
import asyncio
import getpass
from sqlalchemy import select
from app.core.security import get_password_hash
from app.db.session import async_session_factory, engine
from app.models.user import User, UserRole
from app.models.patient import Patient

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    create = sub.add_parser("create-user")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--role", choices=[role.value for role in UserRole], required=True)
    link = sub.add_parser("link-patient")
    link.add_argument("--email", required=True)
    link.add_argument("--mrn", required=True)
    args = parser.parse_args()
    async with async_session_factory() as db:
        user = (await db.execute(select(User).where(User.email == args.email))).scalar_one_or_none()
        if args.action == "create-user":
            if user:
                raise SystemExit("That account already exists. No change made.")
            password = getpass.getpass("New password (8 or more characters): ")
            if len(password) < 8 or len(password.encode("utf-8")) > 72 or password != getpass.getpass("Repeat password: "):
                raise SystemExit("Passwords must match and contain 8+ characters (at most 72 UTF-8 bytes).")
            db.add(User(email=args.email, full_name=args.name, role=UserRole(args.role), hashed_password=get_password_hash(password), is_active=True))
        else:
            if not user or user.role != UserRole.PATIENT:
                raise SystemExit("A patient account with this email is required.")
            patient = (await db.execute(select(Patient).where(Patient.mrn == args.mrn))).scalar_one_or_none()
            if not patient:
                raise SystemExit("No chart found with that record number.")
            if patient.user_id not in (None, user.id):
                raise SystemExit("This chart is already linked to a different account. No change made.")
            existing = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
            if existing and existing.id != patient.id:
                raise SystemExit("That account already has a different chart. No change made.")
            patient.user_id = user.id
        await db.commit()
    await engine.dispose()
    print("Saved successfully.")

if __name__ == "__main__":
    asyncio.run(main())