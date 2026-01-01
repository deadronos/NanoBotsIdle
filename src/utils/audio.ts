// Simple synthesized audio manager
import { error } from "./logger";

type SoundType = "mine" | "jump" | "scan" | "deposit";

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (audioContext) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext = new Ctx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.3; // Default volume
    masterGain.connect(audioContext.destination);
  } catch (e) {
    error("Failed to init audio", e);
  }
};

export const playSound = (type: SoundType) => {
  if (!audioContext) initAudio();
  if (!audioContext || !masterGain) return;

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {
        // Ignore resume errors
    });
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(masterGain);

  const now = audioContext.currentTime;

  switch (type) {
    case "mine":
      // High pitch short blip
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case "jump":
      // Low swoosh
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case "scan":
      // Sci-fi chirp
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.linearRampToValueAtTime(2000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case "deposit":
      // Coins/Credit sound
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
  }
};
