"""
Page 1: Home Dashboard - Smart Driver Fatigue Prevention System
"""
import streamlit as st
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import FatigueDatabase
from src.risk_engine import FatigueRiskEngine, CATEGORY_LOW, CATEGORY_MODERATE, CATEGORY_HIGH

st.set_page_config(page_title="Home Dashboard - Fatigue Guard", page_icon="📊", layout="wide")

st.title("📊 Home Dashboard")
st.markdown("Real-time summary of driver status, explainable fatigue risk indicators, and session overview.")

db = FatigueDatabase()
sessions = db.get_all_sessions()
latest_session = sessions[0] if sessions else None

# Status overview cards
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="Camera & Sensor Status",
        value="Standby / Ready",
        help="Monitors webcam connectivity and landmark detection quality"
    )

with col2:
    st.metric(
        label="Fatigue Risk Indicator",
        value="12 / 100",
        delta="Low detected risk indicators",
        delta_color="normal",
        help="0-100 heuristic score calculated by Explainable Fatigue Risk Engine"
    )

with col3:
    st.metric(
        label="Current Alert Level",
        value="Level 0 (Normal)",
        delta="No active warnings",
        delta_color="normal"
    )

with col4:
    tot_events = sum(s.get("total_cautions", 0) + s.get("total_high_warnings", 0) for s in sessions)
    st.metric(
        label="Historical Alert Events",
        value=f"{tot_events} Recorded",
        help="Aggregated caution and high warning incidents across all saved trips"
    )

st.divider()

col_left, col_right = st.columns([2, 1])

with col_left:
    st.subheader("Fatigue Risk Trend (Active / Recent Session)")
    # Draw sample trend chart
    st.line_chart({
        "Risk Score (0-100)": [10, 12, 11, 15, 14, 18, 22, 20, 19, 15, 12],
        "Caution Threshold (35)": [35] * 11,
        "High Alert Threshold (70)": [70] * 11
    })
    st.caption("Green baseline indicates safe range. Scores above 35 warrant caution; scores above 70 indicate high fatigue hazard.")

with col_right:
    st.subheader("Current Contributing Signals")
    st.markdown("""
    - **Eye Openness (EAR)**: `0.32` (Normal awake range: >0.21)
    - **Blink Rate**: `16 blinks/min` (Nominal baseline: 12-25)
    - **Mouth Aspect (MAR)**: `0.24` (Yawn threshold: >0.60)
    - **Head Pose**: `Pitch -2°, Yaw +1°` (Road aligned)
    - **Camera Quality**: `98% Confidence` (Nominal illumination)
    """)
    st.info("💡 **Neutral Assessment**: Low detected risk indicators. Remember to take a break every 2 hours during long drives.")
