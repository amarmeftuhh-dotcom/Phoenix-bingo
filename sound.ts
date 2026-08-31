// Web Audio Synthesizer for ball caller and bingo victory fanfare
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playBeep(
    freq: number = 587.33,
    duration: number = 0.15,
    type: OscillatorType = "sine"
  ) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay restrictions
    }
  }

  playBallChime() {
    if (!this.enabled) return;
    this.playBeep(659.25, 0.12, "triangle"); // E5
    setTimeout(() => this.playBeep(880.0, 0.2, "sine"), 100); // A5
  }

  playVictoryChime() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playBeep(f, 0.35, "triangle");
      }, i * 150);
    });
  }
}

export const soundEngine = new SoundManager();

export function isSoundMuted(): boolean {
  return !soundEngine.enabled;
}

export function setSoundMuted(muted: boolean) {
  soundEngine.enabled = !muted;
}

export function playBallChime(_dummy?: boolean) {
  soundEngine.playBallChime();
}

export function playNumberCallVoice(_numOrLetter: number | string, _num?: number) {
  soundEngine.playBallChime();
}

export function playBingoFanfare() {
  soundEngine.playVictoryChime();
}
