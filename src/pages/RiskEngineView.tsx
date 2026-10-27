import React from 'react';
import { Activity, Cpu, Eye, HelpCircle, Info, Sliders, Zap } from 'lucide-react';
import { DriverMetrics, RiskAnalysis, SystemSettings } from '../types';

interface RiskEngineViewProps {
  metrics: DriverMetrics;
  riskAnalysis: RiskAnalysis;
  settings: SystemSettings;
  onUpdateWeights: (weights: SystemSettings['weights']) => void;
}

export const RiskEngineView: React.FC<RiskEngineViewProps> = ({
  metrics,
  riskAnalysis,
  settings,
  onUpdateWeights,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          Explainable Fatigue-Risk Engine
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Transparent multi-signal heuristic formula synthesizing ocular, oral, and postural visual biomarkers
        </p>
      </div>

      {/* Main Score & Categorization Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Composite Score Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Heuristic Risk Indicator</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">
                {riskAnalysis.score !== null ? riskAnalysis.score : '--'}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>

            <div className="mt-3">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  riskAnalysis.score === null
                    ? 'bg-slate-100 text-slate-600'
                    : riskAnalysis.score >= 70
                    ? 'bg-rose-100 text-rose-700'
                    : riskAnalysis.score >= 35
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {riskAnalysis.categoryLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            {riskAnalysis.explanation}
          </div>
        </div>

        {/* Contributing Signal Breakdown (2 Cols) */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Signal Attribution & Contribution Breakdown
          </h3>

          <div className="space-y-3.5">
            {/* 1. Sustained Closure */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">
                  1. Eye Closure Duration ({metrics.closureDurationSec.toFixed(1)}s)
                </span>
                <span className="font-mono text-slate-600">
                  Subscore: <strong>{riskAnalysis.signalBreakdown.closureSubscore}/100</strong> (Contrib: {riskAnalysis.contributions.closureDuration}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${riskAnalysis.signalBreakdown.closureSubscore}%` }}
                />
              </div>
            </div>

            {/* 2. Blink Frequency */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">
                  2. Blink Cadence ({metrics.blinksPerMinute} bpm)
                </span>
                <span className="font-mono text-slate-600">
                  Subscore: <strong>{riskAnalysis.signalBreakdown.blinkSubscore}/100</strong> (Contrib: {riskAnalysis.contributions.blinkPattern}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${riskAnalysis.signalBreakdown.blinkSubscore}%` }}
                />
              </div>
            </div>

            {/* 3. Yawn Frequency */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">
                  3. Yawning Frequency ({metrics.recentYawns} in last 3 min)
                </span>
                <span className="font-mono text-slate-600">
                  Subscore: <strong>{riskAnalysis.signalBreakdown.yawnSubscore}/100</strong> (Contrib: {riskAnalysis.contributions.yawnFrequency}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${riskAnalysis.signalBreakdown.yawnSubscore}%` }}
                />
              </div>
            </div>

            {/* 4. Head Nodding */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">
                  4. Head Nodding / Drop Episodes ({metrics.recentNods} recent)
                </span>
                <span className="font-mono text-slate-600">
                  Subscore: <strong>{riskAnalysis.signalBreakdown.nodSubscore}/100</strong> (Contrib: {riskAnalysis.contributions.headNodding}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${riskAnalysis.signalBreakdown.nodSubscore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Formula & Configurable Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formula Documentation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Mathematical Formulation
          </h3>

          <div className="p-3.5 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 space-y-1 border border-slate-200">
            <p className="font-bold text-blue-700">Risk_Score = ∑ (w_i × S_i) ∈ [0, 100]</p>
            <p className="text-slate-600">where:</p>
            <p className="pl-3">• S_closure = f(t_closed), 0 to 100</p>
            <p className="pl-3">• S_blink = f(bpm), baseline 12–25 bpm</p>
            <p className="pl-3">• S_yawn = f(yawn_count), &ge;3 yawns = 90</p>
            <p className="pl-3">• S_nod = f(nods, pitch &lt; -15°)</p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              <strong>Reliability Guardrail</strong>: If the face is obscured or image quality drops below 35%,
              the engine immediately sets <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">isReliable = False</code> and assigns
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Insufficient Data</code>. Missing measurements are never silently assumed to represent an alert driver.
            </p>
            <p>
              <strong>Disclaimer</strong>: This heuristic score is for educational/experimental use and is not a certified medical tool.
            </p>
          </div>
        </div>

        {/* Component Weight Sliders */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Heuristic Weights Calibration
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Eye Closure Weight (w_closure)</span>
                <span className="font-mono font-bold">{(settings.weights.closureDuration * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.7"
                step="0.05"
                value={settings.weights.closureDuration}
                onChange={(e) =>
                  onUpdateWeights({ ...settings.weights, closureDuration: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Yawn Frequency Weight (w_yawn)</span>
                <span className="font-mono font-bold">{(settings.weights.yawnFrequency * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={settings.weights.yawnFrequency}
                onChange={(e) =>
                  onUpdateWeights({ ...settings.weights, yawnFrequency: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Head Nodding Weight (w_nod)</span>
                <span className="font-mono font-bold">{(settings.weights.headNodding * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={settings.weights.headNodding}
                onChange={(e) =>
                  onUpdateWeights({ ...settings.weights, headNodding: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Blink Cadence Weight (w_blink)</span>
                <span className="font-mono font-bold">{(settings.weights.blinkPattern * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={settings.weights.blinkPattern}
                onChange={(e) =>
                  onUpdateWeights({ ...settings.weights, blinkPattern: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
