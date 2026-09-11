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


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                pitch_readiness INTEGER,
                win_probability INTEGER,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_submission(
    title: str,
    pitch_readiness: Optional[int],
    win_probability: Optional[int],
) -> None:
    init_db()
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO submissions (title, pitch_readiness, win_probability, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (title[:120], pitch_readiness, win_probability, created_at),
        )
        conn.commit()


def list_submissions() -> list[dict]:
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, title, pitch_readiness, win_probability, created_at
            FROM submissions
            ORDER BY
                CASE WHEN pitch_readiness IS NULL THEN 1 ELSE 0 END,
                pitch_readiness DESC,
                created_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]
