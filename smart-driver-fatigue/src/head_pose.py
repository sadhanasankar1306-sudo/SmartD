"""
Head pose and orientation analysis for driver nodding and inattention detection.
Estimates pitch (nodding forward/backward), yaw (left/right turn), and roll (lateral tilt).
"""
import math
from typing import Dict, List, Tuple, Union

# Default threshold for downward nodding (degrees)
DEFAULT_NOD_PITCH_THRESHOLD = -15.0  # negative indicates head tilted downward
DEFAULT_INATTENTION_YAW_THRESHOLD = 28.0 # degrees turned away from road


def estimate_head_pose_angles(landmarks: Dict[int, Union[Tuple[float, float, float], List[float]]]) -> Tuple[float, float, float]:
    """
    Estimate head orientation angles (pitch, yaw, roll) in degrees from key landmarks.
    
    Required landmark indices:
        1: Nose tip
        152: Chin
        33: Left eye outer corner
        263: Right eye outer corner
        61: Left mouth corner
        291: Right mouth corner
        
    Returns:
        Tuple[float, float, float]: (pitch, yaw, roll) in degrees.
    """
    if not all(idx in landmarks for idx in [1, 152, 33, 263, 61, 291]):
        return 0.0, 0.0, 0.0

    nose = landmarks[1]
    chin = landmarks[152]
    left_eye = landmarks[33]
    right_eye = landmarks[263]
    
    # 1. Roll: Angle between eye corners and horizontal
    dx_eyes = right_eye[0] - left_eye[0]
    dy_eyes = right_eye[1] - left_eye[1]
    roll_rad = math.atan2(dy_eyes, dx_eyes if abs(dx_eyes) > 1e-6 else 1e-6)
    roll = math.degrees(roll_rad)

    # 2. Yaw: Horizontal asymmetry of nose between eyes
    eye_mid_x = (left_eye[0] + right_eye[0]) / 2.0
    eye_dist = math.sqrt(dx_eyes ** 2 + dy_eyes ** 2)
    if eye_dist > 1e-6:
        # Distance of nose from eyes midpoint relative to eye span
        nose_offset_x = (nose[0] - eye_mid_x) / eye_dist
        # Normalized to approx [-90, +90] degrees
        yaw = max(-90.0, min(90.0, nose_offset_x * 90.0 * 2.0))
    else:
        yaw = 0.0

    # 3. Pitch: Vertical ratio between eye-nose and nose-chin
    eye_mid_y = (left_eye[1] + right_eye[1]) / 2.0
    dist_eye_nose = nose[1] - eye_mid_y
    dist_nose_chin = chin[1] - nose[1]
    
    # In standard neutral face, dist_nose_chin / dist_eye_nose is roughly 1.0 - 1.3
    # When head nods down, nose gets closer to chin, dist_eye_nose expands or dist_nose_chin shrinks
    if dist_eye_nose > 1e-6:
        ratio = dist_nose_chin / dist_eye_nose
        # Neutral baseline ratio is ~1.2
        pitch = (ratio - 1.2) * 45.0
        pitch = max(-60.0, min(60.0, pitch))
    else:
        pitch = 0.0

    return float(pitch), float(yaw), float(roll)


class HeadPoseTracker:
    """
    Tracks head movements, downward nodding events (microsleep indicator),
    and prolonged looking away from the windshield.
    """
    def __init__(self, nod_pitch_thresh: float = DEFAULT_NOD_PITCH_THRESHOLD,
                 yaw_inattention_thresh: float = DEFAULT_INATTENTION_YAW_THRESHOLD,
                 fps: float = 30.0):
        self.nod_pitch_thresh = nod_pitch_thresh
        self.yaw_inattention_thresh = yaw_inattention_thresh
        self.fps = max(fps, 1.0)
        
        self.consecutive_nod_frames = 0
        self.is_nodding = False
        self.total_nods = 0
        self.nod_timestamps: List[float] = []
        
        self.consecutive_distracted_frames = 0
        self.is_distracted = False

    def update(self, pitch: float, yaw: float, roll: float, timestamp: float) -> dict:
        """
        Update tracker with current orientation angles and timestamp.
        """
        # Head nodding detection (pitch below threshold for > 0.5s)
        if pitch <= self.nod_pitch_thresh:
            self.consecutive_nod_frames += 1
            duration = self.consecutive_nod_frames / self.fps
            if duration >= 0.5 and not self.is_nodding:
                self.is_nodding = True
                self.total_nods += 1
                self.nod_timestamps.append(timestamp)
        else:
            self.consecutive_nod_frames = 0
            self.is_nodding = False

        # Inattention / distracted gaze detection (yaw > threshold)
        if abs(yaw) >= self.yaw_inattention_thresh:
            self.consecutive_distracted_frames += 1
            if (self.consecutive_distracted_frames / self.fps) >= 1.5:
                self.is_distracted = True
        else:
            self.consecutive_distracted_frames = 0
            self.is_distracted = False

        # Prune nods older than 3 minutes (180 seconds)
        cutoff = timestamp - 180.0
        self.nod_timestamps = [t for t in self.nod_timestamps if t >= cutoff]

        return {
            "pitch": pitch,
            "yaw": yaw,
            "roll": roll,
            "is_nodding": self.is_nodding,
            "nod_count": self.total_nods,
            "recent_nods": len(self.nod_timestamps),
            "is_distracted": self.is_distracted,
        }

    def reset(self):
        """Reset tracking state."""
        self.consecutive_nod_frames = 0
        self.is_nodding = False
        self.total_nods = 0
        self.nod_timestamps.clear()
        self.consecutive_distracted_frames = 0
        self.is_distracted = False
