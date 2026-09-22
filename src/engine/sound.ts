import { DivSoundEffect } from "../types";

/**
 * Web Audio Retro Synthesizer for DIV Games Studio
 * Emulates PC Speaker / AdLib / Sound Blaster retro synth
 */

interface ActiveChannel {
  id: number;
  soundId: number;
  gainNode: GainNode;
  oscillator?: OscillatorNode;
  sourceNode?: AudioBufferSourceNode;
  baseFrequency: number;
  startTime: number;
  duration: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundCache: Map<number, (vol?: number, pitch?: number, channelId?: number) => ActiveChannel | void> = new Map();
  private customSounds: Map<number, DivSoundEffect> = new Map();
  private activeChannels: Map<number, ActiveChannel> = new Map();
  private nextChannelId: number = 1;
  public isMuted: boolean = false;
  private masterVolume: number = 1.0;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  constructor() {
    this.registerDefaults();
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol / 100));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  private registerDefaults() {
    // 1 = Laser / Shoot
    this.soundCache.set(1, (vol = 1, pitch = 1, ch = 0) => this.playLaser(vol, pitch, ch));
    // 2 = Explosion
    this.soundCache.set(2, (vol = 1, pitch = 1, ch = 0) => this.playExplosion(vol, pitch, ch));
    // 3 = Hit / Hurt
    this.soundCache.set(3, (vol = 1, pitch = 1, ch = 0) => this.playHit(vol, pitch, ch));
    // 4 = Coin / Pickup
    this.soundCache.set(4, (vol = 1, pitch = 1, ch = 0) => this.playCoin(vol, pitch, ch));
    // 5 = Jump
    this.soundCache.set(5, (vol = 1, pitch = 1, ch = 0) => this.playJump(vol, pitch, ch));
    // 6 = Powerup
    this.soundCache.set(6, (vol = 1, pitch = 1, ch = 0) => this.playPowerup(vol, pitch, ch));
    // 7 = Beep / Blip
    this.soundCache.set(7, (vol = 1, pitch = 1, ch = 0) => this.playBlip(vol, pitch, ch));
    // 8 = 3D Door Slide (Doom/Wolfenstein style)
    this.soundCache.set(8, (vol = 1, pitch = 1, ch = 0) => this.playDoor(vol, pitch, ch));
    // 9 = Switch Click / Device Activate
    this.soundCache.set(9, (vol = 1, pitch = 1, ch = 0) => this.playSwitch(vol, pitch, ch));
    // 10 = Ammo Pickup
    this.soundCache.set(10, (vol = 1, pitch = 1, ch = 0) => this.playAmmo(vol, pitch, ch));
    // 11 = Medikit / Health
    this.soundCache.set(11, (vol = 1, pitch = 1, ch = 0) => this.playMedikit(vol, pitch, ch));
    // 12 = Keycard Access
    this.soundCache.set(12, (vol = 1, pitch = 1, ch = 0) => this.playKey(vol, pitch, ch));
  }

  public registerCustomSound(sound: DivSoundEffect) {
    this.customSounds.set(sound.id, sound);
    this.soundCache.set(sound.id, (vol = 1, pitch = 1, ch = 0) => {
      return this.playCustomSound({
        ...sound,
        volume: sound.volume * vol,
        frequency: sound.frequency * pitch,
      }, ch);
    });
  }

  public getCustomSounds(): DivSoundEffect[] {
    return Array.from(this.customSounds.values());
  }

  /**
   * Plays sound and returns unique positive channel ID (DIV Games Studio sound() return value)
   */
  public playSound(id: number, volume: number = 100, frequency: number = 256): number {
    if (this.isMuted) return 0;
    this.initCtx();
    if (!this.ctx) return 0;

    const channelId = this.nextChannelId++;
    const normalizedVol = Math.max(0, Math.min(1, volume / 100));
    const normalizedPitch = Math.max(0.2, Math.min(4, frequency / 256));

    const synth = this.soundCache.get(id);
    let channel: ActiveChannel | void;
    if (synth) {
      channel = synth(normalizedVol, normalizedPitch, channelId);
    } else {
      channel = this.playTone(440 * normalizedPitch, 0.12, "square", normalizedVol, channelId);
    }

    if (channel) {
      this.activeChannels.set(channelId, channel);
      setTimeout(() => {
        this.activeChannels.delete(channelId);
      }, (channel.duration + 0.1) * 1000);
    }

    return channelId;
  }

  /**
   * Stops a specific sound channel or all channels (DIV stop_sound)
   */
  public stopSound(channelId?: number) {
    this.initCtx();
    if (!this.ctx) return;

    if (channelId && channelId > 0) {
      const ch = this.activeChannels.get(channelId);
      if (ch) {
        try {
          ch.gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          if (ch.oscillator) ch.oscillator.stop(this.ctx.currentTime + 0.01);
          if (ch.sourceNode) ch.sourceNode.stop(this.ctx.currentTime + 0.01);
        } catch (e) {}
        this.activeChannels.delete(channelId);
      }
    } else {
      // Stop all sounds
      this.activeChannels.forEach((ch) => {
        try {
          ch.gainNode.gain.setValueAtTime(0.0001, this.ctx!.currentTime);
          if (ch.oscillator) ch.oscillator.stop(this.ctx!.currentTime + 0.01);
          if (ch.sourceNode) ch.sourceNode.stop(this.ctx!.currentTime + 0.01);
        } catch (e) {}
      });
      this.activeChannels.clear();
    }
  }

  /**
   * Modifies volume and frequency of an active sound channel in real time (DIV change_sound)
   */
  public changeSound(channelId: number, volume: number, frequency?: number) {
    if (!channelId || channelId <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const ch = this.activeChannels.get(channelId);
    if (!ch) return;

    const t = this.ctx.currentTime;
    const normalizedVol = Math.max(0, Math.min(1, volume / 100));
    ch.gainNode.gain.setValueAtTime(normalizedVol, t);

    if (frequency !== undefined && ch.oscillator) {
      const normalizedPitch = Math.max(0.2, Math.min(4, frequency / 256));
      ch.oscillator.frequency.setValueAtTime(ch.baseFrequency * normalizedPitch, t);
    }
  }

  /**
   * Checks if a sound channel is currently playing (DIV is_playing_sound)
   */
  public isPlayingSound(channelId: number): boolean {
    return this.activeChannels.has(channelId);
  }

  /**
   * Fades sound channel volume gradually (DIV fade_sound)
   */
  public fadeSound(channelId: number, targetVolume: number, speed: number = 10) {
    if (!channelId || channelId <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const ch = this.activeChannels.get(channelId);
    if (!ch) return;

    const t = this.ctx.currentTime;
    const duration = Math.max(0.05, 1.0 / Math.max(1, speed));
    const normalizedVol = Math.max(0, Math.min(1, targetVolume / 100));
    ch.gainNode.gain.linearRampToValueAtTime(normalizedVol, t + duration);
  }

  public playLaser(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    return {
      id: channelId,
      soundId: 1,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: 880,
      startTime: t,
      duration: 0.15,
    };
  }

  public playExplosion(vol: number = 0.6, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);

    noise.start();

    return {
      id: channelId,
      soundId: 2,
      gainNode: gain,
      sourceNode: noise,
      baseFrequency: 800,
      startTime: this.ctx.currentTime,
      duration: 0.35,
    };
  }

  public playHit(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    return {
      id: channelId,
      soundId: 3,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: 240,
      startTime: t,
      duration: 0.1,
    };
  }

  public playCoin(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);

    return {
      id: channelId,
      soundId: 4,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: 987,
      startTime: t,
      duration: 0.3,
    };
  }

  public playJump(vol: number = 0.4, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    return {
      id: channelId,
      soundId: 5,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: 150,
      startTime: t,
      duration: 0.15,
    };
  }

  public playPowerup(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(659 * pitch, 0.25, "square", vol * 0.3, channelId);
  }

  public playBlip(vol: number = 0.3, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(600 * pitch, 0.05, "sine", vol * 0.3, channelId);
  }

  // 3D Engine specific sounds
  public playDoor(vol: number = 0.6, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120 * pitch, t);
    osc.frequency.linearRampToValueAtTime(80 * pitch, t + 0.5);

    gain.gain.setValueAtTime(0.3 * vol, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);

    return {
      id: channelId,
      soundId: 8,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: 120,
      startTime: t,
      duration: 0.5,
    };
  }

  public playSwitch(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(750 * pitch, 0.06, "square", vol * 0.4, channelId);
  }

  public playAmmo(vol: number = 0.4, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(600 * pitch, 0.12, "triangle", vol * 0.3, channelId);
  }

  public playMedikit(vol: number = 0.5, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(659 * pitch, 0.25, "sine", vol * 0.35, channelId);
  }

  public playKey(vol: number = 0.4, pitch: number = 1, channelId: number = 0): ActiveChannel | void {
    return this.playTone(1200 * pitch, 0.15, "square", vol * 0.3, channelId);
  }

  /**
   * Plays a custom configured retro sound with ADSR envelope, pitch slide and filter
   */
  public playCustomSound(params: DivSoundEffect, channelId: number = 0): ActiveChannel | void {
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

      gain.connect(this.masterGain || this.ctx.destination);
      noise.start(t);
      return {
        id: channelId,
        soundId: params.id,
        gainNode: gain,
        sourceNode: noise,
        baseFrequency: 440,
        startTime: t,
        duration: totalDuration,
      };
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

    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + totalDuration);

    return {
      id: channelId,
      soundId: params.id,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: params.frequency,
      startTime: t,
      duration: totalDuration,
    };
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

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", vol: number = 0.3, channelId: number = 0): ActiveChannel | void {
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
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);

    return {
      id: channelId,
      soundId: 0,
      gainNode: gain,
      oscillator: osc,
      baseFrequency: freq,
      startTime: t,
      duration,
    };
  }
}

export const soundEngine = new SoundEngine();
