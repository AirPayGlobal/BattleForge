let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export const GameAudio = {
  punch() {
    try {
      const c = getCtx();
      const buf = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.3, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    } catch (_) {}
  },

  kick() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.setValueAtTime(150, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.15);
      gain.gain.setValueAtTime(0.5, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.2);
    } catch (_) {}
  },

  hit() {
    try {
      const c = getCtx();
      const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = 0.5;
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 800;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    } catch (_) {}
  },

  block() {
    try {
      const c = getCtx();
      [400, 600, 800].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, c.currentTime + i * 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime + i * 0.01);
        osc.stop(c.currentTime + 0.15);
      });
    } catch (_) {}
  },

  weaponStrike() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.25);
    } catch (_) {}
  },

  victory() {
    try {
      const c = getCtx();
      [261, 329, 392, 523].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.frequency.value = freq;
        const t = c.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (_) {}
  },

  defeat() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.setValueAtTime(400, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.8);
      gain.gain.setValueAtTime(0.3, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.8);
    } catch (_) {}
  },

  roundStart() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.5);
    } catch (_) {}
  },

  combo() {
    try {
      const c = getCtx();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = c.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (_) {}
  },
};
