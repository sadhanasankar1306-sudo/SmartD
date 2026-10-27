"""
Unit tests for FatigueDatabase SQLite persistent storage.
"""
import tempfile
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import FatigueDatabase


class TestDatabase(unittest.TestCase):
    def setUp(self):
        # Create a temporary file path for isolated test DB
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_monitor.db"
        self.db = FatigueDatabase(db_path=self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_schema_initialization(self):
        """Database file should exist and tables should be ready."""
        self.assertTrue(self.db_path.exists())
        sessions = self.db.get_all_sessions()
        self.assertEqual(len(sessions), 0)

    def test_session_lifecycle(self):
        """Create, update, and retrieve session records."""
        sess_id = "test_trip_001"
        self.db.create_session(sess_id, start_time=1000.0)

        # Update session at completion
        self.db.update_session(
            session_id=sess_id,
            end_time=1600.0,
            duration_s=600.0,
            total_cautions=3,
            total_high_warnings=1,
            peak_risk=78.5,
            avg_risk=32.1
        )

        sessions = self.db.get_all_sessions()
        self.assertEqual(len(sessions), 1)
        s = sessions[0]
        self.assertEqual(s["id"], sess_id)
        self.assertEqual(s["duration_s"], 600.0)
        self.assertEqual(s["total_cautions"], 3)
        self.assertEqual(s["total_high_warnings"], 1)
        self.assertAlmostEqual(s["peak_risk"], 78.5, places=1)

    def test_event_logging(self):
        """Log events and retrieve them by session id."""
        sess_id = "test_trip_002"
        self.db.create_session(sess_id, start_time=1000.0)

        self.db.log_event(
            session_id=sess_id,
            alert_level=1,
            trigger_type="Yawn",
            description="Repeated yawns detected",
            risk_score=45.0,
            timestamp=1050.0
        )
        self.db.log_event(
            session_id=sess_id,
            alert_level=2,
            trigger_type="EyeClosure",
            description="Microsleep >2.5s",
            risk_score=85.0,
            timestamp=1120.0
        )

        events = self.db.get_session_events(sess_id)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["trigger_type"], "Yawn")
        self.assertEqual(events[1]["alert_level"], 2)

    def test_delete_history(self):
        """delete_all_history should empty all tables."""
        sess_id = "test_trip_003"
        self.db.create_session(sess_id, start_time=100.0)
        self.db.log_event(sess_id, 1, "Blink", "Low blinks", 40.0)
        
        self.assertEqual(len(self.db.get_all_sessions()), 1)
        self.db.delete_all_history()
        self.assertEqual(len(self.db.get_all_sessions()), 0)


if __name__ == "__main__":
    unittest.main()
