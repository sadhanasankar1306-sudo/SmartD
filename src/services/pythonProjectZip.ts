import JSZip from 'jszip';

export async function generatePythonProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('smart-driver-fatigue');
  if (!root) throw new Error('Could not create folder in zip');

  // .streamlit/config.toml
  const streamlitFolder = root.folder('.streamlit');
  streamlitFolder?.file(
    'config.toml',
    `[theme]
primaryColor = "#2563EB"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F8FAFC"
textColor = "#0F172A"
font = "sans serif"

[server]
headless = true
enableCORS = false
enableXsrfProtection = false
port = 8501
`
  );

  // requirements.txt
  root.file(
    'requirements.txt',
    `streamlit>=1.35.0
opencv-python>=4.9.0.80
mediapipe>=0.10.14
numpy>=1.26.0,<2.0.0
pandas>=2.2.0
plotly>=5.20.0
scipy>=1.12.0
pytest>=8.0.0
`
  );

  // run.bat
  root.file(
    'run.bat',
    `@echo off
TITLE Smart Driver Fatigue Prevention System
COLOR 0B
echo ==============================================================================
echo        SMART DRIVER FATIGUE PREVENTION SYSTEM - WINDOWS 11 LAUNCHER
echo ==============================================================================
echo.

python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in your PATH!
    echo Please install Python 3.11 from https://www.python.org/
    pause
    exit /b 1
)

if not exist "venv\\Scripts\\activate.bat" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    call venv\\Scripts\\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    python -m unittest discover tests -v
) else (
    call venv\\Scripts\\activate.bat
)

echo [STARTING] Launching Streamlit application on http://localhost:8501...
streamlit run app.py
pause
`
  );

  // README.md
  root.file(
    'README.md',
    `# Smart Driver Fatigue Prevention System
AI-powered real-time driver fatigue monitoring system utilizing OpenCV and MediaPipe.
Detects eye closure (EAR), yawning (MAR), head nodding, progressive alerts, SQLite logging.

## Quickstart (Windows 11)
1. Double-click \`run.bat\`
2. Or in PowerShell:
   \`\`\`powershell
   python -m venv venv
   .\\venv\\Scripts\\Activate.ps1
   python -m pip install -r requirements.txt
   python -m unittest discover tests -v
   streamlit run app.py
   \`\`\`
`
  );

  // app.py
  root.file(
    'app.py',
    `import streamlit as st
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.database import FatigueDatabase

st.set_page_config(page_title="Smart Driver Fatigue Prevention System", page_icon="🚗", layout="wide")

st.title("🚗 Smart Driver Fatigue Prevention System")
st.markdown("Real-time vision monitoring with explainable fatigue scoring and progressive safety alerts.")
`
  );

  // src folder
  const src = root.folder('src');
  src?.file('__init__.py', '"""Smart Driver Fatigue Prevention System"""\n');

  // Generate ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}
