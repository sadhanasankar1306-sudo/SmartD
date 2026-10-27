"""
MediaPipe Face Mesh and landmark extraction adapter.
Extracts 468 3D landmarks for real-time fatigue monitoring.
"""
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class FaceMeshDetector:
    """
    Adapter for MediaPipe Face Mesh.
    """
    def __init__(self, max_num_faces: int = 1, min_detection_confidence: float = 0.5, min_tracking_confidence: float = 0.5):
        self.max_num_faces = max_num_faces
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.face_mesh = None

    def initialize(self) -> bool:
        """Initialize MediaPipe FaceMesh."""
        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=self.max_num_faces,
                refine_landmarks=True,
                min_detection_confidence=self.min_detection_confidence,
                min_tracking_confidence=self.min_tracking_confidence
            )
            return True
        except Exception as e:
            logger.warning(f"MediaPipe not installed or failed to initialize: {e}")
            return False

    def process_rgb_frame(self, rgb_frame) -> Tuple[bool, Optional[Dict[int, Tuple[float, float, float]]]]:
        """
        Process an RGB image and return landmark dictionary {index: (x, y, z)}.
        """
        if self.face_mesh is None:
            if not self.initialize():
                return False, None

        results = self.face_mesh.process(rgb_frame)
        if not results.multi_face_landmarks:
            return False, None

        face = results.multi_face_landmarks[0]
        h, w = rgb_frame.shape[:2]
        
        landmarks = {}
        for idx, lm in enumerate(face.landmark):
            # Scale x and y to pixel space, z relative
            landmarks[idx] = (lm.x * w, lm.y * h, lm.z * w)

        return True, landmarks

    def close(self):
        """Release FaceMesh resources."""
        if self.face_mesh is not None:
            try:
                self.face_mesh.close()
            except Exception:
                pass
            self.face_mesh = None
