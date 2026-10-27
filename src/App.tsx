import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { AlertsView } from './pages/AlertsView';
import { AnalyticsView } from './pages/AnalyticsView';
import { DashboardView } from './pages/DashboardView';
import { LiveMonitoringView } from './pages/LiveMonitoringView';
import { ModelEvaluationView } from './pages/ModelEvaluationView';
import { PythonProjectView } from './pages/PythonProjectView';
import { RestRecommendationsView } from './pages/RestRecommendationsView';
import { RiskEngineView } from './pages/RiskEngineView';
import { SettingsView } from './pages/SettingsView';
import { TripReportsView } from './pages/TripReportsView';
import { soundManager } from './services/audioAlert';
import { calculateFatigueRisk } from './services/riskCalculation';
import { DEFAULT_SETTINGS, StorageService } from './services/storage';
import { AlertEvent, AlertLevel, DriverMetrics, SystemSettings, TripSession } from './types';

const INITIAL_METRICS: DriverMetrics = {
  ear: 0,
  leftEar: 0,
  rightEar: 0,
  rawEar: 0,
  baselineEar: 0.28,
  isCalibrated: false,
  calibrationProgress: 0,
  mar: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  blinksPerMinute: 0,
  totalBlinks: 0,
  closureDurationSec: 0,
  yawnDurationSec: 0,
  recentYawns: 0,
  recentNods: 0,
  isCurrentlyClosed: false,
  isCurrentlyYawning: false,
  isCurrentlyNodding: false,
  isDistracted: false,
  isEyeTrackingReliable: false,
  unreliabilityReason: 'Camera inactive',
  signalQuality: 0,
  faceDetected: false,
  fps: 0,
  processingLatencyMs: 0,
  systemState: 'unavailable',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [sessionDurationSec, setSessionDurationSec] = useState<number>(0);
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [metrics, setMetrics] = useState<DriverMetrics>(INITIAL_METRICS);
  const [riskTrend, setRiskTrend] = useState<number[]>([12, 14, 11, 15, 13, 16, 14, 12]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `TRIP-${Date.now().toString().slice(-6)}`);
  const [sessions, setSessions] = useState<TripSession[]>(() => StorageService.getSessions());
  const [activeSessionEvents, setActiveSessionEvents] = useState<AlertEvent[]>(() =>
    StorageService.getEvents()
  );

  const lastAlertTimeRef = useRef<number>(0);
  const previousLevelRef = useRef<AlertLevel>(0);

  // Compute explainable risk analysis in real time
  const riskAnalysis = calculateFatigueRisk(metrics, settings);
  const currentAlertLevel = riskAnalysis.alertLevel;

  // Audio & progressive alert coordination with cooldown logic
  useEffect(() => {
    const now = Date.now();
    const timeSinceLast = (now - lastAlertTimeRef.current) / 1000;

    if (currentAlertLevel === 2) {
      if (settings.audioEnabled && (!soundManager.isPlaying() || timeSinceLast >= settings.alertCooldownSec)) {
        soundManager.startHighWarningAlarm(settings.audioVolume);
        lastAlertTimeRef.current = now;
      }
      // Log event if level escalated
      if (previousLevelRef.current < 2) {
        logAlertEvent(2, 'Prolonged Eye Closure / High Fatigue', 'Sustained closure exceeds safety threshold');
      }
    } else if (currentAlertLevel === 1) {
      if (previousLevelRef.current === 2) {
        soundManager.stopAlarm();
      }
      if (
        previousLevelRef.current < 1 &&
        settings.audioEnabled &&
        timeSinceLast >= settings.alertCooldownSec
      ) {
        soundManager.playCautionChime(settings.audioVolume);
        lastAlertTimeRef.current = now;
      }
      if (previousLevelRef.current < 1) {
        logAlertEvent(1, 'Caution: Fatigue Biomarkers Elevated', 'Repetitive yawning or slow eye reopening detected');
      }
    } else {
      if (soundManager.isPlaying()) {
        soundManager.stopAlarm();
      }
    }

    previousLevelRef.current = currentAlertLevel;
  }, [currentAlertLevel, settings.audioEnabled, settings.audioVolume, settings.alertCooldownSec]);

  // Session duration timer & periodic trend points
  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      setSessionDurationSec((prev) => prev + 1);

      // Record trend point every 3 seconds
      if (riskAnalysis.score !== null) {
        setRiskTrend((prev) => {
          const next = [...prev, riskAnalysis.score as number];
          if (next.length > 30) next.shift();
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, riskAnalysis.score]);

  const logAlertEvent = (level: AlertLevel, triggerType: string, description: string) => {
    const newEvent: AlertEvent = {
      id: `EV-${Date.now().toString().slice(-6)}`,
      sessionId: activeSessionId,
      timestamp: Date.now(),
      alertLevel: level,
      systemState: riskAnalysis.systemState,
      triggerType,
      description,
      riskScore: riskAnalysis.score,
      ear: metrics.ear,
      leftEar: metrics.leftEar,
      rightEar: metrics.rightEar,
      mar: metrics.mar,
      headPitch: metrics.headPitch,
    };
    StorageService.saveEvent(newEvent);
    setActiveSessionEvents((prev) => [newEvent, ...prev]);
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      // Stopping session: persist record
      setIsMonitoring(false);
      soundManager.stopAlarm();
      const completedSession: TripSession = {
        id: activeSessionId,
        startTime: Date.now() - sessionDurationSec * 1000,
        endTime: Date.now(),
        durationSec: sessionDurationSec,
        totalCautions: activeSessionEvents.filter((e) => e.alertLevel === 1).length,
        totalHighWarnings: activeSessionEvents.filter((e) => e.alertLevel === 2).length,
        peakRisk: Math.max(...riskTrend, 15),
        avgRisk: Math.round((riskTrend.reduce((a, b) => a + b, 0) / (riskTrend.length || 1)) * 10) / 10,
        eventsCount: activeSessionEvents.length,
        status: 'completed',
      };
      StorageService.saveSession(completedSession);
      setSessions(StorageService.getSessions());
    } else {
      // Starting new session
      const newSessionId = `TRIP-${Date.now().toString().slice(-6)}`;
      setActiveSessionId(newSessionId);
      setSessionDurationSec(0);
      setIsMonitoring(true);
    }
  };

  const handleToggleAudio = () => {
    const updated = { ...settings, audioEnabled: !settings.audioEnabled };
    setSettings(updated);
    StorageService.saveSettings(updated);
    if (!updated.audioEnabled) {
      soundManager.stopAlarm();
    }
  };

  const handleUpdateMetrics = (patch: Partial<DriverMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleClearHistory = () => {
    StorageService.clearAllHistory();
    setSessions([]);
    setActiveSessionEvents([]);
  };

  const cautionCount = activeSessionEvents.filter((e) => e.alertLevel === 1).length;
  const highCount = activeSessionEvents.filter((e) => e.alertLevel === 2).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <Header
        alertLevel={currentAlertLevel}
        isMonitoring={isMonitoring}
        onToggleMonitoring={handleToggleMonitoring}
        audioEnabled={settings.audioEnabled}
        onToggleAudio={handleToggleAudio}
        sessionDurationSec={sessionDurationSec}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Navigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          cautionCount={cautionCount}
          highCount={highCount}
        />

        {/* Page Content Panel */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              isMonitoring={isMonitoring}
              onToggleMonitoring={handleToggleMonitoring}
              metrics={metrics}
              riskAnalysis={riskAnalysis}
              sessionDurationSec={sessionDurationSec}
              totalCautions={cautionCount}
              totalHighWarnings={highCount}
              riskTrend={riskTrend}
              onNavigateToLive={() => setActiveTab('live')}
            />
          )}

          {activeTab === 'live' && (
            <LiveMonitoringView
              isMonitoring={isMonitoring}
              onToggleMonitoring={handleToggleMonitoring}
              metrics={metrics}
              onUpdateMetrics={handleUpdateMetrics}
              settings={settings}
              alertLevel={currentAlertLevel}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              currentLevel={currentAlertLevel}
              audioEnabled={settings.audioEnabled}
              onToggleAudio={handleToggleAudio}
              settings={settings}
              events={activeSessionEvents}
              onTriggerTestAlert={(level, reason) => logAlertEvent(level, 'Manual Test', reason)}
            />
          )}

          {activeTab === 'risk_engine' && (
            <RiskEngineView
              metrics={metrics}
              riskAnalysis={riskAnalysis}
              settings={settings}
              onUpdateWeights={(weights: SystemSettings['weights']) => handleSaveSettings({ ...settings, weights })}
            />
          )}

          {activeTab === 'rest_recommendations' && (
            <RestRecommendationsView
              metrics={metrics}
              riskAnalysis={riskAnalysis}
              alertLevel={currentAlertLevel}
            />
          )}

          {activeTab === 'trip_reports' && (
            <TripReportsView
              sessions={sessions}
              activeSessionEvents={activeSessionEvents}
              activeSessionDurationSec={sessionDurationSec}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView sessions={sessions} onClearHistory={handleClearHistory} />
          )}

          {activeTab === 'model_evaluation' && <ModelEvaluationView />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onClearHistory={handleClearHistory}
            />
          )}

          {activeTab === 'python_project' && <PythonProjectView />}
        </main>
      </div>
    </div>
  );
}
