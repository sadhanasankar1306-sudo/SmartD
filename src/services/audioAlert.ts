/**
 * Web Audio API synthesizer for progressive driver fatigue alarms.
 * Uses native oscillators so audio works reliably without external asset downloads.
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private sirenIntervalId: number | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Play a pleasant 2-tone caution chime (e.g. 520Hz -> 680Hz)
   */
  public playCautionChime(volume = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(680, now + 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio fallback safe
    }
  }

  /**
   * Play an urgent dual-tone pulsating siren for high fatigue / microsleep
   */
  public startHighWarningAlarm(volume = 0.7) {
    if (this.isAlarmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isAlarmPlaying = true;
    let highTone = false;

    const pulse = () => {
      if (!this.isAlarmPlaying) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(highTone ? 880 : 660, now);
        highTone = !highTone;

        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      } catch {
        // Fallback
      }
    };

    pulse();
    this.sirenIntervalId = window.setInterval(pulse, 220);
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.sirenIntervalId !== null) {
      clearInterval(this.sirenIntervalId);
      this.sirenIntervalId = null;
    }
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const soundManager = new SoundAlertManager();
