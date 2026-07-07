/**
 * All sound is synthesized with WebAudio — no audio assets.
 * The announcer voice uses the browser SpeechSynthesis API pitched down.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;

  ensure(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) window.speechSynthesis?.cancel();
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
  ): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  hit(): void {
    this.noise(0.12, 0.5, 900);
    this.tone(140, 0.12, 'square', 0.25, 60);
  }

  heavyHit(): void {
    this.noise(0.2, 0.7, 600);
    this.tone(90, 0.25, 'sawtooth', 0.35, 40);
  }

  block(): void {
    this.tone(500, 0.06, 'square', 0.2, 300);
    this.noise(0.05, 0.25, 2500);
  }

  whoosh(): void {
    this.noise(0.15, 0.18, 1800);
  }

  jump(): void {
    this.tone(220, 0.12, 'sine', 0.15, 380);
  }

  special(): void {
    this.tone(300, 0.3, 'sawtooth', 0.22, 900);
    this.noise(0.25, 0.2, 3000);
  }

  freeze(): void {
    this.tone(1400, 0.4, 'sine', 0.2, 200);
    this.tone(1900, 0.35, 'sine', 0.12, 300);
  }

  shatter(): void {
    this.noise(0.5, 0.6, 4000);
    this.tone(2000, 0.4, 'triangle', 0.2, 200);
  }

  thunder(): void {
    this.noise(0.7, 0.8, 300);
    this.tone(60, 0.7, 'sawtooth', 0.4, 30);
  }

  fire(): void {
    this.noise(0.5, 0.4, 700);
    this.tone(120, 0.5, 'sawtooth', 0.2, 45);
  }

  koSlam(): void {
    this.noise(0.4, 0.9, 400);
    this.tone(70, 0.5, 'sawtooth', 0.5, 25);
  }

  menuMove(): void {
    this.tone(400, 0.06, 'square', 0.12);
  }

  menuSelect(): void {
    this.tone(300, 0.1, 'square', 0.18, 600);
  }

  announce(text: string): void {
    if (this.muted) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.toLowerCase());
      u.pitch = 0.1;
      u.rate = 0.8;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch {
      /* speech not available — text overlay still shows */
    }
  }

  startMusic(): void {
    if (this.musicTimer !== null) return;
    // Dark ostinato: bass line + sparse toms, stepped every 150ms.
    const bass = [55, 55, 65.4, 55, 55, 49, 55, 82.4, 55, 55, 65.4, 55, 73.4, 49, 55, 41.2];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const s = this.musicStep % 16;
      this.tone(bass[s], 0.14, 'triangle', 0.14);
      if (s % 4 === 0) this.noise(0.05, 0.06, 500);
      if (s === 8) this.tone(110, 0.3, 'sine', 0.06, 55);
      this.musicStep++;
    }, 150);
  }
}

export const audio = new AudioEngine();
