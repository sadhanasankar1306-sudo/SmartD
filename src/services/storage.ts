import { AlertEvent, SystemSettings, TripSession } from '../types';

const STORAGE_KEYS = {
  SESSIONS: 'fatigue_guard_sessions',
  EVENTS: 'fatigue_guard_events',
  SETTINGS: 'fatigue_guard_settings',
};

export const DEFAULT_SETTINGS: SystemSettings = {
  earCloseThreshold: 0.19,
  earOpenThreshold: 0.23,
  earThreshold: 0.21,
  enableAdaptiveCalibration: true,
  smoothingAlpha: 0.35,
  marThreshold: 0.60,
  nodPitchThreshold: -15,
  distractionYawThreshold: 28,
  cautionClosureSec: 1.5,
  highClosureSec: 2.5,
  alertCooldownSec: 5.0,
  audioEnabled: true,
  audioVolume: 0.7,
  showLandmarks: true,
  weights: {
    closureDuration: 0.40,
    blinkPattern: 0.15,
    yawnFrequency: 0.25,
    headNodding: 0.20,
  },
};

export class StorageService {
  public static getSettings(): SystemSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: SystemSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  public static getSessions(): TripSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    // Return sample seeded sessions if empty so analytics is immediately meaningful
    return [
      {
        id: 'TRIP-2026-081',
        startTime: Date.now() - 3600000 * 2.5,
        endTime: Date.now() - 3600000 * 1.8,
        durationSec: 2520,
        totalCautions: 2,
        totalHighWarnings: 1,
        peakRisk: 84.5,
        avgRisk: 28.4,
        eventsCount: 3,
        status: 'completed',
      },
      {
        id: 'TRIP-2026-080',
        startTime: Date.now() - 86400000,
        endTime: Date.now() - 86400000 + 1800000,
        durationSec: 1800,
        totalCautions: 0,
        totalHighWarnings: 0,
        peakRisk: 18.2,
        avgRisk: 12.1,
        eventsCount: 0,
        status: 'completed',
      },
    ];
  }

  public static saveSession(session: TripSession): void {
    try {
      const sessions = this.getSessions();
      const existingIdx = sessions.findIndex((s) => s.id === session.id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        sessions.unshift(session);
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }

  public static getEvents(sessionId?: string): AlertEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      const allEvents: AlertEvent[] = data ? JSON.parse(data) : [];
      if (sessionId) {
        return allEvents.filter((e) => e.sessionId === sessionId);
      }
      return allEvents;
    } catch {
      return [];
    }
  }

  public static saveEvent(event: AlertEvent): void {
    try {
      const events = this.getEvents();
      events.unshift(event);
      // Keep last 500 events
      if (events.length > 500) events.pop();
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch {
      // ignore
    }
  }

  public static clearAllHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
    } catch {
      // ignore
    }
  }
}
