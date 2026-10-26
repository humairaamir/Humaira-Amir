/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procedural Web Audio API Sound Synthesizer
 * Zero-dependency, zero-404 audio generation for tactical battle royale
 */

class TacticalSoundSystem {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.ctx) {
      this.ctx.suspend();
    } else if (!this.isMuted && this.ctx) {
      this.ctx.resume();
    }
    return this.isMuted;
  }

  /**
   * Procedural Gunshot sound tailored to caliber
   */
  public playGunshot(caliber: string = '5.56mm', isSuppressed: boolean = false) {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Transient sharp click (trigger hammer strike)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = isSuppressed ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isSuppressed ? 350 : 650, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    oscGain.gain.setValueAtTime(isSuppressed ? 0.3 : 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

    // 2. White noise explosion burst
    const bufferSize = ctx.sampleRate * (isSuppressed ? 0.12 : 0.35);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = isSuppressed ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(isSuppressed ? 900 : (caliber === '7.62mm' ? 1200 : (caliber === '.300 Magnum' ? 800 : 1800)), t);
    filter.Q.setValueAtTime(isSuppressed ? 2 : 1, t);

    const noiseGain = ctx.createGain();
    const vol = isSuppressed ? 0.25 : (caliber === '.300 Magnum' ? 0.9 : 0.6);
    noiseGain.gain.setValueAtTime(vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (isSuppressed ? 0.12 : 0.35));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + (isSuppressed ? 0.12 : 0.35));

    // 3. Low-frequency punch (concussive thump)
    if (!isSuppressed) {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      const baseFreq = caliber === '.300 Magnum' ? 90 : (caliber === '7.62mm' ? 110 : 130);
      subOsc.frequency.setValueAtTime(baseFreq, t);
      subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.25);

      subGain.gain.setValueAtTime(0.8, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.25);
    }
  }

  /**
   * Procedural Hit Marker "Thump"
   */
  public playHitMarker() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * High-pitched Headshot "Helmet Ping / Ding"
   */
  public playHeadshotDing() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.35);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Reload magazine latch sound
   */
  public playReload() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Click 1: Mag release
    this.playMechanicalClick(t, 600);
    // Click 2: Mag insertion
    this.playMechanicalClick(t + 0.3, 750);
    // Click 3: Bolt cocking slide
    this.playMechanicalClick(t + 0.7, 480);
  }

  private playMechanicalClick(time: number, freq: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Loot pickup chime
   */
  public playLootPickup() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587, t); // D5
    osc.frequency.setValueAtTime(880, t + 0.06); // A5

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Consumable activation sound
   */
  public playMedicalUse() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.25);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Airdrop plane distant rumble & siren
   */
  public playAirdropSiren() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(480, t + 0.5);
    osc.frequency.linearRampToValueAtTime(320, t + 1.0);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  /**
   * Player hurt audio cue
   */
  public playPlayerHurt() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.15);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

export const soundSystem = new TacticalSoundSystem();
