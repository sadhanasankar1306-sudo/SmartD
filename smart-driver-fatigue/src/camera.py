"""
Camera and video capture manager for OpenCV video streams.
Handles webcam device discovery, video file reading, frame resizing, and safe resource release.
"""
import logging
from typing import Generator, Optional, Tuple

logger = logging.getLogger(__name__)


class VideoCaptureManager:
    """
    Manages OpenCV VideoCapture handles with safe context management and resource release.
    """
    def __init__(self, source: int | str = 0, target_width: int = 640, target_height: int = 480):
        self.source = source
        self.target_width = target_width
        self.target_height = target_height
        self.cap = None

    def start(self) -> bool:
        """Initialize camera or video file."""
        try:
            import cv2
            self.cap = cv2.VideoCapture(self.source)
            if not self.cap.isOpened():
                logger.error(f"Cannot open video source: {self.source}")
                return False
            # Request resolution
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.target_width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.target_height)
            return True
        except Exception as e:
            logger.error(f"Error starting VideoCapture: {e}")
            return False

    def read_frame(self):
        """Read a single frame. Returns (success, frame)."""
        if self.cap is None or not self.cap.isOpened():
            return False, None
        return self.cap.read()

    def release(self):
        """Safely release the camera handle."""
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
