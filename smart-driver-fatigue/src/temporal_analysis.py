"""
Temporal analysis module for aggregating driver signals over time windows.
Prevents false alarms from momentary single-frame fluctuations.
"""
from collections import deque
from typing import Deque, Dict, List, Optional


class TemporalSignalAggregator:
    """
    Maintains time-series buffers of eye closure, blinks, yawns, and head nodding.
    Provides smoothed values and rate-of-change statistics.
    """
    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self.ear_history: Deque[tuple[float, float]] = deque()  # (timestamp, ear)
        self.closure_events: List[dict] = []
        self.yawn_events: List[dict] = []
        self.nod_events: List[dict] = []
        self.quality_history: Deque[tuple[float, float]] = deque() # (timestamp, quality)

    def record_frame(self, timestamp: float, ear: Optional[float], 
                     is_closed: bool, is_yawning: bool, 
                     is_nodding: bool, quality: float):
        """Record measurements for current frame."""
        cutoff = timestamp - self.window_seconds
        
        # 1. EAR and quality buffer
        if ear is not None:
            self.ear_history.append((timestamp, ear))
        self.quality_history.append((timestamp, quality))

        # Evict old entries
        while self.ear_history and self.ear_history[0][0] < cutoff:
            self.ear_history.popleft()
        while self.quality_history and self.quality_history[0][0] < cutoff:
            self.quality_history.popleft()

    def get_smoothed_ear(self) -> Optional[float]:
        """Compute rolling average EAR across the recent window."""
        if not self.ear_history:
            return None
        total = sum(item[1] for item in self.ear_history)
        return total / len(self.ear_history)

    def get_average_quality(self) -> float:
        """Compute rolling average image/landmark quality."""
        if not self.quality_history:
            return 0.0
        return sum(item[1] for item in self.quality_history) / len(self.quality_history)

    def reset(self):
        """Clear temporal buffers."""
        self.ear_history.clear()
        self.quality_history.clear()
        self.closure_events.clear()
        self.yawn_events.clear()
        self.nod_events.clear()
