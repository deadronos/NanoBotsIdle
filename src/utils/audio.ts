import { useAudioSettings } from "./audioPreferences";
import type { DeliveryCue } from "./fleetAudio";
import { warn } from "./logger";

type Mixer = {
  context: AudioContext;
  master: GainNode;
  fleet: GainNode;
  player: GainNode;
  machinery: GainNode;
  activity: number;
  nextJumpAt: number;
  resuming: boolean;
};

let mixer: Mixer | undefined;

const gainNode = (context: AudioContext, output: AudioNode): GainNode => {
  const node = context.createGain();
  node.gain.value = 0;
  node.connect(output);
  return node;
};

const smoothGain = (node: GainNode, value: number, now: number, seconds: number): void => {
  node.gain.cancelScheduledValues(now);
  node.gain.setTargetAtTime(value, now, seconds);
};

const createMachinery = (context: AudioContext, output: AudioNode): GainNode => {
  const gain = gainNode(context, output);
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 510;
  lowpass.connect(gain);

  const body = context.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = 185;
  body.Q.value = 0.75;
  body.connect(lowpass);

  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // Slow, seamless variation in the airflow; no persistent pitched tone.
    const phase = (2 * Math.PI * i) / data.length;
    data[i] =
      (Math.random() * 2 - 1) * (0.72 + 0.17 * Math.sin(phase) + 0.09 * Math.sin(phase * 4));
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(body);
  source.start();
  return gain;
};

export const syncAudioLevels = (): void => {
  if (!mixer) return;
  const { muted, fleetVolume, playerVolume } = useAudioSettings.getState();
  const now = mixer.context.currentTime;
  smoothGain(mixer.master, muted || document.hidden ? 0 : 1, now, 0.025);
  smoothGain(mixer.fleet, fleetVolume, now, 0.025);
  smoothGain(mixer.player, playerVolume, now, 0.025);
};

/** Only called by user input; simulation updates never create or resume audio. */
export const unlockAudio = (): void => {
  if (document.hidden || useAudioSettings.getState().muted) return;
  try {
    if (!mixer) {
      const Context =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const context = new Context();
      try {
        const master = gainNode(context, context.destination);
        const fleet = gainNode(context, master);
        const player = gainNode(context, master);
        const machinery = createMachinery(context, fleet);
        mixer = {
          context,
          master,
          fleet,
          player,
          machinery,
          activity: 0,
          nextJumpAt: 0,
          resuming: false,
        };
      } catch (error) {
        void context.close().catch(() => undefined);
        throw error;
      }
      syncAudioLevels();
    }
    const activeMixer = mixer;
    if (activeMixer.context.state !== "running" && !activeMixer.resuming) {
      activeMixer.resuming = true;
      void activeMixer.context
        .resume()
        .catch((error: unknown) => warn("Could not resume game audio", error))
        .finally(() => {
          activeMixer.resuming = false;
        });
    }
  } catch (error) {
    warn("Could not start game audio", error);
  }
};

export const canPlayFleetAudio = (): boolean => {
  const { muted, fleetVolume } = useAudioSettings.getState();
  return mixer?.context.state === "running" && !document.hidden && !muted && fleetVolume > 0;
};

export const setMachineryActivity = (activity: number): void => {
  if (!mixer || (Math.abs(activity - mixer.activity) < 0.005 && activity !== 0)) return;
  if (activity === mixer.activity) return;
  const fade = activity > mixer.activity ? 0.38 : 0.65;
  mixer.activity = activity;
  smoothGain(mixer.machinery, activity * 0.42, mixer.context.currentTime, fade);
};

const playSoftTone = (
  context: AudioContext,
  output: GainNode,
  start: number,
  fromHz: number,
  toHz: number,
  volume: number,
  duration: number,
): void => {
  const voice = context.createOscillator();
  const envelope = gainNode(context, output);
  voice.connect(envelope);
  voice.frequency.setValueAtTime(fromHz, start);
  voice.frequency.exponentialRampToValueAtTime(toHz, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  voice.onended = () => {
    voice.disconnect();
    envelope.disconnect();
  };
  voice.start(start);
  voice.stop(start + duration);
};

export const playDeliveryCue = (cue: DeliveryCue): void => {
  if (!mixer || !canPlayFleetAudio()) return;
  const { context, fleet } = mixer;
  const now = context.currentTime;
  if (cue === "firstDelivery") {
    playSoftTone(context, fleet, now, 285, 255, 0.095, 0.22);
  } else {
    playSoftTone(context, fleet, now, 255, 240, 0.08, 0.24);
    playSoftTone(context, fleet, now + 0.11, 320, 305, 0.07, 0.3);
  }
};

export const playJumpSound = (): void => {
  const { muted, playerVolume } = useAudioSettings.getState();
  if (!mixer || mixer.context.state !== "running" || muted || playerVolume === 0 || document.hidden)
    return;
  const now = mixer.context.currentTime;
  if (now < mixer.nextJumpAt) return;
  mixer.nextJumpAt = now + 0.25;
  playSoftTone(mixer.context, mixer.player, now, 105, 185, 0.12, 0.19);
};

export const disposeAudio = (): void => {
  const previous = mixer;
  mixer = undefined;
  if (previous) void previous.context.close().catch(() => undefined);
};
