"""
Validation module for camera image quality, face visibility, and settings bounds.
Ensures monitoring fails gracefully instead of producing false positives.
"""
from typing import Dict, Tuple, Union


def validate_settings(settings: Dict[str, Union[int, float, bool]]) -> Tuple[bool, str]:
    """
    Validate user configuration values.
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    ear_thresh = float(settings.get("ear_threshold", 0.21))
    if not (0.10 <= ear_thresh <= 0.40):
        return False, f"EAR threshold must be between 0.10 and 0.40 (got {ear_thresh})"

    mar_thresh = float(settings.get("mar_threshold", 0.60))
    if not (0.35 <= mar_thresh <= 1.00):
        return False, f"MAR threshold must be between 0.35 and 1.00 (got {mar_thresh})"

    caution_s = float(settings.get("caution_eye_closure_s", 1.5))
    high_s = float(settings.get("high_eye_closure_s", 2.5))
    if caution_s <= 0.2:
        return False, f"Caution closure duration must be > 0.2s (got {caution_s})"
    if high_s <= caution_s:
        return False, f"High warning closure duration ({high_s}s) must exceed caution duration ({caution_s}s)"

    cooldown = float(settings.get("cooldown_seconds", 5.0))
    if not (1.0 <= cooldown <= 30.0):
        return False, f"Alert cooldown must be between 1.0 and 30.0 seconds (got {cooldown})"

    return True, "Valid configuration"


def assess_image_quality(mean_brightness: float, std_contrast: float) -> Tuple[float, str]:
    """
    Assess quality score (0.0 to 1.0) and status from lighting/contrast metrics.
    
    Args:
        mean_brightness: 0 - 255 grayscale mean
        std_contrast: standard deviation of pixel intensities
    """
    # Extremely dark or washed out
    if mean_brightness < 30.0:
        return 0.2, "Lighting too dark - Inadequate camera illumination"
    if mean_brightness > 235.0:
        return 0.3, "Lighting too bright - Glare or overexposed frame"
    if std_contrast < 15.0:
        return 0.25, "Low contrast - Washed out or foggy sensor"

    # Compute continuous 0.5 - 1.0 quality score
    light_score = 1.0 - abs(mean_brightness - 128.0) / 128.0 * 0.4
    contrast_score = min(1.0, std_contrast / 50.0) * 0.6
    quality = min(1.0, max(0.0, light_score * 0.5 + contrast_score))
    
    return float(round(quality, 2)), "Lighting nominal"


def check_face_framing(
    box_x_min: float, box_y_min: float, 
    box_x_max: float, box_y_max: float,
    frame_w: float = 1.0, frame_h: float = 1.0
) -> Tuple[bool, str]:
    """
    Verify face is comfortably centered in frame and not severely clipped at edges.
    Normalized coordinates [0, 1].
    """
    margin = 0.02
    if box_x_min < margin or box_y_min < margin or box_x_max > (frame_w - margin) or box_y_max > (frame_h - margin):
        return False, "Face partly outside frame boundary"
    
    # Face should occupy reasonable portion of frame (not tiny background face)
    face_w = box_x_max - box_x_min
    face_h = box_y_max - box_y_min
    face_area = face_w * face_h
    if face_area < 0.02:
        return False, "Driver face too distant from camera"

    return True, "Face well framed"
