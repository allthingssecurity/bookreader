// Simple synth sound effects to avoid external assets
class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private autoUnlockAttached = false;

  private createContextIfNeeded() {
    if (this.ctx) return;
    const AudioContextClass = (typeof window !== 'undefined') && (window.AudioContext || (window as any).webkitAudioContext);
    if (AudioContextClass) this.ctx = new AudioContextClass();
  }

  // Attach once so the first user gesture resumes audio
  attachAutoUnlock() {
    if (this.autoUnlockAttached) return;
    this.autoUnlockAttached = true;
    const handler = () => {
      this.createContextIfNeeded();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      ['pointerdown','touchstart','keydown','mousedown'].forEach(ev => window.removeEventListener(ev, handler));
    };
    ['pointerdown','touchstart','keydown','mousedown'].forEach(ev => window.addEventListener(ev, handler, { once: true } as any));
  }

  resumeNow() {
    this.createContextIfNeeded();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    // Do not auto-resume here; wait for user gesture.
  }

  playPop() {
    if (!this.enabled) return;
    this.createContextIfNeeded();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Themed pop for subtle variety by section
  playPopThemed(theme: string) {
    if (!this.enabled) return;
    this.createContextIfNeeded();
    if (!this.ctx) return;
    const t = (theme || '').toLowerCase();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Base values
    let startF = 420;
    let endF = 60;
    let type: OscillatorType = 'triangle';

    if (/platform|trusted|security|governance/.test(t)) {
      startF = 520; endF = 80; type = 'square'; // crisp/metallic
    } else if (/resilient/.test(t)) {
      startF = 360; endF = 50; type = 'sine'; // soft/wispy
    } else if (/ux|vision|experience/.test(t)) {
      startF = 480; endF = 70; type = 'sawtooth'; // bright
    } else if (/ecosystem|integration/.test(t)) {
      startF = 440; endF = 65; type = 'triangle';
    }

    osc.type = type;
    osc.frequency.setValueAtTime(startF, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endF, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  playWhoosh() {
    if (!this.enabled) return;
    this.createContextIfNeeded();
    if (!this.ctx) return;
    // White noise buffer for wind/whoosh
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  playWhooshThemed(theme: string) {
    if (!this.enabled) return;
    this.createContextIfNeeded();
    if (!this.ctx) return;
    const t = (theme || '').toLowerCase();
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // Slightly different sweeps per theme
    const startFreq = /platform|trusted|security/.test(t) ? 1000 : /resilient/.test(t) ? 700 : 850;
    const endFreq = /resilient/.test(t) ? 120 : 150;
    filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + 0.28);

    const gain = this.ctx.createGain();
    const startGain = /platform|trusted|security/.test(t) ? 0.12 : 0.09;
    gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  // Gentle page flip rustle
  playPageFlip() {
    if (!this.enabled) return;
    this.createContextIfNeeded();
    if (!this.ctx) return;

    const ctx = this.ctx;
    // Short band-passed noise burst
    const bufferSize = ctx.sampleRate * 0.18;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1600;
    band.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(band);
    band.connect(gain);
    gain.connect(ctx.destination);
    try { noise.start(); } catch {}
  }
}

export const soundService = new SoundService();
