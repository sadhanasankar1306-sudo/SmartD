import React, { useState } from 'react';
import {
  Check,
  CheckCircle,
  Copy,
  Download,
  FileCode,
  FolderTree,
  Terminal,
} from 'lucide-react';
import { generatePythonProjectZip } from '../services/pythonProjectZip';

export const PythonProjectView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('run.bat');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const fileContents: Record<string, string> = {
    'run.bat': `@echo off
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
pause`,

    'requirements.txt': `streamlit>=1.35.0
opencv-python>=4.9.0.80
mediapipe>=0.10.14
numpy>=1.26.0,<2.0.0
pandas>=2.2.0
plotly>=5.20.0
scipy>=1.12.0
pytest>=8.0.0`,

    '.streamlit/config.toml': `[theme]
primaryColor = "#2563EB"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F8FAFC"
textColor = "#0F172A"
font = "sans serif"

[server]
headless = true
enableCORS = false
enableXsrfProtection = false
port = 8501`,

    'src/eye_analysis.py': `import math

def calculate_ear(eye_landmarks):
    """Soukupová & Čech (2016) EAR Formula"""
    p1, p2, p3, p4, p5, p6 = eye_landmarks[:6]
    v1 = math.dist(p2, p6)
    v2 = math.dist(p3, p5)
    h = math.dist(p1, p4)
    return (v1 + v2) / (2.0 * h) if h > 1e-6 else 0.0`,

    'src/risk_engine.py': `class FatigueRiskEngine:
    def __init__(self, weights=None):
        self.weights = weights or {
            "closure_duration": 0.40,
            "blink_pattern": 0.15,
            "yawn_frequency": 0.25,
            "head_nodding": 0.20
        }

    def calculate_risk(self, closure_duration_s, blinks_bpm, yawns, nods, quality=1.0, face_detected=True):
        if not face_detected or quality < 0.35:
            return {"is_reliable": False, "category": "Insufficient Data"}
        # Compute normalized sub-scores & weighted combination (0-100)...`,
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const blob = await generatePythonProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-driver-fatigue-windows11.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-600" />
            Python 3.11 Project & Windows 11 Deployment Guide
          </h2>
          <p className="text-xs text-slate-500">
            Automated virtualenv setup, pinned Streamlit + OpenCV + MediaPipe stack, and pytest suite
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Packaging ZIP...' : 'Download Python Project (ZIP)'}</span>
        </button>
      </div>

      {/* Quick Setup Windows 11 Terminal Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            Windows 11 PowerShell Setup Commands
          </h3>
          <button
            onClick={() =>
              copyToClipboard(
                `python -m venv venv\n.\\venv\\Scripts\\Activate.ps1\npython -m pip install --upgrade pip\npython -m pip install -r requirements.txt\npython -m unittest discover tests -v\nstreamlit run app.py`,
                'ps_commands'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
          >
            {copiedCode === 'ps_commands' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode === 'ps_commands' ? 'Copied' : 'Copy All Commands'}</span>
          </button>
        </div>

        <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
          <p className="text-slate-400"># 1. Create Python 3.11 virtual environment</p>
          <p className="text-white">python -m venv venv</p>
          <p className="text-slate-400 mt-2"># 2. Activate virtual environment in PowerShell</p>
          <p className="text-white">.\venv\Scripts\Activate.ps1</p>
          <p className="text-slate-400 mt-2"># 3. Upgrade pip and install pinned dependencies</p>
          <p className="text-white">python -m pip install --upgrade pip</p>
          <p className="text-white">python -m pip install -r requirements.txt</p>
          <p className="text-slate-400 mt-2"># 4. Run automated test suite (24 tests)</p>
          <p className="text-white">python -m unittest discover tests -v</p>
          <p className="text-slate-400 mt-2"># 5. Launch Streamlit Light-Theme Dashboard</p>
          <p className="text-white">streamlit run app.py</p>
        </div>
      </div>

      {/* VS Code Interpreter Guide */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Selecting Python Interpreter in Visual Studio Code</h3>
        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <li>Open the extracted project folder in VS Code (<code className="bg-slate-100 px-1 py-0.5 rounded">Ctrl + K, Ctrl + O</code>).</li>
          <li>Press <code className="bg-slate-100 px-1 py-0.5 rounded">Ctrl + Shift + P</code> to reveal the Command Palette.</li>
          <li>Type <code className="bg-slate-100 px-1 py-0.5 rounded">Python: Select Interpreter</code> and press Enter.</li>
          <li>Choose <code className="bg-slate-100 px-1 py-0.5 rounded">Enter interpreter path...</code> and navigate to <code className="bg-slate-100 px-1 py-0.5 rounded">.\venv\Scripts\python.exe</code>.</li>
        </ol>
      </div>

      {/* Interactive Code Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-xs text-slate-800">Source File Explorer:</span>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono font-medium"
            >
              <option value="run.bat">run.bat (Windows Launcher)</option>
              <option value="requirements.txt">requirements.txt (Dependencies)</option>
              <option value=".streamlit/config.toml">.streamlit/config.toml (Light Theme)</option>
              <option value="src/eye_analysis.py">src/eye_analysis.py (EAR Logic)</option>
              <option value="src/risk_engine.py">src/risk_engine.py (Scoring Engine)</option>
            </select>
          </div>

          <button
            onClick={() => copyToClipboard(fileContents[selectedFile] || '', selectedFile)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            {copiedCode === selectedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode === selectedFile ? 'Copied' : 'Copy File'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96">
          <pre>{fileContents[selectedFile] || '# File preview'}</pre>
        </div>
      </div>
    </div>
  );
};
