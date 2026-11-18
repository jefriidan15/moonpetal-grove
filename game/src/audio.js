// Synthesised sound: no audio files, everything is WebAudio oscillators.
// Created lazily on the first user gesture so browsers allow it.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 1, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.5, when = 0, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  catchSeed() { this.tone(660, 0.12, 'sine', 0.7); this.tone(990, 0.14, 'sine', 0.5, 0.05); }
  plant() { this.tone(220, 0.16, 'triangle', 0.8, 0, 110); this.noise(0.08, 0.25, 0, 900); }
  water() {
    this.tone(880, 0.1, 'sine', 0.35, 0, 1320);
    this.tone(1174, 0.12, 'sine', 0.3, 0.07, 1568);
    this.noise(0.25, 0.12, 0, 2400);
  }
  bloom() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.5, i * 0.07));
  }
  swat() { this.noise(0.12, 0.6, 0, 1800); this.tone(180, 0.12, 'square', 0.35, 0, 90); }
  blight() { this.tone(160, 0.5, 'sawtooth', 0.5, 0, 60); this.noise(0.3, 0.4, 0, 700); }
  rain() { this.noise(0.7, 0.16, 0, 3000); this.tone(392, 0.3, 'sine', 0.25, 0.1); }
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.55, i * 0.11));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.5, i * 0.16));
  }
  click() { this.tone(520, 0.06, 'square', 0.3); }
}
