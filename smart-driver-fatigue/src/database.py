"""
SQLite Database interface for persistent session history and fatigue alert events.
Safe initialization, parameterized queries, and zero storage of raw video or face images.
"""
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "fatigue_monitor.db"


class FatigueDatabase:
    """
    Manages persistent SQLite connection and operations for driver sessions and events.
    """
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self._ensure_dir()
        self.init_schema()

    def _ensure_dir(self):
        """Ensure parent directory for database exists."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Create and return a database connection with dict-like row access."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_schema(self):
        """Create tables if they do not exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    start_time REAL NOT NULL,
                    end_time REAL,
                    duration_s REAL DEFAULT 0.0,
                    total_cautions INTEGER DEFAULT 0,
                    total_high_warnings INTEGER DEFAULT 0,
                    peak_risk REAL DEFAULT 0.0,
                    avg_risk REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    alert_level INTEGER NOT NULL,
                    trigger_type TEXT NOT NULL,
                    description TEXT,
                    risk_score REAL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );
            """)
            conn.commit()

    def create_session(self, session_id: str, start_time: Optional[float] = None) -> str:
        """Record the start of a new monitoring session."""
        t_start = start_time if start_time is not None else time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO sessions (id, start_time) VALUES (?, ?)",
                (session_id, t_start)
            )
            conn.commit()
        return session_id

    def update_session(
        self,
        session_id: str,
        end_time: float,
        duration_s: float,
        total_cautions: int,
        total_high_warnings: int,
        peak_risk: float,
        avg_risk: float
    ):
        """Update metrics for a completed or ongoing session."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions
                SET end_time = ?, duration_s = ?, total_cautions = ?,
                    total_high_warnings = ?, peak_risk = ?, avg_risk = ?
                WHERE id = ?
            """, (end_time, duration_s, total_cautions, total_high_warnings, peak_risk, avg_risk, session_id))
            conn.commit()

    def log_event(
        self,
        session_id: str,
        alert_level: int,
        trigger_type: str,
        description: str,
        risk_score: Optional[float],
        timestamp: Optional[float] = None
    ):
        """Log a warning/caution event."""
        t = timestamp if timestamp is not None else time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO events (session_id, timestamp, alert_level, trigger_type, description, risk_score)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, t, alert_level, trigger_type, description, risk_score))
            conn.commit()

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Fetch all recorded sessions ordered by recency."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_session_events(self, session_id: str) -> List[Dict[str, Any]]:
        """Fetch all events for a specific session."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC",
                (session_id,)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def delete_all_history(self):
        """Safely delete all stored sessions and events."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM events")
            cursor.execute("DELETE FROM sessions")
            conn.commit()
