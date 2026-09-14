import { DivSoundEffect } from "../types";

/**
 * Web Audio Retro Synthesizer for DIV Games Studio
 * Emulates PC Speaker / AdLib / Sound Blaster retro synth
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundCache: Map<number, (volume?: number, pitch?: number) => void> = new Map();
  private customSounds: Map<number, DivSoundEffect> = new Map();
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // 1 = Laser / Shoot
    this.soundCache.set(1, (vol = 1, pitch = 1) => this.playLaser(vol, pitch));
    // 2 = Explosion
    this.soundCache.set(2, (vol = 1, pitch = 1) => this.playExplosion(vol, pitch));
    // 3 = Hit / Hurt
    this.soundCache.set(3, (vol = 1, pitch = 1) => this.playHit(vol, pitch));
    // 4 = Coin / Pickup
    this.soundCache.set(4, (vol = 1, pitch = 1) => this.playCoin(vol, pitch));
    // 5 = Jump
    this.soundCache.set(5, (vol = 1, pitch = 1) => this.playJump(vol, pitch));
    // 6 = Powerup
    this.soundCache.set(6, (vol = 1, pitch = 1) => this.playPowerup(vol, pitch));
    // 7 = Beep / Blip
    this.soundCache.set(7, (vol = 1, pitch = 1) => this.playBlip(vol, pitch));
    // 8 = 3D Door Slide (Doom/Wolfenstein style)
    this.soundCache.set(8, (vol = 1, pitch = 1) => this.playDoor(vol, pitch));
    // 9 = Switch Click / Device Activate
    this.soundCache.set(9, (vol = 1, pitch = 1) => this.playSwitch(vol, pitch));
    // 10 = Ammo Pickup
    this.soundCache.set(10, (vol = 1, pitch = 1) => this.playAmmo(vol, pitch));
    // 11 = Medikit / Health
    this.soundCache.set(11, (vol = 1, pitch = 1) => this.playMedikit(vol, pitch));
    // 12 = Keycard Access
    this.soundCache.set(12, (vol = 1, pitch = 1) => this.playKey(vol, pitch));
  }

  public registerCustomSound(sound: DivSoundEffect) {
    this.customSounds.set(sound.id, sound);
    this.soundCache.set(sound.id, (vol = 1, pitch = 1) => {
      this.playCustomSound({
        ...sound,
        volume: sound.volume * vol,
        frequency: sound.frequency * pitch,
      });
    });
  }

  public getCustomSounds(): DivSoundEffect[] {
    return Array.from(this.customSounds.values());
  }

  public playSound(id: number, volume: number = 100, frequency: number = 256) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const normalizedVol = Math.max(0, Math.min(1, volume / 100));
    const normalizedPitch = Math.max(0.2, Math.min(4, frequency / 256));

    const synth = this.soundCache.get(id);
    if (synth) {
      synth(normalizedVol, normalizedPitch);
    } else {
      // Generic tone for unknown sound id
      this.playTone(440 * normalizedPitch, 0.1, "square", normalizedVol);
    }
  }

  public playLaser(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, t + 0.15);

    gain.gain.setValueAtTime(0.3 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playExplosion(vol: number = 0.6, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800 * pitch, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(50 * pitch, this.ctx.currentTime + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public playHit(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(240 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(60 * pitch, t + 0.1);

    gain.gain.setValueAtTime(0.4 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCoin(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(987 * pitch, t); // B5
    osc.frequency.setValueAtTime(1318 * pitch, t + 0.08); // E6

    gain.gain.setValueAtTime(0.25 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playJump(vol: number = 0.4, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(600 * pitch, t + 0.15);

    gain.gain.setValueAtTime(0.25 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playPowerup(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq * pitch, 0.08, "square", vol * 0.2);
      }, idx * 60);
    });
  }

  public playBlip(vol: number = 0.3, pitch: number = 1) {
    this.playTone(600 * pitch, 0.05, "sine", vol * 0.3);
  }

  // 3D Engine specific sounds
  public playDoor(vol: number = 0.6, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Heavy servo motor rumble + sliding noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95 * pitch, t);
    osc.frequency.linearRampToValueAtTime(160 * pitch, t + 0.45);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.4 * vol, t);
    gain.gain.setValueAtTime(0.4 * vol, t + 0.35);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playSwitch(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Sharp mechanical relay click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(750 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(180 * pitch, t + 0.06);

    gain.gain.setValueAtTime(0.4 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playAmmo(vol: number = 0.4, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Metallic reload clack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(400 * pitch, t);
    osc.frequency.setValueAtTime(800 * pitch, t + 0.04);

    gain.gain.setValueAtTime(0.3 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playMedikit(vol: number = 0.5, pitch: number = 1) {
    this.initCtx();
    if (!this.ctx) return;
    const notes = [523, 659, 784, 1046]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq * pitch, 0.07, "sine", vol * 0.25);
      }, idx * 45);
    });
  }

  public playKey(vol: number = 0.4, pitch: number = 1) {
    this.playTone(1200 * pitch, 0.08, "square", vol * 0.2);
    setTimeout(() => {
      this.playTone(1600 * pitch, 0.1, "square", vol * 0.25);
    }, 90);
  }

  /**
   * Plays a custom configured retro sound with ADSR envelope, pitch slide and filter
   */
  public playCustomSound(params: DivSoundEffect) {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = params.attack + params.decay + params.sustain + params.release;
    const totalDuration = Math.max(0.05, Math.min(3, duration));

    if (params.waveform === "noise") {
      const bufferSize = Math.floor(this.ctx.sampleRate * totalDuration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(params.volume, t + params.attack);
      gain.gain.linearRampToValueAtTime(params.volume * 0.7, t + params.attack + params.decay);
      gain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

      if (params.filterCutoff) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(params.filterCutoff, t);
        noise.connect(filter);
        filter.connect(gain);
      } else {
        noise.connect(gain);
      }

      gain.connect(this.ctx.destination);
      noise.start(t);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = params.waveform as OscillatorType;
    const startFreq = Math.max(20, params.frequency);
    const endFreq = Math.max(20, startFreq + params.pitchSlide);

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + totalDuration);

    // Vibrato LFO if enabled
    if (params.vibratoDepth > 0 && params.vibratoSpeed > 0) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(params.vibratoSpeed, t);
      lfoGain.gain.setValueAtTime(params.vibratoDepth, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + totalDuration);
    }

    // ADSR Gain Envelope
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(params.volume, t + params.attack);
    gain.gain.linearRampToValueAtTime(params.volume * 0.7, t + params.attack + params.decay);
    gain.gain.setValueAtTime(params.volume * 0.7, t + params.attack + params.decay + params.sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);

    if (params.filterCutoff && params.filterCutoff < 18000) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(params.filterCutoff, t);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + totalDuration);
  }

  /**
   * Generates a downloadable WAV Blob from sound parameters
   */
  public generateWavBlob(params: DivSoundEffect): Blob {
    const sampleRate = 22050; // Classic retro DIV DOS sample rate
    const duration = Math.max(0.08, Math.min(3, params.attack + params.decay + params.sustain + params.release));
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(numSamples);

    let phase = 0;
    const startFreq = Math.max(20, params.frequency);
    const endFreq = Math.max(20, startFreq + params.pitchSlide);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = i / numSamples;
      const currentFreq = startFreq + (endFreq - startFreq) * progress;

      // Vibrato modulation
      const vib = params.vibratoDepth > 0
        ? Math.sin(t * Math.PI * 2 * params.vibratoSpeed) * params.vibratoDepth
        : 0;

      phase += ((currentFreq + vib) / sampleRate) * Math.PI * 2;

      // Waveform sample (-1.0 to 1.0)
      let sample = 0;
      if (params.waveform === "square") {
        sample = Math.sin(phase) >= 0 ? 0.75 : -0.75;
      } else if (params.waveform === "sawtooth") {
        sample = (2 * ((phase / (Math.PI * 2)) % 1)) - 1;
      } else if (params.waveform === "triangle") {
        sample = Math.asin(Math.sin(phase)) * (2 / Math.PI);
      } else if (params.waveform === "noise") {
        sample = Math.random() * 2 - 1;
      } else {
        sample = Math.sin(phase);
      }

      // Envelope ADSR amplitude
      let env = 0;
      if (t < params.attack) {
        env = (t / Math.max(0.001, params.attack));
      } else if (t < params.attack + params.decay) {
        const decayProgress = (t - params.attack) / Math.max(0.001, params.decay);
        env = 1 - decayProgress * 0.3;
      } else if (t < params.attack + params.decay + params.sustain) {
        env = 0.7;
      } else {
        const relProgress = (t - params.attack - params.decay - params.sustain) / Math.max(0.001, params.release);
        env = Math.max(0, 0.7 * (1 - relProgress));
      }

      const finalVal = Math.max(-32767, Math.min(32767, Math.floor(sample * env * params.volume * 28000)));
      buffer[i] = finalVal;
    }

    // Pack into RIFF WAV format
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // "RIFF"
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + numSamples * 2, true);
    // "WAVE"
    view.setUint32(8, 0x57415645, false);
    // "fmt "
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true); // SubChunk1Size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    // "data"
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, numSamples * 2, true);

    return new Blob([wavHeader, buffer], { type: "audio/wav" });
  }

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", vol: number = 0.3) {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
}

export const soundEngine = new SoundEngine();
