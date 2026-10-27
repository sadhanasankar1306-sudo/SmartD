import React from 'react';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Coffee,
  Cpu,
  FileSpreadsheet,
  LayoutDashboard,
  Sliders,
  Terminal,
  Video,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'live'
  | 'alerts'
  | 'risk_engine'
  | 'rest_recommendations'
  | 'trip_reports'
  | 'analytics'
  | 'settings'
  | 'model_evaluation'
  | 'python_project';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  cautionCount: number;
  highCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  cautionCount,
  highCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Driver Monitoring', icon: Video, badge: 'Real Vision' },
    { id: 'alerts', label: 'Progressive Alerts', icon: Bell, alertCount: cautionCount + highCount },
    { id: 'risk_engine', label: 'Explainable Risk Engine', icon: Cpu },
    { id: 'rest_recommendations', label: 'Smart Rest Recommendations', icon: Coffee },
    { id: 'trip_reports', label: 'Trip Safety Reports', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Historical Analytics', icon: BarChart3 },
    { id: 'model_evaluation', label: 'Model Evaluation', icon: CheckSquare },
    { id: 'settings', label: 'Settings & Calibration', icon: Sliders },
    { id: 'python_project', label: 'Python Code & Windows 11', icon: Terminal, highlight: true },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100 hidden md:block">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Monitoring Navigation
        </p>
      </div>

      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span className="text-left">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700 font-semibold">
                  {item.badge}
                </span>
              )}

              {item.alertCount !== undefined && item.alertCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    highCount > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.alertCount}
                </span>
              )}

              {item.highlight && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-medium">
                  Py 3.11
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Safety Notice Footer */}
      <div className="p-3.5 m-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1 hidden md:block">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span>⚠️ Research Prototype</span>
        </div>
        <p className="leading-relaxed">
          Not a certified automotive safety device. Always prioritize safe stopping if tired.
        </p>
      </div>
    </aside>
  );
};
