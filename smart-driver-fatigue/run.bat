@echo off
TITLE Smart Driver Fatigue Prevention System
COLOR 0B

echo ==============================================================================
echo        SMART DRIVER FATIGUE PREVENTION SYSTEM - WINDOWS 11 LAUNCHER
echo ==============================================================================
echo.

:: Check Python installation
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in your PATH!
    echo Please install Python 3.11 from https://www.python.org/
    echo Ensure 'Add python.exe to PATH' is checked during installation.
    pause
    exit /b 1
)

:: Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [SETUP] Virtual environment 'venv' not found. Creating virtual environment...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [SETUP] Activating venv and upgrading pip...
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    echo [SETUP] Installing required dependencies from requirements.txt...
    python -m pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Dependency installation encountered errors.
        pause
        exit /b 1
    )
    echo [SETUP] Running automated unit tests...
    python -m unittest discover tests -v
) else (
    call venv\Scripts\activate.bat
)

echo.
echo ==============================================================================
echo [STARTING] Launching Streamlit application on http://localhost:8501...
echo ==============================================================================
echo.

streamlit run app.py

pause
