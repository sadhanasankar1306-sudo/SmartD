"""
Progressive Alert System for Smart Driver Fatigue Prevention System.
Manages 3 alert levels, sustained-duration validation, alert cooldowns,
and event logging.
"""
import time
from typing import Any, Dict, List, Optional

LEVEL_NORMAL = 0
LEVEL_CAUTION = 1
LEVEL_HIGH_WARNING = 2


class AlertManager:
    """
    Stateful alert manager enforcing cooldowns and progressive escalation.
    """
    def __init__(
        self,
        caution_eye_closure_s: float = 1.5,
        high_eye_closure_s: float = 2.5,
        cooldown_seconds: float = 5.0,
        audio_muted: bool = False
    ):
        self.caution_eye_closure_s = caution_eye_closure_s
        self.high_eye_closure_s = high_eye_closure_s
        self.cooldown_seconds = cooldown_seconds
        self.audio_muted = audio_muted
        
        self.current_level = LEVEL_NORMAL
        self.last_alert_time: float = 0.0
        self.last_alert_trigger: str = ""
        self.event_log: List[Dict[str, Any]] = []

    def evaluate_signals(
        self,
        closure_duration_s: float,
        is_nodding: bool,
        is_yawning: bool,
        risk_score: Optional[float],
        timestamp: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate current metrics against progressive escalation thresholds.
        
        Returns:
            dict containing alert state, triggers, audible flag, and recommendation.
        """
        current_t = timestamp if timestamp is not None else time.time()
        
        # Determine candidate level based on sustained criteria
        candidate_level = LEVEL_NORMAL
        triggers = []

        if closure_duration_s >= self.high_eye_closure_s:
            candidate_level = LEVEL_HIGH_WARNING
            triggers.append(f"Microsleep danger: eyes closed for {closure_duration_s:.1f}s")
        elif closure_duration_s >= self.caution_eye_closure_s:
            candidate_level = max(candidate_level, LEVEL_CAUTION)
            triggers.append(f"Drowsiness sign: eyes closed for {closure_duration_s:.1f}s")

        if is_nodding:
            if candidate_level >= LEVEL_CAUTION:
                candidate_level = LEVEL_HIGH_WARNING
                triggers.append("Head nodding detected during eye closure")
            else:
                candidate_level = max(candidate_level, LEVEL_CAUTION)
                triggers.append("Head drooping / nodding detected")

        if risk_score is not None:
            if risk_score >= 70.0:
                candidate_level = max(candidate_level, LEVEL_HIGH_WARNING)
                triggers.append(f"High composite fatigue risk ({risk_score:.0f}/100)")
            elif risk_score >= 40.0:
                candidate_level = max(candidate_level, LEVEL_CAUTION)
                triggers.append(f"Elevated fatigue risk ({risk_score:.0f}/100)")

        # Handle cooldown and level transitions
        is_new_alarm = False
        time_since_last = current_t - self.last_alert_time

        if candidate_level > LEVEL_NORMAL:
            # If escalating to high warning, bypass cooldown; otherwise respect cooldown
            can_fire = (candidate_level > self.current_level) or (time_since_last >= self.cooldown_seconds)
            if can_fire:
                self.current_level = candidate_level
                self.last_alert_time = current_t
                self.last_alert_trigger = "; ".join(triggers)
                is_new_alarm = True
                
                # Log event
                self.event_log.append({
                    "timestamp": current_t,
                    "level": self.current_level,
                    "level_name": "High Warning" if self.current_level == 2 else "Caution",
                    "trigger": self.last_alert_trigger,
                    "risk_score": risk_score,
                })
        else:
            # No sustained hazard active: decay back to normal after cooldown period
            if time_since_last >= 2.0:
                self.current_level = LEVEL_NORMAL

        # Determine advisory message
        if self.current_level == LEVEL_HIGH_WARNING:
            advisory = "CRITICAL ALERT: Driver fatigue indicators detected. Pull over safely as soon as practical and rest."
            play_sound = not self.audio_muted
            sound_type = "high_alarm"
        elif self.current_level == LEVEL_CAUTION:
            advisory = "CAUTION: Fatigue warning indicators observed. Increase vigilance or plan a rest break."
            play_sound = not self.audio_muted
            sound_type = "caution_chime"
        else:
            advisory = "Normal: Monitoring active. Stay alert and keep eyes on the road."
            play_sound = False
            sound_type = None

        return {
            "level": self.current_level,
            "level_name": ["Normal", "Caution", "High Warning"][self.current_level],
            "is_alarm_active": self.current_level > LEVEL_NORMAL,
            "is_new_event": is_new_alarm,
            "triggers": triggers,
            "advisory": advisory,
            "play_sound": play_sound,
            "sound_type": sound_type,
            "audio_muted": self.audio_muted,
            "total_events": len(self.event_log),
        }

    def set_mute(self, muted: bool):
        """Toggle audio mute state."""
        self.audio_muted = muted

    def reset(self):
        """Reset alert state and clear logs."""
        self.current_level = LEVEL_NORMAL
        self.last_alert_time = 0.0
        self.last_alert_trigger = ""
        self.event_log.clear()
