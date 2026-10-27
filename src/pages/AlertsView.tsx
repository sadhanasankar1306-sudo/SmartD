import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  History,
  Info,
  Play,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundManager } from '../services/audioAlert';
import { AlertEvent, AlertLevel, SystemSettings } from '../types';

interface AlertsViewProps {
  currentLevel: AlertLevel;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  settings: SystemSettings;
  events: AlertEvent[];
  onTriggerTestAlert: (level: AlertLevel, reason: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  currentLevel,
  audioEnabled,
  onToggleAudio,
  settings,
  events,
  onTriggerTestAlert,
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const testChime = () => {
    soundManager.playCautionChime(settings.audioVolume);
    onTriggerTestAlert(1, 'Manual Test: Level 1 Caution Audio & Visual');
    setTestStatus('Played Level 1 Caution Chime.');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const testHighAlarm = () => {
    soundManager.startHighWarningAlarm(settings.audioVolume);
    onTriggerTestAlert(2, 'Manual Test: Level 2 Urgent Fatigue Siren');
    setTestStatus('Triggered Level 2 High Warning Siren.');
    setTimeout(() => {
      soundManager.stopAlarm();
      setTestStatus(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Progressive Alert System
          </h2>
          <p className="text-xs text-slate-500">
            Three-tier escalation architecture with sustained-duration validation and cooldown suppression
          </p>
        </div>

        <button
          onClick={onToggleAudio}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            audioEnabled
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{audioEnabled ? 'Audible Alerts: ON' : 'Audible Alerts: MUTED'}</span>
        </button>
      </div>

      {/* 3 Tier Progressive Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Level 0 */}
        <div
          className={`rounded-xl p-5 border transition-all shadow-xs ${
            currentLevel === 0 ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              Level 0 — Normal
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Baseline Monitoring</h4>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            No sustained warning indicators. Eyes open (EAR &gt; {settings.earThreshold}), nominal blink cadence, road-aligned head orientation.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p>• Visual: Green status badge</p>
            <p>• Acoustic: Silent</p>
            <p>• Action: Continue safe driving</p>
          </div>
        </div>

        {/* Level 1 */}
        <div
          className={`rounded-xl p-5 border transition-all shadow-xs ${
            currentLevel === 1 ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
              Level 1 — Caution
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Cautionary Warning</h4>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Repeated yawning (MAR &ge; {settings.marThreshold}), slow eye closures ({settings.cautionClosureSec}s), or moderate composite risk score (35-69).
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p>• Visual: Amber warning banner</p>
            <p>• Acoustic: Two-tone chime</p>
            <p>• Action: Increase vigilance, plan rest stop</p>
          </div>
        </div>

        {/* Level 2 */}
        <div
          className={`rounded-xl p-5 border transition-all shadow-xs ${
            currentLevel === 2 ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/40 animate-pulse' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
              Level 2 — High Warning
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Urgent Microsleep Danger</h4>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Prolonged eye closure (&ge; {settings.highClosureSec}s), head nodding drop (&le; {settings.nodPitchThreshold}°), or critical composite risk (&ge; 70).
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p>• Visual: Pulsing red alarm banner</p>
            <p>• Acoustic: Urgent 880Hz siren</p>
            <p className="font-semibold text-rose-700">• Action: Pull over safely immediately & rest</p>
          </div>
        </div>
      </div>

      {/* Independent Alert Mechanism Testing Panel */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600" />
            Independent Alert Mechanism Tester
          </h3>
          <p className="text-xs text-slate-500">
            Verify speaker volume, buzzer frequencies, and banner escalation independently of live detection.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => onTriggerTestAlert(0, 'Manual Test: Level 0 Normal Reset')}
            className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Test Normal State (Level 0)</span>
          </button>

          <button
            onClick={testChime}
            className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Test Caution Alert (Level 1 Chime)</span>
          </button>

          <button
            onClick={testHighAlarm}
            className="px-4 py-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Test Urgent Alarm (Level 2 Siren)</span>
          </button>
        </div>

        {testStatus && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
            ℹ️ {testStatus}
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <span className="font-semibold text-slate-800">False Alarm Prevention Architecture:</span>
          <p>
            • <strong>Sustained Duration Check</strong>: Isolated blinks (100–300ms) or single frames never trigger alerts. Only sustained closures &ge; {settings.cautionClosureSec}s escalate.
          </p>
          <p>
            • <strong>Alert Cooldown Timer</strong>: Once fired, audio alarms enforce a {settings.alertCooldownSec}-second refractory period to eliminate buzzing flapping.
          </p>
        </div>
      </div>

      {/* Recent Alert Events Log */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Active Session Alert Events ({events.length})
        </h3>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No alert incidents logged in this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Trigger Reason</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">EAR (L / R) / MAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {events.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.alertLevel === 2
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ev.alertLevel === 2 ? 'HIGH WARNING' : 'CAUTION'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{ev.triggerType} — {ev.description}</td>
                    <td className="py-2.5 px-3 font-mono">{ev.riskScore !== null ? `${ev.riskScore}/100` : '--'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {ev.ear.toFixed(2)} (L:{ev.leftEar?.toFixed(2) || '--'} R:{ev.rightEar?.toFixed(2) || '--'}) / {ev.mar.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
