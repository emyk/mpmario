type OscType = OscillatorType;

interface ToneOpts {
  freq: number;
  endFreq?: number;
  duration: number;
  type?: OscType;
  volume?: number;
}

export class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  jump() {
    this.tone({ freq: 350, endFreq: 700, duration: 0.09, type: "square", volume: 0.25 });
  }

  stomp() {
    this.tone({ freq: 380, endFreq: 120, duration: 0.07, type: "square", volume: 0.3 });
  }

  fireball() {
    this.tone({ freq: 700, endFreq: 200, duration: 0.06, type: "sawtooth", volume: 0.18 });
  }

  powerUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, duration: 0.1, type: "square", volume: 0.28 }), i * 80)
    );
  }

  loseLife() {
    [494, 392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, duration: 0.11, type: "square", volume: 0.28 }), i * 70)
    );
  }

  win() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, duration: 0.13, type: "square", volume: 0.28 }), i * 110)
    );
  }

  private tone({ freq, endFreq, duration, type = "square", volume = 0.25 }: ToneOpts) {
    try {
      const ctx = this.getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (endFreq !== undefined)
        osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch { /* AudioContext unavailable */ }
  }
}
