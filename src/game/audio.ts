// Procedural Web Audio API sound & Indian-inspired instrumental music engine

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicVolume = 0.45;
  private sfxVolume = 0.75;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private stepIndex = 0;

  // Bhupali-Yaman inspired joyful Indian pentatonic + bright 7th frequencies (Hz)
  private readonly melodyNotes = [
    261.63, // Sa (C4)
    293.66, // Re (D4)
    329.63, // Ga (E4)
    392.0,  // Pa (G4)
    440.0,  // Dha (A4)
    523.25, // Sa' (C5)
    440.0,
    392.0,
    329.63,
    392.0,
    440.0,
    587.33, // Re' (D5)
    523.25,
    440.0,
    392.0,
    293.66,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);

      // Reusable white noise buffer for wind/whoosh/slide/wing flaps
      const sampleRate = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sampleRate * 1.0, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setVolumes(musicVol: number, sfxVol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.04);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
    }
  }

  public startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.scheduleNextBeat();
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleNextBeat(): void {
    if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const step = this.stepIndex % 16;

    // 1. Sitar-like plucked melody note on select beats
    if (step % 2 === 0 || step === 7 || step === 15) {
      const freq = this.melodyNotes[step];
      this.playSitarPluck(freq, now, 0.24);
    }

    // 2. Tanpura / drone fifth every 8 steps
    if (step === 0 || step === 8) {
      this.playDrone(130.81, now, 1.3); // C3
      this.playDrone(196.0, now, 1.1);  // G3
    }

    // 3. Tabla-style percussion pattern (8-beat Teentaal groove)
    if (step === 0 || step === 4 || step === 10) {
      this.playTablaBayan(now); // warm bass "Dha/Ge"
    }
    if (step % 2 === 1 || step === 2 || step === 8 || step === 12) {
      this.playTablaDayan(now, step % 4 === 0 ? 0.16 : 0.09); // crisp "Na/Ta"
    }

    this.stepIndex++;
    this.musicTimer = window.setTimeout(() => this.scheduleNextBeat(), 185);
  }

  private playSitarPluck(freq: number, startTime: number, duration: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.98, startTime);
    osc1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.04);
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 3.2, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + duration);
    filter.Q.value = 2.4;

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  private playDrone(freq: number, startTime: number, duration: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.value = 420;

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(0.06, startTime + 0.25);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  private playTablaBayan(startTime: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, startTime);
    osc.frequency.exponentialRampToValueAtTime(68, startTime + 0.16);

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(0.24, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.19);

    osc.connect(env);
    env.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }

  private playTablaDayan(startTime: number, amp: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, startTime);
    osc.frequency.exponentialRampToValueAtTime(290, startTime + 0.06);

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(amp, startTime + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    osc.connect(env);
    env.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.09);
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.045); // E6

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.17);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.24);
    filter.Q.value = 1.6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.26, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.28);
  }

  public playFootstep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.045);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.08, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playWingFlap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.18);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.24, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.24);
  }

  public playFlyingShimmer(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.22);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.09, now + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playPowerUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      if (!ctx || !this.sfxGain) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.001, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playShieldBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;
    [880, 622, 440].forEach((freq, i) => {
      if (!ctx || !this.sfxGain) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(0.16, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playCollision(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);

    env.gain.setValueAtTime(0.35, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 329.63, 261.63];
    notes.forEach((freq, i) => {
      if (!ctx || !this.sfxGain) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.14;
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.001, t);
      env.gain.linearRampToValueAtTime(0.22, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  public playUnlock(): void {
    this.playPowerUp();
  }
}

export const soundEngine = new SoundEngine();
