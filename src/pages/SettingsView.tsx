import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  Eye,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Volume2,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../services/storage';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onClearHistory,
}) => {
  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = () => {
    // Validation
    if ((form.earCloseThreshold || 0.19) >= (form.earOpenThreshold || 0.23)) {
      setSaveMessage('Error: EAR Open Threshold must be strictly higher than EAR Close Threshold for hysteresis to work.');
      return;
    }
    if (form.cautionClosureSec >= form.highClosureSec) {
      setSaveMessage('Error: High Warning closure duration must exceed Caution duration.');
      return;
    }
    onSaveSettings(form);
    setSaveMessage('Settings validated and saved successfully.');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_SETTINGS });
    onSaveSettings(DEFAULT_SETTINGS);
    setSaveMessage('Reset to factory default calibration.');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            System Calibration & Settings
          </h2>
          <p className="text-xs text-slate-500">
            Tune geometric aspect ratio thresholds, sustained alarm duration windows, and alert audio volumes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            saveMessage.startsWith('Error')
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {saveMessage}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Facial Aspect Ratio Thresholds */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            Facial Landmark Sensitivity
          </h3>

          <div className="space-y-4 text-xs">
            {/* Dual Hysteresis Thresholds */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 block">Hysteresis Dual-Threshold Calibration</span>
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>EAR Close Threshold (Lower Bound)</span>
                  <span className="font-mono text-rose-600">{(form.earCloseThreshold || 0.19).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.22"
                  step="0.01"
                  value={form.earCloseThreshold || 0.19}
                  onChange={(e) => setForm({ ...form, earCloseThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Eye state flips from open to closed when EAR drops below this value.
                </p>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>EAR Open Threshold (Upper Bound)</span>
                  <span className="font-mono text-emerald-600">{(form.earOpenThreshold || 0.23).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.28"
                  step="0.01"
                  value={form.earOpenThreshold || 0.23}
                  onChange={(e) => setForm({ ...form, earOpenThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Eye state flips from closed back to open when EAR rises above this value. Hysteresis prevents rapid boundary jitter.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Adaptive Open-Eye Calibration</span>
                  <span className="text-[11px] text-slate-500">Dynamically scale thresholds to driver's unique facial baseline</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableAdaptiveCalibration}
                  onChange={(e) => setForm({ ...form, enableAdaptiveCalibration: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Asymmetric Smoothing Factor (α)</span>
                  <span className="font-mono text-blue-600">{(form.smoothingAlpha || 0.35).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={form.smoothingAlpha || 0.35}
                  onChange={(e) => setForm({ ...form, smoothingAlpha: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Balances jitter reduction while immediately snapping on blink onset and recovery.
                </p>
              </div>
            </div>

            {/* MAR Threshold */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Mouth Aspect Ratio (MAR) Yawn Threshold</span>
                <span className="font-mono text-blue-600">{form.marThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.45"
                max="0.80"
                step="0.01"
                value={form.marThreshold}
                onChange={(e) => setForm({ ...form, marThreshold: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Mouth vertical-to-horizontal opening. Normal talking is &lt;0.35, sustained yawning is &gt;0.60.
              </p>
            </div>

            {/* Nod Pitch Threshold */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Head Nod Pitch Angle (Downwards)</span>
                <span className="font-mono text-blue-600">{form.nodPitchThreshold}°</span>
              </div>
              <input
                type="range"
                min="-30"
                max="-10"
                step="1"
                value={form.nodPitchThreshold}
                onChange={(e) => setForm({ ...form, nodPitchThreshold: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Negative tilt pitch below which head droop/collapse is registered.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Sustained Timing & Audio Controls */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            Alert Escalation & Audio Rules
          </h3>

          <div className="space-y-4 text-xs">
            {/* Caution Closure Duration */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Caution Eye Closure Duration</span>
                <span className="font-mono text-amber-600">{form.cautionClosureSec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.1"
                value={form.cautionClosureSec}
                onChange={(e) => setForm({ ...form, cautionClosureSec: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Closed eye duration triggering Level 1 Caution. Standard blinks are ~0.15–0.3s.
              </p>
            </div>

            {/* High Warning Duration */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>High Warning Microsleep Duration</span>
                <span className="font-mono text-rose-600">{form.highClosureSec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="4.0"
                step="0.1"
                value={form.highClosureSec}
                onChange={(e) => setForm({ ...form, highClosureSec: parseFloat(e.target.value) })}
                className="w-full accent-rose-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Closed eye duration triggering Level 2 Urgent Siren.
              </p>
            </div>

            {/* Cooldown */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Alert Cooldown Refractory Window</span>
                <span className="font-mono text-blue-600">{form.alertCooldownSec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="12.0"
                step="0.5"
                value={form.alertCooldownSec}
                onChange={(e) => setForm({ ...form, alertCooldownSec: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum interval before repeated audible warnings of the same alert tier.
              </p>
            </div>

            {/* Volume */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Audio Alert Volume</span>
                <span className="font-mono text-blue-600">{Math.round(form.audioVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={form.audioVolume}
                onChange={(e) => setForm({ ...form, audioVolume: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
