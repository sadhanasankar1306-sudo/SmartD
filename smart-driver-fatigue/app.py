"""
Smart Driver Fatigue Prevention System - Streamlit Entry Point
Professional Light-Theme Computer Vision Application
"""
import streamlit as st
from pathlib import Path
import sys

# Add src to system path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.database import FatigueDatabase

st.set_page_config(
    page_title="Smart Driver Fatigue Prevention System",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Light-Theme CSS styling
st.markdown("""
<style>
    /* Light Theme Enforcements */
    .stApp {
        background-color: #F8FAFC;
        color: #0F172A;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    /* Card Styles */
    .metric-card {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        margin-bottom: 16px;
    }
    
    .status-normal {
        color: #059669;
        font-weight: 600;
    }
    
    .status-caution {
        color: #D97706;
        font-weight: 600;
    }
    
    .status-alert {
        color: #DC2626;
        font-weight: 700;
    }
    
    /* Buttons */
    .stButton>button {
        background-color: #2563EB;
        color: #FFFFFF;
        border-radius: 8px;
        border: none;
        padding: 10px 20px;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    .stButton>button:hover {
        background-color: #1D4ED8;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }
    
    /* Clean sidebar */
    section[data-testid="stSidebar"] {
        background-color: #FFFFFF;
        border-right: 1px solid #E2E8F0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize persistent DB
db = FatigueDatabase()

# Sidebar
with st.sidebar:
    st.image("https://img.icons8.com/color/96/car--v1.png", width=64)
    st.title("Driver Fatigue Guard")
    st.caption("AI-Powered Real-Time Driver Monitoring")
    st.divider()
    st.markdown("""
    **Research & Educational Prototype**
    - Eye Closure (EAR)
    - Yawning Detection (MAR)
    - 3D Head Pose & Nodding
    - Multi-Level Progressive Alerts
    - Explainable 0-100 Fatigue Risk
    """)
    st.divider()
    st.info("System Ready. Select a page from the menu above to begin monitoring.")

# Main page content
st.title("🚗 Smart Driver Fatigue Prevention System")
st.markdown("""
Welcome to the **Smart Driver Fatigue Prevention System**, an AI-powered computer vision platform designed to monitor driver alertness, detect visual fatigue indicators, and deliver explainable, progressive safety alerts.
""")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="metric-card">
        <h4 style="margin:0; color:#64748B; font-size:14px;">SYSTEM STATUS</h4>
        <p style="margin:8px 0 0 0; font-size:24px; font-weight:700; color:#059669;">● Operational</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#64748B;">OpenCV & MediaPipe Ready</p>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="metric-card">
        <h4 style="margin:0; color:#64748B; font-size:14px;">ALERT ENGINE</h4>
        <p style="margin:8px 0 0 0; font-size:24px; font-weight:700; color:#2563EB;">3 Levels</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#64748B;">Normal, Caution, High Alert</p>
    </div>
    """, unsafe_allow_html=True)

with col3:
    sessions = db.get_all_sessions()
    st.markdown(f"""
    <div class="metric-card">
        <h4 style="margin:0; color:#64748B; font-size:14px;">STORED SESSIONS</h4>
        <p style="margin:8px 0 0 0; font-size:24px; font-weight:700; color:#0F172A;">{len(sessions)} Trips</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#64748B;">SQLite Local Persistence</p>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="metric-card">
        <h4 style="margin:0; color:#64748B; font-size:14px;">RISK ENGINE</h4>
        <p style="margin:8px 0 0 0; font-size:24px; font-weight:700; color:#475569;">Explainable</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#64748B;">Multi-Signal Attribution</p>
    </div>
    """, unsafe_allow_html=True)

st.subheader("Quick Navigation")
c1, c2, c3 = st.columns(3)

with c1:
    st.markdown("""
    **1. Live Monitoring**
    Connect your webcam or upload a dashcam video to observe real-time facial landmark detection, EAR eye openness, and yawning detection.
    """)

with c2:
    st.markdown("""
    **2. Progressive Alerts**
    Test alert sound effects, configure thresholds, and observe cooldown management.
    """)

with c3:
    st.markdown("""
    **3. Trip Reports & Analytics**
    Inspect session safety summaries, review historical trends, and export CSV logs.
    """)

st.warning("⚠️ **Safety Notice**: This application is a prototype intended strictly for research and demonstration. It does not replace driver responsibility or certified vehicle safety equipment.")
