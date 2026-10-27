import { DriverMetrics, DriverSystemState, RiskAnalysis, SystemSettings } from '../types';

export function calculateFatigueRisk(metrics: DriverMetrics, settings: SystemSettings): RiskAnalysis {
  // If face is not detected or quality is below 0.35 or eye tracking is marked unreliable
  if (!metrics.faceDetected || metrics.signalQuality < 0.35 || !metrics.isEyeTrackingReliable) {
    const reason = metrics.unreliabilityReason || (!metrics.faceDetected
      ? 'Driver face not detected'
      : metrics.signalQuality < 0.35
      ? 'Camera illumination or image quality inadequate'
      : 'Unreliable sensor visibility');

    return {
      isReliable: false,
      score: null,
      category: 'Insufficient Data',
      categoryLabel: `Monitoring unavailable - ${reason}`,
      systemState: 'unavailable',
      alertLevel: 0,
      signalBreakdown: {
        closureSubscore: 0,
        blinkSubscore: 0,
        yawnSubscore: 0,
        nodSubscore: 0,
      },
      contributions: {
        closureDuration: 0,
        blinkPattern: 0,
        yawnFrequency: 0,
        headNodding: 0,
      },
      explanation: `${reason}. Risk calculation suspended to prevent false alerts.`,
    };
  }

  // 1. Normalize closure duration (0 - 100)
  const d = metrics.closureDurationSec;
  let sClosure = 0;
  if (d <= 0.3) {
    sClosure = 0;
  } else if (d <= 0.8) {
    sClosure = ((d - 0.3) / 0.5) * 15;
  } else if (d <= settings.cautionClosureSec) {
    sClosure = 15 + ((d - 0.8) / (settings.cautionClosureSec - 0.8)) * 35;
  } else if (d <= settings.highClosureSec) {
    sClosure = 50 + ((d - settings.cautionClosureSec) / (settings.highClosureSec - settings.cautionClosureSec)) * 35;
  } else {
    sClosure = Math.min(100, 85 + (d - settings.highClosureSec) * 15);
  }

  // 2. Normalize blink rate
  const bpm = metrics.blinksPerMinute;
  let sBlink = 5;
  if (bpm >= 12 && bpm <= 25) {
    sBlink = 5;
  } else if (bpm < 12) {
    sBlink = bpm <= 4 ? 80 : 5 + ((12 - bpm) / 8) * 60;
  } else {
    sBlink = bpm >= 45 ? 75 : 5 + ((bpm - 25) / 20) * 60;
  }

  // 3. Normalize yawning
  const y = metrics.recentYawns;
  let sYawn = 0;
  if (y <= 0) sYawn = 0;
  else if (y === 1) sYawn = 40;
  else if (y === 2) sYawn = 75;
  else sYawn = Math.min(100, 90 + (y - 3) * 5);

  if (metrics.isCurrentlyYawning) {
    sYawn = Math.max(sYawn, 60);
  }

  // 4. Normalize head nodding
  const n = metrics.recentNods;
  let sNod = 0;
  if (n === 1) sNod = 50;
  else if (n >= 2) sNod = Math.min(100, 80 + (n - 2) * 10);

  if (metrics.isCurrentlyNodding) {
    sNod = Math.max(sNod, 75);
  }

  // Weighted calculation
  const w = settings.weights;
  const totalWeight = w.closureDuration + w.blinkPattern + w.yawnFrequency + w.headNodding || 1;
  const normW = {
    closure: w.closureDuration / totalWeight,
    blink: w.blinkPattern / totalWeight,
    yawn: w.yawnFrequency / totalWeight,
    nod: w.headNodding / totalWeight,
  };

  const rawScore =
    normW.closure * sClosure +
    normW.blink * sBlink +
    normW.yawn * sYawn +
    normW.nod * sNod;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  // Determine category and 4 clear system states
  let category: 'Low' | 'Moderate' | 'High' = 'Low';
  let categoryLabel = 'Alert indicators low';
  let systemState: DriverSystemState = 'low';
  let alertLevel: 0 | 1 | 2 = 0;

  if (score < 35) {
    category = 'Low';
    categoryLabel = 'Alert indicators low';
    systemState = 'low';
    alertLevel = 0;
  } else if (score < 70) {
    category = 'Moderate';
    categoryLabel = 'Caution';
    systemState = 'caution';
    alertLevel = 1;
  } else {
    category = 'High';
    categoryLabel = 'High warning';
    systemState = 'high_warning';
    alertLevel = 2;
  }

  // Direct safety overrides for prolonged closures
  if (metrics.closureDurationSec >= settings.highClosureSec) {
    alertLevel = 2;
    category = 'High';
    categoryLabel = 'High warning (Sustained Eye Closure)';
    systemState = 'high_warning';
  } else if (metrics.closureDurationSec >= settings.cautionClosureSec && alertLevel === 0) {
    alertLevel = 1;
    category = 'Moderate';
    categoryLabel = 'Caution (Prolonged Eye Closure)';
    systemState = 'caution';
  }

  // Relative contributions
  const pts = score > 0 ? score : 1;
  const contributions = {
    closureDuration: Math.round(((normW.closure * sClosure) / pts) * 1000) / 10,
    blinkPattern: Math.round(((normW.blink * sBlink) / pts) * 1000) / 10,
    yawnFrequency: Math.round(((normW.yawn * sYawn) / pts) * 1000) / 10,
    headNodding: Math.round(((normW.nod * sNod) / pts) * 1000) / 10,
  };

  // Explanation
  const reasons: string[] = [];
  if (sClosure >= 40) reasons.push(`prolonged eye closure (${metrics.closureDurationSec.toFixed(1)}s)`);
  if (sNod >= 50) reasons.push(`head nodding motions (${metrics.recentNods} recent)`);
  if (sYawn >= 40) reasons.push(`yawning pattern (${metrics.recentYawns} recent)`);
  if (sBlink >= 50) reasons.push(`unusual blink cadence (${metrics.blinksPerMinute} bpm)`);

  const explanation = reasons.length > 0
    ? `Elevated risk indicators driven by ${reasons.join(', ')}.`
    : 'Driver indicators within nominal awake baseline. No acute fatigue markers detected.';

  return {
    isReliable: true,
    score,
    category,
    categoryLabel,
    systemState,
    alertLevel,
    signalBreakdown: {
      closureSubscore: Math.round(sClosure * 10) / 10,
      blinkSubscore: Math.round(sBlink * 10) / 10,
      yawnSubscore: Math.round(sYawn * 10) / 10,
      nodSubscore: Math.round(sNod * 10) / 10,
    },
    contributions,
    explanation,
  };
}

