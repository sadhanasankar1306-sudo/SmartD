"""
Page 5: Historical Analytics - Session Comparison & Warning Frequencies
"""
import streamlit as st
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import FatigueDatabase

st.set_page_config(page_title="Historical Analytics - Fatigue Guard", page_icon="📈", layout="wide")

st.title("📈 Historical Analytics")
st.markdown("Longitudinal safety trends, risk indicator comparisons, and event frequency over time.")

db = FatigueDatabase()
sessions = db.get_all_sessions()

if not sessions:
    st.info("No historical sessions recorded yet. Complete monitoring sessions to visualize trends.")
else:
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Trips", len(sessions))
    with col2:
        avg_risk_all = sum(s.get("avg_risk", 0.0) for s in sessions) / len(sessions)
        st.metric("Aggregate Avg Risk", f"{avg_risk_all:.1f}/100")
    with col3:
        tot_high = sum(s.get("total_high_warnings", 0) for s in sessions)
        st.metric("Total High Warnings", tot_high)

    st.subheader("Session Comparison: Peak vs Average Risk")
    session_names = [s["id"][:12] for s in sessions]
    peak_risks = [s.get("peak_risk", 0.0) for s in sessions]
    avg_risks = [s.get("avg_risk", 0.0) for s in sessions]
    
    st.bar_chart({
        "Peak Risk": peak_risks,
        "Avg Risk": avg_risks
    })
