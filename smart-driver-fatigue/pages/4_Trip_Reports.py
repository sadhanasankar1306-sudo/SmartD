"""
Page 4: Trip Reports - Safety Summaries and CSV Export
"""
import streamlit as st
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import FatigueDatabase
from src.reporting import generate_trip_summary, export_events_to_csv

st.set_page_config(page_title="Trip Safety Reports - Fatigue Guard", page_icon="📋", layout="wide")

st.title("📋 Trip Safety Reports")
st.markdown("Session-based driver safety evaluations, aggregated event listings, and exportable documentation.")

db = FatigueDatabase()
sessions = db.get_all_sessions()

if not sessions:
    st.info("No recorded trips yet. Start a monitoring session or seed a demonstration trip below.")
    if st.button("Generate Sample Demonstration Trip"):
        s_id = f"TRIP-{int(time.time())}"
        t_now = time.time()
        db.create_session(s_id, start_time=t_now - 1800)
        db.log_event(s_id, 1, "Yawning", "Multiple yawns in 3-minute window", 42.0, t_now - 1200)
        db.log_event(s_id, 2, "Microsleep", "Sustained eye closure for 2.6s", 84.0, t_now - 600)
        db.update_session(s_id, end_time=t_now, duration_s=1800, total_cautions=1, total_high_warnings=1, peak_risk=84.0, avg_risk=31.5)
        st.rerun()
else:
    selected_id = st.selectbox("Select Trip Session", [s["id"] for s in sessions])
    sess = next((s for s in sessions if s["id"] == selected_id), sessions[0])
    events = db.get_session_events(sess["id"])
    
    summary_text = generate_trip_summary(sess, events)
    
    col1, col2 = st.columns([3, 1])
    with col1:
        st.text_area("Generated Safety Report", summary_text, height=350)
    with col2:
        st.subheader("Report Actions")
        csv_data = export_events_to_csv(events)
        st.download_button(
            label="📥 Download CSV Event Log",
            data=csv_data,
            file_name=f"{sess['id']}_events.csv",
            mime="text/csv"
        )
        st.download_button(
            label="📄 Download Text Summary",
            data=summary_text,
            file_name=f"{sess['id']}_safety_report.txt",
            mime="text/plain"
        )
