type SfxPlayer = {
  playHit: () => void;
  playBreak: () => void;
  dispose: () => void;
};

export function createSfxPlayer(): SfxPlayer {
  let ctx: AudioContext | null = null;

  const ensureContext = () => {
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  };

  const playTone = (frequency: number, duration: number, volume: number, type: OscillatorType) => {
    const audio = ensureContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audio.destination);

    const now = audio.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  return {
    playHit: () => playTone(320, 0.08, 0.08, "triangle"),
    playBreak: () => playTone(180, 0.12, 0.12, "square"),
    dispose: () => {
      if (ctx) {
        void ctx.close();
        ctx = null;
      }
    },
  };
}
