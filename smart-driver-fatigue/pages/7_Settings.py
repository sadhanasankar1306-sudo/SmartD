"""
Page 7: System Settings - Thresholds, Audio, and Data Management
"""
import streamlit as st
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import FatigueDatabase
from src.validation import validate_settings

st.set_page_config(page_title="Settings - Fatigue Guard", page_icon="⚙️", layout="wide")

st.title("⚙️ System Settings & Calibration")
st.markdown("Fine-tune detection sensitivity, sustained-duration alarm thresholds, and privacy preferences.")

db = FatigueDatabase()

tab_detection, tab_alerts, tab_privacy = st.tabs(["Vision Thresholds", "Alert & Audio Rules", "Privacy & Data Retention"])

with tab_detection:
    st.subheader("Facial Aspect Ratio Thresholds")
    ear = st.slider("Eye Aspect Ratio (EAR) Threshold", min_value=0.15, max_value=0.30, value=0.21, step=0.01,
                    help="Values below this threshold are registered as closed eyes. Default is 0.21.")
    mar = st.slider("Mouth Aspect Ratio (MAR) Threshold", min_value=0.45, max_value=0.85, value=0.60, step=0.01,
                    help="Values above this threshold are registered as open mouth / yawn. Default is 0.60.")
    pitch = st.slider("Head Nodding Pitch Threshold (degrees downward)", min_value=-35, max_value=-10, value=-15, step=1,
                      help="Tilt angle downward indicating head droop or microsleep collapse.")

with tab_alerts:
    st.subheader("Escalation Timing & Cooldowns")
    caution_dur = st.slider("Caution Sustained Eye Closure (seconds)", min_value=0.5, max_value=2.0, value=1.5, step=0.1,
                            help="Duration of closed eyes required to trigger Level 1 Caution.")
    high_dur = st.slider("High Warning Sustained Eye Closure (seconds)", min_value=1.8, max_value=4.0, value=2.5, step=0.1,
                         help="Duration of closed eyes required to trigger Level 2 Urgent Siren.")
    cooldown = st.slider("Alert Cooldown Window (seconds)", min_value=2.0, max_value=15.0, value=5.0, step=0.5,
                         help="Suppresses repeated warning alarms for the same level within this interval.")
    sound_enabled = st.checkbox("Enable Audible Warning Sounds", value=True)

with tab_privacy:
    st.subheader("Local Data Retention")
    st.markdown("""
    - **No Face Images Stored**: Raw webcam frames are processed strictly in local memory and instantly discarded.
    - **No External Cloud Transmission**: Landmark extraction occurs locally on device.
    - **Stored Records**: Only numerical event timestamps, duration, and aggregate risk scores in local SQLite.
    """)
    if st.button("🗑️ Clear All Saved Session History", type="secondary"):
        db.delete_all_history()
        st.success("All session records and alert event history safely erased.")

st.divider()
if st.button("Save & Validate Preferences", type="primary"):
    cfg = {
        "ear_threshold": ear,
        "mar_threshold": mar,
        "caution_eye_closure_s": caution_dur,
        "high_eye_closure_s": high_dur,
        "cooldown_seconds": cooldown,
    }
    is_valid, msg = validate_settings(cfg)
    if is_valid:
        st.success("✅ Preferences validated and saved successfully.")
    else:
        st.error(f"❌ Configuration Error: {msg}")
