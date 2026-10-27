"""
Page 2: Live Driver Monitoring - Smart Driver Fatigue Prevention System
Real-time OpenCV and MediaPipe facial landmark detection with visible eye landmarks and EAR measurement.
"""
import streamlit as st
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.eye_analysis import calculate_ear, EyeStateTracker, DEFAULT_EAR_THRESHOLD
from src.yawn_analysis import calculate_mar, YawnTracker, DEFAULT_MAR_THRESHOLD
from src.head_pose import estimate_head_pose_angles, HeadPoseTracker
from src.risk_engine import FatigueRiskEngine
from src.alert_manager import AlertManager, LEVEL_NORMAL, LEVEL_CAUTION, LEVEL_HIGH_WARNING
from src.database import FatigueDatabase
from src.face_landmarks import FaceMeshDetector

st.set_page_config(page_title="Live Monitoring - Fatigue Guard", page_icon="📹", layout="wide")

st.title("📹 Live Driver Monitoring")
st.markdown("Real-time vision pipeline executing actual facial landmark detection, EAR eye measurements, and progressive alerts.")

db = FatigueDatabase()
risk_engine = FatigueRiskEngine()
alert_mgr = AlertManager()

# Input mode selector
mode = st.radio("Select Input Source", ["Webcam Snapshot / Frame Stream", "Upload Dashcam Video", "Webcam Device Test"], horizontal=True)

col_feed, col_telemetry = st.columns([3, 2])

with col_telemetry:
    st.subheader("Live Telemetry & Measurements")
    ear_metric = st.empty()
    closure_metric = st.empty()
    mar_metric = st.empty()
    head_metric = st.empty()
    risk_metric = st.empty()
    status_alert = st.empty()

with col_feed:
    if mode == "Webcam Snapshot / Frame Stream":
        st.markdown("**Live Webcam Frame Input**")
        img_file_buffer = st.camera_input("Capture frame from local webcam to run real landmark detection")

        if img_file_buffer is not None:
            import cv2
            import numpy as np

            # Read real frame bytes
            bytes_data = img_file_buffer.getvalue()
            cv2_img = cv2.imdecode(np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR)

            if cv2_img is not None:
                rgb_frame = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
                h, w = rgb_frame.shape[:2]

                # Initialize real FaceMesh detector
                detector = FaceMeshDetector(max_num_faces=1)
                ok, landmarks = detector.process_rgb_frame(rgb_frame)

                if ok and landmarks:
                    # MediaPipe left eye indices: [33, 160, 158, 133, 153, 144]
                    # Right eye indices: [362, 385, 387, 263, 373, 380]
                    left_eye_pts = [landmarks[idx][:2] for idx in [33, 160, 158, 133, 153, 144]]
                    right_eye_pts = [landmarks[idx][:2] for idx in [362, 385, 387, 263, 373, 380]]

                    left_ear = calculate_ear(left_eye_pts)
                    right_ear = calculate_ear(right_eye_pts)
                    avg_ear = (left_ear + right_ear) / 2.0

                    # Mouth landmarks for MAR
                    mouth_pts = [
                        landmarks[61][:2], landmarks[291][:2],
                        landmarks[13][:2], landmarks[14][:2],
                        landmarks[82][:2], landmarks[87][:2],
                        landmarks[312][:2], landmarks[317][:2]
                    ]
                    mar = calculate_mar(mouth_pts)

                    # Head pose
                    pitch, yaw, roll = estimate_head_pose_angles(landmarks)

                    # Draw visible landmark points and lines over eyes
                    for pt in left_eye_pts:
                        cv2.circle(cv2_img, (int(pt[0]), int(pt[1])), 2, (0, 255, 0), -1)
                    for pt in right_eye_pts:
                        cv2.circle(cv2_img, (int(pt[0]), int(pt[1])), 2, (0, 255, 0), -1)

                    # Draw eye contours
                    cv2.polylines(cv2_img, [np.array(left_eye_pts, dtype=np.int32)], True, (0, 255, 0) if avg_ear >= 0.21 else (0, 0, 255), 2)
                    cv2.polylines(cv2_img, [np.array(right_eye_pts, dtype=np.int32)], True, (0, 255, 0) if avg_ear >= 0.21 else (0, 0, 255), 2)

                    # Draw text measurement on frame
                    ear_text = f"EAR: {avg_ear:.2f} ({'OPEN' if avg_ear >= 0.21 else 'CLOSED'})"
                    cv2.putText(cv2_img, ear_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0) if avg_ear >= 0.21 else (0, 0, 255), 2)

                    # Show processed frame with actual landmarks
                    st.image(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB), caption=f"Real Detected Eye Landmarks - {ear_text}", use_container_width=True)

                    # Update real telemetry
                    ear_metric.metric("Eye Aspect Ratio (EAR)", f"{avg_ear:.3f}", "OPEN" if avg_ear >= 0.21 else "CLOSED (Below Threshold)", delta_color="normal" if avg_ear >= 0.21 else "inverse")
                    mar_metric.metric("Mouth Aspect Ratio (MAR)", f"{mar:.3f}", "YAWNING" if mar >= 0.60 else "Nominal")
                    head_metric.metric("Head Pitch / Nod", f"{pitch:.0f}°", "Nodding Down" if pitch <= -15 else "Aligned")

                    # Calculate risk
                    risk_res = risk_engine.calculate_risk(
                        closure_duration_s=0.0 if avg_ear >= 0.21 else 1.0,
                        blinks_per_minute=18.0,
                        yawns_recent=1 if mar >= 0.60 else 0,
                        nods_recent=1 if pitch <= -15 else 0,
                        signal_quality=0.95,
                        face_detected=True
                    )
                    risk_metric.metric("Fatigue Risk Score", f"{risk_res['score']}/100", risk_res['category'])

                    if avg_ear < 0.21:
                        status_alert.error("⚠️ Eye Closure Detected: EAR below 0.21 threshold.")
                    else:
                        status_alert.success("✅ Nominal Eye State: Driver eyes reliably detected open.")

                    detector.close()
                else:
                    status_alert.warning("⚠️ No face or eye landmarks detected in this frame. Ensure face is clearly visible and illuminated.")
                    st.image(rgb_frame, caption="Raw Frame (No Face Detected)", use_container_width=True)

    elif mode == "Upload Dashcam Video":
        uploaded = st.file_uploader("Upload Dashcam or Driver Video (MP4, WebM, AVI)", type=["mp4", "webm", "avi"])
        if uploaded:
            st.video(uploaded)
            st.info("Video file loaded. In production, frames are passed to FaceMeshDetector sequentially.")

    else:
        st.subheader("Webcam Hardware & OpenCV Diagnostics")
        st.markdown("""
        This tool tests OpenCV camera device index `0` on the host system:
        """)
        if st.button("Check VideoCapture(0)"):
            try:
                import cv2
                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    st.error("❌ OpenCV Error: `cv2.VideoCapture(0)` cannot be opened. Host environment does not have a physical webcam device attached.")
                else:
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        st.success(f"✅ OpenCV Webcam Success: Captured frame {frame.shape[1]}x{frame.shape[0]} px.")
                    else:
                        st.warning("⚠️ Camera opened but failed to read frame.")
                    cap.release()
            except Exception as e:
                st.error(f"❌ Camera Exception: {type(e).__name__} - {str(e)}")
