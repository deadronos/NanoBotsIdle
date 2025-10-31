/**
 * AudioManager - Centralized audio system using Web Audio API
 * Generates procedural sounds to avoid external asset dependencies
 */

export type SoundType =
  | "buildingPlace"
  | "droneSpawn"
  | "droneMove"
  | "heatWarning"
  | "heatCritical"
  | "prestigeComplete"
  | "unlockAchieved"
  | "overclockEnable"
  | "overclockDisable"
  | "forkProcess";

export interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number; // 0-1
  ambientVolume: number; // 0-1
  muted: boolean;
}

class AudioManagerClass {
  private static readonly MIN_GAIN_VALUE = 0.001; // Minimum for exponential ramp

  private context: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.5,
    sfxVolume: 0.7,
    ambientVolume: 0.3,
    muted: false,
  };
  private ambientNode: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private lastHeatWarningTime = 0;
  private initialized = false;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== "undefined") {
      const initOnInteraction = () => {
        if (!this.initialized) {
          this.init();
          document.removeEventListener("click", initOnInteraction);
          document.removeEventListener("keydown", initOnInteraction);
        }
      };
      document.addEventListener("click", initOnInteraction);
      document.addEventListener("keydown", initOnInteraction);
    }
  }

  private init() {
    try {
      const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (AudioContext) {
        this.context = new AudioContext();
      }
      this.initialized = true;
      this.loadSettings();
    } catch (error) {
      console.warn("Web Audio API not supported:", error);
    }
  }

  private ensureInitialized() {
    if (!this.initialized && typeof window !== "undefined") {
      this.init();
    }
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem("audioSettings");
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn("Failed to load audio settings:", error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem("audioSettings", JSON.stringify(this.settings));
    } catch (error) {
      console.warn("Failed to save audio settings:", error);
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();

    // Update ambient if playing
    if (this.ambientGain && this.ambientNode) {
      const volume = this.settings.muted
        ? 0
        : this.settings.masterVolume * this.settings.ambientVolume * 0.15;
      this.ambientGain.gain.setTargetAtTime(volume, this.context!.currentTime, 0.1);
    }
  }

  private getVolume(type: "sfx" | "ambient"): number {
    if (this.settings.muted) return 0;
    const typeVolume = type === "sfx" ? this.settings.sfxVolume : this.settings.ambientVolume;
    return this.settings.masterVolume * typeVolume;
  }

  // Procedural sound generation
  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    attack = 0.01,
    decay = 0.1
  ) {
    this.ensureInitialized();
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const now = this.context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    
    // Exponential ramp needs to avoid zero
    const fadeEnd = now + duration - decay;
    if (fadeEnd > now + attack) {
      gainNode.gain.exponentialRampToValueAtTime(AudioManagerClass.MIN_GAIN_VALUE, fadeEnd);
    }
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private playChord(
    frequencies: number[],
    duration: number,
    volume: number,
    type: OscillatorType = "sine"
  ) {
    frequencies.forEach((freq) => this.playTone(freq, duration, volume / frequencies.length, type));
  }

  private playNoise(duration: number, volume: number, filterFreq = 1000) {
    this.ensureInitialized();
    if (!this.context) return;

    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start();
  }

  // Public API for playing sounds
  play(soundType: SoundType, intensity = 1.0) {
    this.ensureInitialized();
    if (!this.context || this.settings.muted) return;

    const volume = this.getVolume("sfx") * intensity;

    switch (soundType) {
      case "buildingPlace":
        // Mechanical construction sound - descending tones
        this.playTone(600, 0.08, volume * 0.3, "square");
        this.playTone(400, 0.12, volume * 0.4, "square");
        this.playNoise(0.05, volume * 0.2, 800);
        break;

      case "droneSpawn":
        // High-pitched activation sound - ascending
        this.playTone(400, 0.15, volume * 0.3, "sine");
        this.playTone(600, 0.15, volume * 0.3, "sine", 0.05);
        this.playTone(800, 0.15, volume * 0.25, "sine", 0.1);
        break;

      case "droneMove":
        // Subtle movement blip
        this.playTone(300, 0.03, volume * 0.15, "sine");
        break;

      case "heatWarning": {
        // Warning beep - only play every 2 seconds
        const now = Date.now();
        if (now - this.lastHeatWarningTime < 2000) return;
        this.lastHeatWarningTime = now;
        this.playTone(800, 0.1, volume * 0.5, "triangle");
        this.playTone(800, 0.1, volume * 0.5, "triangle", 0.15);
        break;
      }

      case "heatCritical":
        // Urgent alarm - harsh
        this.playChord([600, 700], 0.15, volume * 0.6, "sawtooth");
        setTimeout(() => {
          if (this.context) {
            this.playChord([600, 700], 0.15, volume * 0.6, "sawtooth");
          }
        }, 150);
        break;

      case "prestigeComplete": {
        // Triumphant ascending chord
        const chord = [261.63, 329.63, 392.0, 523.25]; // C major
        chord.forEach((freq, i) => {
          setTimeout(() => {
            if (this.context) {
              this.playTone(freq, 0.5, volume * 0.4, "sine");
            }
          }, i * 100);
        });
        break;
      }

      case "unlockAchieved":
        // Achievement notification - bright
        this.playChord([523.25, 659.25, 783.99], 0.3, volume * 0.4, "sine");
        break;

      case "overclockEnable":
        // Dramatic power-up - rising intensity
        this.playTone(200, 0.4, volume * 0.5, "sawtooth");
        this.playTone(400, 0.4, volume * 0.4, "square", 0.2);
        this.playNoise(0.2, volume * 0.3, 2000);
        break;

      case "overclockDisable":
        // Power-down - descending
        this.playTone(400, 0.3, volume * 0.4, "square");
        this.playTone(200, 0.3, volume * 0.4, "sawtooth", 0.15);
        break;

      case "forkProcess":
        // Biological/digital transformation sound
        this.playChord([300, 450, 600], 0.5, volume * 0.5, "triangle");
        setTimeout(() => {
          if (this.context) {
            this.playNoise(0.3, volume * 0.25, 1500);
          }
        }, 200);
        break;
    }
  }

  // Ambient factory hum - scales with activity
  startAmbient(_droneCount: number) {
    this.ensureInitialized();
    if (!this.context || this.ambientNode) return;

    try {
      this.ambientNode = this.context.createOscillator();
      this.ambientGain = this.context.createGain();

      // Base frequency around 80Hz (low hum)
      this.ambientNode.type = "sawtooth";
      this.ambientNode.frequency.value = 80;

      const volume = this.getVolume("ambient") * 0.15;
      this.ambientGain.gain.value = volume;

      this.ambientNode.connect(this.ambientGain);
      this.ambientGain.connect(this.context.destination);

      this.ambientNode.start();
    } catch (error) {
      console.warn("Failed to start ambient sound:", error);
      this.ambientNode = null;
      this.ambientGain = null;
    }
  }

  updateAmbient(droneCount: number, heatRatio: number) {
    if (!this.ambientNode || !this.ambientGain || !this.context) return;

    // Frequency increases with heat
    const baseFreq = 80;
    const heatBoost = Math.min(heatRatio * 20, 40); // Up to +40Hz
    const targetFreq = baseFreq + heatBoost;

    this.ambientNode.frequency.setTargetAtTime(
      targetFreq,
      this.context.currentTime,
      0.5
    );

    // Volume scales with activity (drone count)
    const activityVolume = Math.min(0.15 + droneCount * 0.01, 0.4);
    const volume = this.getVolume("ambient") * activityVolume;

    this.ambientGain.gain.setTargetAtTime(
      volume,
      this.context.currentTime,
      0.5
    );
  }

  stopAmbient() {
    if (this.ambientNode && this.context) {
      try {
        this.ambientNode.stop();
      } catch {
        // Already stopped
      }
      this.ambientNode = null;
      this.ambientGain = null;
    }
  }
}

// Singleton instance
export const AudioManager = new AudioManagerClass();
