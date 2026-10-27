"""
Eye analysis module for calculating Eye Aspect Ratio (EAR) and detecting closure.
Implements the Soukupová & Čech (2016) geometric EAR formulation with:
- Independent Left and Right eye detection & physiological bounds checking
- Dual-threshold Hysteresis to eliminate boundary flickering
- Elapsed-time based closure duration tracking (timestamp deltas)
- Exponential moving average temporal smoothing
- Adaptive open-eye baseline calibration
"""
import math
from typing import List, Optional, Tuple, Union

# MediaPipe 468 face mesh landmark indices for eyes
LEFT_EYE_LANDMARKS = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_LANDMARKS = [362, 385, 387, 263, 373, 380]

# Thresholds with hysteresis
DEFAULT_EAR_THRESHOLD = 0.21
DEFAULT_EAR_CLOSE_THRESHOLD = 0.19  # Below this: eye transitions to CLOSED
DEFAULT_EAR_OPEN_THRESHOLD = 0.23   # Above this: eye transitions to OPEN

# Blink duration boundaries (in seconds)
MIN_BLINK_DURATION_S = 0.08
MAX_BLINK_DURATION_S = 0.45


def euclidean_distance(p1: Union[Tuple[float, float], List[float]], 
                       p2: Union[Tuple[float, float], List[float]]) -> float:
    """Calculate Euclidean distance between two 2D or 3D points."""
    dx = p1[0] - p2[0]
    dy = p1[1] - p2[1]
    dz = (p1[2] - p2[2]) if len(p1) > 2 and len(p2) > 2 else 0.0
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def calculate_ear(eye_landmarks: List[Union[Tuple[float, float], List[float]]]) -> float:
    """
    Calculate Eye Aspect Ratio (EAR) from 6 landmark points.
    
    Formula:
        EAR = (|p2 - p6| + |p3 - p5|) / (2.0 * |p1 - p4|)
        
    Args:
        eye_landmarks: List of 6 points ordered [P1, P2, P3, P4, P5, P6]
        
    Returns:
        float: EAR value. Returns 0.0 if horizontal distance is near zero.
    """
    if len(eye_landmarks) < 6:
        raise ValueError(f"Expected 6 landmarks for eye, received {len(eye_landmarks)}")
    
    p1, p2, p3, p4, p5, p6 = eye_landmarks[:6]
    
    # Vertical distances
    v1 = euclidean_distance(p2, p6)
    v2 = euclidean_distance(p3, p5)
    
    # Horizontal distance
    h = euclidean_distance(p1, p4)
    
    if h < 1e-6:
        return 0.0
        
    ear = (v1 + v2) / (2.0 * h)
    return float(ear)


def validate_ear(ear: float) -> bool:
    """Check if EAR measurement falls within physiologically possible boundaries (0.02 - 0.55)."""
    return 0.02 <= ear <= 0.55


def calculate_average_ear(left_landmarks: List[Union[Tuple[float, float], List[float]]],
                          right_landmarks: List[Union[Tuple[float, float], List[float]]]) -> Tuple[float, float, float]:
    """
    Calculate EAR for left, right, and both eyes (mean).
    
    Returns:
        Tuple[float, float, float]: (left_ear, right_ear, average_ear)
    """
    left_ear = calculate_ear(left_landmarks)
    right_ear = calculate_ear(right_landmarks)
    
    # Check physiological validity
    left_valid = validate_ear(left_ear)
    right_valid = validate_ear(right_ear)
    
    if left_valid and right_valid:
        avg_ear = (left_ear + right_ear) / 2.0
    elif left_valid:
        avg_ear = left_ear
    elif right_valid:
        avg_ear = right_ear
    else:
        avg_ear = (left_ear + right_ear) / 2.0
        
    return left_ear, right_ear, avg_ear


def is_eye_closed(ear: float, threshold: float = DEFAULT_EAR_THRESHOLD) -> bool:
    """Check if EAR indicates a closed eye using standard reference threshold."""
    return ear < threshold


class BaselineCalibrator:
    """
    Calibrates personalized open-eye baseline during initial normal driving.
    Adapts close/open thresholds to individual driver physiology.
    """
    def __init__(self, target_samples: int = 60):
        self.target_samples = target_samples
        self.samples: List[float] = []
        self.is_calibrated = False
        self.baseline_ear = DEFAULT_EAR_THRESHOLD + 0.10  # default ~0.31

    def add_sample(self, ear: float, is_reliable: bool = True):
        if self.is_calibrated or not is_reliable:
            return
        if 0.20 <= ear <= 0.45:
            self.samples.append(ear)
            if len(self.samples) >= self.target_samples:
                # Compute median as robust open-eye baseline
                sorted_samples = sorted(self.samples)
                mid = len(sorted_samples) // 2
                self.baseline_ear = sorted_samples[mid]
                self.is_calibrated = True

    def get_progress(self) -> float:
        return min(1.0, len(self.samples) / float(self.target_samples))

    def get_adapted_thresholds(self) -> Tuple[float, float]:
        """Returns adapted (close_threshold, open_threshold) based on calibrated baseline."""
        if not self.is_calibrated:
            return DEFAULT_EAR_CLOSE_THRESHOLD, DEFAULT_EAR_OPEN_THRESHOLD
        close_t = max(0.16, min(0.24, self.baseline_ear * 0.65))
        open_t = max(close_t + 0.03, min(0.28, self.baseline_ear * 0.78))
        return close_t, open_t

    def reset(self):
        self.samples.clear()
        self.is_calibrated = False
        self.baseline_ear = 0.31


class EyeStateTracker:
    """
    Stateful eye tracker with:
    - Elapsed time-based closure tracking
    - Hysteresis state transitions
    - Exponential moving average smoothing
    - Separation of blinks (0.08s - 0.45s) from prolonged closure
    """
    def __init__(
        self,
        close_threshold: float = DEFAULT_EAR_CLOSE_THRESHOLD,
        open_threshold: float = DEFAULT_EAR_OPEN_THRESHOLD,
        ear_threshold: float = DEFAULT_EAR_THRESHOLD,
        smoothing_alpha: float = 0.35,
        fps: float = 30.0
    ):
        self.close_threshold = close_threshold
        self.open_threshold = open_threshold
        self.ear_threshold = ear_threshold
        self.smoothing_alpha = smoothing_alpha
        self.fps = max(fps, 1.0)
        
        self.smoothed_ear: Optional[float] = None
        self.is_currently_closed = False
        self.consecutive_closed_frames = 0
        self.current_closure_duration_s = 0.0
        self.last_timestamp: Optional[float] = None
        self.closed_start_timestamp: Optional[float] = None
        
        self.total_blinks = 0
        self.blink_timestamps: List[float] = []

    def update(self, avg_ear: float, timestamp: float) -> dict:
        """
        Update tracker with current frame's average EAR and timestamp (in seconds).
        Calculates closure using actual elapsed time deltas.
        """
        # 1. Temporal asymmetric smoothing:
        # Snap immediately on crossing open_threshold or close_threshold to prevent filter lag
        if self.smoothed_ear is None or avg_ear >= self.open_threshold or avg_ear <= self.close_threshold:
            self.smoothed_ear = avg_ear
        else:
            self.smoothed_ear = (self.smoothing_alpha * avg_ear) + ((1.0 - self.smoothing_alpha) * self.smoothed_ear)
            
        current_ear = self.smoothed_ear

        # 2. Hysteresis thresholding
        if not self.is_currently_closed:
            # Transition to closed only if EAR drops below close_threshold
            if current_ear < self.close_threshold:
                self.is_currently_closed = True
                self.closed_start_timestamp = timestamp
                self.consecutive_closed_frames = 1
                self.current_closure_duration_s = 0.0
            else:
                self.consecutive_closed_frames = 0
                self.current_closure_duration_s = 0.0
        else:
            # Transition back to open only if EAR exceeds open_threshold
            if current_ear > self.open_threshold:
                # Eye reopened: check duration of closure to identify standard blink
                duration = self.current_closure_duration_s
                if MIN_BLINK_DURATION_S <= duration <= MAX_BLINK_DURATION_S:
                    self.total_blinks += 1
                    self.blink_timestamps.append(timestamp)
                    
                self.is_currently_closed = False
                self.closed_start_timestamp = None
                self.consecutive_closed_frames = 0
                self.current_closure_duration_s = 0.0
            else:
                # Eye remains closed: calculate exact elapsed time
                self.consecutive_closed_frames += 1
                elapsed = timestamp - (self.closed_start_timestamp or timestamp)
                frame_elapsed = self.consecutive_closed_frames / self.fps
                self.current_closure_duration_s = max(elapsed, frame_elapsed)

        self.last_timestamp = timestamp

        # Prune blink timestamps older than 60 seconds
        cutoff = timestamp - 60.0
        self.blink_timestamps = [t for t in self.blink_timestamps if t >= cutoff]
        blinks_per_minute = len(self.blink_timestamps)

        return {
            "ear": round(current_ear, 3),
            "raw_ear": round(avg_ear, 3),
            "is_closed": self.is_currently_closed,
            "closed_frames": self.consecutive_closed_frames,
            "closure_duration_s": round(self.current_closure_duration_s, 2),
            "total_blinks": self.total_blinks,
            "blinks_per_minute": blinks_per_minute,
        }

    def reset(self):
        """Reset tracking state."""
        self.smoothed_ear = None
        self.is_currently_closed = False
        self.consecutive_closed_frames = 0
        self.current_closure_duration_s = 0.0
        self.last_timestamp = None
        self.closed_start_timestamp = None
        self.total_blinks = 0
        self.blink_timestamps.clear()
