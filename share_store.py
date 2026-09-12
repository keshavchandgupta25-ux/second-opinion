"""Storage for shareable result snapshots (Step 6).

Deliberately isolated from storage.py: it manages its own table in the
same SQLite file, and does not import or modify anything from the
existing leaderboard storage module.
"""
import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).resolve().parent / "data" / "second_opinion.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_share_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS shares (
                id TEXT PRIMARY KEY,
                idea_title TEXT,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def create_share(idea_title: str, payload: dict, max_attempts: int = 5) -> str:
    """Create a share record and return its short id."""
    init_share_db()
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload_json = json.dumps(payload)

    last_error: Optional[Exception] = None
    for _ in range(max_attempts):
        share_id = secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
        if not share_id:
            continue
        try:
            with _connect() as conn:
                conn.execute(
                    """
                    INSERT INTO shares (id, idea_title, payload, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (share_id, idea_title[:120], payload_json, created_at),
                )
                conn.commit()
            return share_id
        except sqlite3.IntegrityError as exc:
            last_error = exc
            continue

    raise RuntimeError("Could not generate a unique share id.") from last_error


def get_share(share_id: str) -> Optional[dict]:
    init_share_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, idea_title, payload, created_at FROM shares WHERE id = ?",
            (share_id,),
        ).fetchone()

    if not row:
        return None

    try:
        payload = json.loads(row["payload"])
    except (TypeError, ValueError):
        payload = {}

    payload["id"] = row["id"]
    payload["created_at"] = row["created_at"]
    payload.setdefault("title", row["idea_title"])
    return payload
