"""
Unit tests for AlertManager.
Tests progressive escalation, sustained duration criteria, cooldowns, and event logs.
"""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.alert_manager import (
    AlertManager,
    LEVEL_NORMAL,
    LEVEL_CAUTION,
    LEVEL_HIGH_WARNING
)


class TestAlertManager(unittest.TestCase):
    def setUp(self):
        self.mgr = AlertManager(
            caution_eye_closure_s=1.5,
            high_eye_closure_s=2.5,
            cooldown_seconds=3.0,
            audio_muted=False
        )

    def test_initial_state_normal(self):
        res = self.mgr.evaluate_signals(
            closure_duration_s=0.2,
            is_nodding=False,
            is_yawning=False,
            risk_score=15.0,
            timestamp=10.0
        )
        self.assertEqual(res["level"], LEVEL_NORMAL)
        self.assertFalse(res["is_alarm_active"])
        self.assertFalse(res["play_sound"])

    def test_escalation_to_caution(self):
        """Eyes closed > 1.5s should trigger Level 1 Caution."""
        res = self.mgr.evaluate_signals(
            closure_duration_s=1.6,
            is_nodding=False,
            is_yawning=False,
            risk_score=45.0,
            timestamp=10.0
        )
        self.assertEqual(res["level"], LEVEL_CAUTION)
        self.assertTrue(res["is_alarm_active"])
        self.assertTrue(res["play_sound"])
        self.assertEqual(res["sound_type"], "caution_chime")

    def test_escalation_to_high_warning(self):
        """Eyes closed > 2.5s should trigger Level 2 High Warning."""
        res = self.mgr.evaluate_signals(
            closure_duration_s=2.6,
            is_nodding=False,
            is_yawning=False,
            risk_score=85.0,
            timestamp=10.0
        )
        self.assertEqual(res["level"], LEVEL_HIGH_WARNING)
        self.assertTrue(res["play_sound"])
        self.assertEqual(res["sound_type"], "high_alarm")
        self.assertIn("PULL OVER", res["advisory"].upper())

    def test_cooldown_behavior(self):
        """Alarms should not re-trigger repeatedly within cooldown period."""
        # 1st trigger at t=10.0
        res1 = self.mgr.evaluate_signals(
            closure_duration_s=1.6,
            is_nodding=False,
            is_yawning=False,
            risk_score=45.0,
            timestamp=10.0
        )
        self.assertTrue(res1["is_new_event"])
        self.assertEqual(self.mgr.current_level, LEVEL_CAUTION)

        # 2nd call at t=11.0 (< 3s cooldown) with same caution level
        res2 = self.mgr.evaluate_signals(
            closure_duration_s=1.6,
            is_nodding=False,
            is_yawning=False,
            risk_score=45.0,
            timestamp=11.0
        )
        self.assertFalse(res2["is_new_event"])

    def test_cooldown_bypass_on_escalation(self):
        """Escalation to High Warning immediately breaks caution cooldown."""
        self.mgr.evaluate_signals(
            closure_duration_s=1.6,
            is_nodding=False,
            is_yawning=False,
            risk_score=45.0,
            timestamp=10.0
        )
        # Immediate escalation at t=10.5
        res = self.mgr.evaluate_signals(
            closure_duration_s=2.7,
            is_nodding=True,
            is_yawning=False,
            risk_score=85.0,
            timestamp=10.5
        )
        self.assertEqual(res["level"], LEVEL_HIGH_WARNING)
        self.assertTrue(res["is_new_event"])

    def test_audio_mute(self):
        """When muted, visual alarm stays active but play_sound is False."""
        self.mgr.set_mute(True)
        res = self.mgr.evaluate_signals(
            closure_duration_s=3.0,
            is_nodding=True,
            is_yawning=False,
            risk_score=90.0,
            timestamp=10.0
        )
        self.assertEqual(res["level"], LEVEL_HIGH_WARNING)
        self.assertFalse(res["play_sound"])
        self.assertTrue(res["audio_muted"])


if __name__ == "__main__":
    unittest.main()
