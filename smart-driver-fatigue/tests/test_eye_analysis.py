"""
Unit tests for Eye Aspect Ratio (EAR) calculations and EyeStateTracker.
"""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.eye_analysis import (
    calculate_ear,
    calculate_average_ear,
    is_eye_closed,
    EyeStateTracker,
    DEFAULT_EAR_THRESHOLD
)


class TestEyeAnalysis(unittest.TestCase):
    def setUp(self):
        # Synthetic open eye coordinates: width = 20, height = 7
        # p1=(0,0), p2=(5, 3.5), p3=(15, 3.5), p4=(20, 0), p5=(15, -3.5), p6=(5, -3.5)
        self.open_eye = [
            (0.0, 0.0),
            (5.0, 3.5),
            (15.0, 3.5),
            (20.0, 0.0),
            (15.0, -3.5),
            (5.0, -3.5),
        ]
        
        # Synthetic closed eye coordinates: width = 20, height = 0.8
        self.closed_eye = [
            (0.0, 0.0),
            (5.0, 0.4),
            (15.0, 0.4),
            (20.0, 0.0),
            (15.0, -0.4),
            (5.0, -0.4),
        ]

    def test_open_eye_ear(self):
        """Open eye EAR should be well above threshold."""
        ear = calculate_ear(self.open_eye)
        # v1 = 7.0, v2 = 7.0, h = 20.0 -> (7+7)/(2*20) = 14/40 = 0.35
        self.assertAlmostEqual(ear, 0.35, places=2)
        self.assertFalse(is_eye_closed(ear, threshold=DEFAULT_EAR_THRESHOLD))

    def test_closed_eye_ear(self):
        """Closed eye EAR should be well below threshold."""
        ear = calculate_ear(self.closed_eye)
        # v1 = 0.8, v2 = 0.8, h = 20.0 -> 1.6 / 40 = 0.04
        self.assertAlmostEqual(ear, 0.04, places=2)
        self.assertTrue(is_eye_closed(ear, threshold=DEFAULT_EAR_THRESHOLD))

    def test_average_ear(self):
        """Average EAR calculates mean correctly."""
        l_ear, r_ear, avg_ear = calculate_average_ear(self.open_eye, self.closed_eye)
        expected_avg = (0.35 + 0.04) / 2.0
        self.assertAlmostEqual(avg_ear, expected_avg, places=2)

    def test_invalid_landmark_count(self):
        """Should raise ValueError if fewer than 6 landmarks."""
        with self.assertRaises(ValueError):
            calculate_ear([(0, 0), (1, 1), (2, 2)])

    def test_eye_state_tracker_blink_detection(self):
        """Tracker should detect clean blinks when eyes close briefly and reopen."""
        tracker = EyeStateTracker(ear_threshold=0.21, fps=30.0)
        
        # Frame 1: Open
        res1 = tracker.update(avg_ear=0.35, timestamp=1.0)
        self.assertFalse(res1["is_closed"])
        self.assertEqual(res1["total_blinks"], 0)
        
        # Frame 2-4: Closed (3 frames = ~100ms blink)
        tracker.update(avg_ear=0.08, timestamp=1.033)
        tracker.update(avg_ear=0.08, timestamp=1.066)
        res_closed = tracker.update(avg_ear=0.08, timestamp=1.100)
        self.assertTrue(res_closed["is_closed"])
        self.assertGreater(res_closed["closure_duration_s"], 0.05)
        
        # Frame 5: Reopened
        res_reopen = tracker.update(avg_ear=0.34, timestamp=1.133)
        self.assertFalse(res_reopen["is_closed"])
        self.assertEqual(res_reopen["total_blinks"], 1)

    def test_sustained_closure_duration(self):
        """Tracker should accurately accumulate sustained closure seconds."""
        tracker = EyeStateTracker(ear_threshold=0.21, fps=30.0)
        
        # 60 frames closed at 30 fps = 2.0 seconds
        for i in range(60):
            res = tracker.update(avg_ear=0.05, timestamp=1.0 + (i / 30.0))
            
        self.assertAlmostEqual(res["closure_duration_s"], 2.0, places=1)

    def test_hysteresis_state_stability(self):
        """Hysteresis must prevent open/closed flickering when EAR oscillates around boundary."""
        tracker = EyeStateTracker(close_threshold=0.19, open_threshold=0.23, fps=30.0)
        
        # Start open at 0.30
        res = tracker.update(0.30, timestamp=1.0)
        self.assertFalse(res["is_closed"])
        
        # Drops to 0.21 (between 0.19 and 0.23) -> Should remain OPEN
        res = tracker.update(0.21, timestamp=1.033)
        self.assertFalse(res["is_closed"])
        
        # Drops below 0.19 to 0.18 -> Should transition to CLOSED
        res = tracker.update(0.18, timestamp=1.066)
        self.assertTrue(res["is_closed"])
        
        # Rises to 0.21 (between 0.19 and 0.23) -> Should remain CLOSED (no flicker!)
        res = tracker.update(0.21, timestamp=1.100)
        self.assertTrue(res["is_closed"])
        
        # Rises above 0.23 to 0.24 -> Should transition back to OPEN
        res = tracker.update(0.24, timestamp=1.133)
        self.assertFalse(res["is_closed"])

    def test_baseline_calibrator(self):
        """BaselineCalibrator should adapt thresholds based on driver's unique open eye baseline."""
        from src.eye_analysis import BaselineCalibrator
        calibrator = BaselineCalibrator(target_samples=10)
        
        # Feed 10 open eye observations around ~0.32
        for i in range(10):
            calibrator.add_sample(0.32 + (i * 0.005))
            
        self.assertTrue(calibrator.is_calibrated)
        self.assertAlmostEqual(calibrator.baseline_ear, 0.34, delta=0.03)
        
        close_t, open_t = calibrator.get_adapted_thresholds()
        self.assertTrue(0.16 <= close_t <= 0.24)
        self.assertGreater(open_t, close_t)

    def test_independent_left_right_validation(self):
        """Unphysiological measurements (e.g. negative or >0.55) should be filtered safely."""
        from src.eye_analysis import validate_ear
        self.assertTrue(validate_ear(0.32))
        self.assertTrue(validate_ear(0.08))
        self.assertFalse(validate_ear(0.001))
        self.assertFalse(validate_ear(0.85))


if __name__ == "__main__":
    unittest.main()

