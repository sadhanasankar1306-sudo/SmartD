export type AlertLevel = 0 | 1 | 2; // 0: Normal, 1: Caution, 2: High Warning

export type DriverSystemState = 'unavailable' | 'low' | 'caution' | 'high_warning';

export interface DriverMetrics {
  ear: number; // Combined Eye Aspect Ratio
  leftEar: number; // Independent Left EAR
  rightEar: number; // Independent Right EAR
  rawEar: number; // Unsmoothed EAR
  baselineEar: number; // Personalized open-eye baseline
  isCalibrated: boolean; // Has baseline calibration completed
  calibrationProgress: number; // 0 - 100%
  mar: number; // Mouth Aspect Ratio
  headPitch: number; // degrees (-60 to +60, negative = downward nod)
  headYaw: number; // degrees (-90 to +90, turn away from road)
  headRoll: number; // degrees
  blinksPerMinute: number;
  totalBlinks: number;
  closureDurationSec: number;
  yawnDurationSec: number;
  recentYawns: number;
  recentNods: number;
  isCurrentlyClosed: boolean;
  isCurrentlyYawning: boolean;
  isCurrentlyNodding: boolean;
  isDistracted: boolean;
  isEyeTrackingReliable: boolean;
  unreliabilityReason: string | null;
  signalQuality: number; // 0.0 to 1.0
  faceDetected: boolean;
  fps: number;
  processingLatencyMs: number;
  systemState: DriverSystemState;
}

export interface RiskAnalysis {
  isReliable: boolean;
  score: number | null; // 0-100
  category: 'Low' | 'Moderate' | 'High' | 'Insufficient Data';
  categoryLabel: string;
  systemState: DriverSystemState;
  alertLevel: AlertLevel;
  signalBreakdown: {
    closureSubscore: number;
    blinkSubscore: number;
    yawnSubscore: number;
    nodSubscore: number;
  };
  contributions: {
    closureDuration: number;
    blinkPattern: number;
    yawnFrequency: number;
    headNodding: number;
  };
  explanation: string;
}

export interface AlertEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  alertLevel: AlertLevel;
  systemState: DriverSystemState;
  triggerType: string;
  description: string;
  riskScore: number | null;
  ear: number;
  leftEar: number;
  rightEar: number;
  mar: number;
  headPitch: number;
}

export interface TripSession {
  id: string;
  startTime: number;
  endTime?: number;
  durationSec: number;
  totalCautions: number;
  totalHighWarnings: number;
  peakRisk: number;
  avgRisk: number;
  eventsCount: number;
  status: 'active' | 'completed';
}

export interface SystemSettings {
  earCloseThreshold: number; // default 0.19 (hysteresis lower bound)
  earOpenThreshold: number; // default 0.23 (hysteresis upper bound)
  earThreshold: number; // default 0.21 (legacy/baseline reference)
  enableAdaptiveCalibration: boolean;
  smoothingAlpha: number; // default 0.35
  marThreshold: number; // default 0.60
  nodPitchThreshold: number; // default -15
  distractionYawThreshold: number; // default 28
  cautionClosureSec: number; // default 1.5
  highClosureSec: number; // default 2.5
  alertCooldownSec: number; // default 5.0
  audioEnabled: boolean;
  audioVolume: number; // 0.0 to 1.0
  showLandmarks: boolean;
  weights: {
    closureDuration: number;
    blinkPattern: number;
    yawnFrequency: number;
    headNodding: number;
  };
}
