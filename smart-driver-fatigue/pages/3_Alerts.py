"""
Page 3: Alerts System - Progressive Warnings and Threshold Testing
"""
import streamlit as st
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.alert_manager import AlertManager, LEVEL_NORMAL, LEVEL_CAUTION, LEVEL_HIGH_WARNING

st.set_page_config(page_title="Alerts System - Fatigue Guard", page_icon="🔔", layout="wide")

st.title("🔔 Progressive Alert System")
st.markdown("""
Configurable 3-level progressive warning escalation system with sustained-duration checks,
alert cooldowns, and independent alert mechanism testing.
""")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    ### Level 0 — Normal
    - **Visual Indicator**: Green badge
    - **Audio**: Silent
    - **Trigger**: EAR nominal (>0.21), no sustained closure, head aligned.
    - **Advisory**: Regular alertness monitoring active.
    """)

with col2:
    st.markdown("""
    ### Level 1 — Caution
    - **Visual Indicator**: Amber warning card
    - **Audio**: Gentle pulse chime
    - **Trigger**: Eyes closed > 1.5s OR repeated yawns OR moderate risk (35-69).
    - **Advisory**: Increased vigilance; plan upcoming rest break.
    """)

with col3:
    st.markdown("""
    ### Level 2 — High Warning
    - **Visual Indicator**: Red pulsing alert banner
    - **Audio**: Urgent loud siren
    - **Trigger**: Eyes closed > 2.5s OR head nodding drop OR high risk (>=70).
    - **Advisory**: Pull over safely as soon as practical and rest.
    """)

st.divider()
st.subheader("Independent Alert Mechanism Tester")
st.markdown("Test visual and acoustic alerts directly to verify driver notification reliability.")

t_col1, t_col2, t_col3 = st.columns(3)

with t_col1:
    if st.button("Test Normal Status (Level 0)"):
        st.success("✅ [LEVEL 0 NORMAL] Monitoring active. All signals within safe bounds.")

with t_col2:
    if st.button("Test Caution Alert (Level 1)"):
        st.warning("⚠️ [LEVEL 1 CAUTION] Fatigue warning: Repeated yawning or slow eye reopening detected.")

with t_col3:
    if st.button("Test Urgent Alarm (Level 2)"):
        st.error("🚨 [LEVEL 2 HIGH WARNING] Critical microsleep hazard detected! Pull over safely and rest.")
