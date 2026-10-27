import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  Filter,
  Flame,
  History,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { TripSession } from '../types';

interface AnalyticsViewProps {
  sessions: TripSession[];
  onClearHistory: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ sessions, onClearHistory }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredSessions = sessions.filter((s) =>
    s.id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalTrips = sessions.length;
  const totalWarnings = sessions.reduce((acc, s) => acc + s.totalCautions + s.totalHighWarnings, 0);
  const avgRiskOverall =
    totalTrips > 0 ? (sessions.reduce((acc, s) => acc + s.avgRisk, 0) / totalTrips).toFixed(1) : '0.0';
  const peakRiskEver =
    totalTrips > 0 ? Math.max(...sessions.map((s) => s.peakRisk)).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Historical Fatigue Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Cross-session trends, longitudinal risk analysis, and alert frequency tracking
          </p>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-600 font-semibold">Delete all trip history?</span>
            <button
              onClick={() => {
                onClearHistory();
                setConfirmClear(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Saved History</span>
          </button>
        )}
      </div>

      {/* 4 Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Trips</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalTrips} Sessions</p>
          <span className="text-[11px] text-slate-400">Stored in local database</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Warning Events</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{totalWarnings} Incidents</p>
          <span className="text-[11px] text-slate-400">Caution & High Alerts</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Risk (Heuristic)</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{avgRiskOverall} / 100</p>
          <span className="text-[11px] text-slate-400">Across all completed drives</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historical Peak Risk</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{peakRiskEver} / 100</p>
          <span className="text-[11px] text-slate-400">Maximum recorded fatigue marker</span>
        </div>
      </div>

      {/* Comparative Bar Chart Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Comparative Trip Fatigue Risk (Peak vs Average)
        </h3>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No session history available to display.
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.slice(0, 6).map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-800 font-bold">{s.id} ({new Date(s.startTime).toLocaleDateString()})</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    Peak: <strong className="text-rose-600">{s.peakRisk.toFixed(1)}</strong> | Avg: {s.avgRisk.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  {/* Avg risk in blue */}
                  <div
                    className="bg-blue-600 h-full rounded-l-full"
                    style={{ width: `${Math.min(100, s.avgRisk)}%` }}
                    title={`Average: ${s.avgRisk}`}
                  />
                  {/* Peak delta in rose */}
                  <div
                    className="bg-rose-400 h-full rounded-r-full opacity-80"
                    style={{ width: `${Math.max(0, Math.min(100 - s.avgRisk, s.peakRisk - s.avgRisk))}%` }}
                    title={`Peak: ${s.peakRisk}`}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-blue-600 inline-block" /> Average Risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-rose-400 inline-block" /> Peak Surge
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Saved Sessions Table with search */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Previous Driver Monitoring Sessions
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Session ID..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800"
            />
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
            No matching sessions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Cautions</th>
                  <th className="py-2.5 px-3">High Alerts</th>
                  <th className="py-2.5 px-3">Peak Risk</th>
                  <th className="py-2.5 px-3">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.id}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{Math.floor(s.durationSec / 60)} min</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        {s.totalCautions}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                        {s.totalHighWarnings}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-rose-600">
                      {s.peakRisk.toFixed(1)}/100
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.avgRisk.toFixed(1)}/100</td>
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
