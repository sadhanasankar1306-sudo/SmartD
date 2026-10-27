"""
Yawn analysis module for calculating Mouth Aspect Ratio (MAR) and detecting yawns.
Differentiates between talking/smiling (short duration) and true yawns (>1.5s).
"""
import math
from typing import List, Tuple, Union

# MediaPipe 468 landmark indices for lips
MOUTH_CORNERS = [61, 291]  # Left, Right
MOUTH_VERTICAL_1 = [13, 14]  # Upper middle, Lower middle
MOUTH_VERTICAL_2 = [82, 87]  # Upper left, Lower left
MOUTH_VERTICAL_3 = [312, 317] # Upper right, Lower right

DEFAULT_MAR_THRESHOLD = 0.60
DEFAULT_YAWN_MIN_DURATION_S = 1.5


def euclidean_distance(p1: Union[Tuple[float, float], List[float]], 
                       p2: Union[Tuple[float, float], List[float]]) -> float:
    """Calculate Euclidean distance between two 2D or 3D points."""
    dx = p1[0] - p2[0]
    dy = p1[1] - p2[1]
    dz = (p1[2] - p2[2]) if len(p1) > 2 and len(p2) > 2 else 0.0
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def calculate_mar(mouth_landmarks: List[Union[Tuple[float, float], List[float]]]) -> float:
    """
    Calculate Mouth Aspect Ratio (MAR).
    
    Expects 8 points:
    [left_corner, right_corner, top_mid, btm_mid, top_left, btm_left, top_right, btm_right]
    
    Formula:
        MAR = (v1 + v2 + v3) / (3.0 * h)
    """
    if len(mouth_landmarks) < 8:
        # Fallback if only 4 points provided: [left, right, top, bottom]
        if len(mouth_landmarks) >= 4:
            left, right, top, btm = mouth_landmarks[:4]
            h = euclidean_distance(left, right)
            v = euclidean_distance(top, btm)
            return (v / h) if h > 1e-6 else 0.0
        raise ValueError(f"Expected at least 4 landmarks for mouth, got {len(mouth_landmarks)}")

    left, right, top_mid, btm_mid, top_l, btm_l, top_r, btm_r = mouth_landmarks[:8]
    
    h = euclidean_distance(left, right)
    if h < 1e-6:
        return 0.0

    v1 = euclidean_distance(top_mid, btm_mid)
    v2 = euclidean_distance(top_l, btm_l)
    v3 = euclidean_distance(top_r, btm_r)

    mar = (v1 + v2 + v3) / (3.0 * h)
    return float(mar)


class YawnTracker:
    """
    Tracks mouth opening, yawn durations, and counts yawn events over time.
    """
    def __init__(self, mar_threshold: float = DEFAULT_MAR_THRESHOLD,
                 min_duration_s: float = DEFAULT_YAWN_MIN_DURATION_S,
                 fps: float = 30.0):
        self.mar_threshold = mar_threshold
        self.min_duration_s = min_duration_s
        self.fps = max(fps, 1.0)
        self.consecutive_open_frames = 0
        self.current_yawn_duration_s = 0.0
        self.is_yawning = False
        self.total_yawns = 0
        self.yawn_timestamps: List[float] = []

    def update(self, mar: float, timestamp: float) -> dict:
        """
        Update tracker with current frame's MAR and timestamp.
        """
        if mar >= self.mar_threshold:
            self.consecutive_open_frames += 1
            self.current_yawn_duration_s = self.consecutive_open_frames / self.fps
            
            # Trigger yawn event once sustained beyond min_duration_s
            if self.current_yawn_duration_s >= self.min_duration_s and not self.is_yawning:
                self.is_yawning = True
                self.total_yawns += 1
                self.yawn_timestamps.append(timestamp)
        else:
            self.consecutive_open_frames = 0
            self.current_yawn_duration_s = 0.0
            self.is_yawning = False

        # Prune timestamps older than 3 minutes (180 seconds)
        cutoff = timestamp - 180.0
        self.yawn_timestamps = [t for t in self.yawn_timestamps if t >= cutoff]
        yawns_last_3min = len(self.yawn_timestamps)

        return {
            "mar": mar,
            "is_yawning": self.is_yawning,
            "yawn_duration_s": self.current_yawn_duration_s,
            "total_yawns": self.total_yawns,
            "yawns_recent": yawns_last_3min,
        }

    def reset(self):
        """Reset tracking state."""
        self.consecutive_open_frames = 0
        self.current_yawn_duration_s = 0.0
        self.is_yawning = False
        self.total_yawns = 0
        self.yawn_timestamps.clear()
