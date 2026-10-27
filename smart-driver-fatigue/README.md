# Smart Driver Fatigue Prevention System

AI-powered real-time driver fatigue monitoring system utilizing OpenCV and MediaPipe Face Mesh.
Detects eye closure (EAR), eye blinking rates, yawning (MAR), head nodding/orientation, computes an explainable 0–100 fatigue risk score, enforces progressive multi-level alerts, logs trips to SQLite, and exports safety summaries.

## Quickstart (Windows 11)

1. Clone or extract this repository.
2. Double-click `run.bat` to automatically create the virtual environment, install dependencies, run the test suite, and launch the application.
3. Or manually in PowerShell:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   python -m unittest discover tests -v
   streamlit run app.py
   ```

## Selecting Python Interpreter in VS Code
1. Open the project folder in VS Code (`Ctrl+K, Ctrl+O`).
2. Press `Ctrl+Shift+P` and type `Python: Select Interpreter`.
3. Select `Enter interpreter path...` and choose `.\venv\Scripts\python.exe`.

## Key Features
- **Mandatory Light Theme**: Clean, accessible UI configured in `.streamlit/config.toml`.
- **Explainable Fatigue Engine**: Transparent formula mapping EAR, MAR, Nodding, and Blinking to a 0–100 scale.
- **Progressive Warnings**: Level 0 Normal, Level 1 Caution, Level 2 Urgent Alarm with cooldown suppression.
- **Trip Safety Reports**: Formatted text and CSV exports with SQLite persistence.
- **Zero Raw Image Storage**: Driver privacy by design.
