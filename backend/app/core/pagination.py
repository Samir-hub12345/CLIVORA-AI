"""CLINOVA AI — High-Scale Keyset & Cursor Pagination Utility.

Provides O(1) database pagination using (created_at, id) tuples to eliminate
performance degradation associated with high SQL OFFSET queries on multi-million record tables.
"""

import base64
import json
from datetime import datetime, timezone
from typing import Any, Generic, List, Optional, Tuple, Type, TypeVar
from pydantic import BaseModel
from sqlalchemy import Select, desc, asc, tuple_, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class CursorPage(BaseModel, Generic[T]):
    items: List[T]
    next_cursor: Optional[str] = None
    has_more: bool = False
    limit: int


class CursorPaginationHelper:
    """Helper to encode, decode, and execute keyset cursor pagination on SQLAlchemy queries."""

    @staticmethod
    def encode_cursor(dt: datetime, record_id: str) -> str:
        """Encode timestamp and record ID into opaque base64 string."""
        iso_str = dt.isoformat()
        payload = {"t": iso_str, "id": record_id}
        raw_bytes = json.dumps(payload).encode("utf-8")
        return base64.urlsafe_b64encode(raw_bytes).decode("ascii")

    @staticmethod
    def decode_cursor(cursor_str: str) -> Tuple[datetime, str]:
        """Decode opaque base64 string back into timestamp and record ID."""
        try:
            raw_bytes = base64.urlsafe_b64decode(cursor_str.encode("ascii"))
            payload = json.loads(raw_bytes.decode("utf-8"))
            dt = datetime.fromisoformat(payload["t"])
            return dt, payload["id"]
        except Exception as e:
            raise ValueError(f"Invalid pagination cursor: {e}")

    @classmethod
    async def paginate(
        cls,
        db: AsyncSession,
        stmt: Select,
        model_cls: Any,
        cursor: Optional[str] = None,
        limit: int = 50,
        descending: bool = True,
    ) -> Tuple[List[Any], Optional[str], bool]:
        """Apply keyset cursor condition and execute query."""
        order_col = model_cls.created_at
        id_col = model_cls.id

        if cursor:
            cursor_dt, cursor_id = cls.decode_cursor(cursor)
            if descending:
                stmt = stmt.where(
                    or_(
                        order_col < cursor_dt,
                        and_(order_col == cursor_dt, id_col < cursor_id),
                    )
                )
            else:
                stmt = stmt.where(
                    or_(
                        order_col > cursor_dt,
                        and_(order_col == cursor_dt, id_col > cursor_id),
                    )
                )

        if descending:
            stmt = stmt.order_by(desc(order_col), desc(id_col))
        else:
            stmt = stmt.order_by(asc(order_col), asc(id_col))

        # Query limit + 1 to determine if has_more is true
        stmt = stmt.limit(limit + 1)
        results = (await db.execute(stmt)).scalars().all()

        has_more = len(results) > limit
        items = list(results[:limit])

        next_cursor = None
        if has_more and len(items) > 0:
            last_item = items[-1]
            last_dt = getattr(last_item, "created_at", datetime.now(timezone.utc))
            last_id = getattr(last_item, "id", "")
            next_cursor = cls.encode_cursor(last_dt, str(last_id))

        return items, next_cursor, has_more
