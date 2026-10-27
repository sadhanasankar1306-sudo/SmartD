"""
Unit tests for FatigueRiskEngine.
Tests normalization, boundary conditions, categorical classification,
and handling of unreliable/missing sensor inputs.
"""
import unittest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.risk_engine import (
    FatigueRiskEngine,
    CATEGORY_LOW,
    CATEGORY_MODERATE,
    CATEGORY_HIGH,
    LABEL_LOW,
    LABEL_MODERATE,
    LABEL_HIGH,
)


class TestFatigueRiskEngine(unittest.TestCase):
    def setUp(self):
        self.engine = FatigueRiskEngine()

    def test_alert_driver_low_risk(self):
        """Nominal awake driver should have low risk score."""
        result = self.engine.calculate_risk(
            closure_duration_s=0.1,
            blinks_per_minute=18.0,
            yawns_recent=0,
            nods_recent=0,
            is_currently_nodding=False,
            signal_quality=0.95,
            face_detected=True,
        )
        self.assertTrue(result["is_reliable"])
        self.assertIsNotNone(result["score"])
        self.assertLess(result["score"], 35.0)
        self.assertEqual(result["category"], CATEGORY_LOW)
        self.assertEqual(result["alert_level"], 0)

    def test_severe_fatigue_high_risk(self):
        """Driver with prolonged eye closure and nodding should produce high risk."""
        result = self.engine.calculate_risk(
            closure_duration_s=3.0,
            blinks_per_minute=6.0,
            yawns_recent=3,
            nods_recent=2,
            is_currently_nodding=True,
            signal_quality=0.9,
            face_detected=True,
        )
        self.assertTrue(result["is_reliable"])
        self.assertGreaterEqual(result["score"], 70.0)
        self.assertEqual(result["category"], CATEGORY_HIGH)
        self.assertEqual(result["alert_level"], 2)

    def test_moderate_drowsiness_caution(self):
        """Driver with occasional yawns and slightly prolonged closures."""
        result = self.engine.calculate_risk(
            closure_duration_s=1.4,
            blinks_per_minute=28.0,
            yawns_recent=2,
            nods_recent=0,
            is_currently_nodding=False,
            signal_quality=0.85,
            face_detected=True,
        )
        self.assertTrue(result["is_reliable"])
        self.assertTrue(35.0 <= result["score"] <= 75.0)

    def test_missing_face_handling(self):
        """When face is lost, system must report Insufficient Data, not assume alertness."""
        result = self.engine.calculate_risk(
            closure_duration_s=0.0,
            blinks_per_minute=0.0,
            yawns_recent=0,
            nods_recent=0,
            signal_quality=0.1,
            face_detected=False,
        )
        self.assertFalse(result["is_reliable"])
        self.assertIsNone(result["score"])
        self.assertEqual(result["category"], "Insufficient Data")
        self.assertIn("unreliable", result["category_label"].lower())

    def test_low_signal_quality_handling(self):
        """When signal quality drops below 0.35, risk calculation should suspend."""
        result = self.engine.calculate_risk(
            closure_duration_s=0.0,
            blinks_per_minute=20.0,
            yawns_recent=0,
            nods_recent=0,
            signal_quality=0.25,
            face_detected=True,
        )
        self.assertFalse(result["is_reliable"])
        self.assertIsNone(result["score"])

    def test_score_boundary_clamping(self):
        """Score must never exceed 100 or drop below 0."""
        res_high = self.engine.calculate_risk(
            closure_duration_s=10.0,
            blinks_per_minute=0.0,
            yawns_recent=10,
            nods_recent=10,
            is_currently_nodding=True,
        )
        self.assertLessEqual(res_high["score"], 100.0)

        res_low = self.engine.calculate_risk(
            closure_duration_s=0.0,
            blinks_per_minute=20.0,
            yawns_recent=0,
            nods_recent=0,
        )
        self.assertGreaterEqual(res_low["score"], 0.0)


if __name__ == "__main__":
    unittest.main()
