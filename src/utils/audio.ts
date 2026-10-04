/**
 * High-performance procedural audio synthesizer for racing game.
 * Uses browser Web Audio API to generate realistic engine revs, tire screeches,
 * turbo blowoffs, nitro jets, and UI sounds without any external audio asset dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine synth nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Screech synth nodes
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private screechSource: AudioBufferSourceNode | null = null;

  // Nitro synth
  private nitroGain: GainNode | null = null;
  private nitroOsc: OscillatorNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(65, this.ctx.currentTime);

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;

      // Prepare screech node
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.screechFilter = this.ctx.createBiquadFilter();
      this.screechFilter.type = 'bandpass';
      this.screechFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.screechFilter.Q.setValueAtTime(4, this.ctx.currentTime);
      this.screechGain.connect(this.masterGain);
      this.screechFilter.connect(this.screechGain);

      if (this.noiseBuffer) {
        this.screechSource = this.ctx.createBufferSource();
        this.screechSource.buffer = this.noiseBuffer;
        this.screechSource.loop = true;
        this.screechSource.connect(this.screechFilter);
        this.screechSource.start();
      }

      // Nitro node
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.nitroOsc = this.ctx.createOscillator();
      this.nitroOsc.type = 'sine';
      this.nitroOsc.frequency.setValueAtTime(80, this.ctx.currentTime);
      this.nitroOsc.connect(this.nitroGain);
      this.nitroGain.connect(this.masterGain);
      this.nitroOsc.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateEngine(rpm: number, speedPct: number, isBoosting: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const baseFreq = 55 + rpm * 180 + speedPct * 60;
    const filterFreq = 400 + rpm * 2600 + (isBoosting ? 1000 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);

    if (this.engineGain) {
      const targetGain = 0.15 + speedPct * 0.18 + (isBoosting ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  public updateDriftScreech(intensity: number) {
    if (!this.ctx || !this.screechGain) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const now = this.ctx.currentTime;
    this.screechGain.gain.setTargetAtTime(clamped * 0.35, now, 0.05);
  }

  public updateNitroSound(active: boolean) {
    if (!this.ctx || !this.nitroGain) return;
    const now = this.ctx.currentTime;
    this.nitroGain.gain.setTargetAtTime(active ? 0.3 : 0, now, 0.08);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.screechSource?.stop();
      this.nitroOsc?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineGain?.disconnect();
      this.screechGain?.disconnect();
      this.nitroGain?.disconnect();
    } catch {
      // safe cleanup
    }
    this.isEngineRunning = false;
  }

  public playCountdownBeep(isFinal: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, this.ctx.currentTime);

    const duration = isFinal ? 0.45 : 0.2;
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playCollision(force: number = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);

    const volume = Math.min(0.5, force * 0.4);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playTurboBlowoff() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.isMuted) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    source.stop(this.ctx.currentTime + 0.35);
  }

  public playLetterSmash(letterIndex: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Pitch rises as the player advances through the alphabet!
    // A (idx 0) starts at 330Hz, Z (idx 25) reaches 1320Hz
    const baseFreq = 330 * Math.pow(2, letterIndex / 12);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.25);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.35);
    osc2.stop(this.ctx.currentTime + 0.35);
  }

  public playLetterReject() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.setValueAtTime(90, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playLapFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  public playClick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const soundManager = new SoundEngine();
