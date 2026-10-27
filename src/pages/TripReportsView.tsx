import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Printer,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AlertEvent, TripSession } from '../types';

interface TripReportsViewProps {
  sessions: TripSession[];
  activeSessionEvents: AlertEvent[];
  activeSessionDurationSec: number;
}

export const TripReportsView: React.FC<TripReportsViewProps> = ({
  sessions,
  activeSessionEvents,
  activeSessionDurationSec,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : 'CURRENT'
  );
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || {
    id: 'ACTIVE-SESSION',
    startTime: Date.now() - activeSessionDurationSec * 1000,
    durationSec: activeSessionDurationSec,
    totalCautions: activeSessionEvents.filter((e) => e.alertLevel === 1).length,
    totalHighWarnings: activeSessionEvents.filter((e) => e.alertLevel === 2).length,
    peakRisk: 84.0,
    avgRisk: 26.5,
    eventsCount: activeSessionEvents.length,
    status: 'active' as const,
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Session ID', 'Timestamp', 'Alert Level', 'Trigger Type', 'Description', 'Risk Score', 'EAR', 'MAR'];
    const rows = activeSessionEvents.map((e) => [
      e.id,
      e.sessionId,
      new Date(e.timestamp).toISOString(),
      e.alertLevel === 2 ? 'HIGH WARNING' : 'CAUTION',
      `"${e.triggerType}"`,
      `"${e.description}"`,
      e.riskScore ?? '',
      e.ear.toFixed(3),
      e.mar.toFixed(3),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentSession.id}_safety_log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Trip Safety Reports
          </h2>
          <p className="text-xs text-slate-500">
            Audit-ready driver vigilance summaries, grouped warning incidents, and CSV data export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable Summary</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Session Selector & Summary Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Select Trip Session:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-slate-800 text-xs font-medium"
            >
              <option value="CURRENT">Active Live Trip ({Math.floor(activeSessionDurationSec / 60)} min)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {new Date(s.startTime).toLocaleDateString()} ({Math.floor(s.durationSec / 60)} min)
                </option>
              ))}
            </select>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentSession.totalHighWarnings > 0
                ? 'bg-rose-100 text-rose-700'
                : currentSession.totalCautions > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {currentSession.totalHighWarnings > 0
              ? 'SAFETY STATUS: HIGH FATIGUE RISK OBSERVED'
              : currentSession.totalCautions > 0
              ? 'SAFETY STATUS: MODERATE CAUTION'
              : 'SAFETY STATUS: NOMINAL PROFILE'}
          </span>
        </div>

        {/* 4 Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Trip Duration</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {Math.floor(currentSession.durationSec / 60)} min {currentSession.durationSec % 60}s
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Caution Events</span>
            <p className="text-xl font-bold text-amber-700 mt-1">{currentSession.totalCautions}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">High Warnings</span>
            <p className="text-xl font-bold text-rose-700 mt-1">{currentSession.totalHighWarnings}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Peak Risk Indicator</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{currentSession.peakRisk.toFixed(1)}/100</p>
          </div>
        </div>
      </div>

      {/* Grouped Warning Events Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Detailed Event Log ({activeSessionEvents.length} Recorded)
        </h3>

        {activeSessionEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No caution or high warning events triggered during this trip session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Alert Tier</th>
                  <th className="py-2.5 px-3">Trigger Mechanism</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Biomarkers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeSessionEvents.map((ev) => (
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
                    <td className="py-2.5 px-3 font-bold text-slate-800">{ev.triggerType}</td>
                    <td className="py-2.5 px-3">{ev.description}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      {ev.riskScore !== null ? `${ev.riskScore}/100` : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      EAR: {ev.ear.toFixed(2)} | MAR: {ev.mar.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Trip Safety Summary Document</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
{`============================================================
SMART DRIVER FATIGUE PREVENTION SYSTEM - TRIP SAFETY REPORT
============================================================
Session ID:         ${currentSession.id}
Start Time:         ${new Date(currentSession.startTime).toLocaleString()}
Trip Duration:      ${Math.floor(currentSession.durationSec / 60)} minutes
Total Cautions:     ${currentSession.totalCautions}
Total High Alerts:  ${currentSession.totalHighWarnings}
Peak Risk Score:    ${currentSession.peakRisk.toFixed(1)}/100 (Heuristic)
Average Risk:       ${currentSession.avgRisk.toFixed(1)}/100
------------------------------------------------------------
SAFETY EVALUATION & RECOMMENDATIONS:
${
  currentSession.totalHighWarnings > 0
    ? 'STATUS: HIGH FATIGUE RISK DETECTED.\n- Multiple or prolonged eye closures/nodding detected.\n- Strongly advise immediate rest break before resuming travel.'
    : currentSession.totalCautions > 0
    ? 'STATUS: MODERATE FATIGUE SIGNS DETECTED.\n- Repeated yawning or eye narrowing recorded.\n- Recommend taking a 15-minute break at next exit.'
    : 'STATUS: NOMINAL / ALERT PROFILE.\n- No sustained fatigue hazards observed.'
}
------------------------------------------------------------
PRIVACY & INTEGRITY GUARANTEE:
- Zero video recordings or facial imagery stored.
- All geometric landmarks computed locally on device.
============================================================`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
