"""
Unit tests for Reporting and CSV export generation.
"""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.reporting import generate_trip_summary, export_events_to_csv


class TestReporting(unittest.TestCase):
    def setUp(self):
        self.session = {
            "id": "TRIP-2026-TEST",
            "start_time": 1700000000.0,
            "end_time": 1700001800.0,
            "duration_s": 1800.0,
            "total_cautions": 2,
            "total_high_warnings": 1,
            "peak_risk": 74.0,
            "avg_risk": 28.5,
        }
        self.events = [
            {
                "id": 1,
                "session_id": "TRIP-2026-TEST",
                "timestamp": 1700000600.0,
                "alert_level": 1,
                "trigger_type": "Yawn",
                "description": "3 yawns in window",
                "risk_score": 45.0,
            },
            {
                "id": 2,
                "session_id": "TRIP-2026-TEST",
                "timestamp": 1700001200.0,
                "alert_level": 2,
                "trigger_type": "EyeClosure",
                "description": "2.6s eye closure",
                "risk_score": 82.0,
            }
        ]

    def test_summary_generation_content(self):
        """Report should contain key metrics, advisory, and event listings."""
        summary = generate_trip_summary(self.session, self.events)
        self.assertIn("TRIP-2026-TEST", summary)
        self.assertIn("30.0 minutes", summary)
        self.assertIn("74.0/100", summary)
        self.assertIn("HIGH FATIGUE RISK", summary)
        self.assertIn("DISCLAIMER", summary)

    def test_csv_export_format(self):
        """CSV export should include valid header and rows."""
        csv_text = export_events_to_csv(self.events)
        lines = csv_text.strip().split("\r\n") if "\r\n" in csv_text else csv_text.strip().split("\n")
        self.assertEqual(len(lines), 3)  # Header + 2 rows
        self.assertIn("Event ID", lines[0])
        self.assertIn("Risk Score", lines[0])
        self.assertIn("EyeClosure", lines[2])


if __name__ == "__main__":
    unittest.main()
