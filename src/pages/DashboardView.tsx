import React from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Eye,
  Info,
  Play,
  Square,
  TrendingUp,
  UserCheck,
  UserX,
  Zap,
} from 'lucide-react';
import { AlertLevel, DriverMetrics, RiskAnalysis } from '../types';

interface DashboardViewProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  metrics: DriverMetrics;
  riskAnalysis: RiskAnalysis;
  sessionDurationSec: number;
  totalCautions: number;
  totalHighWarnings: number;
  riskTrend: number[];
  onNavigateToLive: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  isMonitoring,
  onToggleMonitoring,
  metrics,
  riskAnalysis,
  sessionDurationSec,
  totalCautions,
  totalHighWarnings,
  riskTrend,
  onNavigateToLive,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 70) return 'text-rose-600';
    if (score >= 35) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getRiskBg = (score: number | null) => {
    if (score === null) return 'bg-slate-100 border-slate-200';
    if (score >= 70) return 'bg-rose-50 border-rose-200';
    if (score >= 35) return 'bg-amber-50 border-amber-200';
    return 'bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <span>🚗 Computer Vision & Safety Analytics</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Driver Fatigue Prevention System</h2>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Real-time visual monitoring utilizing facial landmark geometry to track Eye Aspect Ratio (EAR),
            Mouth Aspect Ratio (MAR), and 3D head nodding. Generates explainable multi-signal risk assessments and progressive safety alerts.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onToggleMonitoring}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                isMonitoring
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-white text-blue-700 hover:bg-blue-50'
              }`}
            >
              {isMonitoring ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isMonitoring ? 'Stop Monitoring Session' : 'Start Live Monitoring'}</span>
            </button>

            <button
              onClick={onNavigateToLive}
              className="px-4 py-2.5 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white text-sm font-semibold border border-white/20 transition-all"
            >
              Open Camera Feed & Controls →
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Top 4 Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monitoring Status */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vision Sensor</span>
            <Camera className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${isMonitoring ? 'text-emerald-600' : 'text-slate-700'}`}>
              {isMonitoring ? 'Active' : 'Standby'}
            </span>
            <span className="text-xs text-slate-500">
              {isMonitoring ? (metrics.faceDetected ? '● Face Tracking' : '○ Searching Face') : 'Ready'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
            {metrics.faceDetected ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> 1 Driver in Frame
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" /> No Face Detected
              </span>
            )}
            <span className="text-slate-300">•</span>
            <span>{Math.round(metrics.fps)} FPS</span>
          </div>
        </div>

        {/* Card 2: Fatigue Risk Score */}
        <div className={`rounded-xl p-5 border shadow-xs ${getRiskBg(riskAnalysis.score)}`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Explainable Risk Score</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${getRiskColor(riskAnalysis.score)}`}>
              {riskAnalysis.score !== null ? `${riskAnalysis.score}` : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 100</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-700 truncate">
            {riskAnalysis.categoryLabel}
          </p>
        </div>

        {/* Card 3: Alert Level */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">System State</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-bold ${
                riskAnalysis.systemState === 'high_warning'
                  ? 'text-rose-600'
                  : riskAnalysis.systemState === 'caution'
                  ? 'text-amber-600'
                  : riskAnalysis.systemState === 'unavailable'
                  ? 'text-slate-500'
                  : 'text-emerald-600'
              }`}
            >
              {riskAnalysis.systemState === 'high_warning'
                ? 'High warning'
                : riskAnalysis.systemState === 'caution'
                ? 'Caution'
                : riskAnalysis.systemState === 'unavailable'
                ? 'Monitoring unavailable'
                : 'Alert indicators low'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
            <span>{totalCautions} Cautions</span>
            <span className="text-slate-300">•</span>
            <span>{totalHighWarnings} High Alerts</span>
          </div>
        </div>

        {/* Card 4: Session Duration */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitoring Session</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-800">
              {formatTime(sessionDurationSec)}
            </span>
            <span className="text-xs text-slate-500">active</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>SQLite Trip Logging Active</span>
          </div>
        </div>
      </div>

      {/* Live Feature Gauges & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2 Cols: Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Fatigue Risk Indicator Trend
              </h3>
              <p className="text-xs text-slate-500">
                Rolling temporal profile of composite heuristic fatigue score (0-100)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low (0-34)
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Caution (35-69)
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> High (70-100)
              </span>
            </div>
          </div>

          {/* SVG Trend Chart */}
          <div className="h-56 w-full relative pt-4 pb-2">
            {riskTrend.length > 1 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                {/* Horizontal threshold reference lines */}
                {/* 70 High Alert line (y = 160 - (70/100 * 160) = 48) */}
                <line x1="0" y1="48" x2="500" y2="48" stroke="#FDA4AF" strokeDasharray="4 4" strokeWidth="1" />
                <text x="4" y="44" fill="#E11D48" fontSize="10" fontWeight="600">High Risk (70)</text>

                {/* 35 Caution line (y = 160 - (35/100 * 160) = 104) */}
                <line x1="0" y1="104" x2="500" y2="104" stroke="#FDE68A" strokeDasharray="4 4" strokeWidth="1" />
                <text x="4" y="100" fill="#D97706" fontSize="10" fontWeight="600">Caution (35)</text>

                {/* Data area & path */}
                {(() => {
                  const pts = riskTrend.map((val, idx) => {
                    const x = (idx / (riskTrend.length - 1)) * 500;
                    const y = 160 - (Math.min(100, Math.max(0, val)) / 100) * 160;
                    return `${x},${y}`;
                  });
                  const pathD = `M ${pts.join(' L ')}`;
                  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L 500,160 L 0,160 Z`;
                  const latestVal = riskTrend[riskTrend.length - 1];
                  const strokeColor = latestVal >= 70 ? '#E11D48' : latestVal >= 35 ? '#D97706' : '#2563EB';

                  return (
                    <>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#riskGrad)" />
                      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Collecting real-time data points...
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            * Temporal measurement avoids inferring fatigue from isolated single frames or normal blinks.
          </p>
        </div>

        {/* 1 Col: Live Contributing Geometric Indicators */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Live Visual Signals
            </h3>
            <span className="text-[11px] font-mono text-slate-500">MediaPipe Mesh</span>
          </div>

          <div className="space-y-4">
            {/* Eye Openness (EAR) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> Eye Aspect Ratio (EAR)
                </span>
                <span className={`font-mono font-bold ${!metrics.faceDetected ? 'text-slate-400' : metrics.isCurrentlyClosed ? 'text-rose-600' : 'text-slate-800'}`}>
                  {metrics.faceDetected ? `${metrics.ear.toFixed(2)} ${metrics.isCurrentlyClosed ? '(CLOSED)' : '(OPEN)'}` : '0.00 (NO FACE)'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    metrics.isCurrentlyClosed ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.ear / 0.4) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>L: {metrics.leftEar.toFixed(2)} | R: {metrics.rightEar.toFixed(2)}</span>
                <span>Base: {metrics.baselineEar.toFixed(2)} {metrics.isCalibrated ? '(Calibrated)' : `(${metrics.calibrationProgress}%)`}</span>
              </div>
            </div>

            {/* Mouth Aspect Ratio (MAR) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Mouth Aspect Ratio (MAR)</span>
                <span className={`font-mono font-bold ${metrics.mar >= 0.6 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {metrics.mar.toFixed(2)} {metrics.isCurrentlyYawning ? '(YAWNING)' : '(NOMINAL)'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    metrics.mar >= 0.6 ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.mar / 0.9) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Threshold: &gt;0.60 indicates yawn</p>
            </div>

            {/* Head Pitch (Nodding) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Head Pitch (Nod Angle)</span>
                <span
                  className={`font-mono font-bold ${
                    metrics.headPitch <= -15 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {metrics.headPitch.toFixed(0)}° {metrics.isCurrentlyNodding ? '(NOD DOWN)' : ''}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    metrics.headPitch <= -15 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, 50 + (metrics.headPitch / 40) * 50))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Threshold: &lt;-15° indicates downward drop</p>
            </div>

            {/* Blink Cadence */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Blinks in Last 60s:</span>
              <span className="font-mono font-bold text-slate-800">{metrics.blinksPerMinute} bpm</span>
            </div>

            {/* Camera Lighting Assessment */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Camera Quality:</span>
              <span
                className={`font-mono font-bold ${
                  metrics.signalQuality < 0.4 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {Math.round(metrics.signalQuality * 100)}% ({metrics.signalQuality >= 0.5 ? 'Nominal' : 'Low'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Educational Disclaimer Box */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold">Research & Educational Prototype Disclaimer:</p>
          <p className="text-blue-800 mt-0.5">
            This system calculates a heuristic fatigue-risk indicator for research purposes.
            A low score does not guarantee driver alertness, nor does this software execute automated vehicle controls.
            Drivers must always heed physical sensations of drowsiness and pull over safely to rest.
          </p>
        </div>
      </div>
    </div>
  );
};
