import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Volume2, VolumeX, Video, VideoOff } from 'lucide-react';
import { AlertLevel } from '../types';

interface HeaderProps {
  alertLevel: AlertLevel;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  sessionDurationSec: number;
}

export const Header: React.FC<HeaderProps> = ({
  alertLevel,
  isMonitoring,
  onToggleMonitoring,
  audioEnabled,
  onToggleAudio,
  sessionDurationSec,
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAlertBadge = () => {
    switch (alertLevel) {
      case 2:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-pulse shadow-xs">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>LEVEL 2 — HIGH WARNING</span>
          </div>
        );
      case 1:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>LEVEL 1 — CAUTION</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>LEVEL 0 — NORMAL</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
          🚗
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Smart Driver Fatigue Prevention System</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              AI Vision v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            Real-time multi-signal driver monitoring with progressive safety warnings
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status Badge */}
        {getAlertBadge()}

        {/* Monitoring Timer */}
        {isMonitoring && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{formatTime(sessionDurationSec)}</span>
          </div>
        )}

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleAudio}
          title={audioEnabled ? 'Audio Alert Enabled (Click to Mute)' : 'Audio Alert Muted (Click to Unmute)'}
          className={`p-2 rounded-lg border text-sm transition-colors ${
            audioEnabled
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Start/Stop Monitoring Button */}
        <button
          onClick={onToggleMonitoring}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
            isMonitoring
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isMonitoring ? (
            <>
              <VideoOff className="w-4 h-4" />
              <span>Stop Monitoring</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              <span>Start Monitoring</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
