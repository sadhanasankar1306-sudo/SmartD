"""
Unit tests for validation module.
"""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.validation import validate_settings, assess_image_quality, check_face_framing


class TestValidation(unittest.TestCase):
    def test_valid_settings(self):
        valid_cfg = {
            "ear_threshold": 0.22,
            "mar_threshold": 0.65,
            "caution_eye_closure_s": 1.5,
            "high_eye_closure_s": 2.5,
            "cooldown_seconds": 5.0,
        }
        ok, msg = validate_settings(valid_cfg)
        self.assertTrue(ok)

    def test_invalid_ear_threshold(self):
        invalid_cfg = {"ear_threshold": 0.05}
        ok, msg = validate_settings(invalid_cfg)
        self.assertFalse(ok)
        self.assertIn("EAR threshold", msg)

    def test_high_closure_must_exceed_caution(self):
        invalid_cfg = {
            "caution_eye_closure_s": 2.5,
            "high_eye_closure_s": 2.0,
        }
        ok, msg = validate_settings(invalid_cfg)
        self.assertFalse(ok)
        self.assertIn("must exceed caution", msg)

    def test_image_quality_extremes(self):
        q_dark, status_dark = assess_image_quality(mean_brightness=10.0, std_contrast=5.0)
        self.assertLess(q_dark, 0.35)
        self.assertIn("dark", status_dark.lower())

        q_good, status_good = assess_image_quality(mean_brightness=120.0, std_contrast=55.0)
        self.assertGreater(q_good, 0.6)

    def test_face_framing_clipped(self):
        ok, reason = check_face_framing(box_x_min=0.005, box_y_min=0.1, box_x_max=0.5, box_y_max=0.6)
        self.assertFalse(ok)
        self.assertIn("outside frame", reason.lower())


if __name__ == "__main__":
    unittest.main()
