import { create } from "zustand";
import { persist } from "zustand/middleware";

type AudioPreferences = {
  muted: boolean;
  fleetVolume: number;
  playerVolume: number;
};

type AudioSettings = AudioPreferences & {
  setMuted: (muted: boolean) => void;
  setFleetVolume: (volume: number) => void;
  setPlayerVolume: (volume: number) => void;
};

const clampVolume = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export const useAudioSettings = create<AudioSettings>()(
  persist(
    (set) => ({
      muted: false,
      fleetVolume: 0.45,
      playerVolume: 0.65,
      setMuted: (muted) => set({ muted }),
      setFleetVolume: (volume) => set({ fleetVolume: clampVolume(volume, 0.45) }),
      setPlayerVolume: (volume) => set({ playerVolume: clampVolume(volume, 0.65) }),
    }),
    {
      name: "nanobots-audio-settings",
      partialize: ({ muted, fleetVolume, playerVolume }) => ({ muted, fleetVolume, playerVolume }),
      merge: (saved, current) => {
        const prefs = saved as Partial<AudioPreferences> | undefined;
        return {
          ...current,
          muted: typeof prefs?.muted === "boolean" ? prefs.muted : current.muted,
          fleetVolume: clampVolume(prefs?.fleetVolume, current.fleetVolume),
          playerVolume: clampVolume(prefs?.playerVolume, current.playerVolume),
        };
      },
    },
  ),
);
