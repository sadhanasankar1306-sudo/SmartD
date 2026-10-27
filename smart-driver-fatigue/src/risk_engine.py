"""
Explainable Fatigue-Risk Engine for Smart Driver Fatigue Prevention System.
Combines eye closure duration, blink frequency, yawning frequency, and head nodding
into a transparent 0-100 heuristic risk score with detailed signal attribution.

Disclaimer:
This is a heuristic indicator for research and prototyping. It does not provide
medically certified diagnosis of alertness or guarantee sleepiness prediction.
"""
from typing import Any, Dict, Optional

# Default weights (must sum to 1.0)
DEFAULT_WEIGHTS = {
    "closure_duration": 0.40,
    "blink_pattern": 0.15,
    "yawn_frequency": 0.25,
    "head_nodding": 0.20,
}

# Score categories and 4 clear system states
CATEGORY_LOW = "Low"
CATEGORY_MODERATE = "Moderate"
CATEGORY_HIGH = "High"

STATE_UNAVAILABLE = "unavailable"
STATE_LOW = "low"
STATE_CAUTION = "caution"
STATE_HIGH_WARNING = "high_warning"

LABEL_UNAVAILABLE = "Monitoring unavailable - Unreliable sensor visibility"
LABEL_LOW = "Alert indicators low"
LABEL_MODERATE = "Caution"
LABEL_HIGH = "High warning"


class FatigueRiskEngine:
    """
    Transparent, explainable multi-signal fatigue risk calculator.
    """
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or dict(DEFAULT_WEIGHTS)
        # Normalize weights to ensure sum == 1.0
        total_w = sum(self.weights.values())
        if abs(total_w - 1.0) > 1e-4 and total_w > 0:
            self.weights = {k: v / total_w for k, v in self.weights.items()}

    @staticmethod
    def normalize_closure_duration(duration_s: float) -> float:
        """
        Normalize sustained eye closure duration to 0-100.
        0.0s - 0.8s: normal eye closure / slow blink -> 0 to 15
        0.8s - 1.5s: drowsy closure -> 15 to 50
        1.5s - 2.5s: serious microsleep risk -> 50 to 85
        >= 2.5s: critical microsleep -> 100
        """
        if duration_s <= 0.3:
            return 0.0
        elif duration_s <= 0.8:
            return (duration_s - 0.3) / 0.5 * 15.0
        elif duration_s <= 1.5:
            return 15.0 + ((duration_s - 0.8) / 0.7 * 35.0)
        elif duration_s <= 2.5:
            return 50.0 + ((duration_s - 1.5) / 1.0 * 35.0)
        else:
            return min(100.0, 85.0 + ((duration_s - 2.5) / 1.0 * 15.0))

    @staticmethod
    def normalize_blink_rate(bpm: float) -> float:
        """
        Normalize blinks per minute (bpm).
        Normal baseline: 12-25 bpm -> 0-10 score.
        Low blink rate (<10 bpm) or erratic high (>35 bpm) indicates fatigue / eye strain.
        """
        if 12.0 <= bpm <= 25.0:
            return 5.0
        elif bpm < 12.0:
            # Low blink rate: prolonged staring before microsleep
            if bpm <= 4.0:
                return 80.0
            return 5.0 + (12.0 - bpm) / 8.0 * 60.0
        else:
            # High rapid flutter / eye strain
            if bpm >= 45.0:
                return 75.0
            return 5.0 + (bpm - 25.0) / 20.0 * 60.0

    @staticmethod
    def normalize_yawn_frequency(yawns_recent: int) -> float:
        """
        Normalize yawning count in recent window (e.g. 3 min).
        0 yawns: 0 score
        1 yawn: 30 score
        2 yawns: 65 score
        3+ yawns: 90 - 100 score
        """
        if yawns_recent <= 0:
            return 0.0
        elif yawns_recent == 1:
            return 40.0
        elif yawns_recent == 2:
            return 75.0
        else:
            return min(100.0, 90.0 + (yawns_recent - 3) * 5.0)

    @staticmethod
    def normalize_head_nodding(nods_recent: int, is_currently_nodding: bool) -> float:
        """
        Normalize head nods in recent window (3 min).
        0 nods: 0 score
        1 nod: 50 score
        2+ nods: 85 - 100 score
        Immediate bonus if currently nodding down.
        """
        score = 0.0
        if nods_recent == 1:
            score = 50.0
        elif nods_recent >= 2:
            score = min(100.0, 80.0 + (nods_recent - 2) * 10.0)

        if is_currently_nodding:
            score = max(score, 75.0)
        return float(score)

    def calculate_risk(
        self,
        closure_duration_s: float,
        blinks_per_minute: float,
        yawns_recent: int,
        nods_recent: int,
        is_currently_nodding: bool = False,
        signal_quality: float = 1.0,
        face_detected: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate composite explainable risk score and categorical classification.
        
        Returns:
            dict containing:
                - is_reliable: bool
                - score: Optional[float] (0-100)
                - category: str ("Low", "Moderate", "High", or "Insufficient Data")
                - category_label: str
                - alert_level: int (0: Normal, 1: Caution, 2: High)
                - signal_breakdown: dict of raw and normalized sub-scores
                - contributions: dict of percentage contributions to total score
                - explanation: str
        """
        # Critical condition: If face is not detected or quality is too low (< 0.35)
        # Avoid treating missing data as alert!
        if not face_detected or signal_quality < 0.35:
            return {
                "is_reliable": False,
                "score": None,
                "category": "Insufficient Data",
                "category_label": LABEL_UNAVAILABLE,
                "system_state": STATE_UNAVAILABLE,
                "alert_level": 0,
                "signal_breakdown": {},
                "contributions": {},
                "explanation": "Driver face is obscured, out of frame, or lighting is inadequate. Risk calculation suspended.",
            }

        # Calculate sub-scores
        s_closure = self.normalize_closure_duration(closure_duration_s)
        s_blink = self.normalize_blink_rate(blinks_per_minute)
        s_yawn = self.normalize_yawn_frequency(yawns_recent)
        s_nod = self.normalize_head_nodding(nods_recent, is_currently_nodding)

        # Weighted sum
        w = self.weights
        composite_score = (
            w["closure_duration"] * s_closure +
            w["blink_pattern"] * s_blink +
            w["yawn_frequency"] * s_yawn +
            w["head_nodding"] * s_nod
        )
        
        # Clamp to [0, 100]
        composite_score = max(0.0, min(100.0, composite_score))

        # Categorization into 4 clear states
        if composite_score < 35.0:
            category = CATEGORY_LOW
            label = LABEL_LOW
            system_state = STATE_LOW
            alert_level = 0
        elif composite_score < 70.0:
            category = CATEGORY_MODERATE
            label = LABEL_MODERATE
            system_state = STATE_CAUTION
            alert_level = 1
        else:
            category = CATEGORY_HIGH
            label = LABEL_HIGH
            system_state = STATE_HIGH_WARNING
            alert_level = 2

        # Relative contributions
        total_points = composite_score if composite_score > 0 else 1.0
        contributions = {
            "closure_duration": round((w["closure_duration"] * s_closure / total_points) * 100.0, 1),
            "blink_pattern": round((w["blink_pattern"] * s_blink / total_points) * 100.0, 1),
            "yawn_frequency": round((w["yawn_frequency"] * s_yawn / total_points) * 100.0, 1),
            "head_nodding": round((w["head_nodding"] * s_nod / total_points) * 100.0, 1),
        }

        # Formulate human-readable explanation
        reasons = []
        if s_closure >= 50.0:
            reasons.append(f"sustained eye closure ({closure_duration_s:.1f}s)")
        if s_nod >= 50.0:
            reasons.append(f"head nodding episodes ({nods_recent} recent)")
        if s_yawn >= 50.0:
            reasons.append(f"repeated yawning ({yawns_recent} recent)")
        if s_blink >= 50.0:
            reasons.append(f"abnormal blink frequency ({blinks_per_minute:.0f} bpm)")

        if reasons:
            explanation = "Elevated indicators driven by " + ", ".join(reasons) + "."
        else:
            explanation = "Driver indicators within nominal awake baseline."

        return {
            "is_reliable": True,
            "score": round(composite_score, 1),
            "category": category,
            "category_label": label,
            "system_state": system_state,
            "alert_level": alert_level,
            "signal_breakdown": {
                "closure_subscore": round(s_closure, 1),
                "blink_subscore": round(s_blink, 1),
                "yawn_subscore": round(s_yawn, 1),
                "nod_subscore": round(s_nod, 1),
            },
            "contributions": contributions,
            "explanation": explanation,
        }
